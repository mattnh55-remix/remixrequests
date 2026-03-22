"use client";

import StatusBadge from "./StatusBadge";
import { isInterstitial } from "./booth-utils";
import type { QueueLikeItem } from "./types";

export default function OnDeckCard({ item }: { item: QueueLikeItem | null }) {
  return (
    <div className="boothHeroCard boothHeroCard--deck">
      <div className="boothHeroLabel">ON DECK</div>

      {item ? (
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
      ) : (
        <div className="boothEmptyState">Nothing loaded or queued yet.</div>
      )}
    </div>
  );
}
