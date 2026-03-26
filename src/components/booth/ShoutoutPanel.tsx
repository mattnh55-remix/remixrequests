"use client";

import { useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import { formatTimeAgo } from "./booth-utils";
import type { BoothMode, ShoutoutItem } from "./types";

type BoothShoutoutItem = ShoutoutItem & {
  signedImageUrl?: string | null;
  imagePreviewPath?: string | null;
  imageOriginalPath?: string | null;
  moderationNotes?: string | null;
  autoTextModerationReason?: string | null;
  creditsCost?: number;
  status?: string;
};

type ShoutoutPanelProps = {
  pending: ShoutoutItem[];
  approved: ShoutoutItem[];
  mode?: BoothMode;
  onApprove: (messageId: string) => Promise<any>;
onReject: (messageId: string, note?: string) => Promise<any>;
  onEdit: (args: { messageId: string; messageText: string; fromName?: string }) => Promise<any>;
  onRefresh?: () => Promise<void> | void;
};

type PendingRowProps = {
  item: BoothShoutoutItem;
  busyAction: string | null;
  onApprove: (messageId: string) => Promise<void>;
onReject: (messageId: string, note?: string) => Promise<void>;
  onEdit: (args: { messageId: string; messageText: string; fromName?: string }) => Promise<void>;
  onOpenImage: (item: BoothShoutoutItem) => void;
};

type ApprovedRowProps = {
  item: BoothShoutoutItem;
  onOpenImage: (item: BoothShoutoutItem) => void;
};

function getImageUrl(item: BoothShoutoutItem) {
  return item.signedImageUrl || item.imagePreviewPath || item.imageOriginalPath || "";
}

function PendingShoutoutRow({
  item,
  busyAction,
  onApprove,
  onReject,
  onEdit,
  onOpenImage,
}: PendingRowProps) {
  const imageUrl = getImageUrl(item);
  const [editing, setEditing] = useState(false);
  const [draftFromName, setDraftFromName] = useState(item.fromName || "");
  const [draftMessageText, setDraftMessageText] = useState(item.messageText || "");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  return (
    <div className="shoutoutRow shoutoutRow--moderation">
      <div className="shoutoutTop">
        <div className="shoutoutIdentity">
          <strong>{item.fromName || "Guest"}</strong>
          <div className="shoutoutBadges">
            {item.tier ? <StatusBadge label={item.tier} tone="pink" /> : null}
            {typeof item.creditsCost === "number" ? (
              <StatusBadge label={`${item.creditsCost} PTS`} tone="default" />
            ) : null}
            <StatusBadge label="PENDING" tone="gold" />
          </div>
        </div>
      </div>

      {imageUrl ? (
        <button
          type="button"
          className="shoutoutThumbButton"
          onClick={() => onOpenImage(item)}
          title="Open image preview"
        >
          <img src={imageUrl} alt="Shout-out upload preview" className="shoutoutThumbImage" />
          <span className="shoutoutThumbLabel">Tap to enlarge</span>
        </button>
      ) : null}

      {editing ? (
        <div className="shoutoutEditCard">
          <div className="shoutoutEditGrid">
            <label className="shoutoutField">
              <span className="shoutoutFieldLabel">From</span>
              <input
                className="gunmetalInput shoutoutEditInput"
                value={draftFromName}
                onChange={(e) => setDraftFromName(e.target.value)}
                maxLength={24}
              />
            </label>

            <label className="shoutoutField">
              <span className="shoutoutFieldLabel">Message</span>
              <textarea
                className="gunmetalInput shoutoutEditTextarea"
                value={draftMessageText}
                onChange={(e) => setDraftMessageText(e.target.value)}
                rows={4}
                maxLength={240}
              />
            </label>
          </div>

          <div className="boothRequestActions">
            <button
              type="button"
              className="gunmetalBtn gunmetalBtn--primary gunmetalBtn--mini"
              disabled={busyAction === item.id || !draftMessageText.trim()}
              onClick={() =>
                onEdit({
                  messageId: item.id,
                  fromName: draftFromName.trim(),
                  messageText: draftMessageText.trim(),
                }).then(() => setEditing(false))
              }
            >
              {busyAction === item.id ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="gunmetalBtn gunmetalBtn--neutral gunmetalBtn--mini"
              disabled={busyAction === item.id}
              onClick={() => {
                setDraftFromName(item.fromName || "");
                setDraftMessageText(item.messageText || "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="shoutoutText">{item.messageText || "No message text."}</div>
          <div className="shoutoutMetaRow">
            <div className="shoutoutMeta">{item.createdAt ? formatTimeAgo(item.createdAt) : "—"}</div>
            {item.autoTextModerationReason ? (
              <div className="shoutoutMeta shoutoutMeta--warn">
                Auto filter: {item.autoTextModerationReason}
              </div>
            ) : null}
          </div>

          <div className="boothRequestActions">
            <button
              type="button"
              className="gunmetalBtn gunmetalBtn--primary gunmetalBtn--mini"
              disabled={busyAction === item.id}
              onClick={() => onApprove(item.id)}
            >
              {busyAction === item.id ? "Working..." : "Approve"}
            </button>
            <button
              type="button"
              className="gunmetalBtn gunmetalBtn--neutral gunmetalBtn--mini"
              disabled={busyAction === item.id}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button
              type="button"
              className="gunmetalBtn gunmetalBtn--skip gunmetalBtn--mini"
              disabled={busyAction === item.id}
              onClick={() => {
                setRejectNote("");
                setShowRejectModal(true);
              }}
            >
              {busyAction === item.id ? "Working..." : "Reject"}
            </button>
          </div>
        </>
      )}

      {showRejectModal ? (
        <div className="rrBoothRejectModal" onClick={() => setShowRejectModal(false)}>
          <div className="rrBoothRejectModalCard" onClick={(e) => e.stopPropagation()}>
            <div className="rrBoothRejectModalTitle">Reject shout-out</div>
            <div className="rrBoothRejectModalSub">
              Add an optional moderation note for this rejection.
            </div>

            <textarea
              className="gunmetalInput shoutoutEditTextarea"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              maxLength={240}
              placeholder="Optional moderation note..."
            />

            <div className="boothRequestActions">
              <button
                type="button"
                className="gunmetalBtn gunmetalBtn--neutral gunmetalBtn--mini"
                disabled={busyAction === item.id}
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNote("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="gunmetalBtn gunmetalBtn--skip gunmetalBtn--mini"
                disabled={busyAction === item.id}
                onClick={() =>
                  onReject(item.id, rejectNote.trim()).then(() => {
                    setShowRejectModal(false);
                    setRejectNote("");
                  })
                }
              >
                {busyAction === item.id ? "Working..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ApprovedShoutoutRow({ item, onOpenImage }: ApprovedRowProps) {
  const imageUrl = getImageUrl(item);

  return (
    <div className="shoutoutRow">
      <div className="shoutoutTop">
        <div className="shoutoutIdentity">
          <strong>{item.fromName || "Guest"}</strong>
          <div className="shoutoutBadges">
            {item.tier ? <StatusBadge label={item.tier} tone="pink" /> : null}
            {typeof item.creditsCost === "number" ? (
              <StatusBadge label={`${item.creditsCost} PTS`} tone="default" />
            ) : null}
            <StatusBadge label="APPROVED" tone="playing" />
          </div>
        </div>
      </div>

      {imageUrl ? (
        <button
          type="button"
          className="shoutoutThumbButton"
          onClick={() => onOpenImage(item)}
          title="Open image preview"
        >
          <img src={imageUrl} alt="Shout-out upload preview" className="shoutoutThumbImage" />
          <span className="shoutoutThumbLabel">Tap to enlarge</span>
        </button>
      ) : null}

      <div className="shoutoutText">{item.messageText || "No message text."}</div>

      <div className="shoutoutMetaRow">
        <div className="shoutoutMeta">{item.createdAt ? formatTimeAgo(item.createdAt) : "—"}</div>
        {item.moderationNotes ? (
          <div className="shoutoutMeta">Note: {item.moderationNotes}</div>
        ) : null}
      </div>
    </div>
  );
}

export default function ShoutoutPanel({
  pending,
  approved,
  mode = "performance",
  onApprove,
  onReject,
  onEdit,
  onRefresh,
}: ShoutoutPanelProps) {
  const pendingItems = useMemo(() => pending as BoothShoutoutItem[], [pending]);
  const approvedItems = useMemo(() => approved as BoothShoutoutItem[], [approved]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [lightboxItem, setLightboxItem] = useState<BoothShoutoutItem | null>(null);

  async function wrapAction(messageId: string, task: () => Promise<any>) {
    setBusyAction(messageId);
    setErrorMsg("");
    try {
      const result = await task();
      if (result?.ok === false) {
        setErrorMsg(result.error || "Shout-out action failed.");
      }
      await onRefresh?.();
    } catch (error: any) {
      setErrorMsg(error?.message || "Shout-out action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  const lightboxImageUrl = lightboxItem ? getImageUrl(lightboxItem) : "";

  return (
    <>
      <section className={`boothPanel ${mode === "performance" ? "boothPanel--compact" : ""}`}>
        <div className="boothPanelHeader">
          <div>
            <div className="boothPanelTitle">Shoutouts</div>
            <div className="boothPanelSub">Pending moderation, photo preview, and approved messages</div>
          </div>
        </div>

        {errorMsg ? <div className="searchAddError">{errorMsg}</div> : null}

        <div className="boothSplit">
          <div className="shoutoutSection">
            <div className="listSectionTitle" style={{ marginBottom: 6 }}>Pending</div>
            {pendingItems.length ? (
              <div className="shoutoutListScroller">
                {pendingItems.map((item) => (
                  <PendingShoutoutRow
                    key={item.id}
                    item={item}
                    busyAction={busyAction}
                    onApprove={(messageId) => wrapAction(messageId, () => onApprove(messageId))}
onReject={(messageId, note) =>
  wrapAction(messageId, () => onReject(messageId, note))
}
                    onEdit={(args) => wrapAction(args.messageId, () => onEdit(args))}
                    onOpenImage={setLightboxItem}
                  />
                ))}
              </div>
            ) : (
              <div className="emptyBox">No pending shoutouts.</div>
            )}
          </div>

          <div className="shoutoutSection">
            <div className="listSectionTitle" style={{ marginBottom: 6 }}>Approved</div>
            {approvedItems.length ? (
              <div className="shoutoutListScroller">
                {approvedItems.map((item) => (
                  <ApprovedShoutoutRow key={item.id} item={item} onOpenImage={setLightboxItem} />
                ))}
              </div>
            ) : (
              <div className="emptyBox">No approved shoutouts.</div>
            )}
          </div>
        </div>
      </section>

      {lightboxItem && lightboxImageUrl ? (
        <div className="rrBoothLightbox" onClick={() => setLightboxItem(null)}>
          <div className="rrBoothLightboxInner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="rrBoothLightboxClose"
              onClick={() => setLightboxItem(null)}
            >
              Close
            </button>
            <div className="rrBoothLightboxMeta">
              <strong>{lightboxItem.fromName || "Guest"}</strong>
              <span>{lightboxItem.tier || "PHOTO_UPLOAD"}</span>
            </div>
            <img
              src={lightboxImageUrl}
              alt={`Shout-out upload from ${lightboxItem.fromName || "Guest"}`}
              className="rrBoothLightboxImage"
            />
            {lightboxItem.messageText ? (
              <div className="rrBoothLightboxCaption">{lightboxItem.messageText}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
