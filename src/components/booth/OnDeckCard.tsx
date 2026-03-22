"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import { getAllowedActions, isInterstitial } from "./booth-utils";
import type { BoothActionName, BoothMode, QueueLikeItem } from "./types";

type OnDeckCardProps = {
  item: QueueLikeItem | null;
  mode?: BoothMode;
  onLoad?: (queueItemId: string) => void | Promise<void>;
  onPlay?: (queueItemId: string) => void | Promise<void>;
  onPause?: (queueItemId: string) => void | Promise<void>;
  onSkip?: (queueItemId: string) => void | Promise<void>;
  busyAction?: BoothActionName | null;
};

export default function OnDeckCard({
  item,
  mode = "performance",
  onLoad,
  onPlay,
  onPause,
  onSkip,
  busyAction,
}: OnDeckCardProps) {
  const actions = getAllowedActions(item);
  const isSystem = isInterstitial(item);

  function handleAction(action: BoothActionName) {
    if (!item) return;
    if (action === "load") return void onLoad?.(item.id);
    if (action === "play") return void onPlay?.(item.id);
    if (action === "pause") return void onPause?.(item.id);
    if (action === "skip") return void onSkip?.(item.id);
  }

  return (
    <div className={`heroCard heroCard--deck ${mode === "performance" ? "heroCard--compact" : ""}`}>
      <div className="heroCardHeader">
        <div>
          <div className="heroCardTitle">On Deck</div>
          <div className="heroCardSub">Immediate next item</div>
        </div>
        {item ? <StatusBadge label={isSystem ? "SYSTEM" : String(item.status || "QUEUED")} tone={isSystem ? "pink" : "gold"} /> : null}
      </div>

      {item ? (
        <div className="deckLine deckLine--single">
          <div className="deckArt">
            {item.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.artworkUrl} alt={item.title || "Artwork"} />
            ) : (
              <div className="deckArt deckArt--placeholder" />
            )}
          </div>

          <div className="deckText deckText--single">
            <div className="deckSingleLine">
              <span className="deckTitle">{item.title || "Untitled"}</span>
              <span className="deckDivider">—</span>
              <span className="deckArtist deckArtist--inline">{item.artist || "Unknown artist"}</span>
              {item.requestedByLabel ? <span className="deckRequestor">• {item.requestedByLabel}</span> : null}
              {isSystem ? <StatusBadge label="INTERSTITIAL" tone="pink" /> : null}
            </div>
          </div>

          <div className="deckActions">
            <BoothActionButtons actions={actions} busyAction={busyAction} onAction={handleAction} compact />
          </div>
        </div>
      ) : (
        <div className="heroEmpty">Nothing loaded or queued yet.</div>
      )}
    </div>
  );
}
