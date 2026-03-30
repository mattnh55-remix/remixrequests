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

function truncateTitle(value: string, max = 24): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function filenameToDurationLabel(filename: string | null): string | null {
  if (!filename) return null;

  const lowered = filename.toLowerCase();

  const mmss = lowered.match(/(\d{1,2})[:m](\d{2})/);
  if (mmss) {
    const minutes = Number(mmss[1]);
    const seconds = Number(mmss[2]);
    if (!Number.isNaN(minutes) && !Number.isNaN(seconds)) {
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    }
  }

  const secMatch = lowered.match(/(\d{1,3})\s*s(?:ec|econd)?s?/);
  if (secMatch) {
    const total = Number(secMatch[1]);
    if (!Number.isNaN(total)) {
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    }
  }

  return null;
}

function assetRightMeta(asset: BoothInterstitialAsset): string {
  const duration = filenameToDurationLabel(asset.playFilename);
  if (duration) return duration;

  if (asset.cooldownMinutes > 0 && asset.cooldownRemainingMinutes > 0) {
    return `${asset.cooldownRemainingMinutes}m`;
  }

  return "Play";
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

                <p className="rrPromptModal__category">{categoryLabel(category)}</p>

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
              <div className="rrPromptModal__sectionLabel">Selectable assets</div>

              <div className="rrPromptModal__assetGrid">
                {assets.map((asset, index) => (
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
                    style={{ animationDelay: `${index * 36}ms` }}
                  >
                    <div className="rrPromptAsset__shine" />

                    <div className="rrPromptAsset__media">
                      {asset.previewUrl ? (
                        <img
                          src={asset.previewUrl}
                          alt={asset.title}
                          className="rrPromptAsset__image"
                        />
                      ) : (
                        <div className="rrPromptAsset__noPreview">No Preview</div>
                      )}
                    </div>

                    <div className="rrPromptAsset__metaRow">
                      <div className="rrPromptAsset__titleText">
                        {truncateTitle(asset.title)}
                      </div>

                      <div className="rrPromptAsset__duration">
                        {assetRightMeta(asset)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {error ? <div className="rrPromptModal__error">{error}</div> : null}
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
                  className=".rrPromptModal textarea"
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
          position: absolute;
          inset: 0;
          z-index: 120;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
          padding: 10px;
          pointer-events: auto;
          animation: rrPromptModalIn 220ms ease-out;
        }
.rrPromptModal textarea {
  min-height: 44px;
  max-height: 44px;
  height: 44px;
  resize: none;
  overflow: auto;
}

        .rrPromptModal__backdrop {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background: rgba(4, 8, 14, 0.26);
          backdrop-filter: blur(1.5px);
        }

        .rrPromptModal__glow {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background:
            radial-gradient(
              circle at 50% 14%,
              rgba(80, 170, 255, 0.1),
              transparent 48%
            ),
            radial-gradient(
              circle at 18% 28%,
              rgba(0, 229, 255, 0.04),
              transparent 30%
            );
          animation: rrPromptPulse 2s ease-in-out infinite;
          pointer-events: none;
        }

        .rrPromptModal__dialog {
          position: relative;
          z-index: 121;
  	  width: 80%;
  	  height: 92%;
	  margin: auto;
	  border-radius: 12px;
	  max-height: none;
          overflow: auto;
          border-radius: 24px;
          border: 1px solid rgba(120, 170, 220, 0.13);
	background: linear-gradient(
	  180deg,
	  rgba(32, 42, 64, 0.96),
	  rgba(18, 26, 42, 0.96)
	);
	border: 1px solid rgba(120, 160, 220, 0.25);
	box-shadow:
	  0 20px 60px rgba(0, 0, 0, 0.6),
	  inset 0 1px 0 rgba(255, 255, 255, 0.08);
          animation: rrPromptDialogIn 220ms ease-out;
        }

        .rrPromptModal__header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 18px 20px 16px;
        }

        .rrPromptModal__pill {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid rgba(34, 211, 238, 0.22);
          background: rgba(34, 211, 238, 0.08);
          padding: 6px 11px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #b7f3ff;
          box-shadow: 0 0 16px rgba(34, 211, 238, 0.08);
        }

        .rrPromptModal__headerRow {
          margin-top: 12px;
          display: flex;
          gap: 16px;
          align-items: flex-end;
          justify-content: space-between;
        }

        .rrPromptModal__headerMain {
          min-width: 0;
        }

        .rrPromptModal__title {
          margin: 0;
          font-size: 28px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.03em;
          color: #ffffff;
        }

        .rrPromptModal__category {
          margin: 6px 0 0;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.44);
        }

        .rrPromptModal__body {
          margin: 10px 0 0;
          max-width: 760px;
          font-size: 14px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.72);
        }

        .rrPromptModal__notice {
          flex: 0 0 auto;
          border-radius: 16px;
          border: 1px solid rgba(252, 211, 77, 0.18);
          background: linear-gradient(
            180deg,
            rgba(252, 211, 77, 0.1),
            rgba(252, 211, 77, 0.05)
          );
          padding: 11px 13px;
          font-size: 13px;
          color: #f6e2a5;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .rrPromptModal__content {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 18px;
          padding: 18px 20px 20px;
          min-height: calc(100% - 118px);
        }

        .rrPromptModal__assetsCol {
          min-width: 0;
        }

        .rrPromptModal__sectionLabel {
          margin-bottom: 10px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }

        .rrPromptModal__assetGrid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-content: flex-start;
        }

        .rrPromptAsset {
          position: relative;
          appearance: none;
          width: 132px;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.045),
            rgba(255, 255, 255, 0.025)
          );
          text-align: left;
          cursor: pointer;
          transition:
            transform 140ms ease,
            border-color 140ms ease,
            background 140ms ease,
            box-shadow 140ms ease,
            filter 140ms ease;
          color: #fff;
          padding: 0;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 4px 12px rgba(0, 0, 0, 0.14);
          animation: rrTileIn 240ms ease-out both;
        }

        .rrPromptAsset:hover {
          transform: translateY(-3px) scale(1.015);
          border-color: rgba(103, 232, 249, 0.34);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.07),
            rgba(255, 255, 255, 0.035)
          );
          box-shadow:
            0 14px 28px rgba(0, 0, 0, 0.24),
            0 0 0 1px rgba(103, 232, 249, 0.06),
            0 0 18px rgba(103, 232, 249, 0.08);
          filter: saturate(1.03);
        }

        .rrPromptAsset:active {
          transform: translateY(-1px) scale(0.995);
        }

        .rrPromptAsset:focus-visible {
          outline: none;
          border-color: rgba(103, 232, 249, 0.42);
          box-shadow:
            0 0 0 2px rgba(103, 232, 249, 0.14),
            0 12px 24px rgba(0, 0, 0, 0.22);
        }

        .rrPromptAsset:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .rrPromptAsset__shine {
          position: absolute;
          inset: -40% auto auto -85%;
          width: 70%;
          height: 180%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.13),
            transparent
          );
          transform: rotate(18deg);
          opacity: 0;
          pointer-events: none;
          transition: opacity 140ms ease;
        }

        .rrPromptAsset:hover .rrPromptAsset__shine {
          opacity: 1;
          animation: rrTileShine 720ms ease;
        }

        .rrPromptAsset__media {
          width: 100%;
          height: 74px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.26);
        }

        .rrPromptAsset__image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 260ms ease, filter 260ms ease;
        }

        .rrPromptAsset:hover .rrPromptAsset__image {
          transform: scale(1.045);
          filter: brightness(1.04) contrast(1.04);
        }

        .rrPromptAsset__noPreview {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
        }

        .rrPromptAsset__metaRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 9px 10px 10px;
        }

        .rrPromptAsset__titleText {
          min-width: 0;
          flex: 1 1 auto;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 11px;
          line-height: 1.2;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.95);
        }

        .rrPromptAsset__duration {
          flex: 0 0 auto;
          font-size: 10px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(183, 243, 255, 0.8);
        }

        .rrPromptModal__error {
          margin-top: 14px;
          border-radius: 14px;
          border: 1px solid rgba(251, 113, 133, 0.2);
          background: rgba(251, 113, 133, 0.1);
          padding: 12px 14px;
          font-size: 13px;
          color: #ffd7df;
        }

        .rrPromptModal__sidecard {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.045),
            rgba(255, 255, 255, 0.025)
          );
          padding: 16px;
          align-self: start;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .rrPromptModal__sideTitle {
          margin: 10px 0 0;
          font-size: 24px;
          line-height: 1.02;
          font-weight: 1000;
          letter-spacing: -0.02em;
          color: #fff;
        }

        .rrPromptModal__sideText {
          margin: 10px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.68);
        }

        .rrPromptModal__field {
          display: block;
          margin-top: 16px;
        }

        .rrPromptModal__fieldLabel {
          display: block;
          margin-bottom: 7px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }

        .rrPromptModal__textarea {
          min-height: 118px;
          width: 100%;
          resize: vertical;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
          padding: 12px 13px;
          font-size: 14px;
          color: #fff;
          outline: none;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }

        .rrPromptModal__textarea::placeholder {
          color: rgba(255, 255, 255, 0.28);
        }

        .rrPromptModal__textarea:focus {
          border-color: rgba(103, 232, 249, 0.32);
          box-shadow: 0 0 0 2px rgba(103, 232, 249, 0.08);
        }

        .rrPromptModal__skipBtn {
          width: 100%;
          margin-top: 14px;
          border-radius: 16px;
          border: 1px solid rgba(252, 211, 77, 0.22);
          background: linear-gradient(
            180deg,
            rgba(252, 211, 77, 0.14),
            rgba(252, 211, 77, 0.1)
          );
          padding: 13px 14px;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fde8b1;
          cursor: pointer;
          transition:
            background 120ms ease,
            opacity 120ms ease,
            transform 120ms ease,
            box-shadow 120ms ease;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .rrPromptModal__skipBtn:hover:not(:disabled) {
          background: linear-gradient(
            180deg,
            rgba(252, 211, 77, 0.18),
            rgba(252, 211, 77, 0.13)
          );
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.16);
        }

        .rrPromptModal__skipBtn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        @keyframes rrPromptPulse {
          0%,
          100% {
            opacity: 0.58;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes rrPromptModalIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes rrPromptDialogIn {
          0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.988);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes rrTileIn {
          0% {
            opacity: 0;
            transform: translateY(-6px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes rrTileShine {
          0% {
            transform: translateX(0) rotate(18deg);
          }
          100% {
            transform: translateX(230%) rotate(18deg);
          }
        }

        @media (max-width: 1100px) {
          .rrPromptModal__content {
            grid-template-columns: 1fr;
          }

          .rrPromptModal__sidecard {
            max-width: 380px;
          }
        }

        @media (max-width: 760px) {
          .rrPromptModal {
            padding: 8px;
          }

          .rrPromptModal__dialog {
            border-radius: 18px;
          }

          .rrPromptModal__backdrop,
          .rrPromptModal__glow {
            border-radius: 18px;
.rrPromptModal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(6, 10, 18, 0.75);
  backdrop-filter: blur(6px);
}
          }

          .rrPromptModal__header {
            padding: 16px 16px 14px;
          }

          .rrPromptModal__content {
            padding: 16px;
          }

          .rrPromptModal__headerRow {
            flex-direction: column;
            align-items: stretch;
          }

          .rrPromptModal__title {
            font-size: 24px;
          }

          .rrPromptAsset {
            width: calc(50% - 6px);
            min-width: 124px;
          }
        }

        @media (max-width: 520px) {
          .rrPromptAsset {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}