import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { getQueue } from "@/lib/queue";
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

  const q = await getQueue(loc.id, session.id);
  const all = [...q.playNow, ...q.main];

  // Top 10 by score desc, createdAt asc
  const top = all
    .slice()
    .sort((a, b) => (b.score - a.score) || (a.createdAt.getTime() - b.createdAt.getTime()))
    .slice(0, 10);

  const requestIds = top.map(r => r.id);
  const hashes = Array.from(new Set(top.map(r => r.emailHash)));

  // votes counts by requestId and value (+1 / -1)
  const voteCounts = await prisma.vote.groupBy({
    by: ["requestId", "value"],
    where: { requestId: { in: requestIds } },
    _count: { _all: true }
  });
  const upByReq = new Map<string, number>();
  const downByReq = new Map<string, number>();
  for (const v of voteCounts) {
    const n = v._count._all ?? 0;
    if (v.value === 1) upByReq.set(v.requestId, n);
    if (v.value === -1) downByReq.set(v.requestId, n);
  }

  // identity verification for requestedByLabel
  const identities = await prisma.identity.findMany({
    where: { locationId: loc.id, emailHash: { in: hashes } },
    select: { emailHash: true, smsVerifiedAt: true }
  });
  const verifiedByHash = new Map<string, boolean>(identities.map(i => [i.emailHash, !!i.smsVerifiedAt]));

  // redemption code per user (latest)
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

  const items = top.map((r) => {
    const verified = verifiedByHash.get(r.emailHash) ?? false;
    const requestedByLabel = `${skaterLabel(r.emailHash)}${verified ? " • VERIFIED" : ""}`;
    const boosted = r.type === "PLAY_NOW";

    return {
      id: r.id,
      createdAt: r.createdAt,
      songId: r.songId,
      title: r.song.title,
      artist: r.song.artist,
      score: r.score,
      type: r.type,

      boosted,
      requestedByLabel,
      upvotes: upByReq.get(r.id) ?? 0,
      downvotes: downByReq.get(r.id) ?? 0,
      redemptionCode: redeemByHash.get(r.emailHash) ?? null
    };
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    updatedAt: new Date().toISOString(),
    items
  });
}