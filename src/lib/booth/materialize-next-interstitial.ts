import { prisma } from "@/lib/prisma";
import { getInterstitialAssets } from "@/lib/booth/get-interstitial-assets";
import { buildInterstitialClusterId } from "@/lib/booth/runtime-queue";
import { computeNextPlaybackAction } from "@/lib/booth/compute-next-playback-action";

type MaterializeNextInterstitialArgs = {
  locationId: string;
  sessionId: string;
  profile?: "GENERAL" | "FAMILY" | "ADULT" | "BIRTHDAY" | "SCHOOL" | "PRIVATE_EVENT";
};

type MaterializeNextInterstitialResult =
  | {
      ok: true;
      materialized: false;
      reason:
        | "NO_QUEUE"
        | "NO_ACTION"
        | "PLAY_QUEUE_ITEM"
        | "ASSET_NOT_FOUND"
        | "TARGET_NOT_FOUND"
        | "DUPLICATE_ALREADY_PRESENT";
      action?: string;
      queueItemId?: string;
      assetId?: string;
    }
  | {
      ok: true;
      materialized: true;
      reason: "INSERTED";
      action: string;
      queueItemId: string;
      assetId: string;
      insertedQueueItemId: string;
      insertedPosition: number;
    };

function mapRulesForPlanner(rules: {
  requestClusterThreshold?: number | null;
  requestLookaheadWindow?: number | null;
  singleRequestIntroEnabled?: boolean | null;
  blockRequestIntroEnabled?: boolean | null;
  brandingDropMinSongsApart?: number | null;
  hourlyRulesEnabled?: boolean | null;
  maxInsertsPer15Min?: number | null;
} | null) {
  return {
    requestClusterThreshold: rules?.requestClusterThreshold ?? undefined,
    lookaheadWindow: rules?.requestLookaheadWindow ?? undefined,
    enableRequestIntros:
      Boolean(rules?.singleRequestIntroEnabled) || Boolean(rules?.blockRequestIntroEnabled),
    enableBrandingDrops: (rules?.brandingDropMinSongsApart ?? 0) >= 0,
    enableScheduledInterstitials: Boolean(rules?.hourlyRulesEnabled),
    maxInsertsPer15Min: rules?.maxInsertsPer15Min ?? undefined,
  };
}

