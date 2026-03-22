// /src/app/api/booth/queue/set-duration/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { computeExpectedEndAt, normalizeDurationSec } from "@/lib/booth/queue-runtime";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const queueItemId = String(body.queueItemId || "").trim();
  const durationSec = normalizeDurationSec(body.durationSec);

  if (!queueItemId) {
    return NextResponse.json({ ok: false, error: "Missing queueItemId" }, { status: 400 });
  }

  if (!durationSec) {
    return NextResponse.json({ ok: false, error: "Valid durationSec is required." }, { status: 400 });
  }

  try {
    const item = await prisma.queueItem.findUnique({
      where: { id: queueItemId },
      select: {
        id: true,
        playingAt: true,
      },
    });

    if (!item) {
      return NextResponse.json({ ok: false, error: "Queue item not found." }, { status: 404 });
    }

    const expectedEndAt = computeExpectedEndAt(item.playingAt, durationSec);

    await prisma.queueItem.update({
      where: { id: queueItemId },
      data: {
        durationSec,
        expectedEndAt,
      },
    });

    return NextResponse.json({
      ok: true,
      queueItemId,
      durationSec,
      expectedEndAt: expectedEndAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("booth set-duration error", error);
    return NextResponse.json({ ok: false, error: "Could not update duration." }, { status: 500 });
  }
}
