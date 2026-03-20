import type {
  EligibilityContext,
  InterstitialAsset,
  InterstitialEvent,
  QueueItemLike,
  RequestClusterDetection,
} from "@/lib/booth/interstitial-types";

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? null : value;
}

function diffMinutes(nowIso: string, pastIso: string | null | undefined): number | null {
  const nowMs = toMs(nowIso);
  const pastMs = toMs(pastIso);
  if (nowMs == null || pastMs == null) return null;
  return Math.floor((nowMs - pastMs) / 60000);
}

function sortPlayableQueue(a: QueueItemLike, b: QueueItemLike) {
  if (a.status === "LOADED" && b.status !== "LOADED") return -1;
  if (b.status === "LOADED" && a.status !== "LOADED") return 1;

  if (a.position !== b.position) return a.position - b.position;
  if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
  return a.id.localeCompare(b.id);
}

export function isPlayableQueueItem(item: QueueItemLike) {
  return item.status === "QUEUED" || item.status === "LOADED";
}

export function isRequestLike(item: QueueItemLike) {
  return item.sourceType === "REQUEST" || item.sourceType === "request";
}

export function getPlayableQueue(items: QueueItemLike[]) {
  return items.filter(isPlayableQueueItem).sort(sortPlayableQueue);
}

export function detectUpcomingRequestCluster(
  items: QueueItemLike[],
  threshold: number,
  lookaheadWindow: number
): RequestClusterDetection {
  const playable = getPlayableQueue(items).slice(0, Math.max(lookaheadWindow, 1));
  const first = playable[0] || null;

  if (!first || !isRequestLike(first)) {
    return {
      consecutiveRequestCount: 0,
      requestClusterDetected: false,
      singleRequestDetected: false,
      firstQueueItemId: first?.id ?? null,
    };
  }

  let consecutiveRequestCount = 0;

  for (const item of playable) {
    if (isRequestLike(item)) {
      consecutiveRequestCount += 1;
    } else {
      break;
    }
  }

  return {
    consecutiveRequestCount,
    requestClusterDetected: consecutiveRequestCount >= threshold,
    singleRequestDetected: consecutiveRequestCount === 1,
    firstQueueItemId: first.id,
  };
}

function getEventsForAsset(events: InterstitialEvent[], assetId: string) {
  return events
    .filter((event) => event.assetId === assetId && event.status === "PLAYED")
    .sort((a, b) => (b.playedAt || "").localeCompare(a.playedAt || ""));
}

function getRecentPlayedEvents(events: InterstitialEvent[]) {
  return events
    .filter((event) => event.status === "PLAYED")
    .sort((a, b) => (b.playedAt || "").localeCompare(a.playedAt || ""));
}

function countEventsInLastMinutes(
  events: InterstitialEvent[],
  nowIso: string,
  minutes: number
) {
  return events.filter((event) => {
    if (event.status !== "PLAYED" || !event.playedAt) return false;
    const diff = diffMinutes(nowIso, event.playedAt);
    return diff != null && diff >= 0 && diff <= minutes;
  }).length;
}

function getSongsSinceLastPlayed(
  asset: InterstitialAsset,
  queueItems: QueueItemLike[],
  recentEvents: InterstitialEvent[]
) {
  const assetEvents = getEventsForAsset(recentEvents, asset.id);
  const lastPlayed = assetEvents[0];

  if (!lastPlayed?.playedAt) return Number.MAX_SAFE_INTEGER;

  const laterQueueItems = queueItems.filter((item) => {
    const itemMs = toMs(item.createdAt);
    const lastMs = toMs(lastPlayed.playedAt);
    if (itemMs == null || lastMs == null) return false;
    return itemMs > lastMs;
  });

  return laterQueueItems.length;
}

function getUsesThisSession(asset: InterstitialAsset, events: InterstitialEvent[]) {
  return events.filter(
    (event) => event.assetId === asset.id && event.status === "PLAYED"
  ).length;
}

function profileAllowed(asset: InterstitialAsset, profile: string) {
  const normalized = profile.trim();

  if (asset.blockedProfiles.includes(normalized)) return false;
  if (asset.allowedProfiles.length === 0) return true;
  return asset.allowedProfiles.includes(normalized);
}

function reasonMatchesAsset(asset: InterstitialAsset, reason: EligibilityContext["reason"]) {
  if (reason === "REQUEST_CLUSTER") return asset.requestClusterEligible;
  if (reason === "REQUEST_SINGLE") return asset.requestSingleEligible;
  if (reason === "BRANDING_GAP_FILL") return asset.brandingEligible;
  if (reason === "SCHEDULED_INTERVAL") return asset.scheduleMode === "INTERVAL_MINUTES";
  if (reason === "TOP_OF_HOUR_WINDOW") return asset.scheduleMode === "TOP_OF_HOUR_WINDOW";
  return false;
}

