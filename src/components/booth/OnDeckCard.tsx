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
  mode = "visual",
  onLoad,
  onPlay,
  onPause,
  onSkip,
  busyAction,
}: OnDeckCardProps) {
  const isSystem = isInterstitial(item);
  const actions = getAllowedActions(item);

  function handleAction(action: BoothActionName) {
    if (!item) return;

    if (action === "load") {
      void onLoad?.(item.id);
      return;
    }

    if (action === "play") {
      void onPlay?.(item.id);
      return;
    }

    if (action === "pause") {
      void onPause?.(item.id);
      return;
    }

    if (action === "skip") {
      void onSkip?.(item.id);
      return;
    }
  }

  return (
    <div
      className={`boothHeroCard boothHeroCard--deck ${
        item ? "is-live" : "is-empty"
      } ${mode === "performance" ? "is-compact" : ""}`}
    >
      <div className="boothHeroHeader">
        <div>
          <div className="boothHeroLabel">ON DECK</div>
          <div className="boothHeroKicker">Next up in booth</div>
        </div>
        {item ? (
          isSystem ? (
            <StatusBadge label="SYSTEM" tone="pink" />
          ) : (
            <StatusBadge label={String(item.status || "QUEUED")} tone="gold" />
          )
        ) : null}
      </div>

      {item ? (
        <>
          <div className="boothDeckMini">
            <div
              className={`boothHeroArt boothHeroArt--small ${
                isSystem ? "boothHeroArt--system" : ""
              }`}
            >
              {item.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.artworkUrl}
                  alt={item.title || "Artwork"}
                  className="boothHeroArtImg"
                />
              ) : (
                <div className="boothHeroArtFallback">
                  {(item.artist || item.title || "RM").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="boothDeckInfo">
              <div className="boothDeckTitleLine">
                <div className="boothDeckTitle">{item.title || "Untitled"}</div>
                {isSystem ? (
                  <StatusBadge label="INTERSTITIAL" tone="pink" />
                ) : null}
              </div>

              <div className="boothDeckMeta">
                {item.artist || "Unknown artist"}
                {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
              </div>
            </div>
          </div>

          <BoothActionButtons
            actions={actions}
            busyAction={busyAction}
            onAction={handleAction}
          />
        </>
      ) : (
        <div className="boothEmptyState">Nothing loaded or queued yet.</div>
      )}
    </div>
  );
}