// src/app/api/admni/songs/import/[location]/route.ts

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { normalizeArtistKey } from "@/lib/security";

type RawRow = Record<string, unknown>;

function toBool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const s = String(value).trim().toLowerCase();
  if (!s) return fallback;

  return ["1", "true", "yes", "y"].includes(s);
}

function toInt(value: unknown, fallback?: number): number | undefined {
  if (value === undefined || value === null || value === "") return fallback;

  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;

  return Math.trunc(n);
}

function toStringOrUndefined(value: unknown): string | undefined {
  const s = String(value ?? "").trim();
  return s ? s : undefined;
}

function toTags(value: unknown): string[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  const parts = raw.includes("|") ? raw.split("|") : raw.split(",");
  return parts
    .map((part) => part.trim())
    .filter(Boolean);
}

function sanitizePathPart(value: string): string {
  return value.replace(/^\/+/, "");
}

function joinUrl(baseUrl?: string | null, fileName?: string | null): string | undefined {
  const base = String(baseUrl ?? "").trim();
  const file = String(fileName ?? "").trim();

  if (!base || !file) return undefined;

  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedFile = sanitizePathPart(file);

  return `${normalizedBase}/${normalizedFile}`;
}

function generateSongId(title: string, artist: string, rowIndex: number): string {
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

  const suffix = `${Date.now()}-${rowIndex + 1}`;

  return `${artistPart || "artist"}-${titlePart || "song"}-${suffix}`;
}

function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  for (let i = 0; i < Math.min(rows.length, 15); i += 1) {
    const row = rows[i].map((v) => String(v ?? "").trim().toLowerCase());

    const hasArtist = row.includes("artist");
    const hasTitle = row.includes("title");

    if (hasArtist && hasTitle) {
      return i;
    }
  }

  return 0;
}

function getRowsFromWorkbook(buf: Buffer, fileName: string): RawRow[] {
  if (fileName.endsWith(".xlsx")) {
    const wb = XLSX.read(buf, { type: "buffer" });

    const preferredSheetName =
      wb.SheetNames.find((n) => n === "Production_Import_Template") ||
      wb.SheetNames.find((n) => n.toLowerCase() === "production_import_template") ||
      wb.SheetNames[0];

    const sheet = wb.Sheets[preferredSheetName];
    const headerRow = findHeaderRow(sheet);

    return XLSX.utils.sheet_to_json<RawRow>(sheet, {
      defval: "",
      range: headerRow,
    });
  }

  if (fileName.endsWith(".csv")) {
    const text = buf.toString("utf8");
    const wb = XLSX.read(text, { type: "string" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const headerRow = findHeaderRow(sheet);

    return XLSX.utils.sheet_to_json<RawRow>(sheet, {
      defval: "",
      range: headerRow,
    });
  }

  throw new Error("UNSUPPORTED_FILE");
}

function getCell(row: RawRow, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in row) return row[key];
  }
  return undefined;
}

export async function POST(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);

  const rules = await prisma.ruleset.findFirst({
    where: { locationId: loc.id },
    select: {
      albumArtBaseUrl: true,
      defaultAlbumArtUrl: true,
    },
  });

  const albumArtBaseUrl = String(rules?.albumArtBaseUrl ?? "").trim();
  const defaultAlbumArtUrl = String(rules?.defaultAlbumArtUrl ?? "").trim() || undefined;

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Missing file." },
      { status: 400 }
    );
  }

  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  let rows: RawRow[] = [];

  try {
    rows = getRowsFromWorkbook(buf, name);
  } catch (error: unknown) {
    if (String((error as Error)?.message) === "UNSUPPORTED_FILE") {
      return NextResponse.json(
        { ok: false, error: "Upload .xlsx or .csv" },
        { status: 400 }
      );
    }

    throw error;
  }

  const normalized = rows
    .map((row, rowIndex) => {
      const artist = String(
        getCell(row, "artist", "Artist", "ARTIST") ?? ""
      ).trim();

      const title = String(
        getCell(row, "title", "Title", "TITLE") ?? ""
      ).trim();

      if (!artist || !title) {
        return null;
      }

      const songIdRaw = String(
        getCell(row, "songId", "SongId", "SONGID") ?? ""
      ).trim();

      const active = toBool(
        getCell(row, "active", "Active", "ACTIVE"),
        true
      );

      const explicit = toBool(
        getCell(row, "explicit", "Explicit", "EXPLICIT"),
        false
      );

      const genre = toStringOrUndefined(
        getCell(row, "genre", "Genre", "GENRE")
      );

      const tags = toTags(
        getCell(row, "tags", "Tags", "TAGS")
      );

      const songWeight = toInt(
        getCell(row, "songWeight", "SongWeight", "SONGWEIGHT"),
        10
      ) ?? 10;

      const album = toStringOrUndefined(
        getCell(row, "album", "Album", "ALBUM")
      );

      const releaseYear = toInt(
        getCell(row, "releaseYear", "ReleaseYear", "RELEASEYEAR")
      );

      const preferredAudience =
        toStringOrUndefined(
          getCell(
            row,
            "preferredAudience",
            "PreferredAudience",
            "PREFERREDAUDIENCE"
          )
        ) || "both";

      const albumArtFile = toStringOrUndefined(
        getCell(
          row,
          "albumArtFile",
          "AlbumArtFile",
          "ALBUMARTFILE"
        )
      );

      const importBatch = toStringOrUndefined(
        getCell(row, "importBatch", "ImportBatch", "IMPORTBATCH")
      );

      const notes = toStringOrUndefined(
        getCell(row, "notes", "Notes", "NOTES")
      );

      const directArtworkUrl = toStringOrUndefined(
        getCell(
          row,
          "artworkUrl",
          "artworkURL",
          "ArtworkUrl",
          "ARTWORKURL"
        )
      );

      const builtArtworkUrl =
        directArtworkUrl ||
        joinUrl(albumArtBaseUrl, albumArtFile) ||
        defaultAlbumArtUrl;

      return {
        locationId: loc.id,
        songId: songIdRaw || generateSongId(title, artist, rowIndex),
        title,
        artist,
        artistKey: normalizeArtistKey(artist),
        active,
        explicit,
        genre,
        tags,
        songWeight,
        featureBoost: 0,
        album,
        releaseYear,
        preferredAudience,
        albumArtFile,
        artworkUrl: builtArtworkUrl,
        importBatch,
        notes,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (!normalized.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "No valid rows found. Make sure the file includes artist and title columns.",
        routeVersion: "songs-import-v4",
      },
      { status: 400 }
    );
  }

  const batchSize = 250;

  await prisma.$transaction(async (tx) => {
    await tx.song.deleteMany({
      where: { locationId: loc.id },
    });

    for (let i = 0; i < normalized.length; i += batchSize) {
      const batch = normalized.slice(i, i + batchSize);

      await tx.song.createMany({
        data: batch,
      });
    }
  });

  return NextResponse.json({
    ok: true,
    created: normalized.length,
    replaced: true,
    routeVersion: "songs-import-v4",
    artwork: {
      albumArtBaseUrl: albumArtBaseUrl || null,
      defaultAlbumArtUrl: defaultAlbumArtUrl || null,
    },
  });
}