export async function materializeNextInterstitial(
  args: MaterializeNextInterstitialArgs
): Promise<MaterializeNextInterstitialResult> {
  const { locationId, sessionId, profile = "GENERAL" } = args;
  const now = new Date();

  const [rules, queueItems, interstitialAssets, recentInterstitialEvents] = await Promise.all([
    prisma.ruleset.findUnique({
      where: { locationId },
      select: {
        requestClusterThreshold: true,
        requestLookaheadWindow: true,
        singleRequestIntroEnabled: true,
        blockRequestIntroEnabled: true,
        brandingDropMinSongsApart: true,
        hourlyRulesEnabled: true,
        maxInsertsPer15Min: true,
      },
    }),
    prisma.queueItem.findMany({
      where: { locationId, sessionId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        requestId: true,
        status: true,
        position: true,
        sourceType: true,
        clusterId: true,
        introAssigned: true,
        createdAt: true,
      },
    }),
    getInterstitialAssets(locationId),
    prisma.interstitialEvent.findMany({
      where: { locationId, sessionId },
      orderBy: { plannedAt: "desc" },
      take: 50,
    }),
  ]);

  if (!queueItems.length) {
    return { ok: true, materialized: false, reason: "NO_QUEUE" };
  }

  const action = computeNextPlaybackAction({
    sessionId,
    locationId,
    profile,
    queueItems: queueItems as any,
    interstitialAssets: interstitialAssets as any,
    recentInterstitialEvents: recentInterstitialEvents as any,
    nowIso: now.toISOString(),
    rules: mapRulesForPlanner(rules),
  });

  if (!action) {
    return { ok: true, materialized: false, reason: "NO_ACTION" };
  }

  if (action.action !== "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM") {
    return {
      ok: true,
      materialized: false,
      reason: action.action === "PLAY_QUEUE_ITEM" ? "PLAY_QUEUE_ITEM" : "NO_ACTION",
      action: action.action,
      queueItemId: "queueItemId" in action ? action.queueItemId : undefined,
    };
  }

  const target = queueItems.find((item) => item.id === action.queueItemId);
  if (!target) {
    return {
      ok: true,
      materialized: false,
      reason: "TARGET_NOT_FOUND",
      action: action.action,
      queueItemId: action.queueItemId,
      assetId: action.assetId,
    };
  }

  const asset = interstitialAssets.find((item) => item.id === action.assetId);
  if (!asset) {
    return {
      ok: true,
      materialized: false,
      reason: "ASSET_NOT_FOUND",
      action: action.action,
      queueItemId: action.queueItemId,
      assetId: action.assetId,
    };
  }

  const clusterId = buildInterstitialClusterId(asset.id);

  const inserted = await prisma.$transaction(async (tx) => {
    const liveQueue = await tx.queueItem.findMany({
      where: { locationId, sessionId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        sourceType: true,
        clusterId: true,
      },
    });

    const liveTarget = liveQueue.find((item) => item.id === action.queueItemId);
    if (!liveTarget) {
      return { kind: "TARGET_NOT_FOUND" as const };
    }

    const previousItem = liveQueue.find((item) => item.position === liveTarget.position - 1);
    if (
      previousItem &&
      previousItem.sourceType === "INTERSTITIAL" &&
      previousItem.clusterId === clusterId
    ) {
      return { kind: "DUPLICATE_ALREADY_PRESENT" as const };
    }

    await tx.queueItem.updateMany({
      where: {
        locationId,
        sessionId,
        position: { gte: liveTarget.position },
      },
      data: {
        position: { increment: 1 },
      },
    });

    const insertedQueueItem = await tx.queueItem.create({
      data: {
        locationId,
        sessionId,
        requestId: null,
        status: "QUEUED",
        position: liveTarget.position,
        sourceType: "INTERSTITIAL",
        introAssigned: false,
        clusterId,
      },
      select: {
        id: true,
        position: true,
      },
    });

    await tx.interstitialEvent.create({
      data: {
        locationId,
        sessionId,
        assetId: asset.id,
        status: "PLANNED",
        plannedAt: now,
      },
    });

    await tx.playbackEvent.create({
      data: {
        locationId,
        queueItemId: insertedQueueItem.id,
        type: "INTRO_INSERTED",
        metadata: {
          assetId: asset.id,
          targetQueueItemId: liveTarget.id,
          reason: action.reason,
          source: "materialize-next-interstitial",
        },
      },
    });

    return {
      kind: "INSERTED" as const,
      insertedQueueItemId: insertedQueueItem.id,
      insertedPosition: insertedQueueItem.position,
    };
  });

  if (inserted.kind === "TARGET_NOT_FOUND") {
    return {
      ok: true,
      materialized: false,
      reason: "TARGET_NOT_FOUND",
      action: action.action,
      queueItemId: action.queueItemId,
      assetId: action.assetId,
    };
  }

  if (inserted.kind === "DUPLICATE_ALREADY_PRESENT") {
    return {
      ok: true,
      materialized: false,
      reason: "DUPLICATE_ALREADY_PRESENT",
      action: action.action,
      queueItemId: action.queueItemId,
      assetId: action.assetId,
    };
  }

  return {
    ok: true,
    materialized: true,
    reason: "INSERTED",
    action: action.action,
    queueItemId: action.queueItemId,
    assetId: action.assetId,
    insertedQueueItemId: inserted.insertedQueueItemId,
    insertedPosition: inserted.insertedPosition,
  };
}
