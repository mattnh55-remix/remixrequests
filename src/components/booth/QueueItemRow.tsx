
"use client";

import StatusBadge from "./StatusBadge";
import { isBoostedLike, isRequestLike } from "./booth-utils";
import type { BoothMode, QueueLikeItem } from "./types";

type QueueItemRowProps = {
  item: QueueLikeItem;
  mode?: BoothMode;
  onPlayed?: (requestId: string) => void | Promise<void>;
  onReject?: (requestId: string, reason: string) => void | Promise<void>;
};

export default function QueueItemRow({
  item,
  onPlayed,
  onReject,
}: QueueItemRowProps) {
  const isRequest = isRequestLike(item);
  const isBoosted = isBoostedLike(item);

  async function handleReject() {
    const reason = window.prompt("Reject reason?", "Rejected from booth");
    if (!reason) return;
    await onReject?.(item.id, reason);
  }

  return (
    <div
      className={`queueRow ${isRequest ? "queueRow--request" : ""} ${isBoosted ? "queueRow--boosted" : ""}`}
    >
      <div className="queueDrag" aria-hidden="true">⋮</div>

      <div className="queueText">
        <div className="queueTitleLine">
          {typeof item.position === "number" ? (
            <div className="queueNumber">{item.position}.</div>
          ) : null}
          <div className="queueTitle">{item.title || "Untitled"}</div>
          {isBoosted ? <StatusBadge label="BOOSTED" tone="boost" /> : null}
          {isRequest ? <StatusBadge label="REQUEST" tone="alert" /> : null}
        </div>

        <div className="queueMeta">
          <span className="queueMetaStrong">{item.artist || "Unknown artist"}</span>
          {item.requestedByLabel ? <span> • Requested by {item.requestedByLabel}</span> : null}
          {item.verified ? <span> • VERIFIED</span> : null}
        </div>

        <div className="queueMeta">
          {typeof item.score === "number" ? <span>Score {item.score}</span> : null}
          {typeof item.upvotes === "number" ? <span> • 👍 {item.upvotes}</span> : null}
          {typeof item.downvotes === "number" ? <span> • 👎 {item.downvotes}</span> : null}
          {item.redemptionCode ? (
            <span className="queueMetaMinor"> • Code {item.redemptionCode}</span>
          ) : null}
        </div>
      </div>

      <div className="queueActions">
        <div className="boothActionRail">
          <button
            type="button"
            className="queueActionBtn queueActionBtn--play"
            onClick={() => void onPlayed?.(item.id)}
          >
            Played
          </button>

          <button
            type="button"
            className="queueActionBtn queueActionBtn--reject"
            onClick={() => void handleReject()}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
