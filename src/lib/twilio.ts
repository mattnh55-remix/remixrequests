import Twilio from "twilio";

let _client: ReturnType<typeof Twilio> | null = null;

export function getTwilioFrom() {
  const from = process.env.TWILIO_FROM;
  if (!from) {
    throw new Error("Missing env var: TWILIO_FROM");
  }
  return from;
}

export function getTwilioClient() {
  if (_client) return _client;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  // Log presence only (never log secrets)
  if (!sid || !token) {
    console.error("TWILIO_ENV_MISSING", {
      hasAccountSid: Boolean(sid),
      hasAuthToken: Boolean(token),
      hasFrom: Boolean(process.env.TWILIO_FROM),
      // helpful to confirm runtime environment
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
    });
  }

  if (!sid) throw new Error("Missing env var: TWILIO_ACCOUNT_SID");
  if (!token) throw new Error("Missing env var: TWILIO_AUTH_TOKEN");

  _client = Twilio(sid, token);
  return _client;
}