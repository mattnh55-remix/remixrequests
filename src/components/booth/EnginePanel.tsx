"use client";

import type { BoothMode, RuntimePreview } from "./types";

export default function EnginePanel({
  preview,
  mode,
  onMaterialize,
}: {
  preview: RuntimePreview | null;
  mode: BoothMode;
  onMaterialize?: () => void;
}) {
  return (
    <div className={`boothPanel boothPanel--engine ${mode === "performance" ? "boothPanel--compact" : ""}`}>
      <div className="panelHead">
        <div>
          <div className="panelTitle">Smart Insert / Engine</div>
          <div className="panelSub">Automatic system inserts and next-action status.</div>
        </div>
        <div className="statusPill statusPill--muted">BACKEND CONTROLLED</div>
      </div>

      <div className="engineBox">
        <div className="engineBoxHeader">
          <div className="engineLabel">Next Action</div>
          <div className="statusPill statusPill--loaded">ARMED</div>
        </div>
        <div className="engineAction">{preview?.action === "PLAY_QUEUE_ITEM" ? "Play Next Song" : preview?.action || "No Action"}</div>
        <div className="engineGrid">
          <div className="engineRow"><span>Target</span><strong>{preview?.targetTitle || "—"}{preview?.targetArtist ? ` • ${preview.targetArtist}` : ""}</strong></div>
          <div className="engineRow"><span>Reason</span><strong>{preview?.reason === "DIRECT_PLAY" ? "Direct play" : preview?.reason || "—"}</strong></div>
          <div className="engineRow"><span>Cluster</span><strong>{preview?.clusterId || "—"}</strong></div>
        </div>
        <button className="gunmetalBtn gunmetalBtn--magenta gunmetalBtn--wide" type="button" onClick={onMaterialize}>MATERIALIZE NEXT INSERT</button>
      </div>

      <div className="insertBlock">
        <div className="insertBlockTitle">System Inserts in Queue</div>
        <div className="insertBlockBody">No system inserts are sitting in the queue right now.</div>
      </div>
    </div>
  );
}
