"use client";

import { useEffect, useMemo, useState } from "react";
import PanelShell from "./PanelShell";
import type {
  ActiveInterstitialPlayback,
  DueInterstitialPromptOption,
  InterstitialPadItem,
} from "./types";

type InterstitialPadProps = {
  location: string;
  activeAssetId?: string | null;
  activePlayback?: ActiveInterstitialPlayback | null;
  optionHistoryMap?: Record<string, string>;
  onPlayAsset: (asset: InterstitialPadItem | DueInterstitialPromptOption) => Promise<void>;
  onStopPlayback: () => Promise<unknown>;
};

type LoadState = "idle" | "loading" | "ready" | "error";
type TabKey =
  | "ANNOUNCEMENTS"
  | "SONG_INTROS"
  | "GAMES_DANCES"
  | "REMIX_PROMOS";

const TAB_ORDER: TabKey[] = [
  "ANNOUNCEMENTS",
  "SONG_INTROS",
  "GAMES_DANCES",
  "REMIX_PROMOS",
];

const TAB_LABELS: Record<TabKey, string> = {
  ANNOUNCEMENTS: "ANNOUNCEMENTS",
  SONG_INTROS: "SONG INTROS",
  GAMES_DANCES: "GAMES & DANCES",
  REMIX_PROMOS: "REMIX & PROMOS",
};

function normalizeTab(category: string | null | undefined): TabKey {
  const value = String(category ?? "").trim().toUpperCase();

  if (value === "ANNOUNCEMENTS") return "ANNOUNCEMENTS";
  if (value === "SONG_INTROS") return "SONG_INTROS";
  if (value === "GAMES_DANCES") return "GAMES_DANCES";
  return "REMIX_PROMOS";
}

