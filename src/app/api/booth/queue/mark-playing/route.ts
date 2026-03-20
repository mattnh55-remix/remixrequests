import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { queueItemId } = await req.json();

  if (!queueItemId) {
    return NextResponse.json({ ok: false, error: "Missing queueItemId" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const item = await tx.queueItem.findUnique({ where: { id: queueItemId } });
    if (!item) throw new Error("NOT_FOUND");

    const now = new Date();

    await tx.queueItem.updateMany({
      where: {
        locationId: item.locationId,
        status: "PLAYING",
      },
      data: { status: "LOADED" },
    });

    await tx.queueItem.update({
      where: { id: queueItemId },
      data: {
        status: "PLAYING",
        playingAt: now,
      },
    });

    await tx.playbackEvent.create({
      data: {
        locationId: item.locationId,
        queueItemId: item.id,
        type: "PLAYING",
      },
    });
  });

  return NextResponse.json({ ok: true });
}