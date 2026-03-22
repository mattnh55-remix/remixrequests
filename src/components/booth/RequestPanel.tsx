"use client";

import type { RequestItem } from "./types";

type Props = {
  playNow: RequestItem[];
  upNext: RequestItem[];
  onRemove: (requestId: string) => void;
  onDone: (requestId: string) => void;
};

function RequestRow({ item, index, onRemove, onDone }: { item: RequestItem; index: number; onRemove: (requestId: string) => void; onDone: (requestId: string) => void; }) {
  return (
    <div className="requestRow gunmetalBox">
      <div className="requestRowMain">
        <div className="requestTitleLine">
          <span className="requestIndex">{index}</span>
          <strong>{item.title || "Untitled"}</strong>
          <span className="rowPill rowPill--queue">Up Next</span>
        </div>
        <div className="requestMeta">{item.artist || "Unknown artist"}{item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}{item.verified ? " • VERIFIED" : ""} • Score {item.score ?? 0}</div>
      </div>
      <div className="requestRowActions">
        <button type="button" className="gunBtn gunBtn--danger" onClick={() => onRemove(item.id)}>Remove</button>
        <button type="button" className="gunBtn gunBtn--secondary" onClick={() => onDone(item.id)}>Done</button>
      </div>
    </div>
  );
}

export default function RequestPanel({ playNow, upNext, onRemove, onDone }: Props) {
  return (
    <div className="columnPanel">
      <div className="panelHead">
        <div>
          <h3>Requests</h3>
          <p>Live customer demand waiting to be worked into the booth queue.</p>
        </div>
      </div>

      <div className="requestTabRow">
        <span className="rowPill rowPill--pink">Play Now {playNow.length}</span>
        <span className="rowPill rowPill--cyan">Up Next {upNext.length}</span>
      </div>

      <div className="sectionLabel">Play Now</div>
      <div className="emptyMini">{playNow.length ? `${playNow.length} priority requests ready.` : "No play-now requests."}</div>

      <div className="sectionLabel sectionLabel--spaced">Up Next</div>
      <div className="requestList">
        {upNext.length === 0 ? <div className="emptyMini">No Up Next requests.</div> : upNext.map((item, idx) => <RequestRow key={item.id} item={item} index={idx + 1} onRemove={onRemove} onDone={onDone} />)}
      </div>
    </div>
  );
}
