"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import { formatDuration, getAllowedActions, getStatusTone, isInterstitial } from "./booth-utils";
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

export default function QueueItemRow({ item, busyAction, onLoad, onPlay, onPause, onSkip, onDone }: QueueItemRowProps) {
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
    <div className="queueRow queueRow--dense">
      <div className="queueIndex">{item.position ?? "—"}</div>

      <div className="queueText">
        <div className="queueTitleLine">
          <div className="queueTitle">{item.title || "Untitled"}</div>
          {isSystem ? (
            <StatusBadge label="SYSTEM" tone="pink" />
          ) : (
            <StatusBadge label={String(item.status || "QUEUED")} tone={getStatusTone(item.status) as any} />
          )}
        </div>
        <div className="queueMeta">
          {item.artist || "Unknown artist"}
          {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
          {typeof item.durationSec === "number" ? ` • ${formatDuration(item.durationSec)}` : ""}
        </div>
      </div>

      <div className="queueActions">
        <BoothActionButtons actions={actions} busyAction={busyAction} onAction={handleAction} compact />
      </div>
    </div>
  );
}
