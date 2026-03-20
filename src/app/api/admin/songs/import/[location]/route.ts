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
  return parts.map((t) => t.trim()).filter(Boolean);
}

function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map((v) => String(v ?? "").trim().toLowerCase());
    if (row.includes("title") && row.includes("artist")) {
      return i;
    }
  }

  return 0;
}

function getRowsFromWorkbook(buf: Buffer, fileName: string) {
  if (fileName.endsWith(".xlsx")) {
    const wb = XLSX.read(buf, { type: "buffer" });

    const preferredSheetName =
      wb.SheetNames.find((n) => n === "Production_Import_Template") ||
      wb.SheetNames.find((n) => n.toLowerCase() === "production_import_template") ||
      wb.SheetNames[0];

    const sheet = wb.Sheets[preferredSheetName];
    const headerRow = findHeaderRow(sheet);

    return XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      range: headerRow,
    });
  }

  if (fileName.endsWith(".csv")) {
    const text = buf.toString("utf8");
    const wb = XLSX.read(text, { type: "string" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const headerRow = findHeaderRow(sheet);

    return XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      range: headerRow,
    });
  }

  throw new Error("UNSUPPORTED_FILE");
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

  try {
    rows = getRowsFromWorkbook(buf, name);
  } catch (e: any) {
    if (String(e?.message) === "UNSUPPORTED_FILE") {
      return NextResponse.json({ ok: false, error: "Upload .xlsx or .csv" }, { status: 400 });
    }
    throw e;
  }

  const normalized = rows
    .map((r) => {
      const title = r.title ?? r.Title ?? r.TITLE ?? "";
      const artist = r.artist ?? r.Artist ?? r.ARTIST ?? "";
      const explicit = r.explicit ?? r.Explicit ?? r.EXPLICIT ?? false;
      const tags = r.tags ?? r.Tags ?? r.TAGS ?? "";
      const active = r.active ?? r.Active ?? r.ACTIVE ?? true;
      const artworkUrl =
        r.artworkUrl ??
        r.artworkURL ??
        r.ArtworkUrl ??
        r.albumArtFile ??
        r.albumArt ??
        "";

      const rowLocationSlug =
        String(r.locationSlug ?? r.LocationSlug ?? r.LOCATIONSLUG ?? "").trim();

      return {
        title: String(title).trim(),
        artist: String(artist).trim(),
        explicit: toBool(explicit, false),
        active: toBool(active, true),
        tags: toTags(tags),
        artworkUrl: String(artworkUrl).trim() || undefined,
        locationSlug: rowLocationSlug,
      };
    })
    .filter((r) => r.title && r.artist && r.active)
    .filter((r) => !r.locationSlug || r.locationSlug === params.location);

if (!normalized.length) {
  return NextResponse.json(
    {
      ok: false,
      error: "IMPORT_DEBUG_V3_NO_VALID_ROWS",
      routeVersion: "songs-import-v3",
    },
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
        artworkUrl: r.artworkUrl,
      })),
    });

    created += batch.length;
  }

  return NextResponse.json({ ok: true, created });
}