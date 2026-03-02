"use client";

import { useEffect, useMemo, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Props = {
  balance: number | null;
  pulseKey: number;
  showDeltaBanner: boolean;
  delta: number | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export default function AnimatedBalanceCounter({
  balance,
  pulseKey,
  showDeltaBanner,
  delta,
  onRefresh,
  isRefreshing,
}: Props) {
  const [display, setDisplay] = useState<number>(balance ?? 0);

  useEffect(() => {
    if (balance == null) return;
    const from = display;
    const to = balance;
    if (from === to) return;

    const duration = 520;
    const started = performance.now();

    let raf = 0;
    const tick = (t: number) => {
      const p = clamp((t - started) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const next = Math.round(from + (to - from) * eased);
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  const deltaText = useMemo(() => {
    if (!delta || delta <= 0) return null;
    return `+${delta} credits added!`;
  }, [delta]);

  return (
    <div className="relative">
      {showDeltaBanner && deltaText ? (
        <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="animate-[rrPopBanner_2.2s_ease-out_1] rounded-full border border-white/20 bg-black/60 px-4 py-2 text-sm font-extrabold tracking-wide text-white shadow-[0_0_28px_rgba(56,189,248,0.35)] backdrop-blur">
            <span className="text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.65)]">
              {deltaText}
            </span>
          </div>
        </div>
      ) : null}

      <div
        key={pulseKey}
        className={[
          "relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/10 to-white/5",
          "px-4 py-3 shadow-[0_0_40px_rgba(99,102,241,0.16)]",
          "animate-[rrPulse_520ms_ease-out_1]",
        ].join(" ")}
        title="Credits balance"
      >
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-1/2 top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[rrShimmer_1.4s_ease-out_1]" />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/60">
              Credits
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-2xl font-extrabold tabular-nums text-white drop-shadow-[0_0_18px_rgba(34,211,238,0.22)]">
                {balance == null ? "—" : display}
              </div>
              <div className="text-xs font-bold text-white/70">CR</div>
            </div>
          </div>

          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold text-white/80 hover:bg-white/15 active:scale-[0.98] transition"
            >
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          ) : null}
        </div>

        <div className="pointer-events-none absolute -bottom-10 left-1/2 h-20 w-3/4 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-20 w-2/3 -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-2xl" />
      </div>

      <style jsx>{`
        @keyframes rrPulse {
          0% { transform: scale(1); filter: brightness(1); }
          35% { transform: scale(1.04); filter: brightness(1.18); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes rrShimmer {
          0% { transform: translateX(-20%) rotate(12deg); opacity: 0; }
          20% { opacity: 0.9; }
          100% { transform: translateX(260%) rotate(12deg); opacity: 0; }
        }
        @keyframes rrPopBanner {
          0% { transform: translateY(10px) scale(0.94); opacity: 0; }
          14% { transform: translateY(0) scale(1.03); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(-8px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}