"use client";

import { useEffect, useMemo, useState } from "react";
import PanelShell from "./PanelShell";
import StatusBadge from "./StatusBadge";

type InterstitialAssetPadItem = {
  id: string;
  name: string;
  category: string;
  durationSec?: number | null;
  filePath?: string | null;
  fileUrl?: string | null;
  active?: boolean;
};

type InterstitialPadProps = {
  location: string;
  onPlayAsset: (filename: string) => Promise<unknown>;
  onStopPlayback: () => Promise<unknown>;
};

type LoadState = "idle" | "loading" | "ready" | "error";

type TabKey =
  | "BRANDING"
  | "RULES"
  | "GAME"
  | "BIRTHDAY"
  | "SAFETY"
  | "REQUEST_SINGLE"
  | "REQUEST_BLOCK"
  | "OTHER";

const TAB_ORDER: TabKey[] = [
  "BRANDING",
  "RULES",
  "GAME",
  "BIRTHDAY",
  "SAFETY",
  "REQUEST_SINGLE",
  "REQUEST_BLOCK",
  "OTHER",
];

const TAB_LABELS: Record<TabKey, string> = {
  BRANDING: "BRANDING",
  RULES: "RULES",
  GAME: "GAME",
  BIRTHDAY: "BIRTHDAY",
  SAFETY: "SAFETY",
  REQUEST_SINGLE: "REQUEST SINGLE",
  REQUEST_BLOCK: "REQUEST BLOCK",
  OTHER: "OTHER",
};

function normalizeTab(category: string | null | undefined): TabKey {
  const value = String(category ?? "").trim().toUpperCase();

  if (value === "BRANDING_SHORT") return "BRANDING";
  if (value === "RULES_ANNOUNCEMENT") return "RULES";
  if (value === "GAME_ANNOUNCEMENT") return "GAME";
  if (value === "BIRTHDAY") return "BIRTHDAY";
  if (value === "SAFETY") return "SAFETY";
  if (value === "REQUEST_INTRO_SINGLE" || value === "REQUEST_SINGLE") return "REQUEST_SINGLE";
  if (value === "REQUEST_INTRO_BLOCK" || value === "REQUEST_BLOCK") return "REQUEST_BLOCK";
  return "OTHER";
}

