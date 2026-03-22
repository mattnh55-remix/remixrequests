import type { BoothActionName, QueueLikeItem } from "./types";

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

  const sourceType = String(
    (item as QueueLikeItem & { sourceType?: string | null }).sourceType || ""
  ).toUpperCase();

  const type = String(
    (
      item as QueueLikeItem & {
        itemType?: string | null;
        type?: string | null;
      }
    ).itemType ||
      (item as QueueLikeItem & { type?: string | null }).type ||
      ""
  ).toUpperCase();

  return (
    sourceType === "INTERSTITIAL" ||
    type.includes("INTERSTITIAL") ||
    type.includes("SYSTEM")
  );
}

export function getAllowedActions(
  item: QueueLikeItem | null
): BoothActionName[] {
  if (!item) return [];

  const status = String(item.status || "").toUpperCase();
  const isSystem = isInterstitial(item);

  if (isSystem) return [];

  if (status === "PLAYING") {
    return ["pause", "skip", "done"];
  }

  if (status === "LOADED") {
    return ["play", "pause", "skip"];
  }

  if (status === "QUEUED") {
    return ["load", "play", "pause", "skip"];
  }

  if (status === "HELD") {
    return ["play", "skip"];
  }

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

  if (value === "PLAYING") return "cyan";
  if (value === "LOADED") return "pink";
  if (value === "HELD") return "gold";
  if (value === "SKIPPED") return "warn";
  if (value === "PLAYED") return "muted";
  return "default";
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

  const direct = Number(
    (item as QueueLikeItem & { progressPercent?: number | null }).progressPercent
  );

  if (Number.isFinite(direct) && direct >= 0) {
    return Math.max(0, Math.min(100, direct));
  }

  const elapsedSec = Number(
    (item as QueueLikeItem & { elapsedSec?: number | null }).elapsedSec
  );
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
    requestedByLabel:
      item.requestedByLabel ?? item.request?.requestedByLabel ?? null,
    boosted: Boolean(item.boosted ?? false),
    artworkUrl: item.artworkUrl ?? item.request?.song?.artworkUrl ?? null,
  }));
}

export function queueSummary(queue: QueueLikeItem[]) {
  return {
    total: queue.length,
    songs: queue.filter((item) => !isInterstitial(item)).length,
    interstitials: queue.filter((item) => isInterstitial(item)).length,
  };
}