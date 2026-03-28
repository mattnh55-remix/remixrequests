import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession, isGuestSessionActive } from "@/lib/validators";
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

  const [reqUsers, voteUsers] = await Promise.all([
    prisma.request.findMany({
      where: { locationId: loc.id, sessionId: session.id },
      select: { emailHash: true },
      distinct: ["emailHash"],
    }),
    prisma.vote.findMany({
      where: { sessionId: session.id },
      select: { emailHash: true },
      distinct: ["emailHash"],
    }),
  ]);

  const hashes = Array.from(
    new Set<string>([...reqUsers.map((r) => r.emailHash), ...voteUsers.map((v) => v.emailHash)].filter(Boolean))
  );

  if (hashes.length === 0) {
    return NextResponse.json({ ok: true, sessionId: session.id, users: [] });
  }

  const identities = await prisma.identity.findMany({
    where: { locationId: loc.id, emailHash: { in: hashes } },
    select: {
      emailHash: true,
      smsVerifiedAt: true,
      sessionStartedAt: true,
      sessionExpiresAt: true,
    },
  });
  const identityByHash = new Map(identities.map((i) => [i.emailHash, i]));

  const balances = await prisma.creditLedger.groupBy({
    by: ["emailHash"],
    where: {
      locationId: loc.id,
      emailHash: { in: hashes },
      expiresAt: { gt: new Date() },
    },
    _sum: { delta: true },
  });
  const pointsByHash = new Map(
    balances.map((b) => [b.emailHash, Math.max(Number(b._sum.delta ?? 0), 0)])
  );

  const redeems = await prisma.creditLedger.findMany({
    where: {
      locationId: loc.id,
      emailHash: { in: hashes },
      reason: { startsWith: "redeem:" },
      expiresAt: { gt: new Date() },
    },
    select: { emailHash: true, reason: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const redeemByHash = new Map<string, string>();
  for (const r of redeems) {
    if (!redeemByHash.has(r.emailHash)) {
      const code = redemptionFromReason(r.reason);
      if (code) redeemByHash.set(r.emailHash, code);
    }
  }

  const users = hashes
    .map((h) => {
      const ident = identityByHash.get(h) || null;
      const sessionActive = isGuestSessionActive(ident);
      return {
        emailHash: h,
        label: skaterLabel(h),
        verified: sessionActive,
        sessionActive,
        sessionStartedAt: ident?.sessionStartedAt ?? null,
        sessionExpiresAt: ident?.sessionExpiresAt ?? null,
        points: pointsByHash.get(h) ?? 0,
        redemptionCode: redeemByHash.get(h) ?? null,
      };
    })
    .sort((a, b) => Number(b.sessionActive) - Number(a.sessionActive) || b.points - a.points);

  return NextResponse.json({ ok: true, sessionId: session.id, users });
}
