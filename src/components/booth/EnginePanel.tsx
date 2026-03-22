"use client";

import PanelShell from "./PanelShell";
import QueueItemRow from "./QueueItemRow";
import StatusBadge from "./StatusBadge";
import { isInterstitial } from "./booth-utils";
import type { QueueLikeItem, RuntimePreview } from "./types";

export default function EnginePanel({
  runtimePreview,
  queue,
}: {
  runtimePreview: RuntimePreview | null;
  queue: QueueLikeItem[];
}) {
  const systemItems = queue.filter(isInterstitial).slice(0, 6);

  return (
    <PanelShell
      title="SMART INSERT / ENGINE"
      subtitle="Preview lane for backend-controlled inserts."
      right={<StatusBadge label="READ-ONLY" tone="muted" />}
    >
      <div className="boothEngineCard">
        <div className="boothEngineLabel">NEXT ENGINE DECISION</div>

        {runtimePreview ? (
          <div className="boothEngineBody">
            <div className="boothEngineAction">
              {String(runtimePreview.interstitialTitle || runtimePreview.action || "NO ACTION").toUpperCase()}
            </div>

            <div className="boothEngineList">
              <div className="boothEngineRow">
                <span>Reason</span>
                <strong>{runtimePreview.reason || "—"}</strong>
              </div>
              <div className="boothEngineRow">
                <span>Target song</span>
                <strong>
                  {runtimePreview.targetTitle || "—"}
                  {runtimePreview.targetArtist ? ` • ${runtimePreview.targetArtist}` : ""}
                </strong>
              </div>
              <div className="boothEngineRow">
                <span>Cluster</span>
                <strong>{runtimePreview.clusterId || "—"}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="boothEmptyState">Engine preview route not found yet. Layout is wired and ready.</div>
        )}
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
