// src/app/api/public/write-ins/[location]/route.ts

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";

function safeTrim(value: unknown) {
  const s = String(value ?? "").trim();
  return s;
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

  const requestedArtist = safeTrim(body?.requestedArtist);
  const requestedTitle = safeTrim(body?.requestedTitle);
  const requestNotes = safeTrim(body?.requestNotes) || null;
  const identityId = safeTrim(body?.identityId) || null;
  const requestedByLabel = safeTrim(body?.requestedByLabel) || null;
  const sessionId = await resolveSession(loc.id, safeTrim(body?.sessionId) || undefined);

  if (!requestedArtist || !requestedTitle) {
    return NextResponse.json(
      { ok: false, error: "Artist and title are required." },
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

  const duplicate = await prisma.songWriteIn.findFirst({
    where: {
      locationId: loc.id,
      sessionId: sessionId || undefined,
      requestedArtist: {
        equals: requestedArtist,
        mode: "insensitive",
      },
      requestedTitle: {
        equals: requestedTitle,
        mode: "insensitive",
      },
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
      requestedArtist,
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

  return NextResponse.json({
    ok: true,
    writeInId: created.id,
    status: created.status,
    message: "✅ Write-in submitted for booth review.",
  });
}
