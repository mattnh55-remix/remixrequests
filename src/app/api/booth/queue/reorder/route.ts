import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { location, orderedQueueItemIds } = await req.json();

  if (!location || !Array.isArray(orderedQueueItemIds) || orderedQueueItemIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Missing location or orderedQueueItemIds." },
      { status: 400 }
    );
  }

  try {
    const { loc } = await getRulesForLocation(location);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const activeItems = await prisma.queueItem.findMany({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: {
          in: ["QUEUED", "LOADED", "PLAYING", "HELD"],
        },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        status: true,
        sourceType: true,
      },
    });

    const movableItems = activeItems.filter(
      (item) => item.status === "QUEUED" && item.sourceType !== "INTERSTITIAL"
    );

    if (movableItems.length !== orderedQueueItemIds.length) {
      return NextResponse.json(
        { ok: false, error: "Reorder payload did not match movable queue items." },
        { status: 400 }
      );
    }

    const movableIdSet = new Set(movableItems.map((item) => item.id));
    const requestedIdSet = new Set(orderedQueueItemIds);

    if (movableIdSet.size !== requestedIdSet.size) {
      return NextResponse.json(
        { ok: false, error: "Reorder payload contained duplicates or missing items." },
        { status: 400 }
      );
    }

    for (const id of orderedQueueItemIds) {
      if (!movableIdSet.has(id)) {
        return NextResponse.json(
          { ok: false, error: "Reorder payload contains locked or unknown items." },
          { status: 400 }
        );
      }
    }

    const reorderedMovableItems = orderedQueueItemIds.map((id) =>
      movableItems.find((item) => item.id === id)
    );

    let movableIndex = 0;
    const finalOrderedIds = activeItems.map((item) => {
      const isMovable = item.status === "QUEUED" && item.sourceType !== "INTERSTITIAL";
      if (!isMovable) return item.id;
      const replacement = reorderedMovableItems[movableIndex++];
      return replacement!.id;
    });

    await prisma.$transaction(
      finalOrderedIds.map((id, index) =>
        prisma.queueItem.update({
          where: { id },
          data: { position: index + 1 },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("booth reorder error", error);
    return NextResponse.json(
      { ok: false, error: "Could not reorder queue." },
      { status: 500 }
    );
  }
}
