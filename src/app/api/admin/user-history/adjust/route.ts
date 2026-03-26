import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/admin/user-history/adjust
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      locationId,
      emailHash,
      targetBalance,
      reason,
    } = body;

    if (
      !locationId ||
      !emailHash ||
      typeof targetBalance !== "number" ||
      !reason
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get current balance
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

    // Compute delta
    const delta = targetBalance - currentBalance;

    if (delta === 0) {
      return NextResponse.json({
        success: true,
        message: "No change needed",
      });
    }

    // Insert ledger entry (SAFE — no mutation of existing data)
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