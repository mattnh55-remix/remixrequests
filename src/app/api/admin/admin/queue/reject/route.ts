import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { removeRequestFromTop10 } from "@/lib/top10";

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

    await prisma.$transaction(async (tx) => {
      const now = new Date();

      const r = await tx.request.findUnique({
        where: { id: requestId },
        include: {
          location: { select: { slug: true } },
          queueItem: true,
        },
      });

      if (!r) throw new Error("NOT_FOUND");
      if (r.status === "REJECTED") throw new Error("ALREADY_REJECTED");
      if (r.status === "PLAYED") throw new Error("CANNOT_REJECT_PLAYED");

      const { rules } = await getRulesForLocation(r.location.slug);
      const refund = r.type === "PLAY_NOW" ? rules.costPlayNow : rules.costRequest;

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
        sessionId: r.sessionId,
        songId: r.songId,
        bucket: r.top10Bucket,
      });

      if (refund > 0) {
        const activeSession = await tx.session.findFirst({
          where: {
            locationId: r.locationId,
            endsAt: { gt: now },
          },
          select: { endsAt: true },
          orderBy: { createdAt: "desc" },
        });

        await tx.creditLedger.create({
          data: {
            locationId: r.locationId,
            emailHash: r.emailHash,
            delta: refund,
            reason: "ADMIN_REJECT_REFUND",
            expiresAt: activeSession?.endsAt ?? null,
          },
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