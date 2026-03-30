import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";

const ACTIVE_QUEUE_ITEM_STATUSES = ["QUEUED", "LOADED", "PLAYING", "HELD"] as const;

function buildRequestedByLabel(emailHash: string) {
  if (emailHash === "__booth_admin__") return "DJ Added";
  const last = String(emailHash || "").slice(-6).toUpperCase();
  return last ? `Skater ${last}` : "Verified skater";
}

export async function GET(_: Request, { params }: { params: { location: string } }) {
  try {
    const { loc } = await getRulesForLocation(params.location);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const queueItems = await prisma.queueItem.findMany({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: { in: [...ACTIVE_QUEUE_ITEM_STATUSES] },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        request: {
          include: {
            song: {
              select: {
                title: true,
                artist: true,
                artworkUrl: true,
              },
            },
          },
        },
      },
    });

    const requestIds = queueItems.map((item) => item.requestId).filter(Boolean) as string[];
    const voteRows = requestIds.length
      ? await prisma.vote.groupBy({
          by: ["requestId", "value"],
          where: {
            requestId: { in: requestIds },
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

    const items = queueItems.map((item) => {
      const votes = voteMap.get(String(item.requestId)) || { upvotes: 0, downvotes: 0, score: 0 };
      const request = item.request;
      const isDjAdded = request?.emailHash === "__booth_admin__" || item.sourceType === "HOUSE";

      return {
        id: item.id,
        requestId: item.requestId,
        title: request?.song?.title || "Untitled",
        artist: request?.song?.artist || "Unknown artist",
        artworkUrl: request?.song?.artworkUrl || null,
        status: item.status,
        sourceType: item.sourceType,
        position: item.position,
        sortOrder: item.position,
        requestedByLabel: buildRequestedByLabel(request?.emailHash || ""),
        boosted: request?.type === "PLAY_NOW",
        verified: !isDjAdded,
        upvotes: votes.upvotes,
        downvotes: votes.downvotes,
        score: votes.score,
        redemptionCode: (request as any)?.redemptionCode ?? null,
        requestType: request?.type ?? null,
        requestSource: isDjAdded ? "DJ" : "CUSTOMER",
        createdAt: item.createdAt?.toISOString?.() ?? null,
        isRequest: true,
      };
    });

    return NextResponse.json({ ok: true, sessionId: session.id, items });
  } catch (error) {
    console.error("BOOTH_QUEUE_ROUTE_ERROR", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error", items: [] }, { status: 500 });
  }
}
