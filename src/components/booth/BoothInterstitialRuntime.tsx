"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { BoothInterstitialAsset } from "@/components/booth/InterstitialPromptModal";

type DuePromptPayload = {
  due: boolean;
  location: string;
  category: string | null;
  scheduleId: string | null;
  promptTitle: string | null;
  promptBody: string | null;
  session: {
    cycleMinutes: number;
    elapsedMinutes: number;
    startedAt: string | null;
  };
  eligibleAssets: BoothInterstitialAsset[];
};

type Props = {
  location: string;
  sessionStartedAt?: string | null;
  pausedElapsedMs?: number;
  isPaused?: boolean;
  pollMs?: number;
  onPromptOpen?: (payload: DuePromptPayload) => void;
  onPromptResolved?: () => void;
};

const DEFAULT_POLL_MS = 15000;

export default function BoothInterstitialRuntime({
  location,
  sessionStartedAt,
  pausedElapsedMs = 0,
  isPaused = false,
  pollMs = DEFAULT_POLL_MS,
  onPromptOpen,
}: Props) {
  const openedScheduleIdRef = useRef<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (sessionStartedAt) params.set("sessionStartedAt", sessionStartedAt);
    params.set("pausedElapsedMs", String(Math.max(0, pausedElapsedMs)));
    return params.toString();
  }, [sessionStartedAt, pausedElapsedMs]);

  const fetchDuePrompt = useCallback(async () => {
    if (isPaused) {
      return;
    }

    const url = `/api/booth/due-interstitial-prompt/${encodeURIComponent(location)}${
      queryString ? `?${queryString}` : ""
    }`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to load due interstitial prompt.");
    }

    const data = (await res.json()) as DuePromptPayload;

    if (!data?.due) {
      openedScheduleIdRef.current = null;
      return;
    }

    const nextScheduleId = data.scheduleId ?? "__due_without_schedule__";

    if (openedScheduleIdRef.current === nextScheduleId) {
      return;
    }

    openedScheduleIdRef.current = nextScheduleId;
    onPromptOpen?.(data);
  }, [isPaused, location, queryString, onPromptOpen]);

  useEffect(() => {
    openedScheduleIdRef.current = null;
  }, [location, sessionStartedAt, pausedElapsedMs, isPaused]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        if (!cancelled) {
          await fetchDuePrompt();
        }
      } catch (error) {
        console.error("[BoothInterstitialRuntime]", error);
      }
    };

    void run();

    const timer = window.setInterval(() => {
      void run();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isPaused, fetchDuePrompt, pollMs]);

  return null;
}