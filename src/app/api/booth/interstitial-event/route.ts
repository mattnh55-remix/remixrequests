// src/app/api/booth/interstitial-event/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type EventPayload = {
  location: string;
  category: string;
  scheduleId?: string | null;
  assetId?: string | null;
  status: "PLAYED" | "SKIPPED";
  reason?: string | null;
  playedAt?: string | null;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EventPayload;

    if (!body?.location) return badRequest("location is required");
    if (!body?.category) return badRequest("category is required");
    if (!body?.status) return badRequest("status is required");

    if (body.status === "SKIPPED" && !String(body.reason ?? "").trim()) {
      return badRequest("skip reason is required");
    }

    if (body.status === "PLAYED" && !String(body.assetId ?? "").trim()) {
      return badRequest("assetId is required for PLAYED");
    }

    const locationRow = await prisma.location.findFirst({
      where: {
        OR: [{ id: body.location }, { slug: body.location }],
      },
      select: {
        id: true,
      },
    });

    if (!locationRow) {
      return badRequest("Invalid location");
    }

    const now = new Date();
    const parsedPlayedAt =
      body.playedAt && !Number.isNaN(new Date(body.playedAt).getTime())
        ? new Date(body.playedAt)
        : now;

    const created = await prisma.interstitialEvent.create({
      data: {
        locationId: locationRow.id,
        category: body.category as any,
        scheduleId: body.scheduleId ?? null,
        assetId: body.assetId ?? null,
        status: body.status as any,
        operatorNote: body.reason?.trim() || null,
        playedAt: body.status === "PLAYED" ? parsedPlayedAt : null,
        skippedAt: body.status === "SKIPPED" ? now : null,
      },
    });

    return NextResponse.json({
      ok: true,
      eventId: created.id,
    });
  } catch (error) {
    console.error("[interstitial-event][POST] error", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create interstitial event.",
      },
      { status: 500 }
    );
  }
}