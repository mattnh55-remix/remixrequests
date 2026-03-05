// src/app/api/public/redeem/[location]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getCreditBalance, secondsSinceLastAction } from "@/lib/validators";
import { hashEmail } from "@/lib/security";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { location: string } }) {
  const body = await req.json().catch(() => null);

  const codeRaw = String(body?.code || "").trim();
  const emailRaw = String(body?.email || "").trim().toLowerCase();

  if (!codeRaw) return jsonFail("Missing code.");
  if (!emailRaw) return jsonFail("Missing email.");

  const code = codeRaw.toUpperCase();

  const { loc } = await getRulesForLocation(params.location);
  const emailHash = hashEmail(emailRaw);

  // Identity gate: verified + email opt-in required
  const identity = await prisma.identity.findUnique({
    where: { locationId_emailHash: { locationId: loc.id, emailHash } },
    select: {
      smsVerifiedAt: true,
      emailOptInAt: true,
    },
  });

  if (!identity?.smsVerifiedAt) {
    return jsonFail("Please verify your phone to redeem a code.", 403);
  }
  if (!identity?.emailOptInAt) {
    return jsonFail("Please opt into email updates to redeem a code.", 403);
  }

  // Rate limit (10 seconds between any actions)
  try {
    const secs = await secondsSinceLastAction(loc.id, emailHash);
    if (secs < 10) return jsonFail("Please wait a moment and try again.", 429);
  } catch {
    // if the helper fails for any reason, fail open (non-fatal)
  }

  // Lookup code
  const now = new Date();
  const rc = await prisma.redemptionCode.findUnique({
    where: { locationId_code: { locationId: loc.id, code } },
  });

  if (!rc) return jsonFail("Invalid code.");
  if (rc.disabledAt) return jsonFail("This code is disabled.");
  if (rc.expiresAt && rc.expiresAt <= now) return jsonFail("This code has expired.");
  if (rc.uses >= rc.maxUses) return jsonFail("This code has reached its limit.");

  // Redeem atomically
  try {
    const result = await prisma.$transaction(async (tx) => {
      // prevent multiple redeems by same user
      const existing = await tx.redemptionCodeUse.findUnique({
        where: { codeId_emailHash: { codeId: rc.id, emailHash } },
      });
      if (existing) throw new Error("ALREADY_USED");

      // re-check inside txn
      const fresh = await tx.redemptionCode.findUnique({ where: { id: rc.id } });
      if (!fresh) throw new Error("INVALID");
      if (fresh.disabledAt) throw new Error("DISABLED");
      if (fresh.expiresAt && fresh.expiresAt <= now) throw new Error("EXPIRED");
      if (fresh.uses >= fresh.maxUses) throw new Error("LIMIT");

const minutes = Math.max(0, Number(fresh.redeemWindowMinutes ?? 0));
const promoExpiresAt = new Date(Date.now() + minutes * 60 * 1000);

await tx.redemptionCodeUse.create({
  data: {
    locationId: loc.id,
    codeId: fresh.id,
    emailHash,
    expiresAt: promoExpiresAt,
  },
});

      await tx.redemptionCode.update({
        where: { id: fresh.id },
        data: { uses: { increment: 1 } },
      });

      await tx.creditLedger.create({
        data: {
          locationId: loc.id,
          emailHash,
          delta: fresh.points,
          reason: `redeem:${code}`,
          expiresAt: promoExpiresAt,
        },
      });

return { pointsAdded: fresh.points, expiresAt: promoExpiresAt.toISOString() };
    });

    const balance = await getCreditBalance(loc.id, emailHash);

    return NextResponse.json({
      ok: true,
      pointsAdded: result.pointsAdded,
      expiresAt: result.expiresAt,
      balance,
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "ALREADY_USED") return jsonFail("You already used this code.", 409);
    if (msg === "LIMIT") return jsonFail("This code has reached its limit.");
    if (msg === "EXPIRED") return jsonFail("This code has expired.");
    if (msg === "DISABLED") return jsonFail("This code is disabled.");
    return jsonFail("Could not redeem code. Try again.", 500);
  }
}