"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import {
  formatDuration,
  getAllowedActions,
  getStatusTone,
  isInterstitial,
} from "./booth-utils";
import type { BoothActionName, BoothMode, QueueLikeItem } from "./types";

type QueueItemRowProps = {
  item: QueueLikeItem;
  mode?: BoothMode;
  busyKey?: string | null;
  onLoad?: (queueItemId: string) => void | Promise<void>;
  onPlay?: (queueItemId: string) => void | Promise<void>;
  onPause?: (queueItemId: string) => void | Promise<void>;
  onSkip?: (queueItemId: string) => void | Promise<void>;
  onDone?: (queueItemId: string) => void | Promise<void>;
};

export default function QueueItemRow({
  item,
  mode = "visual",
  busyKey,
  onLoad,
  onPlay,
  onPause,
  onSkip,
  onDone,
}: QueueItemRowProps) {
  const isSystem = isInterstitial(item);
  const actions = getAllowedActions(item);

  function handleAction(action: BoothActionName) {
    if (action === "load") return void onLoad?.(item.id);
    if (action === "play") return void onPlay?.(item.id);
    if (action === "pause") return void onPause?.(item.id);
    if (action === "skip") return void onSkip?.(item.id);
    if (action === "done") return void onDone?.(item.id);
  }

  return (
    <div className={`boothQueueRow ${isSystem ? "boothQueueRow--system" : ""} ${mode === "performance" ? "is-compact" : ""}`}>
      <div className="boothQueueRowLeft">
        <div className="boothQueueIndex">{item.position ?? "—"}</div>

        <div className={`boothQueueArt ${isSystem ? "boothQueueArt--system" : ""}`}>
          {item.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.artworkUrl} alt={item.title || "Artwork"} className="boothHeroArtImg" />
          ) : (
            <div className="boothHeroArtFallback">{(item.artist || item.title || "RM").slice(0, 2).toUpperCase()}</div>
          )}
        </div>

        <div className="boothQueueMain">
          <div className="boothQueueTitleLine">
            <div className="boothQueueTitle">{item.title || "Untitled"}</div>
            {isSystem ? (
              <StatusBadge label="System" tone="pink" />
            ) : (
              <StatusBadge label={String(item.status || "QUEUED")} tone={getStatusTone(item.status)} />
            )}
          </div>

          <div className="boothQueueMeta">
            {item.artist || "Unknown artist"}
            {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
          </div>

          <div className="boothQueueAux">
            {typeof item.durationSec === "number" ? <span className="boothMiniMeta">{formatDuration(item.durationSec)}</span> : null}
            {item.clusterId ? <span className="boothMiniMeta">Cluster {item.clusterId}</span> : null}
            {item.boosted ? <StatusBadge label="Boost" tone="gold" /> : null}
          </div>
        </div>
      </div>

      <BoothActionButtons
        actions={actions}
        busyKey={`${item.id}:`}
        activeBusyKey={busyKey}
        compact={mode === "performance"}
        onAction={handleAction}
      />
    </div>
  );
}
