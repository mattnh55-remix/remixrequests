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
  pollMs?: number;
  onPromptOpen?: (payload: DuePromptPayload) => void;
  onPromptResolved?: () => void;
};

const DEFAULT_POLL_MS = 15000;

export default function BoothInterstitialRuntime({
  location,
  sessionStartedAt,
  pollMs = DEFAULT_POLL_MS,
  onPromptOpen,
}: Props) {
  const openedScheduleIdRef = useRef<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (sessionStartedAt) {
      params.set("sessionStartedAt", sessionStartedAt);
    }

    return params.toString();
  }, [sessionStartedAt]);

  const fetchDuePrompt = useCallback(async () => {
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
  }, [location, queryString, onPromptOpen]);

  useEffect(() => {
    openedScheduleIdRef.current = null;
  }, [location, sessionStartedAt]);

  useEffect(() => {
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
  }, [fetchDuePrompt, pollMs]);

  return null;
}