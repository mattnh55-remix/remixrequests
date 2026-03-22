"use client";

import { useEffect, useMemo, useState } from "react";
import QueueItemRow from "./QueueItemRow";
import {
  buildReorderPayload,
  isSongDraggable,
  postFirstJson,
  reorderSongsOnly,
} from "./booth-utils";
import type { QueueLikeItem, ReorderState } from "./types";

export default function QueueList({
  items,
  location,
  onQueueCommitted,
}: {
  items: QueueLikeItem[];
  location: string;
  onQueueCommitted?: (items: QueueLikeItem[]) => void;
}) {
  const [draftItems, setDraftItems] = useState<QueueLikeItem[]>(items);
  const [dragState, setDragState] = useState<ReorderState>({
    dirty: false,
    saving: false,
    error: null,
    success: null,
    activeDragId: null,
  });

  useEffect(() => {
    if (dragState.dirty) return;
    setDraftItems(items);
  }, [items, dragState.dirty]);

  const draggableSongCount = useMemo(
    () => draftItems.filter((item) => isSongDraggable(item)).length,
    [draftItems]
  );

  async function saveReorder() {
    setDragState((prev) => ({ ...prev, saving: true, error: null, success: null }));

    const payload = buildReorderPayload(location, draftItems);
    const result = await postFirstJson(
      [
        `/api/booth/reorder/${location}`,
        `/api/booth/queue/reorder/${location}`,
        `/api/admin/queue/reorder/${location}`,
      ],
      payload
    );

    if (!result.ok) {
      setDragState((prev) => ({
        ...prev,
        saving: false,
        error: "Reorder route not found yet. UI reorder preview is working.",
        success: null,
      }));
      return;
    }

    setDragState({
      dirty: false,
      saving: false,
      error: null,
      success: "Queue order saved.",
      activeDragId: null,
    });

    onQueueCommitted?.(draftItems);
  }

  function cancelDraft() {
    setDraftItems(items);
    setDragState({
      dirty: false,
      saving: false,
      error: null,
      success: null,
      activeDragId: null,
    });
  }

  function handleDrop(targetItem: QueueLikeItem) {
    if (!dragState.activeDragId) return;

    const nextItems = reorderSongsOnly(draftItems, dragState.activeDragId, targetItem.id);

    setDraftItems(nextItems);
    setDragState((prev) => ({
      ...prev,
      dirty: true,
      activeDragId: null,
      error: null,
      success: null,
    }));
  }

  return (
    <div className="boothQueueManager">
      <div className="boothQueueToolbar">
        <div className="boothQueueToolbarLeft">
          <div className="boothQueueToolbarTitle">SONG REORDER MODE</div>
          <div className="boothQueueToolbarSub">
            Drag songs only. System interstitials remain locked in place.
          </div>
        </div>

        <div className="boothQueueToolbarRight">
          <div className="boothQueueToolbarPill">{draggableSongCount} draggable songs</div>
          {dragState.dirty ? (
            <>
              <button className="boothToolbarBtn boothToolbarBtn--ghost" onClick={cancelDraft}>
                Cancel
              </button>
              <button
                className="boothToolbarBtn"
                onClick={() => void saveReorder()}
                disabled={dragState.saving}
              >
                {dragState.saving ? "Saving..." : "Save order"}
              </button>
            </>
          ) : (
            <button className="boothToolbarBtn boothToolbarBtn--muted" disabled>
              Live synced
            </button>
          )}
        </div>
      </div>

      {dragState.error ? <div className="boothQueueFeedback boothQueueFeedback--error">{dragState.error}</div> : null}
      {dragState.success ? <div className="boothQueueFeedback boothQueueFeedback--success">{dragState.success}</div> : null}

      <div className="boothQueueList">
        {draftItems.length === 0 ? (
          <div className="boothEmptyState">Queue feed is empty.</div>
        ) : (
          draftItems.map((item) => (
            <QueueItemRow
              key={item.id}
              item={item}
              draggable
              isDragging={dragState.activeDragId === item.id}
              isDropTarget={dragState.activeDragId !== null && dragState.activeDragId !== item.id && isSongDraggable(item)}
              onDragStart={(queueItem) => {
                if (!isSongDraggable(queueItem)) return;
                setDragState((prev) => ({
                  ...prev,
                  activeDragId: queueItem.id,
                  error: null,
                  success: null,
                }));
              }}
              onDrop={(queueItem) => handleDrop(queueItem)}
              onDragEnd={() => {
                setDragState((prev) => ({ ...prev, activeDragId: null }));
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
