"use client";

import StatusBadge from "./StatusBadge";
import { getStatusTone, isInterstitial } from "./booth-utils";
import type { QueueLikeItem } from "./types";

export default function QueueItemRow({
  item,
  compact = false,
}: {
  item: QueueLikeItem;
  compact?: boolean;
}) {
  const interstitial = isInterstitial(item);
  const tone = getStatusTone(item.status);

  return (
    <div
      className={`boothQueueRow ${interstitial ? "boothQueueRow--system" : ""} ${compact ? "boothQueueRow--compact" : ""}`}
    >
      <div className="boothQueueRowLeft">
        <div className="boothQueueIndex">{item.position ?? item.sortOrder ?? "—"}</div>

        <div className={`boothQueueArt ${interstitial ? "boothQueueArt--system" : ""}`} />

        <div className="boothQueueMain">
          <div className="boothQueueTitleLine">
            <div className="boothQueueTitle">{item.title || "Untitled"}</div>

            {interstitial ? (
              <StatusBadge label="SYSTEM / INTERSTITIAL" tone="pink" />
            ) : (
              <StatusBadge label={String(item.status || "QUEUED")} tone={tone} />
            )}
          </div>

          <div className="boothQueueMeta">
            {item.artist || "Unknown artist"}
            {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
            {item.clusterId ? ` • Cluster ${item.clusterId}` : ""}
          </div>
        </div>
      </div>

      <div className="boothQueueRowRight">
        {!interstitial ? (
          <StatusBadge label="DRAGGABLE SONG" tone="cyan" />
        ) : (
          <StatusBadge label="LOCKED" tone="muted" />
        )}
      </div>
    </div>
  );
}
