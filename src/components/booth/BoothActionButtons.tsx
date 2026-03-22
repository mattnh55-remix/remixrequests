"use client";

import { formatActionLabel } from "./booth-utils";
import type { BoothActionName } from "./types";

export default function BoothActionButtons({
  actions,
  busyKey,
  activeBusyKey,
  disabled,
  compact = false,
  onAction,
}: {
  actions: BoothActionName[];
  busyKey?: string | null;
  activeBusyKey?: string | null;
  disabled?: boolean;
  compact?: boolean;
  onAction: (action: BoothActionName) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <div className={`boothActionBar ${compact ? "boothActionBar--compact" : ""}`}>
      {actions.map((action) => {
        const fullKey = `${busyKey || ""}${action}`;
        const isBusy = activeBusyKey === fullKey;

        return (
          <button
            key={action}
            type="button"
            className={`boothActionBtn boothActionBtn--${action}`}
            disabled={disabled || !!activeBusyKey}
            onClick={() => onAction(action)}
          >
            {isBusy ? "Working..." : formatActionLabel(action)}
          </button>
        );
      })}
    </div>
  );
}
