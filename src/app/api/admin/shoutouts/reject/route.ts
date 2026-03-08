import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messageId = String(body.messageId || "").trim();
    const note = String(body.note || "").trim();

    if (!messageId) return jsonFail("Missing messageId.", 400);

    const msg = await prisma.screenMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        locationId: true,
        emailHash: true,
        creditsCost: true,
        status: true,
        refundLedgerId: true,
      },
    });

    if (!msg) return jsonFail("Message not found.", 404);

    if (msg.status !== "PENDING") {
      return jsonFail("Only pending messages can be rejected.", 400);
    }

    const result = await prisma.$transaction(
      async (tx) => {
        let refundLedgerId: string | null = null;

        if ((msg.creditsCost ?? 0) > 0 && !msg.refundLedgerId) {
          const refund = await tx.creditLedger.create({
            data: {
              locationId: msg.locationId,
              emailHash: msg.emailHash,
              delta: msg.creditsCost,
              reason: "SHOUT_REFUND_REJECTED",
            },
            select: { id: true },
          });

          refundLedgerId = refund.id;
        }

        await tx.screenMessage.update({
          where: { id: messageId },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
            moderationNotes: note || null,
            refundLedgerId,
          },
        });

        return { refundLedgerId };
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({
      ok: true,
      refunded: Boolean(result.refundLedgerId),
    });
  } catch (err: any) {
    console.error("[admin/shoutouts/reject] error:", err?.message || err);
    return jsonFail("Internal error.", 500);
  }
}