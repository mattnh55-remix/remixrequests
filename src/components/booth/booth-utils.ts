import type {
  BoothActionName,
  QueueLikeItem,
  RequestActionName,
  RequestItem,
  RuntimePreview,
  ShoutoutActionName,
  ShoutoutItem,
} from "./types";

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

export async function postJson(url: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await safeJson(res);
    return {
      ok: res.ok,
      status: res.status,
      url,
      data,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      url,
      data: null,
    };
  }
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
    type: item.itemType ?? item.type ?? item.request?.type ?? null,
    clusterId: item.clusterId ?? null,
    position: item.position ?? item.sortOrder ?? idx + 1,
    sortOrder: item.sortOrder ?? item.position ?? idx + 1,
    durationSec: item.durationSec ?? item.request?.durationSec ?? null,
    runtimeMs: item.runtimeMs ?? null,
    progressPct: item.progressPct ?? null,
    progressPercent: item.progressPercent ?? null,
    elapsedMs: item.elapsedMs ?? null,
    elapsedSec: item.elapsedSec ?? null,
    remainingSec: item.remainingSec ?? null,
    isEndingSoon: Boolean(item.isEndingSoon ?? false),
    startedAt: item.startedAt ?? item.playStartedAt ?? null,
    expectedEndAt: item.expectedEndAt ?? null,
    createdAt: item.createdAt ?? null,
    requestedByLabel:
      item.requestedByLabel ?? item.request?.requestedByLabel ?? item.request?.requestedBy ?? null,
    boosted: Boolean(item.boosted ?? item.request?.boosted ?? false),
    artworkUrl: item.artworkUrl ?? item.request?.song?.artworkUrl ?? null,
  }));
}

export function normalizeRequests(payload: any): RequestItem[] {
  if (!payload) return [];

  const playNow = Array.isArray(payload.playNow) ? payload.playNow : [];
  const upNext = Array.isArray(payload.upNext) ? payload.upNext : [];

  return [
    ...playNow.map((item: any) => ({
      id: String(item.id),
      title: item.title ?? item.song?.title ?? "Untitled",
      artist: item.artist ?? item.song?.artist ?? "Unknown artist",
      score: Number(item.score ?? 0),
      type: item.type ?? "PLAY_NOW",
      boosted: Boolean(item.boosted ?? false),
      requestedByLabel: item.requestedByLabel ?? null,
      sortBucket: "PLAY_NOW" as const,
    })),
    ...upNext.map((item: any) => ({
      id: String(item.id),
      title: item.title ?? item.song?.title ?? "Untitled",
      artist: item.artist ?? item.song?.artist ?? "Unknown artist",
      score: Number(item.score ?? 0),
      type: item.type ?? "NEXT",
      boosted: Boolean(item.boosted ?? false),
      requestedByLabel: item.requestedByLabel ?? null,
      sortBucket: "UP_NEXT" as const,
    })),
  ];
}

export function normalizeShoutouts(payload: any) {
  const pendingShoutouts: ShoutoutItem[] = Array.isArray(payload?.pending)
    ? payload.pending.map((item: any) => ({
        id: String(item.id),
        fromName: item.fromName ?? "Guest",
        messageText: item.messageText ?? "",
        tier: item.tier ?? "",
        status: item.status ?? "PENDING",
        createdAt: item.createdAt ?? null,
      }))
    : [];

  const approvedShoutouts: ShoutoutItem[] = Array.isArray(payload?.approved)
    ? payload.approved.map((item: any) => ({
        id: String(item.id),
        fromName: item.fromName ?? "Guest",
        messageText: item.messageText ?? "",
        tier: item.tier ?? "",
        status: item.status ?? "APPROVED",
        createdAt: item.createdAt ?? null,
      }))
    : [];

  return { pendingShoutouts, approvedShoutouts };
}

