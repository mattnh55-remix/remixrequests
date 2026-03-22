"use client";

import { useState } from "react";
import PanelShell from "./PanelShell";
import QueueItemRow from "./QueueItemRow";
import StatusBadge from "./StatusBadge";
import { isInterstitial, triggerMaterialize } from "./booth-utils";
import type { QueueLikeItem, RuntimePreview } from "./types";

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
      onMaterialized?.({ ok: true, message: `Engine materializer returned ${reason}.` });
      return;
    }

    onMaterialized?.({ ok: false, message: "Engine materializer request failed." });
  }

  const actionLabel = String(runtimePreview?.interstitialTitle || runtimePreview?.action || "ENGINE IDLE").toUpperCase();

  return (
    <PanelShell
      title="SMART INSERT / ENGINE"
      subtitle="Backend-owned interstitial lane. Preview is derived from live queue and materializer state."
      right={<StatusBadge label="BACKEND CONTROLLED" tone="muted" />}
    >
      <div className="boothEngineCard">
        <div className="boothEngineLabel">ENGINE STATE</div>

        <div className="boothEngineBody">
          <div className="boothEngineAction">{actionLabel}</div>

          <div className="boothEngineList">
            <div className="boothEngineRow">
              <span>Reason</span>
              <strong>{runtimePreview?.reason || "DIRECT_PLAY / IDLE"}</strong>
            </div>
            <div className="boothEngineRow">
              <span>Target song</span>
              <strong>
                {runtimePreview?.targetTitle || "—"}
                {runtimePreview?.targetArtist ? ` • ${runtimePreview.targetArtist}` : ""}
              </strong>
            </div>
            <div className="boothEngineRow">
              <span>Cluster</span>
              <strong>{runtimePreview?.clusterId || "—"}</strong>
            </div>
          </div>

          <div className="boothEngineActions">
            <button type="button" className="boothToolbarBtn" onClick={handleMaterialize} disabled={busy}>
              {busy ? "Materializing..." : "Materialize Next Insert"}
            </button>
          </div>
        </div>
      </div>

      <div className="boothSubsectionTitle">UPCOMING SYSTEM ITEMS</div>
      <div className="boothQueueList">
        {systemItems.length === 0 ? (
          <div className="boothEmptyState">No materialized interstitials in queue right now.</div>
        ) : (
          systemItems.map((item) => <QueueItemRow key={`system-${item.id}`} item={item} compact />)
        )}
      </div>
    </PanelShell>
  );
}
