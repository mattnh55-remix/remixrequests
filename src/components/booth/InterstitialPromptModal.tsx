"use client";

import type {
  DueInterstitialPrompt,
  DueInterstitialPromptOption,
} from "./types";

type InterstitialPromptModalProps = {
  prompt: DueInterstitialPrompt | null;
  activeAssetId?: string | null;
  onPlayOption: (option: DueInterstitialPromptOption) => Promise<void> | void;
};

function formatDuration(durationSec?: number | null) {
  const value = Number(durationSec ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value < 60) return `${Math.round(value)}s`;
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return seconds ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${minutes}:00`;
}

function niceCategory(value: string) {
  return String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function InterstitialPromptModal({
  prompt,
  activeAssetId,
  onPlayOption,
}: InterstitialPromptModalProps) {
  if (!prompt) return null;

  return (
    <div className="rrInterstitialPromptModal">
      <div className="rrInterstitialPromptModal__pulse" />
      <div className="rrInterstitialPromptModal__card">
        <div className="rrInterstitialPromptModal__head">
          <div>
            <div className="rrInterstitialPromptModal__eyebrow">DJ ACTION NEEDED</div>
            <div className="rrInterstitialPromptModal__title">{prompt.title}</div>
            <div className="rrInterstitialPromptModal__sub">
              {prompt.body?.trim() || "Choose one interstitial to play now."}
            </div>
          </div>

          <div className="rrInterstitialPromptModal__meta">
            <span className="rrPromptChip rrPromptChip--gold">
              {niceCategory(prompt.category)}
            </span>
            <span className="rrPromptChip">
              {prompt.startMinute}–{prompt.endMinute} min
            </span>
          </div>
        </div>

        <div className="rrInterstitialPromptModal__grid">
          {prompt.options.map((option) => {
            const durationLabel = formatDuration(option.durationSec);
            const isActive = option.assetId === activeAssetId;

            return (
              <button
                key={option.assetId}
                type="button"
                className={`rrPromptTile ${isActive ? "rrPromptTile--active" : ""}`}
                onClick={() => void onPlayOption(option)}
              >
                <div className="rrPromptTile__media">
                  {option.previewGifUrl ? (
                    <img
                      src={option.previewGifUrl}
                      alt={option.name}
                      className="rrPromptTile__gif"
                    />
                  ) : (
                    <div className="rrPromptTile__fallback">
                      {option.iconLabel?.trim() || niceCategory(prompt.category)}
                    </div>
                  )}

                  <div className="rrPromptTile__shine" />
                </div>

                <div className="rrPromptTile__body">
                  <div className="rrPromptTile__topline">
                    <span className="rrPromptTile__label">
                      {option.iconLabel?.trim() || niceCategory(prompt.category)}
                    </span>
                    {durationLabel ? (
                      <span className="rrPromptTile__duration">{durationLabel}</span>
                    ) : null}
                  </div>

                  <div className="rrPromptTile__title">{option.name}</div>
                  <div className="rrPromptTile__last">{option.lastPlayedText}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}