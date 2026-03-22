"use client";

import PanelShell from "./PanelShell";
import StatusBadge from "./StatusBadge";
import type { RequestItem } from "./types";

export default function RequestPanel({ pendingRequests }: { pendingRequests: RequestItem[] }) {
  return (
    <PanelShell
      title="REQUESTS PANEL"
      subtitle="Operator awareness view for live demand."
    >
      <div className="boothMiniStats">
        <StatusBadge label={`PENDING ${pendingRequests.length}`} tone="cyan" />
      </div>

      <div className="boothRequestList">
        {pendingRequests.length === 0 ? (
          <div className="boothEmptyState">No pending requests returned.</div>
        ) : (
          pendingRequests.slice(0, 12).map((item, idx) => (
            <div className="boothRequestRow" key={item.id}>
              <div className="boothRequestIndex">{idx + 1}</div>
              <div className="boothRequestMain">
                <div className="boothRequestTitleLine">
                  <div className="boothRequestTitle">{item.title || "Untitled"}</div>
                  {(item.boosted || item.type === "PLAY_NOW") ? (
                    <StatusBadge label="BOOST" tone="pink" />
                  ) : (
                    <StatusBadge label="REQUEST" tone="cyan" />
                  )}
                </div>
                <div className="boothRequestMeta">
                  {item.artist || "Unknown artist"}
                  {item.requestedByLabel ? ` • ${item.requestedByLabel}` : ""}
                  {typeof item.score === "number" ? ` • Score ${item.score}` : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </PanelShell>
  );
}
