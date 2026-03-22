import type { QueueLikeItem, RequestItem, RuntimePreview, ShoutoutItem } from "./types";

export async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `${res.status} ${res.statusText}`);
  }
  return data;
}

export function isInterstitial(item: QueueLikeItem | null | undefined) {
  if (!item) return false;
  const sourceType = String(item.sourceType || "").toUpperCase();
  const itemType = String(item.itemType || item.type || "").toUpperCase();
  return sourceType === "INTERSTITIAL" || itemType.includes("INTERSTITIAL") || itemType.includes("SYSTEM");
}

export function normalizeQueue(payload: any): QueueLikeItem[] {
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.queue) ? payload.queue : [];

  return items.map((item: any, idx: number) => ({
    id: String(item.id ?? `queue-${idx}`),
    requestId: item.requestId ?? null,
    title: item.title ?? item.songTitle ?? item.request?.title ?? "Untitled",
    artist: item.artist ?? item.songArtist ?? item.request?.artist ?? "Unknown artist",
    status: item.status ?? "QUEUED",
    sourceType: item.sourceType ?? item.request?.sourceType ?? null,
    itemType: item.itemType ?? item.type ?? null,
    type: item.type ?? null,
    clusterId: item.clusterId ?? null,
    position: item.position ?? item.sortOrder ?? idx + 1,
    sortOrder: item.sortOrder ?? item.position ?? idx + 1,
    durationSec: item.durationSec ?? null,
    elapsedSec: item.elapsedSec ?? null,
    remainingSec: item.remainingSec ?? null,
    progressPercent: item.progressPercent ?? 0,
    isEndingSoon: Boolean(item.isEndingSoon),
    startedAt: item.startedAt ?? null,
    createdAt: item.createdAt ?? null,
    requestedByLabel: item.requestedByLabel ?? item.request?.requestedByLabel ?? null,
    boosted: Boolean(item.boosted ?? item.request?.boosted ?? false),
    artworkUrl: item.artworkUrl ?? item.request?.song?.artworkUrl ?? null,
  }));
}

export function normalizeRequests(payload: any): { playNow: RequestItem[]; upNext: RequestItem[] } {
  const mapItem = (item: any): RequestItem => ({
    id: String(item.id),
    title: item.title ?? item.song?.title ?? "Untitled",
    artist: item.artist ?? item.song?.artist ?? "Unknown artist",
    score: Number(item.score ?? 0),
    type: item.type ?? null,
    boosted: Boolean(item.boosted),
    requestedByLabel: item.requestedByLabel ?? null,
    artworkUrl: item.artworkUrl ?? item.song?.artworkUrl ?? null,
    verified: Boolean(item.redemptionCode || item.isVerified || item.verified),
  });

  return {
    playNow: Array.isArray(payload?.playNow) ? payload.playNow.map(mapItem) : [],
    upNext: Array.isArray(payload?.upNext) ? payload.upNext.map(mapItem) : [],
  };
}

export function normalizeShoutouts(payload: any): { pending: ShoutoutItem[]; approved: ShoutoutItem[] } {
  const mapItem = (item: any): ShoutoutItem => ({
    id: String(item.id),
    fromName: item.fromName ?? "Guest",
    messageText: item.messageText ?? "",
    tier: item.tier ?? "",
    status: item.status ?? null,
    createdAt: item.createdAt ?? null,
  });

  return {
    pending: Array.isArray(payload?.pending) ? payload.pending.map(mapItem) : [],
    approved: Array.isArray(payload?.approved) ? payload.approved.map(mapItem) : [],
  };
}

export function deriveEngineState(queue: QueueLikeItem[]): RuntimePreview {
  const nextPlayable = queue.find((item) => {
    const s = String(item.status || "").toUpperCase();
    return s === "LOADED" || s === "QUEUED";
  });

  if (!nextPlayable) {
    return { action: "NO_ACTION", reason: "NO_PLAYABLE_QUEUE_ITEM" };
  }

  return {
    action: "PLAY_QUEUE_ITEM",
    reason: "DIRECT_PLAY",
    targetQueueItemId: nextPlayable.id,
    targetTitle: nextPlayable.title ?? null,
    targetArtist: nextPlayable.artist ?? null,
    clusterId: nextPlayable.clusterId ?? null,
  };
}

export function getProgressPercent(item: QueueLikeItem | null | undefined) {
  if (!item) return 0;
  const pct = Number(item.progressPercent ?? 0);
  if (Number.isFinite(pct)) return Math.max(0, Math.min(100, pct));
  return 0;
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
  const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export function labelForStatus(status?: string | null) {
  const value = String(status || "").toUpperCase();
  if (!value) return "Queued";
  if (value === "PLAYING") return "Playing";
  if (value === "LOADED") return "Loaded";
  if (value === "HELD") return "Paused";
  if (value === "PLAYED") return "Done";
  return value.charAt(0) + value.slice(1).toLowerCase();
}
