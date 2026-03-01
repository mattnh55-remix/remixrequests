import crypto from "crypto";

function verifyJwt(token: string) {
  const secret = process.env.ADMIN_JWT_SECRET || "dev";
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [h, b, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(`${h}.${b}`).digest("base64url");
  if (expected !== sig) return null;

  try {
    const payload = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    return payload;
  } catch {
    return null;
  }
}

export function isAdminFromCookie(cookieHeader: string | null) {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(/rm_admin=([^;]+)/);
  if (!match) return false;
  const payload = verifyJwt(match[1]);
  return payload?.role === "admin";
}
