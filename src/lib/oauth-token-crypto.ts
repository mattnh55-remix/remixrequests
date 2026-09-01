import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function tokenKey() {
  const encoded = process.env.OAUTH_TOKEN_ENCRYPTION_KEY || "";
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte value.");
  }
  return key;
}

export function encryptOAuthToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptOAuthToken(value: string) {
  const [ivEncoded, tagEncoded, payloadEncoded] = value.split(".");
  if (!ivEncoded || !tagEncoded || !payloadEncoded) {
    throw new Error("Google OAuth token is not encrypted. Reconnect Google Business Profile.");
  }
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(payloadEncoded, "base64url")), decipher.final()]).toString("utf8");
}
