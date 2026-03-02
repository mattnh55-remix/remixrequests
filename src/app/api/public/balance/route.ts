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

    /**
     * Prisma schema note:
     * Your error indicates CreditLedger.location is NOT a string field.
     * It’s likely a relation to Location.
     *
     * We therefore filter in a way that works for relation-based schemas:
     *   where: { location: { slug: location } }
     *
     * If your schema instead uses locationId, switch the filter to:
     *   where: { locationId: location }
     */

    const agg = await prisma.creditLedger.aggregate({
      where: {
        identityId,
        // ✅ Relation-based filter (most likely in your schema)
        location: {
          // If your Location model uses `slug`, this is correct.
          // If it uses `id`, change `slug` -> `id`.
          slug: location,
        },
      },
      _sum: { delta: true },
    });

    const balance = Number(agg._sum.delta || 0);

    return NextResponse.json(
      { ok: true, balance },
      {
        status: 200,
        headers: { "cache-control": "no-store, max-age=0" },
      }
    );
  } catch (err: any) {
    console.error("[balance] error:", err?.message || err);
    return NextResponse.json({ ok: false, error: "Internal error." }, { status: 500 });
  }
}