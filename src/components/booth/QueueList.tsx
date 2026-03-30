"use client";

import { useEffect, useMemo, useState } from "react";
import QueueItemRow from "./QueueItemRow";
import type { BoothMode, QueueLikeItem } from "./types";

type QueueListProps = {
  items: QueueLikeItem[];
  location?: string;
  mode?: BoothMode;
  onPlayed?: (requestId: string) => void | Promise<void>;
  onReject?: (requestId: string, reason: string) => void | Promise<void>;
  onReordered?: () => void | Promise<void>;
};

function reorderItems(list: QueueLikeItem[], sourceId: string, targetId: string) {
  if (!sourceId || !targetId || sourceId === targetId) return list;
  const next = [...list];
  const fromIndex = next.findIndex((item) => item.id === sourceId);
  const toIndex = next.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || toIndex < 0) return list;

  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return next.map((item, index) => ({ ...item, position: index + 1 }));
}

export default function QueueList({
  items,
  location,
  mode,
  onPlayed,
  onReject,
  onReordered,
}: QueueListProps) {
  const [localItems, setLocalItems] = useState<QueueLikeItem[]>(items);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const orderedItems = useMemo(() => {
    return [...localItems].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  }, [localItems]);

  async function persistOrder(nextItems: QueueLikeItem[]) {
    if (!location) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/queue/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          location,
          orderedQueueItemIds: nextItems.map((item) => item.id),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Could not save queue order.");
      }

      await onReordered?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save queue order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="queueListShell">
      <div className="queueListHeader">
        <div>
          <div className="queueListTitle">Pending Requests</div>
          <div className="queueListSub">Approved customer requests and DJ-added songs. Drag to reorder.</div>
        </div>
        <div className="queueListHelp">
          {saving ? "Saving…" : `${orderedItems.length} item${orderedItems.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {error ? <div className="queueListError">{error}</div> : null}

      <div className="queueListScroller">
        {orderedItems.length ? (
          orderedItems.map((item) => (
            <QueueItemRow
              key={item.id}
              item={item}
              mode={mode}
              isDragging={activeDragId === item.id}
              onPlayed={onPlayed}
              onReject={onReject}
              onDragStart={(queueItemId) => setActiveDragId(queueItemId)}
              onDragOver={(targetId) => {
                if (!activeDragId || activeDragId === targetId) return;
                setLocalItems((prev) => reorderItems(prev, activeDragId, targetId));
              }}
              onDrop={async () => {
                const nextItems = [...orderedItems].sort(
                  (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0)
                );
                setActiveDragId(null);
                await persistOrder(nextItems);
              }}
              onDragEnd={() => setActiveDragId(null)}
            />
          ))
        ) : (
          <div className="emptyBox">No approved requests in the pending queue.</div>
        )}
      </div>

      <style jsx>{`
        .queueListError {
          margin: 0 12px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 120, 120, 0.2);
          background: rgba(255, 120, 120, 0.08);
          color: #ffd0d0;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