export function deriveRuntimePreview(queue: QueueLikeItem[]): RuntimePreview | null {
  const playable = queue.filter((item) => {
    const status = String(item.status || "").toUpperCase();
    return status === "LOADED" || status === "QUEUED";
  });

  if (playable.length === 0) {
    return {
      mode: "idle",
      action: "NO_ACTION",
      reason: "NO_PLAYABLE_QUEUE_ITEM",
    };
  }

  const firstPlayable = playable[0];
  const prev = queue.find((item) => item.position === (firstPlayable.position ?? 0) - 1);

  if (prev && isInterstitial(prev)) {
    return {
      mode: "derived",
      action: "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM",
      reason: "MATERIALIZED_IN_QUEUE",
      targetQueueItemId: firstPlayable.id,
      targetTitle: firstPlayable.title ?? null,
      targetArtist: firstPlayable.artist ?? null,
      interstitialTitle: prev.title ?? "Materialized interstitial",
      interstitialAssetId: prev.clusterId ?? null,
      clusterId: prev.clusterId ?? null,
    };
  }

  return {
    mode: "derived",
    action: "PLAY_QUEUE_ITEM",
    reason: "DIRECT_PLAY",
    targetQueueItemId: firstPlayable.id,
    targetTitle: firstPlayable.title ?? null,
    targetArtist: firstPlayable.artist ?? null,
  };
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
  const orderedQueuedItemIds = items.filter((item) => isSongDraggable(item)).map((item) => item.id);

  return {
    location,
    orderedQueuedItemIds,
  };
}

export function buildQueueActionPayload(item: QueueLikeItem) {
  return {
    queueItemId: item.id,
  };
}

export async function performQueueAction(location: string, item: QueueLikeItem, action: BoothActionName) {
  const payload = buildQueueActionPayload(item);
  const endpointMap: Record<BoothActionName, string> = {
    load: "/api/booth/queue/mark-loaded",
    play: "/api/booth/queue/mark-playing",
    hold: "/api/booth/queue/hold",
    skip: "/api/booth/queue/skip",
    played: "/api/booth/queue/mark-played",
  };

  const result = await postJson(endpointMap[action], payload);

  if (result.ok) {
    return {
      ok: true,
      action,
      message: `${formatActionLabel(action)} sent for ${item.title || "queue item"}.`,
      url: result.url,
    };
  }

  return {
    ok: false,
    action,
    message: `${formatActionLabel(action)} failed for ${item.title || "queue item"}.`,
    url: result.url,
  };
}

export async function triggerMaterialize(location: string) {
  return postJson(`/api/booth/runtime/materialize-next/${location}`, {});
}

export async function performRequestAction(item: RequestItem, action: RequestActionName) {
  const endpointMap: Record<RequestActionName, string> = {
    reject: "/api/admin/queue/reject",
    played: "/api/admin/queue/played",
  };

  const result = await postJson(endpointMap[action], {
    requestId: item.id,
  });

  return {
    ok: result.ok,
    action,
    message: result.ok
      ? `${formatRequestActionLabel(action)} sent for ${item.title || "request"}.`
      : `${formatRequestActionLabel(action)} failed for ${item.title || "request"}.`,
    url: result.url,
  };
}

export async function performShoutoutAction(item: ShoutoutItem, action: ShoutoutActionName) {
  const endpointMap: Record<ShoutoutActionName, string> = {
    approve: "/api/admin/shoutouts/approve",
    reject: "/api/admin/shoutouts/reject",
  };

  const payload = action === "approve" ? { messageId: item.id } : { messageId: item.id, note: "Rejected from booth UI" };
  const result = await postJson(endpointMap[action], payload);

  return {
    ok: result.ok,
    action,
    message: result.ok
      ? `${formatShoutoutActionLabel(action)} sent for ${item.fromName || "shoutout"}.`
      : `${formatShoutoutActionLabel(action)} failed for ${item.fromName || "shoutout"}.`,
    url: result.url,
  };
}

export function formatActionLabel(action: BoothActionName) {
  if (action === "played") return "Mark Played";
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function formatRequestActionLabel(action: RequestActionName) {
  if (action === "played") return "Mark Played";
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function formatShoutoutActionLabel(action: ShoutoutActionName) {
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
    if (action === "play") return { ...item, status: "PLAYING", progressPercent: 0, elapsedSec: 0 };
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

  const elapsedSec = Number(item.elapsedSec);
  const durationSec = Number(item.durationSec);
  if (Number.isFinite(elapsedSec) && Number.isFinite(durationSec) && durationSec > 0) {
    return Math.max(0, Math.min(100, (elapsedSec / durationSec) * 100));
  }

  const elapsedMs = Number(item.elapsedMs);
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