function formatDuration(durationSec?: number | null) {
  const seconds = Number(durationSec ?? 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

function getFileValue(asset: InterstitialPadItem | DueInterstitialPromptOption) {
  if ("filePath" in asset || "fileUrl" in asset) {
    return String(
      (asset as InterstitialPadItem).filePath ??
        (asset as InterstitialPadItem).fileUrl ??
        "",
    ).trim();
  }
  return "";
}

export default function InterstitialPad({
  location,
  activeAssetId,
  activePlayback,
  optionHistoryMap,
  onPlayAsset,
  onStopPlayback,
}: InterstitialPadProps) {
  const [assets, setAssets] = useState<InterstitialPadItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("ANNOUNCEMENTS");
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);
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
    const groups: Record<TabKey, InterstitialPadItem[]> = {
      ANNOUNCEMENTS: [],
      SONG_INTROS: [],
      GAMES_DANCES: [],
      REMIX_PROMOS: [],
    };

    for (const asset of assets) {
      groups[normalizeTab(asset.category)].push(asset);
    }

    return groups;
  }, [assets]);

  const visibleTabs = useMemo(
    () => TAB_ORDER.filter((tab) => groupedAssets[tab].length > 0),
    [groupedAssets],
  );

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0]);
    }
  }, [activeTab, visibleTabs]);

  const activeAssets = groupedAssets[activeTab] ?? [];

  async function handlePlay(asset: InterstitialPadItem) {
    const filename = getFileValue(asset);
    if (!filename) {
      setError(`Missing filename for ${asset.name}.`);
      return;
    }

    setBusyAssetId(asset.id);
    setError(null);

    try {
      await onPlayAsset(asset);
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
      }
    } catch (err) {
      console.error("Interstitial pad stop failed", err);
      setError("Could not stop interstitial playback.");
    } finally {
      setStopping(false);
    }
  }

  const subtitle =
    loadState === "ready"
      ? `${assets.length} active assets • booth-fired from folder tabs`
      : "Manual bridge-triggered interstitial soundboard";

  return (
    <>
      <PanelShell
        title="Interstitial Pad"
        subtitle={subtitle}
        right={
          <div className="rrPadTopActions">
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
              disabled={stopping || !activePlayback}
            >
              {stopping ? "Stopping..." : "Stop"}
            </button>
          </div>
        }
      >
        <div className="rrPadShell">
          {activePlayback ? (
            <div className="rrPadLiveBanner">
              <div className="rrPadLiveBanner__label">NOW PLAYING INTERSTITIAL</div>
              <div className="rrPadLiveBanner__name">{activePlayback.assetName}</div>
              <div className="rrPadLiveBanner__sub">
                {TAB_LABELS[normalizeTab(activePlayback.category)]}
              </div>
              <div className="rrPadLiveBanner__overlay">LIVE</div>
            </div>
          ) : null}

          <div className="rrFolderTabsWrap">
            <div className="rrFolderTabs">
              {(visibleTabs.length ? visibleTabs : TAB_ORDER).map((tab) => {
                const count = groupedAssets[tab]?.length ?? 0;
                const active = tab === activeTab;

                return (
                  <button
                    key={tab}
                    type="button"
                    className={`rrFolderTab ${active ? "rrFolderTab--active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    <span className="rrFolderTab__text">{TAB_LABELS[tab]}</span>
                    <strong className="rrFolderTab__count">{count}</strong>
                  </button>
                );
              })}
            </div>

            <div className="rrFolderTray">
              {error ? <div className="rrPadError">{error}</div> : null}

              {loadState === "loading" ? (
                <div className="rrPadEmpty">Loading interstitial assets...</div>
              ) : null}

              {loadState !== "loading" && activeAssets.length === 0 ? (
                <div className="rrPadEmpty">No active assets in this category yet.</div>
              ) : null}

              {activeAssets.length > 0 ? (
                <div className="rrPadGrid">
                  {activeAssets.map((asset) => {
                    const durationLabel = formatDuration(asset.durationSec);
                    const isBusy = asset.id === busyAssetId;
                    const isPlaying = asset.id === activeAssetId;
                    const historyText = optionHistoryMap?.[asset.id] ?? "Tap to fire";

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        className={`rrPadTile ${isPlaying ? "rrPadTile--playing" : ""}`}
                        onClick={() => void handlePlay(asset)}
                        disabled={isBusy || stopping}
                      >
                        <div className="rrPadTile__media">
                          {asset.previewGifUrl ? (
                            <img
                              src={asset.previewGifUrl}
                              alt={asset.name}
                              className="rrPadTile__gif"
                            />
                          ) : (
                            <div className="rrPadTile__fallback">
                              {asset.iconLabel?.trim() || TAB_LABELS[normalizeTab(asset.category)]}
                            </div>
                          )}

                          {isPlaying ? (
                            <div className="rrPadTile__liveOverlay">
                              <div className="rrPadTile__liveText">INTERSTITIAL LIVE</div>
                            </div>
                          ) : null}
                        </div>

                        <div className="rrPadTile__body">
                          <div className="rrPadTile__topline">
                            <span className="rrPadTile__category">
                              {TAB_LABELS[normalizeTab(asset.category)]}
                            </span>
                            {durationLabel ? (
                              <span className="rrPadTile__duration">{durationLabel}</span>
                            ) : null}
                          </div>

                          <div className="rrPadTile__title">{asset.name}</div>
                          <div className="rrPadTile__history">{historyText}</div>

                          <div className="rrPadTile__footer">
                            <span className="rrPadTile__cta">
                              {isBusy ? "Starting..." : isPlaying ? "Playing" : "Play"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </PanelShell>

      <style jsx>{`
        .rrPadShell {
          display: grid;
          gap: 10px;
        }

        .rrPadTopActions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .rrPadLiveBanner {
          position: relative;
          overflow: hidden;
          border-radius: 10px;
          border: 1px solid rgba(111, 192, 255, 0.22);
          background:
            linear-gradient(135deg, rgba(11, 36, 59, 0.98), rgba(8, 18, 31, 0.98)),
            radial-gradient(circle at 18% 50%, rgba(69, 165, 255, 0.18), transparent 42%);
          padding: 14px 16px;
          min-height: 92px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 10px 24px rgba(8, 22, 42, 0.28);
        }

        .rrPadLiveBanner__label {
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1.6px;
          color: rgba(170, 214, 255, 0.88);
          text-transform: uppercase;
        }

        .rrPadLiveBanner__name {
          margin-top: 4px;
          font-size: 21px;
          line-height: 1;
          font-weight: 1000;
          color: #f4fbff;
        }

        .rrPadLiveBanner__sub {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(219, 232, 250, 0.82);
        }

        .rrPadLiveBanner__overlay {
          position: absolute;
          right: 12px;
          top: 12px;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 2px;
          color: rgba(255, 228, 157, 0.95);
          text-transform: uppercase;
          animation: rrPadPulse 1.25s ease-in-out infinite;
        }

        .rrFolderTabsWrap {
          display: grid;
          gap: 0;
        }

.rrFolderTabs {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  overflow: hidden;
  padding-bottom: 0;
}

.rrFolderTab {
  appearance: none;
  border: 1px solid rgba(255,255,255,0.12);
  border-bottom: none;
  background: linear-gradient(180deg, rgba(35, 44, 58, 0.98), rgba(18, 23, 33, 0.98));
  color: rgba(221, 232, 246, 0.78);
  min-height: 34px;
  padding: 0 7px;
  border-radius: 8px 8px 0 0;
  display: inline-flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  top: 1px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  flex: 1 1 0;
  min-width: 0;
}

.rrFolderTab__text {
  font-size: 9px;
  font-weight: 1000;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  line-height: 1;
}

.rrFolderTab__count {
  min-width: 15px;
  height: 15px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  line-height: 1;
  flex: 0 0 auto;
}

        .rrFolderTray {
          border: 1px solid rgba(106, 189, 255, 0.18);
          border-radius: 0 10px 10px 10px;
          background:
            linear-gradient(180deg, rgba(15, 21, 31, 0.98), rgba(9, 14, 22, 0.98));
          padding: 10px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 12px 22px rgba(0,0,0,0.16);
        }

        .rrPadError,
        .rrPadEmpty {
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(231, 239, 250, 0.8);
        }

        .rrPadError {
          border-color: rgba(255, 110, 132, 0.22);
          color: #ffd3db;
        }

        .rrPadGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .rrPadTile {
          appearance: none;
          text-align: left;
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background:
            linear-gradient(180deg, rgba(23, 31, 45, 0.98), rgba(10, 15, 25, 0.98));
          color: #f2f7ff;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 10px 22px rgba(0,0,0,0.18);
          transition:
            transform 120ms ease,
            border-color 120ms ease,
            box-shadow 120ms ease;
        }

        .rrPadTile:hover {
          transform: translateY(-1px);
          border-color: rgba(111, 192, 255, 0.24);
        }

        .rrPadTile--playing {
          border-color: rgba(255, 214, 117, 0.42);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 0 0 1px rgba(255, 214, 117, 0.14),
            0 12px 28px rgba(58, 40, 9, 0.24);
        }

        .rrPadTile__media {
          position: relative;
          height: 132px;
          overflow: hidden;
          background:
            linear-gradient(135deg, rgba(58, 128, 190, 0.92), rgba(113, 201, 255, 0.76));
        }

        .rrPadTile__gif {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .rrPadTile__fallback {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          padding: 12px;
          text-align: center;
          font-size: 16px;
          font-weight: 1000;
          line-height: 1.05;
          letter-spacing: 0.6px;
          color: #fff3a6;
          text-transform: uppercase;
        }

        .rrPadTile__liveOverlay {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background:
            linear-gradient(180deg, rgba(255, 203, 77, 0.10), rgba(255, 203, 77, 0.18)),
            radial-gradient(circle at center, rgba(255,255,255,0.06), transparent 60%);
          backdrop-filter: blur(1px);
        }

        .rrPadTile__liveText {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 228, 157, 0.42);
          background: rgba(13, 18, 27, 0.72);
          color: #fff0b2;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.6px;
          animation: rrPadPulse 1.1s ease-in-out infinite;
        }

        .rrPadTile__body {
          display: grid;
          gap: 6px;
          padding: 11px 12px 12px;
        }

        .rrPadTile__topline {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
        }

        .rrPadTile__category,
        .rrPadTile__duration {
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(216, 228, 245, 0.74);
        }

        .rrPadTile__title {
          font-size: 17px;
          line-height: 1.02;
          font-weight: 1000;
          color: #f8fbff;
        }

        .rrPadTile__history {
          font-size: 11px;
          color: rgba(210, 222, 241, 0.72);
        }

        .rrPadTile__footer {
          display: flex;
          justify-content: flex-end;
        }

        .rrPadTile__cta {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #9ad9ff;
        }

        @keyframes rrPadPulse {
          0%, 100% { opacity: 0.72; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }

        @media (max-width: 1280px) {
          .rrPadGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}