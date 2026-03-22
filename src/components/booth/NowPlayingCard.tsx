"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import {
  formatDuration,
  getAllowedActions,
  getProgressPercent,
  isInterstitial,
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
  const progressPct = getProgressPercent(item);

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
        <>
          <div className="heroMain heroMain--console">
            <div className="heroArtworkWrap">
              {item.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
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
                    <StatusBadge label={isSystem ? "INTERSTITIAL" : "PLAYING"} tone={isSystem ? "pink" : "cyan"} />
                    {item.isEndingSoon ? <StatusBadge label="ENDING" tone="gold" /> : null}
                  </div>

                  <div className="heroArtist">
                    {item.artist || "Unknown artist"}
                    {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
                  </div>
                </div>

                <div className="heroActions heroActions--topRight">
                  <BoothActionButtons actions={actions} busyAction={busyAction} onAction={handleAction} compact />
                </div>
              </div>

              <div className="heroTelemetry">
                <div className="heroTelemetryCell">
                  <span>Duration</span>
                  <strong>{formatDuration(item.durationSec)}</strong>
                </div>
                <div className="heroTelemetryCell">
                  <span>Elapsed</span>
                  <strong>{typeof item.elapsedSec === "number" ? formatDuration(item.elapsedSec) : "—"}</strong>
                </div>
                <div className="heroTelemetryCell">
                  <span>Remaining</span>
                  <strong>{typeof item.remainingSec === "number" ? formatDuration(item.remainingSec) : "—"}</strong>
                </div>
                <div className="heroTelemetryCell">
                  <span>Status</span>
                  <strong>{String(item.status || "PLAYING")}</strong>
                </div>
              </div>

              <div className="progressWrap">
                <div className="progressBar">
                  <div className="progressFill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="progressMeta">
                  <span>Runtime Progress</span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="heroEmpty">No active PLAYING item found.</div>
      )}
    </div>
  );
}
