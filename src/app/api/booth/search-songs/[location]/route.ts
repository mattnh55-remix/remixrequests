import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";

export async function GET(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";

  if (!q) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const songs = await prisma.song.findMany({
    where: {
      locationId: loc.id,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { artist: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ artist: "asc" }, { title: "asc" }],
    take: 25,
    select: {
      id: true,
      title: true,
      artist: true,
      artworkUrl: true,
      explicit: true,
    },
  });

  return NextResponse.json({
    ok: true,
    results: songs,
  });
}
