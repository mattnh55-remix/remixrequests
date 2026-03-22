"use client";

import QueueItemRow from "./QueueItemRow";
import type { QueueLikeItem } from "./types";

export default function QueueList({ items }: { items: QueueLikeItem[] }) {
  return (
    <div className="boothQueueList">
      {items.length === 0 ? (
        <div className="boothEmptyState">Queue feed is empty.</div>
      ) : (
        items.map((item) => <QueueItemRow key={item.id} item={item} />)
      )}
    </div>
  );
}
