"use client";

import BoothActionButtons from "./BoothActionButtons";
import type { QueueLikeItem } from "./types";
import { labelForStatus } from "./booth-utils";

type Props = {
  item: QueueLikeItem | null;
  compactMode: boolean;
  onAction: (action: "load" | "play" | "pause" | "skip" | "done", itemId: string) => void;
};

export default function OnDeckCard({ item, compactMode, onAction }: Props) {
  if (!item) {
    return (
      <section className="panelSection">
        <div className="sectionLabel">On Deck</div>
        <div className="sectionSub">Ready after current playback</div>
        <div className="emptySlot">Nothing loaded or queued yet.</div>
      </section>
    );
  }

  return (
    <section className="panelSection">
      <div className="sectionTop">
        <div>
          <div className="sectionLabel">On Deck</div>
          <div className="sectionSub">Ready after current playback</div>
        </div>
        <span className="rowPill rowPill--queued">{labelForStatus(item.status)}</span>
      </div>

      <div className="deckLine">
        {item.artworkUrl ? <img src={item.artworkUrl} alt={item.title || "Artwork"} className="deckArt" /> : <div className="deckArt deckArt--fallback" />}
        <div className="deckInfo">
          <div className="deckTitle">{item.title || "Untitled"}</div>
          <div className="deckArtist">{item.artist || "Unknown artist"}</div>
        </div>
      </div>

      <BoothActionButtons itemId={item.id} status={item.status} onAction={onAction} compact={compactMode} />
    </section>
  );
}
