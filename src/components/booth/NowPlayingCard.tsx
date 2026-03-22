"use client";

import StatusBadge from "./StatusBadge";
import { formatDuration, getProgressPercent, isInterstitial } from "./booth-utils";
import type { QueueLikeItem } from "./types";

export default function NowPlayingCard({ item }: { item: QueueLikeItem | null }) {
  const progressPct = getProgressPercent(item);

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
              </div>
              <div className="boothHeroMeta">
                {item.artist || "Unknown artist"}
                {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
                {item.durationSec ? ` • ${formatDuration(item.durationSec)}` : ""}
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
        </>
      ) : (
        <div className="boothEmptyState">No active PLAYING item found.</div>
      )}
    </div>
  );
}
