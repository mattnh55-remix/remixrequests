"use client";

import { useState } from "react";
import PanelShell from "./PanelShell";
import StatusBadge from "./StatusBadge";
import { performRequestAction } from "./booth-utils";
import type { RequestActionName, RequestItem } from "./types";

export default function RequestPanel({
  requests,
  onActionComplete,
}: {
  requests: RequestItem[];
  onActionComplete?: (result: { ok: boolean; message: string }) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<RequestActionName | null>(null);

  const playNow = requests.filter((item) => item.sortBucket === "PLAY_NOW");
  const upNext = requests.filter((item) => item.sortBucket !== "PLAY_NOW");

  async function handleAction(item: RequestItem, action: RequestActionName) {
    setBusyId(item.id);
    setBusyAction(action);
    const result = await performRequestAction(item, action);
    setBusyId(null);
    setBusyAction(null);
    onActionComplete?.(result);
  }

  function renderRow(item: RequestItem, idx: number) {
    const isBusy = busyId === item.id;
    return (
      <div className="boothRequestRow boothRequestRow--actionable" key={item.id}>
        <div className="boothRequestIndex">{idx + 1}</div>
        <div className="boothRequestMain">
          <div className="boothRequestTitleLine">
            <div className="boothRequestTitle">{item.title || "Untitled"}</div>
            {item.sortBucket === "PLAY_NOW" ? (
              <StatusBadge label="Play now" tone="pink" />
            ) : item.boosted ? (
              <StatusBadge label="Boost" tone="gold" />
            ) : (
              <StatusBadge label="Up next" tone="cyan" />
            )}
          </div>
          <div className="boothRequestMeta">
            {item.artist || "Unknown artist"}
            {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
            {typeof item.score === "number" ? ` • Score ${item.score}` : ""}
          </div>

          <div className="boothInlineActions">
            <button type="button" className="boothActionBtn boothActionBtn--skip" onClick={() => handleAction(item, "reject")} disabled={isBusy}>
              {isBusy && busyAction === "reject" ? "Working..." : "Remove"}
            </button>
            <button type="button" className="boothActionBtn boothActionBtn--played" onClick={() => handleAction(item, "played")} disabled={isBusy}>
              {isBusy && busyAction === "played" ? "Working..." : "Done"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PanelShell title="REQUESTS" subtitle="Live customer demand waiting to be worked into the booth queue.">
      <div className="boothMiniStats">
        <StatusBadge label={`Play now ${playNow.length}`} tone="pink" />
        <StatusBadge label={`Up next ${upNext.length}`} tone="cyan" />
      </div>

      <div className="boothRequestSectionTitle">Play now</div>
      <div className="boothRequestList">
        {playNow.length === 0 ? <div className="boothEmptyState">No play-now requests.</div> : playNow.slice(0, 6).map(renderRow)}
      </div>

      <div className="boothRequestSectionTitle">Up next</div>
      <div className="boothRequestList">
        {upNext.length === 0 ? <div className="boothEmptyState">No up-next requests.</div> : upNext.slice(0, 10).map(renderRow)}
      </div>
    </PanelShell>
  );
}
