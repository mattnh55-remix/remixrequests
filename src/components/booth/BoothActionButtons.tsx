"use client";

import { formatActionLabel } from "./booth-utils";
import type { BoothActionName } from "./types";

export default function BoothActionButtons({
  actions,
  busyAction,
  disabled,
  compact = false,
  onAction,
}: {
  actions: BoothActionName[];
  busyAction?: BoothActionName | null;
  disabled?: boolean;
  compact?: boolean;
  onAction: (action: BoothActionName) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <div className={`boothActionRail ${compact ? "boothActionRail--compact" : ""}`}>
      {actions.map((action) => {
        const isBusy = busyAction === action;
        return (
          <button
            key={action}
            type="button"
            className={`gunmetalBtn gunmetalBtn--${action} ${compact ? "gunmetalBtn--mini" : ""}`}
            disabled={disabled || !!busyAction}
            onClick={() => onAction(action)}
          >
            {isBusy ? "Working..." : formatActionLabel(action)}
          </button>
        );
      })}
    </div>
  );
}
