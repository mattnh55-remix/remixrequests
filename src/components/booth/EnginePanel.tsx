"use client";

import { useMemo, useState } from "react";
import PanelShell from "./PanelShell";
import QueueItemRow from "./QueueItemRow";
import StatusBadge from "./StatusBadge";
import { isInterstitial, triggerMaterialize } from "./booth-utils";
import type { QueueLikeItem, RuntimePreview } from "./types";

function labelReason(reason?: string | null) {
  return String(reason || "DIRECT_PLAY")
    .replaceAll("_", " ")
    .trim();
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

  const explainer = useMemo(() => {
    const reason = String(runtimePreview?.reason || "").toUpperCase();
    if (reason.includes("REQUEST_CLUSTER")) return "Cluster trigger is active. Backend would prefer an intro before the next request block.";
    if (reason.includes("REQUEST_SINGLE")) return "Single request intro opportunity detected before the next playable request.";
    if (reason.includes("TOP_OF_HOUR")) return "Top-of-hour window is eligible for a branding or announcement insert.";
    if (reason.includes("BRANDING")) return "Branding gap fill opportunity is available based on spacing rules.";
    if (reason.includes("MATERIALIZED")) return "A system insert is already sitting in the live queue ahead of the next song.";
    if (reason.includes("NO_PLAYABLE_QUEUE_ITEM")) return "No playable queue item is available yet, so the engine is idle.";
    return "Derived engine state is synced from the live booth queue and materializer responses.";
  }, [runtimePreview?.reason]);

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

  const actionLabel = String(runtimePreview?.interstitialTitle || runtimePreview?.action || "ENGINE IDLE").replaceAll("_", " ").toUpperCase();

  return (
    <PanelShell
      title="SMART INSERT / ENGINE"
      subtitle="Backend-owned interstitial lane. Derived from live queue plus materializer state."
      right={<StatusBadge label="BACKEND CONTROLLED" tone="muted" />}
    >
      <div className="boothEngineCard boothEngineCard--hero">
        <div className="boothEngineHeader">
          <div>
            <div className="boothEngineLabel">ENGINE STATE</div>
            <div className="boothEngineAction">{actionLabel}</div>
          </div>
          <StatusBadge label={runtimePreview?.action === "NO_ACTION" ? "IDLE" : "ARMED"} tone={runtimePreview?.action === "NO_ACTION" ? "muted" : "pink"} />
        </div>

        <div className="boothEngineList">
          <div className="boothEngineRow">
            <span>Reason</span>
            <strong>{labelReason(runtimePreview?.reason)}</strong>
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

        <div className="boothEngineExplain">{explainer}</div>

        <div className="boothEngineActions">
          <button type="button" className="boothToolbarBtn boothToolbarBtn--primary" onClick={handleMaterialize} disabled={busy}>
            {busy ? "Materializing..." : "Materialize Next Insert"}
          </button>
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
