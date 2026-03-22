"use client";

import BoothActionButtons from "./BoothActionButtons";
import type { QueueLikeItem } from "./types";
import { isInterstitial, labelForStatus } from "./booth-utils";

type Props = {
  item: QueueLikeItem;
  compactMode: boolean;
  dragging?: boolean;
  onAction: (action: "load" | "play" | "pause" | "skip" | "done", itemId: string) => void;
};

export default function QueueItemRow({ item, compactMode, dragging = false, onAction }: Props) {
  const system = isInterstitial(item);

  return (
    <div className={`queueRow ${system ? "queueRow--system" : ""} ${dragging ? "queueRow--dragging" : ""}`} draggable={!system}>
      <div className="queueRowLeft">
        <div className="queueIndex">{item.position ?? "—"}</div>
        {item.artworkUrl ? <img src={item.artworkUrl} alt={item.title || "Artwork"} className="queueArt" /> : <div className="queueArt queueArt--fallback" />}
        <div className="queueText">
          <div className="queueTitleLine">
            <strong className="queueTitle">{item.title || "Untitled"}</strong>
            <span className={`rowPill ${system ? "rowPill--system" : "rowPill--queue"}`}>{system ? "System" : labelForStatus(item.status)}</span>
            {!system ? <span className="dragToken">Drag Song</span> : null}
          </div>
          <div className="queueMeta">{item.artist || "Unknown artist"}{item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}</div>
        </div>
      </div>

      <div className="queueRowRight">
        {!system ? <BoothActionButtons itemId={item.id} status={item.status} onAction={onAction} compact={compactMode} /> : <span className="systemLock">Locked</span>}
      </div>
    </div>
  );
}
