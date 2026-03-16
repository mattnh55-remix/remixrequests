//--- src/app/api/public/auth/verify/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getCreditBalance } from "@/lib/validators";
import { hashEmail } from "@/lib/security";
import { getOrCreateDeviceId } from "@/lib/device";
import { subscribeMailchimp } from "@/lib/mailchimp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

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

    if (otp.attempts >= otp.maxAttempts) {
      console.warn("AUTH_VERIFY_LOCKED", { reqId, otpId: otp.id, locationId: loc.id, deviceId });
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Request a new code." },
        { status: 429 }
      );
    }

    await prisma.otpCode.delete({ where: { id: otp.id } });

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
      select: { id: true },
    });

    if (!emailOptIn) {
      let balance: number | null = null;
      try {
        balance = await getCreditBalance(loc.id, emailHash);
      } catch {}

      const res = NextResponse.json({
        ok: true,
        verified: true,
        identityId: identity.id,
        welcomeGranted: false,
        balance,
        note: "Opt-in required for welcome credits.",
      });
      if (setCookie) res.headers.set("set-cookie", setCookie);
      console.log("AUTH_VERIFY_OK_NO_OPTIN", { reqId, locationId: loc.id, identityId: identity.id });
      return res;
    }

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

      return NextResponse.json(
        { ok: false, error: "Could not subscribe. Please try again." },
        { status: 400 }
      );
    }

    const welcomeCredits = Number(process.env.WELCOME_CREDITS || "5");
    const todayStart = startOfTodayLocal();

    const alreadyGrantedToday = await prisma.creditLedger.findFirst({
      where: {
        locationId: loc.id,
        emailHash,
        reason: "WELCOME",
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });

    if (alreadyGrantedToday) {
      let balance: number | null = null;
      try {
        balance = await getCreditBalance(loc.id, emailHash);
      } catch (e: any) {
        console.error("AUTH_VERIFY_BALANCE_FAILED_ALREADY_GRANTED", {
          reqId,
          locationId: loc.id,
          identityId: identity.id,
          message: e?.message || String(e),
        });
      }

      const res = NextResponse.json({
        ok: true,
        verified: true,
        identityId: identity.id,
        welcomeGranted: false,
        balance,
        note: "You already claimed your free welcome points today. Come back tomorrow for another free claim.",
      });
      if (setCookie) res.headers.set("set-cookie", setCookie);

      console.log("AUTH_VERIFY_OK_ALREADY_GRANTED_TODAY", {
        reqId,
        locationId: loc.id,
        identityId: identity.id,
        welcomeLedgerId: alreadyGrantedToday.id,
        grantedAt: alreadyGrantedToday.createdAt.toISOString(),
      });

      return res;
    }

    await prisma.creditLedger.create({
      data: {
        locationId: loc.id,
        emailHash,
        delta: welcomeCredits,
        reason: "WELCOME",
      },
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
    }

    const res = NextResponse.json({
      ok: true,
      verified: true,
      identityId: identity.id,
      welcomeGranted: true,
      balance,
      note: `Welcome points added: +${welcomeCredits}.`,
    });
    if (setCookie) res.headers.set("set-cookie", setCookie);

    console.log("AUTH_VERIFY_OK_GRANTED", {
      reqId,
      locationId: loc.id,
      identityId: identity.id,
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
