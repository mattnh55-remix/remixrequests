// src/app/api/admin/user-history/detail/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function resolveLocationId(slug: string) {
  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true },
  });
  return location?.id || null;
}

// GET /api/admin/user-history/detail?location=xxx&emailHash=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");
    const emailHash = searchParams.get("emailHash");

    if (!location || !emailHash) {
      return NextResponse.json(
        { error: "Missing location or emailHash" },
        { status: 400 }
      );
    }

    const locationId = await resolveLocationId(location);
    if (!locationId) {
      return NextResponse.json(
        { error: "Location not found." },
        { status: 404 }
      );
    }

    const ledger = await prisma.creditLedger.findMany({
      where: {
        locationId,
        emailHash,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const balanceAgg = await prisma.creditLedger.aggregate({
      where: {
        locationId,
        emailHash,
      },
      _sum: {
        delta: true,
      },
    });

    const identity = await prisma.identity.findFirst({
      where: {
        locationId,
        emailHash,
      },
      select: {
        phoneE164: true,
        smsVerifiedAt: true,
      },
    });

    const balance = balanceAgg._sum.delta ?? 0;
    const latest = ledger[0]?.createdAt ?? null;

    return NextResponse.json({
      success: true,
      balance,
      latestActivity: latest,
      verified: Boolean(identity?.smsVerifiedAt),
      label: identity?.phoneE164
        ? `User • ${identity.phoneE164.slice(-4)}`
        : `User ${emailHash.slice(0, 8)}`,
      ledger,
    });
  } catch (err) {
    console.error("user-history detail error", err);
    return NextResponse.json(
      { error: "Failed to fetch user history" },
      { status: 500 }
    );
  }
}