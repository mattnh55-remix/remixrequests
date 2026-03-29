import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { sendRequestAcceptedSms } from "@/lib/request-status-sms";

const ACTIVE_QUEUE_ITEM_STATUSES = ["QUEUED", "LOADED", "PLAYING", "HELD"] as const;

function resolveInsertIndex(
  activeItems: { id: string; status: string }[],
  isPlayNow: boolean
) {
  if (!isPlayNow) return activeItems.length;

  const loadedIndex = activeItems.findIndex((item) => item.status === "LOADED");
  if (loadedIndex >= 0) return loadedIndex + 1;

  const playingIndex = activeItems.findIndex((item) => item.status === "PLAYING");
  if (playingIndex >= 0) return playingIndex + 1;

  return 0;
}

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const requestId = String(body.requestId || "").trim();

    if (!requestId) {
      return NextResponse.json({ ok: false, error: "Missing requestId" }, { status: 400 });
    }

    const requestRow = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        song: {
          select: {
            id: true,
            title: true,
            artist: true,
            artistKey: true,
          },
        },
        location: { select: { slug: true } },
        queueItem: { select: { id: true } },
      },
    });

    if (!requestRow) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }

    if (requestRow.status === "REJECTED") {
      return NextResponse.json({ ok: false, error: "CANNOT_ACCEPT_REJECTED" }, { status: 400 });
    }

    if (requestRow.status === "PLAYED") {
      return NextResponse.json({ ok: false, error: "CANNOT_ACCEPT_PLAYED" }, { status: 400 });
    }

    if (requestRow.queueItem?.id || requestRow.status === "ACCEPTED" || requestRow.status === "APPROVED") {
      return NextResponse.json({ ok: true, alreadyAccepted: true, requestId: requestRow.id, queueItemId: requestRow.queueItem?.id ?? null });
    }

    const { rules } = await getRulesForLocation(requestRow.location.slug);
    const maxOnDeck = Math.max(0, Number((rules as any).maxOnDeck ?? 0));
    const queueFullMessage =
      (rules as any).msgQueueFull || "The queue is currently full. Please check back in a bit.";

    const activeQueueCount = await prisma.queueItem.count({
      where: {
        locationId: requestRow.locationId,
        sessionId: requestRow.sessionId,
        status: { in: [...ACTIVE_QUEUE_ITEM_STATUSES] },
      },
    });

    if (maxOnDeck > 0 && activeQueueCount >= maxOnDeck) {
      return NextResponse.json({ ok: false, error: queueFullMessage, code: "QUEUE_FULL" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const activeItems = await tx.queueItem.findMany({
        where: {
          locationId: requestRow.locationId,
          sessionId: requestRow.sessionId,
          status: { in: [...ACTIVE_QUEUE_ITEM_STATUSES] },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, status: true },
      });

      const isPlayNow = requestRow.type === "PLAY_NOW";
      const insertIndex = resolveInsertIndex(activeItems, isPlayNow);
      const tempPosition = activeItems.length + 1;

      await tx.request.update({
        where: { id: requestRow.id },
        data: { status: "ACCEPTED" },
      });

      const queueItem = await tx.queueItem.create({
        data: {
          requestId: requestRow.id,
          locationId: requestRow.locationId,
          sessionId: requestRow.sessionId,
          status: "QUEUED",
          position: tempPosition,
          sourceType: "REQUEST",
          introAssigned: false,
        },
      });

      const orderedIds = [
        ...activeItems.slice(0, insertIndex).map((item) => item.id),
        queueItem.id,
        ...activeItems.slice(insertIndex).map((item) => item.id),
      ];

      for (let index = 0; index < orderedIds.length; index++) {
        await tx.queueItem.update({
          where: { id: orderedIds[index] },
          data: { position: index + 1 },
        });
      }

      await tx.playbackEvent.create({
        data: {
          locationId: requestRow.locationId,
          queueItemId: queueItem.id,
          type: "QUEUED",
          metadata: {
            requestId: requestRow.id,
            songId: requestRow.songId,
            source: "booth_accept",
            requestType: requestRow.type,
          },
        },
      });

      return { queueItemId: queueItem.id, isPlayNow };
    });

    const smsResult = await sendRequestAcceptedSms({
      locationId: requestRow.locationId,
      emailHash: requestRow.emailHash,
      title: requestRow.song.title,
      artist: requestRow.song.artist,
      isPlayNow: result.isPlayNow,
    });

    return NextResponse.json({
      ok: true,
      requestId: requestRow.id,
      queueItemId: result.queueItemId,
      texted: Boolean(smsResult?.ok),
      smsSkipped: Boolean((smsResult as any)?.skipped),
    });
  } catch (error) {
    console.error("QUEUE_ACCEPT_ERROR", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
