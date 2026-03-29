"use client";

import QueueItemRow from "./QueueItemRow";
import type { BoothMode, QueueLikeItem } from "./types";

type QueueListProps = {
  items: QueueLikeItem[];
  mode?: BoothMode;
  onPlayed?: (requestId: string) => void | Promise<void>;
  onReject?: (requestId: string, reason: string) => void | Promise<void>;
};

export default function QueueList({ items, mode, onPlayed, onReject }: QueueListProps) {
  return (
    <div className="queueListShell">
      <div className="queueListHeader">
        <div>
          <div className="queueListTitle">Up Next</div>
          <div className="queueListSub">DJ decision queue. Play or reject requests below.</div>
        </div>
        <div className="queueListHelp">
          {items.length} item{items.length === 1 ? "" : "s"}
        </div>
      </div>

      {items.length ? (
        <div className="queueListScroller">
          {items.map((item, index) => (
            <QueueItemRow
              key={item.id}
              item={{ ...item, position: index + 1 } as any}
              mode={mode}
              onPlayed={onPlayed}
              onReject={onReject}
            />
          ))}
        </div>
      ) : (
        <div className="emptyBox">No queued requests.</div>
      )}
    </div>
  );
}
