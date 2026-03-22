"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import { formatDuration, getAllowedActions, isInterstitial } from "./booth-utils";
import type { BoothActionName, QueueLikeItem } from "./types";

export default function OnDeckCard({
  item,
  busyAction,
  onAction,
}: {
  item: QueueLikeItem | null;
  busyAction?: BoothActionName | null;
  onAction?: (item: QueueLikeItem, action: BoothActionName) => void;
}) {
  const actions = getAllowedActions(item);
  const isSystem = isInterstitial(item);

  return (
    <div className="boothHeroCard boothHeroCard--deck">
      <div className="boothHeroHeader">
        <div>
          <div className="boothHeroLabel">ON DECK</div>
          <div className="boothHeroKicker">Ready after current playback</div>
        </div>
        {item ? (
          <StatusBadge label={isSystem ? "SYSTEM" : String(item.status || "QUEUED")} tone={isSystem ? "pink" : "gold"} />
        ) : null}
      </div>

      {item ? (
        <>
          <div className="boothDeckMini boothDeckMini--enhanced">
            <div className={`boothHeroArt boothHeroArt--small ${isSystem ? "boothHeroArt--system" : ""}`}>
              {item.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.artworkUrl} alt={item.title || "Artwork"} className="boothHeroArtImg" />
              ) : (
                <div className="boothHeroArtFallback">{(item.artist || item.title || "RM").slice(0, 2).toUpperCase()}</div>
              )}
            </div>
            <div className="boothDeckInfo">
              <div className="boothDeckTitleLine">
                <div className="boothDeckTitle">{item.title || "Untitled"}</div>
              </div>
              <div className="boothDeckMeta">
                {item.artist || "Unknown artist"}
                {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
                {item.durationSec ? ` • ${formatDuration(item.durationSec)}` : ""}
              </div>
            </div>
          </div>

          <BoothActionButtons actions={actions} busyAction={busyAction} onAction={(action) => onAction?.(item, action)} />
        </>
      ) : (
        <div className="boothEmptyState">Nothing loaded or queued yet.</div>
      )}
    </div>
  );
}
