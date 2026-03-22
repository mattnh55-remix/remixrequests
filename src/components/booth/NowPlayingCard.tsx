"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import { formatDuration, getAllowedActions, getProgressPercent, isInterstitial } from "./booth-utils";
import type { BoothActionName, QueueLikeItem } from "./types";

export default function NowPlayingCard({
  item,
  busyAction,
  onAction,
}: {
  item: QueueLikeItem | null;
  busyAction?: BoothActionName | null;
  onAction?: (item: QueueLikeItem, action: BoothActionName) => void;
}) {
  const progressPct = getProgressPercent(item);
  const actions = getAllowedActions(item);

  return (
    <div className="boothHeroCard boothHeroCard--now">
      <div className="boothHeroLabel">NOW PLAYING</div>

      {item ? (
        <>
          <div className="boothHeroMain">
            <div className={`boothHeroArt ${isInterstitial(item) ? "boothHeroArt--system" : ""}`} />
            <div className="boothHeroInfo">
              <div className="boothHeroTitleLine">
                <div className="boothHeroTitle">{item.title}</div>
                {isInterstitial(item) ? (
                  <StatusBadge label="SYSTEM / INTERSTITIAL" tone="pink" />
                ) : (
                  <StatusBadge label="PLAYING" tone="cyan" />
                )}
                {item.isEndingSoon ? <StatusBadge label="ENDING SOON" tone="gold" /> : null}
              </div>
              <div className="boothHeroMeta">
                {item.artist || "Unknown artist"}
                {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
                {item.durationSec ? ` • ${formatDuration(item.durationSec)}` : ""}
                {typeof item.remainingSec === "number" ? ` • ${item.remainingSec}s left` : ""}
              </div>

              <div className="boothProgress">
                <div className="boothProgressFill" style={{ width: `${progressPct}%` }} />
              </div>

              <div className="boothProgressMeta">
                <span>
                  Runtime progress
                  {typeof item.elapsedSec === "number" ? ` • ${item.elapsedSec}s elapsed` : ""}
                </span>
                <span>{Math.round(progressPct)}%</span>
              </div>
            </div>
          </div>

          <BoothActionButtons actions={actions} busyAction={busyAction} onAction={(action) => onAction?.(item, action)} />
        </>
      ) : (
        <div className="boothEmptyState">No active PLAYING item found.</div>
      )}
    </div>
  );
}
