"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import { getAllowedActions, getStatusTone } from "./booth-utils";
import { getInterstitialDisplay } from "@/lib/booth/interstitial-display";
import type { BoothActionName, QueueLikeItem } from "./types";

type InterstitialRowProps = {
  item: QueueLikeItem;
  busyAction?: BoothActionName | null;
  onLoad?: (queueItemId: string) => void | Promise<void>;
  onPlay?: (queueItemId: string) => void | Promise<void>;
  onPause?: (queueItemId: string) => void | Promise<void>;
  onSkip?: (queueItemId: string) => void | Promise<void>;
  onDone?: (queueItemId: string) => void | Promise<void>;
};

export default function InterstitialRow({
  item,
  busyAction,
  onLoad,
  onPlay,
  onPause,
  onSkip,
  onDone,
}: InterstitialRowProps) {
  const actions = getAllowedActions(item);
  const display = getInterstitialDisplay(item);

  function handleAction(action: BoothActionName) {
    if (action === "load") return void onLoad?.(item.id);
    if (action === "play") return void onPlay?.(item.id);
    if (action === "pause") return void onPause?.(item.id);
    if (action === "skip") return void onSkip?.(item.id);
    if (action === "done") return void onDone?.(item.id);
  }

  return (
    <div className={`queueRow queueRow--dense queueRow--interstitial queueRow--interstitialStatus-${String(item.status || "QUEUED").toLowerCase()}`}>
      <div className="queueIndex queueIndex--interstitial">{item.position ?? "—"}</div>

      <div className="queueText queueText--interstitial">
        <div className="queueTitleLine queueTitleLine--interstitial">
          <span className="interstitialEyebrow">AUTO INSERT</span>
          <div className="queueTitle queueTitle--interstitial">{display.title}</div>
          <StatusBadge label={display.reasonChip} tone="gold" />
          {display.durationLabel ? <StatusBadge label={display.durationLabel} tone="cyan" /> : null}
          <StatusBadge label={String(item.status || "QUEUED")} tone={getStatusTone(item.status)} />
        </div>

        <div className="queueMeta queueMeta--interstitial">
          {display.contextLabel ? (
            <span className="queueMetaStrong interstitialContext">{display.contextLabel}</span>
          ) : null}
          {display.assetLabel ? <span> • {display.assetLabel}</span> : null}
          {display.clusterLabel ? <span className="queueMetaMinor"> • {display.clusterLabel}</span> : null}
        </div>
      </div>

      <div className="queueActions">
        <BoothActionButtons
          actions={actions}
          busyAction={busyAction}
          onAction={handleAction}
          compact
        />
      </div>
    </div>
  );
}
