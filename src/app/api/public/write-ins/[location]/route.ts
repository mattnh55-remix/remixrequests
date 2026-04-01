// src/app/api/public/write-ins/[location]/route.ts

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { normalizeArtistKey } from "@/lib/security";

function safeTrim(value: unknown) {
  if (value === null || value === undefined) return "";

  let s = String(value);
  s = s.replace(/\s+/g, " ");
  return s.trim();
}

function buildTempSongId(title: string, artist: string) {
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

  return `writein-${artistPart || "artist"}-${titlePart || "song"}-${Date.now()}`;
}

async function resolveSession(locationId: string, requestedSessionId?: string) {
  if (requestedSessionId) {
    const exact = await prisma.session.findFirst({
      where: {
        id: requestedSessionId,
        locationId,
      },
      select: { id: true },
    });
    if (exact) return exact.id;
  }

  const now = new Date();

  const active = await prisma.session.findFirst({
    where: {
      locationId,
      endsAt: { gt: now },
    },
    orderBy: [{ startedAt: "desc" }],
    select: { id: true },
  });

  return active?.id || null;
}

export async function POST(
  req: Request,
  { params }: { params: { location: string } }
) {
  try {
    const { loc } = await getRulesForLocation(params.location);
    const body = await req.json();

    const rawRequestedArtist = safeTrim(body?.requestedArtist);
    const requestedTitle = safeTrim(body?.requestedTitle);
    const requestNotes = safeTrim(body?.requestNotes) || null;
    const identityId = safeTrim(body?.identityId) || null;

    // In the current request page flow, requestedByLabel is carrying the guest email.
    const requestedByLabel = safeTrim(body?.requestedByLabel) || null;

    const sessionId = await resolveSession(
      loc.id,
      safeTrim(body?.sessionId) || undefined
    );

    if (!requestedTitle) {
      return NextResponse.json(
        { ok: false, error: "Song title is required." },
        { status: 400 }
      );
    }

    if (!requestedByLabel) {
      return NextResponse.json(
        { ok: false, error: "Verified email is required for write-in requests." },
        { status: 400 }
      );
    }

    if (identityId) {
      const identity = await prisma.identity.findFirst({
        where: {
          id: identityId,
          locationId: loc.id,
        },
        select: { id: true },
      });

      if (!identity) {
        return NextResponse.json(
          { ok: false, error: "Identity not found for this location." },
          { status: 400 }
        );
      }
    }

    const finalRequestedArtist = rawRequestedArtist || "Unknown";

    const duplicate = await prisma.songWriteIn.findFirst({
      where: {
        locationId: loc.id,
        sessionId: sessionId || undefined,
        requestedTitle: {
          equals: requestedTitle,
          mode: "insensitive",
        },
        ...(rawRequestedArtist
          ? {
              requestedArtist: {
                equals: rawRequestedArtist,
                mode: "insensitive",
              },
            }
          : {}),
        status: {
          in: ["PENDING", "MATCHED", "APPROVED"],
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    if (duplicate) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        writeInId: duplicate.id,
        status: duplicate.status,
        message: "This write-in is already pending review for this session.",
      });
    }

    const createdWriteIn = await prisma.songWriteIn.create({
      data: {
        locationId: loc.id,
        sessionId,
        identityId,
        requestedArtist: finalRequestedArtist,
        requestedTitle,
        requestNotes,
        requestedByLabel,
        status: "PENDING",
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    const existingSong = await prisma.song.findFirst({
      where: {
        locationId: loc.id,
        title: {
          equals: requestedTitle,
          mode: "insensitive",
        },
        artist: {
          equals: finalRequestedArtist,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    const liveSong =
      existingSong ||
      (await prisma.song.create({
        data: {
          locationId: loc.id,
          songId: buildTempSongId(requestedTitle, finalRequestedArtist),
          title: requestedTitle,
          artist: finalRequestedArtist,
          artistKey: normalizeArtistKey(finalRequestedArtist),
          active: true,
          explicit: false,
          genre: null,
          tags: ["write-in"],
          songWeight: 10,
          featureBoost: 0,
          preferredAudience: "both",
          artworkUrl: null,
          notes: requestNotes
            ? `Temporary write-in song. ${requestNotes}`
            : "Temporary write-in song.",
        },
        select: { id: true },
      }));

    const origin = new URL(req.url).origin;

    const requestRes = await fetch(`${origin}/api/public/request`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        location: params.location,
        songId: liveSong.id,
        email: requestedByLabel,
        action: "play_next",
      }),
    });

    const requestData = await requestRes.json().catch(() => ({}));

    if (!requestRes.ok || !requestData?.ok) {
      console.error("WRITE_IN_REQUEST_FAILED", requestData);

      return NextResponse.json(
        {
          ok: false,
          writeInId: createdWriteIn.id,
          status: createdWriteIn.status,
          error:
            requestData?.error ||
            "Write-in was saved, but could not be added to the live request queue.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      writeInId: createdWriteIn.id,
      requestId: requestData.requestId || null,
      pending: Boolean(requestData.pending),
      balance: requestData.balance,
      status: createdWriteIn.status,
      message: "✅ Write-in submitted and added to the DJ queue.",
    });
  } catch (error) {
    console.error("PUBLIC_WRITE_IN_ROUTE_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Could not submit write-in request." },
      { status: 400 }
    );
  }
}