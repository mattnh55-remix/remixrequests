import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { queueItemId } = await req.json();

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
        include: {
          request: true,
        },
      });

      if (!item) {
        throw new Error("NOT_FOUND");
      }

      await tx.queueItem.update({
        where: { id: item.id },
        data: {
          status: "SKIPPED",
          completedAt: now,
        },
      });

      await tx.playbackEvent.create({
        data: {
          locationId: item.locationId,
          queueItemId: item.id,
          type: "SKIPPED",
          metadata: {
            queueItemId: item.id,
            requestId: item.requestId,
            source: "booth_skip_minimal",
          },
        },
      });

      if (item.request && item.request.status !== "REJECTED" && item.request.status !== "PLAYED") {
        await tx.request.update({
          where: { id: item.request.id },
          data: {
            status: "REJECTED",
            rejectedAt: now,
            rejectReason: "Booth skip",
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "Queue item not found" },
        { status: 404 }
      );
    }

    console.error("booth skip error", error);
    return NextResponse.json(
      { ok: false, error: "Could not skip queue item." },
      { status: 500 }
    );
  }
}