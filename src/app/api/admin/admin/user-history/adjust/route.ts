// src/app/api/admin/user-history/adjust/route.ts

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

// POST /api/admin/user-history/adjust
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      location,
      emailHash,
      targetBalance,
      reason,
    } = body;

    if (
      !location ||
      !emailHash ||
      typeof targetBalance !== "number" ||
      !reason
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    const agg = await prisma.creditLedger.aggregate({
      where: {
        locationId,
        emailHash,
      },
      _sum: {
        delta: true,
      },
    });

    const currentBalance = agg._sum.delta ?? 0;
    const delta = targetBalance - currentBalance;

    if (delta === 0) {
      return NextResponse.json({
        success: true,
        delta: 0,
        newBalance: currentBalance,
      });
    }

    await prisma.creditLedger.create({
      data: {
        locationId,
        emailHash,
        delta,
        reason: `ADMIN_SET_BALANCE:${reason}`,
      },
    });

    return NextResponse.json({
      success: true,
      delta,
      newBalance: targetBalance,
    });
  } catch (err) {
    console.error("user-history adjust error", err);
    return NextResponse.json(
      { error: "Failed to adjust balance" },
      { status: 500 }
    );
  }
}