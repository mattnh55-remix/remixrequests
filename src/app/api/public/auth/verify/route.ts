//--- src/app/api/public/auth/verify/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession, getCreditBalance } from "@/lib/validators";
import { hashEmail } from "@/lib/security";
import { getOrCreateDeviceId, sha256 } from "@/lib/device";
import { subscribeMailchimp } from "@/lib/mailchimp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const reqId = crypto.randomUUID();

  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const location = String(body.location || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    const emailOptIn = Boolean(body.emailOptIn);
    const smsOptIn = Boolean(body.smsOptIn);

    if (!location || !email || !code) {
      return NextResponse.json({ ok: false, error: "Missing fields." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
    }

    const { loc } = await getRulesForLocation(location);
    const { deviceId, setCookie } = getOrCreateDeviceId(req.headers.get("cookie"));
    const emailHash = hashEmail(email);

    // Session used for welcome-credit gating (4-hour reset)
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    // Find latest matching, unexpired OTP for this device/email/location
    const otp = await prisma.otpCode.findFirst({
      where: {
        locationId: loc.id,
        emailHash,
        deviceId,
        codeHash,
        expiresAt: { gt: new Date() },
      },
      orderBy: { sentAt: "desc" },
    });

    if (!otp) {
      console.warn("AUTH_VERIFY_BAD_CODE", { reqId, locationId: loc.id, deviceId });
      return NextResponse.json({ ok: false, error: "Invalid or expired code." }, { status: 400 });
    }

    // If already locked out, stop early
    if (otp.attempts >= otp.maxAttempts) {
      console.warn("AUTH_VERIFY_LOCKED", { reqId, otpId: otp.id, locationId: loc.id, deviceId });
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Request a new code." },
        { status: 429 }
      );
    }

    // Consume the OTP on success (and prevent replay) by deleting it.
    // Also: if you want to keep history, replace delete with update({ usedAt: new Date() })
    await prisma.otpCode.delete({ where: { id: otp.id } });

    // Mark verified on Identity (upsert)
    const identity = await prisma.identity.upsert({
      where: { locationId_emailHash: { locationId: loc.id, emailHash } },
      update: {
        deviceId,
        smsVerifiedAt: new Date(),
        emailOptInAt: emailOptIn ? new Date() : undefined,
        smsOptInAt: smsOptIn ? new Date() : undefined,
      },
      create: {
        locationId: loc.id,
        emailHash,
        deviceId,
        smsVerifiedAt: new Date(),
        emailOptInAt: emailOptIn ? new Date() : undefined,
        smsOptInAt: smsOptIn ? new Date() : undefined,
      },
      select: { id: true, welcomeGrantedSessionId: true },
    });

    // Always return identityId when verified so the frontend can pass it into Square checkout
    if (!emailOptIn) {
      const res = NextResponse.json({
        ok: true,
        verified: true,
        identityId: identity.id,
        welcomeGranted: false,
        note: "Opt-in required for welcome credits.",
      });
      if (setCookie) res.headers.set("set-cookie", setCookie);
      console.log("AUTH_VERIFY_OK_NO_OPTIN", { reqId, locationId: loc.id, identityId: identity.id });
      return res;
    }

    // Subscribe Mailchimp (immediate)
    try {
      await subscribeMailchimp(email, ["Remix Requests"]);
      await prisma.identity.update({
        where: { id: identity.id },
        data: { mailchimpStatus: "subscribed", mailchimpError: null },
      });
    } catch (e: any) {
      await prisma.identity.update({
        where: { id: identity.id },
        data: { mailchimpStatus: "error", mailchimpError: String(e?.message || "mailchimp error") },
      });

      console.error("AUTH_VERIFY_MAILCHIMP_FAILED", {
        reqId,
        locationId: loc.id,
        identityId: identity.id,
        message: e?.message || String(e),
      });

      // Your current rule: block credits if Mailchimp fails
      return NextResponse.json(
        { ok: false, error: "Could not subscribe. Please try again." },
        { status: 400 }
      );
    }

    // Grant welcome credits once per session
    const welcomeCredits = Number(process.env.WELCOME_CREDITS || "5");

    if (identity.welcomeGrantedSessionId === session.id) {
      const res = NextResponse.json({
        ok: true,
        verified: true,
        identityId: identity.id,
        welcomeGranted: false,
        note: "Welcome already granted this session.",
      });
      if (setCookie) res.headers.set("set-cookie", setCookie);
      console.log("AUTH_VERIFY_OK_ALREADY_GRANTED", {
        reqId,
        locationId: loc.id,
        identityId: identity.id,
        sessionId: session.id,
      });
      return res;
    }

    await prisma.$transaction(async (tx) => {
      // NOTE: leaving this in your current shape (locationId + emailHash)
      // If you’ve already migrated CreditLedger to identityId, tell me and I’ll adjust this block.
      await tx.creditLedger.create({
        data: {
          locationId: loc.id,
          emailHash,
          delta: welcomeCredits,
          reason: "WELCOME",
        },
      });

      await tx.identity.update({
        where: { id: identity.id },
        data: { welcomeGrantedSessionId: session.id },
      });
    });

    let balance: number | null = null;
    try {
      balance = await getCreditBalance(loc.id, emailHash);
    } catch (e: any) {
      console.error("AUTH_VERIFY_BALANCE_FAILED", {
        reqId,
        locationId: loc.id,
        identityId: identity.id,
        message: e?.message || String(e),
      });
      // Non-fatal: still verified and credits granted
    }

    const res = NextResponse.json({
      ok: true,
      verified: true,
      identityId: identity.id,
      welcomeGranted: true,
      balance,
    });
    if (setCookie) res.headers.set("set-cookie", setCookie);

    console.log("AUTH_VERIFY_OK_GRANTED", {
      reqId,
      locationId: loc.id,
      identityId: identity.id,
      sessionId: session.id,
      welcomeCredits,
    });

    return res;
  } catch (err: any) {
    console.error("AUTH_VERIFY_FATAL", {
      reqId,
      message: err?.message || String(err),
      stack: err?.stack,
    });
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}