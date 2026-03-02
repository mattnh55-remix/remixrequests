import Twilio from "twilio";

export function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  }

  return Twilio(sid, token);
}

export function getVerifyServiceSid() {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!serviceSid) throw new Error("Missing TWILIO_VERIFY_SERVICE_SID");
  return serviceSid;
}

export function getVerifyChannel() {
  return process.env.TWILIO_VERIFY_CHANNEL || "sms";
}