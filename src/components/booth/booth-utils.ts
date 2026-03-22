import type { QueueLikeItem } from "./types";

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
  return sourceType === "INTERSTITIAL" || type.includes("INTERSTITIAL") || type.includes("SYSTEM");
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

export function formatTitleArtist(title?: string | null, artist?: string | null) {
  if (title && artist) return `${title} • ${artist}`;
  return title || artist || "Untitled";
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
  }));
}

export function queueSummary(queue: QueueLikeItem[]) {
  return {
    total: queue.length,
    songs: queue.filter((item) => !isInterstitial(item)).length,
    interstitials: queue.filter(isInterstitial).length,
  };
}
