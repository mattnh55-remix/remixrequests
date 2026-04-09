import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

type ImportTrack = {
  title: string;
  artist: string;
  album: string;
  albumArt: string | null;
  spotifyId: string | null;
  previewUrl?: string | null;
  durationMs?: number | null;
  featureBoost?: number;
};

function toArtistKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const tracks = Array.isArray(body?.tracks) ? (body.tracks as ImportTrack[]) : [];
    const locationSlug = String(body?.locationSlug || "remixrequests").trim();

    if (!tracks.length) {
      return NextResponse.json(
        { ok: false, error: "No tracks were selected for import." },
        { status: 400 }
      );
    }

    const location = await prisma.location.findUnique({
      where: { slug: locationSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!location) {
      return NextResponse.json(
        { ok: false, error: `Location not found for slug: ${locationSlug}` },
        { status: 404 }
      );
    }

    const importBatch = `spotify-${Date.now()}`;
    let added = 0;
    let updated = 0;
    let skipped = 0;

    const results: Array<{
      title: string;
      artist: string;
      action: "added" | "updated" | "skipped";
      id?: string;
    }> = [];

    for (const track of tracks) {
      const title = String(track.title || "").trim();
      const artist = String(track.artist || "").trim();
      const album = String(track.album || "").trim();
      const artworkUrl = track.albumArt ? String(track.albumArt) : null;
      const spotifyTrackId = track.spotifyId ? String(track.spotifyId) : null;
      const durationSec = typeof track.durationMs === "number" ? Math.max(0, Math.round(track.durationMs / 1000)) : null;
      const featureBoost = Number.isFinite(track.featureBoost) ? Number(track.featureBoost) : 0;
      const artistKey = toArtistKey(artist);

      if (!title || !artist || !artistKey) {
        skipped += 1;
        results.push({ title, artist, action: "skipped" });
        continue;
      }

      let existing = null;

      if (spotifyTrackId) {
        existing = await prisma.song.findFirst({
          where: {
            locationId: location.id,
            trackId: spotifyTrackId,
          },
        });
      }

      if (!existing) {
        existing = await prisma.song.findFirst({
          where: {
            locationId: location.id,
            title,
            artist,
          },
        });
      }

      if (existing) {
        const updatedSong = await prisma.song.update({
          where: { id: existing.id },
          data: {
            album: album || existing.album || null,
            artworkUrl: artworkUrl || existing.artworkUrl || null,
            trackId: spotifyTrackId || existing.trackId || null,
            durationSec: durationSec ?? existing.durationSec ?? null,
            active: true,
            featureBoost: featureBoost > 0 ? featureBoost : existing.featureBoost,
            importBatch,
          },
        });

        updated += 1;
        results.push({
          title,
          artist,
          action: "updated",
          id: updatedSong.id,
        });
      } else {
        const createdSong = await prisma.song.create({
          data: {
            locationId: location.id,
            title,
            artist,
            artistKey,
            album: album || null,
            artworkUrl,
            trackId: spotifyTrackId,
            durationSec,
            active: true,
            explicit: false,
            featureBoost: Math.max(0, featureBoost),
            importBatch,
          },
        });

        added += 1;
        results.push({
          title,
          artist,
          action: "added",
          id: createdSong.id,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      location,
      summary: {
        added,
        updated,
        skipped,
        total: tracks.length,
      },
      results,
    });
  } catch (error: any) {
    console.error("spotify import route error", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to import songs.",
      },
      { status: 500 }
    );
  }
}
