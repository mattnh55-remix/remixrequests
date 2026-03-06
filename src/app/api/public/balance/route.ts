// src/app/api/public/balance/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationSlug = (searchParams.get("location") || "").trim();
    const identityId = (searchParams.get("identityId") || "").trim();

    if (!locationSlug || !identityId) {
      return NextResponse.json(
        { ok: false, error: "Missing location or identityId." },
        { status: 400 }
      );
    }

    const loc = await prisma.location.findUnique({
      where: { slug: locationSlug },
      select: { id: true },
    });

    if (!loc) {
      return NextResponse.json(
        { ok: false, error: "Unknown location." },
        { status: 404 }
      );
    }

    const ident = await prisma.identity.findUnique({
      where: { id: identityId },
      select: { emailHash: true },
    });

    if (!ident?.emailHash) {
      return NextResponse.json(
        { ok: false, error: "Unknown identity." },
        { status: 404 }
      );
    }

    const now = new Date();

    const agg = await prisma.creditLedger.aggregate({
      where: {
        locationId: loc.id,
        emailHash: ident.emailHash,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
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
    return NextResponse.json(
      { ok: false, error: "Internal error." },
      { status: 500 }
    );
  }
}