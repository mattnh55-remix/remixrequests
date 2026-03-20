// LIB QUEUE RULES

type QueueItem = {
  id: string;
  position: number;
  status: string;
  createdAt: string;
};

export function deriveBoothSections(items: any[]) {
  const playing = items.find((i) => i.status === "PLAYING") || null;
  const loaded = items.find((i) => i.status === "LOADED") || null;

  const queued = items
    .filter((i) => i.status === "QUEUED")
    .sort(sortQueue);

  const held = items
    .filter((i) => i.status === "HELD")
    .sort(sortQueue);

  const history = items
    .filter((i) => i.status === "PLAYED" || i.status === "SKIPPED")
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));

  const nextUp = loaded || queued[0] || null;

  return {
    playing,
    loaded,
    nextUp,
    queued,
    held,
    history,
  };
}

function sortQueue(a: QueueItem, b: QueueItem) {
  if (a.position !== b.position) return a.position - b.position;
  if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
  return a.id.localeCompare(b.id);
}