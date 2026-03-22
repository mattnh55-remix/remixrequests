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
  busyKey?: string | null;
};

export default function NowPlayingCard({
  item,
  mode = "visual",
  onPause,
  onSkip,
  onDone,
  busyKey,
}: NowPlayingCardProps) {
  const progressPct = getProgressPercent(item);
  const actions = getAllowedActions(item);
  const isSystem = isInterstitial(item);

  function handleAction(action: BoothActionName) {
    if (!item) return;

    if (action === "pause") return void onPause?.(item.id);
    if (action === "skip") return void onSkip?.(item.id);
    if (action === "done") return void onDone?.(item.id);
  }

  return (
    <div className={`boothHeroCard boothHeroCard--now ${mode === "performance" ? "is-compact" : ""}`}>
      <div className="boothHeroHeader">
        <div>
          <div className="boothHeroLabel">Now Playing</div>
          <div className="boothHeroKicker">Primary live lane</div>
        </div>
        {item ? (
          isSystem ? <StatusBadge label="System" tone="pink" /> : <StatusBadge label="Live" tone="cyan" />
        ) : null}
      </div>

      {item ? (
        <>
          <div className="boothHeroMain">
            <div className={`boothHeroArt boothHeroArt--poster ${isSystem ? "boothHeroArt--system" : ""}`}>
              {item.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.artworkUrl} alt={item.title || "Artwork"} className="boothHeroArtImg" />
              ) : (
                <div className="boothHeroArtFallback">
                  {(item.artist || item.title || "RM").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="boothHeroInfo">
              <div className="boothHeroTitleLine">
                <div className="boothHeroTitle">{item.title || "Untitled"}</div>
                <StatusBadge label={isSystem ? "Interstitial" : "Playing"} tone={isSystem ? "pink" : "cyan"} />
                {item.isEndingSoon ? <StatusBadge label="Ending Soon" tone="gold" /> : null}
              </div>

              <div className="boothHeroMeta">
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
                  <strong>{typeof item.elapsedSec === "number" ? formatDuration(item.elapsedSec) : "—"}</strong>
                </div>
                <div className="boothReadout">
                  <span>Remaining</span>
                  <strong>{typeof item.remainingSec === "number" ? formatDuration(item.remainingSec) : "—"}</strong>
                </div>
                <div className="boothReadout">
                  <span>Status</span>
                  <strong>{String(item.status || "PLAYING")}</strong>
                </div>
              </div>

              <div className="boothProgress">
                <div className="boothProgressFill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="boothProgressMeta">
                <span>Runtime progress</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
            </div>
          </div>

          <BoothActionButtons
            actions={actions}
            busyKey={item ? `${item.id}:` : null}
            activeBusyKey={busyKey}
            compact={mode === "performance"}
            onAction={handleAction}
          />
        </>
      ) : (
        <div className="boothEmptyState boothEmptyState--hero">No active PLAYING item found.</div>
      )}
    </div>
  );
}
