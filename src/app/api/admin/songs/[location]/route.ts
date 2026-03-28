import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";

const SORT_FIELDS = new Set([
  "artist",
  "title",
  "songWeight",
  "featureBoost",
  "releaseYear",
  "active",
  "explicit",
] as const);

type SortField =
  | "artist"
  | "title"
  | "songWeight"
  | "featureBoost"
  | "releaseYear"
  | "active"
  | "explicit";

function parseBoolFilter(value: string | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseStringList(value: string | null) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanString(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw ? raw : null;
}

function cleanStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  return parseStringList(typeof value === "string" ? value : null);
}

function cleanNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function orderByFor(sort: SortField, dir: "asc" | "desc") {
  if (sort === "artist") return [{ artist: dir }, { title: dir }];
  if (sort === "title") return [{ title: dir }, { artist: dir }];
  return [{ [sort]: dir }, { artist: "asc" }, { title: "asc" }] as any;
}

async function getCounts(locationId: string) {
  const [total, featured, active, explicit] = await Promise.all([
    prisma.song.count({ where: { locationId } }),
    prisma.song.count({ where: { locationId, featureBoost: { gt: 0 } } }),
    prisma.song.count({ where: { locationId, active: true } }),
    prisma.song.count({ where: { locationId, explicit: true } }),
  ]);

  return { total, featured, active, explicit };
}

