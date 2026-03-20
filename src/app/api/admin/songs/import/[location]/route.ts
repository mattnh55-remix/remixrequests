// src/app/api/admin/songs/import/[location]/route.ts

import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { prisma } from "@/lib/db";
import { normalizeArtistKey } from "@/lib/security";
import * as XLSX from "xlsx";

function toBool(v: any, fallback = false) {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(s);
}

function toTags(v: any): string[] {
  const raw = String(v ?? "").trim();
  if (!raw) return [];
  const parts = raw.includes("|") ? raw.split("|") : raw.split(",");
  return parts.map(t => t.trim()).filter(Boolean);
}

function toNumber(v: any): number | null {
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export async function POST(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  let rows: Array<any> = [];

  if (name.endsWith(".xlsx")) {
  const wb = XLSX.read(buf, { type: "buffer" });

  const preferredSheetName =
    wb.SheetNames.find((n) => n === "Production_Import_Template") ||
    wb.SheetNames.find((n) => n.toLowerCase() === "production_import_template") ||
    wb.SheetNames[0];

  const sheet = wb.Sheets[preferredSheetName];
  rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
} else if (name.endsWith(".csv")) {
    const text = buf.toString("utf8");
    const wb = XLSX.read(text, { type: "string" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } else {
    return NextResponse.json({ ok: false, error: "Upload .xlsx or .csv" }, { status: 400 });
  }

  // ✅ NEW FLEXIBLE MAPPING
  const normalized = rows.map((r) => {
const title = r.title ?? r.Title ?? r.TITLE ?? "";
const artist = r.artist ?? r.Artist ?? r.ARTIST ?? "";

    return {
      // REQUIRED
      title: String(title).trim(),
      artist: String(artist).trim(),

      // OPTIONAL (safe defaults)
      explicit: toBool(r.explicit, false),
      tags: toTags(r.tags),

      artworkUrl:
        r.artworkUrl ||
        r.artworkURL ||
        r.albumArtFile ||
        r.albumArt ||
        "",

      // FUTURE FIELDS (ignored by DB for now, but parsed safely)
      album: r.album || "",
      releaseYear: toNumber(r.releaseYear),
      genre: r.genre || "",
      decade: r.decade || "",
      catalogScore: toNumber(r.catalogScore) ?? 40,

      tidalTrackId: r.tidalTrackId || "",
      spotifyTrackId: r.spotifyTrackId || "",
      isrc: r.isrc || "",

      active: toBool(r.active, true),
    };
  }).filter(r => r.title && r.artist);

  if (!normalized.length) {
    return NextResponse.json(
      { ok: false, error: "No valid rows. Need title + artist." },
      { status: 400 }
    );
  }

  const batchSize = 250;
  let created = 0;

  for (let i = 0; i < normalized.length; i += batchSize) {
    const batch = normalized.slice(i, i + batchSize);

    await prisma.song.createMany({
      data: batch.map((r) => ({
        locationId: loc.id,
        title: r.title,
        artist: r.artist,
        artistKey: normalizeArtistKey(r.artist),
        explicit: r.explicit,
        tags: r.tags,
        artworkUrl: r.artworkUrl || undefined,
      })),
    });

    created += batch.length;
  }

  return NextResponse.json({ ok: true, created });
}