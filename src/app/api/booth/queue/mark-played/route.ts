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

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      const item = await tx.queueItem.findUnique({
        where: { id: queueItemId },
        include: {
          request: {
            include: {
              song: true,
            },
          },
        },
      });

      if (!item) {
        throw new Error("NOT_FOUND");
      }

      await tx.queueItem.update({
        where: { id: queueItemId },
        data: {
          status: "PLAYED",
          completedAt: now,
          expectedEndAt: null,
        },
      });

      await tx.playbackEvent.create({
        data: {
          locationId: item.locationId,
          queueItemId: item.id,
          type: "PLAYED",
          metadata: {
            queueItemId: item.id,
            requestId: item.requestId,
            source: "booth_mark_played",
            durationSec: item.durationSec,
            startedAt: item.playingAt?.toISOString() ?? null,
          },
        },
      });

      if (item.request) {
        await tx.request.update({
          where: { id: item.request.id },
          data: {
            status: "PLAYED",
            playedAt: now,
          },
        });

        await tx.playHistory.create({
          data: {
            locationId: item.request.locationId,
            songId: item.request.songId,
            artistKey: item.request.song.artistKey,
            playedAt: now,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Queue item not found" }, { status: 404 });
    }

    console.error("booth mark-played error", error);
    return NextResponse.json({ ok: false, error: "Could not mark queue item played." }, { status: 500 });
  }
}
