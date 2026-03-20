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

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const item = await tx.queueItem.update({
      where: { id: queueItemId },
      data: {
        status: "PLAYED",
        completedAt: now,
      },
    });

    await tx.playbackEvent.create({
      data: {
        locationId: item.locationId,
        queueItemId: item.id,
        type: "PLAYED",
      },
    });
  });

  return NextResponse.json({ ok: true });
}