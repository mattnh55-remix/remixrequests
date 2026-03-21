import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { computeExpectedEndAt, normalizeDurationSec } from "@/lib/booth/queue-runtime";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const queueItemId = body.queueItemId;
  const incomingDurationSec = normalizeDurationSec(body.durationSec);

  if (!queueItemId) {
    return NextResponse.json(
      { ok: false, error: "Missing queueItemId" },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      const item = await tx.queueItem.findUnique({
        where: { id: queueItemId },
      });

      if (!item) {
        throw new Error("NOT_FOUND");
      }

      if (item.status === "PLAYED" || item.status === "SKIPPED") {
        throw new Error("INVALID_STATE");
      }

      await tx.queueItem.updateMany({
        where: {
          locationId: item.locationId,
          status: "PLAYING",
          NOT: { id: item.id },
        },
        data: {
          status: "QUEUED",
          playingAt: null,
          expectedEndAt: null,
        },
      });

      await tx.queueItem.updateMany({
        where: {
          locationId: item.locationId,
          status: "LOADED",
          NOT: { id: item.id },
        },
        data: {
          status: "QUEUED",
          loadedAt: null,
        },
      });

      const durationSec = incomingDurationSec ?? item.durationSec ?? null;
      const expectedEndAt = computeExpectedEndAt(now, durationSec);

      await tx.queueItem.update({
        where: { id: item.id },
        data: {
          status: "PLAYING",
          playingAt: now,
          loadedAt: item.loadedAt ?? now,
          durationSec,
          expectedEndAt,
        },
      });

      await tx.playbackEvent.create({
        data: {
          locationId: item.locationId,
          queueItemId: item.id,
          type: "PLAYING",
          metadata: {
            queueItemId: item.id,
            requestId: item.requestId,
            source: "booth_mark_playing",
            durationSec,
            expectedEndAt: expectedEndAt?.toISOString() ?? null,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "Queue item not found" },
        { status: 404 }
      );
    }

    if (error?.message === "INVALID_STATE") {
      return NextResponse.json(
        { ok: false, error: "Played or skipped items cannot be marked playing." },
        { status: 400 }
      );
    }

    console.error("booth mark-playing error", error);
    return NextResponse.json(
      { ok: false, error: "Could not mark queue item playing." },
      { status: 500 }
    );
  }
}
