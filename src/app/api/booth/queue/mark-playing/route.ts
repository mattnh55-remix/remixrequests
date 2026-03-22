import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { parseInterstitialAssetId } from "@/lib/booth/runtime-queue";

function computeExpectedEndAt(startedAt: Date, durationSec: number | null) {
  if (!durationSec || durationSec <= 0) return null;
  return new Date(startedAt.getTime() + durationSec * 1000);
}

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const queueItemId = String(body.queueItemId || "").trim();

    if (!queueItemId) {
      return NextResponse.json(
        { ok: false, error: "Missing queueItemId." },
        { status: 400 }
      );
    }

    const item = await prisma.queueItem.findUnique({
      where: { id: queueItemId },
      include: {
        request: {
          include: {
            song: {
              select: {
                durationSec: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Queue item not found." },
        { status: 404 }
      );
    }

    const assetId =
      item.sourceType === "INTERSTITIAL"
        ? parseInterstitialAssetId(item.clusterId)
        : null;

    const asset =
      item.sourceType === "INTERSTITIAL" && assetId
        ? await prisma.interstitialAsset.findUnique({
            where: { id: assetId },
            select: {
              id: true,
              durationSec: true,
            },
          })
        : null;

    const durationSec =
      item.sourceType === "INTERSTITIAL"
        ? (asset?.durationSec ?? item.durationSec ?? null)
        : (item.durationSec ?? item.request?.song?.durationSec ?? null);

    const startedAt = new Date();
    const expectedEndAt = computeExpectedEndAt(startedAt, durationSec);

await prisma.$transaction([
  prisma.queueItem.update({
    where: { id: item.id },
    data: {
      status: "PLAYING",
      loadedAt: item.loadedAt ?? startedAt,
      playingAt: startedAt,
      durationSec,
      expectedEndAt,
      completedAt: null,
    },
  }),

  prisma.playbackEvent.create({
    data: {
      locationId: item.locationId,
      queueItemId: item.id,
      type: "PLAYING",
      metadata: {
        sourceType: item.sourceType,
        clusterId: item.clusterId ?? null,
        durationSec,
        expectedEndAt: expectedEndAt?.toISOString() ?? null,
        interstitialAssetId: asset?.id ?? null,
        sessionId: item.sessionId,
      },
    },
  }),

  ...(item.sourceType === "INTERSTITIAL" && assetId
    ? [
        prisma.interstitialEvent.updateMany({
          where: {
            locationId: item.locationId,
            sessionId: item.sessionId,
            assetId,
            status: "PLANNED",
          },
          data: {
            status: "PLAYED",
            playedAt: startedAt,
          },
        }),
      ]
    : []),
]);



    return NextResponse.json({
      ok: true,
      queueItemId: item.id,
      sourceType: item.sourceType,
      durationSec,
      expectedEndAt: expectedEndAt?.toISOString() ?? null,
      interstitialTracked: item.sourceType === "INTERSTITIAL",
    });
  } catch (error) {
    console.error("mark-playing error", error);

    return NextResponse.json(
      { ok: false, error: "Could not mark item playing." },
      { status: 500 }
    );
  }
}