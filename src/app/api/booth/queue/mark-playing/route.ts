import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { computeExpectedEndAt } from "@/lib/booth/queue-runtime";

function parseInterstitialAssetId(clusterId: string | null | undefined) {
  if (!clusterId) return null;

  const prefix = "interstitial:";
  if (!clusterId.startsWith(prefix)) return null;

  const assetId = clusterId.slice(prefix.length).trim();
  return assetId || null;
}

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
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

    const assetId = parseInterstitialAssetId(item.clusterId);
    const asset =
      item.sourceType === "INTERSTITIAL" && assetId
        ? await prisma.interstitialAsset.findUnique({
            where: { id: assetId },
            select: { durationSec: true },
          })
        : null;

    const durationSec =
      item.durationSec ?? asset?.durationSec ?? item.request?.song?.durationSec ?? null;

    const startedAt = new Date();
    const expectedEndAt = computeExpectedEndAt(startedAt, durationSec);

    await prisma.$transaction([
      prisma.queueItem.update({
        where: { id: queueItemId },
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
            durationSec,
            expectedEndAt: expectedEndAt?.toISOString() ?? null,
          },
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("mark-playing error", error);
    return NextResponse.json(
      { ok: false, error: "Could not mark item playing." },
      { status: 500 }
    );
  }
}