function formatDuration(durationSec?: number | null) {
  const seconds = Number(durationSec ?? 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

function resolvePlaybackFilename(asset: InterstitialAssetPadItem) {
  return String(asset.filePath ?? asset.fileUrl ?? "").trim();
}

export default function InterstitialPad({
  location,
  onPlayAsset,
  onStopPlayback,
}: InterstitialPadProps) {
  const [assets, setAssets] = useState<InterstitialAssetPadItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("BRANDING");
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  async function loadAssets() {
    setLoadState("loading");
    setError(null);

    try {
      const res = await fetch(`/api/booth/interstitial-assets/${location}`, {
        cache: "no-store",
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setAssets([]);
        setLoadState("error");
        setError(payload?.error || "Could not load interstitial pad assets.");
        return;
      }

      const nextAssets = Array.isArray(payload?.assets) ? payload.assets : [];
      setAssets(nextAssets);
      setLoadState("ready");
    } catch (err) {
      console.error("Failed to load interstitial pad assets", err);
      setAssets([]);
      setLoadState("error");
      setError("Could not load interstitial pad assets.");
    }
  }

  useEffect(() => {
    void loadAssets();
  }, [location]);

  const groupedAssets = useMemo(() => {
    const groups: Record<TabKey, InterstitialAssetPadItem[]> = {
      BRANDING: [],
      RULES: [],
      GAME: [],
      BIRTHDAY: [],
      SAFETY: [],
      REQUEST_SINGLE: [],
      REQUEST_BLOCK: [],
      OTHER: [],
    };

    for (const asset of assets) {
      groups[normalizeTab(asset.category)].push(asset);
    }

    return groups;
  }, [assets]);

  const visibleTabs = useMemo(
    () => TAB_ORDER.filter((tab) => groupedAssets[tab].length > 0),
    [groupedAssets]
  );

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0]);
    }
  }, [activeTab, visibleTabs]);

  const activeAssets = groupedAssets[activeTab] ?? [];

  async function handlePlay(asset: InterstitialAssetPadItem) {
    const filename = resolvePlaybackFilename(asset);
    if (!filename) {
      setError(`Missing filename for ${asset.name}.`);
      return;
    }

    setBusyAssetId(asset.id);
    setError(null);

    try {
      const result: any = await onPlayAsset(filename);
      if (result?.ok === false) {
        setError(`Could not play ${asset.name}.`);
        return;
      }
      setPlayingAssetId(asset.id);
    } catch (err) {
      console.error("Interstitial pad play failed", err);
      setError(`Could not play ${asset.name}.`);
    } finally {
      setBusyAssetId(null);
    }
  }

  async function handleStop() {
    setStopping(true);
    setError(null);

    try {
      const result: any = await onStopPlayback();
      if (result?.ok === false) {
        setError("Could not stop interstitial playback.");
        return;
      }
      setPlayingAssetId(null);
    } catch (err) {
      console.error("Interstitial pad stop failed", err);
      setError("Could not stop interstitial playback.");
    } finally {
      setStopping(false);
    }
  }

  const subtitle =
    loadState === "ready"
      ? `${assets.length} active assets • tap to fire directly through the booth bridge`
      : "Manual bridge-triggered interstitial soundboard";

  return (
    <>
      <PanelShell
        title="Interstitial Pad"
        subtitle={subtitle}
        right={
          <div className="interstitialPadTopActions">
            <button
              type="button"
              className="boothMiniBtn boothMiniBtn--ghost"
              onClick={() => void loadAssets()}
              disabled={loadState === "loading"}
            >
              {loadState === "loading" ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              className="boothMiniBtn boothMiniBtn--danger"
              onClick={() => void handleStop()}
              disabled={stopping || !playingAssetId}
            >
              {stopping ? "Stopping..." : "Stop"}
            </button>
          </div>
        }
      >
        <div className="interstitialPadWrap">
          <div className="interstitialTabRow">
            {(visibleTabs.length ? visibleTabs : TAB_ORDER.slice(0, 7)).map((tab) => {
              const count = groupedAssets[tab]?.length ?? 0;
              const active = tab === activeTab;

              return (
                <button
                  key={tab}
                  type="button"
                  className={`interstitialTab ${active ? "interstitialTab--active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  <span>{TAB_LABELS[tab]}</span>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>

          {error ? <div className="interstitialPadError">{error}</div> : null}

          {loadState === "loading" ? (
            <div className="interstitialPadEmpty">Loading interstitial assets...</div>
          ) : null}

          {loadState !== "loading" && activeAssets.length === 0 ? (
            <div className="interstitialPadEmpty">No active assets in this category yet.</div>
          ) : null}

          {activeAssets.length > 0 ? (
            <div className="interstitialPadGrid">
              {activeAssets.map((asset) => {
                const durationLabel = formatDuration(asset.durationSec);
                const isPlaying = asset.id === playingAssetId;
                const isBusy = asset.id === busyAssetId;

                return (
                  <div
                    key={asset.id}
                    className={`interstitialCard ${isPlaying ? "interstitialCard--playing" : ""}`}
                  >
                    <div className="interstitialCardTop">
                      <div className="interstitialCardEyebrow">{TAB_LABELS[normalizeTab(asset.category)]}</div>
                      <div className="interstitialCardBadges">
                        {durationLabel ? <StatusBadge label={durationLabel} tone="cyan" /> : null}
                        {isPlaying ? <StatusBadge label="PLAYING" tone="gold" /> : null}
                      </div>
                    </div>

                    <div className="interstitialCardTitle">{asset.name}</div>
                    <div className="interstitialCardMeta">{asset.category}</div>

                    <div className="interstitialCardActions">
                      <button
                        type="button"
                        className={`boothActionBtn boothActionBtn--primary ${isPlaying ? "boothActionBtn--disabled" : ""}`}
                        onClick={() => void handlePlay(asset)}
                        disabled={isPlaying || isBusy || stopping}
                      >
                        {isBusy ? "Playing..." : isPlaying ? "Live" : "Play"}
                      </button>

                      <button
                        type="button"
                        className="boothActionBtn boothActionBtn--secondary"
                        onClick={() => void handleStop()}
                        disabled={!isPlaying || stopping}
                      >
                        {stopping && isPlaying ? "Stopping..." : "Stop"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </PanelShell>

      <style jsx>{`
        .interstitialPadWrap {
          display: grid;
          gap: 10px;
        }
        .interstitialPadTopActions {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .interstitialTabRow {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .interstitialTab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(120, 149, 182, 0.28);
          background: linear-gradient(180deg, rgba(24, 33, 47, 0.95), rgba(10, 18, 29, 0.98));
          color: rgba(235, 242, 252, 0.84);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          cursor: pointer;
        }
        .interstitialTab strong {
          min-width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #f7fbff;
          font-size: 10px;
        }
        .interstitialTab--active {
          border-color: rgba(111, 223, 255, 0.58);
          box-shadow: 0 0 0 1px rgba(111, 223, 255, 0.18), 0 0 20px rgba(40, 191, 255, 0.12);
          color: #ffffff;
        }
        .interstitialPadGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .interstitialCard {
          display: grid;
          gap: 8px;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid rgba(100, 127, 156, 0.22);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)),
            linear-gradient(180deg, rgba(17, 24, 36, 0.98), rgba(8, 14, 24, 1));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 18px rgba(0,0,0,0.18);
        }
        .interstitialCard--playing {
          border-color: rgba(255, 211, 122, 0.5);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 0 0 1px rgba(255, 211, 122, 0.14),
            0 0 24px rgba(255, 189, 84, 0.16);
        }
        .interstitialCardTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .interstitialCardEyebrow {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.12em;
          color: rgba(107, 216, 255, 0.86);
        }
        .interstitialCardBadges {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .interstitialCardTitle {
          font-size: 16px;
          font-weight: 900;
          line-height: 1.15;
          color: #f6fbff;
        }
        .interstitialCardMeta {
          font-size: 11px;
          color: rgba(210, 221, 236, 0.62);
        }
        .interstitialCardActions {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 6px;
        }
        .interstitialPadError,
        .interstitialPadEmpty {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(105, 123, 147, 0.2);
          background: rgba(9, 15, 24, 0.72);
          color: rgba(235, 241, 249, 0.76);
          font-size: 12px;
        }
        .interstitialPadError {
          border-color: rgba(255, 115, 115, 0.32);
          color: #ffb2b2;
        }
        .boothMiniBtn {
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(120, 149, 182, 0.24);
          background: linear-gradient(180deg, rgba(27, 37, 52, 0.95), rgba(10, 18, 29, 0.98));
          color: #f2f7ff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          cursor: pointer;
        }
        .boothMiniBtn:disabled,
        .boothActionBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .boothMiniBtn--danger {
          border-color: rgba(255, 107, 107, 0.28);
        }
        .boothActionBtn {
          min-height: 36px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid rgba(111, 145, 182, 0.24);
          color: #f2f7ff;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          cursor: pointer;
        }
        .boothActionBtn--primary {
          background: linear-gradient(180deg, rgba(28, 150, 201, 0.9), rgba(17, 93, 152, 0.95));
          border-color: rgba(109, 224, 255, 0.42);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 18px rgba(11, 83, 120, 0.22);
        }
        .boothActionBtn--secondary {
          background: linear-gradient(180deg, rgba(41, 49, 64, 0.95), rgba(15, 22, 33, 0.98));
        }
        .boothActionBtn--disabled {
          filter: saturate(0.8);
        }
        @media (max-width: 760px) {
          .interstitialPadGrid {
            grid-template-columns: 1fr;
          }
          .interstitialCardActions {
            grid-template-columns: 1fr 1fr;
          }
          .interstitialPadTopActions {
            justify-content: flex-end;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
