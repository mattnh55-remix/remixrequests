import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";

type PublicFeaturedSong = {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
};

function shuffleArray<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export async function GET(
  _req: Request,
  { params }: { params: { location: string } }
) {
  try {
    const { loc } = await getRulesForLocation(params.location);

    const songs = await prisma.song.findMany({
      where: {
        locationId: loc.id,
        active: true,
        featureBoost: { gt: 0 },
      },
      select: {
        id: true,
        title: true,
        artist: true,
        artworkUrl: true,
      },
      take: 50,
      orderBy: [
        { featureBoost: "desc" },
        { artist: "asc" },
        { title: "asc" },
      ],
    });

    const randomized = shuffleArray(songs).slice(0, 3);

    const items: PublicFeaturedSong[] = randomized.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      artworkUrl: song.artworkUrl || null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: true, items: [] });
  }
}