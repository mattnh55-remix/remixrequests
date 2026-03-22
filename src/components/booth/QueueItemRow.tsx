"use client";

import BoothActionButtons from "./BoothActionButtons";
import { formatDuration, getStatusTone, isInterstitial } from "./booth-utils";
import type { BoothMode, QueueLikeItem } from "./types";

export default function QueueItemRow({
  item,
  mode,
  onLoad,
  onPlay,
  onPause,
  onSkip,
}: {
  item: QueueLikeItem;
  mode: BoothMode;
  onLoad?: (id: string) => void;
  onPlay?: (id: string) => void;
  onPause?: (id: string) => void;
  onSkip?: (id: string) => void;
}) {
  const locked = isInterstitial(item);
  const compact = mode === "performance";

  return (
    <div className={`queueRow ${compact ? "queueRow--compact" : ""} ${locked ? "queueRow--locked" : ""}`}>
      <div className="queueIndex">{item.position ?? item.sortOrder ?? "—"}</div>
      <div className="queueMedia">{item.artworkUrl ? <img src={item.artworkUrl} alt={item.title || "art"} /> : <div className="queueMediaPlaceholder" />}</div>
      <div className="queueText">
        <div className="queueTitleLine">
          <strong className="queueTitle">{item.title}</strong>
          <span className={`statusPill statusPill--${getStatusTone(item.status)}`}>{locked ? "SYSTEM" : item.status || "QUEUED"}</span>
        </div>
        <div className="queueMeta">{item.artist} {item.requestedByLabel ? `• ${item.requestedByLabel}` : ""}</div>
      </div>
      <div className="queueDuration">{formatDuration(item.durationSec)}</div>
      <div className="queueControls">
        {locked ? (
          <div className="statusPill statusPill--muted">LOCKED</div>
        ) : (
          <BoothActionButtons
            compact={compact}
            actions={[
              { name: "load", onClick: () => onLoad?.(item.id) },
              { name: "play", onClick: () => onPlay?.(item.id) },
              { name: "pause", onClick: () => onPause?.(item.id) },
              { name: "skip", onClick: () => onSkip?.(item.id) },
            ]}
          />
        )}
      </div>
    </div>
  );
}
