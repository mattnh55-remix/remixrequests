"use client";

import { useMemo, useState } from "react";

export type BoothInterstitialAsset = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  previewUrl: string | null;
  playFilename: string | null;
  lastPlayedAt: string | null;
  cooldownMinutes: number;
  cooldownRemainingMinutes: number;
};

type Props = {
  open: boolean;
  category: string | null;
  promptTitle: string | null;
  promptBody: string | null;
  assets: BoothInterstitialAsset[];
  busy?: boolean;
  onPlay: (asset: BoothInterstitialAsset) => Promise<void> | void;
  onSkip: (reason: string) => Promise<void> | void;
  onClose?: () => void;
};

function formatLastPlayed(value: string | null): string {
  if (!value) return "Last played: never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Last played: unknown";

  return `Last played: ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function categoryLabel(value: string | null): string {
  switch (value) {
    case "ANNOUNCEMENTS":
      return "Announcements";
    case "SONG_INTROS":
      return "Song Intros";
    case "GAMES_DANCES":
      return "Games & Dances";
    case "REMIX_PROMOS":
      return "Remix & Promos";
    default:
      return value ?? "Interstitial";
  }
}

function formatDurationFromFilenameFallback(asset: BoothInterstitialAsset): string | null {
  if (asset.cooldownMinutes > 0 && asset.cooldownRemainingMinutes > 0) {
    return `Cooling ${asset.cooldownRemainingMinutes}m`;
  }
  return null;
}

export default function InterstitialPromptModal({
  open,
  category,
  promptTitle,
  promptBody,
  assets,
  busy = false,
  onPlay,
  onSkip,
}: Props) {
  const [skipReason, setSkipReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmitSkip = useMemo(() => skipReason.trim().length > 0, [skipReason]);

  if (!open) return null;

  return (
    <>
      <div className="rrPromptModal">
        <div className="rrPromptModal__backdrop" />
        <div className="rrPromptModal__glow" />

        <div className="rrPromptModal__dialog">
          <div className="rrPromptModal__header">
            <div className="rrPromptModal__pill">Interstitial Due</div>

            <div className="rrPromptModal__headerRow">
              <div className="rrPromptModal__headerMain">
                <h2 className="rrPromptModal__title">
                  {promptTitle || categoryLabel(category)}
                </h2>

                <p className="rrPromptModal__category">
                  {categoryLabel(category)}
                </p>

                {promptBody ? (
                  <p className="rrPromptModal__body">{promptBody}</p>
                ) : null}
              </div>

              <div className="rrPromptModal__notice">
                Choose an asset or skip with a reason.
              </div>
            </div>
          </div>

          <div className="rrPromptModal__content">
            <div className="rrPromptModal__assetsCol">
              <div className="rrPromptModal__sectionLabel">
                Selectable GIF tiles
              </div>

              <div className="rrPromptModal__assetGrid">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setError(null);
                      try {
                        await onPlay(asset);
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : "Failed to play asset."
                        );
                      }
                    }}
                    className="rrPromptAsset"
                    title={asset.title}
                  >
                    <div className="rrPromptAsset__media">
                      {asset.previewUrl ? (
                        <img
                          src={asset.previewUrl}
                          alt={asset.title}
                          className="rrPromptAsset__image"
                        />
                      ) : (
                        <div className="rrPromptAsset__noPreview">
                          No Preview
                        </div>
                      )}
                    </div>

                    <div className="rrPromptAsset__body">
                      <div className="rrPromptAsset__topRow">
                        <h3 className="rrPromptAsset__title">{asset.title}</h3>
                        <span className="rrPromptAsset__playTag">Play</span>
                      </div>

                      {asset.body ? (
                        <p className="rrPromptAsset__text">{asset.body}</p>
                      ) : null}

                      <div className="rrPromptAsset__bottomRow">
                        <div className="rrPromptAsset__meta">
                          {formatLastPlayed(asset.lastPlayedAt)}
                        </div>

                        <div className="rrPromptAsset__fileTag">
                          {asset.playFilename ||
                            formatDurationFromFilenameFallback(asset) ||
                            "No file"}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {error ? (
                <div className="rrPromptModal__error">{error}</div>
              ) : null}
            </div>

            <div className="rrPromptModal__sidecard">
              <div className="rrPromptModal__sectionLabel">Skip Prompt</div>

              <h3 className="rrPromptModal__sideTitle">Skip with reason</h3>

              <p className="rrPromptModal__sideText">
                Skipping requires a reason and will create a SKIPPED event for admin
                review later.
              </p>

              <label className="rrPromptModal__field">
                <span className="rrPromptModal__fieldLabel">Reason</span>

                <textarea
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Example: crowd moment, no clean transition, asset doesn't fit current energy..."
                  className="rrPromptModal__textarea"
                  disabled={busy}
                />
              </label>

              <button
                type="button"
                disabled={busy || !canSubmitSkip}
                onClick={async () => {
                  setError(null);
                  try {
                    await onSkip(skipReason.trim());
                    setSkipReason("");
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Failed to skip prompt."
                    );
                  }
                }}
                className="rrPromptModal__skipBtn"
              >
                {busy ? "Working..." : "Skip Interstitial"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .rrPromptModal {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
        }

        .rrPromptModal__backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
        }

        .rrPromptModal__glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.07),
            transparent 55%
          );
          animation: rrPromptPulse 1.8s ease-in-out infinite;
          pointer-events: none;
        }

        .rrPromptModal__dialog {
          position: relative;
          z-index: 121;
          width: min(1280px, 94vw);
          max-height: min(90vh, 940px);
          overflow: auto;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(18, 22, 29, 0.96);
          box-shadow: 0 30px 120px rgba(0, 0, 0, 0.55);
        }

        .rrPromptModal__header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 22px 28px 20px;
        }

        .rrPromptModal__pill {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid rgba(34, 211, 238, 0.25);
          background: rgba(34, 211, 238, 0.1);
          padding: 7px 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #b7f3ff;
        }

        .rrPromptModal__headerRow {
          margin-top: 14px;
          display: flex;
          gap: 18px;
          align-items: flex-end;
          justify-content: space-between;
        }

        .rrPromptModal__headerMain {
          min-width: 0;
        }

        .rrPromptModal__title {
          margin: 0;
          font-size: 36px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.03em;
          color: #ffffff;
        }

        .rrPromptModal__category {
          margin: 8px 0 0;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }

        .rrPromptModal__body {
          margin: 14px 0 0;
          max-width: 820px;
          font-size: 14px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.72);
        }

        .rrPromptModal__notice {
          flex: 0 0 auto;
          border-radius: 18px;
          border: 1px solid rgba(252, 211, 77, 0.2);
          background: rgba(252, 211, 77, 0.1);
          padding: 14px 16px;
          font-size: 14px;
          color: #fde8b1;
        }

        .rrPromptModal__content {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 24px;
          padding: 24px 28px 28px;
        }

        .rrPromptModal__assetsCol {
          min-width: 0;
        }

        .rrPromptModal__sectionLabel {
          margin-bottom: 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }

        .rrPromptModal__assetGrid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .rrPromptAsset {
          appearance: none;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          text-align: left;
          cursor: pointer;
          transition:
            transform 120ms ease,
            border-color 120ms ease,
            background 120ms ease;
          color: #fff;
        }

        .rrPromptAsset:hover {
          transform: translateY(-2px);
          border-color: rgba(103, 232, 249, 0.35);
          background: rgba(255, 255, 255, 0.06);
        }

        .rrPromptAsset:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .rrPromptAsset__media {
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.3);
        }

        .rrPromptAsset__image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 300ms ease;
        }

        .rrPromptAsset:hover .rrPromptAsset__image {
          transform: scale(1.02);
        }

        .rrPromptAsset__noPreview {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
        }

        .rrPromptAsset__body {
          padding: 15px;
        }

        .rrPromptAsset__topRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .rrPromptAsset__title {
          margin: 0;
          font-size: 17px;
          line-height: 1.2;
          font-weight: 900;
          color: #fff;
        }

        .rrPromptAsset__playTag {
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          padding: 5px 10px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #b7f3ff;
        }

        .rrPromptAsset__text {
          margin: 10px 0 0;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.68);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .rrPromptAsset__bottomRow {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .rrPromptAsset__meta {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.45);
        }

        .rrPromptAsset__fileTag {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
          padding: 5px 10px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rrPromptModal__error {
          margin-top: 16px;
          border-radius: 18px;
          border: 1px solid rgba(251, 113, 133, 0.2);
          background: rgba(251, 113, 133, 0.1);
          padding: 14px 16px;
          font-size: 14px;
          color: #ffd7df;
        }

        .rrPromptModal__sidecard {
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          padding: 18px;
        }

        .rrPromptModal__sideTitle {
          margin: 12px 0 0;
          font-size: 28px;
          line-height: 1.05;
          font-weight: 1000;
          letter-spacing: -0.02em;
          color: #fff;
        }

        .rrPromptModal__sideText {
          margin: 12px 0 0;
          font-size: 14px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.68);
        }

        .rrPromptModal__field {
          display: block;
          margin-top: 18px;
        }

        .rrPromptModal__fieldLabel {
          display: block;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }

        .rrPromptModal__textarea {
          min-height: 140px;
          width: 100%;
          resize: vertical;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.25);
          padding: 14px 15px;
          font-size: 14px;
          color: #fff;
          outline: none;
        }

        .rrPromptModal__textarea::placeholder {
          color: rgba(255, 255, 255, 0.28);
        }

        .rrPromptModal__textarea:focus {
          border-color: rgba(103, 232, 249, 0.35);
        }

        .rrPromptModal__skipBtn {
          width: 100%;
          margin-top: 16px;
          border-radius: 18px;
          border: 1px solid rgba(252, 211, 77, 0.22);
          background: rgba(252, 211, 77, 0.12);
          padding: 14px 16px;
          font-size: 13px;
          font-weight: 1000;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fde8b1;
          cursor: pointer;
          transition: background 120ms ease, opacity 120ms ease;
        }

        .rrPromptModal__skipBtn:hover:not(:disabled) {
          background: rgba(252, 211, 77, 0.16);
        }

        .rrPromptModal__skipBtn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        @keyframes rrPromptPulse {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        @media (max-width: 1100px) {
          .rrPromptModal__content {
            grid-template-columns: 1fr;
          }

          .rrPromptModal__assetGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .rrPromptModal {
            padding: 12px;
          }

          .rrPromptModal__dialog {
            width: 100%;
            max-height: 94vh;
            border-radius: 20px;
          }

          .rrPromptModal__header {
            padding: 18px 18px 16px;
          }

          .rrPromptModal__content {
            padding: 18px;
          }

          .rrPromptModal__headerRow {
            flex-direction: column;
            align-items: stretch;
          }

          .rrPromptModal__title {
            font-size: 28px;
          }

          .rrPromptModal__assetGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}