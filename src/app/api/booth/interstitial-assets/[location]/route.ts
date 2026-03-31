// src/app/api/booth/interstitial-assets/[location]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: {
    location: string;
  };
};

type BoothInterstitialAsset = {
  id: string;
  name: string;
  category: string;
  durationSec: number | null;
  fileUrl: string | null;
  previewGifUrl: string | null;
  iconLabel: string | null;
  notes: string | null;
  active: boolean;
  manualOnly: boolean;
};

function normalizeCategory(value: string | null | undefined) {
  const raw = String(value ?? "").trim().toUpperCase();

  if (raw === "ANNOUNCEMENTS") return "ANNOUNCEMENTS";
  if (raw === "SONG_INTROS") return "SONG_INTROS";
  if (raw === "GAMES_DANCES") return "GAMES_DANCES";
  if (raw === "REMIX_PROMOS") return "REMIX_PROMOS";

  return "REMIX_PROMOS";
}

export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  try {
    const rawLocation = String(params.location ?? "").trim();

    if (!rawLocation) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing location.",
          assets: [],
        },
        { status: 400 }
      );
    }

    const location = await prisma.location.findFirst({
      where: {
        OR: [{ id: rawLocation }, { slug: rawLocation }],
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        {
          ok: false,
          error: `Location not found for "${rawLocation}".`,
          assets: [],
        },
        { status: 404 }
      );
    }

    const rows = await prisma.interstitialAsset.findMany({
      where: {
        locationId: location.id,
        active: true,
        // IMPORTANT:
        // manualOnly assets SHOULD still appear in booth tabs.
        // Only scheduled prompt selection should exclude manualOnly.
      },
      orderBy: [
        { category: "asc" },
        { priority: "desc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        category: true,
        durationSec: true,
        fileUrl: true,
        previewGifUrl: true,
        iconLabel: true,
        notes: true,
        active: true,
        manualOnly: true,
      },
    });

    const assets: BoothInterstitialAsset[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: normalizeCategory(row.category),
      durationSec: row.durationSec ?? null,
      fileUrl: row.fileUrl ?? null,
      previewGifUrl: row.previewGifUrl ?? null,
      iconLabel: row.iconLabel ?? null,
      notes: row.notes ?? null,
      active: Boolean(row.active),
      manualOnly: Boolean(row.manualOnly),
    }));

    return NextResponse.json({
      ok: true,
      locationId: location.id,
      assets,
    });
  } catch (error) {
    console.error("[GET /api/booth/interstitial-assets/[location]]", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Could not load interstitial assets.",
        assets: [],
      },
      { status: 500 }
    );
  }
}