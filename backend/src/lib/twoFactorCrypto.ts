import crypto from "crypto";
import { env } from "../config.js";

const ALGORITHM = "aes-256-gcm";

const key = Buffer.from(env.TWO_FACTOR_ENCRYPTION_KEY, "base64");

if (key.length !== 32) {
  throw new Error("Invalid TWO_FACTOR_ENCRYPTION_KEY length");
}

export function encryptSecret(secret: string) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    content: encrypted.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptSecret(encrypted: { iv: string; content: string; tag: string }) {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(encrypted.iv, "base64"));

  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.content, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
