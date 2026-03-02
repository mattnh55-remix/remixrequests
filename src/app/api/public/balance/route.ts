// src/app/api/public/balance/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const location = (searchParams.get("location") || "").trim();
    const identityId = (searchParams.get("identityId") || "").trim();

    if (!location || !identityId) {
      return NextResponse.json(
        { ok: false, error: "Missing location or identityId." },
        { status: 400 }
      );
    }

    // Read-only aggregation from CreditLedger
    // NOTE: If your ledger uses a different numeric field name (ex: "amount" or "credits"),
    // change `_sum: { delta: true }` and the returned property accordingly.
    const agg = await prisma.creditLedger.aggregate({
      where: { location, identityId },
      _sum: { delta: true }
    });

    const balance = Number(agg._sum.delta || 0);

    return NextResponse.json(
      { ok: true, balance },
      {
        status: 200,
        headers: {
          "cache-control": "no-store, max-age=0"
        }
      }
    );
  } catch (err: any) {
    console.error("[balance] error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: "Internal error." },
      { status: 500 }
    );
  }
}