import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const requestId = String(body.requestId || "");

  const r = await prisma.request.findUnique({
    where: { id: requestId },
    include: { song: true }
  });
  if (!r) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.request.update({
      where: { id: r.id },
      data: { status: "PLAYED", playedAt: new Date() }
    });
    await tx.playHistory.create({
      data: { locationId: r.locationId, songId: r.songId, artistKey: r.song.artistKey, playedAt: new Date() }
    });
  });

  return NextResponse.json({ ok: true });
}
