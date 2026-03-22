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
  busyAction?: BoothActionName | null;
  onLoad?: (queueItemId: string) => void | Promise<void>;
  onPlay?: (queueItemId: string) => void | Promise<void>;
  onPause?: (queueItemId: string) => void | Promise<void>;
  onSkip?: (queueItemId: string) => void | Promise<void>;
  onDone?: (queueItemId: string) => void | Promise<void>;
};

export default function QueueItemRow({
  item,
  mode = "visual",
  busyAction,
  onLoad,
  onPlay,
  onPause,
  onSkip,
  onDone,
}: QueueItemRowProps) {
  const isSystem = isInterstitial(item);
  const actions = getAllowedActions(item);

  function handleAction(action: BoothActionName) {
    if (action === "load") {
      void onLoad?.(item.id);
      return;
    }

    if (action === "play") {
      void onPlay?.(item.id);
      return;
    }

    if (action === "pause") {
      void onPause?.(item.id);
      return;
    }

    if (action === "skip") {
      void onSkip?.(item.id);
      return;
    }

    if (action === "done") {
      void onDone?.(item.id);
      return;
    }
  }

  return (
    <div
      className={`boothQueueRow ${
        isSystem ? "boothQueueRow--system" : ""
      } ${mode === "performance" ? "is-compact" : ""}`}
    >
      <div className="boothQueueRowLeft">
        <div className="boothQueueIndex">{item.position ?? "—"}</div>

        <div className={`boothQueueArt ${isSystem ? "boothQueueArt--system" : ""}`}>
          {item.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.artworkUrl}
              alt={item.title || "Artwork"}
              className="boothHeroArtImg"
            />
          ) : (
            <div className="boothHeroArtFallback">
              {(item.artist || item.title || "RM").slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="boothQueueMain">
          <div className="boothQueueTitleLine">
            <div className="boothQueueTitle">{item.title || "Untitled"}</div>

            {isSystem ? (
              <StatusBadge label="SYSTEM" tone="pink" />
            ) : (
              <StatusBadge
                label={String(item.status || "QUEUED")}
                tone={getStatusTone(item.status) as any}
              />
            )}
          </div>

          <div className="boothQueueMeta">
            {item.artist || "Unknown artist"}
            {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
            {typeof item.durationSec === "number" ? ` • ${formatDuration(item.durationSec)}` : ""}
          </div>
        </div>
      </div>

      <div className="boothQueueRowRight">
        <BoothActionButtons
          actions={actions}
          busyAction={busyAction}
          onAction={handleAction}
        />
      </div>
    </div>
  );
}