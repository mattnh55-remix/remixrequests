import crypto from "crypto";

export function getOrCreateDeviceId(cookieHeader: string | null) {
  const match = cookieHeader?.match(/rm_device=([^;]+)/);
  if (match?.[1]) return { deviceId: match[1], setCookie: null as string | null };

  const deviceId = crypto.randomBytes(16).toString("hex");
  const setCookie = `rm_device=${deviceId}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
  return { deviceId, setCookie };
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}