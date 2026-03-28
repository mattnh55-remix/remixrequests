import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { normalizeArtistKey } from "@/lib/security";

type WriteInRecord = {
  id: string;
  requestedTitle: string;
  requestedArtist: string;
  requestNotes?: string | null;
  status?: string | null;
  createdAt?: Date | string | null;
  matchedSongId?: string | null;
};

function buildSongId(title: string, artist: string) {
  const artistPart = artist
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "artist";

  const titlePart = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "song";

  return `${artistPart}-${titlePart}-${Date.now()}`;
}

async function getWriteInDelegate() {
  const client = prisma as any;
  if (client.songWriteIn) {
    return {
      modelName: "songWriteIn",
      api: client.songWriteIn,
    };
  }
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);
  const delegate = await getWriteInDelegate();

  if (!delegate) {
    return NextResponse.json({
      ok: true,
      items: [],
      diagnostics: {
        adapterReady: false,
        message:
          "SongWriteIn model not present yet. The Write-Ins tab UI is live and ready for the dedicated model phase.",
      },
    });
  }

  const rows: WriteInRecord[] = await delegate.api.findMany({
    where: {
      locationId: loc.id,
      OR: [
        { status: null },
        { status: "PENDING" },
        { status: "pending" },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((row) => ({
      id: row.id,
      title: row.requestedTitle,
      artist: row.requestedArtist,
      notes: row.requestNotes || null,
      status: row.status || "PENDING",
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      matchedSongId: row.matchedSongId || null,
    })),
    diagnostics: {
      adapterReady: true,
      sourceModel: delegate.modelName,
      message: "Dedicated SongWriteIn model detected.",
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);
  const delegate = await getWriteInDelegate();
  if (!delegate) {
    return NextResponse.json({ ok: false, error: "SongWriteIn model not present yet." }, { status: 400 });
  }

  const body = await req.json();
  const action = String(body?.action || "");
  const writeInId = String(body?.writeInId || "").trim();

  if (!writeInId) {
    return NextResponse.json({ ok: false, error: "Missing write-in ID." }, { status: 400 });
  }

  const item: WriteInRecord | null = await delegate.api.findFirst({
    where: { id: writeInId, locationId: loc.id },
  });

  if (!item) {
    return NextResponse.json({ ok: false, error: "Write-in not found." }, { status: 404 });
  }

  if (action === "reject") {
    await delegate.api.update({
      where: { id: writeInId },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({ ok: true, message: "✅ Write-in rejected." });
  }

  if (action === "match-existing") {
    const songId = String(body?.songId || "").trim();
    if (!songId) {
      return NextResponse.json({ ok: false, error: "Enter an existing songId to match." }, { status: 400 });
    }

    const song = await prisma.song.findFirst({
      where: { locationId: loc.id, songId },
      select: { songId: true },
    });

    if (!song) {
      return NextResponse.json({ ok: false, error: "No song matched that songId for this location." }, { status: 404 });
    }

    await delegate.api.update({
      where: { id: writeInId },
      data: { status: "APPROVED", matchedSongId: song.songId },
    });

    return NextResponse.json({ ok: true, message: `✅ Write-in matched to ${song.songId}.` });
  }

  if (action === "promote-to-catalog") {
    const title = String(item.requestedTitle || "").trim();
    const artist = String(item.requestedArtist || "").trim();
    if (!title || !artist) {
      return NextResponse.json({ ok: false, error: "Write-in is missing title or artist." }, { status: 400 });
    }

    const created = await prisma.song.create({
      data: {
        locationId: loc.id,
        songId: buildSongId(title, artist),
        title,
        artist,
        artistKey: normalizeArtistKey(artist),
        active: true,
        explicit: false,
        genre: null,
        tags: [],
        songWeight: 10,
        featureBoost: 0,
        preferredAudience: "both",
        notes: item.requestNotes ? `Promoted from write-in: ${item.requestNotes}` : "Promoted from write-in",
      },
      select: { songId: true },
    });

    await delegate.api.update({
      where: { id: writeInId },
      data: { status: "APPROVED", matchedSongId: created.songId },
    });

    return NextResponse.json({ ok: true, message: `✅ Write-in promoted to catalog as ${created.songId}.` });
  }

  return NextResponse.json({ ok: false, error: "Unsupported write-in action." }, { status: 400 });
}
