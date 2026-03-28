"use client";

type SessionTimerPanelProps = {
  startedAtIso: string;
  cycleMinutes?: number;
  onReset: () => void;
};

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatClockTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SessionTimerPanel({
  startedAtIso,
  cycleMinutes = 120,
  onReset,
}: SessionTimerPanelProps) {
  const elapsedMs = Date.now() - new Date(startedAtIso).getTime();
  const elapsedMin = Math.max(0, Math.floor(elapsedMs / 1000 / 60));
  const pct = Math.min(100, Math.round((elapsedMin / cycleMinutes) * 100));

  return (
    <div className="rrSessionHero">
      <div className="rrSessionHero__eyebrow">INTERSTITIAL CYCLE</div>

      <div className="rrSessionHero__main">
        <div className="rrSessionHero__time">{formatElapsed(elapsedMs)}</div>

        <button
          type="button"
          className="rrSessionHero__reset"
          onClick={onReset}
          title="Reset session timer"
        >
          Reset
        </button>
      </div>

      <div className="rrSessionHero__sub">
        Started {formatClockTime(startedAtIso)} • {elapsedMin} / {cycleMinutes} min
      </div>

      <div className="rrSessionHero__bar">
        <div
          className="rrSessionHero__barFill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}