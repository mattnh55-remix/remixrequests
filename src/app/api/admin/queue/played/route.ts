// src/app/api/admin/queue/played/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const requestId = String(body.requestId || "").trim();

  if (!requestId) {
    return NextResponse.json({ ok: false, error: "Missing requestId" }, { status: 400 });
  }

  const r = await prisma.request.findUnique({
    where: { id: requestId },
    include: { song: true, queueItem: true },
  });

  if (!r) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.request.update({
      where: { id: r.id },
      data: {
        status: "PLAYED",
        playedAt: now,
      },
    });

    const queueItem = r.queueItem
      ? await tx.queueItem.update({
          where: { id: r.queueItem.id },
          data: {
            status: "PLAYED",
            completedAt: now,
          },
        })
      : null;

    if (queueItem) {
      await tx.playbackEvent.create({
        data: {
          locationId: r.locationId,
          queueItemId: queueItem.id,
          type: "PLAYED",
          metadata: {
            requestId: r.id,
            songId: r.songId,
          },
        },
      });
    }

    await tx.playHistory.create({
      data: {
        locationId: r.locationId,
        songId: r.songId,
        artistKey: r.song.artistKey,
        playedAt: now,
      },
    });
  });

  return NextResponse.json({ ok: true });
}