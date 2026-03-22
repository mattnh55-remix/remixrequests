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
  busyKey?: string | null;
};

export default function OnDeckCard({
  item,
  mode = "visual",
  onLoad,
  onPlay,
  onPause,
  onSkip,
  busyKey,
}: OnDeckCardProps) {
  const isSystem = isInterstitial(item);
  const actions = getAllowedActions(item);

  function handleAction(action: BoothActionName) {
    if (!item) return;

    if (action === "load") return void onLoad?.(item.id);
    if (action === "play") return void onPlay?.(item.id);
    if (action === "pause") return void onPause?.(item.id);
    if (action === "skip") return void onSkip?.(item.id);
  }

  return (
    <div className={`boothHeroCard boothHeroCard--deck ${mode === "performance" ? "is-compact" : ""}`}>
      <div className="boothHeroHeader">
        <div>
          <div className="boothHeroLabel">On Deck</div>
          <div className="boothHeroKicker">Immediate next item</div>
        </div>
        {item ? (
          isSystem ? (
            <StatusBadge label="System" tone="pink" />
          ) : (
            <StatusBadge label={String(item.status || "Queued")} tone="gold" />
          )
        ) : null}
      </div>

      {item ? (
        <>
          <div className="boothDeckMini">
            <div className={`boothHeroArt boothHeroArt--small ${isSystem ? "boothHeroArt--system" : ""}`}>
              {item.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.artworkUrl} alt={item.title || "Artwork"} className="boothHeroArtImg" />
              ) : (
                <div className="boothHeroArtFallback">
                  {(item.artist || item.title || "RM").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="boothDeckInfo">
              <div className="boothDeckTitleLine">
                <div className="boothDeckTitle">{item.title || "Untitled"}</div>
                {isSystem ? <StatusBadge label="Interstitial" tone="pink" /> : null}
              </div>
              <div className="boothDeckMeta">
                {item.artist || "Unknown artist"}
                {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
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
        <div className="boothEmptyState">Nothing loaded or queued yet.</div>
      )}
    </div>
  );
}
