"use client";

import StatusBadge from "./StatusBadge";
import type { BoothMode, RuntimePreview } from "./types";

type EnginePanelProps = {
  preview: RuntimePreview | null;
  mode?: BoothMode;
  busy?: boolean;
  onMaterialize?: () => void | Promise<unknown>;
};

export default function EnginePanel({
  preview,
  mode = "visual",
  busy = false,
  onMaterialize,
}: EnginePanelProps) {
  const actionLabel = String(preview?.action || "NO_ACTION").replaceAll("_", " ").trim();
  const reasonLabel = String(preview?.reason || "NO_PLAYABLE_QUEUE_ITEM").replaceAll("_", " ").trim();

  return (
    <section className={`boothPanel ${mode === "performance" ? "is-compact" : ""}`}>
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Engine</div>
          <div className="boothPanelSub">Runtime materializer preview</div>
        </div>
        <StatusBadge label="Live" tone="pink" />
      </div>

      <div className="boothEngineCard">
        <div className="boothEngineLabel">Next action</div>
        <div className="boothEngineAction">{actionLabel}</div>

        <div className="boothEngineList">
          <div className="boothEngineRow">
            <span>Reason</span>
            <strong>{reasonLabel}</strong>
          </div>
          <div className="boothEngineRow">
            <span>Target song</span>
            <strong>
              {preview?.targetTitle || "—"}
              {preview?.targetArtist ? ` • ${preview.targetArtist}` : ""}
            </strong>
          </div>
          <div className="boothEngineRow">
            <span>Interstitial</span>
            <strong>{preview?.interstitialTitle || "—"}</strong>
          </div>
          <div className="boothEngineRow">
            <span>Cluster</span>
            <strong>{preview?.clusterId || "—"}</strong>
          </div>
        </div>

        <div className="boothEngineActions">
          <button type="button" className="gunmetalBtn gunmetalBtn--primary" onClick={() => void onMaterialize?.()} disabled={busy}>
            {busy ? "Materializing..." : "Materialize Next Insert"}
          </button>
        </div>
      </div>
    </section>
  );
}
