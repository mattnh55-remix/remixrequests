"use client";

import { useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import type { BoothMode, RuntimePreview } from "./types";

type EnginePanelProps = {
  preview: RuntimePreview | null;
  mode?: BoothMode;
  onMaterialize?: () => void | Promise<unknown>;
};

type MaterializeUiState = "idle" | "running" | "success" | "error";

function formatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return "Materialize request failed.";
}

export default function EnginePanel({
  preview,
  mode = "performance",
  onMaterialize,
}: EnginePanelProps) {
  const [uiState, setUiState] = useState<MaterializeUiState>("idle");
  const [message, setMessage] = useState<string>("");

  const actionLabel = String(preview?.action || "NO_ACTION")
    .replaceAll("_", " ")
    .trim();

  const reasonLabel = String(preview?.reason || "NO_PLAYABLE_QUEUE_ITEM")
    .replaceAll("_", " ")
    .trim();

  const statusTone = useMemo(() => {
    if (uiState === "running") return "cyan";
    if (uiState === "success") return "pink";
    if (uiState === "error") return "warn";
    return "pink";
  }, [uiState]);

  const statusLabel = useMemo(() => {
    if (uiState === "running") return "WORKING";
    if (uiState === "success") return "DONE";
    if (uiState === "error") return "CHECK";
    return "LIVE";
  }, [uiState]);

  async function handleMaterializeClick() {
    if (!onMaterialize || uiState === "running") {
      return;
    }

    try {
      setUiState("running");
      setMessage("Calling runtime materializer...");

      const result = await onMaterialize();

      setUiState("success");

      if (result && typeof result === "object") {
        const payload = result as Record<string, unknown>;

        if (payload.materialized === true) {
          const assetName =
            typeof payload.assetName === "string" && payload.assetName.trim()
              ? payload.assetName.trim()
              : "Interstitial inserted.";

          setMessage(`Inserted: ${assetName}`);
        } else if (typeof payload.reason === "string" && payload.reason.trim()) {
          setMessage(`No insert: ${payload.reason}`);
        } else {
          setMessage("Materialize request completed.");
        }
      } else {
        setMessage("Materialize request completed.");
      }

      window.setTimeout(() => {
        setUiState((current) => (current === "success" ? "idle" : current));
      }, 2000);
    } catch (error) {
      console.error("EnginePanel materialize click failed", error);
      setUiState("error");
      setMessage(formatErrorMessage(error));
    }
  }

  return (
    <section
      className={`boothPanel ${mode === "performance" ? "boothPanel--compact" : ""}`}
    >
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Engine</div>
          <div className="boothPanelSub">Runtime materializer preview</div>
        </div>
        <StatusBadge label={statusLabel} tone={statusTone as any} />
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

        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          <button
            type="button"
            className="gunmetalBtn gunmetalBtn--primary gunmetalBtn--wide"
            onClick={handleMaterializeClick}
            disabled={!onMaterialize || uiState === "running"}
          >
            {uiState === "running" ? "Materializing..." : "Materialize Next Insert"}
          </button>

          <div
            style={{
              minHeight: 18,
              fontSize: 11,
              color:
                uiState === "error"
                  ? "#ffb3b3"
                  : uiState === "success"
                  ? "rgba(173, 239, 255, 0.92)"
                  : "rgba(235,241,255,0.72)",
            }}
          >
            {message || "Use this to force the runtime planner to materialize the next interstitial."}
          </div>
        </div>
      </div>
    </section>
  );
}