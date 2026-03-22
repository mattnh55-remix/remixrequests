"use client";

import BoothActionButtons from "./BoothActionButtons";
import { formatDuration, getStatusTone } from "./booth-utils";
import type { QueueLikeItem, BoothMode } from "./types";

export default function NowPlayingCard({
  item,
  mode,
  onPause,
  onSkip,
  onDone,
}: {
  item: QueueLikeItem | null;
  mode: BoothMode;
  onPause?: (id: string) => void;
  onSkip?: (id: string) => void;
  onDone?: (id: string) => void;
}) {
  if (!item) {
    return (
      <div className="heroCard">
        <div className="heroCardHeader">
          <div>
            <div className="heroCardTitle">Now Playing</div>
            <div className="heroCardSub">Live deck</div>
          </div>
        </div>
        <div className="heroEmpty">No active PLAYING item found.</div>
      </div>
    );
  }

  const progress = Math.max(0, Math.min(100, Number(item.progressPercent || 0)));
  const compact = mode === "performance";

  return (
    <div className={`heroCard heroCard--live ${compact ? "heroCard--compact" : ""}`}>
      <div className="heroCardHeader">
        <div>
          <div className="heroCardTitle">Now Playing</div>
          <div className="heroCardSub">Live deck</div>
        </div>
        <div className={`statusPill statusPill--${getStatusTone(item.status)}`}>{item.status || "PLAYING"}</div>
      </div>

      <div className="heroMain">
        <div className="heroArtworkWrap">
          {item.artworkUrl ? <img className="heroArtwork" src={item.artworkUrl} alt={item.title || "art"} /> : <div className="heroArtwork heroArtwork--placeholder" />}
        </div>
        <div className="heroInfo">
          <div className="heroTitleRow">
            <div className="heroTitle">{item.title}</div>
            <div className="statusPill statusPill--playing">PLAYING</div>
          </div>
          <div className="heroArtist">{item.artist}</div>

          <div className={`heroStats ${compact ? "heroStats--compact" : ""}`}>
            <div className="heroStat"><span>Duration</span><strong>{formatDuration(item.durationSec)}</strong></div>
            <div className="heroStat"><span>Elapsed</span><strong>{formatDuration(item.elapsedSec)}</strong></div>
            <div className="heroStat"><span>Remaining</span><strong>{formatDuration(item.remainingSec)}</strong></div>
            <div className="heroStat"><span>Status</span><strong>{item.status || "PLAYING"}</strong></div>
          </div>

          <div className="progressWrap">
            <div className="progressBar"><div className="progressFill" style={{ width: `${progress}%` }} /></div>
            <div className="progressMeta"><span>Runtime progress</span><span>{Math.round(progress)}%</span></div>
          </div>

          <BoothActionButtons
            compact={compact}
            actions={[
              { name: "pause", onClick: item.id ? () => onPause?.(item.id) : undefined },
              { name: "skip", onClick: item.id ? () => onSkip?.(item.id) : undefined },
              { name: "done", onClick: item.id ? () => onDone?.(item.id) : undefined },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
