import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { removeRequestFromTop10 } from "@/lib/top10";
import { sendRequestRejectedSms } from "@/lib/request-status-sms";

const REFUND_WINDOW_MINUTES = 60;

function minutesSince(from: Date, to: Date) {
  return (to.getTime() - from.getTime()) / 60000;
}

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const requestId = String(body.requestId || "").trim();
    const reason = String(body.reason || "Rejected").trim();

    if (!requestId) {
      return NextResponse.json({ ok: false, error: "Missing requestId" }, { status: 400 });
    }

    const now = new Date();

    const r = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        location: { select: { slug: true } },
        queueItem: true,
      },
    });

    if (!r) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }

    if (r.status === "PLAYED") {
      return NextResponse.json({ ok: false, error: "CANNOT_REJECT_PLAYED" }, { status: 400 });
    }

    const { rules } = await getRulesForLocation(r.location.slug);
    const refundAmount = r.type === "PLAY_NOW" ? rules.costPlayNow : rules.costRequest;

    const refundWindowOpen = minutesSince(r.createdAt, now) <= REFUND_WINDOW_MINUTES;
    const refundEligible = refundAmount > 0 && refundWindowOpen;
    const refundReason = `RJRF:${r.id}`;

    if (r.status !== "REJECTED") {
      await prisma.$transaction(async (tx) => {
        await tx.request.update({
          where: { id: requestId },
          data: {
            status: "REJECTED",
            rejectedAt: now,
            rejectReason: reason,
          },
        });

        if (r.queueItem) {
          await tx.queueItem.update({
            where: { id: r.queueItem.id },
            data: {
              status: "SKIPPED",
              completedAt: now,
            },
          });

          await tx.playbackEvent.create({
            data: {
              locationId: r.locationId,
              queueItemId: r.queueItem.id,
              type: "SKIPPED",
              metadata: {
                requestId: r.id,
                songId: r.songId,
                reason,
                source: "admin_reject",
              },
            },
          });
        }

        await removeRequestFromTop10(tx, {
          locationId: r.locationId,
          songId: r.songId,
          bucket: r.top10Bucket,
        });
      });
    }

    let refunded = false;

    if (refundEligible) {
      const existingRefund = await prisma.creditLedger.findFirst({
        where: {
          locationId: r.locationId,
          emailHash: r.emailHash,
          reason: refundReason,
        },
        select: { id: true },
      });

      if (!existingRefund) {
        const activeSession = await prisma.session.findFirst({
          where: {
            locationId: r.locationId,
            endsAt: { gt: now },
          },
          select: { endsAt: true },
          orderBy: { createdAt: "desc" },
        });

        await prisma.creditLedger.create({
          data: {
            locationId: r.locationId,
            emailHash: r.emailHash,
            delta: refundAmount,
            reason: refundReason,
            expiresAt: activeSession?.endsAt ?? null,
          },
        });

        refunded = true;
      }
    }

    const smsResult = await sendRequestRejectedSms({
      locationId: r.locationId,
      emailHash: r.emailHash,
      reason,
      refunded,
    });

    return NextResponse.json({
      ok: true,
      refunded,
      refundEligible,
      refundWindowMinutes: REFUND_WINDOW_MINUTES,
      texted: Boolean(smsResult?.ok),
      smsSkipped: Boolean((smsResult as any)?.skipped),
    });
  } catch (error) {
    console.error("Rejection Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
