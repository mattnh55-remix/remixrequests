import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { prisma } from "@/lib/db";
import { normalizeArtistKey } from "@/lib/security";
import * as XLSX from "xlsx";

function toBool(v: any) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(s);
}

function toTags(v: any): string[] {
  const raw = String(v ?? "").trim();
  if (!raw) return [];
  const parts = raw.includes("|") ? raw.split("|") : raw.split(",");
  return parts.map(t => t.trim()).filter(Boolean);
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
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // expects headers in row 1
  } else if (name.endsWith(".csv")) {
    // Simple CSV support (still ok if your CSV is clean/quoted properly in Excel)
    const text = buf.toString("utf8");
    // Use XLSX to parse CSV safely too:
    const wb = XLSX.read(text, { type: "string" });
    const sheetName = wb.SheetNames[0];
    rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
  } else {
    return NextResponse.json({ ok: false, error: "Unsupported file type. Upload .xlsx or .csv" }, { status: 400 });
  }

  // Expect columns (case-insensitive):
  // title, artist, explicit, tags, artworkUrl
  const normalized = rows
    .map((r) => {
      const title = r.title ?? r.Title ?? r.TITLE ?? "";
      const artist = r.artist ?? r.Artist ?? r.ARTIST ?? "";
      const explicit = r.explicit ?? r.Explicit ?? r.EXPLICIT ?? false;
      const tags = r.tags ?? r.Tags ?? r.TAGS ?? "";
      const artworkUrl = r.artworkUrl ?? r.artworkURL ?? r.ArtworkUrl ?? r.artwork ?? "";

      return {
        title: String(title).trim(),
        artist: String(artist).trim(),
        explicit: toBool(explicit),
        tags: toTags(tags),
        artworkUrl: String(artworkUrl).trim() || undefined,
      };
    })
    .filter((r) => r.title && r.artist);

  if (!normalized.length) {
    return NextResponse.json({ ok: false, error: "No valid rows found. Make sure columns include title and artist." }, { status: 400 });
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
        artworkUrl: r.artworkUrl,
      })),
    });

    created += batch.length;
  }

  return NextResponse.json({ ok: true, created });
}