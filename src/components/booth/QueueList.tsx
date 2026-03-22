"use client";

import QueueItemRow from "./QueueItemRow";
import type { BoothActionName, BoothMode, QueueLikeItem } from "./types";

type QueueListProps = {
  items: QueueLikeItem[];
  mode?: BoothMode;
  busyAction?: BoothActionName | null;
  onLoad?: (queueItemId: string) => void | Promise<void>;
  onPlay?: (queueItemId: string) => void | Promise<void>;
  onPause?: (queueItemId: string) => void | Promise<void>;
  onSkip?: (queueItemId: string) => void | Promise<void>;
  onDone?: (queueItemId: string) => void | Promise<void>;
};

export default function QueueList({
  items,
  mode = "visual",
  busyAction,
  onLoad,
  onPlay,
  onPause,
  onSkip,
  onDone,
}: QueueListProps) {
  if (!items.length) {
    return <div className="boothEmptyState">Queue feed is empty.</div>;
  }

  return (
    <div className={`boothQueueList ${mode === "performance" ? "is-compact" : ""}`}>
      {items.map((item) => (
        <QueueItemRow
          key={item.id}
          item={item}
          mode={mode}
          busyAction={busyAction}
          onLoad={onLoad}
          onPlay={onPlay}
          onPause={onPause}
          onSkip={onSkip}
          onDone={onDone}
        />
      ))}
    </div>
  );
}