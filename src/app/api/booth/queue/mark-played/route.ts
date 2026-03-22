import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 }
    );
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
        sessionId: true,
        status: true,
        sourceType: true,
        clusterId: true,
        loadedAt: true,
        playingAt: true,
        completedAt: true,
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
        where: { id: item.id },
        data: {
          status: "PLAYED",
          completedAt,
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
            clusterId: item.clusterId ?? null,
            sessionId: item.sessionId,
            loadedAt: item.loadedAt?.toISOString() ?? null,
            playingAt: item.playingAt?.toISOString() ?? null,
            completedAt: completedAt.toISOString(),
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      queueItemId: item.id,
      status: "PLAYED",
      completedAt: completedAt.toISOString(),
    });
  } catch (error) {
    console.error("mark-played error", error);

    return NextResponse.json(
      { ok: false, error: "Could not mark item played." },
      { status: 500 }
    );
  }
}
