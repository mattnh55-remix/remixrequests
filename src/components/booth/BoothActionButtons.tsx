"use client";

type Props = {
  itemId: string;
  status?: string | null;
  compact?: boolean;
  onAction: (action: "load" | "play" | "pause" | "skip" | "done", itemId: string) => void;
};

export default function BoothActionButtons({ itemId, status, compact = false, onAction }: Props) {
  const s = String(status || "").toUpperCase();
  const buttons = [
    { key: "load" as const, label: "Load", disabled: s === "PLAYING" || s === "LOADED" || s === "PLAYED" },
    { key: "play" as const, label: "Play", disabled: s === "PLAYING" || s === "PLAYED" },
    { key: "pause" as const, label: "Pause", disabled: s === "PLAYED" || s === "SKIPPED" },
    { key: "skip" as const, label: "Skip", disabled: s === "PLAYED" || s === "SKIPPED" },
    { key: "done" as const, label: "Done", disabled: s === "PLAYED" },
  ];

  return (
    <div className={`boothBtnGroup ${compact ? "boothBtnGroup--compact" : ""}`}>
      {buttons.map((button) => (
        <button
          key={button.key}
          type="button"
          className={`gunBtn gunBtn--${button.key}`}
          disabled={button.disabled}
          onClick={() => onAction(button.key, itemId)}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
