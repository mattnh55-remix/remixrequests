"use client";

import StatusBadge from "./StatusBadge";
import { formatTimeAgo } from "./booth-utils";
import type { BoothMode, ShoutoutItem } from "./types";

type ShoutoutPanelProps = {
  pending: ShoutoutItem[];
  approved: ShoutoutItem[];
  mode?: BoothMode;
};

function ShoutoutRow({
  item,
  tone,
}: {
  item: ShoutoutItem;
  tone: "gold" | "cyan";
}) {
  return (
    <div className="boothShoutoutRow">
      <div className="boothShoutoutTop">
        <strong>{item.fromName || "Guest"}</strong>
        <div className="boothShoutoutBadges">
          {item.tier ? <StatusBadge label={item.tier} tone="pink" /> : null}
          <StatusBadge label={tone === "gold" ? "Pending" : "Approved"} tone={tone} />
        </div>
      </div>

      <div className="boothShoutoutText">{item.messageText || "No message text."}</div>
      <div className="boothShoutoutMeta">{item.createdAt ? formatTimeAgo(item.createdAt) : "—"}</div>
    </div>
  );
}

export default function ShoutoutPanel({
  pending,
  approved,
  mode = "visual",
}: ShoutoutPanelProps) {
  return (
    <section className={`boothPanel ${mode === "performance" ? "is-compact" : ""}`}>
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Shoutouts</div>
          <div className="boothPanelSub">Pending and approved messages</div>
        </div>
      </div>

      <div className="boothShoutoutSplit">
        <div>
          <div className="boothSubsectionTitle">Pending</div>
          <div className="boothShoutoutList">
            {pending.length ? (
              pending.map((item) => <ShoutoutRow key={item.id} item={item} tone="gold" />)
            ) : (
              <div className="boothEmptyState">No pending shoutouts.</div>
            )}
          </div>
        </div>

        <div>
          <div className="boothSubsectionTitle">Approved</div>
          <div className="boothShoutoutList">
            {approved.length ? (
              approved.map((item) => <ShoutoutRow key={item.id} item={item} tone="cyan" />)
            ) : (
              <div className="boothEmptyState">No approved shoutouts.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
