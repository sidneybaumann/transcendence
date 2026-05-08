import { FastifyReply, FastifyRequest } from "fastify";
import type { updateEmailInput, updateNameInput, updatePasswordInput } from "./user.schema.js";
import argon2 from "argon2";
import {
  getUserByEmail,
  getUserById,
  updateUserNameById,
  updatePasswordById,
} from "./user.service.js";
import { sendTokenEmail, sendSecurityAlertEmail } from "../../lib/mailServer.js";
import { createUserToken, deleteUserTokensByType } from "../auth/auth.tokens.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config.js";
import crypto from "crypto";
import { sendLog } from "../../lib/logstash.js";
import { validateTwoFactorCode } from "../2fa/2fa.service.js";

export async function getMeHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = await getUserById(request.user.id);

  if (!user) {
    return reply.code(404).send({ message: "User not found" });
  }
  void sendLog({
    dataset: "server",
    level: "info",
    message: "Profile fetched",
  });
  return reply.code(200).send({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      isEmailVerified: user.isEmailVerified,
      isGoogleLinked: !!user.googleId,
      hasPassword: !!user.password,
      recoveryCodesCount: user.recoveryCodes.length,
    },
  });
}

export async function updateMeHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as updateNameInput;

    const updatedUser = await updateUserNameById(request.user.id, body.newName);

    return reply.code(200).send({
      id: updatedUser.id,
      name: updatedUser.name,
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function updateEmailHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as updateEmailInput;

    const user = await getUserById(request.user.id);

    if (!user || !user.password) {
      return reply.code(401).send({
        message: "Invalid email or password",
      });
    }

    if (!(await argon2.verify(user.password, body.currentPassword))) {
      return reply.code(400).send({
        message: "Current password is incorrect",
      });
    }

    if (user.isTwoFactorEnabled) {
      if (!body.twoFactorCode) {
        return reply.code(400).send({
          message: "Two-factor authentication code is required",
        });
      }

      const twoFactorResult = await validateTwoFactorCode(user, body.twoFactorCode);

      if ("error" in twoFactorResult) {
        return reply.code(400).send({
          message: twoFactorResult.error,
        });
      }
    }

    const existingUser = await getUserByEmail(body.newEmail);

    if (existingUser) {
      return reply.code(409).send({
        message: "Email already in use",
      });
    }

    await deleteUserTokensByType(user.id, "EMAIL_CHANGE");

    const verification = await createUserToken(user.id, "EMAIL_CHANGE", {
      pendingEmail: body.newEmail,
    });

    await sendSecurityAlertEmail({
      to: user.email,
      subject: "A request was made to change your email address",
      text: `
We received a request to change the email address associated with your account.

If this was you, you can ignore this message.

If you did not request this change:
- Secure your account immediately by resetting your password.
- Review your account activity.
- Contact support if you need assistance.

If this change is completed, your old email will no longer be associated with your account.

Best regards,
Snake42 Team
snake42@app.com
            `,
    });

    await sendTokenEmail({
      to: body.newEmail,
      subject: "Verify your email",
      path: "/verify-email",
      token: verification.rawToken,
      text: "Please verify your email by clicking this link",
    });
    void sendLog({
      dataset: "auth",
      level: "info",
      message: "Email change verification sent",
    });

    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });

    return reply
      .clearCookie("authJwt", {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .code(200)
      .send({
        message: "Please verify your new email address.",
      });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return reply.code(409).send({
          message: "Email already in use",
        });
      }
    }

    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function updatePasswordHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as updatePasswordInput;

    const user = await getUserById(request.user.id);

    if (!user || !user.password) {
      return reply.code(401).send({
        message: "Invalid email or password",
      });
    }

    const isCurrentPasswordValid = await argon2.verify(user.password, body.currentPassword);

    if (!isCurrentPasswordValid) {
      void sendLog({
        dataset: "security",
        level: "warn",
        message: "Password update failed: invalid current password",
      });
      return reply.code(400).send({
        message: "Current password is incorrect",
      });
    }

    if (user.isTwoFactorEnabled) {
      if (!body.twoFactorCode) {
        return reply.code(400).send({
          message: "Two-factor authentication code is required",
        });
      }

      const twoFactorResult = await validateTwoFactorCode(user, body.twoFactorCode);

      if ("error" in twoFactorResult) {
        return reply.code(400).send({
          message: twoFactorResult.error,
        });
      }
    }

    const hashedNewPassword = await argon2.hash(body.newPassword);

    await updatePasswordById(user.id, hashedNewPassword);

    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });

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
    void sendLog({
      dataset: "security",
      level: "info",
      message: "Password updated",
    });
    return reply
      .clearCookie("authJwt", {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .code(200)
      .send({
        message: "Password updated successfully. Please log in again.",
      });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function exportUserDataHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as {
      currentPassword: string;
      twoFactorCode?: string;
    };

    const user = await getUserById(request.user.id);

    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    if (user.password) {
      if (!body.currentPassword) {
        return reply.code(400).send({ message: "Password is required" });
      }

      const passwordMatches = await argon2.verify(user.password, body.currentPassword);

      if (!passwordMatches) {
        return reply.code(400).send({ message: "Current password is incorrect" });
      }
    }

    if (user.isTwoFactorEnabled) {
      if (!body.twoFactorCode) {
        return reply.code(400).send({
          message: "Two-factor authentication code is required",
        });
      }

      const result = await validateTwoFactorCode(user, body.twoFactorCode);

      if ("error" in result) {
        return reply.code(400).send({ message: result.error });
      }
    }

    const exportData = {
      exportedAt: new Date().toISOString(),

      account: {
        name: user.name,
        email: user.email,
        emailVerified: user.isEmailVerified,
        twoFactorEnabled: user.isTwoFactorEnabled,
        googleAccountLinked: !!user.googleId,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };

    await sendSecurityAlertEmail({
      to: user.email,
      subject: "Your data export was requested",
      text: `
We received a request to export your account data.

If this was you, no action is needed.

If this was not you, please secure your account immediately.

Best regards,
Snake42 Team
snake42@app.com
      `,
    });

    return reply
      .header("Content-Type", "application/json; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="snake-user-data.json"')
      .send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function deleteAccountHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as {
      currentPassword: string;
      twoFactorCode?: string;
      confirmation: "DELETE";
    };

    const user = await getUserById(request.user.id);

    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    if (body.confirmation !== "DELETE") {
      return reply.code(400).send({ message: "Deletion confirmation is required" });
    }

    if (user.password) {
      if (!body.currentPassword) {
        return reply.code(400).send({ message: "Password is required" });
      }

      const passwordMatches = await argon2.verify(user.password, body.currentPassword);

      if (!passwordMatches) {
        return reply.code(400).send({ message: "Current password is incorrect" });
      }
    }

    if (user.isTwoFactorEnabled) {
      if (!body.twoFactorCode) {
        return reply.code(400).send({
          message: "Two-factor authentication code is required",
        });
      }

      const result = await validateTwoFactorCode(user, body.twoFactorCode);

      if ("error" in result) {
        return reply.code(400).send({ message: result.error });
      }
    }

    const oldEmail = user.email;

    const randomId = crypto.randomBytes(16).toString("hex");

    await prisma.$transaction([
      prisma.session.updateMany({
        where: { userId: user.id },
        data: { revoked: true },
      }),
      prisma.userToken.deleteMany({
        where: { userId: user.id },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          name: `Deleted user`,
          email: `deleted-${randomId}@deleted.local`,
          password: null,
          googleId: null,
          isEmailVerified: false,
          isTwoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorConfirmedAt: null,
        },
      }),
    ]);

    await sendSecurityAlertEmail({
      to: oldEmail,
      subject: "Your account has been deactivated",
      text: `
Your account has been anonymised and deactivated. Personal data has been removed or irreversibly anonymised, and the account can no longer be used.

If this was not you, please contact support immediately.

Best regards,
Snake42 Team
snake42@app.com
      `,
    });

    return reply
      .clearCookie("authJwt", {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .code(200)
      .send({ message: "Account deleted successfully" });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}
