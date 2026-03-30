import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { sendRequestAcceptedSms } from "@/lib/request-status-sms";

const ACTIVE_QUEUE_ITEM_STATUSES = ["QUEUED", "LOADED", "PLAYING", "HELD"] as const;

function buildRequestedByLabel(emailHash: string) {
  const last = String(emailHash || "").slice(-6).toUpperCase();
  return last ? `Skater ${last}` : "Verified skater";
}

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
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
          },
        },
        queueItem: { select: { id: true } },
      },
    });

    if (!requestRow) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }

    if (requestRow.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: `Cannot accept request in status ${requestRow.status}` },
        { status: 400 }
      );
    }

    if (requestRow.queueItem?.id) {
      return NextResponse.json({ ok: true, requestId, queueItemId: requestRow.queueItem.id, alreadyAccepted: true });
    }

    const duplicateSong = await prisma.queueItem.findFirst({
      where: {
        locationId: requestRow.locationId,
        sessionId: requestRow.sessionId,
        status: { in: [...ACTIVE_QUEUE_ITEM_STATUSES] },
        request: {
          is: {
            songId: requestRow.songId,
          },
        },
      },
      select: { id: true },
    });

    if (duplicateSong) {
      return NextResponse.json(
        { ok: false, error: "That song is already in the pending queue." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const activeItems = await tx.queueItem.findMany({
        where: {
          locationId: requestRow.locationId,
          sessionId: requestRow.sessionId,
          status: { in: [...ACTIVE_QUEUE_ITEM_STATUSES] },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });

      const queueItem = await tx.queueItem.create({
        data: {
          requestId: requestRow.id,
          locationId: requestRow.locationId,
          sessionId: requestRow.sessionId,
          status: "QUEUED",
          position: activeItems.length + 1,
          sourceType: "REQUEST",
          introAssigned: false,
        },
      });

      await tx.request.update({
        where: { id: requestRow.id },
        data: {
          status: "APPROVED",
        },
      });

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

      return { queueItemId: queueItem.id };
    });

    const smsResult = await sendRequestAcceptedSms({
      locationId: requestRow.locationId,
      emailHash: requestRow.emailHash,
      title: requestRow.song.title,
      artist: requestRow.song.artist,
      isPlayNow: requestRow.type === "PLAY_NOW",
    });

    return NextResponse.json({
      ok: true,
      requestId: requestRow.id,
      queueItemId: result.queueItemId,
      requestedByLabel: buildRequestedByLabel(requestRow.emailHash),
      texted: Boolean(smsResult?.ok),
      smsSkipped: Boolean((smsResult as any)?.skipped),
    });
  } catch (error) {
    console.error("QUEUE_ACCEPT_ERROR", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
