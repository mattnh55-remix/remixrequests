"use client";

import StatusBadge from "./StatusBadge";
import type { BoothMode, RequestItem } from "./types";

type RequestPanelProps = {
  playNow: RequestItem[];
  upNext: RequestItem[];
  mode?: BoothMode;
  busyKey?: string | null;
  onRemove?: (requestId: string) => void | Promise<unknown>;
  onDone?: (requestId: string) => void | Promise<unknown>;
};

function RequestRow({
  item,
  index,
  tone,
  busyKey,
  onRemove,
  onDone,
}: {
  item: RequestItem;
  index: number;
  tone: "pink" | "cyan";
  busyKey?: string | null;
  onRemove?: (requestId: string) => void | Promise<unknown>;
  onDone?: (requestId: string) => void | Promise<unknown>;
}) {
  const busyDone = busyKey === `${item.id}:done`;
  const busyRemove = busyKey === `${item.id}:remove`;

  return (
    <div className="boothRequestRow">
      <div className="boothRequestIndex">{index + 1}</div>

      <div className="boothRequestMain">
        <div className="boothRequestTitleLine">
          <div className="boothRequestTitle">{item.title || "Untitled"}</div>
          <StatusBadge label={tone === "pink" ? "Play Now" : "Up Next"} tone={tone} />
          {item.boosted ? <StatusBadge label="Boost" tone="gold" /> : null}
        </div>

        <div className="boothRequestMeta">
          {item.artist || "Unknown artist"}
          {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
          {typeof item.score === "number" ? ` • Score ${item.score}` : ""}
        </div>
      </div>

      <div className="boothRequestActions">
        <button type="button" className="gunmetalBtn" onClick={() => void onDone?.(item.id)} disabled={!!busyKey}>
          {busyDone ? "Working..." : "Done"}
        </button>
        <button type="button" className="gunmetalBtn gunmetalBtn--remove" onClick={() => void onRemove?.(item.id)} disabled={!!busyKey}>
          {busyRemove ? "Working..." : "Remove"}
        </button>
      </div>
    </div>
  );
}

export default function RequestPanel({
  playNow,
  upNext,
  mode = "visual",
  busyKey,
  onRemove,
  onDone,
}: RequestPanelProps) {
  return (
    <section className={`boothPanel ${mode === "performance" ? "is-compact" : ""}`}>
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Requests</div>
          <div className="boothPanelSub">Customer demand queue</div>
        </div>
      </div>

      <div className="boothRequestSection">
        <div className="boothSubsectionTitle">Play Now</div>
        <div className="boothRequestList">
          {playNow.length ? (
            playNow.map((item, index) => (
              <RequestRow
                key={item.id}
                item={item}
                index={index}
                tone="pink"
                busyKey={busyKey}
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
        <div className="boothSubsectionTitle">Up Next</div>
        <div className="boothRequestList">
          {upNext.length ? (
            upNext.map((item, index) => (
              <RequestRow
                key={item.id}
                item={item}
                index={index}
                tone="cyan"
                busyKey={busyKey}
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
