import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRulesForLocation } from "@/lib/rules";
import { isAdminFromCookie } from "@/lib/adminAuth";
import * as XLSX from "xlsx";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function parseOptionalDate(v: any): Date | null {
  if (!v) return null;

  // If Excel date comes as number, XLSX often provides it as a number serial.
  // But sheet_to_json with defval usually gives strings; still handle number just in case.
  if (typeof v === "number") {
    // XLSX.SSF.parse_date_code expects an Excel serial
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const dt = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, Math.floor(d.S || 0)));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const dt = new Date(String(v));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export async function POST(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie") || "")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);

  const form = await req.formData().catch(() => null);
  if (!form) return jsonFail("Missing form data.");

  const file = form.get("file");
  if (!(file instanceof File)) return jsonFail("Missing file.");

  const buf = Buffer.from(await file.arrayBuffer());

  let rows: Record<string, any>[] = [];
  try {
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  } catch (e) {
    return jsonFail("Could not read spreadsheet. Please upload XLSX or CSV.", 400);
  }

  // Expected columns:
  // - code (required)
  // - points (required)
  // - maxUses (optional, default 1)
  //
  // Optional columns (supported but not required):
  // - redeemWindowMinutes (optional, default 150)
  // - expiresAt (optional; if provided, code itself expires at this date)
  let created = 0;
  let skipped = 0;

  for (const r of rows) {
    const code = String(r.code ?? r.Code ?? r.CODE ?? "").trim().toUpperCase();
    const points = Number(r.points ?? r.Points ?? r.POINTS ?? 0);
    const maxUsesRaw = Number(r.maxUses ?? r.MaxUses ?? r.max_uses ?? r.MAX_USES ?? 1);
    const redeemWindowRaw = Number(
      r.redeemWindowMinutes ?? r.RedeemWindowMinutes ?? r.redeem_window_minutes ?? r.REDEEM_WINDOW_MINUTES ?? 150
    );
    const expiresAtRaw = parseOptionalDate(r.expiresAt ?? r.ExpiresAt ?? r.EXPIRES_AT ?? "");

    if (!code || !Number.isFinite(points) || points <= 0) {
      skipped++;
      continue;
    }

    const maxUses = Number.isFinite(maxUsesRaw) && maxUsesRaw >= 1 ? Math.floor(maxUsesRaw) : 1;
    const redeemWindowMinutes =
      Number.isFinite(redeemWindowRaw) && redeemWindowRaw >= 1 ? Math.floor(redeemWindowRaw) : 150;

    try {
      await prisma.redemptionCode.create({
        data: {
          locationId: loc.id,
          code,
          points: Math.floor(points),
          maxUses,
          uses: 0,
          expiresAt: expiresAtRaw,
          redeemWindowMinutes,
          source: "import"
        }
      });
      created++;
    } catch {
      // Likely unique constraint (duplicate code) or other validation
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, created, skipped });
}