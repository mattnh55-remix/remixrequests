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
};

const DEFAULT_BRIDGE_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_POLL_MS = 15000;

export default function BoothInterstitialRuntime({
  location,
  sessionStartedAt,
  bridgeBaseUrl = DEFAULT_BRIDGE_BASE_URL,
  pollMs = DEFAULT_POLL_MS,
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

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to load due interstitial prompt.");
    }

    const data = (await res.json()) as DuePromptPayload;

    if (data.due) {
      setPayload(data);
      setOpen(true);
    }
  }, [location, queryString]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!cancelled && !busy && !open) {
          await fetchDuePrompt();
        }
      } catch (error) {
        console.error("[BoothInterstitialRuntime] poll error", error);
      }
    };

    run();
    const timer = window.setInterval(run, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [busy, open, fetchDuePrompt, pollMs]);

  const handlePlay = useCallback(
    async (asset: BoothInterstitialAsset) => {
      if (!payload?.category) {
        throw new Error("No active interstitial prompt.");
      }

      if (!asset.playFilename) {
        throw new Error("This asset has no playable filename.");
      }

      setBusy(true);

      try {
        const bridgeRes = await fetch(`${bridgeBaseUrl}/play`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: asset.playFilename,
          }),
        });

        if (!bridgeRes.ok) {
          throw new Error("Bridge playback failed.");
        }

        const eventRes = await fetch("/api/booth/interstitial-event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location,
            category: payload.category,
            scheduleId: payload.scheduleId,
            assetId: asset.id,
            status: "PLAYED",
          }),
        });

        if (!eventRes.ok) {
          const data = await eventRes.json().catch(() => null);
          throw new Error(data?.error || "Failed to log PLAYED event.");
        }

        setOpen(false);
        setPayload(null);
      } finally {
        setBusy(false);
      }
    },
    [bridgeBaseUrl, location, payload]
  );

  const handleSkip = useCallback(
    async (reason: string) => {
      if (!payload?.category) {
        throw new Error("No active interstitial prompt.");
      }

      if (skipLockRef.current) return;
      skipLockRef.current = true;
      setBusy(true);

      try {
        const eventRes = await fetch("/api/booth/interstitial-event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location,
            category: payload.category,
            scheduleId: payload.scheduleId,
            status: "SKIPPED",
            reason,
          }),
        });

        if (!eventRes.ok) {
          const data = await eventRes.json().catch(() => null);
          throw new Error(data?.error || "Failed to log SKIPPED event.");
        }

        setOpen(false);
        setPayload(null);
      } finally {
        skipLockRef.current = false;
        setBusy(false);
      }
    },
    [location, payload]
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