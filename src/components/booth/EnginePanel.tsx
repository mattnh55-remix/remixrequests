"use client";

import type { RuntimePreview } from "./types";

type Props = {
  preview: RuntimePreview | null;
  onMaterialize: () => void;
};

function prettyAction(action?: string) {
  if (!action || action === "NO_ACTION") return "Idle";
  if (action === "PLAY_QUEUE_ITEM") return "Play Next Song";
  if (action === "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM") return "Insert Then Play";
  return action.replaceAll("_", " ");
}

function prettyReason(reason?: string) {
  if (!reason) return "Watching queue";
  if (reason === "DIRECT_PLAY") return "Direct play";
  if (reason === "NO_PLAYABLE_QUEUE_ITEM") return "No playable queue item";
  return reason.replaceAll("_", " ").toLowerCase();
}

export default function EnginePanel({ preview, onMaterialize }: Props) {
  return (
    <div className="columnPanel columnPanel--engine">
      <div className="panelHead">
        <div>
          <h3>Smart Insert / Engine</h3>
          <p>Automatic system inserts and next-action status.</p>
        </div>
        <span className="headTag">Backend Controlled</span>
      </div>

      <div className="engineBox gunmetalBox">
        <div className="engineTopRow">
          <div className="sectionLabel">Next Action</div>
          <span className="rowPill rowPill--armed">Armed</span>
        </div>
        <div className="engineTitle">{prettyAction(preview?.action)}</div>
        <div className="engineGrid">
          <div className="engineKey">Target</div>
          <div className="engineVal">{preview?.targetTitle ? `${preview.targetTitle}${preview.targetArtist ? ` • ${preview.targetArtist}` : ""}` : "—"}</div>
          <div className="engineKey">Reason</div>
          <div className="engineVal">{prettyReason(preview?.reason)}</div>
          <div className="engineKey">Cluster</div>
          <div className="engineVal">{preview?.clusterId || "—"}</div>
        </div>

        <button type="button" className="gunBtn gunBtn--wide gunBtn--magenta" onClick={onMaterialize}>Materialize Next Insert</button>
      </div>

      <div className="gunmetalBox systemListBox">
        <div className="sectionLabel">System Inserts in Queue</div>
        <div className="emptyMini">No system inserts are sitting in the queue right now.</div>
      </div>
    </div>
  );
}
