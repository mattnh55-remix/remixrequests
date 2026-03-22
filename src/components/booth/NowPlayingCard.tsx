"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import {
  formatDuration,
  getAllowedActions,
  getProgressPercent,
  isInterstitial,
} from "./booth-utils";
import type { BoothActionName, BoothMode, QueueLikeItem } from "./types";

type NowPlayingCardProps = {
  item: QueueLikeItem | null;
  mode?: BoothMode;
  onPause?: (queueItemId: string) => void | Promise<void>;
  onSkip?: (queueItemId: string) => void | Promise<void>;
  onDone?: (queueItemId: string) => void | Promise<void>;
  busyAction?: BoothActionName | null;
};

export default function NowPlayingCard({
  item,
  mode = "visual",
  onPause,
  onSkip,
  onDone,
  busyAction,
}: NowPlayingCardProps) {
  const progressPct = getProgressPercent(item);
  const actions = getAllowedActions(item);
  const isSystem = isInterstitial(item);

  function handleAction(action: BoothActionName) {
    if (!item) return;

    if (action === "pause") {
      void onPause?.(item.id);
      return;
    }

    if (action === "skip") {
      void onSkip?.(item.id);
      return;
    }

    if (action === "done") {
      void onDone?.(item.id);
      return;
    }
  }

  return (
    <div
      className={`boothHeroCard boothHeroCard--now ${
        item ? "is-live" : "is-empty"
      } ${mode === "performance" ? "is-compact" : ""}`}
    >
      <div className="boothHeroHeader">
        <div>
          <div className="boothHeroLabel">NOW PLAYING</div>
          <div className="boothHeroKicker">Highest priority lane</div>
        </div>
        {item ? (
          isSystem ? (
            <StatusBadge label="SYSTEM" tone="pink" />
          ) : (
            <StatusBadge label="LIVE" tone="cyan" />
          )
        ) : null}
      </div>

      {item ? (
        <>
          <div className="boothHeroMain boothHeroMain--large">
            <div
              className={`boothHeroArt boothHeroArt--poster ${
                isSystem ? "boothHeroArt--system" : ""
              }`}
            >
              {item.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.artworkUrl}
                  alt={item.title || "Artwork"}
                  className="boothHeroArtImg"
                />
              ) : (
                <div className="boothHeroArtFallback">
                  {(item.artist || item.title || "RM").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="boothHeroInfo">
              <div className="boothHeroTitleLine">
                <div className="boothHeroTitle">{item.title || "Untitled"}</div>
                <StatusBadge
                  label={isSystem ? "INTERSTITIAL" : "PLAYING"}
                  tone={isSystem ? "pink" : "cyan"}
                />
                {item.isEndingSoon ? (
                  <StatusBadge label="ENDING SOON" tone="gold" />
                ) : null}
              </div>

              <div className="boothHeroMeta boothHeroMeta--big">
                {item.artist || "Unknown artist"}
                {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
              </div>

              <div className="boothHeroReadouts">
                <div className="boothReadout">
                  <span>Duration</span>
                  <strong>{formatDuration(item.durationSec)}</strong>
                </div>
                <div className="boothReadout">
                  <span>Elapsed</span>
                  <strong>
                    {typeof item.elapsedSec === "number"
                      ? formatDuration(item.elapsedSec)
                      : "—"}
                  </strong>
                </div>
                <div className="boothReadout">
                  <span>Remaining</span>
                  <strong>
                    {typeof item.remainingSec === "number"
                      ? formatDuration(item.remainingSec)
                      : "—"}
                  </strong>
                </div>
                <div className="boothReadout">
                  <span>Status</span>
                  <strong>{String(item.status || "PLAYING")}</strong>
                </div>
              </div>

              <div className="boothProgress boothProgress--hero">
                <div
                  className="boothProgressFill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="boothProgressMeta">
                <span>Runtime progress</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
            </div>
          </div>

          <BoothActionButtons
            actions={actions}
            busyAction={busyAction}
            onAction={handleAction}
          />
        </>
      ) : (
        <div className="boothEmptyState boothEmptyState--hero">
          No active PLAYING item found.
        </div>
      )}
    </div>
  );
}