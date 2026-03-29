"use client";

type WarningLevel = "normal" | "warn5" | "warn2" | "hot1";

type Props = {
  startedAtIso: string;
  cycleMinutes?: number;
  onReset: () => void;

  warningLevel?: WarningLevel;
  promptLatched?: boolean;
};

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatClockTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function SessionTimerPanel({
  startedAtIso,
  cycleMinutes = 120,
  onReset,
  warningLevel = "normal",
  promptLatched = false,
}: Props) {
  const elapsedMs = Date.now() - new Date(startedAtIso).getTime();
  const elapsedMin = Math.floor(elapsedMs / 60000);
  const pct = Math.min(100, Math.round((elapsedMin / cycleMinutes) * 100));

  const className = [
    "rrSessionHero",
    warningLevel !== "normal" && `rrSessionHero--${warningLevel}`,
    promptLatched && "rrSessionHero--latched",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <div className="rrSessionHero__eyebrow">INTERSTITIAL CYCLE</div>

      <div className="rrSessionHero__main">
        <div className="rrSessionHero__time">
          {formatElapsed(elapsedMs)}
        </div>

        <button className="rrSessionHero__reset" onClick={onReset}>
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