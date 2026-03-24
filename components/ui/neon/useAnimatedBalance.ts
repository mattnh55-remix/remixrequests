"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  enabled?: boolean;
  softPollMs?: number;
  intervalMs?: number;
  storageKey?: string;
};

type HookResult = {
  balance: number | null;
  pulseKey: number;
  refreshOnce: () => Promise<void>;
  applyBalance: (next: number) => void;
};

export function useAnimatedBalance(
  fetcher: () => Promise<number>,
  options: Options = {}
): HookResult {
  const {
    enabled = true,
    softPollMs = 2500,
    intervalMs = 650,
    storageKey,
  } = options;

  const [balance, setBalance] = useState<number | null>(null);
  const [pulseKey, setPulseKey] = useState(0);

  const mountedRef = useRef(true);
  const pollingRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        setBalance(parsed);
      }
    } catch {}
  }, [storageKey]);

  const persist = useCallback(
    (value: number) => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, String(value));
      } catch {}
    },
    [storageKey]
  );

  const applyBalance = useCallback(
    (next: number) => {
      setBalance((prev) => {
        if (prev !== next) {
          setPulseKey((k) => k + 1);
        }
        return next;
      });
      persist(next);
    },
    [persist]
  );

  const refreshOnce = useCallback(async () => {
    if (!enabled || busyRef.current) return;

    busyRef.current = true;
    try {
      const next = await fetcher();
      if (!mountedRef.current) return;
      applyBalance(Number(next ?? 0));
    } catch {
      // keep current balance on fetch error
    } finally {
      busyRef.current = false;
    }
  }, [enabled, fetcher, applyBalance]);

  useEffect(() => {
    if (!enabled) return;

    refreshOnce();

    const id = window.setInterval(() => {
      refreshOnce();
    }, softPollMs);

    pollingRef.current = id;

    return () => {
      window.clearInterval(id);
    };
  }, [enabled, refreshOnce, softPollMs, intervalMs]);

  return {
    balance,
    pulseKey,
    refreshOnce,
    applyBalance,
  };
}