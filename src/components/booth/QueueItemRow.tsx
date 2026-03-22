"use client";

import BoothActionButtons from "./BoothActionButtons";
import StatusBadge from "./StatusBadge";
import { getAllowedActions, getStatusTone, isInterstitial, isSongDraggable } from "./booth-utils";
import type { BoothActionName, QueueLikeItem } from "./types";

export default function QueueItemRow({
  item,
  compact = false,
  draggable = false,
  isDropTarget = false,
  isDragging = false,
  busyAction,
  onAction,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  item: QueueLikeItem;
  compact?: boolean;
  draggable?: boolean;
  isDropTarget?: boolean;
  isDragging?: boolean;
  busyAction?: BoothActionName | null;
  onAction?: (item: QueueLikeItem, action: BoothActionName) => void;
  onDragStart?: (item: QueueLikeItem) => void;
  onDragOver?: (item: QueueLikeItem) => void;
  onDrop?: (item: QueueLikeItem) => void;
  onDragEnd?: () => void;
}) {
  const interstitial = isInterstitial(item);
  const tone = getStatusTone(item.status);
  const songDraggable = isSongDraggable(item) && draggable;
  const actions = getAllowedActions(item);

  return (
    <div
      className={`boothQueueRow ${interstitial ? "boothQueueRow--system" : ""} ${compact ? "boothQueueRow--compact" : ""} ${songDraggable ? "boothQueueRow--canDrag" : ""} ${isDropTarget ? "boothQueueRow--dropTarget" : ""} ${isDragging ? "boothQueueRow--dragging" : ""}`}
      draggable={songDraggable}
      onDragStart={(event) => {
        if (!songDraggable) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        onDragStart?.(item);
      }}
      onDragOver={(event) => {
        if (!songDraggable) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver?.(item);
      }}
      onDrop={(event) => {
        if (!songDraggable) return;
        event.preventDefault();
        onDrop?.(item);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <div className="boothQueueRowLeft">
        <div className="boothQueueIndex">{item.position ?? item.sortOrder ?? "—"}</div>

        <div className={`boothQueueArt ${interstitial ? "boothQueueArt--system" : ""}`} />

        <div className="boothQueueMain">
          <div className="boothQueueTitleLine">
            <div className="boothQueueTitle">{item.title || "Untitled"}</div>

            {interstitial ? (
              <StatusBadge label="SYSTEM / INTERSTITIAL" tone="pink" />
            ) : (
              <StatusBadge label={String(item.status || "QUEUED")} tone={tone} />
            )}
          </div>

          <div className="boothQueueMeta">
            {item.artist || "Unknown artist"}
            {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
            {item.clusterId ? ` • Cluster ${item.clusterId}` : ""}
          </div>

          {!compact ? (
            <BoothActionButtons
              actions={actions}
              busyAction={busyAction}
              compact
              onAction={(action) => onAction?.(item, action)}
            />
          ) : null}
        </div>
      </div>

      <div className="boothQueueRowRight">
        {songDraggable ? (
          <div className="boothDragHandleWrap">
            <StatusBadge label="DRAG SONG" tone="cyan" />
            <div className="boothDragHandle" aria-hidden="true">⋮⋮</div>
          </div>
        ) : !interstitial ? (
          <StatusBadge label="LOCKED STATUS" tone="muted" />
        ) : (
          <StatusBadge label="LOCKED" tone="muted" />
        )}
      </div>
    </div>
  );
}
