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

export default function QueueList({ items, busyAction, onLoad, onPlay, onPause, onSkip, onDone }: QueueListProps) {
  return (
    <div className="queueListShell">
      <div className="queueListHeader">
        <div>
          <div className="queueListTitle">Queue Feed</div>
          <div className="queueListSub">Live playable order below the deck slot.</div>
        </div>
        <div className="queueListHelp">{items.length} item{items.length === 1 ? "" : "s"}</div>
      </div>

      {items.length ? (
        <div className="queueListScroller">
          {items.map((item) => (
            <QueueItemRow
              key={item.id}
              item={item}
              busyAction={busyAction}
              onLoad={onLoad}
              onPlay={onPlay}
              onPause={onPause}
              onSkip={onSkip}
              onDone={onDone}
            />
          ))}
        </div>
      ) : (
        <div className="emptyBox">No additional queue items.</div>
      )}
    </div>
  );
}
