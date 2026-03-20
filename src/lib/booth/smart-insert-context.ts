type QueueItemLike = {
  id: string;
  status: string;
  sourceType?: string | null;
  introAssigned?: boolean | null;
  clusterId?: string | null;
  position: number;
  createdAt: string;
};

type SmartInsertContext = {
  previousPlayable: QueueItemLike | null;
  currentPlayable: QueueItemLike | null;
  nextPlayable: QueueItemLike | null;
  upcomingPlayable: QueueItemLike[];
  queueDepth: number;
  consecutiveRequestCount: number;
  requestClusterDetected: boolean;
  singleRequestDetected: boolean;
  introAlreadyAssigned: boolean;
};

function sortQueue(a: QueueItemLike, b: QueueItemLike) {
  if (a.position !== b.position) return a.position - b.position;
  if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
  return a.id.localeCompare(b.id);
}

function isPlayable(item: QueueItemLike) {
  return (
    item.status === "QUEUED" ||
    item.status === "LOADED" ||
    item.status === "PLAYING"
  );
}

function isRequestLike(item: QueueItemLike) {
  return item.sourceType === "REQUEST" || item.sourceType === "request";
}

export function buildSmartInsertContext(items: QueueItemLike[]): SmartInsertContext {
  const playable = items.filter(isPlayable).sort(sortQueue);

  const currentPlayable = playable.find((item) => item.status === "PLAYING") || null;
  const loadedPlayable = playable.find((item) => item.status === "LOADED") || null;

  const nextPlayable =
    loadedPlayable ||
    playable.find((item) => item.status === "QUEUED") ||
    null;

  const previousPlayable =
    currentPlayable
      ? playable.filter((item) => item.id !== currentPlayable.id)[0] || null
      : null;

  const upcomingPlayable = playable.filter(
    (item) => item.id !== currentPlayable?.id
  );

  let consecutiveRequestCount = 0;

  for (const item of upcomingPlayable) {
    if (isRequestLike(item)) {
      consecutiveRequestCount += 1;
    } else {
      break;
    }
  }

  const firstUpcoming = upcomingPlayable[0] || null;
  const introAlreadyAssigned = !!firstUpcoming?.introAssigned;

  return {
    previousPlayable,
    currentPlayable,
    nextPlayable,
    upcomingPlayable,
    queueDepth: playable.filter((item) => item.status === "QUEUED").length,
    consecutiveRequestCount,
    requestClusterDetected: consecutiveRequestCount >= 2,
    singleRequestDetected: consecutiveRequestCount === 1,
    introAlreadyAssigned,
  };
}