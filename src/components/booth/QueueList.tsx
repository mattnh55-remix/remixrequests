"use client";

import { useEffect, useMemo, useState } from "react";
import QueueItemRow from "./QueueItemRow";
import {
  applyOptimisticAction,
  buildReorderPayload,
  isSongDraggable,
  performQueueAction,
  postJson,
  reorderSongsOnly,
} from "./booth-utils";
import type { BoothActionName, QueueLikeItem, ReorderState } from "./types";

export default function QueueList({
  items,
  location,
  onQueueCommitted,
  onActionComplete,
}: {
  items: QueueLikeItem[];
  location: string;
  onQueueCommitted?: (items: QueueLikeItem[]) => void;
  onActionComplete?: (result: { ok: boolean; message: string }, nextQueue?: QueueLikeItem[]) => void;
}) {
  const [draftItems, setDraftItems] = useState<QueueLikeItem[]>(items);
  const [busyActionById, setBusyActionById] = useState<Record<string, BoothActionName | null>>({});
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

  const draggableSongCount = useMemo(() => draftItems.filter((item) => isSongDraggable(item)).length, [draftItems]);

  async function saveReorder() {
    setDragState((prev) => ({ ...prev, saving: true, error: null, success: null }));

    const payload = buildReorderPayload(location, draftItems);
    const result = await postJson(`/api/booth/queue/reorder`, payload);

    if (!result.ok) {
      setDragState((prev) => ({
        ...prev,
        saving: false,
        error: "Reorder failed against the real booth route.",
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

  async function handleItemAction(item: QueueLikeItem, action: BoothActionName) {
    setBusyActionById((prev) => ({ ...prev, [item.id]: action }));

    const optimisticQueue = applyOptimisticAction(draftItems, item.id, action);
    setDraftItems(optimisticQueue);

    const result = await performQueueAction(location, item, action);

    setBusyActionById((prev) => ({ ...prev, [item.id]: null }));
    onActionComplete?.(result, result.ok ? optimisticQueue : undefined);
  }

  return (
    <div className="boothQueueManager">
      <div className="boothQueueToolbar">
        <div>
          <div className="boothQueueToolbarTitle">Song reorder mode</div>
          <div className="boothQueueToolbarSub">Drag songs only. Interstitials remain locked system inserts.</div>
        </div>

        <div className="boothQueueToolbarRight">
          <div className="boothQueueToolbarPill">{draggableSongCount} draggable songs</div>
          <button type="button" className="boothToolbarBtn boothToolbarBtn--ghost" onClick={cancelDraft} disabled={!dragState.dirty || dragState.saving}>
            Cancel
          </button>
          <button type="button" className="boothToolbarBtn" onClick={saveReorder} disabled={!dragState.dirty || dragState.saving}>
            {dragState.saving ? "Saving..." : "Save Reorder"}
          </button>
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
              busyAction={busyActionById[item.id] ?? null}
              isDragging={dragState.activeDragId === item.id}
              isDropTarget={dragState.activeDragId !== null && dragState.activeDragId !== item.id}
              onAction={handleItemAction}
              onDragStart={(draggedItem) => {
                setDragState((prev) => ({
                  ...prev,
                  activeDragId: draggedItem.id,
                  error: null,
                  success: null,
                }));
              }}
              onDragOver={() => {
                // visual only
              }}
              onDrop={handleDrop}
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
