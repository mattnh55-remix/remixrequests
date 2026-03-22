import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRuntimeProgress } from "@/lib/booth/queue-runtime";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function parseInterstitialAssetId(clusterId: string | null | undefined) {
  if (!clusterId) return null;

  const prefix = "interstitial:";
  if (!clusterId.startsWith(prefix)) return null;

  const assetId = clusterId.slice(prefix.length).trim();
  return assetId || null;
}

export async function GET(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const locationSlug = String(params.location || "").trim();
    if (!locationSlug) {
      return NextResponse.json({ ok: false, error: "Missing location." }, { status: 400 });
    }

    const { loc } = await getRulesForLocation(locationSlug);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const items = await prisma.queueItem.findMany({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: {
          in: ["QUEUED", "LOADED", "PLAYING", "HELD", "PLAYED", "SKIPPED"],
        },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        request: {
          include: {
            song: {
              select: {
                id: true,
                title: true,
                artist: true,
                artworkUrl: true,
                explicit: true,
                durationSec: true,
              },
            },
          },
        },
      },
    });

    const assetIds = Array.from(
      new Set(
        items
          .map((item) => parseInterstitialAssetId(item.clusterId))
          .filter((value): value is string => Boolean(value))
      )
    );

    const assets = assetIds.length
      ? await prisma.interstitialAsset.findMany({
          where: {
            locationId: loc.id,
            id: { in: assetIds },
          },
          select: {
            id: true,
            name: true,
            category: true,
            fileUrl: true,
            durationSec: true,
          },
        })
      : [];

    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const now = new Date();

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      items: items.map((item) => {
        const assetId = parseInterstitialAssetId(item.clusterId);
        const asset = assetId ? assetMap.get(assetId) ?? null : null;

        const durationSec =
          item.durationSec ?? asset?.durationSec ?? item.request?.song?.durationSec ?? null;

        const runtime = getRuntimeProgress({
          now,
          playingAt: item.playingAt,
          durationSec,
          expectedEndAt: item.expectedEndAt,
        });

        const title =
          item.sourceType === "INTERSTITIAL"
            ? asset?.name ?? "Interstitial"
            : item.request?.song?.title ?? null;

        const artist =
          item.sourceType === "INTERSTITIAL"
            ? asset?.category?.replaceAll("_", " ") ?? "System insert"
            : item.request?.song?.artist ?? null;

        return {
          id: item.id,
          requestId: item.requestId,
          position: item.position,
          status: item.status,
          sourceType: item.sourceType,
          itemType: item.sourceType === "INTERSTITIAL" ? "INTERSTITIAL" : "SONG",
          introAssigned: item.introAssigned,
          clusterId: item.clusterId,
          loadedAt: toIso(item.loadedAt),
          playingAt: toIso(item.playingAt),
          startedAt: runtime.startedAt,
          expectedEndAt: runtime.expectedEndAt,
          completedAt: toIso(item.completedAt),
          createdAt: toIso(item.createdAt),
          durationSec,
          elapsedSec: runtime.elapsedSec,
          remainingSec: runtime.remainingSec,
          progressPercent: runtime.progressPercent,
          isEndingSoon: runtime.isEndingSoon,
          title,
          artist,
          artworkUrl: item.request?.song?.artworkUrl ?? null,
          explicit: item.request?.song?.explicit ?? null,
        };
      }),
    });
  } catch (error) {
    console.error("booth queue get error", error);
    return NextResponse.json(
      { ok: false, error: "Could not load booth queue." },
      { status: 500 }
    );
  }
}
