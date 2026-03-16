// /src/app/api/admin/queue/reject/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";

export async function POST(req: Request) {
  // 1. Auth Check
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const requestId = body.requestId;
    const reason = body.reason || "Rejected";

    if (!requestId) {
      return NextResponse.json({ ok: false, error: "Missing requestId" }, { status: 400 });
    }

    // 2. Execute Transaction
    await prisma.$transaction(async (tx) => {
      const r = await tx.request.findUnique({
        where: { id: requestId }
      });

      if (!r) throw new Error("NOT_FOUND");
      
      if (r.status === "REJECTED") throw new Error("ALREADY_REJECTED");
      if (r.status === "PLAYED") throw new Error("CANNOT_REJECT_PLAYED");

      const { rules } = await getRulesForLocation(r.locationId);
      const refund = r.type === "PLAY_NOW" ? rules.costPlayNow : rules.costRequest;

      // Mark as Rejected
      await tx.request.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectReason: reason
        }
      });

      // Handle Ledger Entry
      if (refund > 0) {
        const activeSession = await tx.session.findFirst({
          where: { 
            locationId: r.locationId, 
            endsAt: { gt: new Date() } 
          },
          select: { endsAt: true },
          orderBy: { createdAt: "desc" }
        });

        await tx.creditLedger.create({
          data: {
            locationId: r.locationId,
            emailHash: r.emailHash,
            delta: refund,
            reason: "ADMIN_REJECT_REFUND",
            expiresAt: activeSession?.endsAt ?? null
          }
        });
      }
    });

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }
    
    if (["ALREADY_REJECTED", "CANNOT_REJECT_PLAYED"].includes(error.message)) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    console.error("Rejection Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}