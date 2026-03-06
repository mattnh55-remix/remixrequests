import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const requestId = String(body.requestId || "");
  const reason = String(body.reason || "Rejected");

  const r = await prisma.request.findUnique({
    where: { id: requestId }
  });

  if (!r) return NextResponse.json({ ok: false }, { status: 404 });

  // load rules so we know refund amounts
  const { rules } = await getRulesForLocation(r.locationId);

  // determine refund
  let refund = 0;

  if (r.type === "PLAY_NOW") {
    refund = rules.costPlayNow;
  } else {
    refund = rules.costRequest;
  }

  await prisma.$transaction(async (tx) => {
    // mark rejected
    await tx.request.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectReason: reason
      }
    });

    // refund credits
    if (refund > 0) {
      await tx.creditLedger.create({
        data: {
          locationId: r.locationId,
          emailHash: r.emailHash,
          delta: refund,
          reason: "ADMIN_REJECT_REFUND"
        }
      });
    }
  });

  return NextResponse.json({ ok: true });
}