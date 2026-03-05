//--- src/lib/security.ts
import crypto from "crypto";

export function normalizeArtistKey(artist: string) {
  return artist
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashEmail(email: string) {
  const norm = email.trim().toLowerCase();
  return crypto.createHash("sha256").update(norm).digest("hex");
}

export function hashPhoneE164(phoneE164: string) {
  const norm = phoneE164.trim();
  return crypto.createHash("sha256").update(norm).digest("hex");
}
