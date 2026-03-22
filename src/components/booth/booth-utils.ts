import type { BoothActionName, QueueLikeItem, RequestItem } from "./types";

export async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function isInterstitial(item: QueueLikeItem | null | undefined) {
  if (!item) return false;

  const sourceType = String(item.sourceType || "").toUpperCase();
  const type = String(item.itemType || item.type || "").toUpperCase();

  return (
    sourceType === "INTERSTITIAL" ||
    type.includes("INTERSTITIAL") ||
    type.includes("SYSTEM")
  );
}

export function isRequestLike(item: QueueLikeItem | null | undefined) {
  if (!item) return false;
  return Boolean(item.isRequest || item.requestId);
}

export function isBoostedLike(item: QueueLikeItem | null | undefined) {
  if (!item) return false;
  return Boolean(item.boosted || String(item.requestType || item.type || "").toUpperCase() === "PLAY_NOW");
}

export function getAllowedActions(item: QueueLikeItem | null): BoothActionName[] {
  if (!item) return [];

  const status = String(item.status || "").toUpperCase();
  if (isInterstitial(item)) return [];

  if (status === "PLAYING") return ["pause", "skip", "done"];
  if (status === "LOADED") return ["play", "pause", "skip"];
  if (status === "QUEUED") return ["load", "play", "pause", "skip"];
  if (status === "HELD") return ["play", "skip"];

  return [];
}

export function formatActionLabel(action: BoothActionName | string) {
  const value = String(action || "").toLowerCase();
  if (value === "load") return "Load";
  if (value === "play") return "Play";
  if (value === "pause") return "Pause";
  if (value === "skip") return "Skip";
  if (value === "done") return "Done";
  if (value === "remove") return "Remove";
  return String(action || "");
}

export function getStatusTone(status?: string | null) {
  const value = String(status || "").toUpperCase();
  if (value === "PLAYING") return "playing";
  if (value === "LOADED") return "loaded";
  if (value === "HELD") return "held";
  if (value === "SKIPPED") return "skip";
  if (value === "PLAYED") return "muted";
  return "queued";
}

export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatTimeAgo(input?: string | null) {
  if (!input) return "—";
  const ts = new Date(input).getTime();
  if (!Number.isFinite(ts)) return "—";
  const diffMs = Date.now() - ts;
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hr ago";
  return `${diffHr} hr ago`;
}

export function getProgressPercent(item: QueueLikeItem | null | undefined) {
  if (!item) return 0;
  const direct = Number(item.progressPercent);
  if (Number.isFinite(direct) && direct >= 0) {
    return Math.max(0, Math.min(100, direct));
  }
  const elapsedSec = Number(item.elapsedSec);
  const durationSec = Number(item.durationSec);
  if (Number.isFinite(elapsedSec) && Number.isFinite(durationSec) && durationSec > 0) {
    return Math.max(0, Math.min(100, (elapsedSec / durationSec) * 100));
  }
  return 0;
}

export function normalizeQueue(payload: any): QueueLikeItem[] {
  if (!payload?.items || !Array.isArray(payload.items)) return [];

  return payload.items.map((item: any, idx: number) => ({
    id: String(item.id ?? `queue-${idx}`),
    requestId: item.requestId ?? null,
    title: item.title ?? item.songTitle ?? item.request?.title ?? "Untitled",
    artist: item.artist ?? item.songArtist ?? item.request?.artist ?? "Unknown artist",
    status: item.status ?? "QUEUED",
    sourceType: item.sourceType ?? null,
    itemType: item.itemType ?? null,
    type: item.type ?? null,
    clusterId: item.clusterId ?? null,
    position: item.position ?? idx + 1,
    sortOrder: item.sortOrder ?? item.position ?? idx + 1,
    durationSec: item.durationSec ?? null,
    elapsedSec: item.elapsedSec ?? null,
    remainingSec: item.remainingSec ?? null,
    progressPercent: item.progressPercent ?? null,
    isEndingSoon: item.isEndingSoon ?? false,
    startedAt: item.startedAt ?? null,
    createdAt: item.createdAt ?? null,
    requestedByLabel: item.requestedByLabel ?? item.request?.requestedByLabel ?? null,
    boosted: Boolean(item.boosted ?? false),
    artworkUrl: item.artworkUrl ?? item.request?.song?.artworkUrl ?? null,
    verified: item.verified ?? item.request?.verified ?? null,
    upvotes: item.upvotes ?? item.request?.upvotes ?? null,
    downvotes: item.downvotes ?? item.request?.downvotes ?? null,
    score: item.score ?? item.request?.score ?? null,
    redemptionCode: item.redemptionCode ?? item.request?.redemptionCode ?? null,
    requestType: item.requestType ?? item.request?.type ?? item.type ?? null,
    isRequest: Boolean(item.requestId ?? item.request?.id ?? false),
  }));
}

function requestLookupKeyFromRequest(item: RequestItem) {
  return `${String(item.title || "").trim().toLowerCase()}__${String(item.artist || "").trim().toLowerCase()}`;
}

function requestLookupKeyFromQueue(item: QueueLikeItem) {
  return `${String(item.title || "").trim().toLowerCase()}__${String(item.artist || "").trim().toLowerCase()}`;
}

export function enrichQueueWithRequests(queue: QueueLikeItem[], requests: RequestItem[]) {
  if (!queue.length || !requests.length) return queue;

  const byId = new Map<string, RequestItem>();
  const bySong = new Map<string, RequestItem>();

  for (const req of requests) {
    byId.set(String(req.id), req);
    bySong.set(requestLookupKeyFromRequest(req), req);
  }

  return queue.map((item) => {
    const req = (item.requestId ? byId.get(String(item.requestId)) : null) || bySong.get(requestLookupKeyFromQueue(item));
    if (!req) return item;

    return {
      ...item,
      requestId: item.requestId ?? req.id,
      isRequest: true,
      boosted: Boolean(item.boosted ?? req.boosted ?? false),
      requestedByLabel: item.requestedByLabel ?? req.requestedByLabel ?? null,
      verified: item.verified ?? req.verified ?? null,
      upvotes: item.upvotes ?? req.upvotes ?? null,
      downvotes: item.downvotes ?? req.downvotes ?? null,
      score: item.score ?? req.score ?? null,
      redemptionCode: item.redemptionCode ?? req.redemptionCode ?? null,
      requestType: item.requestType ?? req.type ?? req.sortBucket ?? null,
    } satisfies QueueLikeItem;
  });
}

export function queueSummary(queue: QueueLikeItem[]) {
  return {
    total: queue.filter((item) => item.status !== "PLAYED").length,
    songs: queue.filter((item) => !isInterstitial(item) && item.status !== "PLAYED").length,
    interstitials: queue.filter((item) => isInterstitial(item) && item.status !== "PLAYED").length,
  };
}
