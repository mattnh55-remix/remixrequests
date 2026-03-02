import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { hashEmail } from "@/lib/security";
import { getOrCreateDeviceId, sha256 } from "@/lib/device";
import { getTwilioClient, getTwilioFrom } from "@/lib/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhoneToE164(raw: string) {
  const input = (raw || "").trim();
  if (input.startsWith("+")) return input;

  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return input;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const reqId = crypto.randomUUID();

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const location = String(body.location || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const emailOptIn = Boolean(body.emailOptIn);
    const smsOptIn = Boolean(body.smsOptIn);

    if (!location || !email || !phone) {
      return NextResponse.json({ ok: false, error: "Missing fields." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
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
      where: { locationId: loc.id, deviceId, sentAt: { gte: tenMinAgo } },
    });

    if (recent >= 3) {
      console.warn("AUTH_START_RATE_LIMIT", { reqId, locationId: loc.id, deviceId });
      return NextResponse.json(
        { ok: false, error: "Too many codes. Try again in a few minutes." },
        { status: 429 }
      );
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
      },
    });

    // OTP code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const otp = await prisma.otpCode.create({
      data: {
        locationId: loc.id,
        emailHash,
        phoneE164,
        phoneHash,
        codeHash,
        expiresAt,
        ipHash: sha256(ip),
        deviceId,
      },
      select: { id: true },
    });

    // Send SMS (lazy init; env checked at call time)
    try {
      const twilio = getTwilioClient();
      const from = getTwilioFrom();

      await twilio.messages.create({
        from,
        to: phoneE164,
        body: `Your Remix verification code is ${code}. It expires in 10 minutes.`,
      });
    } catch (err: any) {
      console.error("AUTH_START_TWILIO_SEND_FAILED", {
        reqId,
        otpId: otp.id,
        toLast4: phoneE164.slice(-4),
        message: err?.message || String(err),
        code: err?.code,
        status: err?.status,
      });

      // Best-effort cleanup so failed SMS doesn’t leave valid OTP sitting around
      try {
        await prisma.otpCode.delete({ where: { id: otp.id } });
      } catch (cleanupErr: any) {
        console.error("AUTH_START_OTP_CLEANUP_FAILED", {
          reqId,
          otpId: otp.id,
          message: cleanupErr?.message || String(cleanupErr),
        });
      }

      return NextResponse.json({ ok: false, error: "Could not send code." }, { status: 502 });
    }

    console.log("AUTH_START_OK", {
      reqId,
      locationId: loc.id,
      deviceId,
      toLast4: phoneE164.slice(-4),
    });

    const res = NextResponse.json({ ok: true });
    if (setCookie) res.headers.set("set-cookie", setCookie);
    return res;
  } catch (err: any) {
    console.error("AUTH_START_FATAL", { reqId, message: err?.message || String(err), stack: err?.stack });
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}