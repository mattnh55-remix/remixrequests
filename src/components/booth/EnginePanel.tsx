"use client";

import { useState } from "react";
import PanelShell from "./PanelShell";
import QueueItemRow from "./QueueItemRow";
import StatusBadge from "./StatusBadge";
import { isInterstitial, triggerMaterialize } from "./booth-utils";
import type { QueueLikeItem, RuntimePreview } from "./types";

function sentenceCaseReason(reason?: string | null) {
  const value = String(reason || "DIRECT_PLAY").replaceAll("_", " ").toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function actionHeadline(preview: RuntimePreview | null) {
  const action = String(preview?.action || "NO_ACTION").toUpperCase();
  if (action === "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM") return "Play insert first";
  if (action === "PLAY_QUEUE_ITEM") return "Play next song";
  return "Engine idle";
}

function engineNote(preview: RuntimePreview | null) {
  const reason = String(preview?.reason || "").toUpperCase();
  if (reason.includes("REQUEST_CLUSTER")) return "Request block detected. The backend is ready to place an intro before the next run of requests.";
  if (reason.includes("REQUEST_SINGLE")) return "Single-request intro opportunity is available before the next song.";
  if (reason.includes("TOP_OF_HOUR")) return "A scheduled window is open for a branding or announcement insert.";
  if (reason.includes("BRANDING")) return "Spacing rules allow a branding drop before the next track.";
  if (reason.includes("MATERIALIZED")) return "A system insert is already sitting in front of the next song.";
  if (reason.includes("NO_PLAYABLE_QUEUE_ITEM")) return "Add or load a song to wake the engine up.";
  return "Watching the live queue and ready for the next clean transition.";
}

export default function EnginePanel({
  location,
  runtimePreview,
  queue,
  onMaterialized,
}: {
  location: string;
  runtimePreview: RuntimePreview | null;
  queue: QueueLikeItem[];
  onMaterialized?: (result: { ok: boolean; message: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const systemItems = queue.filter(isInterstitial).slice(0, 6);

  async function handleMaterialize() {
    setBusy(true);
    const result = await triggerMaterialize(location);
    setBusy(false);

    if (result.ok) {
      const reason = result.data?.reason || (result.data?.materialized ? "INSERTED" : "NO_ACTION");
      onMaterialized?.({ ok: true, message: `Engine returned ${reason}.` });
      return;
    }

    onMaterialized?.({ ok: false, message: "Engine request failed." });
  }

  const idle = runtimePreview?.action === "NO_ACTION";

  return (
    <PanelShell
      title="SMART INSERT / ENGINE"
      subtitle="Automatic system inserts and next-action status."
      right={<StatusBadge label="BACKEND CONTROLLED" tone="muted" />}
    >
      <div className="boothEngineCard boothEngineCard--hero">
        <div className="boothEngineHeader">
          <div>
            <div className="boothEngineLabel">Next action</div>
            <div className="boothEngineAction">{actionHeadline(runtimePreview)}</div>
          </div>
          <StatusBadge label={idle ? "IDLE" : "ARMED"} tone={idle ? "muted" : "pink"} />
        </div>

        <div className="boothEngineList">
          <div className="boothEngineRow">
            <span>Target</span>
            <strong>
              {runtimePreview?.targetTitle || "Waiting for a playable song"}
              {runtimePreview?.targetArtist ? ` • ${runtimePreview.targetArtist}` : ""}
            </strong>
          </div>
          <div className="boothEngineRow">
            <span>Reason</span>
            <strong>{sentenceCaseReason(runtimePreview?.reason)}</strong>
          </div>
          {runtimePreview?.clusterId ? (
            <div className="boothEngineRow">
              <span>Insert group</span>
              <strong>{runtimePreview.clusterId}</strong>
            </div>
          ) : null}
        </div>

        <div className="boothEngineExplain">{engineNote(runtimePreview)}</div>

        <div className="boothEngineActions">
          <button type="button" className="boothToolbarBtn boothToolbarBtn--primary" onClick={handleMaterialize} disabled={busy}>
            {busy ? "Working..." : "Materialize next insert"}
          </button>
        </div>
      </div>

      <div className="boothSubsectionTitle">System inserts in queue</div>
      <div className="boothQueueList">
        {systemItems.length === 0 ? (
          <div className="boothEmptyState">No system inserts are sitting in the queue right now.</div>
        ) : (
          systemItems.map((item) => <QueueItemRow key={`system-${item.id}`} item={item} compact />)
        )}
      </div>
    </PanelShell>
  );
}
