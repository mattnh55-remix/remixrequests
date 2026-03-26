import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/user-history/detail?locationId=xxx&emailHash=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const emailHash = searchParams.get("emailHash");

    if (!locationId || !emailHash) {
      return NextResponse.json(
        { error: "Missing locationId or emailHash" },
        { status: 400 }
      );
    }

    // Get ledger entries (latest first)
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

    // Calculate balance
    const balanceAgg = await prisma.creditLedger.aggregate({
      where: {
        locationId,
        emailHash,
      },
      _sum: {
        delta: true,
      },
    });

    const balance = balanceAgg._sum.delta ?? 0;

    // Get latest activity timestamp
    const latest = ledger[0]?.createdAt ?? null;

    return NextResponse.json({
      success: true,
      balance,
      latestActivity: latest,
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