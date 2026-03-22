"use client";

import PanelShell from "./PanelShell";
import StatusBadge from "./StatusBadge";
import { formatTimeAgo } from "./booth-utils";
import type { ShoutoutItem } from "./types";

export default function ShoutoutPanel({
  pendingShoutouts,
  approvedShoutouts,
}: {
  pendingShoutouts: ShoutoutItem[];
  approvedShoutouts: ShoutoutItem[];
}) {
  return (
    <PanelShell
      title="SHOUTOUTS PANEL"
      subtitle="Pending moderation and recently approved messages."
    >
      <div className="boothShoutoutSplit">
        <div>
          <div className="boothSubsectionTitle">PENDING</div>
          <div className="boothShoutoutList">
            {pendingShoutouts.length === 0 ? (
              <div className="boothEmptyState">No pending shoutouts.</div>
            ) : (
              pendingShoutouts.slice(0, 8).map((item) => (
                <div className="boothShoutoutRow" key={item.id}>
                  <div className="boothShoutoutTop">
                    <strong>{item.fromName || "Guest"}</strong>
                    <StatusBadge label={item.tier || "TIER"} tone="gold" />
                  </div>
                  <div className="boothShoutoutText">{item.messageText || "No message text."}</div>
                  <div className="boothShoutoutMeta">{formatTimeAgo(item.createdAt)}</div>
                </div>
              ))
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
