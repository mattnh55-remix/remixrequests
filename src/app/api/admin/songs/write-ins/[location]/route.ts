// src/app/api/admin/songs/write-ins/[location]/route.ts

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { normalizeArtistKey } from "@/lib/security";

function safeTrim(value: unknown) {
  const s = String(value ?? "").trim();
  return s || "";
}

function toOptionalString(value: unknown) {
  const s = safeTrim(value);
  return s || null;
}

function buildSongId(title: string, artist: string) {
  const artistPart = artist
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const titlePart = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${artistPart || "artist"}-${titlePart || "song"}-${Date.now()}`;
}

export async function GET(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);

  const items = await prisma.songWriteIn.findMany({
    where: {
      locationId: loc.id,
      status: {
        in: ["PENDING", "MATCHED"],
      },
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      matchedSong: {
        select: {
          id: true,
          songId: true,
          title: true,
          artist: true,
        },
      },
      identity: {
        select: {
          id: true,
          emailHash: true,
        },
      },
      session: {
        select: {
          id: true,
          profile: true,
          startedAt: true,
          endsAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    diagnostics: {
      adapterReady: true,
      sourceModel: "SongWriteIn",
      message: "Live Prisma route",
    },
    items: items.map((item) => ({
      id: item.id,
      title: item.requestedTitle,
      artist: item.requestedArtist,
      notes: item.requestNotes,
      adminNotes: item.adminNotes,
      requestedByLabel: item.requestedByLabel,
      status: item.status,
      createdAt: item.createdAt,
      reviewedAt: item.reviewedAt,
      sessionId: item.sessionId,
      identityId: item.identityId,
      matchedSongId: item.matchedSong?.songId || null,
      matchedSongDbId: item.matchedSongId,
      matchedSongTitle: item.matchedSong?.title || null,
      matchedSongArtist: item.matchedSong?.artist || null,
    })),
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
  const body = await req.json();

  const action = safeTrim(body?.action);
  const writeInId = safeTrim(body?.writeInId);
  const adminNotes = toOptionalString(body?.adminNotes);

  if (!writeInId) {
    return NextResponse.json(
      { ok: false, error: "Missing write-in ID." },
      { status: 400 }
    );
  }

  const writeIn = await prisma.songWriteIn.findFirst({
    where: {
      id: writeInId,
      locationId: loc.id,
    },
  });

  if (!writeIn) {
    return NextResponse.json(
      { ok: false, error: "Write-in not found for this location." },
      { status: 404 }
    );
  }

  if (action === "reject") {
    await prisma.songWriteIn.update({
      where: { id: writeIn.id },
      data: {
        status: "REJECTED",
        adminNotes,
        reviewedAt: new Date(),
        rejectedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: "✅ Write-in rejected." });
  }

  if (action === "mark-unavailable") {
    await prisma.songWriteIn.update({
      where: { id: writeIn.id },
      data: {
        status: "UNAVAILABLE",
        adminNotes,
        reviewedAt: new Date(),
        unavailableAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: "✅ Write-in marked unavailable." });
  }

  if (action === "match-existing") {
    const catalogSongId = safeTrim(body?.songId);

    if (!catalogSongId) {
      return NextResponse.json(
        { ok: false, error: "Enter an existing songId to match." },
        { status: 400 }
      );
    }

    const song = await prisma.song.findFirst({
      where: {
        locationId: loc.id,
        songId: catalogSongId,
      },
      select: {
        id: true,
        songId: true,
        title: true,
        artist: true,
      },
    });

    if (!song) {
      return NextResponse.json(
        { ok: false, error: "No catalog song matched that songId." },
        { status: 404 }
      );
    }

    await prisma.songWriteIn.update({
      where: { id: writeIn.id },
      data: {
        status: "MATCHED",
        matchedSongId: song.id,
        adminNotes,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: `✅ Write-in matched to ${song.songId}.`,
    });
  }

  if (action === "promote-to-catalog") {
    const requestedTitle = safeTrim(writeIn.requestedTitle);
    const requestedArtist = safeTrim(writeIn.requestedArtist);

    if (!requestedTitle || !requestedArtist) {
      return NextResponse.json(
        { ok: false, error: "Write-in is missing title or artist." },
        { status: 400 }
      );
    }

    const existing = await prisma.song.findFirst({
      where: {
        locationId: loc.id,
        title: {
          equals: requestedTitle,
          mode: "insensitive",
        },
        artist: {
          equals: requestedArtist,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        songId: true,
      },
    });

    if (existing) {
      await prisma.songWriteIn.update({
        where: { id: writeIn.id },
        data: {
          status: "MATCHED",
          matchedSongId: existing.id,
          adminNotes,
          reviewedAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        message: `✅ Matching catalog song already existed. Linked to ${existing.songId}.`,
      });
    }

    const createdSong = await prisma.song.create({
      data: {
        locationId: loc.id,
        songId: buildSongId(requestedTitle, requestedArtist),
        title: requestedTitle,
        artist: requestedArtist,
        artistKey: normalizeArtistKey(requestedArtist),
        active: true,
        explicit: false,
        genre: null,
        tags: [],
        songWeight: 10,
        featureBoost: 0,
        preferredAudience: "both",
        notes: writeIn.requestNotes
          ? `Promoted from write-in. ${writeIn.requestNotes}`
          : "Promoted from write-in.",
      },
      select: {
        id: true,
        songId: true,
      },
    });

    await prisma.songWriteIn.update({
      where: { id: writeIn.id },
      data: {
        status: "APPROVED",
        matchedSongId: createdSong.id,
        adminNotes,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: `✅ Write-in promoted to catalog as ${createdSong.songId}.`,
    });
  }

  if (action === "mark-fulfilled") {
    await prisma.songWriteIn.update({
      where: { id: writeIn.id },
      data: {
        status: "FULFILLED",
        adminNotes,
        reviewedAt: new Date(),
        fulfilledAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: "✅ Write-in marked fulfilled." });
  }

  return NextResponse.json(
    { ok: false, error: "Unsupported write-in action." },
    { status: 400 }
  );
}
