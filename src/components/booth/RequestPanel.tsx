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
    <div className="boothRequestRow">
      <div className="boothRequestIndex">{index + 1}</div>

      <div className="boothRequestMain">
        <div className="boothRequestTitleLine">
          <div className="boothRequestTitle">{item.title || "Untitled"}</div>
          <StatusBadge
            label={tone === "pink" ? "PLAY NOW" : "UP NEXT"}
            tone={tone}
          />
          {item.boosted ? <StatusBadge label="BOOST" tone="gold" /> : null}
        </div>

        <div className="boothRequestMeta">
          {item.artist || "Unknown artist"}
          {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
          {typeof item.score === "number" ? ` • Score ${item.score}` : ""}
        </div>
      </div>

      <div className="boothRequestActions">
        <button
          type="button"
          className="gunmetalBtn"
          onClick={() => void onDone?.(item.id)}
        >
          Done
        </button>
        <button
          type="button"
          className="gunmetalBtn gunmetalBtn--danger"
          onClick={() => void onRemove?.(item.id)}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function RequestPanel({
  playNow,
  upNext,
  mode = "visual",
  onRemove,
  onDone,
}: RequestPanelProps) {
  return (
    <section
      className={`boothPanel ${mode === "performance" ? "is-compact" : ""}`}
    >
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">REQUESTS</div>
          <div className="boothPanelSub">Customer demand queue</div>
        </div>
      </div>

      <div className="boothRequestSection">
        <div className="boothSubsectionTitle">PLAY NOW</div>
        <div className="boothRequestList">
          {playNow.length ? (
            playNow.map((item, index) => (
              <RequestRow
                key={item.id}
                item={item}
                index={index}
                tone="pink"
                onRemove={onRemove}
                onDone={onDone}
              />
            ))
          ) : (
            <div className="boothEmptyState">No Play Now requests.</div>
          )}
        </div>
      </div>

      <div className="boothRequestSection">
        <div className="boothSubsectionTitle">UP NEXT</div>
        <div className="boothRequestList">
          {upNext.length ? (
            upNext.map((item, index) => (
              <RequestRow
                key={item.id}
                item={item}
                index={index}
                tone="cyan"
                onRemove={onRemove}
                onDone={onDone}
              />
            ))
          ) : (
            <div className="boothEmptyState">No Up Next requests.</div>
          )}
        </div>
      </div>
    </section>
  );
}