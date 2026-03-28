"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import {
  getAllowedActions,
  isBoostedLike,
  isInterstitial,
  isRequestLike,
} from "./booth-utils";
import type { BoothActionName, BoothMode, QueueLikeItem } from "./types";

type NowPlayingCardProps = {
  item: QueueLikeItem | null;
  mode?: BoothMode;
  onPause?: (queueItemId: string) => void | Promise<void>;
  onSkip?: (queueItemId: string) => void | Promise<void>;
  onDone?: (queueItemId: string) => void | Promise<void>;
  busyAction?: BoothActionName | null;
};

export default function NowPlayingCard({
  item,
  mode = "performance",
  onPause,
  onSkip,
  onDone,
  busyAction,
}: NowPlayingCardProps) {
  const actions = getAllowedActions(item);
  const isSystem = isInterstitial(item);
  const isHouse = item?.sourceType === "HOUSE";
  const isRequest = !!item && isRequestLike(item) && !isSystem && !isHouse;
  const isBoosted = !!item && isBoostedLike(item) && !isSystem;

  function handleAction(action: BoothActionName) {
    if (!item) return;
    if (action === "pause") return void onPause?.(item.id);
    if (action === "skip") return void onSkip?.(item.id);
    if (action === "done") return void onDone?.(item.id);
  }

  return (
    <div className={`heroCard heroCard--live ${mode === "performance" ? "heroCard--compact" : ""}`}>
      <div className="heroCardHeader">
        <div>
          <div className="heroCardTitle">Now Playing</div>
          <div className="heroCardSub">Primary live lane</div>
        </div>
      </div>

      {item ? (
        <div className="heroMain heroMain--console">
          <div className="heroArtworkWrap">
            {item.artworkUrl ? (
              <img className="heroArtwork" src={item.artworkUrl} alt={item.title || "Artwork"} />
            ) : (
              <div className="heroArtwork heroArtwork--placeholder" />
            )}
          </div>

          <div className="heroInfo">
            <div className="heroInfoTop">
              <div className="heroInfoCopy">
                <div className="heroTitleRow">
                  <div className="heroTitle">{item.title || "Untitled"}</div>
                  {isBoosted ? <StatusBadge label="BOOSTED" tone="boost" /> : null}
                  {isRequest ? <StatusBadge label="REQUEST" tone="alert" /> : null}
                  <StatusBadge label={isSystem ? "INTERSTITIAL" : "PLAYING"} tone={isSystem ? "pink" : "cyan"} />
                  {item.isEndingSoon ? <StatusBadge label="ENDING" tone="gold" /> : null}
                </div>

                <div className="heroArtist">
                  {item.artist || "Unknown artist"}
                  {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
                  {item.verified ? " • VERIFIED" : ""}
                  {typeof item.upvotes === "number" ? ` • 👍 ${item.upvotes}` : ""}
                  {typeof item.downvotes === "number" ? ` • 👎 ${item.downvotes}` : ""}
                  {typeof item.score === "number" ? ` • Score ${item.score}` : ""}
                  {item.redemptionCode ? ` • Code ${item.redemptionCode}` : ""}
                </div>
              </div>

              <div className="heroActions heroActions--topRight">
                <BoothActionButtons actions={actions} busyAction={busyAction} onAction={handleAction} compact />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="heroEmpty">No active PLAYING item found.</div>
      )}
    </div>
  );
}
