"use client";

import BoothActionButtons from "./BoothActionButtons";
import { getStatusTone } from "./booth-utils";
import type { BoothMode, QueueLikeItem } from "./types";

export default function OnDeckCard({
  item,
  mode,
  onLoad,
  onPlay,
  onPause,
  onSkip,
}: {
  item: QueueLikeItem | null;
  mode: BoothMode;
  onLoad?: (id: string) => void;
  onPlay?: (id: string) => void;
  onPause?: (id: string) => void;
  onSkip?: (id: string) => void;
}) {
  if (!item) {
    return (
      <div className="heroCard heroCard--deck">
        <div className="heroCardHeader">
          <div>
            <div className="heroCardTitle">On Deck</div>
            <div className="heroCardSub">Ready after current playback</div>
          </div>
        </div>
        <div className="heroEmpty">Nothing loaded or queued yet.</div>
      </div>
    );
  }

  const compact = mode === "performance";

  return (
    <div className={`heroCard heroCard--deck ${compact ? "heroCard--compact" : ""}`}>
      <div className="heroCardHeader">
        <div>
          <div className="heroCardTitle">On Deck</div>
          <div className="heroCardSub">Ready after current playback</div>
        </div>
        <div className={`statusPill statusPill--${getStatusTone(item.status)}`}>{item.status || "QUEUED"}</div>
      </div>
      <div className="deckLine">
        {item.artworkUrl ? <img className="deckArt" src={item.artworkUrl} alt={item.title || "art"} /> : <div className="deckArt deckArt--placeholder" />}
        <div className="deckText">
          <div className="deckTitle">{item.title}</div>
          <div className="deckArtist">{item.artist}</div>
        </div>
        <BoothActionButtons
          compact={compact}
          actions={[
            { name: "load", onClick: item.id ? () => onLoad?.(item.id) : undefined },
            { name: "play", onClick: item.id ? () => onPlay?.(item.id) : undefined },
            { name: "pause", onClick: item.id ? () => onPause?.(item.id) : undefined },
            { name: "skip", onClick: item.id ? () => onSkip?.(item.id) : undefined },
          ]}
        />
      </div>
    </div>
  );
}
