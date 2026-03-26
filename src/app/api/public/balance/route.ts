// src/app/api/public/balance/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCreditBalance, isGuestSessionActive } from "@/lib/validators";

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

    const ident = await prisma.identity.findFirst({
      where: { id: identityId, locationId: loc.id },
      select: {
        emailHash: true,
        sessionStartedAt: true,
        sessionExpiresAt: true,
        smsVerifiedAt: true,
      },
    });

    if (!ident?.emailHash) {
      return NextResponse.json(
        { ok: false, error: "Unknown identity." },
        { status: 404 }
      );
    }

    const now = new Date();
    const sessionActive = isGuestSessionActive(ident, now);
    const balance = sessionActive ? await getCreditBalance(loc.id, ident.emailHash, now) : 0;

    return NextResponse.json(
      {
        ok: true,
        balance,
        sessionActive,
        sessionStartedAt: ident.sessionStartedAt,
        sessionExpiresAt: ident.sessionExpiresAt,
      },
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
