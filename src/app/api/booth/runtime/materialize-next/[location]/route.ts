import { NextResponse } from "next/server";
import {
  InterstitialEventStatus,
  InterstitialScheduleMode,
  PlaybackEventType,
  Prisma,
  QueueItemStatus,
  QueueSourceType,
  SessionProfile,
} from "@prisma/client";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { computeNextPlaybackAction } from "@/lib/booth/compute-next-playback-action";
import { buildInterstitialClusterId } from "@/lib/booth/runtime-queue";
import { prisma } from "@/lib/prisma";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";

const ACTIVE_QUEUE_STATUSES: QueueItemStatus[] = [
  QueueItemStatus.QUEUED,
  QueueItemStatus.LOADED,
  QueueItemStatus.PLAYING,
  QueueItemStatus.HELD,
];

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeProfile(value: unknown): SessionProfile {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";

  switch (raw) {
    case SessionProfile.FAMILY:
      return SessionProfile.FAMILY;
    case SessionProfile.ADULT:
      return SessionProfile.ADULT;
    case SessionProfile.BIRTHDAY:
      return SessionProfile.BIRTHDAY;
    case SessionProfile.SCHOOL:
      return SessionProfile.SCHOOL;
    case SessionProfile.PRIVATE_EVENT:
      return SessionProfile.PRIVATE_EVENT;
    case SessionProfile.GENERAL:
    default:
      return SessionProfile.GENERAL;
  }
}

function isInterstitialAction(action: unknown): boolean {
  const actionType = String((action as any)?.action ?? "").toUpperCase();
  return actionType === "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM";
}

