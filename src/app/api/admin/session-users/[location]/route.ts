import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { isAdminFromCookie } from "@/lib/adminAuth";

function skaterLabel(emailHash: string) {
  const tag = (emailHash || "??????").slice(0, 6).toUpperCase();
  return `Skater ${tag}`;
}

function redemptionFromReason(reason?: string | null) {
  if (!reason) return null;
  const m = reason.match(/^redeem:(.+)$/i);
  return m ? m[1] : null;
}

export async function GET(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);
  const session = await getOrCreateCurrentSession(loc.id, 4);

  // Active users = anyone who requested OR voted in this session
  const [reqUsers, voteUsers] = await Promise.all([
    prisma.request.findMany({
      where: { locationId: loc.id, sessionId: session.id },
      select: { emailHash: true },
      distinct: ["emailHash"]
    }),
    prisma.vote.findMany({
      where: { sessionId: session.id },
      select: { emailHash: true },
      distinct: ["emailHash"]
    })
  ]);

  const hashes = Array.from(
    new Set<string>([...reqUsers.map(r => r.emailHash), ...voteUsers.map(v => v.emailHash)].filter(Boolean))
  );

  if (hashes.length === 0) {
    return NextResponse.json({ ok: true, sessionId: session.id, users: [] });
  }

  // Identities (verified?)
  const identities = await prisma.identity.findMany({
    where: { locationId: loc.id, emailHash: { in: hashes } },
    select: { emailHash: true, smsVerifiedAt: true }
  });
  const verifiedByHash = new Map<string, boolean>(
    identities.map(i => [i.emailHash, !!i.smsVerifiedAt])
  );

  // Points balance from ledger
  const balances = await prisma.creditLedger.groupBy({
    by: ["emailHash"],
    where: { locationId: loc.id, emailHash: { in: hashes } },
    _sum: { delta: true }
  });
  const pointsByHash = new Map<string, number>(
    balances.map(b => [b.emailHash, Number(b._sum.delta ?? 0)])
  );

  // Latest redemption code tag from ledger reason: "redeem:CODE"
  const redeems = await prisma.creditLedger.findMany({
    where: { locationId: loc.id, emailHash: { in: hashes }, reason: { startsWith: "redeem:" } },
    select: { emailHash: true, reason: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  });
  const redeemByHash = new Map<string, string>();
  for (const r of redeems) {
    if (!redeemByHash.has(r.emailHash)) {
      const code = redemptionFromReason(r.reason);
      if (code) redeemByHash.set(r.emailHash, code);
    }
  }

  const users = hashes
    .map((h) => ({
      emailHash: h,
      label: skaterLabel(h),
      verified: verifiedByHash.get(h) ?? false,
      points: pointsByHash.get(h) ?? 0,
      redemptionCode: redeemByHash.get(h) ?? null
    }))
    // Show verified first, then higher points
    .sort((a, b) => Number(b.verified) - Number(a.verified) || b.points - a.points);

  return NextResponse.json({ ok: true, sessionId: session.id, users });
}