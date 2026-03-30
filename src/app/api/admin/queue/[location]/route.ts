import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";

function buildRequestedByLabel(emailHash: string) {
  const last = String(emailHash || "").slice(-6).toUpperCase();
  return last ? `Skater ${last}` : "Verified skater";
}

export async function GET(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const { loc, rules } = await getRulesForLocation(params.location);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const pendingRequests = await prisma.request.findMany({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: "PENDING",
        emailHash: { not: "__booth_admin__" },
      },
      orderBy: [{ createdAt: "asc" }],
      include: {
        song: {
          select: {
            title: true,
            artist: true,
          },
        },
      },
    });

    const voteRows = pendingRequests.length
      ? await prisma.vote.groupBy({
          by: ["requestId", "value"],
          where: {
            requestId: { in: pendingRequests.map((item) => item.id) },
            sessionId: session.id,
          },
          _count: { _all: true },
        })
      : [];

    const voteMap = new Map<string, { upvotes: number; downvotes: number; score: number }>();
    for (const row of voteRows) {
      const key = String(row.requestId);
      const current = voteMap.get(key) || { upvotes: 0, downvotes: 0, score: 0 };
      const count = Number((row as any)._count?._all ?? 0);
      const value = Number((row as any).value ?? 0);
      if (value > 0) current.upvotes += count;
      if (value < 0) current.downvotes += count;
      current.score += value * count;
      voteMap.set(key, current);
    }

    const normalized = pendingRequests.map((request) => {
      const votes = voteMap.get(request.id) || { upvotes: 0, downvotes: 0, score: 0 };
      return {
        id: request.id,
        title: request.song?.title || "Untitled",
        artist: request.song?.artist || "Unknown artist",
        type: request.type,
        sortBucket: request.type === "PLAY_NOW" ? "PLAY_NOW" : "UP_NEXT",
        boosted: request.type === "PLAY_NOW",
        requestedByLabel: buildRequestedByLabel(request.emailHash),
        verified: true,
        upvotes: votes.upvotes,
        downvotes: votes.downvotes,
        score: votes.score,
        redemptionCode: (request as any).redemptionCode ?? null,
        createdAt: request.createdAt?.toISOString?.() ?? null,
      };
    });

    const scoreSortEnabled = Boolean((rules as any).enableVoting);
    const sortIncoming = (items: typeof normalized) => {
      return [...items].sort((a, b) => {
        if (scoreSortEnabled && b.score !== a.score) return Number(b.score ?? 0) - Number(a.score ?? 0);
        return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
      });
    };

    const playNow = sortIncoming(normalized.filter((item) => item.sortBucket === "PLAY_NOW"));
    const upNext = sortIncoming(normalized.filter((item) => item.sortBucket !== "PLAY_NOW"));

    return NextResponse.json({
      ok: true,
      maxOnDeck: Number((rules as any).maxOnDeck ?? 10),
      incomingCount: normalized.length,
      playNow,
      upNext,
    });
  } catch (error) {
    console.error("ADMIN_QUEUE_ROUTE_ERROR", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
