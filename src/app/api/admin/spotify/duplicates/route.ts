import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

type IncomingTrack = {
  title?: string | null;
  artist?: string | null;
  spotifyId?: string | null;
};

function normalizeArtistKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTitleKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/\((feat|featuring|with).*?\)/g, "")
    .replace(/\[(feat|featuring|with).*?\]/g, "")
    .replace(/\((clean|explicit|radio edit|edit|version|remix|mix|live|acoustic).*?\)/g, "")
    .replace(/\[(clean|explicit|radio edit|edit|version|remix|mix|live|acoustic).*?\]/g, "")
    .replace(/\bfeat\.?.*$/g, "")
    .replace(/\bfeaturing\b.*$/g, "")
    .replace(/\bwith\b.*$/g, "")
    .replace(/[-–—:|]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const locationSlug = String(body?.locationSlug || "remixrequests");
    const tracks = Array.isArray(body?.tracks) ? (body.tracks as IncomingTrack[]) : [];

    if (!tracks.length) {
      return NextResponse.json({ ok: true, exactBySpotifyId: {}, exactByTitleArtist: {}, possibleByFuzzy: {} });
    }

    const location = await prisma.location.findUnique({
      where: { slug: locationSlug },
      select: { id: true },
    });

    if (!location) {
      return NextResponse.json(
        { ok: false, error: `Location not found for slug: ${locationSlug}` },
        { status: 404 }
      );
    }

    const songs = await prisma.song.findMany({
      where: {
        locationId: location.id,
        active: true,
      },
      select: {
        id: true,
        title: true,
        artist: true,
        trackId: true,
      },
    });

    const exactBySpotifyId: Record<string, boolean> = {};
    const exactByTitleArtist: Record<string, boolean> = {};
    const possibleByFuzzy: Record<string, { songId: string; title: string; artist: string }> = {};

    const exactTrackIdSet = new Set(
      songs
        .map((song) => song.trackId)
        .filter(Boolean)
        .map((value) => String(value))
    );

    const exactTitleArtistSet = new Set(
      songs.map((song) => {
        const titleKey = normalizeTitleKey(song.title || "");
        const artistKey = normalizeArtistKey(song.artist || "");
        return `${titleKey}__${artistKey}`;
      })
    );

    const fuzzySongMap = new Map<string, { songId: string; title: string; artist: string }>();
    for (const song of songs) {
      const titleKey = normalizeTitleKey(song.title || "");
      const artistKey = normalizeArtistKey(song.artist || "");
      const key = `${titleKey}__${artistKey}`;
      if (titleKey && artistKey && !fuzzySongMap.has(key)) {
        fuzzySongMap.set(key, {
          songId: song.id,
          title: song.title || "",
          artist: song.artist || "",
        });
      }
    }

    for (const track of tracks) {
      const spotifyId = track.spotifyId ? String(track.spotifyId) : "";
      const rawTitle = String(track.title || "").trim();
      const rawArtist = String(track.artist || "").trim();

      if (spotifyId && exactTrackIdSet.has(spotifyId)) {
        exactBySpotifyId[spotifyId] = true;
        continue;
      }

      const titleKey = normalizeTitleKey(rawTitle);
      const artistKey = normalizeArtistKey(rawArtist);
      const exactKey = `${titleKey}__${artistKey}`;

      if (titleKey && artistKey && exactTitleArtistSet.has(exactKey)) {
        if (spotifyId) exactByTitleArtist[spotifyId] = true;
        continue;
      }

      if (titleKey && artistKey && fuzzySongMap.has(exactKey)) {
        const match = fuzzySongMap.get(exactKey)!;
        if (spotifyId) {
          possibleByFuzzy[spotifyId] = match;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      exactBySpotifyId,
      exactByTitleArtist,
      possibleByFuzzy,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to detect duplicates." },
      { status: 500 }
    );
  }
}