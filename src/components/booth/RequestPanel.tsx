"use client";

import BoothActionButtons from "./BoothActionButtons";
import type { BoothMode, RequestItem } from "./types";

function RequestRow({ item, index, mode, onRemove, onDone }: { item: RequestItem; index: number; mode: BoothMode; onRemove?: (id: string) => void; onDone?: (id: string) => void; }) {
  return (
    <div className={`requestRow ${mode === "performance" ? "requestRow--compact" : ""}`}>
      <div className="requestIndex">{index + 1}</div>
      <div className="requestText">
        <div className="requestTitleLine">
          <strong>{item.title}</strong>
          <span className="statusPill statusPill--loaded">UP NEXT</span>
        </div>
        <div className="requestMeta">{item.artist} {item.requestedByLabel ? `• ${item.requestedByLabel}` : ""} • {item.verified ? "VERIFIED" : "PENDING"} • Score {item.score ?? 0}</div>
      </div>
      <div className="requestControls">
        <BoothActionButtons compact actions={[{ name: "remove", onClick: () => onRemove?.(item.id) }, { name: "done", onClick: () => onDone?.(item.id) }]} />
      </div>
    </div>
  );
}

export default function RequestPanel({
  playNow,
  upNext,
  mode,
  onRemove,
  onDone,
}: {
  playNow: RequestItem[];
  upNext: RequestItem[];
  mode: BoothMode;
  onRemove?: (id: string) => void;
  onDone?: (id: string) => void;
}) {
  return (
    <div className={`boothPanel ${mode === "performance" ? "boothPanel--compact" : ""}`}>
      <div className="panelHead">
        <div>
          <div className="panelTitle">Requests</div>
          <div className="panelSub">Live customer demand waiting to be worked into the booth queue.</div>
        </div>
      </div>

      <div className="requestChips">
        <span className="statusPill statusPill--magenta">PLAY NOW {playNow.length}</span>
        <span className="statusPill statusPill--loaded">UP NEXT {upNext.length}</span>
      </div>

      <div className="listSectionTitle">Play Now</div>
      <div className="emptyBox">{playNow.length ? "Play-now actions can be added next." : "No play-now requests."}</div>

      <div className="listSectionTitle">Up Next</div>
      <div className="requestListScroller">
        {upNext.map((item, index) => (
          <RequestRow key={item.id} item={item} index={index} mode={mode} onRemove={onRemove} onDone={onDone} />
        ))}
      </div>
    </div>
  );
}
