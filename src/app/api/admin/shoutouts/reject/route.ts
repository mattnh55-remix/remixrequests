import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromCookie } from "@/lib/adminAuth";

export const runtime = "nodejs";

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req)) return fail("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const messageId = String(body?.messageId || "").trim();
    const note = String(body?.note || body?.reason || "Rejected from dashboard").trim();

    if (!messageId) return fail("messageId is required");

    const existing = await prisma.screenMessage.findUnique({ where: { id: messageId } });
    if (!existing) return fail("Message not found", 404);

    if (existing.status === "REJECTED") {
      return NextResponse.json({
        ok: true,
        alreadyDone: true,
        messageId: existing.id,
        refundLedgerId: existing.refundLedgerId || null,
      });
    }

    if (!["PENDING", "APPROVED"].includes(existing.status)) {
      return fail(`Only pending or approved shout-outs can be rejected. Current status: ${existing.status}`);
    }

    const rules = await prisma.messageRuleset.findUnique({
      where: { locationId: existing.locationId },
      select: { autoRefundRejected: true },
    });
    const shouldRefund = Boolean(rules?.autoRefundRejected ?? true) && existing.creditsCost > 0;

    const result = await prisma.$transaction(async (tx) => {
      let refundLedgerId = existing.refundLedgerId || null;

      if (shouldRefund && !refundLedgerId) {
        const refundLedger = await tx.creditLedger.create({
          data: {
            locationId: existing.locationId,
            emailHash: existing.emailHash,
            delta: existing.creditsCost,
            reason: `SHOUT_REFUND_${existing.tier}`,
          },
        });
        refundLedgerId = refundLedger.id;
      }

      const updated = await tx.screenMessage.update({
        where: { id: existing.id },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          approvedAt: null,
          rejectedBy: "admin",
          moderationNotes: note || existing.moderationNotes || null,
          refundLedgerId,
        },
      });

      return { updated, refundLedgerId };
    });

    return NextResponse.json({
      ok: true,
      messageId: result.updated.id,
      status: result.updated.status,
      refundLedgerId: result.refundLedgerId,
      refunded: Boolean(result.refundLedgerId),
    });
  } catch (err: any) {
    console.error("[admin/shoutouts/reject] error:", err?.message || err);
    return fail("Something went wrong", 500);
  }
}
