"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InterstitialPromptModal, {
  BoothInterstitialAsset,
} from "@/components/booth/InterstitialPromptModal";

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
  bridgeBaseUrl?: string;
  pollMs?: number;

  onPromptOpen?: (payload: DuePromptPayload) => void;
  onPromptResolved?: () => void;
};

const DEFAULT_BRIDGE_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_POLL_MS = 15000;

export default function BoothInterstitialRuntime({
  location,
  sessionStartedAt,
  bridgeBaseUrl = DEFAULT_BRIDGE_BASE_URL,
  pollMs = DEFAULT_POLL_MS,
  onPromptOpen,
  onPromptResolved,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState<DuePromptPayload | null>(null);
  const [open, setOpen] = useState(false);
  const skipLockRef = useRef(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (sessionStartedAt) params.set("sessionStartedAt", sessionStartedAt);
    return params.toString();
  }, [sessionStartedAt]);

  const fetchDuePrompt = useCallback(async () => {
    const url = `/api/booth/due-interstitial-prompt/${encodeURIComponent(location)}${
      queryString ? `?${queryString}` : ""
    }`;

    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load due interstitial prompt.");

    const data = (await res.json()) as DuePromptPayload;

    if (data.due) {
      setPayload(data);
      setOpen(true);
      onPromptOpen?.(data);
    }
  }, [location, queryString, onPromptOpen]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!cancelled && !busy && !open) {
          await fetchDuePrompt();
        }
      } catch (e) {
        console.error("[BoothInterstitialRuntime]", e);
      }
    };

    run();
    const timer = setInterval(run, pollMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [busy, open, fetchDuePrompt, pollMs]);

  const handlePlay = useCallback(
    async (asset: BoothInterstitialAsset) => {
      if (!payload?.category || !asset.playFilename) return;

      setBusy(true);

      try {
        await fetch(`${bridgeBaseUrl}/play`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: asset.playFilename }),
        });

        await fetch("/api/booth/interstitial-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location,
            category: payload.category,
            scheduleId: payload.scheduleId,
            assetId: asset.id,
            status: "PLAYED",
          }),
        });

        setOpen(false);
        setPayload(null);
        onPromptResolved?.();
      } finally {
        setBusy(false);
      }
    },
    [bridgeBaseUrl, location, payload, onPromptResolved]
  );

  const handleSkip = useCallback(
    async (reason: string) => {
      if (!payload?.category) return;
      if (skipLockRef.current) return;

      skipLockRef.current = true;
      setBusy(true);

      try {
        await fetch("/api/booth/interstitial-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location,
            category: payload.category,
            scheduleId: payload.scheduleId,
            status: "SKIPPED",
            reason,
          }),
        });

        setOpen(false);
        setPayload(null);
        onPromptResolved?.();
      } finally {
        skipLockRef.current = false;
        setBusy(false);
      }
    },
    [location, payload, onPromptResolved]
  );

  if (!payload) return null;

  return (
    <InterstitialPromptModal
      open={open}
      busy={busy}
      category={payload.category}
      promptTitle={payload.promptTitle}
      promptBody={payload.promptBody}
      assets={payload.eligibleAssets}
      onPlay={handlePlay}
      onSkip={handleSkip}
    />
  );
}