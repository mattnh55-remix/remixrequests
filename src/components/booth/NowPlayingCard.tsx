"use client";

import BoothActionButtons from "./BoothActionButtons";
import type { QueueLikeItem } from "./types";
import { formatDuration, getProgressPercent, labelForStatus } from "./booth-utils";

type Props = {
  item: QueueLikeItem | null;
  compactMode: boolean;
  onAction: (action: "load" | "play" | "pause" | "skip" | "done", itemId: string) => void;
};

export default function NowPlayingCard({ item, compactMode, onAction }: Props) {
  if (!item) {
    return (
      <section className="panelSection">
        <div className="sectionLabel">Now Playing</div>
        <div className="sectionSub">Highest priority lane</div>
        <div className="emptySlot">No active playing item.</div>
      </section>
    );
  }

  const progress = getProgressPercent(item);

  return (
    <section className={`panelSection ${compactMode ? "panelSection--compactHero" : ""}`}>
      <div className="sectionLabel">Now Playing</div>
      <div className="sectionSub">Live deck</div>

      <div className="heroLine">
        <div className="heroArtWrap">
          {item.artworkUrl ? <img src={item.artworkUrl} alt={item.title || "Artwork"} className="heroArt" /> : <div className="heroArt heroArt--fallback" />}
        </div>

        <div className="heroMeta">
          <div className="heroTitleRow">
            <div className="heroTitle">{item.title || "Untitled"}</div>
            <span className="rowPill rowPill--live">{labelForStatus(item.status)}</span>
          </div>
          <div className="heroArtist">{item.artist || "Unknown artist"}</div>

          <div className="metricStrip">
            <div className="metricBox"><span>Duration</span><strong>{formatDuration(item.durationSec)}</strong></div>
            <div className="metricBox"><span>Elapsed</span><strong>{formatDuration(item.elapsedSec)}</strong></div>
            <div className="metricBox"><span>Remaining</span><strong>{formatDuration(item.remainingSec)}</strong></div>
            <div className="metricBox"><span>Status</span><strong>{labelForStatus(item.status)}</strong></div>
          </div>

          <div className="progressLabelRow"><span>Runtime Progress</span><span>{Math.round(progress)}%</span></div>
          <div className="gunProgress"><div className="gunProgressFill" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <BoothActionButtons itemId={item.id} status={item.status} onAction={onAction} compact={compactMode} />
    </section>
  );
}
