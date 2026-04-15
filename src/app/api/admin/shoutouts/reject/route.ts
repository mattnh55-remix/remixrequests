// src/app/api/admin/shoutouts/reject/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { sendShoutoutRejectedSms } from "@/lib/shoutout-status-sms";

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

    // Initial check to see if we even need to run a transaction
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

    // Atomic transaction for Refund + Status Update
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

      if (!fresh) throw new Error("MESSAGE_NOT_FOUND");

      // If already has a refund ID, just update status and move on
      if (fresh.refundLedgerId) {
        await tx.screenMessage.update({
          where: { id: fresh.id },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
            moderationNotes: note,
          },
        });

        return {
          refundLedgerId: fresh.refundLedgerId,
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
            endsAt: { gt: new Date() }, 
          },
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
        });

        refundLedgerId = refund.id;
      }

      await tx.screenMessage.update({
        where: { id: fresh.id },
        data: {
          status: "REJECTED",
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

    // Post-transaction: Get new balance and send SMS
    const balanceAgg = await prisma.creditLedger.aggregate({
      _sum: { delta: true },
      where: {
        locationId: message.locationId,
        emailHash: message.emailHash,
      },
    });

    const smsResult = await sendShoutoutRejectedSms({
      locationId: message.locationId,
      emailHash: message.emailHash,
      reason: note,
      refunded: result.refundAmount > 0,
    });

    return NextResponse.json({
      ok: true,
      refunded: result.refundAmount > 0,
      alreadyRefunded: result.alreadyRefunded,
      refundAmount: result.refundAmount,
      balance: Math.max(Number(balanceAgg._sum.delta || 0), 0),
      texted: Boolean(smsResult?.ok),
      smsSkipped: Boolean((smsResult as any)?.skipped),
    });

  } catch (err: any) {
    console.error("[admin/shoutouts/reject] error:", err?.message || err);
    // Specific error message for the transaction failure
    if (err.message === "MESSAGE_NOT_FOUND") return fail("Message disappeared", 404);
    return fail("Could not reject message", 500);
  }
}