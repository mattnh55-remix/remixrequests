import {
  defaultInterstitialRules,
  type InterstitialAsset,
  type InterstitialEvent,
  type InterstitialRulesConfig,
  type NextPlaybackAction,
  type QueueItemLike,
} from "@/lib/booth/interstitial-types";
import {
  detectUpcomingRequestCluster,
  getPlayableQueue,
  selectBestInterstitialAsset,
} from "@/lib/booth/interstitial-rules";

type ComputeNextPlaybackActionInput = {
  sessionId: string;
  locationId: string;
  profile: string;

  queueItems: QueueItemLike[];
  interstitialAssets: InterstitialAsset[];
  recentInterstitialEvents: InterstitialEvent[];

  nowIso: string;

  rules?: Partial<InterstitialRulesConfig>;
};

function mergeRules(
  rules?: Partial<InterstitialRulesConfig>
): InterstitialRulesConfig {
  return {
    ...defaultInterstitialRules,
    ...(rules || {}),
  };
}

export function computeNextPlaybackAction(
  input: ComputeNextPlaybackActionInput
): NextPlaybackAction {
  const rules = mergeRules(input.rules);
  const playableQueue = getPlayableQueue(input.queueItems);
  const nextQueueItem = playableQueue[0] || null;

  if (!nextQueueItem) {
    return {
      action: "NO_ACTION",
      reason: "NO_PLAYABLE_QUEUE_ITEM",
    };
  }

  const cluster = detectUpcomingRequestCluster(
    input.queueItems,
    rules.requestClusterThreshold,
    rules.lookaheadWindow
  );

  if (rules.enableScheduledInterstitials) {
    const topOfHourAsset = selectBestInterstitialAsset(input.interstitialAssets, {
      nowIso: input.nowIso,
      profile: input.profile,
      queueItems: input.queueItems,
      nextQueueItem,
      recentInterstitialEvents: input.recentInterstitialEvents,
      rules,
      reason: "TOP_OF_HOUR_WINDOW",
    });

    if (topOfHourAsset) {
      return {
        action: "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM",
        assetId: topOfHourAsset.id,
        queueItemId: nextQueueItem.id,
        reason: "TOP_OF_HOUR_WINDOW",
      };
    }

    const scheduledIntervalAsset = selectBestInterstitialAsset(input.interstitialAssets, {
      nowIso: input.nowIso,
      profile: input.profile,
      queueItems: input.queueItems,
      nextQueueItem,
      recentInterstitialEvents: input.recentInterstitialEvents,
      rules,
      reason: "SCHEDULED_INTERVAL",
    });

    if (scheduledIntervalAsset) {
      return {
        action: "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM",
        assetId: scheduledIntervalAsset.id,
        queueItemId: nextQueueItem.id,
        reason: "SCHEDULED_INTERVAL",
      };
    }
  }

  if (rules.enableRequestIntros && cluster.requestClusterDetected) {
    const blockIntroAsset = selectBestInterstitialAsset(input.interstitialAssets, {
      nowIso: input.nowIso,
      profile: input.profile,
      queueItems: input.queueItems,
      nextQueueItem,
      recentInterstitialEvents: input.recentInterstitialEvents,
      rules,
      reason: "REQUEST_CLUSTER",
    });

    if (blockIntroAsset) {
      return {
        action: "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM",
        assetId: blockIntroAsset.id,
        queueItemId: nextQueueItem.id,
        reason: "REQUEST_CLUSTER",
      };
    }
  }

  if (rules.enableRequestIntros && cluster.singleRequestDetected) {
    const singleIntroAsset = selectBestInterstitialAsset(input.interstitialAssets, {
      nowIso: input.nowIso,
      profile: input.profile,
      queueItems: input.queueItems,
      nextQueueItem,
      recentInterstitialEvents: input.recentInterstitialEvents,
      rules,
      reason: "REQUEST_SINGLE",
    });

    if (singleIntroAsset) {
      return {
        action: "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM",
        assetId: singleIntroAsset.id,
        queueItemId: nextQueueItem.id,
        reason: "REQUEST_SINGLE",
      };
    }
  }

  if (rules.enableBrandingDrops) {
    const brandingAsset = selectBestInterstitialAsset(input.interstitialAssets, {
      nowIso: input.nowIso,
      profile: input.profile,
      queueItems: input.queueItems,
      nextQueueItem,
      recentInterstitialEvents: input.recentInterstitialEvents,
      rules,
      reason: "BRANDING_GAP_FILL",
    });

    if (brandingAsset) {
      return {
        action: "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM",
        assetId: brandingAsset.id,
        queueItemId: nextQueueItem.id,
        reason: "BRANDING_GAP_FILL",
      };
    }
  }

  return {
    action: "PLAY_QUEUE_ITEM",
    queueItemId: nextQueueItem.id,
    reason: "DIRECT_PLAY",
  };
}