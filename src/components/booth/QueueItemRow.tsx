"use client";

import StatusBadge from "./StatusBadge";
import { isBoostedLike, isInterstitial, isRequestLike } from "./booth-utils";
import type { QueueLikeItem } from "./types";

type QueueItemRowProps = {
  item: QueueLikeItem;
  busy?: "played" | "reject" | null;
  onPlayed?: (requestId: string) => void | Promise<void>;
  onReject?: (requestId: string) => void | Promise<void>;
};

export default function QueueItemRow({ item, busy, onPlayed, onReject }: QueueItemRowProps) {
  const isSystem = isInterstitial(item);
  const isHouse = item.sourceType === "HOUSE";
  const isRequest = isRequestLike(item) && !isSystem && !isHouse;
  const isBoosted = isBoostedLike(item) && !isSystem;
  const requestId = String(item.requestId || "").trim();
  const canAct = Boolean(requestId);

  if (isSystem) return null;

  return (
    <div
      className={`queueRow queueRow--decision ${isRequest ? "queueRow--request" : ""} ${isBoosted ? "queueRow--boosted" : ""}`}
      draggable={false}
    >
      <div className="queueDragHandle" aria-hidden="true" title="Drag ordering coming next">
        <span />
        <span />
        <span />
      </div>

      <div className="queueText">
        <div className="queueTitleLine">
          <div className="queueTitle">{item.position ? `${item.position}. ` : ""}{item.title || "Untitled"}</div>
          {isBoosted ? <StatusBadge label="BOOSTED" tone="boost" /> : null}
          {isRequest ? <StatusBadge label="REQUEST" tone="alert" /> : null}
        </div>

        <div className="queueMeta queueMeta--stacked">
          <span className="queueMetaStrong">{item.artist || "Unknown artist"}</span>
          {item.requestedByLabel ? <span> • Requested by {item.requestedByLabel}</span> : null}
        </div>

        <div className="queueMeta queueMeta--scoreline">
          {typeof item.score === "number" ? <span>Score {item.score}</span> : <span>Score 0</span>}
          {typeof item.upvotes === "number" ? <span> • 👍 {item.upvotes}</span> : <span> • 👍 0</span>}
          {typeof item.downvotes === "number" ? <span> • 👎 {item.downvotes}</span> : <span> • 👎 0</span>}
          {item.redemptionCode ? <span className="queueMetaMinor"> • Code {item.redemptionCode}</span> : null}
        </div>
      </div>

      <div className="queueActions queueActions--decision">
        <div className="boothActionRail boothActionRail--decision">
          <button
            type="button"
            className="gunmetalBtn gunmetalBtn--play queueDecisionBtn"
            disabled={!canAct || !!busy}
            onClick={() => {
              if (!requestId) return;
              void onPlayed?.(requestId);
            }}
          >
            {busy === "played" ? "Working..." : "Played"}
          </button>
          <button
            type="button"
            className="gunmetalBtn gunmetalBtn--skip queueDecisionBtn"
            disabled={!canAct || !!busy}
            onClick={() => {
              if (!requestId) return;
              void onReject?.(requestId);
            }}
          >
            {busy === "reject" ? "Working..." : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
