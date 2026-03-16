// src/app/api/admin/shoutouts/reject/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie") || "")) {
      return fail("Unauthorized", 401);
    }

    const body = await req.json().catch(() => null);
    const messageId = String(body?.messageId || "").trim();
    const note = String(body?.note || "Rejected by admin").trim();

    if (!messageId) return fail("Missing messageId");

    const message = await prisma.screenMessage.findUnique({
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

    if (!message) return fail("Message not found", 404);

    if (message.status === "REJECTED") {
      return NextResponse.json({
        ok: true,
        alreadyRejected: true,
        alreadyRefunded: !!message.refundLedgerId,
        refundAmount: message.refundLedgerId ? Number(message.creditsCost || 0) : 0,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.screenMessage.findUnique({
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

      if (!fresh) {
        throw new Error("MESSAGE_NOT_FOUND");
      }

      if (fresh.refundLedgerId) {
        const updated = await tx.screenMessage.update({
          where: { id: fresh.id },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
            moderationNotes: note,
          },
          select: {
            id: true,
            refundLedgerId: true,
            creditsCost: true,
          },
        });

        return {
          refundLedgerId: updated.refundLedgerId,
          refundAmount: 0,
          alreadyRefunded: true,
        };
      }

      let refundLedgerId: string | null = null;
      const refundAmount = Number(fresh.creditsCost || 0);

if (refundAmount > 0) {
  const activeSession = await tx.session.findFirst({
    where: {
      locationId: fresh.locationId,
      isActive: true,
    },
    select: { endsAt: true },
    orderBy: { createdAt: "desc" },
  });

  const refund = await tx.creditLedger.create({
    data: {
      locationId: fresh.locationId,
      emailHash: fresh.emailHash,
      delta: refundAmount,
      reason: "REFUND",
      expiresAt: activeSession?.endsAt ?? null,
    },
    select: { id: true },
  });

  refundLedgerId = refund.id;
}

await tx.screenMessage.update({
  where: { id: fresh.id },
  data: {
    status: "rejected",
    rejectedAt: new Date(),
    moderationNotes: note,
    refundLedgerId,
  },
});
      return {
        refundLedgerId,
        refundAmount,
        alreadyRefunded: false,
      };
    });

    const balanceAgg = await prisma.creditLedger.aggregate({
      _sum: { delta: true },
      where: {
        locationId: message.locationId,
        emailHash: message.emailHash,
      },
    });

    return NextResponse.json({
      ok: true,
      refunded: result.refundAmount > 0,
      alreadyRefunded: result.alreadyRefunded,
      refundAmount: result.refundAmount,
      balance: Math.max(Number(balanceAgg._sum.delta || 0), 0),
    });
  } catch (err: any) {
    console.error("[admin/shoutouts/reject] error:", err?.message || err);
    return fail("Could not reject message", 500);
  }
}