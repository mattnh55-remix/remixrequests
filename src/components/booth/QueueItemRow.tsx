"use client";

import StatusBadge from "./StatusBadge";
import { isBoostedLike, isRequestLike } from "./booth-utils";
import type { BoothMode, QueueLikeItem } from "./types";

type QueueItemRowProps = {
  item: QueueLikeItem;
  mode?: BoothMode;
  isDragging?: boolean;
  onPlayed?: (requestId: string) => void | Promise<void>;
  onReject?: (requestId: string, reason: string) => void | Promise<void>;
  onDragStart?: (queueItemId: string) => void;
  onDragOver?: (queueItemId: string) => void;
  onDrop?: (queueItemId: string) => void;
  onDragEnd?: () => void;
};

function VoteRail({ upvotes, downvotes, score }: { upvotes?: number | null; downvotes?: number | null; score?: number | null }) {
  const safeUp = Number(upvotes ?? 0);
  const safeDown = Number(downvotes ?? 0);
  const safeScore = Number(score ?? safeUp - safeDown);
  const scoreClass = safeScore > 0 ? "queueVoteRail__score--up" : safeScore < 0 ? "queueVoteRail__score--down" : "";

  return (
    <div className="queueVoteRail" aria-label="Queue votes">
      <span className="queueVoteRail__chip">👍 {safeUp}</span>
      <span className="queueVoteRail__chip">👎 {safeDown}</span>
      <span className={`queueVoteRail__score ${scoreClass}`}>Score {safeScore}</span>
    </div>
  );
}

export default function QueueItemRow({
  item,
  isDragging,
  onPlayed,
  onReject,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: QueueItemRowProps) {
  const isRequest = isRequestLike(item);
  const isBoosted = isBoostedLike(item);
  const requestIdForActions = String(item.requestId || item.id);

  async function handleReject() {
    const reason = window.prompt("Remove reason?", "Removed from pending queue");
    if (!reason) return;
    await onReject?.(requestIdForActions, reason);
  }

  return (
    <div
      className={`queueRow ${isRequest ? "queueRow--request" : ""} ${isBoosted ? "queueRow--boosted" : ""} ${isDragging ? "queueRow--dragging" : ""}`}
      draggable
      onDragStart={() => onDragStart?.(item.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(item.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(item.id);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <div className="queueDrag" aria-hidden="true" title="Drag to reorder">⋮⋮</div>

      <div className="queueArtworkWrap">
        {item.artworkUrl ? (
          <img className="queueArtwork" src={item.artworkUrl} alt="" />
        ) : (
          <div className="queueArtwork queueArtwork--fallback">♪</div>
        )}
      </div>

      <div className="queueText">
        <div className="queueTitleLine">
          {typeof item.position === "number" ? (
            <div className="queueNumber">{item.position}.</div>
          ) : null}
          <div className="queueTitle">{item.title || "Untitled"}</div>
          {isBoosted ? <StatusBadge label="BOOST" tone="boost" /> : null}
          {isRequest ? <StatusBadge label="REQUEST" tone="alert" /> : null}
          {item.requestSource === "DJ" || item.sourceType === "HOUSE" ? <StatusBadge label="DJ" tone="loaded" /> : null}
        </div>

        <div className="queueMeta">
          <span className="queueMetaStrong">{item.artist || "Unknown artist"}</span>
          {item.requestedByLabel ? <span> • {item.requestedByLabel}</span> : null}
          {item.verified ? <span> • VERIFIED</span> : null}
          {item.redemptionCode ? <span className="queueMetaMinor"> • Code {item.redemptionCode}</span> : null}
        </div>
      </div>

      <VoteRail upvotes={item.upvotes} downvotes={item.downvotes} score={item.score} />

      <div className="queueActions">
        <div className="boothActionRail">
          <button
            type="button"
            className="queueActionBtn queueActionBtn--play"
            onClick={() => void onPlayed?.(requestIdForActions)}
          >
            Played
          </button>

          <button
            type="button"
            className="queueActionBtn queueActionBtn--reject"
            onClick={() => void handleReject()}
          >
            Remove
          </button>
        </div>
      </div>

      <style jsx>{`
        .queueArtworkWrap {
          width: 54px;
          min-width: 54px;
        }

        .queueArtwork {
          width: 54px;
          height: 54px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
          box-shadow: 0 4px 12px rgba(0,0,0,0.22);
        }

        .queueArtwork--fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(236, 242, 251, 0.74);
          font-weight: 1000;
          font-size: 18px;
        }

        .queueRow--dragging {
          opacity: 0.72;
          transform: scale(0.995);
        }

        .queueVoteRail {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          border-radius: 999px;
          border: 1px solid rgba(95, 119, 159, 0.26);
          background: linear-gradient(180deg, rgba(17, 28, 45, 0.96), rgba(11, 17, 28, 0.96));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .queueVoteRail__chip,
        .queueVoteRail__score {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 11px;
          font-weight: 1000;
          color: rgba(239, 245, 255, 0.9);
          background: rgba(255,255,255,0.035);
          white-space: nowrap;
        }

        .queueVoteRail__score {
          border-color: rgba(89, 160, 255, 0.24);
          background: linear-gradient(180deg, rgba(56, 94, 150, 0.16), rgba(255,255,255,0.03));
        }

        .queueVoteRail__score--up {
          box-shadow: 0 0 12px rgba(89, 160, 255, 0.14);
        }

        .queueVoteRail__score--down {
          border-color: rgba(220, 108, 108, 0.24);
          box-shadow: 0 0 12px rgba(220, 108, 108, 0.12);
        }
      `}</style>
    </div>
  );
}