export async function GET(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);
  const { searchParams } = new URL(req.url);

  const tab = searchParams.get("tab") === "featured" ? "featured" : "all";
  const q = String(searchParams.get("q") || "").trim();
  const active = parseBoolFilter(searchParams.get("active"));
  const explicit = parseBoolFilter(searchParams.get("explicit"));
  const audience = cleanString(searchParams.get("audience"));
  const genre = cleanString(searchParams.get("genre"));
  const tags = parseStringList(searchParams.get("tags"));
  const sortParam = String(searchParams.get("sort") || "artist");
  const sort = (SORT_FIELDS.has(sortParam as SortField) ? sortParam : "artist") as SortField;
  const dir = searchParams.get("dir") === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 50)));

  const where: any = { locationId: loc.id };

  if (tab === "featured") where.featureBoost = { gt: 0 };
  if (typeof active === "boolean") where.active = active;
  if (typeof explicit === "boolean") where.explicit = explicit;
  if (audience && audience !== "all") where.preferredAudience = audience;
  if (genre) where.genre = { contains: genre, mode: "insensitive" };
  if (tags.length) where.tags = { hasSome: tags };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { artist: { contains: q, mode: "insensitive" } },
      { album: { contains: q, mode: "insensitive" } },
      { songId: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { genre: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ];
  }

  const [items, total, counts] = await Promise.all([
    prisma.song.findMany({
      where,
      orderBy: orderByFor(sort, dir),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        songId: true,
        title: true,
        artist: true,
        active: true,
        explicit: true,
        genre: true,
        tags: true,
        songWeight: true,
        featureBoost: true,
        album: true,
        releaseYear: true,
        preferredAudience: true,
        albumArtFile: true,
        artworkUrl: true,
        importBatch: true,
        notes: true,
      },
    }),
    prisma.song.count({ where }),
    getCounts(loc.id),
  ]);

  return NextResponse.json({ ok: true, items, total, counts, page, pageSize });
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
  const action = String(body?.action || "");

  if (action === "update-song") {
    const songId = String(body?.songId || "").trim();
    if (!songId) {
      return NextResponse.json({ ok: false, error: "Missing song ID." }, { status: 400 });
    }

    const patch = body?.patch || {};

    const updated = await prisma.song.updateMany({
      where: { id: songId, locationId: loc.id },
      data: {
        active: typeof patch.active === "boolean" ? patch.active : undefined,
        explicit: typeof patch.explicit === "boolean" ? patch.explicit : undefined,
        genre: patch.genre !== undefined ? cleanString(patch.genre) : undefined,
        tags: Array.isArray(patch.tags) || typeof patch.tags === "string" ? cleanStringArray(patch.tags) : undefined,
        preferredAudience: patch.preferredAudience !== undefined ? cleanString(patch.preferredAudience) : undefined,
        songWeight: patch.songWeight !== undefined ? cleanNumber(patch.songWeight, 0) : undefined,
        featureBoost: patch.featureBoost !== undefined ? cleanNumber(patch.featureBoost, 0) : undefined,
        album: patch.album !== undefined ? cleanString(patch.album) : undefined,
        releaseYear: patch.releaseYear !== undefined ? (patch.releaseYear ? cleanNumber(patch.releaseYear, 0) : null) : undefined,
        albumArtFile: patch.albumArtFile !== undefined ? cleanString(patch.albumArtFile) : undefined,
        artworkUrl: patch.artworkUrl !== undefined ? cleanString(patch.artworkUrl) : undefined,
        importBatch: patch.importBatch !== undefined ? cleanString(patch.importBatch) : undefined,
        notes: patch.notes !== undefined ? cleanString(patch.notes) : undefined,
      },
    });

    if (!updated.count) {
      return NextResponse.json({ ok: false, error: "Song not found for this location." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: "✅ Song updated." });
  }

  if (action === "clear-featured") {
    const result = await prisma.song.updateMany({
      where: { locationId: loc.id, featureBoost: { gt: 0 } },
      data: { featureBoost: 0 },
    });

    return NextResponse.json({ ok: true, message: `✅ Cleared featured boost on ${result.count} song(s).` });
  }

  if (action === "bulk-update") {
    const songIds = Array.isArray(body?.songIds) ? body.songIds.map((id: unknown) => String(id)).filter(Boolean) : [];
    if (!songIds.length) {
      return NextResponse.json({ ok: false, error: "Select at least one song." }, { status: 400 });
    }

    const bulkAction = String(body?.bulkAction || "");
    const value = body?.value;

    if (bulkAction === "activate" || bulkAction === "deactivate") {
      const result = await prisma.song.updateMany({
        where: { locationId: loc.id, id: { in: songIds } },
        data: { active: bulkAction === "activate" },
      });

      return NextResponse.json({ ok: true, message: `✅ Updated ${result.count} song(s).` });
    }

    if (bulkAction === "clearFeatureBoost") {
      const result = await prisma.song.updateMany({
        where: { locationId: loc.id, id: { in: songIds } },
        data: { featureBoost: 0 },
      });

      return NextResponse.json({ ok: true, message: `✅ Cleared featured boost on ${result.count} song(s).` });
    }

    if (["setAudience", "setGenre", "setSongWeight", "setFeatureBoost"].includes(bulkAction)) {
      const data: any = {};
      if (bulkAction === "setAudience") data.preferredAudience = cleanString(value) || "both";
      if (bulkAction === "setGenre") data.genre = cleanString(value);
      if (bulkAction === "setSongWeight") data.songWeight = cleanNumber(value, 0);
      if (bulkAction === "setFeatureBoost") data.featureBoost = cleanNumber(value, 0);

      const result = await prisma.song.updateMany({
        where: { locationId: loc.id, id: { in: songIds } },
        data,
      });

      return NextResponse.json({ ok: true, message: `✅ Updated ${result.count} song(s).` });
    }

    if (bulkAction === "addTags" || bulkAction === "removeTags") {
      const incomingTags = cleanStringArray(value);
      const songs = await prisma.song.findMany({
        where: { locationId: loc.id, id: { in: songIds } },
        select: { id: true, tags: true },
      });

      await prisma.$transaction(
        songs.map((song) => {
          const current = Array.isArray(song.tags) ? song.tags : [];
          const nextTags = bulkAction === "addTags"
            ? Array.from(new Set([...current, ...incomingTags]))
            : current.filter((tag) => !incomingTags.includes(tag));

          return prisma.song.update({
            where: { id: song.id },
            data: { tags: nextTags },
          });
        })
      );

      return NextResponse.json({ ok: true, message: `✅ Updated tags on ${songs.length} song(s).` });
    }

    return NextResponse.json({ ok: false, error: "Unsupported bulk action." }, { status: 400 });
  }

  return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
}
