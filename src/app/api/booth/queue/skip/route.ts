// src/app/api/booth/queue/skip/route.ts


import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { removeRequestFromTop10 } from "@/lib/top10";
import { parseInterstitialAssetId } from "@/lib/booth/runtime-queue";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { queueItemId } = await req.json();

  if (!queueItemId) {
    return NextResponse.json(
      { ok: false, error: "Missing queueItemId" },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      const item = await tx.queueItem.findUnique({
        where: { id: queueItemId },
        include: {
          request: {
            include: {
              location: { select: { slug: true } },
            },
          },
        },
      });

      if (!item) {
        throw new Error("NOT_FOUND");
      }

      await tx.queueItem.update({
        where: { id: queueItemId },
        data: {
          status: "SKIPPED",
          completedAt: now,
          expectedEndAt: null,
        },
      });

      await tx.playbackEvent.create({
        data: {
          locationId: item.locationId,
          queueItemId: item.id,
          type: "SKIPPED",
          metadata: {
            queueItemId: item.id,
            requestId: item.requestId,
            source: "booth_skip",
            sourceType: item.sourceType,
            clusterId: item.clusterId ?? null,
            durationSec: item.durationSec,
            startedAt: item.playingAt?.toISOString() ?? null,
            completedAt: now.toISOString(),
          },
        },
      });

      if (item.sourceType === "INTERSTITIAL") {
        const assetId = parseInterstitialAssetId(item.clusterId);

        if (assetId) {
          await tx.interstitialEvent.updateMany({
            where: {
              locationId: item.locationId,
              sessionId: item.sessionId,
              assetId,
              status: "PLANNED",
            },
            data: {
              status: "SKIPPED",
            },
          });
        }

        return;
      }

      if (item.request) {
        if (
          item.request.status !== "REJECTED" &&
          item.request.status !== "PLAYED"
        ) {
          const { rules } = await getRulesForLocation(item.request.location.slug);
          const refund =
            item.request.type === "PLAY_NOW"
              ? rules.costPlayNow
              : rules.costRequest;

          await tx.request.update({
            where: { id: item.request.id },
            data: {
              status: "REJECTED",
              rejectedAt: now,
              rejectReason: "Booth skip",
            },
          });

          if (item.request.top10Bucket) {
            await removeRequestFromTop10(tx, {
              locationId: item.request.locationId,
              sessionId: item.request.sessionId,
              songId: item.request.songId,
              bucket: item.request.top10Bucket,
            });
          }

          if (refund > 0) {
            const activeSession = await tx.session.findFirst({
              where: {
                locationId: item.request.locationId,
                endsAt: { gt: now },
              },
              select: { endsAt: true },
              orderBy: { createdAt: "desc" },
            });

            await tx.creditLedger.create({
              data: {
                locationId: item.request.locationId,
                emailHash: item.request.emailHash ?? "system",
                delta: refund,
                reason: "BOOTH_SKIP_REFUND",
                expiresAt: activeSession?.endsAt ?? null,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "Queue item not found" },
        { status: 404 }
      );
    }

    console.error("booth skip error", error);
    return NextResponse.json(
      { ok: false, error: "Could not skip queue item." },
      { status: 500 }
    );
  }
}
