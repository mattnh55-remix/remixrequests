import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

export const runtime = "nodejs";

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function maskEmailHash(input: string) {
  const s = String(input || "").trim();
  if (!s) return "Unknown user";
  if (s.length <= 12) return s;
  return `${s.slice(0, 8)}…${s.slice(-6)}`;
}

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie") || "")) {
      return fail("Unauthorized", 401);
    }

    const body = await req.json().catch(() => null);
    const id = String(body?.id || "").trim();
    if (!id) return fail("Missing id");

    const code = await prisma.redemptionCode.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        locationId: true,
      },
    });

    if (!code) return fail("Code not found", 404);

    const ledgerItems = await prisma.creditLedger.findMany({
      where: {
        locationId: code.locationId,
        OR: [
          { reason: `redeem:${code.code}` },
          { reason: `REDEEM:${code.code}` },
          { reason: `redeem:${code.code.toLowerCase()}` },
          { reason: `redeem:${code.code.toUpperCase()}` },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        emailHash: true,
        reason: true,
        delta: true,
        createdAt: true,
      },
    });

    const items = ledgerItems.map((item) => ({
      id: item.id,
      usedAt: item.createdAt,
      emailHash: item.emailHash,
      label: maskEmailHash(item.emailHash),
      reason: item.reason,
      delta: item.delta,
    }));

    return NextResponse.json({
      ok: true,
      code: code.code,
      items,
    });
  } catch (err: any) {
    console.error("[admin/redemption-codes/uses] error:", err?.message || err);
    return fail("Could not load code uses", 500);
  }
}
