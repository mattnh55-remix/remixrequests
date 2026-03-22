import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function GET(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const locationSlug = String(params.location || "").trim();
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();

    if (!locationSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing location." },
        { status: 400 }
      );
    }

    if (!q) {
      return NextResponse.json({ ok: true, results: [] });
    }

    const { loc } = await getRulesForLocation(locationSlug);

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
      results: songs.map((song) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        artworkUrl: song.artworkUrl,
        explicit: song.explicit,
      })),
    });
  } catch (error) {
    console.error("booth search songs error", error);
    return NextResponse.json(
      { ok: false, error: "Search unavailable." },
      { status: 500 }
    );
  }
}