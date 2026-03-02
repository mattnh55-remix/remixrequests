import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession, getCreditBalance } from "@/lib/validators";
import { hashEmail } from "@/lib/security";
import { getOrCreateDeviceId } from "@/lib/device";
import { subscribeMailchimp } from "@/lib/mailchimp";

export async function POST(req: Request) {
  const body = await req.json();
  const location = String(body.location || "");
  const email = String(body.email || "").trim();
  const code = String(body.code || "").trim();
  const emailOptIn = Boolean(body.emailOptIn);
  const smsOptIn = Boolean(body.smsOptIn);

  if (!location || !email || !code) {
    return NextResponse.json({ ok: false, error: "Missing fields." }, { status: 400 });
  }

  const { loc } = await getRulesForLocation(location);
  const { deviceId, setCookie } = getOrCreateDeviceId(req.headers.get("cookie"));
  const emailHash = hashEmail(email);

  const session = await getOrCreateCurrentSession(loc.id, 4);

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const otp = await prisma.otpCode.findFirst({
    where: {
      locationId: loc.id,
      emailHash,
      deviceId,
      codeHash,
      expiresAt: { gt: new Date() }
    },
    orderBy: { sentAt: "desc" }
  });

  if (!otp) {
    return NextResponse.json({ ok: false, error: "Invalid or expired code." }, { status: 400 });
  }

  if (otp.attempts >= otp.maxAttempts) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Request a new code." }, { status: 429 });
  }

  // Mark verified
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
    }
  });

  // Require email opt-in for welcome credits (your rule)
  if (!emailOptIn) {
    return NextResponse.json({ ok: true, verified: true, welcomeGranted: false, note: "Opt-in required for welcome credits." });
  }

  // Subscribe Mailchimp (immediate)
  try {
    await subscribeMailchimp(email, ["Remix Requests"]);
    await prisma.identity.update({
      where: { id: identity.id },
      data: { mailchimpStatus: "subscribed", mailchimpError: null }
    });
  } catch (e: any) {
    await prisma.identity.update({
      where: { id: identity.id },
      data: { mailchimpStatus: "error", mailchimpError: String(e?.message || "mailchimp error") }
    });
    // You can decide: block credits if Mailchimp fails. I'd recommend yes.
    return NextResponse.json({ ok: false, error: "Could not subscribe. Please try again." }, { status: 400 });
  }

  // Grant welcome credits once per session
  const welcomeCredits = Number(process.env.WELCOME_CREDITS || "5");

  const alreadyGranted = await prisma.identity.findUnique({
    where: { locationId_emailHash: { locationId: loc.id, emailHash } }
  });

  if (alreadyGranted?.welcomeGrantedSessionId === session.id) {
    const res = NextResponse.json({ ok: true, verified: true, welcomeGranted: false, note: "Welcome already granted this session." });
    if (setCookie) res.headers.set("set-cookie", setCookie);
    return res;
  }

  // Transaction: add credits + mark granted
  await prisma.$transaction(async (tx) => {
    await tx.creditLedger.create({
      data: { locationId: loc.id, emailHash, delta: welcomeCredits, reason: "WELCOME" }
    });
    await tx.identity.update({
      where: { id: identity.id },
      data: { welcomeGrantedSessionId: session.id }
    });
  });

  const balance = await getCreditBalance(loc.id, emailHash);

  const res = NextResponse.json({ ok: true, verified: true, identityId: identity.id, welcomeGranted: true, balance });
  if (setCookie) res.headers.set("set-cookie", setCookie);
  return res;
}