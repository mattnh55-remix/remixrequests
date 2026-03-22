// BOOTH QUEUE MARK-PLAYED ROUTE

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const queueItemId = String(body.queueItemId || "").trim();

    if (!queueItemId) {
      return NextResponse.json(
        { ok: false, error: "Missing queueItemId." },
        { status: 400 }
      );
    }

    const item = await prisma.queueItem.findUnique({
      where: { id: queueItemId },
      select: {
        id: true,
        locationId: true,
        sourceType: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Queue item not found." },
        { status: 404 }
      );
    }

    const completedAt = new Date();

    await prisma.$transaction([
      prisma.queueItem.update({
        where: { id: queueItemId },
data: {
  status: "PLAYED",
  completedAt,
  playingAt: null,
  expectedEndAt: null,
},
      }),
      prisma.playbackEvent.create({
        data: {
          locationId: item.locationId,
          queueItemId: item.id,
          type: "PLAYED",
          metadata: {
            sourceType: item.sourceType,
          },
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("mark-played error", error);
    return NextResponse.json(
      { ok: false, error: "Could not mark item played." },
      { status: 500 }
    );
  }
}
