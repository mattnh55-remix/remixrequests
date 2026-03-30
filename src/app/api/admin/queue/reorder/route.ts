import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";

const ACTIVE_QUEUE_ITEM_STATUSES = ["QUEUED", "LOADED", "PLAYING", "HELD"] as const;

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const location = String(body.location || "").trim();
    const orderedQueueItemIds = Array.isArray(body.orderedQueueItemIds)
      ? body.orderedQueueItemIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!location) {
      return NextResponse.json({ ok: false, error: "Missing location" }, { status: 400 });
    }

    if (!orderedQueueItemIds.length) {
      return NextResponse.json({ ok: false, error: "Missing orderedQueueItemIds" }, { status: 400 });
    }

    const { loc } = await getRulesForLocation(location);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const activeItems = await prisma.queueItem.findMany({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: { in: [...ACTIVE_QUEUE_ITEM_STATUSES] },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    const activeIds = activeItems.map((item) => item.id);
    if (activeIds.length !== orderedQueueItemIds.length) {
      return NextResponse.json({ ok: false, error: "Queue item count mismatch" }, { status: 400 });
    }

    const activeSet = new Set(activeIds);
    for (const id of orderedQueueItemIds) {
      if (!activeSet.has(id)) {
        return NextResponse.json({ ok: false, error: "Invalid queue item list" }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < orderedQueueItemIds.length; index++) {
        await tx.queueItem.update({
          where: { id: orderedQueueItemIds[index] },
          data: { position: index + 1 },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("QUEUE_REORDER_ERROR", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
