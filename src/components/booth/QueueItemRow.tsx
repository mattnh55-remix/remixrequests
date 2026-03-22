"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import {
  getAllowedActions,
  getStatusTone,
  isBoostedLike,
  isInterstitial,
  isRequestLike,
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

export default function QueueItemRow({ item, busyAction, onLoad, onPlay, onPause, onSkip, onDone }: QueueItemRowProps) {
  const isSystem = isInterstitial(item);
  const isHouse = item.sourceType === "HOUSE";
  const isRequest = isRequestLike(item) && !isSystem && !isHouse;
  const isBoosted = isBoostedLike(item) && !isSystem;
  const actions = getAllowedActions(item);

  function handleAction(action: BoothActionName) {
    if (action === "load") return void onLoad?.(item.id);
    if (action === "play") return void onPlay?.(item.id);
    if (action === "pause") return void onPause?.(item.id);
    if (action === "skip") return void onSkip?.(item.id);
    if (action === "done") return void onDone?.(item.id);
  }

  return (
    <div className={`queueRow queueRow--dense ${isRequest ? "queueRow--request" : ""} ${isBoosted ? "queueRow--boosted" : ""}`}>
      <div className="queueIndex">{item.position ?? "—"}</div>

      <div className="queueText">
        <div className="queueTitleLine">
          <div className="queueTitle">{item.title || "Untitled"}</div>
          {isBoosted ? <StatusBadge label="BOOSTED" tone="boost" /> : null}
          {isRequest ? <StatusBadge label="REQUEST" tone="alert" /> : null}
          {isSystem ? (
            <StatusBadge label="SYSTEM" tone="pink" />
          ) : (
            <StatusBadge label={String(item.status || "QUEUED")} tone={getStatusTone(item.status)} />
          )}
        </div>

        <div className="queueMeta">
          <span className="queueMetaStrong">{item.artist || "Unknown artist"}</span>
          {item.requestedByLabel ? <span> • {item.requestedByLabel}</span> : null}
          {item.verified ? <span> • VERIFIED</span> : null}
          {typeof item.upvotes === "number" ? <span> • 👍 {item.upvotes}</span> : null}
          {typeof item.downvotes === "number" ? <span> • 👎 {item.downvotes}</span> : null}
          {typeof item.score === "number" ? <span> • Score {item.score}</span> : null}
          {item.redemptionCode ? <span className="queueMetaMinor"> • Code {item.redemptionCode}</span> : null}
        </div>
      </div>

      <div className="queueActions">
        <BoothActionButtons actions={actions} busyAction={busyAction} onAction={handleAction} compact />
      </div>
    </div>
  );
}
