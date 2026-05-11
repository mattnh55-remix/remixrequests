// src/app/api/admin/spotify/update-album-art/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const locationSlug = cleanText(body.locationSlug || "remixrequests");
    const spotifyId = cleanText(body.spotifyId);
    const title = cleanText(body.title);
    const artist = cleanText(body.artist);
    const albumArt = cleanText(body.albumArt);

    if (!locationSlug) {
      return NextResponse.json({ ok: false, error: "Missing location slug." }, { status: 400 });
    }

    if (!albumArt) {
      return NextResponse.json({ ok: false, error: "Missing Spotify album art URL." }, { status: 400 });
    }

    if (!spotifyId && (!title || !artist)) {
      return NextResponse.json(
        { ok: false, error: "Missing duplicate match details." },
        { status: 400 }
      );
    }

    const location = await prisma.location.findUnique({
      where: { slug: locationSlug },
      select: { id: true, slug: true },
    });

    if (!location) {
      return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
    }

    const song = await prisma.song.findFirst({
      where: {
        locationId: location.id,
        OR: [
          ...(spotifyId ? [{ spotifyId }] : []),
          ...(title && artist
            ? [{ title: { equals: title, mode: "insensitive" as const }, artist: { equals: artist, mode: "insensitive" as const } }]
            : []),
        ],
      },
      select: { id: true, title: true, artist: true },
    });

    if (!song) {
      return NextResponse.json(
        { ok: false, error: "Could not find the existing library song to update." },
        { status: 404 }
      );
    }

    const updated = await prisma.song.update({
      where: { id: song.id },
      data: {
        albumArt,
        ...(spotifyId ? { spotifyId } : {}),
      },
      select: { id: true, title: true, artist: true, albumArt: true },
    });

    return NextResponse.json({ ok: true, song: updated });
  } catch (err: any) {
    console.error("update album art error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Album art update failed." },
      { status: 500 }
    );
  }
}
