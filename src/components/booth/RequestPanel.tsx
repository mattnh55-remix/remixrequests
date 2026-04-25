"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StatusBadge from "./StatusBadge";
import type { BoothMode, RequestItem } from "./types";

type RequestPanelProps = {
  playNow: RequestItem[];
  upNext: RequestItem[];
  mode?: BoothMode;
  onAccept?: (requestId: string) => void | Promise<unknown>;
  onReject?: (requestId: string, reason: string) => void | Promise<unknown>;
};

type IncomingItem = RequestItem & {
  incomingLane: "PLAY_NOW" | "UP_NEXT";
};

const TIMER_FALLBACK_FIELDS = ["createdAt", "requestedAt", "submittedAt", "queuedAt", "updatedAt"];

function getIncomingStartedAt(item: RequestItem): number | null {
  const rawItem = item as unknown as Record<string, unknown>;

  for (const field of TIMER_FALLBACK_FIELDS) {
    const value = rawItem[field];

    if (value instanceof Date) {
      const nextTime = value.getTime();
      if (Number.isFinite(nextTime)) return nextTime;
    }

    if (typeof value === "string" || typeof value === "number") {
      const nextTime = new Date(value).getTime();
      if (Number.isFinite(nextTime)) return nextTime;
    }
  }

  return null;
}

function formatElapsedTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function RequestPanel({
  playNow,
  upNext,
  mode = "performance",
  onAccept,
  onReject,
}: RequestPanelProps) {
  const firstSeenAtRef = useRef<Map<string, number>>(new Map());
  const [nowMs, setNowMs] = useState(() => Date.now());

  const incomingItems = useMemo<IncomingItem[]>(() => {
    const merged: IncomingItem[] = [
      ...playNow.map((item) => ({ ...item, incomingLane: "PLAY_NOW" as const })),
      ...upNext.map((item) => ({ ...item, incomingLane: "UP_NEXT" as const })),
    ];

    return merged.sort((a, b) => {
      const boostDiff = Number(Boolean(b.boosted)) - Number(Boolean(a.boosted));
      if (boostDiff !== 0) return boostDiff;

      const laneDiff =
        (a.incomingLane === "PLAY_NOW" ? 0 : 1) -
        (b.incomingLane === "PLAY_NOW" ? 0 : 1);
      if (laneDiff !== 0) return laneDiff;

      const scoreDiff = Number(b.score ?? 0) - Number(a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;

      return 0;
    });
  }, [playNow, upNext]);

  useEffect(() => {
    const activeIds = new Set(incomingItems.map((item) => item.id));
    const firstSeenAt = firstSeenAtRef.current;
    const rightNow = Date.now();

    incomingItems.forEach((item) => {
      if (!firstSeenAt.has(item.id)) {
        firstSeenAt.set(item.id, getIncomingStartedAt(item) ?? rightNow);
      }
    });

    for (const itemId of firstSeenAt.keys()) {
      if (!activeIds.has(itemId)) {
        firstSeenAt.delete(itemId);
      }
    }
  }, [incomingItems]);

  useEffect(() => {
    if (!incomingItems.length) return;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [incomingItems.length]);

  return (
    <section className={`boothPanel ${mode === "performance" ? "boothPanel--compact" : ""}`}>
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Incoming Requests</div>
          <div className="boothPanelSub">Customer SMS requests waiting for DJ approval.</div>
        </div>
      </div>

      <div className="requestSection requestSection--stacked">
        <div className="listSectionTitle requestSectionTitle">Incoming Approval Queue</div>

        {incomingItems.length ? (
          <div className="requestListScroller">
            {incomingItems.map((item, index) => {
              const safeUp = Number(item.upvotes ?? 0);
              const safeDown = Number(item.downvotes ?? 0);
              const safeScore = Number(item.score ?? safeUp - safeDown);
              const scoreTone =
                safeScore > 0
                  ? "requestVoteRail__score--up"
                  : safeScore < 0
                    ? "requestVoteRail__score--down"
                    : "";
              const startedAt = firstSeenAtRef.current.get(item.id) ?? getIncomingStartedAt(item) ?? nowMs;
              const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
              const timerTone =
                elapsedSeconds >= 180
                  ? "requestTimer--urgent"
                  : elapsedSeconds >= 60
                    ? "requestTimer--warming"
                    : "";

              return (
                <div
                  key={item.id}
                  className={`requestRow requestRow--populated ${item.boosted ? "requestRow--boosted" : ""}`}
                >
                  <div className="requestIndex">{index + 1}</div>

                  <div className="requestText">
                    <div className="requestTitleLine">
                      <strong>{item.title || "Untitled"}</strong>
                      <StatusBadge
                        label={item.incomingLane === "PLAY_NOW" ? "PLAY NOW" : "UP NEXT"}
                        tone={item.incomingLane === "PLAY_NOW" ? "pink" : "cyan"}
                      />
                      {item.boosted ? <StatusBadge label="BOOSTED" tone="red" /> : null}
                    </div>

                    <div className="requestMeta">
                      {item.artist || "Unknown artist"}
                      {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
                      {item.verified ? " • VERIFIED" : ""}
                    </div>
                  </div>

                  <div className="requestVoteRail" aria-label="Votes">
                    <span className="requestVoteRail__chip">👍 {safeUp}</span>
                    <span className="requestVoteRail__chip">👎 {safeDown}</span>
                    <span className={`requestVoteRail__score ${scoreTone}`}>Score {safeScore}</span>
                  </div>

                  <div className="requestActions">
                    <button
                      type="button"
                      className="gunmetalBtn gunmetalBtn--primary"
                      onClick={() => void onAccept?.(item.id)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="gunmetalBtn gunmetalBtn--remove"
                      onClick={() => void onReject?.(item.id, "Rejected from booth")}
                    >
                      Reject
                    </button>
                  </div>

                  <div className={`requestTimer ${timerTone}`} aria-label="Time waiting">
                    <span className="requestTimer__label">Waiting</span>
                    <span className="requestTimer__time">{formatElapsedTime(elapsedSeconds)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="emptyBox">No incoming requests waiting for approval.</div>
        )}
      </div>

      <style jsx>{`
        .requestSectionTitle {
          margin-bottom: 6px;
        }

        .requestListScroller {
          display: grid;
          gap: 8px;
        }

        .requestSection--stacked {
          display: grid;
          gap: 8px;
        }

        .requestRow {
          position: relative;
          isolation: isolate;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto auto auto;
          gap: 10px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.015));
          overflow: hidden;
        }

        .requestRow::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          opacity: 0;
          background:
            radial-gradient(circle at 12% 50%, rgba(89, 160, 255, 0.22), transparent 34%),
            radial-gradient(circle at 82% 50%, rgba(255, 118, 214, 0.16), transparent 36%);
          pointer-events: none;
        }

        .requestRow--populated::before {
          animation: requestRowPulse 2.8s ease-in-out infinite;
        }

        .requestRow--boosted {
          border-color: rgba(255, 118, 118, 0.24);
          box-shadow: inset 3px 0 0 rgba(255, 118, 118, 0.9);
        }

        .requestRow--boosted::before {
          background:
            radial-gradient(circle at 12% 50%, rgba(255, 118, 118, 0.24), transparent 34%),
            radial-gradient(circle at 82% 50%, rgba(255, 205, 104, 0.14), transparent 36%);
        }

        .requestIndex {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          font-weight: 1000;
          color: rgba(235, 241, 255, 0.86);
        }

        .requestText {
          min-width: 0;
        }

        .requestTitleLine {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .requestTitleLine strong {
          min-width: 0;
          font-size: 16px;
          line-height: 1.1;
          color: #fbfdff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .requestMeta {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(223, 233, 248, 0.76);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .requestVoteRail {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          border-radius: 999px;
          border: 1px solid rgba(95, 119, 159, 0.26);
          background: linear-gradient(180deg, rgba(17, 28, 45, 0.96), rgba(11, 17, 28, 0.96));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .requestVoteRail__chip,
        .requestVoteRail__score {
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

        .requestVoteRail__score {
          border-color: rgba(89, 160, 255, 0.24);
          background: linear-gradient(180deg, rgba(56, 94, 150, 0.16), rgba(255,255,255,0.03));
        }

        .requestVoteRail__score--up {
          box-shadow: 0 0 12px rgba(89, 160, 255, 0.14);
        }

        .requestVoteRail__score--down {
          border-color: rgba(220, 108, 108, 0.24);
          box-shadow: 0 0 12px rgba(220, 108, 108, 0.12);
        }

        .requestActions {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .requestTimer {
          min-width: 76px;
          min-height: 40px;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 5px 9px;
          border-radius: 8px;
          border: 1px solid rgba(89, 160, 255, 0.26);
          background: linear-gradient(180deg, rgba(14, 24, 39, 0.98), rgba(8, 12, 20, 0.98));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 0 14px rgba(89, 160, 255, 0.08);
          color: rgba(239, 245, 255, 0.92);
          white-space: nowrap;
        }

        .requestTimer__label {
          font-size: 9px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(193, 209, 236, 0.68);
        }

        .requestTimer__time {
          font-variant-numeric: tabular-nums;
          font-size: 15px;
          line-height: 1;
          font-weight: 1000;
          color: #fbfdff;
        }

        .requestTimer--warming {
          border-color: rgba(255, 205, 104, 0.34);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 0 16px rgba(255, 205, 104, 0.12);
        }

        .requestTimer--urgent {
          border-color: rgba(255, 118, 118, 0.4);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 0 18px rgba(255, 118, 118, 0.16);
          animation: requestTimerUrgent 1.15s ease-in-out infinite;
        }

        @keyframes requestRowPulse {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.82;
          }
        }

        @keyframes requestTimerUrgent {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.035);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .requestRow--populated::before,
          .requestTimer--urgent {
            animation: none;
          }
        }

        @media (max-width: 980px) {
          .requestRow {
            grid-template-columns: 34px minmax(0, 1fr) auto;
            align-items: start;
          }

          .requestVoteRail,
          .requestActions {
            grid-column: 2;
          }

          .requestTimer {
            grid-column: 3;
            grid-row: 1 / span 3;
            align-self: center;
          }

          .requestActions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .requestRow {
            grid-template-columns: 1fr;
          }

          .requestIndex {
            display: none;
          }

          .requestVoteRail,
          .requestActions,
          .requestTimer {
            grid-column: auto;
            grid-row: auto;
          }

          .requestTimer {
            align-items: flex-start;
          }
        }
      `}</style>
    </section>
  );
}
