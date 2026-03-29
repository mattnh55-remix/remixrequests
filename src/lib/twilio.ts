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

  if (!sid || !token) {
    console.error("TWILIO_ENV_MISSING", {
      hasAccountSid: Boolean(sid),
      hasAuthToken: Boolean(token),
      hasFrom: Boolean(process.env.TWILIO_FROM),
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
    });
  }

  if (!sid) throw new Error("Missing env var: TWILIO_ACCOUNT_SID");
  if (!token) throw new Error("Missing env var: TWILIO_AUTH_TOKEN");

  _client = Twilio(sid, token);
  return _client;
}

export async function sendSms(to: string, body: string) {
  const client = getTwilioClient();
  const from = getTwilioFrom();

  return client.messages.create({
    to,
    from,
    body: String(body || "").trim(),
  });
}
