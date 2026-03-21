import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const location = body.location;

    // ✅ support BOTH names (prevents future breakage)
    const orderedIds: string[] =
      body.orderedQueuedItemIds || body.orderedQueueItemIds;

    if (!location || !orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { ok: false, error: "Missing location or orderedQueueItemIds." },
        { status: 400 }
      );
    }

    // fetch current queue (only reorderable items)
    const items = await prisma.queueItem.findMany({
      where: {
        locationId: location,
        status: "QUEUED",
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    // map id → item
    const map = new Map(items.map((i) => [i.id, i]));

    // safety: only reorder items that exist
    const validIds = orderedIds.filter((id) => map.has(id));

    // update sortOrder sequentially
    await Promise.all(
      validIds.map((id, index) =>
        prisma.queueItem.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reorder error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}