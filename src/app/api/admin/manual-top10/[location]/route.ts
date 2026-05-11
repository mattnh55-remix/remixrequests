// src/app/api/admin/manual-top10/[location]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type ManualRequestStatus = "A" | "R" | "P";

type ManualTop10Item = {
  id: string;
  requestId: string;
  songId: string;
  title: string;
  artist: string;
  artworkUrl?: string | null;
  requestStatus: string;
  statusSymbol: ManualRequestStatus;
  createdAt?: string;
  requesterLabel?: string;
  upvotes: number;
  downvotes: number;
  score: number;
  rank?: number;
};

function statusSymbol(status: unknown): ManualRequestStatus {
  const clean = String(status || "").trim().toUpperCase();
  if (clean === "APPROVED" || clean === "ACCEPTED" || clean === "PLAYED") return "A";
  if (clean === "REJECTED") return "R";
  return "P";
}

function cleanInt(value: unknown, fallback = 0) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(0, Math.floor(next));
}

function normalizeSavedItems(items: unknown): ManualTop10Item[] {
  if (!Array.isArray(items)) return [];

  return items
    .slice(0, 10)
    .map((raw: any, index) => {
      const upvotes = cleanInt(raw?.upvotes, 0);
      const downvotes = cleanInt(raw?.downvotes, 0);
      const requestStatus = String(raw?.requestStatus || "PENDING").trim().toUpperCase();

      return {
        id: String(raw?.id || raw?.requestId || `manual-${index}`),
        requestId: String(raw?.requestId || raw?.id || ""),
        songId: String(raw?.songId || ""),
        title: String(raw?.title || "Untitled Song").trim(),
        artist: String(raw?.artist || "Unknown Artist").trim(),
        artworkUrl: raw?.artworkUrl ? String(raw.artworkUrl) : null,
        requestStatus,
        statusSymbol: statusSymbol(raw?.statusSymbol || requestStatus),
        createdAt: raw?.createdAt ? String(raw.createdAt) : undefined,
        requesterLabel: raw?.requesterLabel ? String(raw.requesterLabel) : undefined,
        upvotes,
        downvotes,
        score: upvotes - downvotes,
        rank: index + 1,
      };
    })
    .filter((item) => item.requestId && item.title);
}

async function getLocation(location: string) {
  const slug = String(location || "").trim();
  if (!slug) return null;

  return prisma.location.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
}

export async function GET(_req: Request, { params }: { params: { location: string } }) {
  try {
    const loc = await getLocation(params.location);
    if (!loc) {
      return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
    }

    const [requests, board] = await Promise.all([
      prisma.request.findMany({
        where: { locationId: loc.id },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              artist: true,
              artworkUrl: true,
              albumArtFile: true,
            },
          },
          votes: {
            select: { value: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.manualTop10Board.findUnique({
        where: { locationSlug: loc.slug },
      }),
    ]);

    const requestPool: ManualTop10Item[] = requests.map((req) => {
      const upvotes = req.votes.filter((vote) => Number(vote.value) > 0).length;
      const downvotes = req.votes.filter((vote) => Number(vote.value) < 0).length;
      const reqStatus = String(req.status || "PENDING").toUpperCase();
      const artworkUrl = req.song.artworkUrl || req.song.albumArtFile || null;

      return {
        id: req.id,
        requestId: req.id,
        songId: req.songId,
        title: req.song.title,
        artist: req.song.artist,
        artworkUrl,
        requestStatus: reqStatus,
        statusSymbol: statusSymbol(reqStatus),
        createdAt: req.createdAt.toISOString(),
        requesterLabel: req.emailHash ? `${req.emailHash.slice(0, 6)}…` : undefined,
        upvotes,
        downvotes,
        score: upvotes - downvotes,
      };
    });

    return NextResponse.json({
      ok: true,
      location: { slug: loc.slug, name: loc.name },
      requestPool,
      boardItems: normalizeSavedItems(board?.items),
      targetVotes: board?.targetVotes ?? 512,
      updatedAt: board?.updatedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Manual Top 10 GET failed", error);
    return NextResponse.json({ ok: false, error: "Could not load manual Top 10." }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { location: string } }) {
  try {
    const loc = await getLocation(params.location);
    if (!loc) {
      return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
    }

    const body = await req.json();
    const targetVotes = Math.max(1, Math.floor(Number(body?.targetVotes || 512)));
    const boardItems = normalizeSavedItems(body?.items);

    if (boardItems.length === 0) {
      return NextResponse.json({ ok: false, error: "Add at least one request before saving." }, { status: 400 });
    }

    const saved = await prisma.manualTop10Board.upsert({
      where: { locationSlug: loc.slug },
      create: {
        locationSlug: loc.slug,
        targetVotes,
        items: boardItems,
      },
      update: {
        targetVotes,
        items: boardItems,
      },
    });

    return NextResponse.json({
      ok: true,
      boardItems: normalizeSavedItems(saved.items),
      targetVotes: saved.targetVotes,
      updatedAt: saved.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Manual Top 10 POST failed", error);
    return NextResponse.json({ ok: false, error: "Could not save manual Top 10." }, { status: 500 });
  }
}
