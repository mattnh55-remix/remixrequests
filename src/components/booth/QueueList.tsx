"use client";

import { useMemo, useState } from "react";
import QueueItemRow from "./QueueItemRow";
import type { QueueLikeItem } from "./types";
import { isInterstitial } from "./booth-utils";

type Props = {
  items: QueueLikeItem[];
  compactMode: boolean;
  onAction: (action: "load" | "play" | "pause" | "skip" | "done", itemId: string) => void;
  onSaveReorder: (orderedQueuedItemIds: string[]) => void;
};

export default function QueueList({ items, compactMode, onAction, onSaveReorder }: Props) {
  const songItems = useMemo(() => items.filter((item) => !isInterstitial(item)), [items]);
  const [ordered, setOrdered] = useState(songItems.map((item) => item.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const orderedSongItems = ordered
    .map((id) => songItems.find((item) => item.id === id))
    .filter(Boolean) as QueueLikeItem[];

  const dirty = ordered.join("|") !== songItems.map((item) => item.id).join("|");

  function move(id: string, dir: -1 | 1) {
    const current = [...ordered];
    const index = current.indexOf(id);
    if (index < 0) return;
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= current.length) return;
    [current[index], current[nextIndex]] = [current[nextIndex], current[index]];
    setOrdered(current);
  }

  return (
    <section className="queueBlock">
      <div className="sectionLabel">Live Queue</div>
      <div className="sectionSub">Reorder mode</div>
      <div className="queueModeCopy">Drag songs to change play order. System inserts stay locked.</div>
      <div className="queueModeCopy queueModeCopy--small">{songItems.length} songs ready to move</div>

      <div className="reorderBar">
        <button type="button" className="gunBtn gunBtn--secondary" disabled={!dirty} onClick={() => setOrdered(songItems.map((item) => item.id))}>Cancel</button>
        <button type="button" className="gunBtn gunBtn--primary" disabled={!dirty} onClick={() => onSaveReorder(ordered)}>Save Order</button>
      </div>

      <div className="queueListRows">
        {orderedSongItems.map((item) => (
          <div key={item.id} className="queueLinearWrap">
            <QueueItemRow item={item} compactMode={compactMode} dragging={draggingId === item.id} onAction={onAction} />
            <div className="reorderNudges">
              <button type="button" className="nudgeBtn" onClick={() => move(item.id, -1)}>↑</button>
              <button type="button" className="nudgeBtn" onClick={() => move(item.id, 1)}>↓</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
