"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import { getAllowedActions, isInterstitial } from "./booth-utils";
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

  return (
    <div className="boothHeroCard boothHeroCard--deck">
      <div className="boothHeroLabel">ON DECK</div>

      {item ? (
        <>
          <div className="boothDeckMini">
            <div className={`boothHeroArt boothHeroArt--small ${isInterstitial(item) ? "boothHeroArt--system" : ""}`} />
            <div className="boothDeckInfo">
              <div className="boothDeckTitleLine">
                <div className="boothDeckTitle">{item.title}</div>
                {isInterstitial(item) ? (
                  <StatusBadge label="SYSTEM / INTERSTITIAL" tone="pink" />
                ) : (
                  <StatusBadge label={String(item.status || "QUEUED")} tone="gold" />
                )}
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
            onAction={(action) => onAction?.(item, action)}
          />
        </>
      ) : (
        <div className="boothEmptyState">Nothing loaded or queued yet.</div>
      )}
    </div>
  );
}
