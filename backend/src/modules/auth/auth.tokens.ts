import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

type UserTokenType = "EMAIL_VERIFICATION" | "EMAIL_CHANGE" | "PASSWORD_RESET";

export async function createUserToken(
  userId: string,
  type: UserTokenType,
  options?: { pendingEmail?: string; expiresInMs?: number },
) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(Date.now() + (options?.expiresInMs ?? 1000 * 60 * 60));

  await prisma.userToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      type,
      pendingEmail: options?.pendingEmail,
    },
  });

  return { rawToken, expiresAt };
}

export async function deleteUserTokensByType(userId: string, type: UserTokenType) {
  await prisma.userToken.deleteMany({
    where: {
      userId,
      type,
    },
  });
}
