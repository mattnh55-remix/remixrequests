"use client";

import { useMemo } from "react";
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

export default function RequestPanel({
  playNow,
  upNext,
  mode = "performance",
  onAccept,
  onReject,
}: RequestPanelProps) {
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

              return (
                <div
                  key={item.id}
                  className={`requestRow ${item.boosted ? "requestRow--boosted" : ""}`}
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
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto auto;
          gap: 10px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.015));
        }

        .requestRow--boosted {
          border-color: rgba(255, 118, 118, 0.24);
          box-shadow: inset 3px 0 0 rgba(255, 118, 118, 0.9);
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

        @media (max-width: 980px) {
          .requestRow {
            grid-template-columns: 34px minmax(0, 1fr);
            align-items: start;
          }

          .requestVoteRail,
          .requestActions {
            grid-column: 2;
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
          .requestActions {
            grid-column: auto;
          }
        }
      `}</style>
    </section>
  );
}
