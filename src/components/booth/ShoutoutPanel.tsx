"use client";

import StatusBadge from "./StatusBadge";
import { formatTimeAgo } from "./booth-utils";
import type { BoothMode, ShoutoutItem } from "./types";

type ShoutoutPanelProps = {
  pending: ShoutoutItem[];
  approved: ShoutoutItem[];
  mode?: BoothMode;
};

function ShoutoutRow({ item, tone }: { item: ShoutoutItem; tone: "gold" | "cyan" }) {
  return (
    <div className="shoutoutRow">
      <div className="shoutoutTop">
        <strong>{item.fromName || "Guest"}</strong>
        <div className="shoutoutBadges">
          {item.tier ? <StatusBadge label={item.tier} tone="pink" /> : null}
          <StatusBadge label={tone === "gold" ? "PENDING" : "APPROVED"} tone={tone} />
        </div>
      </div>
      <div className="shoutoutText">{item.messageText || "No message text."}</div>
      <div className="shoutoutMeta">{item.createdAt ? formatTimeAgo(item.createdAt) : "—"}</div>
    </div>
  );
}

export default function ShoutoutPanel({ pending, approved, mode = "performance" }: ShoutoutPanelProps) {
  return (
    <section className={`boothPanel ${mode === "performance" ? "boothPanel--compact" : ""}`}>
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Shoutouts</div>
          <div className="boothPanelSub">Pending and approved messages</div>
        </div>
      </div>

      <div className="boothSplit">
        <div className="shoutoutSection">
          <div className="listSectionTitle" style={{ marginBottom: 6 }}>Pending</div>
          {pending.length ? (
            <div className="shoutoutListScroller">
              {pending.map((item) => (
                <ShoutoutRow key={item.id} item={item} tone="gold" />
              ))}
            </div>
          ) : (
            <div className="emptyBox">No pending shoutouts.</div>
          )}
        </div>

        <div className="shoutoutSection">
          <div className="listSectionTitle" style={{ marginBottom: 6 }}>Approved</div>
          {approved.length ? (
            <div className="shoutoutListScroller">
              {approved.map((item) => (
                <ShoutoutRow key={item.id} item={item} tone="cyan" />
              ))}
            </div>
          ) : (
            <div className="emptyBox">No approved shoutouts.</div>
          )}
        </div>
      </div>
    </section>
  );
}
