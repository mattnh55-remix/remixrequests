import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const body = await req.json();

    const location = String(body.location || "").trim();

    const orderedIds: string[] =
      body.orderedQueuedItemIds || body.orderedQueueItemIds;

    if (!location || !orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { ok: false, error: "Missing location or orderedQueueItemIds." },
        { status: 400 }
      );
    }

    const items = await prisma.queueItem.findMany({
      where: {
        locationId: location,
        status: "QUEUED",
      },
      orderBy: [
        { position: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
      },
    });

    const existingIds = new Set(items.map((item) => item.id));
    const validIds = orderedIds.filter((id) => existingIds.has(id));

    await prisma.$transaction(
      validIds.map((id, index) =>
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