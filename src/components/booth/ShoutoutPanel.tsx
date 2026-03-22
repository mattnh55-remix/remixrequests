"use client";

import { useState } from "react";
import PanelShell from "./PanelShell";
import StatusBadge from "./StatusBadge";
import { formatTimeAgo, performShoutoutAction } from "./booth-utils";
import type { ShoutoutActionName, ShoutoutItem } from "./types";

export default function ShoutoutPanel({
  pendingShoutouts,
  approvedShoutouts,
  onActionComplete,
}: {
  pendingShoutouts: ShoutoutItem[];
  approvedShoutouts: ShoutoutItem[];
  onActionComplete?: (result: { ok: boolean; message: string }) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<ShoutoutActionName | null>(null);

  async function handleAction(item: ShoutoutItem, action: ShoutoutActionName) {
    setBusyId(item.id);
    setBusyAction(action);
    const result = await performShoutoutAction(item, action);
    setBusyId(null);
    setBusyAction(null);
    onActionComplete?.(result);
  }

  return (
    <PanelShell title="SHOUTOUTS PANEL" subtitle="Pending moderation and recently approved messages.">
      <div className="boothShoutoutSplit">
        <div>
          <div className="boothSubsectionTitle">PENDING</div>
          <div className="boothShoutoutList">
            {pendingShoutouts.length === 0 ? (
              <div className="boothEmptyState">No pending shoutouts.</div>
            ) : (
              pendingShoutouts.slice(0, 8).map((item) => {
                const isBusy = busyId === item.id;
                return (
                  <div className="boothShoutoutRow boothShoutoutRow--pending" key={item.id}>
                    <div className="boothShoutoutTop">
                      <strong>{item.fromName || "Guest"}</strong>
                      <StatusBadge label={item.tier || "TIER"} tone="gold" />
                    </div>
                    <div className="boothShoutoutText">{item.messageText || "No message text."}</div>
                    <div className="boothShoutoutMeta">{formatTimeAgo(item.createdAt)}</div>
                    <div className="boothInlineActions">
                      <button type="button" className="boothActionBtn boothActionBtn--play" onClick={() => handleAction(item, "approve")} disabled={isBusy}>
                        {isBusy && busyAction === "approve" ? "Working..." : "Approve"}
                      </button>
                      <button type="button" className="boothActionBtn boothActionBtn--skip" onClick={() => handleAction(item, "reject")} disabled={isBusy}>
                        {isBusy && busyAction === "reject" ? "Working..." : "Reject"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <div className="boothSubsectionTitle">APPROVED</div>
          <div className="boothShoutoutList">
            {approvedShoutouts.length === 0 ? (
              <div className="boothEmptyState">No approved shoutouts.</div>
            ) : (
              approvedShoutouts.slice(0, 8).map((item) => (
                <div className="boothShoutoutRow" key={item.id}>
                  <div className="boothShoutoutTop">
                    <strong>{item.fromName || "Guest"}</strong>
                    <StatusBadge label="APPROVED" tone="cyan" />
                  </div>
                  <div className="boothShoutoutText">{item.messageText || "No message text."}</div>
                  <div className="boothShoutoutMeta">{formatTimeAgo(item.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
