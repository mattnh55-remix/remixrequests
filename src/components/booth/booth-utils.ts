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

export async function postFirstJson(urls: string[], body: Record<string, unknown>) {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) continue;

      const data = await safeJson(res);
      return { ok: true as const, url, data };
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
  return sourceType === "INTERSTITIAL" || type.includes("INTERSTITIAL") || type.includes("SYSTEM");
}

export function isSongDraggable(item: QueueLikeItem | null | undefined) {
  if (!item) return false;
  const status = String(item.status || "").toUpperCase();
  if (isInterstitial(item)) return false;
  if (status === "PLAYING" || status === "PLAYED" || status === "SKIPPED") return false;
  return true;
}

export function normalizeQueue(payload: any): QueueLikeItem[] {
  if (!payload) return [];

  const candidates = [payload.queueItems, payload.queue, payload.items, payload.upNext, payload.pending];
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
      item.requestedByLabel ?? item.request?.requestedByLabel ?? item.request?.requestedBy ?? null,
    boosted: Boolean(item.boosted ?? item.request?.boosted ?? false),
  }));
}

export function renumberQueue(items: QueueLikeItem[]) {
  return items.map((item, idx) => ({
    ...item,
    position: idx + 1,
    sortOrder: idx + 1,
  }));
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

export function reorderSongsOnly(items: QueueLikeItem[], draggedId: string, targetId: string) {
  const fromIndex = items.findIndex((item) => item.id === draggedId);
  const toIndex = items.findIndex((item) => item.id === targetId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return renumberQueue(items);
  }

  const draggedItem = items[fromIndex];
  const targetItem = items[toIndex];

  if (!isSongDraggable(draggedItem) || !isSongDraggable(targetItem)) {
    return renumberQueue(items);
  }

  return renumberQueue(moveItem(items, fromIndex, toIndex));
}

export function buildReorderPayload(location: string, items: QueueLikeItem[]) {
  const orderedQueueItemIds = items.map((item) => item.id);

  return {
    location,
    orderedQueueItemIds,
    queueItemIds: orderedQueueItemIds,
    queue: items.map((item, idx) => ({
      id: item.id,
      queueItemId: item.id,
      requestId: item.requestId ?? null,
      sortOrder: idx + 1,
      position: idx + 1,
      sourceType: item.sourceType ?? null,
      status: item.status ?? null,
    })),
  };
}

export function buildQueueActionPayload(location: string, item: QueueLikeItem, action: BoothActionName) {
  return {
    action,
    location,
    id: item.id,
    queueItemId: item.id,
    requestId: item.requestId ?? null,
    sourceType: item.sourceType ?? null,
    status: item.status ?? null,
    title: item.title ?? null,
    artist: item.artist ?? null,
  };
}

export function getQueueActionUrls(location: string, action: BoothActionName) {
  const map: Record<BoothActionName, string[]> = {
    load: [
      `/api/booth/mark-loaded/${location}`,
      `/api/booth/load/${location}`,
      `/api/booth/queue/mark-loaded/${location}`,
    ],
    play: [
      `/api/booth/mark-playing/${location}`,
      `/api/booth/play/${location}`,
      `/api/booth/queue/mark-playing/${location}`,
    ],
    hold: [
      `/api/booth/hold/${location}`,
      `/api/booth/queue/hold/${location}`,
      `/api/booth/mark-held/${location}`,
    ],
    skip: [
      `/api/booth/skip/${location}`,
      `/api/booth/queue/skip/${location}`,
      `/api/booth/mark-skipped/${location}`,
    ],
    played: [
      `/api/booth/mark-played/${location}`,
      `/api/booth/played/${location}`,
      `/api/booth/queue/mark-played/${location}`,
    ],
  };

  return map[action];
}

export async function performQueueAction(location: string, item: QueueLikeItem, action: BoothActionName) {
  const payload = buildQueueActionPayload(location, item, action);
  const result = await postFirstJson(getQueueActionUrls(location, action), payload);

  if (result.ok) {
    return {
      ok: true,
      action,
      message: `${formatActionLabel(action)} sent.`,
      url: result.url,
    };
  }

  return {
    ok: false,
    action,
    message: `${formatActionLabel(action)} route not found yet. UI stayed safe.`,
    url: result.url,
  };
}

export function formatActionLabel(action: BoothActionName) {
  if (action === "played") return "Mark Played";
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function getAllowedActions(item: QueueLikeItem | null | undefined): BoothActionName[] {
  if (!item) return [];
  const status = String(item.status || "").toUpperCase();

  if (status === "PLAYING") return ["hold", "skip", "played"];
  if (status === "LOADED") return ["play", "hold", "skip"];
  if (status === "HELD") return ["load", "play", "skip"];
  if (status === "QUEUED") return ["load", "play", "hold", "skip"];
  if (status === "SKIPPED" || status === "PLAYED") return [];
  return ["load", "play", "hold", "skip"];
}

export function applyOptimisticAction(items: QueueLikeItem[], targetId: string, action: BoothActionName) {
  return items.map((item) => {
    if (item.id !== targetId) {
      if (action === "play" && String(item.status || "").toUpperCase() === "PLAYING") {
        return { ...item, status: "PLAYED" };
      }
      if (action === "load" && String(item.status || "").toUpperCase() === "LOADED") {
        return { ...item, status: "QUEUED" };
      }
      return item;
    }

    if (action === "load") return { ...item, status: "LOADED" };
    if (action === "play") return { ...item, status: "PLAYING" };
    if (action === "hold") return { ...item, status: "HELD" };
    if (action === "skip") return { ...item, status: "SKIPPED" };
    if (action === "played") return { ...item, status: "PLAYED" };
    return item;
  });
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
