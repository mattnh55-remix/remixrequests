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
  featured?: boolean;
};

function normalizeArtistKey(artist: string) {
  return String(artist || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const tracks = Array.isArray(body?.tracks) ? (body.tracks as ImportTrack[]) : [];
    const locationSlug = String(body?.locationSlug || "remixrequests");

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

    let added = 0;
    let updated = 0;
    let skipped = 0;

    const batchId = `spotify-${location.slug}-${Date.now()}`;

    for (const track of tracks) {
      const title = String(track.title || "").trim();
      const artist = String(track.artist || "").trim();
      const album = String(track.album || "").trim();
      const artworkUrl = track.albumArt ? String(track.albumArt) : null;
      const trackId = track.spotifyId ? String(track.spotifyId) : null;
      const featured = Boolean(track.featured);
      const durationSec = typeof track.durationMs === "number" ? Math.max(1, Math.round(track.durationMs / 1000)) : null;
      const artistKey = normalizeArtistKey(artist);

      if (!title || !artist || !artistKey) {
        skipped += 1;
        continue;
      }

      let existing = null as null | { id: string; featureBoost: number; artworkUrl: string | null; album: string | null; trackId: string | null; durationSec: number | null };

      if (trackId) {
        existing = await prisma.song.findFirst({
          where: {
            locationId: location.id,
            trackId,
          },
          select: {
            id: true,
            featureBoost: true,
            artworkUrl: true,
            album: true,
            trackId: true,
            durationSec: true,
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
          select: {
            id: true,
            featureBoost: true,
            artworkUrl: true,
            album: true,
            trackId: true,
            durationSec: true,
          },
        });
      }

      if (existing) {
        await prisma.song.update({
          where: { id: existing.id },
          data: {
            title,
            artist,
            artistKey,
            album: album || existing.album || null,
            artworkUrl: artworkUrl || existing.artworkUrl || null,
            trackId: trackId || existing.trackId || null,
            durationSec: durationSec || existing.durationSec || null,
            active: true,
            importBatch: batchId,
            featureBoost: featured ? Math.max(existing.featureBoost, 100) : existing.featureBoost,
          },
        });
        updated += 1;
      } else {
        await prisma.song.create({
          data: {
            locationId: location.id,
            title,
            artist,
            artistKey,
            album: album || null,
            artworkUrl,
            trackId,
            durationSec,
            active: true,
            explicit: false,
            featureBoost: featured ? 100 : 0,
            importBatch: batchId,
            notes: "Imported from Spotify playlist",
          },
        });
        added += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        added,
        updated,
        skipped,
        total: tracks.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to import songs." },
      { status: 500 }
    );
  }
}
