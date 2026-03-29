"use client";

import { useState } from "react";
import QueueItemRow from "./QueueItemRow";
import type { QueueLikeItem } from "./types";

type QueueListProps = {
  items: QueueLikeItem[];
  onPlayed?: (requestId: string) => void | Promise<void>;
  onReject?: (requestId: string) => void | Promise<void>;
};

export default function QueueList({ items, onPlayed, onReject }: QueueListProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"played" | "reject" | null>(null);

  return (
    <div className="queueListShell queueListShell--decision">
      <div className="queueListHeader">
        <div>
          <div className="queueListTitle">Up Next</div>
          <div className="queueListSub">DJ decision queue. Play or reject requests below.</div>
        </div>
        <div className="queueListHelp">{items.length} item{items.length === 1 ? "" : "s"}</div>
      </div>

      {items.length ? (
        <div className="queueListScroller queueListScroller--decision">
          {items.map((item) => (
            <QueueItemRow
              key={item.id}
              item={item}
              busy={busyKey === item.id ? busyAction : null}
              onPlayed={async (requestId) => {
                setBusyKey(item.id);
                setBusyAction("played");
                try {
                  await onPlayed?.(requestId);
                } finally {
                  setBusyKey(null);
                  setBusyAction(null);
                }
              }}
              onReject={async (requestId) => {
                setBusyKey(item.id);
                setBusyAction("reject");
                try {
                  await onReject?.(requestId);
                } finally {
                  setBusyKey(null);
                  setBusyAction(null);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="emptyBox">No request rows yet.</div>
      )}
    </div>
  );
}