function scheduleEligible(asset: InterstitialAsset, context: EligibilityContext) {
  if (asset.scheduleMode === "NONE") return true;
  if (asset.scheduleMode === "MANUAL_ONLY") return false;
  if (asset.scheduleMode === "ONCE_PER_SESSION") {
    return getUsesThisSession(asset, context.recentInterstitialEvents) === 0;
  }

  const assetEvents = getEventsForAsset(context.recentInterstitialEvents, asset.id);
  const lastPlayed = assetEvents[0];

  if (asset.scheduleMode === "INTERVAL_MINUTES") {
    if (!asset.intervalMinutes || asset.intervalMinutes <= 0) return false;
    if (!lastPlayed?.playedAt) return true;

    const minutesSinceLast = diffMinutes(context.nowIso, lastPlayed.playedAt);
    return minutesSinceLast != null && minutesSinceLast >= asset.intervalMinutes;
  }

  if (asset.scheduleMode === "TOP_OF_HOUR_WINDOW") {
    const now = new Date(context.nowIso);
    const minutesPastHour = now.getMinutes();
    return minutesPastHour <= context.rules.topOfHourWindowMinutes;
  }

  return true;
}

function cooldownEligible(asset: InterstitialAsset, context: EligibilityContext) {
  const assetEvents = getEventsForAsset(context.recentInterstitialEvents, asset.id);
  const lastPlayed = assetEvents[0];

  if (asset.cooldownMinutes && lastPlayed?.playedAt) {
    const minutesSinceLast = diffMinutes(context.nowIso, lastPlayed.playedAt);
    if (minutesSinceLast != null && minutesSinceLast < asset.cooldownMinutes) {
      return false;
    }
  }

  if (asset.cooldownSongs) {
    const songsSinceLast = getSongsSinceLastPlayed(
      asset,
      context.queueItems,
      context.recentInterstitialEvents
    );
    if (songsSinceLast < asset.cooldownSongs) {
      return false;
    }
  }

  if (asset.minSongsBetweenPlays) {
    const songsSinceLast = getSongsSinceLastPlayed(
      asset,
      context.queueItems,
      context.recentInterstitialEvents
    );
    if (songsSinceLast < asset.minSongsBetweenPlays) {
      return false;
    }
  }

  return true;
}

function budgetEligible(context: EligibilityContext) {
  const recentCount = countEventsInLastMinutes(
    context.recentInterstitialEvents,
    context.nowIso,
    15
  );

  return recentCount < context.rules.maxNonCriticalInsertsPer15Min;
}

export function isAssetEligible(
  asset: InterstitialAsset,
  context: EligibilityContext
): boolean {
  if (!asset.active) return false;
  if (asset.manualOnly) return false;
  if (!context.nextQueueItem) return false;
  if (!profileAllowed(asset, context.profile)) return false;
  if (!reasonMatchesAsset(asset, context.reason)) return false;
  if (!scheduleEligible(asset, context)) return false;
  if (!cooldownEligible(asset, context)) return false;
  if (!budgetEligible(context)) return false;

  if (asset.maxUsesPerSession != null) {
    const uses = getUsesThisSession(asset, context.recentInterstitialEvents);
    if (uses >= asset.maxUsesPerSession) return false;
  }

  if (asset.cleanTransitionOnly) {
    // Placeholder for future transition safety checks.
    // Right now every compute call is assumed to happen on a clean transition.
  }

  return true;
}

function weightedPick(assets: InterstitialAsset[]) {
  if (assets.length === 0) return null;
  if (assets.length === 1) return assets[0];

  const total = assets.reduce((sum, asset) => sum + Math.max(asset.randomWeight ?? 1, 1), 0);
  let target = Math.random() * total;

  for (const asset of assets) {
    target -= Math.max(asset.randomWeight ?? 1, 1);
    if (target <= 0) return asset;
  }

  return assets[assets.length - 1];
}

export function selectBestInterstitialAsset(
  assets: InterstitialAsset[],
  context: EligibilityContext
): InterstitialAsset | null {
  const eligible = assets.filter((asset) => isAssetEligible(asset, context));

  if (eligible.length === 0) return null;

  const highestPriority = Math.max(...eligible.map((asset) => asset.priority));
  const top = eligible.filter((asset) => asset.priority === highestPriority);

  if (context.reason === "BRANDING_GAP_FILL") {
    return weightedPick(top);
  }

  return top.sort((a, b) => a.name.localeCompare(b.name))[0];
}

export function getMostRecentPlayedInterstitial(
  events: InterstitialEvent[]
): InterstitialEvent | null {
  return getRecentPlayedEvents(events)[0] || null;
}