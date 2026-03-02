"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FetchBalanceFn = () => Promise<number>;

type AnimatedBalanceOptions = {
  enabled?: boolean; // start polling only when true
  softPollMs?: number; // default 2600
  intervalMs?: number; // default 650
  storageKey?: string; // where we remember last seen balance for +X detection
};

export function useAnimatedBalance(fetchBalance: FetchBalanceFn, opts?: AnimatedBalanceOptions) {
  const enabled = opts?.enabled ?? true;
  const softPollMs = opts?.softPollMs ?? 2600;
  const intervalMs = opts?.intervalMs ?? 650;

  const storageKey = useMemo(() => opts?.storageKey ?? "rr_lastBalance", [opts?.storageKey]);

  const [balance, setBalance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [delta, setDelta] = useState<number | null>(null);
  const [showDeltaBanner, setShowDeltaBanner] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  const lastKnownRef = useRef<number | null>(null);

  // bootstrap last known balance for this device/session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw != null) {
        const n = Number(raw);
        if (!Number.isNaN(n)) lastKnownRef.current = n;
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  function commit(next: number) {
    setBalance(next);

    const prev = lastKnownRef.current;
    if (typeof prev === "number" && next > prev) {
      const d = next - prev;
      setDelta(d);
      setShowDeltaBanner(true);
      setPulseKey((k) => k + 1);
      window.setTimeout(() => setShowDeltaBanner(false), 2200);
    } else if (prev == null) {
      // first time: still pulse once
      setPulseKey((k) => k + 1);
    } else if (next !== prev) {
      // changed down or sideways: pulse lightly
      setPulseKey((k) => k + 1);
    }

    lastKnownRef.current = next;
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      // ignore
    }
  }

  async function refreshOnce() {
    if (!enabled) return;
    setIsRefreshing(true);
    try {
      const next = await fetchBalance();
      if (typeof next === "number" && !Number.isNaN(next)) commit(next);
    } finally {
      setIsRefreshing(false);
    }
  }

  // Soft-poll on enable (TouchTunes “credits just landed” feel after checkout)
  useEffect(() => {
    if (!enabled) return;

    let alive = true;
    const startedAt = Date.now();

    (async () => {
      try {
        const first = await fetchBalance();
        if (!alive) return;
        if (typeof first === "number" && !Number.isNaN(first)) commit(first);
      } catch {
        // ignore
      }

      const t = window.setInterval(async () => {
        if (!alive) return;
        if (Date.now() - startedAt > softPollMs) {
          window.clearInterval(t);
          return;
        }
        try {
          const next = await fetchBalance();
          if (!alive) return;
          if (typeof next === "number" && !Number.isNaN(next)) commit(next);
        } catch {
          // ignore
        }
      }, intervalMs);

      return () => window.clearInterval(t);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, storageKey]);

  // Lets the request endpoint “push” a new balance into the UI (no backend changes)
  function applyBalance(next: number) {
    if (typeof next === "number" && !Number.isNaN(next)) commit(next);
  }

  return {
    balance,
    isRefreshing,
    refreshOnce,
    applyBalance,
    delta,
    showDeltaBanner,
    pulseKey,
  };
}