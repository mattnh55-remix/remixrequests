type QueueLike = {
  id: string;
  status: string;
  sourceType?: string | null;
  requestId?: string | null;
};

type SearchLike = {
  id: string;
};

export function canReorderBoothItem(item: QueueLike) {
  if (!item) return false;
  if (item.status !== "QUEUED") return false;
  if (item.sourceType === "INTERSTITIAL") return false;
  return true;
}

export function canShowBoothSearchActions(result: SearchLike) {
  return Boolean(result?.id);
}
