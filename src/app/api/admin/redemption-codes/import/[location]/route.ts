import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { isAdminFromCookie } from "@/lib/adminAuth";
import * as XLSX from "xlsx";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);
  const session = await getOrCreateCurrentSession(loc.id, 4);
  const expiresAt = new Date(session.endsAt);

  const form = await req.formData().catch(() => null);
  if (!form) return jsonFail("Missing form data.");

  const file = form.get("file");
  if (!(file instanceof File)) return jsonFail("Missing file.");

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

  // Expected columns: code, points, maxUses(optional)
  let created = 0;
  let skipped = 0;

  // Create many with per-row upsert-like behavior
  for (const r of rows) {
    const code = String(r.code || r.Code || "").trim().toUpperCase();
    const points = Number(r.points || r.Points || 0);
    const maxUses = Number(r.maxUses || r.MaxUses || 1);

    if (!code || !Number.isFinite(points) || points <= 0) {
      skipped++;
      continue;
    }

    try {
      await prisma.redemptionCode.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          code,
          points,
          maxUses: Number.isFinite(maxUses) && maxUses >= 1 ? maxUses : 1,
          expiresAt,
          source: "import"
        }
      });
      created++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, sessionId: session.id, created, skipped });
}