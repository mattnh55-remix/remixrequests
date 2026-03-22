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
              <StatusBadge label="PLAY NOW" tone="pink" />
            ) : item.boosted ? (
              <StatusBadge label="BOOST" tone="gold" />
            ) : (
              <StatusBadge label="UP NEXT" tone="cyan" />
            )}
          </div>
          <div className="boothRequestMeta">
            {item.artist || "Unknown artist"}
            {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
            {typeof item.score === "number" ? ` • Score ${item.score}` : ""}
          </div>

          <div className="boothInlineActions">
            <button type="button" className="boothActionBtn boothActionBtn--skip" onClick={() => handleAction(item, "reject")} disabled={isBusy}>
              {isBusy && busyAction === "reject" ? "Working..." : "Reject"}
            </button>
            <button type="button" className="boothActionBtn boothActionBtn--played" onClick={() => handleAction(item, "played")} disabled={isBusy}>
              {isBusy && busyAction === "played" ? "Working..." : "Mark Played"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PanelShell title="REQUESTS PANEL" subtitle="Live customer demand from the request queue.">
      <div className="boothMiniStats">
        <StatusBadge label={`PLAY NOW ${playNow.length}`} tone="pink" />
        <StatusBadge label={`UP NEXT ${upNext.length}`} tone="cyan" />
      </div>

      <div className="boothRequestSectionTitle">PLAY NOW</div>
      <div className="boothRequestList">
        {playNow.length === 0 ? <div className="boothEmptyState">No Play Now requests.</div> : playNow.slice(0, 6).map(renderRow)}
      </div>

      <div className="boothRequestSectionTitle">UP NEXT</div>
      <div className="boothRequestList">
        {upNext.length === 0 ? <div className="boothEmptyState">No Up Next requests.</div> : upNext.slice(0, 10).map(renderRow)}
      </div>
    </PanelShell>
  );
}
