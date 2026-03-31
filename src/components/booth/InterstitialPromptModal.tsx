"use client";

import { useMemo, useState } from "react";

export type BoothInterstitialAsset = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  previewUrl: string | null;
  playFilename: string | null;
  durationSec: number | null;
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

  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `Last played: ${mm}/${dd} ${hh}:${min}`;
}

function formatDuration(durationSec: number | null | undefined): string {
  const n = Number(durationSec ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "Duration unknown";

  if (n < 60) return `${n}s`;

  const m = Math.floor(n / 60);
  const s = n % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
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
  const [skipOpen, setSkipOpen] = useState(false);

  const canSubmitSkip = useMemo(() => skipReason.trim().length > 0, [skipReason]);

  if (!open) return null;

  return (
    <>
      <div className="rrPromptModal">
        <div className="rrPromptModal__backdrop" />

        <div className="rrPromptModal__dialog">
          <div className="rrPromptModal__header">
            <div className="rrPromptModal__metaRow">
              <div className="rrPromptModal__pill">Interstitial Due</div>

              <div className="rrPromptModal__metaInline">
                <span>{categoryLabel(category).toUpperCase()}</span>
                {promptBody ? (
                  <>
                    <span className="rrPromptModal__bullet">•</span>
                    <span>{promptBody}</span>
                  </>
                ) : null}
              </div>
            </div>

            <h2 className="rrPromptModal__title">
              {promptTitle || categoryLabel(category)}
            </h2>
          </div>

          <div className="rrPromptModal__scrollArea">
            <div className="rrPromptModal__content">
              <div className="rrPromptModal__assetsCol">
                <div className="rrPromptModal__sectionLabel">Selectable assets</div>

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
                          <div className="rrPromptAsset__noPreview">No Preview</div>
                        )}
                      </div>

                      <div className="rrPromptAsset__metaBlock">
                        <div className="rrPromptAsset__lastPlayed">
                          {formatLastPlayed(asset.lastPlayedAt)}
                        </div>
                        <div className="rrPromptAsset__duration">
                          {formatDuration(asset.durationSec)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rrPromptModal__bottomBar">
            <div className="rrPromptModal__bottomStatus">
              {error ? (
                <div className="rrPromptModal__error">{error}</div>
              ) : (
                <div className="rrPromptModal__error rrPromptModal__error--placeholder">
                  &nbsp;
                </div>
              )}
            </div>

            <div className="rrPromptModal__footer">
              <button
                type="button"
                className="gunmetalBtn gunmetalBtn--primary gunmetalBtn--mini"
                disabled={busy}
                onClick={() => setSkipOpen(true)}
              >
                Skip
              </button>
            </div>
          </div>
        </div>

        {skipOpen ? (
          <div className="rrPromptModal__confirmLayer">
            <button
              type="button"
              aria-label="Close skip confirmation"
              className="rrPromptModal__confirmBackdrop"
              onClick={() => {
                if (busy) return;
                setSkipOpen(false);
              }}
            />

            <div className="rrPromptModal__confirmCard">
              <div className="rrPromptModal__confirmTitle">Skip interstitial?</div>

              <div className="rrPromptModal__confirmText">
                Skipping requires a reason and will create a SKIPPED event for admin review later.
              </div>

              <label className="rrPromptModal__field">
                <span className="rrPromptModal__fieldLabel">Reason</span>
                <textarea
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Example: crowd moment, no clean transition..."
                  className="rrPromptModal__textarea rrPromptModal__textarea--compact"
                  disabled={busy}
                  autoFocus
                />
              </label>

              <div className="rrPromptModal__confirmActions">
                <button
                  type="button"
                  className="gunmetalBtn gunmetalBtn--ghost gunmetalBtn--mini"
                  disabled={busy}
                  onClick={() => setSkipOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="gunmetalBtn gunmetalBtn--primary gunmetalBtn--mini"
                  disabled={busy || !canSubmitSkip}
                  onClick={async () => {
                    if (busy) return;

                    const reason = skipReason.trim();
                    if (!reason) return;

                    setError(null);

                    try {
                      await onSkip(reason);
                      setSkipReason("");
                      setSkipOpen(false);
                    } catch (err) {
                      console.error("[Skip Interstitial Error]", err);
                      setError(
                        err instanceof Error ? err.message : "Failed to skip prompt."
                      );
                    }
                  }}
                >
                  {busy ? "Working..." : "Confirm Skip"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
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

        .rrPromptModal__backdrop {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background: rgba(4, 8, 14, 0.26);
          backdrop-filter: blur(1.5px);
        }

        .rrPromptModal__dialog {
          position: relative;
          z-index: 121;
          width: 80%;
          height: 92%;
          margin: auto;
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(120, 160, 220, 0.25);
          background: linear-gradient(
            180deg,
            rgba(32, 42, 64, 0.96),
            rgba(18, 26, 42, 0.96)
          );
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          animation: rrPromptDialogIn 220ms ease-out;
        }

        .rrPromptModal__header {
          flex: 0 0 auto;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 18px 20px 16px;
        }

        .rrPromptModal__metaRow {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: nowrap;
          min-width: 0;
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
          flex: 0 0 auto;
        }

        .rrPromptModal__metaInline {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          flex: 1 1 auto;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(208, 218, 235, 0.62);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rrPromptModal__bullet {
          opacity: 0.5;
          flex: 0 0 auto;
        }

        .rrPromptModal__title {
          margin: 10px 0 0;
          font-size: 28px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.03em;
          color: #ffffff;
        }

        .rrPromptModal__scrollArea {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .rrPromptModal__content {
          padding: 12px 18px 16px;
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
          gap: 14px;
          align-content: flex-start;
          padding-bottom: 6px;
        }

        .rrPromptAsset {
          position: relative;
          appearance: none;
          width: 136px;
          border: 0;
          background: transparent;
          text-align: left;
          cursor: pointer;
          color: #fff;
          padding: 0;
          transition: transform 140ms ease, filter 140ms ease;
          animation: rrTileIn 240ms ease-out both;
        }

        .rrPromptAsset:hover {
          transform: translateY(-3px) scale(1.015);
          filter: saturate(1.04);
        }

        .rrPromptAsset:active {
          transform: translateY(-1px) scale(0.995);
        }

        .rrPromptAsset:focus-visible {
          outline: none;
        }

        .rrPromptAsset:focus-visible .rrPromptAsset__media {
          border-color: rgba(103, 232, 249, 0.42);
          box-shadow:
            0 0 0 2px rgba(103, 232, 249, 0.14),
            0 12px 24px rgba(0, 0, 0, 0.22);
        }

        .rrPromptAsset:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .rrPromptAsset__media {
          width: 100%;
          height: 132px;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.28);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 6px 18px rgba(0, 0, 0, 0.24);
          transition:
            border-color 140ms ease,
            box-shadow 140ms ease,
            background 140ms ease;
        }

        .rrPromptAsset:hover .rrPromptAsset__media {
          border-color: rgba(103, 232, 249, 0.34);
          box-shadow:
            0 14px 28px rgba(0, 0, 0, 0.24),
            0 0 0 1px rgba(103, 232, 249, 0.06),
            0 0 18px rgba(103, 232, 249, 0.08);
        }

        .rrPromptAsset__image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          padding: 6px;
          transition: transform 260ms ease, filter 260ms ease;
        }

        .rrPromptAsset:hover .rrPromptAsset__image {
          transform: scale(1.03);
          filter: brightness(1.04) contrast(1.04);
        }

        .rrPromptAsset__noPreview {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
          padding: 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          text-align: center;
        }

        .rrPromptAsset__metaBlock {
          display: grid;
          gap: 4px;
          padding: 8px 4px 0;
        }

        .rrPromptAsset__lastPlayed {
          font-size: 10px;
          font-weight: 700;
          color: rgba(220, 230, 245, 0.62);
          line-height: 1.25;
        }

        .rrPromptAsset__duration {
          font-size: 10px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(183, 243, 255, 0.84);
        }

        .rrPromptModal__bottomBar {
          flex: 0 0 auto;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(
            180deg,
            rgba(19, 28, 44, 0.98),
            rgba(14, 21, 34, 0.98)
          );
          padding: 10px 18px 12px;
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }

        .rrPromptModal__bottomStatus {
          flex: 1 1 auto;
          min-width: 0;
        }

        .rrPromptModal__error {
          border-radius: 14px;
          border: 1px solid rgba(251, 113, 133, 0.2);
          background: rgba(251, 113, 133, 0.1);
          padding: 12px 14px;
          font-size: 13px;
          color: #ffd7df;
          min-height: 46px;
          display: flex;
          align-items: center;
        }

        .rrPromptModal__error--placeholder {
          opacity: 0;
          pointer-events: none;
        }

        .rrPromptModal__footer {
          flex: 0 0 auto;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .rrPromptModal__confirmLayer {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          pointer-events: auto;
        }

        .rrPromptModal__confirmBackdrop {
          appearance: none;
          position: absolute;
          inset: 0;
          border: 0;
          padding: 0;
          margin: 0;
          background: rgba(5, 10, 18, 0.62);
          backdrop-filter: blur(5px);
          cursor: default;
        }

        .rrPromptModal__confirmCard {
          position: relative;
          z-index: 141;
          width: min(420px, calc(100% - 32px));
          border-radius: 14px;
          border: 1px solid rgba(120, 160, 220, 0.2);
          background: linear-gradient(
            180deg,
            rgba(36, 46, 68, 0.99),
            rgba(18, 27, 43, 0.99)
          );
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          padding: 16px;
        }

        .rrPromptModal__confirmTitle {
          margin: 0;
          font-size: 18px;
          line-height: 1.1;
          font-weight: 1000;
          color: #fff;
        }

        .rrPromptModal__confirmText {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.74);
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

        .rrPromptModal__textarea--compact {
          min-height: 44px;
          max-height: 44px;
          height: 44px;
          resize: none;
          overflow: auto;
        }

        .rrPromptModal__confirmActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
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

        @media (max-width: 760px) {
          .rrPromptModal {
            padding: 8px;
          }

          .rrPromptModal__dialog {
            width: 100%;
            height: 100%;
            border-radius: 18px;
          }

          .rrPromptModal__backdrop {
            border-radius: 18px;
            background: rgba(6, 10, 18, 0.75);
            backdrop-filter: blur(6px);
          }

          .rrPromptModal__header {
            padding: 12px 18px 10px;
          }

          .rrPromptModal__title {
            font-size: 24px;
          }

          .rrPromptModal__assetGrid {
            gap: 12px;
          }

          .rrPromptAsset {
            width: calc(50% - 6px);
            min-width: 124px;
          }

          .rrPromptModal__bottomBar {
            align-items: stretch;
            flex-direction: column;
          }

          .rrPromptModal__footer {
            justify-content: stretch;
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
