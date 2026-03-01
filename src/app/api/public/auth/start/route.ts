import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { hashEmail } from "@/lib/security";
import { getOrCreateDeviceId, sha256 } from "@/lib/device";
import { twilioClient, TWILIO_FROM } from "@/lib/twilio";

function normalizePhoneToE164(raw: string) {
  // Minimal: assumes US numbers if 10 digits. You can improve later.
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return raw; // fallback
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const body = await req.json();

  const location = String(body.location || "");
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const emailOptIn = Boolean(body.emailOptIn);
  const smsOptIn = Boolean(body.smsOptIn);

  if (!location || !email || !phone) {
    return NextResponse.json({ ok: false, error: "Missing fields." }, { status: 400 });
  }
  // Basic email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }

  const { loc } = await getRulesForLocation(location);
  const { deviceId, setCookie } = getOrCreateDeviceId(req.headers.get("cookie"));
  const emailHash = hashEmail(email);
  const phoneE164 = normalizePhoneToE164(phone);
  const phoneHash = sha256(phoneE164);

  // Rate limit (simple): 3 OTP per 10 min per device
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await prisma.otpCode.count({
    where: { locationId: loc.id, deviceId, sentAt: { gte: tenMinAgo } }
  });
  if (recent >= 3) {
    return NextResponse.json({ ok: false, error: "Too many codes. Try again in a few minutes." }, { status: 429 });
  }

  // Create/update identity with opt-ins captured (not verified yet)
  await prisma.identity.upsert({
    where: { locationId_emailHash: { locationId: loc.id, emailHash } },
    update: {
      phoneE164,
      phoneHash,
      deviceId,
      emailOptInAt: emailOptIn ? new Date() : undefined,
      smsOptInAt: smsOptIn ? new Date() : undefined,
    },
    create: {
      locationId: loc.id,
      emailHash,
      phoneE164,
      phoneHash,
      deviceId,
      emailOptInAt: emailOptIn ? new Date() : undefined,
      smsOptInAt: smsOptIn ? new Date() : undefined,
    }
  });

  // OTP code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      locationId: loc.id,
      emailHash,
      phoneE164,
      phoneHash,
      codeHash,
      expiresAt,
      ipHash: sha256(ip),
      deviceId
    }
  });

  // Send SMS
  await twilioClient.messages.create({
    from: TWILIO_FROM,
    to: phoneE164,
    body: `Your Remix verification code is ${code}. It expires in 10 minutes.`
  });

  const res = NextResponse.json({ ok: true });
  if (setCookie) res.headers.set("set-cookie", setCookie);
  return res;
}