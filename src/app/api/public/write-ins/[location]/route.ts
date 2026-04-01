// src/app/api/public/write-ins/[location]/route.ts

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";

function safeTrim(value: unknown) {
  if (value === null || value === undefined) return "";

  let s = String(value);
  s = s.replace(/\s+/g, " ");
  return s.trim();
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
  const { loc } = await getRulesForLocation(params.location);
  const body = await req.json();

  const rawRequestedArtist = safeTrim(body?.requestedArtist);
  const requestedTitle = safeTrim(body?.requestedTitle);
  const requestNotes = safeTrim(body?.requestNotes) || null;
  const identityId = safeTrim(body?.identityId) || null;
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

  const created = await prisma.songWriteIn.create({
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

  // 🔥 Create LIVE request using existing system
  try {
    const requestRes = await fetch(
      `${process.env.APP_BASE_URL}/api/public/request`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          location: params.location,
          identityId,
          // IMPORTANT: pass through write-in data
          requestedTitle,
          requestedArtist: finalRequestedArtist,
          requestNotes,
          source: "WRITE_IN",
        }),
      }
    );

    const requestData = await requestRes.json();

    if (!requestData.ok) {
      console.error("WRITE_IN_REQUEST_FAILED", requestData);
    }
  } catch (err) {
    console.error("WRITE_IN_REQUEST_ERROR", err);
  }

  return NextResponse.json({
    ok: true,
    writeInId: created.id,
    status: created.status,
    message: "✅ Write-in submitted for booth review.",
  });
}