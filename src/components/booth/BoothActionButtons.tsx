"use client";

type ActionName = "load" | "play" | "pause" | "skip" | "done" | "remove";

const LABELS: Record<ActionName, string> = {
  load: "LOAD",
  play: "PLAY",
  pause: "PAUSE",
  skip: "SKIP",
  done: "DONE",
  remove: "REMOVE",
};

export default function BoothActionButtons({
  actions,
  compact = false,
}: {
  actions: Array<{
    name: ActionName;
    onClick?: () => void;
    disabled?: boolean;
  }>;
  compact?: boolean;
}) {
  return (
    <div className={`boothActionRail ${compact ? "boothActionRail--compact" : ""}`}>
      {actions.map((action) => (
        <button
          key={action.name}
          type="button"
          className={`gunmetalBtn gunmetalBtn--${action.name}`}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {LABELS[action.name]}
        </button>
      ))}
    </div>
  );
}
