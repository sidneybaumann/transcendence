import { prisma } from "../../lib/prisma.js";
import * as OTPAuth from "otpauth";
import { decryptSecret } from "../../lib/twoFactorCrypto.js";
import crypto from "crypto";
import argon2 from "argon2";

type TwoFactorUserLike = {
  email: string;
  twoFactorSecret: string | null;
};

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  return user;
}

export async function validateTwoFactorCode(user: TwoFactorUserLike, code: string) {
  if (!user.twoFactorSecret) {
    return { error: "Two-factor authentication is not set up" as const };
  }

  let encryptedSecret: { iv: string; content: string; tag: string };

  try {
    encryptedSecret = JSON.parse(user.twoFactorSecret) as {
      iv: string;
      content: string;
      tag: string;
    };
  } catch {
    return { error: "Invalid two-factor authentication data" as const };
  }

  const decryptedSecret = decryptSecret(encryptedSecret);

  const totp = new OTPAuth.TOTP({
    issuer: "Snake42",
    label: user.email,
    secret: OTPAuth.Secret.fromBase32(decryptedSecret),
  });

  const delta = totp.validate({
    token: code.trim(),
    window: 1,
  });

  if (delta === null) {
    return { error: "Invalid verification code" as const };
  }

  return { success: true as const };
}

// RECOVERY CODES - HELPERS
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];

  for (let i = 0; i < 10; i++) {
    const code = crypto
      .randomBytes(4) // 4 bytes = 8 hex chars
      .toString("hex")
      .toUpperCase()
      .match(/.{1,4}/g)!
      .join("-");

    codes.push(code);
  }
  return codes;
}

export async function hashCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => argon2.hash(code)));
}

export async function saveRecoveryCodes(userId: string, hashedCodes: string[]) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      recoveryCodes: hashedCodes,
    },
  });
}

// RECOVERY CODES - API
export async function generateAndStoreRecoveryCodes(userId: string) {
  const codes = generateRecoveryCodes();
  const hashedCodes = await hashCodes(codes);

  await saveRecoveryCodes(userId, hashedCodes);

  return codes;
}

export async function verifyRecoveryCode(
  user: {
    id: string;
    recoveryCodes: string[];
  },
  inputCode: string,
) {
  const trimmedCode = inputCode.trim();

  for (const storedHash of user.recoveryCodes) {
    const matches = await argon2.verify(storedHash, trimmedCode);

    if (matches) {
      const remainingCodes = user.recoveryCodes.filter((code) => code !== storedHash);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          recoveryCodes: remainingCodes,
        },
      });

      return { success: true as const };
    }
  }

  return { error: "Invalid verification code" as const };
}
