"use client";

import QueueItemRow from "./QueueItemRow";
import type { BoothMode, QueueLikeItem } from "./types";

export default function QueueList({
  items,
  mode,
  onLoad,
  onPlay,
  onPause,
  onSkip,
}: {
  items: QueueLikeItem[];
  mode: BoothMode;
  onLoad?: (id: string) => void;
  onPlay?: (id: string) => void;
  onPause?: (id: string) => void;
  onSkip?: (id: string) => void;
}) {
  return (
    <div className="queueListShell">
      <div className="queueListHeader">
        <div className="queueListTitle">Live Queue</div>
        <div className="queueListSub">Reorder mode</div>
      </div>
      <div className="queueListHelp">Drag songs to change play order. System inserts stay locked.</div>
      <div className="queueToolbar">
        <button className="gunmetalBtn gunmetalBtn--neutral" type="button">CANCEL</button>
        <button className="gunmetalBtn gunmetalBtn--primary" type="button">SAVE ORDER</button>
      </div>
      <div className="queueListScroller">
        {items.map((item) => (
          <QueueItemRow
            key={item.id}
            item={item}
            mode={mode}
            onLoad={onLoad}
            onPlay={onPlay}
            onPause={onPause}
            onSkip={onSkip}
          />
        ))}
      </div>
    </div>
  );
}
