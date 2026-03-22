"use client";

import type { BoothMode, ShoutoutItem } from "./types";

export default function ShoutoutPanel({
  pending,
  approved,
  mode,
}: {
  pending: ShoutoutItem[];
  approved: ShoutoutItem[];
  mode: BoothMode;
}) {
  return (
    <div className={`boothPanel ${mode === "performance" ? "boothPanel--compact" : ""}`}>
      <div className="panelHead">
        <div>
          <div className="panelTitle">Shoutouts</div>
          <div className="panelSub">Message moderation and recently approved callouts.</div>
        </div>
      </div>
      <div className="listSectionTitle">Pending</div>
      <div className="emptyBox">{pending.length ? `${pending.length} pending shoutouts.` : "No pending shoutouts."}</div>
      <div className="listSectionTitle">Approved</div>
      <div className="emptyBox">{approved.length ? `${approved.length} approved shoutouts.` : "No approved shoutouts."}</div>
    </div>
  );
}
