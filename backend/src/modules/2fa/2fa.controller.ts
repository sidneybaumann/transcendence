import { FastifyReply, FastifyRequest } from "fastify";
import { getUserById, generateAndStoreRecoveryCodes, verifyRecoveryCode } from "./2fa.service.js";
import { createSession } from "../auth/auth.service.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config.js";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { decryptSecret, encryptSecret } from "../../lib/twoFactorCrypto.js";

export async function twoFactorSetupHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = await getUserById(request.user.id);

    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    if (user.isTwoFactorEnabled) {
      return reply.code(400).send({
        message: "Two-factor authentication is already enabled",
      });
    }

    const secret = new OTPAuth.Secret();

    const totp = new OTPAuth.TOTP({
      issuer: "Snake42",
      label: user.email,
      secret,
    });

    const otpauthUrl = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    const manualKey = secret.base32;
    const encryptedSecret = encryptSecret(manualKey);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: JSON.stringify(encryptedSecret),
        twoFactorConfirmedAt: null,
      },
    });

    return reply.code(200).send({
      message: "Scan the QR code or enter the key manually.",
      qrCodeDataUrl,
      manualKey,
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

async function validateTwoFactorCode(
  user: {
    email: string;
    twoFactorSecret: string | null;
  },
  code: string,
) {
  if (!user.twoFactorSecret) {
    return { error: "Two-factor authentication is not set up" };
  }

  try {
    const encryptedSecret = JSON.parse(user.twoFactorSecret) as {
      iv: string;
      content: string;
      tag: string;
    };

    const decryptedSecret = decryptSecret(encryptedSecret);

    const totp = new OTPAuth.TOTP({
      issuer: "Snake42",
      label: user.email,
      secret: OTPAuth.Secret.fromBase32(decryptedSecret),
    });

    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      return { error: "Invalid verification code" };
    }

    return { success: true };
  } catch (err) {
    return { error: "Unable to verify two-factor authentication" };
  }
}

export async function twoFactorVerifyHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as { code: string };
    const user = await getUserById(request.user.id);

    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    const result = await validateTwoFactorCode(user, body.code);

    if ("error" in result) {
      return reply.code(400).send({ message: result.error });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isTwoFactorEnabled: true,
        twoFactorConfirmedAt: new Date(),
      },
    });

    const recoveryCodes = await generateAndStoreRecoveryCodes(user.id);

    return reply.code(200).send({
      message: "Two-factor authentication enabled successfully",
      recoveryCodes,
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function twoFactorVerifyLoginHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as { userId: string; code: string };
    const user = await getUserById(body.userId);

    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    if (!user.isTwoFactorEnabled) {
      return reply.code(400).send({ message: "Two-factor authentication is not enabled" });
    }

    const result = await validateTwoFactorCode(user, body.code);

    if ("error" in result) {
      const recoveryResult = await verifyRecoveryCode(user, body.code);

      if ("error" in recoveryResult) {
        return reply.code(400).send({
          message: "Invalid verification code",
        });
      }
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

// DISABLE 2FA
export async function disableTwoFactorHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as { code: string };
    const user = await getUserById(request.user.id);

    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      return reply.code(400).send({ message: "2FA is not enabled" });
    }

    const encryptedSecret = JSON.parse(user.twoFactorSecret);
    const decryptedSecret = decryptSecret(encryptedSecret);

    const totp = new OTPAuth.TOTP({
      issuer: "Snake42",
      label: user.email,
      secret: OTPAuth.Secret.fromBase32(decryptedSecret),
    });

    const delta = totp.validate({ token: body.code, window: 1 });

    if (delta === null) {
      const recoveryResult = await verifyRecoveryCode(user, body.code);

      if ("error" in recoveryResult) {
        return reply.code(400).send({ message: "Invalid verification code" });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorConfirmedAt: null,
        recoveryCodes: [],
      },
    });

    return reply.code(200).send({
      message: "Two-factor authentication disabled",
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}

export async function cancelTwoFactorSetupHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = await getUserById(request.user.id);

    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    if (user.isTwoFactorEnabled) {
      return reply.code(400).send({ message: "Two-factor authentication is already enabled" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: null,
        twoFactorConfirmedAt: null,
      },
    });

    return reply.code(200).send({
      message: "Two-factor setup canceled",
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ message: "Internal Server Error" });
  }
}
