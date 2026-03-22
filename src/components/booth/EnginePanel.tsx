"use client";

import StatusBadge from "./StatusBadge";
import type { BoothMode, RuntimePreview } from "./types";

type EnginePanelProps = {
  preview: RuntimePreview | null;
  mode?: BoothMode;
  onMaterialize?: () => void | Promise<unknown>;
};

export default function EnginePanel({ preview, mode = "performance", onMaterialize }: EnginePanelProps) {
  const actionLabel = String(preview?.action || "NO_ACTION").replaceAll("_", " ").trim();
  const reasonLabel = String(preview?.reason || "NO_PLAYABLE_QUEUE_ITEM").replaceAll("_", " ").trim();

  return (
    <section className={`boothPanel ${mode === "performance" ? "boothPanel--compact" : ""}`}>
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Engine</div>
          <div className="boothPanelSub">Runtime materializer preview</div>
        </div>
        <StatusBadge label="LIVE" tone="pink" />
      </div>

      <div className="engineBox">
        <div className="engineLabel">Next Action</div>
        <div className="engineAction">{actionLabel}</div>

        <div className="engineGrid">
          <div className="engineRow">
            <span>Reason</span>
            <strong>{reasonLabel}</strong>
          </div>
          <div className="engineRow">
            <span>Target Song</span>
            <strong>
              {preview?.targetTitle || "—"}
              {preview?.targetArtist ? ` • ${preview.targetArtist}` : ""}
            </strong>
          </div>
          <div className="engineRow">
            <span>Interstitial</span>
            <strong>{preview?.interstitialTitle || "—"}</strong>
          </div>
          <div className="engineRow">
            <span>Cluster</span>
            <strong>{preview?.clusterId || "—"}</strong>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <button type="button" className="gunmetalBtn gunmetalBtn--primary gunmetalBtn--wide" onClick={() => void onMaterialize?.()}>
            Materialize Next Insert
          </button>
        </div>
      </div>
    </section>
  );
}
