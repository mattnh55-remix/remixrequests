import type {
  EligibilityContext,
  InterstitialAsset,
  InterstitialEvent,
  QueueItemLike,
  RequestClusterDetection,
} from "@/lib/booth/interstitial-types";

function isQueuePlayable(item: QueueItemLike) {
  return item.status === "QUEUED" || item.status === "LOADED";
}

export function getPlayableQueue(queueItems: QueueItemLike[]) {
  return [...queueItems]
    .filter(isQueuePlayable)
    .sort((a, b) => a.position - b.position);
}

export function detectUpcomingRequestCluster(
  queueItems: QueueItemLike[],
  lookaheadWindow: number,
  requestClusterThreshold: number,
): RequestClusterDetection {
  const playable = getPlayableQueue(queueItems).slice(0, lookaheadWindow);

  if (playable.length === 0) {
    return {
      consecutiveRequestCount: 0,
      requestClusterDetected: false,
      singleRequestDetected: false,
      firstQueueItemId: null,
    };
  }

  const firstQueueItemId = playable[0]?.id ?? null;

  let consecutiveRequestCount = 0;
  for (const item of playable) {
    if (item.sourceType === "REQUEST") {
      consecutiveRequestCount += 1;
    } else {
      break;
    }
  }

  return {
    consecutiveRequestCount,
    requestClusterDetected: consecutiveRequestCount >= requestClusterThreshold,
    singleRequestDetected: consecutiveRequestCount === 1,
    firstQueueItemId,
  };
}

function minutesSince(iso: string | null | undefined, nowIso: string) {
  if (!iso) return null;

  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();

  if (!Number.isFinite(then) || !Number.isFinite(now)) return null;
  return (now - then) / 1000 / 60;
}

function countSongsSinceLastPlayed(
  assetId: string,
  queueItems: QueueItemLike[],
  recentInterstitialEvents: InterstitialEvent[],
) {
  const lastPlayed = [...recentInterstitialEvents]
    .filter((event) => event.assetId === assetId && event.status === "PLAYED" && event.playedAt)
    .sort((a, b) => {
      const aTime = new Date(a.playedAt ?? a.plannedAt).getTime();
      const bTime = new Date(b.playedAt ?? b.plannedAt).getTime();
      return bTime - aTime;
    })[0];

  if (!lastPlayed?.playedAt) return null;

  const playedAtMs = new Date(lastPlayed.playedAt).getTime();

  return queueItems.filter((item) => {
    const createdAtMs = new Date(item.createdAt).getTime();
    return createdAtMs > playedAtMs && item.sourceType === "REQUEST";
  }).length;
}

function profileAllowed(asset: InterstitialAsset, profile: string) {
  if (asset.blockedProfiles.includes(profile)) return false;
  if (asset.allowedProfiles.length === 0) return true;
  return asset.allowedProfiles.includes(profile);
}

function reasonEligible(asset: InterstitialAsset, reason: EligibilityContext["reason"]) {
  switch (reason) {
    case "REQUEST_SINGLE":
      return asset.requestSingleEligible && !asset.manualOnly;
    case "REQUEST_CLUSTER":
      return asset.requestClusterEligible && !asset.manualOnly;
    case "SCHEDULED_INTERVAL":
    case "TOP_OF_HOUR_WINDOW":
    case "BRANDING_GAP_FILL":
      return !asset.manualOnly;
    default:
      return false;
  }
}

function cooldownEligible(asset: InterstitialAsset, ctx: EligibilityContext) {
  const lastPlayedEvent = [...ctx.recentInterstitialEvents]
    .filter((event) => event.assetId === asset.id && event.status === "PLAYED")
    .sort((a, b) => {
      const aTime = new Date(a.playedAt ?? a.plannedAt).getTime();
      const bTime = new Date(b.playedAt ?? b.plannedAt).getTime();
      return bTime - aTime;
    })[0];

  if (asset.cooldownMinutes && lastPlayedEvent) {
    const mins = minutesSince(lastPlayedEvent.playedAt ?? lastPlayedEvent.plannedAt, ctx.nowIso);
    if (mins != null && mins < asset.cooldownMinutes) {
      return false;
    }
  }

  if (asset.cooldownSongs) {
    const songsSince = countSongsSinceLastPlayed(asset.id, ctx.queueItems, ctx.recentInterstitialEvents);
    if (songsSince != null && songsSince < asset.cooldownSongs) {
      return false;
    }
  }

  return true;
}

function scoreAsset(asset: InterstitialAsset, ctx: EligibilityContext) {
  let score = 0;

  score += asset.priority * 100;
  score += asset.randomWeight ?? 0;

  const lastPlayedEvent = [...ctx.recentInterstitialEvents]
    .filter((event) => event.assetId === asset.id && event.status === "PLAYED")
    .sort((a, b) => {
      const aTime = new Date(a.playedAt ?? a.plannedAt).getTime();
      const bTime = new Date(b.playedAt ?? b.plannedAt).getTime();
      return aTime - bTime;
    })[0];

  const mins = minutesSince(lastPlayedEvent?.playedAt ?? lastPlayedEvent?.plannedAt, ctx.nowIso);
  if (mins != null) score += Math.min(mins, 120);

  return score;
}

export function selectBestInterstitialAsset(
  assets: InterstitialAsset[],
  ctx: EligibilityContext,
): InterstitialAsset | null {
  const eligible = assets.filter((asset) => {
    if (!asset.active) return false;
    if (!profileAllowed(asset, ctx.profile)) return false;
    if (!reasonEligible(asset, ctx.reason)) return false;
    if (!cooldownEligible(asset, ctx)) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  return eligible.sort((a, b) => scoreAsset(b, ctx) - scoreAsset(a, ctx))[0] ?? null;
}