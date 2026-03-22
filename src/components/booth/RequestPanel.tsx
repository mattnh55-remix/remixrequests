"use client";

import StatusBadge from "./StatusBadge";
import type { BoothMode, RequestItem } from "./types";

type RequestPanelProps = {
  playNow: RequestItem[];
  upNext: RequestItem[];
  mode?: BoothMode;
  onRemove?: (requestId: string) => void | Promise<unknown>;
  onDone?: (requestId: string) => void | Promise<unknown>;
};

function RequestRow({
  item,
  index,
  tone,
  onRemove,
  onDone,
}: {
  item: RequestItem;
  index: number;
  tone: "pink" | "cyan";
  onRemove?: (requestId: string) => void | Promise<unknown>;
  onDone?: (requestId: string) => void | Promise<unknown>;
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
        <button type="button" className="gunmetalBtn gunmetalBtn--done" onClick={() => void onDone?.(item.id)}>
          Done
        </button>
        <button type="button" className="gunmetalBtn gunmetalBtn--remove" onClick={() => void onRemove?.(item.id)}>
          Remove
        </button>
      </div>
    </div>
  );
}

export default function RequestPanel({ playNow, upNext, mode = "performance", onRemove, onDone }: RequestPanelProps) {
  return (
    <section className={`boothPanel ${mode === "performance" ? "boothPanel--compact" : ""}`}>
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Requests</div>
          <div className="boothPanelSub">Customer demand queue</div>
        </div>
      </div>

      <div className="boothSplit">
        <div className="requestSection">
          <div className="listSectionTitle" style={{ marginBottom: 6 }}>Play Now</div>
          {playNow.length ? (
            <div className="requestListScroller">
              {playNow.map((item, index) => (
                <RequestRow key={item.id} item={item} index={index} tone="pink" onRemove={onRemove} onDone={onDone} />
              ))}
            </div>
          ) : (
            <div className="emptyBox">No Play Now requests.</div>
          )}
        </div>

        <div className="requestSection">
          <div className="listSectionTitle" style={{ marginBottom: 6 }}>Up Next</div>
          {upNext.length ? (
            <div className="requestListScroller">
              {upNext.map((item, index) => (
                <RequestRow key={item.id} item={item} index={index} tone="cyan" onRemove={onRemove} onDone={onDone} />
              ))}
            </div>
          ) : (
            <div className="emptyBox">No Up Next requests.</div>
          )}
        </div>
      </div>
    </section>
  );
}
