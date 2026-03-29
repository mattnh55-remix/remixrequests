"use client";

import StatusBadge from "./StatusBadge";
import type { BoothMode, RequestItem } from "./types";

type RequestPanelProps = {
  playNow: RequestItem[];
  upNext: RequestItem[];
  mode?: BoothMode;
  onAccept?: (requestId: string) => void | Promise<unknown>;
  onReject?: (requestId: string, reason: string) => void | Promise<unknown>;
};

function RequestRow({
  item,
  index,
  tone,
  onAccept,
  onReject,
}: {
  item: RequestItem;
  index: number;
  tone: "pink" | "cyan";
  onAccept?: (requestId: string) => void | Promise<unknown>;
  onReject?: (requestId: string, reason: string) => void | Promise<unknown>;
}) {
  return (
    <div className="requestRow">
      <div className="requestIndex">{index + 1}</div>

      <div className="requestText">
        <div className="requestTitleLine">
          <strong>{item.title || "Untitled"}</strong>
          <StatusBadge label={tone === "pink" ? "PLAY NOW" : "UP NEXT"} tone={tone} />
          {item.boosted ? <StatusBadge label="BOOST" tone="gold" /> : null}
        </div>
        <div className="requestMeta">
          {item.artist || "Unknown artist"}
          {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
          {typeof item.score === "number" ? ` • Score ${item.score}` : ""}
        </div>
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
}

export default function RequestPanel({
  playNow,
  upNext,
  mode = "performance",
  onAccept,
  onReject,
}: RequestPanelProps) {
  return (
    <section className={`boothPanel ${mode === "performance" ? "boothPanel--compact" : ""}`}>
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Pending Requests</div>
          <div className="boothPanelSub">Approve requests to move them into On Deck.</div>
        </div>
      </div>

      <div className="boothSplit">
        <div className="requestSection">
          <div className="listSectionTitle" style={{ marginBottom: 6 }}>
            Play Now Requests
          </div>
          {playNow.length ? (
            <div className="requestListScroller">
              {playNow.map((item, index) => (
                <RequestRow
                  key={item.id}
                  item={item}
                  index={index}
                  tone="pink"
                  onAccept={onAccept}
                  onReject={onReject}
                />
              ))}
            </div>
          ) : (
            <div className="emptyBox">No pending Play Now requests.</div>
          )}
        </div>

        <div className="requestSection">
          <div className="listSectionTitle" style={{ marginBottom: 6 }}>
            Up Next Requests
          </div>
          {upNext.length ? (
            <div className="requestListScroller">
              {upNext.map((item, index) => (
                <RequestRow
                  key={item.id}
                  item={item}
                  index={index}
                  tone="cyan"
                  onAccept={onAccept}
                  onReject={onReject}
                />
              ))}
            </div>
          ) : (
            <div className="emptyBox">No pending Up Next requests.</div>
          )}
        </div>
      </div>
    </section>
  );
}