function extractAssetId(action: any): string | null {
  const candidates = [
    action?.assetId,
    action?.interstitialAssetId,
    action?.asset?.id,
    action?.interstitialAsset?.id,
    action?.payload?.assetId,
    action?.payload?.interstitialAssetId,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function extractTargetQueueItemId(action: any): string | null {
  const candidates = [
    action?.queueItemId,
    action?.targetQueueItemId,
    action?.beforeQueueItemId,
    action?.target?.queueItemId,
    action?.target?.id,
    action?.targetSongQueueItemId,
    action?.song?.queueItemId,
    action?.payload?.targetQueueItemId,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function extractDurationSec(
  action: any,
  asset: { durationSec: number | null }
): number | null {
  const candidates = [
    action?.durationSec,
    action?.asset?.durationSec,
    action?.interstitialAsset?.durationSec,
    action?.payload?.durationSec,
    asset.durationSec,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
  }

  return null;
}

async function normalizeActiveQueuePositions(
  tx: Prisma.TransactionClient,
  locationId: string,
  sessionId: string
) {
  const activeItems = await tx.queueItem.findMany({
    where: {
      locationId,
      sessionId,
      status: { in: ACTIVE_QUEUE_STATUSES },
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  await Promise.all(
    activeItems.map((item, index) =>
      tx.queueItem.update({
        where: { id: item.id },
        data: { position: index + 1 },
      })
    )
  );

  return activeItems.length;
}

export async function POST(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return jsonFail("Unauthorized.", 401);
  }

  try {
    const locationSlug = String(params.location || "").trim();

    if (!locationSlug) {
      return jsonFail("Missing location.");
    }

    const { loc } = await getRulesForLocation(locationSlug);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const body = await req.json().catch(() => ({}));
    const profile = normalizeProfile(body?.profile);

    const [queueItemsRaw, assetsRaw, recentEventsRaw] = await Promise.all([
      prisma.queueItem.findMany({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: { in: ACTIVE_QUEUE_STATUSES },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          status: true,
          position: true,
          createdAt: true,
          sourceType: true,
          introAssigned: true,
          clusterId: true,
        },
      }),

      prisma.interstitialAsset.findMany({
        where: {
          locationId: loc.id,
          active: true,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          category: true,
          fileUrl: true,
          durationSec: true,
          active: true,
          priority: true,
          randomWeight: true,
          scheduleMode: true,
          intervalMinutes: true,
          allowedProfiles: true,
          blockedProfiles: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.interstitialEvent.findMany({
        where: {
          locationId: loc.id,
          sessionId: session.id,
        },
        orderBy: [{ plannedAt: "desc" }],
        take: 100,
        select: {
          id: true,
          sessionId: true,
          locationId: true,
          assetId: true,
          status: true,
          plannedAt: true,
          playedAt: true,
        },
      }),
    ]);

    const queueItems = queueItemsRaw.map((item) => ({
      id: item.id,
      status: item.status,
      position: item.position,
      createdAt: item.createdAt.toISOString(),
      sourceType: item.sourceType,
      introAssigned: item.introAssigned,
      clusterId: item.clusterId,
    }));

    const interstitialAssets = assetsRaw.map((asset) => {
      const manualOnly =
        asset.category === "MANUAL_ONLY" ||
        asset.scheduleMode === InterstitialScheduleMode.MANUAL_ONLY;

      return {
        id: asset.id,
        name: asset.name,
        category: asset.category,
        triggerType:
  asset.scheduleMode === InterstitialScheduleMode.TOP_OF_HOUR_WINDOW
    ? "TOP_OF_HOUR_WINDOW"
    : asset.scheduleMode === InterstitialScheduleMode.INTERVAL_MINUTES
    ? "SCHEDULED_INTERVAL"
    : asset.category === "REQUEST_SINGLE"
    ? "REQUEST_SINGLE"
    : asset.category === "REQUEST_BLOCK"
    ? "REQUEST_CLUSTER"
    : asset.category === "MANUAL_ONLY"
    ? "MANUAL"
    : "RANDOM_BRANDING",
        filePath: asset.fileUrl,
        durationSec: asset.durationSec ?? 0,
        active: asset.active,
        priority: asset.priority,
        randomWeight: asset.randomWeight ?? 100,
        cooldownSongs: null,
        cooldownMinutes: null,
        allowedProfiles: asset.allowedProfiles.map(String),
        blockedProfiles: asset.blockedProfiles.map(String),
        scheduleMode: asset.scheduleMode,
        intervalMinutes: asset.intervalMinutes,
        minSongsBetweenPlays: null,
        maxUsesPerSession: null,
        cleanTransitionOnly: false,
        requestClusterEligible: asset.category === "REQUEST_BLOCK",
        requestSingleEligible: asset.category === "REQUEST_SINGLE",
        brandingEligible:
          asset.category === "BRANDING" ||
          asset.category === "RULES" ||
          asset.category === "GAME" ||
          asset.category === "SAFETY" ||
          asset.category === "BIRTHDAY",
        startsBlock: asset.category === "REQUEST_BLOCK",
        manualOnly,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
      };
    });

    const recentInterstitialEvents = recentEventsRaw.map((event) => ({
      id: event.id,
      sessionId: event.sessionId ?? session.id,
      locationId: event.locationId,
      assetId: event.assetId,
      status: event.status,
      reason: "BRANDING_GAP_FILL" as const,
      insertedBeforeQueueItemId: null,
      insertedAfterQueueItemId: null,
      linkedRequestClusterId: null,
      plannedAt: event.plannedAt.toISOString(),
      playedAt: event.playedAt ? event.playedAt.toISOString() : null,
      skippedAt: null,
      operatorOverride: false,
      overrideNote: null,
      metadata: null,
    }));

const action = computeNextPlaybackAction({
  locationId: loc.id,
  sessionId: session.id,
  profile,
  queueItems: queueItems as any,
  interstitialAssets: interstitialAssets as any,
  recentInterstitialEvents: recentInterstitialEvents as any,
  nowIso: new Date().toISOString(),
} as any);

    if (!isInterstitialAction(action)) {
      return NextResponse.json({
        ok: true,
        materialized: false,
        reason: "NO_INTERSTITIAL_ACTION",
        action,
        sessionId: session.id,
        locationId: loc.id,
        locationSlug,
      });
    }

    const assetId = extractAssetId(action);
    if (!assetId) {
      return jsonFail("Interstitial action did not include an assetId.", 500);
    }

    const targetQueueItemId = extractTargetQueueItemId(action);
    if (!targetQueueItemId) {
      return jsonFail("Interstitial action did not include a target queue item.", 500);
    }

    const asset = await prisma.interstitialAsset.findFirst({
      where: {
        id: assetId,
        locationId: loc.id,
        active: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
        durationSec: true,
        fileUrl: true,
      },
    });

    if (!asset) {
      return jsonFail("Interstitial asset not found or inactive.", 404);
    }

    const clusterId = buildInterstitialClusterId(assetId);
    const durationSec = extractDurationSec(action, asset);

    const result = await prisma.$transaction(async (tx) => {
      const activeItems = await tx.queueItem.findMany({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: { in: ACTIVE_QUEUE_STATUSES },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          position: true,
          status: true,
          sourceType: true,
          clusterId: true,
          createdAt: true,
        },
      });

      const targetIndex = activeItems.findIndex(
        (item) => item.id === targetQueueItemId
      );

      if (targetIndex === -1) {
        throw new Error("TARGET_QUEUE_ITEM_NOT_FOUND");
      }

      const existingMatchingInterstitial = await tx.queueItem.findFirst({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          sourceType: QueueSourceType.INTERSTITIAL,
          status: { in: ACTIVE_QUEUE_STATUSES },
          clusterId,
        },
        select: { id: true, position: true },
      });

      if (existingMatchingInterstitial) {
        return {
          ok: true,
          materialized: false,
          reason: "ALREADY_MATERIALIZED",
          queueItemId: existingMatchingInterstitial.id,
          queuePosition: existingMatchingInterstitial.position,
          assetId: asset.id,
          assetName: asset.name,
          assetFileUrl: asset.fileUrl,
          bridgePlaybackFilename: asset.fileUrl,
          clusterId,
          targetQueueItemId,
        };
      }

      const insertPosition = activeItems[targetIndex].position;

      const queueItem = await tx.queueItem.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          status: QueueItemStatus.QUEUED,
          position: insertPosition,
          sourceType: QueueSourceType.INTERSTITIAL,
          introAssigned: false,
          clusterId,
          durationSec,
        },
        select: {
          id: true,
          position: true,
          status: true,
          sourceType: true,
          clusterId: true,
          durationSec: true,
        },
      });

      const eventMetadata = {
        assetId: asset.id,
        assetName: asset.name,
        assetCategory: asset.category,
        fileUrl: asset.fileUrl,
        clusterId,
        targetQueueItemId,
        insertedBeforeQueueItemId: targetQueueItemId,
        materializedBy: "runtime/materialize-next",
        plannedFromActionType: String((action as any)?.action ?? "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM"),
        profile,
      } satisfies Prisma.JsonObject;

      await tx.playbackEvent.create({
        data: {
          locationId: loc.id,
          queueItemId: queueItem.id,
          type: PlaybackEventType.QUEUED,
          metadata: eventMetadata,
        },
      });

      await tx.playbackEvent.create({
        data: {
          locationId: loc.id,
          queueItemId: queueItem.id,
          type: PlaybackEventType.INTRO_INSERTED,
          metadata: eventMetadata,
        },
      });

      const interstitialEvent = await tx.interstitialEvent.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          assetId: asset.id,
          status: InterstitialEventStatus.PLANNED,
        },
        select: {
          id: true,
          status: true,
          plannedAt: true,
          playedAt: true,
        },
      });

      await normalizeActiveQueuePositions(tx, loc.id, session.id);

      const normalizedQueueItem = await tx.queueItem.findUnique({
        where: { id: queueItem.id },
        select: {
          id: true,
          position: true,
          status: true,
          sourceType: true,
          clusterId: true,
          durationSec: true,
        },
      });

      return {
        ok: true,
        materialized: true,
        reason: "INTERSTITIAL_INSERTED",
        queueItem: normalizedQueueItem,
        interstitialEvent,
        assetId: asset.id,
        assetName: asset.name,
        assetFileUrl: asset.fileUrl,
        bridgePlaybackFilename: asset.fileUrl,
        clusterId,
        targetQueueItemId,
      };
    });

    return NextResponse.json({
      ...result,
      action,
      sessionId: session.id,
      locationId: loc.id,
      locationSlug,
      profile,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "TARGET_QUEUE_ITEM_NOT_FOUND"
    ) {
      return jsonFail("Target queue item was not found in the active queue.", 409);
    }

    console.error("materialize-next error", error);
    return jsonFail("Could not process materialization request.", 500);
  }
}