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

export async function fetchFirstJson(urls: string[]) {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });

      if (!res.ok) continue;

      const data = await safeJson(res);
      if (data) return { ok: true as const, url, data };
    } catch {
      // ignore and try next
    }
  }

  return { ok: false as const, url: null, data: null };
}

export function isInterstitial(item: QueueLikeItem | null | undefined) {
  if (!item) return false;
  const sourceType = String(item.sourceType || "").toUpperCase();
  const type = String(item.type || "").toUpperCase();
  return (
    sourceType === "INTERSTITIAL" ||
    type.includes("INTERSTITIAL") ||
    type.includes("SYSTEM")
  );
}

export function normalizeQueue(payload: any): QueueLikeItem[] {
  if (!payload) return [];

  const candidates = [
    payload.queueItems,
    payload.queue,
    payload.items,
    payload.upNext,
    payload.pending,
  ];

  const firstArray = candidates.find(Array.isArray);
  if (!Array.isArray(firstArray)) return [];

  return firstArray.map((item: any, idx: number) => ({
    id: String(item.id ?? item.requestId ?? `queue-${idx}`),
    requestId: item.requestId ?? null,
    title: item.title ?? item.songTitle ?? item.request?.title ?? "Untitled",
    artist: item.artist ?? item.songArtist ?? item.request?.artist ?? "Unknown artist",
    status: item.status ?? "QUEUED",
    sourceType: item.sourceType ?? item.request?.sourceType ?? null,
    type: item.type ?? item.request?.type ?? null,
    clusterId: item.clusterId ?? null,
    position: item.position ?? item.sortOrder ?? idx + 1,
    sortOrder: item.sortOrder ?? item.position ?? idx + 1,
    durationSec: item.durationSec ?? item.request?.durationSec ?? null,
    runtimeMs: item.runtimeMs ?? null,
    progressPct: item.progressPct ?? null,
    progressPercent: item.progressPercent ?? null,
    elapsedMs: item.elapsedMs ?? null,
    startedAt: item.startedAt ?? item.playStartedAt ?? null,
    createdAt: item.createdAt ?? null,
    requestedByLabel:
      item.requestedByLabel ??
      item.request?.requestedByLabel ??
      item.request?.requestedBy ??
      null,
    boosted: Boolean(item.boosted ?? item.request?.boosted ?? false),
  }));
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

export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function getProgressPercent(item: QueueLikeItem | null | undefined) {
  if (!item) return 0;

  const direct = Number(item.progressPct ?? item.progressPercent);
  if (Number.isFinite(direct) && direct >= 0) {
    return Math.max(0, Math.min(100, direct));
  }

  const elapsedMs = Number(item.elapsedMs);
  const durationSec = Number(item.durationSec);
  if (Number.isFinite(elapsedMs) && Number.isFinite(durationSec) && durationSec > 0) {
    return Math.max(0, Math.min(100, (elapsedMs / (durationSec * 1000)) * 100));
  }

  return 0;
}

export function getStatusTone(status?: string | null) {
  const value = String(status || "").toUpperCase();

  if (value === "PLAYING") return "cyan" as const;
  if (value === "LOADED") return "pink" as const;
  if (value === "HELD") return "gold" as const;
  if (value === "SKIPPED") return "warn" as const;
  if (value === "PLAYED") return "muted" as const;
  return "default" as const;
}
