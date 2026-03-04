import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";

// TODO(you): import your real email->hash helper
// Example: import { emailToHash } from "@/lib/hash";
function emailToHash_TODO(email: string) {
  // IMPORTANT: replace this with your real hashing (must match existing identities)
  // Do NOT ship with this placeholder.
  return email.trim().toLowerCase();
}

// TODO(you): implement your real “marketing opt-in” check
function isMarketingOptedIn_TODO(identity: any) {
  // Replace with your actual field(s), e.g.:
  // return !!identity.mailchimpOptInAt;
  // return !!identity.marketingOptInAt;
  // return identity.marketingOptIn === true;
  return false;
}

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request, { params }: { params: { location: string } }) {
  const body = await req.json().catch(() => null);
  const codeRaw = (body?.code || "").toString().trim();
  const email = (body?.email || "").toString().trim();

  if (!codeRaw) return jsonFail("Missing code.");
  if (!email) return jsonFail("Missing email.");

  const code = codeRaw.toUpperCase();
  const { loc } = await getRulesForLocation(params.location);
  const session = await getOrCreateCurrentSession(loc.id, 4);

  const emailHash = emailToHash_TODO(email);

  // Identity gate: verified + marketing opt-in
  const identity = await prisma.identity.findUnique({
    where: { locationId_emailHash: { locationId: loc.id, emailHash } },
    select: {
      emailHash: true,
      smsVerifiedAt: true,
      // include the opt-in field(s) you actually have:
      // mailchimpOptInAt: true,
      // marketingOptInAt: true,
      // marketingOptIn: true,
    } as any
  });

  if (!identity?.smsVerifiedAt) {
    return jsonFail("Please verify your phone to redeem a code.", 403);
  }
  if (!isMarketingOptedIn_TODO(identity)) {
    return jsonFail("Please opt into SMS marketing to redeem a code.", 403);
  }

  // Rate limit: prevent spam attempts (10 seconds)
  const lastLedger = await prisma.creditLedger.findFirst({
    where: { locationId: loc.id, emailHash },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true }
  });
  if (lastLedger) {
    const seconds = (Date.now() - lastLedger.createdAt.getTime()) / 1000;
    if (seconds < 10) return jsonFail("Please wait a moment and try again.", 429);
  }

  // Lookup code (must be for current session, not expired, not disabled)
  const now = new Date();
  const rc = await prisma.redemptionCode.findUnique({
    where: { locationId_code: { locationId: loc.id, code } }
  });

  if (!rc) return jsonFail("Invalid code.");
  if (rc.disabledAt) return jsonFail("This code is disabled.");
  if (rc.expiresAt && rc.expiresAt <= now) return jsonFail("This code has expired.");
  if (rc.uses >= rc.maxUses) return jsonFail("This code has reached its limit.");

  // Redeem atomically: prevent double use + enforce maxUses
  try {
    const result = await prisma.$transaction(async (tx) => {
      // prevent multiple redeems by same user
      const existing = await tx.redemptionCodeUse.findUnique({
        where: { codeId_emailHash: { codeId: rc.id, emailHash } }
      });
      if (existing) throw new Error("ALREADY_USED");

      // re-check capacity inside tx
      const fresh = await tx.redemptionCode.findUnique({ where: { id: rc.id } });
      if (!fresh) throw new Error("INVALID");
      if (fresh.disabledAt) throw new Error("DISABLED");
      if (fresh.expiresAt && fresh.expiresAt <= now) throw new Error("EXPIRED");
      if (fresh.uses >= fresh.maxUses) throw new Error("LIMIT");

      const promoExpiresAt = new Date(Date.now() + fresh.redeemWindowMinutes * 60 * 1000);

      await tx.redemptionCodeUse.create({
        data: {
          locationId: loc.id,
          codeId: rc.id,
          emailHash,
          expiresAt: promoExpiresAt
        }
      });

      await tx.redemptionCode.update({
        where: { id: rc.id },
        data: { uses: { increment: 1 } }
      });

      await tx.creditLedger.create({
        data: {
          locationId: loc.id,
          emailHash,
          delta: fresh.points,
          reason: `redeem:${code}`,
          expiresAt: promoExpiresAt
        }
      });

      return { pointsAdded: fresh.points, expiresAt: promoExpiresAt.toISOString() };
    });

    return NextResponse.json({ ok: true, pointsAdded: result.pointsAdded, expiresAt: result.expiresAt });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "ALREADY_USED") return jsonFail("You already used this code.", 409);
    if (msg === "LIMIT") return jsonFail("This code has reached its limit.");
    if (msg === "EXPIRED") return jsonFail("This code has expired.");
    if (msg === "DISABLED") return jsonFail("This code is disabled.");
    return jsonFail("Could not redeem code. Try again.", 500);
  }
}