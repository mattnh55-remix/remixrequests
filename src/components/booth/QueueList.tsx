"use client";

import QueueItemRow from "./QueueItemRow";
import type { BoothMode, QueueLikeItem } from "./types";

type QueueListProps = {
  items: QueueLikeItem[];
  mode?: BoothMode;
  busyKey?: string | null;
  onLoad?: (queueItemId: string) => void | Promise<void>;
  onPlay?: (queueItemId: string) => void | Promise<void>;
  onPause?: (queueItemId: string) => void | Promise<void>;
  onSkip?: (queueItemId: string) => void | Promise<void>;
  onDone?: (queueItemId: string) => void | Promise<void>;
};

export default function QueueList({
  items,
  mode = "visual",
  busyKey,
  onLoad,
  onPlay,
  onPause,
  onSkip,
  onDone,
}: QueueListProps) {
  return (
    <div>
      <div className="boothQueueSectionHead">
        <div className="boothQueueSectionTitle">Queue Feed</div>
        <div className="boothQueueSectionCount">{items.length} items</div>
      </div>

      {items.length ? (
        <div className="boothQueueList">
          {items.map((item) => (
            <QueueItemRow
              key={item.id}
              item={item}
              mode={mode}
              busyKey={busyKey}
              onLoad={onLoad}
              onPlay={onPlay}
              onPause={onPause}
              onSkip={onSkip}
              onDone={onDone}
            />
          ))}
        </div>
      ) : (
        <div className="boothEmptyState">Queue feed is empty.</div>
      )}
    </div>
  );
}
