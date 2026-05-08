import { FastifyReply, FastifyRequest } from "fastify";
import type {
  loginInput,
  registrationInput,
  resendVerificationInput,
  emailInput,
} from "./auth.schema.js";
import argon2 from "argon2";
import {
  createUser,
  createSession,
  getUserByEmail,
  getUserById,
  getUserByGoogleId,
  createGoogleUser,
  updateUserGoogleId,
} from "./auth.service.js";
import {
  sendTokenEmail,
  sendVerificationEmail,
  sendSecurityAlertEmail,
} from "../../lib/mailServer.js";
import { createUserToken, deleteUserTokensByType } from "../auth/auth.tokens.js";
import { GoogleTokenResponseSchema } from "./auth.schema.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config.js";
import crypto from "crypto";
import { sendLog } from "../../lib/logstash.js";
import { OAuth2Client } from "google-auth-library";
import { validateTwoFactorCode } from "../2fa/2fa.service.js";

export async function registerUserHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as registrationInput;

  const hashedPassword = await argon2.hash(body.password);

  try {
    const newUser = await createUser(body, hashedPassword);

    const verification = await createUserToken(newUser.id, "EMAIL_VERIFICATION");
    await sendVerificationEmail(newUser.email, verification.rawToken);
    void sendLog({
      dataset: "server",
      level: "info",
      message: "User registered",
    });
    return reply.code(201).send({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    }); // NEVER send {newUser}. It contains the (hashed) password
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        // "Unique constraint failed on the {constraint} email"
        void sendLog({
          dataset: "auth",
          level: "warn",
          message: "Registration failed: email already exists",
        });
        return reply.code(409).send({ message: "Email already exists" });
      }
    }

    request.log.error(err);
    void sendLog({
      dataset: "errors",
      level: "error",
      message: "Register handler failed",
    });
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function loginUserHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as loginInput;

    const user = await getUserByEmail(body.email);

    if (!user || !user.password) {
      void sendLog({
        dataset: "auth",
        level: "warn",
        message: "Login failed",
      });
      return reply.code(401).send({
        message: "Invalid email or password",
      });
    }

    if (!(await argon2.verify(user.password, body.password))) {
      return reply.code(401).send({
        message: "Invalid email or password",
      });
    }

    if (!user.isEmailVerified) {
      void sendLog({
        dataset: "auth",
        level: "warn",
        message: "Login blocked: email not verified",
      });
      return reply.code(403).send({
        message: "Please verify your email before logging in",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    if (user.isTwoFactorEnabled) {
      return reply.code(200).send({
        message: "Two-factor authentication required",
        code: "TWO_FACTOR_REQUIRED",
        pendingUserId: user.id,
      });
    }

    const session = await createSession(user.id);

    const token = await reply.jwtSign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        sessionId: session.id,
      },
      {
        sign: {
          expiresIn: env.JWT_EXPIRATION,
        },
      },
    );
    void sendLog({
      dataset: "security",
      level: "info",
      message: "JWT issued",
    });
    void sendLog({
      dataset: "auth",
      level: "info",
      message: "Login succeeded",
    });
    return reply
      .setCookie("authJwt", token, {
        // It attaches a Set-Cookie header to the HTTP response. "authJwt" is the cookie name (key). The cookie options have to be consistent with the options defined in server.ts when registering fastify-jwt. If the options do not match, the server will fail to recognize the cookie and the authentication will fail.
        path: "/", // The cookie will be sent in all requests to the server, regardless of the endpoint. This is important for authentication, as you want the token to be available in all requests after login.
        httpOnly: true, // Prevents JavaScript from accessing the cookie via document.cookie. Protects against XSS-based token theft.
        secure: env.NODE_ENV === "production", // Ensures that the cookie is only sent over HTTPS connectionsby attackers. Set to true in production.
        sameSite: "strict", // Prevents the browser from sending the cookie along with cross-site requests. Protects against CSRF attacks. "strict" is the most secure option, but it may cause issues if your frontend and backend are on different domains during development. In that case, you can use "lax" which allows some cross-site requests while still providing some CSRF protection.
      })
      .code(200)
      .send({
        id: user.id,
        email: user.email,
        name: user.name,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function logoutUserHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    request.log.info(`User ${request.user.email} is logging out`); // request.user is available because this handler is protected by the 'authenticate' preHandler that verifies the JWT and populates request.user with the payload of the token.

    await prisma.session.updateMany({
      where: { id: request.user.sessionId },
      data: { revoked: true },
    });
    void sendLog({
      dataset: "auth",
      level: "info",
      message: "Logout succeeded",
    });
    return reply
      .clearCookie("authJwt", {
        path: "/", // Must match the path used when setting the cookie so the browser can delete it correctly.
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .code(200)
      .send({ message: "Logout successful" });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function googleCallbackHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { code, state } = request.query as { code?: string; state?: string };
    const storedState = request.cookies.google_oauth_state;

    if (!code) {
      return reply.code(400).send({ message: "Missing authorization code" });
    }

    if (!state || !storedState || state !== storedState) {
      return reply.code(400).send({ message: "Invalid OAuth state" });
    }

    reply.clearCookie("google_oauth_state", {
      path: "/",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const raw = await tokenRes.json().catch(() => ({}));

    const parsed = GoogleTokenResponseSchema.safeParse(raw);

    if (!parsed.success) {
      request.log.error(parsed.error);
      return reply.code(400).send({ message: "Invalid token response from Google" });
    }

    const tokenData = parsed.data;

    if (!tokenRes.ok) {
      request.log.error(tokenData);
      return reply.code(400).send({ message: "Failed to exchange authorization code" });
    }

    const idToken = tokenData.id_token;

    if (!idToken) {
      return reply.code(400).send({ message: "Missing Google ID token" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.sub) {
      return reply.code(400).send({ message: "Missing Google account identity" });
    }

    if (!payload.email_verified) {
      return reply.code(400).send({ message: "Google account email is not verified" });
    }

    request.log.info({
      googleSub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
    });

    let user = await getUserByGoogleId(payload.sub);

    if (!user) {
      user = await getUserByEmail(payload.email);

      if (user) {
        if (user.googleId && user.googleId !== payload.sub) {
          return reply.code(400).send({
            message: "Account already linked to another Google account",
          });
        }

        if (!user.googleId) {
          user = await updateUserGoogleId(user.id, payload.sub);
        }
      } else {
        user = await createGoogleUser({
          email: payload.email,
          name: payload.name ?? "NoName",
          googleId: payload.sub,
        });
      }
    }

    if (!user) {
      return reply.code(500).send({ message: "Failed to resolve user account" });
    }

    const session = await createSession(user.id);

    const token = await reply.jwtSign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        sessionId: session.id,
      },
      {
        sign: {
          expiresIn: env.JWT_EXPIRATION,
        },
      },
    );

    return reply
      .setCookie("authJwt", token, {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .redirect(`${env.FRONTEND_URL}/play`);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function googleLoginHandler(_request: FastifyRequest, reply: FastifyReply) {
  const state = crypto.randomBytes(32).toString("hex");

  reply.setCookie("google_oauth_state", state, {
    path: "/",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return reply.redirect(url);
}

export async function forgotPasswordHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as emailInput;

    const user = await getUserByEmail(body.email);

    if (user) {
      await deleteUserTokensByType(user.id, "PASSWORD_RESET");

      const verification = await createUserToken(user.id, "PASSWORD_RESET");

      await sendTokenEmail({
        to: user.email,
        subject: "Reset your password",
        path: "/reset-password",
        token: verification.rawToken,
        text: "Click this link to reset your password",
      });
    }

    return reply.code(200).send({
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      message: "Internal Server Error",
    });
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function getValidUserToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const record = await prisma.userToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    return { error: "Invalid token" as const };
  }

  if (record.usedAt) {
    return { error: "Token has already been used" as const };
  }

  if (record.expiresAt < new Date()) {
    return { error: "Token has expired" as const };
  }

  return { record };
}

export async function verifyEmailHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { token } = request.body as { token: string };

    const result = await getValidUserToken(token);

    if ("error" in result) {
      return reply.code(400).send({ message: result.error });
    }

    const record = result.record;

    if (record.type === "EMAIL_VERIFICATION") {
      await prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      });

      await prisma.userToken.delete({
        where: { id: record.id },
      });

      return reply.code(200).send({ message: "Email verified successfully" });
    }

    if (record.type === "EMAIL_CHANGE") {
      if (!record.pendingEmail) {
        return reply.code(400).send({ message: "Invalid email change token" });
      }

      try {
        await prisma.user.update({
          where: { id: record.userId },
          data: { email: record.pendingEmail },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2002") {
            return reply.code(409).send({
              message: "Email is already in use",
            });
          }
        }

        throw err;
      }

      await prisma.session.updateMany({
        where: { userId: record.userId },
        data: { revoked: true },
      });

      await prisma.userToken.delete({
        where: { id: record.id },
      });
      void sendLog({
        dataset: "auth",
        level: "info",
        message: "Email verified",
      });
      return reply.code(200).send({
        message: "Email updated successfully",
        code: "EMAIL_CHANGED",
      });
    }

    return reply.code(400).send({ message: "Unsupported token type" });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function resendVerificationEmailHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as resendVerificationInput;

    const user = await getUserByEmail(body.email);

    if (!user) {
      return reply.code(200).send({
        message: "If an account with that email exists, a verification email has been sent.",
      });
    }

    if (user.isEmailVerified) {
      return reply.code(400).send({
        message: "Email is already verified.",
      });
    }

    await deleteUserTokensByType(user.id, "EMAIL_VERIFICATION");

    const verification = await createUserToken(user.id, "EMAIL_VERIFICATION");
    await sendVerificationEmail(user.email, verification.rawToken);

    return reply.code(200).send({
      message: "Verification email sent.",
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      message: "Internal Server Error",
    });
  }
}

export async function resetPasswordHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { token, newPassword, twoFactorCode } = request.body as {
      token: string;
      newPassword: string;
      twoFactorCode?: string;
    };

    const result = await getValidUserToken(token);

    if ("error" in result) {
      return reply.code(400).send({ message: result.error });
    }

    const record = result.record;

    if (record.type !== "PASSWORD_RESET") {
      return reply.code(400).send({ message: "Invalid password reset token" });
    }

    const user = await getUserById(record.userId);

    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    if (user.isTwoFactorEnabled) {
      if (!twoFactorCode) {
        return reply.code(400).send({
          message: "Two-factor authentication code is required",
        });
      }

      const twoFactorResult = await validateTwoFactorCode(user, twoFactorCode);

      if ("error" in twoFactorResult) {
        return reply.code(400).send({
          message: twoFactorResult.error,
        });
      }
    }

    const hashedPassword = await argon2.hash(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      prisma.session.updateMany({
        where: { userId: record.userId },
        data: { revoked: true },
      }),
      prisma.userToken.delete({
        where: { id: record.id },
      }),
    ]);

    await sendSecurityAlertEmail({
      to: user.email,
      subject: "Account password changed",
      text: `
Your account password was changed.

If this was you, no action is required.

If this was not you:
- Reset your password immediately.
- Contact support if you need assistance.

Best regards,
Snake42 Team
snake42@app.com
          `,
    });

    return reply.code(200).send({
      message: "Password reset successfully. Please log in again.",
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}
