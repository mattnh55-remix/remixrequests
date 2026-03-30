// src/app/tv/[location]/page.tsx

"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type QueueItem = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  score: number;
  isBoosted?: boolean;
  boosted?: boolean;
  wasBoosted?: boolean;
};

type FeedMessage = {
  id: string;
  title?: string;
  fromName: string;
  body?: string;
  messageText?: string;
  imageUrl?: string | null;
  accent?: "gold" | "cyan" | "pink";
  productKey?: string;
  productTitle?: string;
  displayDurationSec?: number;
  approvedAt?: string;
  createdAt?: string;
};

type PlaceholderMessage = {
  id: string;
  title: string;
  body: string;
  fromName: string;
  messageText?: string;
  imageUrl?: string | null;
  accent?: "gold" | "cyan" | "pink";
  displayDurationSec?: number;
  productTitle?: string;
};

type RulesResponse = {
  ok?: boolean;
  rules?: {
    shoutoutSlideSeconds?: number;
  } | null;
  shoutoutSlideSeconds?: number;
};

const PLACEHOLDER_MESSAGES: PlaceholderMessage[] = [
  {
    id: "placeholder-1",
    title: "REMIX SHOUT OUTS!",
    body: "Celebrate a birthday, shout out a friend, or send a message to the rink!",
    fromName: "Scan the QR to send yours",
    accent: "cyan",
  },
  {
    id: "placeholder-2",
    title: "REMIX SHOUT OUTS!",
    body: "Upload a photo, add your message, and put your moment on the screen.",
    fromName: "Photo shout outs are live",
    accent: "pink",
  },
  {
    id: "placeholder-3",
    title: "REMIX SHOUT OUTS!",
    body: "Request your favorite song and send a shout out while you skate.",
    fromName: "Use the QR to get started",
    accent: "gold",
  },
];

function placeholderKey(location: string) {
  return `rr_tv_placeholders:${location}`;
}

function loadSavedPlaceholders(location: string): PlaceholderMessage[] {
  try {
    const raw = localStorage.getItem(placeholderKey(location));
    if (!raw) return PLACEHOLDER_MESSAGES;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      return PLACEHOLDER_MESSAGES;
    }

    return parsed.map((p: any, i: number) => {
      const fallback = PLACEHOLDER_MESSAGES[i] || {};

      return {
        id: p?.id || `msg${i + 1}`,

        title: String(
          p?.title ??
            p?.header ??
            fallback.title ??
            "REMIX SHOUT OUTS!"
        ),

        body: String(
          p?.body ??
            p?.messageText ??
            fallback.body ??
            ""
        ),

        messageText: String(
          p?.messageText ??
            p?.body ??
            fallback.messageText ??
            fallback.body ??
            ""
        ),

        fromName: String(
          p?.fromName ??
            p?.productLabel ??
            p?.productTitle ??
            fallback.fromName ??
            "- $name"
        ),

        imageUrl: p?.imageUrl ?? null,

        accent: (
          p?.accent ??
          fallback.accent ??
          "cyan"
        ) as "gold" | "cyan" | "pink",

        productTitle: String(
          p?.productTitle ??
            p?.productLabel ??
            fallback.productTitle ??
            "Remix Shout Out"
        ),

        displayDurationSec:
          typeof p?.displayDurationSec === "number" &&
          Number.isFinite(p.displayDurationSec)
            ? p.displayDurationSec
            : fallback.displayDurationSec,
      };
    });
  } catch (err) {
    console.error("Failed to load placeholders", err);
    return PLACEHOLDER_MESSAGES;
  }
}

function safeSeconds(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

async function loadShoutoutSlideSeconds(location: string): Promise<number> {
  const endpoints = [
    `/api/public/rules/${location}`,
    `/api/admin/rules/get/${location}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as RulesResponse;
      const next = data?.rules?.shoutoutSlideSeconds ?? data?.shoutoutSlideSeconds;
      const seconds = safeSeconds(next, 10);
      if (seconds > 0) return seconds;
    } catch {
      // ignore and try next route
    }
  }

  return 10;
}

export default function TvPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [playNow, setPlayNow] = useState<QueueItem[]>([]);
  const [upNext, setUpNext] = useState<QueueItem[]>([]);
  const [liveMessage, setLiveMessage] = useState<FeedMessage | null>(null);
  const [placeholderMessages, setPlaceholderMessages] = useState<PlaceholderMessage[]>(PLACEHOLDER_MESSAGES);
  const [shoutoutSlideSeconds, setShoutoutSlideSeconds] = useState(10);
  const [boostFlash, setBoostFlash] = useState(false);
  const [artA, setArtA] = useState<string | null>(null);
  const [artB, setArtB] = useState<string | null>(null);
  const [showA, setShowA] = useState(true);
  const [timerNowMs, setTimerNowMs] = useState(Date.now());
  const [isPortraitLayout, setIsPortraitLayout] = useState(false);
  const [defaultAlbumArtUrl, setDefaultAlbumArtUrl] = useState<string | null>(null);

  const prevTopId = useRef<string | null>(null);
  const placeholderEpochMsRef = useRef(Date.now());

  const requestUrl = useMemo(
    () => `https://skateremix.com/request/${location}`,
    [location]
  );

  const qrSrc = useMemo(() => {
    const size = isPortraitLayout ? 300 : 320;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      requestUrl
    )}`;
  }, [isPortraitLayout, requestUrl]);

  const activePlaceholderMessages =
  placeholderMessages.length ? placeholderMessages : PLACEHOLDER_MESSAGES;

const slideDurationSec = safeSeconds(shoutoutSlideSeconds, 10);
const placeholderDurationSec = 20 * 60;
const placeholderCycleMs = slideDurationSec * 1000;

const placeholderRotationIndex = Math.floor(
  Math.max(0, timerNowMs - placeholderEpochMsRef.current) / placeholderCycleMs
);

const featuredFallback =
  activePlaceholderMessages[
    placeholderRotationIndex % activePlaceholderMessages.length
  ];

const featuredMessage = liveMessage || featuredFallback;
const featuredBody =
  ("body" in featuredMessage ? featuredMessage.body : undefined) ||
  ("messageText" in featuredMessage ? featuredMessage.messageText : undefined) ||
  "";
const featuredTitle = featuredMessage.title || "REMIX SHOUT OUTS!";

const isPlaceholderMessage = !liveMessage;

const liveLifetimeDurationSec = safeSeconds(
  liveMessage?.displayDurationSec,
  placeholderDurationSec
);

const stableLiveStartMs = liveMessage
  ? new Date(
      liveMessage.approvedAt || liveMessage.createdAt || Date.now()
    ).getTime()
  : 0;

const elapsedMs = isPlaceholderMessage
  ? Math.max(0, timerNowMs - placeholderEpochMsRef.current)
  : Math.max(0, timerNowMs - stableLiveStartMs);

const clampedElapsedMs = isPlaceholderMessage
  ? Math.min(elapsedMs, placeholderDurationSec * 1000)
  : Math.min(elapsedMs, liveLifetimeDurationSec * 1000);

const remainingSec = isPlaceholderMessage
  ? Math.max(0, placeholderDurationSec - Math.floor(clampedElapsedMs / 1000))
  : Math.max(0, liveLifetimeDurationSec - Math.floor(clampedElapsedMs / 1000));

const progressPct = isPlaceholderMessage
  ? Math.max(0, 100 - (clampedElapsedMs / (placeholderDurationSec * 1000)) * 100)
  : Math.max(
      0,
      100 - (clampedElapsedMs / (liveLifetimeDurationSec * 1000)) * 100
    );

const timerMinutes = Math.floor(remainingSec / 60);
const timerSeconds = remainingSec % 60;
const timerLabel = `${timerMinutes}:${String(timerSeconds).padStart(2, "0")}`;

const nowPlaying = playNow[0] || upNext[0] || null;
const queueList = upNext.slice(0, isPortraitLayout ? 6 : 10);
const topIsBoosted = Boolean(
  nowPlaying && (nowPlaying.isBoosted || nowPlaying.boosted || nowPlaying.wasBoosted)
);

  async function tickQueue() {
    try {
      const res = await fetch(`/api/public/queue/${location}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setPlayNow(Array.isArray(data.playNow) ? data.playNow : []);
      setUpNext(Array.isArray(data.upNext) ? data.upNext : []);
    } catch {
      setPlayNow([]);
      setUpNext([]);
    }
  }

  async function tickShoutouts() {
    try {
      const res = await fetch(`/api/public/shoutouts/feed/${location}`, {
        cache: "no-store",
      });
      const data = await res.json();

      const next =
        data?.current ||
        data?.message ||
        (Array.isArray(data?.items) && data.items.length ? data.items[0] : null) ||
        null;

      setLiveMessage(next);
    } catch {
      setLiveMessage(null);
    }
  }

  useEffect(() => {
    placeholderEpochMsRef.current = Date.now();
    setPlaceholderMessages(loadSavedPlaceholders(location));

    void tickQueue();
    void tickShoutouts();
    
    // load default album art
    fetch(`/api/public/rules/${location}`)
      .then(r => r.json())
      .then(d => {
        const url = d?.rules?.defaultAlbumArtUrl || d?.defaultAlbumArtUrl || null;
        if (url) setDefaultAlbumArtUrl(url);
      })
      .catch(() => {});

    void loadShoutoutSlideSeconds(location).then((seconds) => {
      setShoutoutSlideSeconds(seconds);
    });

    const q = window.setInterval(() => void tickQueue(), 3000);
    const s = window.setInterval(() => void tickShoutouts(), 5000);
    const r = window.setInterval(() => {
      
    // load default album art
    fetch(`/api/public/rules/${location}`)
      .then(r => r.json())
      .then(d => {
        const url = d?.rules?.defaultAlbumArtUrl || d?.defaultAlbumArtUrl || null;
        if (url) setDefaultAlbumArtUrl(url);
      })
      .catch(() => {});

    void loadShoutoutSlideSeconds(location).then((seconds) => {
        setShoutoutSlideSeconds(seconds);
      });

      setPlaceholderMessages(loadSavedPlaceholders(location));
    }, 15000);

    const syncPlaceholders = () => {
      setPlaceholderMessages(loadSavedPlaceholders(location));
    };

    window.addEventListener("storage", syncPlaceholders);

    return () => {
      window.clearInterval(q);
      window.clearInterval(s);
      window.clearInterval(r);
      window.removeEventListener("storage", syncPlaceholders);
    };
  }, [location]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimerNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const apply = () => setIsPortraitLayout(media.matches);

    apply();

    const handler = () => apply();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }

    media.addListener(handler);
    return () => media.removeListener(handler);
  }, []);

  useEffect(() => {
    const topId = playNow[0]?.id ?? null;
    if (!topId) return;

    if (prevTopId.current && prevTopId.current !== topId) {
      setBoostFlash(true);
      const t = window.setTimeout(() => setBoostFlash(false), 900);
      prevTopId.current = topId;
      return () => window.clearTimeout(t);
    }

    prevTopId.current = topId;
  }, [playNow]);

  useEffect(() => {
    const next = nowPlaying?.artworkUrl || null;

    if (!artA && !artB) {
      setArtA(next);
      setShowA(true);
      return;
    }

    const currentVisible = showA ? artA : artB;
    if (next === currentVisible) return;

    if (showA) {
      setArtB(next);
      requestAnimationFrame(() => setShowA(false));
    } else {
      setArtA(next);
      requestAnimationFrame(() => setShowA(true));
    }
  }, [nowPlaying?.artworkUrl, artA, artB, showA]);

const queuePanel = isPortraitLayout ? (
  <PortraitQueuePanel
    nowPlaying={nowPlaying}
    queueList={queueList}
    topIsBoosted={topIsBoosted}
    showA={showA}
    artA={artA}
    artB={artB}
    qrSrc={qrSrc}
    defaultAlbumArtUrl={defaultAlbumArtUrl}
  />
) : (
  <LandscapeQueuePanel
    nowPlaying={nowPlaying}
    queueList={queueList}
    topIsBoosted={topIsBoosted}
    showA={showA}
    artA={artA}
    artB={artB}
    qrSrc={qrSrc}
    requestUrl={requestUrl}
    defaultAlbumArtUrl={defaultAlbumArtUrl}
  />
);

  return (
    <div className={`neonRoot remixTvRoot ${boostFlash ? "remixTvFlash" : ""}`}>
      <div className="remixTvOrb remixTvOrbA" />
      <div className="remixTvOrb remixTvOrbB" />
      <div className="remixTvOrb remixTvOrbC" />

      <div className={`remixTvWrap ${isPortraitLayout ? "remixTvWrap--portrait" : ""}`}>
        <section className="neonPanel remixTvShoutoutPanel">
          <div className="remixTvSectionHeader remixTvSectionHeader--withClock">
            <div className="remixTvSectionTitle">{featuredTitle}</div>
            <div className="remixTvCountdownPill">{timerLabel}</div>
          </div>

          <div
            key={featuredMessage.id}
            className={`remixTvBubble remixTvBubble--${featuredMessage.accent || "cyan"}`}
          >
            <div className="remixTvBubbleTimerRow">
              <div className="remixTvBubbleTimerDot" />
              <div className="remixTvBubbleTimerTrack">
                <div
                  className="remixTvBubbleTimerFill"
                  style={{ width: `${progressPct}%` }}
                >
                  <span className="remixTvBubbleTimerShimmer" />
                </div>
              </div>
            </div>

            <div className="remixTvBubbleInner">
              <FeatureBubble
                imageUrl={featuredMessage.imageUrl}
                body={featuredBody}
                fromName={featuredMessage.fromName}
              />
            </div>
          </div>

          {isPortraitLayout ? (
            <div className="remixTvPortraitAdWrap">
              <CtaBlock mode="portrait" qrSrc={qrSrc} variant="shoutout" />
            </div>
          ) : null}
        </section>

        <section className="remixTvQueueCol">{queuePanel}</section>
      </div>

      <style jsx global>{`
        .remixTvRoot {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 16%, rgba(0, 247, 255, 0.07), transparent 28%),
            radial-gradient(circle at 84% 12%, rgba(255, 57, 212, 0.08), transparent 26%),
            radial-gradient(circle at 66% 78%, rgba(0, 247, 255, 0.06), transparent 28%),
            #050814;
        }

        .remixTvOrb {
          position: absolute;
          border-radius: 999px;
          filter: blur(76px);
          opacity: 0.22;
          pointer-events: none;
          mix-blend-mode: screen;
          animation: remixTvOrbFloat 18s ease-in-out infinite;
        }

        .remixTvOrbA {
          width: 42vw;
          height: 42vw;
          left: -10vw;
          top: -10vw;
          background: radial-gradient(circle, rgba(0, 247, 255, 0.45), transparent 70%);
        }

        .remixTvOrbB {
          width: 36vw;
          height: 36vw;
          right: -8vw;
          top: 6vh;
          background: radial-gradient(circle, rgba(255, 57, 212, 0.4), transparent 70%);
          animation-delay: -5s;
        }

        .remixTvOrbC {
          width: 36vw;
          height: 36vw;
          left: 34vw;
          bottom: -18vw;
          background: radial-gradient(circle, rgba(69, 126, 255, 0.3), transparent 72%);
          animation-delay: -10s;
        }

        @keyframes remixTvOrbFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(1.8vw, -1.2vw, 0) scale(1.07); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes remixTvBubbleFloat {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.002); }
          100% { transform: translateY(0px) scale(1); }
        }

        @keyframes remixTvBubbleIn {
          0% { opacity: 0; transform: translateY(18px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0px) scale(1); }
        }

        @keyframes remixTvPulse {
          0% { transform: scale(1); opacity: 0.78; }
          50% { transform: scale(1.08); opacity: 0.35; }
          100% { transform: scale(1); opacity: 0.78; }
        }

        @keyframes remixTvFlashAnim {
          0% { opacity: 0; }
          18% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes remixTvMeterShimmer {
          0% { transform: translateX(-140px); opacity: 0; }
          15% { opacity: 0.9; }
          100% { transform: translateX(340px); opacity: 0; }
        }

        .remixTvWrap {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1.38fr) minmax(420px, 0.94fr);
          gap: 16px;
          height: 100vh;
          padding: 14px;
          box-sizing: border-box;
        }

        .remixTvWrap--portrait {
          grid-template-columns: 1fr;
          grid-template-rows: minmax(0, 1fr) minmax(0, 0.68fr);
        }

        .remixTvShoutoutPanel,
        .remixTvQueuePanel {
          position: relative;
          min-height: 0;
          overflow: hidden;
        }

        .remixTvShoutoutPanel {
          padding: 14px 14px 18px;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 12px;
          overflow: visible;
        }

        .remixTvSectionHeader--withClock {
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .remixTvQueueCol {
          min-height: 0;
          display: grid;
        }

        .remixTvQueuePanel {
          padding: 12px;
          display: grid;
          gap: 12px;
        }

        .remixTvQueuePanel--landscape {
          grid-template-rows: auto auto auto 1fr auto;
        }

        .remixTvQueuePanel--portrait {
          grid-template-rows: auto auto 1fr auto;
          padding: 12px 12px 14px;
        }

        .remixTvSectionHeader {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 2px 2px 0;
          position: relative;
          z-index: 2;
        }

        .remixTvQueueHeader {
          padding-bottom: 2px;
        }

        .remixTvSectionTitle {
          font-size: clamp(24px, 2vw, 40px);
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.18);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvCountdownPill {
          flex: 0 0 auto;
          min-width: 80px;
          height: 44px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          font-size: clamp(20px, 1.2vw, 28px);
          line-height: 1;
          font-weight: 1000;
          font-style: italic;
          letter-spacing: -0.2px;
        }

        .remixTvBubble {
          position: relative;
          min-height: 0;
          border-radius: 34px 34px 34px 20px;
          padding: 14px 30px 18px 18px;
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          animation:
            remixTvBubbleIn 420ms cubic-bezier(0.2, 0.9, 0.2, 1),
            remixTvBubbleFloat 7s ease-in-out 420ms infinite;
          transform-origin: 86% 100%;
          overflow: visible;
        }

        .remixTvBubble--gold {
          background: linear-gradient(180deg, #e8e39b 0%, #e1dc92 100%);
          color: #080808;
        }

        .remixTvBubble--cyan {
          background: linear-gradient(180deg, #bde8fb 0%, #a9ddf5 100%);
          color: #05070c;
        }

        .remixTvBubble--pink {
          background: linear-gradient(180deg, #ffc4ee 0%, #f6aadf 100%);
          color: #160811;
        }

        .remixTvBubbleTimerRow {
          height: 22px;
          display: grid;
          grid-template-columns: 14px 1fr;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .remixTvBubbleTimerDot {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: rgba(64, 211, 255, 0.96);
          box-shadow: 0 0 12px rgba(64, 211, 255, 0.7);
        }

        .remixTvBubbleTimerTrack {
          position: relative;
          height: 18px;
          border-radius: 999px;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.12));
          box-shadow:
            inset 0 1px 2px rgba(0,0,0,0.2),
            inset 0 0 0 1px rgba(255,255,255,0.12);
        }

        .remixTvBubbleTimerFill {
          position: absolute;
          inset: 0 auto 0 0;
          height: 100%;
          border-radius: 999px;
          transition: width 1s linear;
          overflow: hidden;
          box-shadow:
            0 0 10px rgba(255,255,255,0.28),
            0 0 26px rgba(255,255,255,0.18);
        }

        .remixTvBubbleTimerShimmer {
          position: absolute;
          inset: 0 auto 0 0;
          width: 140px;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.16) 30%,
            rgba(255,255,255,0.72) 52%,
            rgba(255,255,255,0.14) 72%,
            rgba(255,255,255,0) 100%
          );
          filter: blur(2px);
          animation: remixTvMeterShimmer 2.8s linear infinite;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .remixTvBubble--gold .remixTvBubbleTimerFill {
          background:
            linear-gradient(90deg, #fff6b3 0%, #f7d85e 50%, #ffe891 100%);
        }

        .remixTvBubble--cyan .remixTvBubbleTimerFill {
          background:
            linear-gradient(90deg, #ffffff 0%, #8cecff 24%, #40d3ff 60%, #7ee8ff 100%);
        }

        .remixTvBubble--pink .remixTvBubbleTimerFill {
          background:
            linear-gradient(90deg, #fff2fb 0%, #ff9ae6 26%, #ff52ca 62%, #ffc2f0 100%);
        }

        .remixTvBubbleInner {
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        .remixTvBubbleTail {
          position: absolute;
          right: 12px;
          bottom: -8px;
          width: 42px;
          height: 26px;
          pointer-events: none;
          z-index: 1;
        }

        .remixTvBubble--gold .remixTvBubbleTailPath { fill: #e1dc92; }
        .remixTvBubble--cyan .remixTvBubbleTailPath { fill: #a9ddf5; }
        .remixTvBubble--pink .remixTvBubbleTailPath { fill: #f6aadf; }

        .remixTvBubbleLayout {
          display: grid;
          gap: 18px;
          align-items: stretch;
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        .remixTvBubbleLayout--textOnly {
          grid-template-columns: 1fr;
        }

        .remixTvBubbleLayout--side {
          grid-template-columns: minmax(390px, 49%) minmax(0, 1fr);
        }

        .remixTvBubbleLayout--stacked {
          grid-template-columns: 1fr;
          grid-template-rows: minmax(260px, 0.78fr) auto;
        }

        .remixTvBubbleMedia {
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: stretch;
          justify-content: center;
        }

        .remixTvBubbleText {
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0 8px 2px 2px;
        }

        .remixTvBubbleText--imageShort {
          justify-content: center;
          gap: 22px;
        }

        .remixTvBubbleBody {
          font-size: clamp(34px, 4.5vw, 74px);
          line-height: 1.02;
          font-weight: 1000;
          font-style: italic;
          letter-spacing: -1.15px;
          word-break: break-word;
          text-wrap: balance;
          overflow-wrap: anywhere;
          text-shadow: 0 1px 0 rgba(255,255,255,0.08);
        }

        .remixTvBubbleLayout--textOnly .remixTvBubbleBody {
          font-size: clamp(36px, 4.8vw, 78px);
        }

        .remixTvBubbleLayout--side .remixTvBubbleBody,
        .remixTvBubbleLayout--stacked .remixTvBubbleBody {
          font-size: clamp(24px, 3.2vw, 50px);
          line-height: 1.03;
        }

        .remixTvBubbleFrom {
          margin-top: 14px;
          font-size: clamp(20px, 2vw, 38px);
          line-height: 1.04;
          font-weight: 1000;
          font-style: italic;
          white-space: normal;
          overflow: visible;
          text-overflow: unset;
          overflow-wrap: anywhere;
          word-break: break-word;
          max-width: 100%;
        }

        .remixTvBubbleLayout--side .remixTvBubbleFrom,
        .remixTvBubbleLayout--stacked .remixTvBubbleFrom {
          font-size: clamp(16px, 1.5vw, 30px);
        }

        .remixTvFeatureMediaShell {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(10, 26, 42, 0.88), rgba(13, 29, 46, 0.8)),
            radial-gradient(circle at 50% 18%, rgba(0,247,255,0.08), transparent 52%),
            radial-gradient(circle at 78% 82%, rgba(255,57,212,0.08), transparent 48%);
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.03),
            0 10px 24px rgba(0,0,0,0.14);
        }

        .remixTvFeatureMediaShell--portrait {
          align-items: flex-start;
          justify-content: center;
          min-height: 600px;
        }

        .remixTvFeatureMediaShell--landscape,
        .remixTvFeatureMediaShell--square {
          align-items: center;
          justify-content: center;
          min-height: 220px;
        }

        .remixTvFeatureMediaImg {
          display: block;
        }

        .remixTvFeatureMediaImg--portrait {
          width: auto;
          height: auto;
          max-width: 100%;
          min-height: 600px;
          object-fit: contain;
          object-position: top center;
        }

        .remixTvFeatureMediaImg--landscape,
        .remixTvFeatureMediaImg--square {
          width: 100%;
          height: auto;
          min-height: 220px;
          max-height: 100%;
          object-fit: contain;
          object-position: center center;
        }

        .remixTvTopCard {
          display: grid;
          align-items: center;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(
            90deg,
            rgba(8, 16, 40, 0.92),
            rgba(12, 26, 56, 0.76),
            rgba(31, 15, 50, 0.66)
          );
          position: relative;
          overflow: hidden;
        }

        .remixTvTopCardBoosted {
          box-shadow: var(--glowB);
        }

        .remixTvTopCard--landscape {
          grid-template-columns: 118px 1fr;
          gap: 16px;
          min-height: 126px;
          padding: 12px;
        }

        .remixTvTopCard--portrait {
          grid-template-columns: 88px 1fr;
          gap: 12px;
          min-height: 96px;
          padding: 10px 12px;
        }

        .remixTvTopArtWrap {
          display: flex;
          align-items: center;
        }

        .remixTvTopArtFrame {
          border-radius: 26px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.05);
          box-shadow: var(--glowA), var(--shadow);
        }

        .remixTvTopCard--landscape .remixTvTopArtFrame {
          width: 118px;
          height: 118px;
        }

        .remixTvTopCard--portrait .remixTvTopArtFrame {
          width: 88px;
          height: 88px;
          border-radius: 22px;
        }

        .remixTvTopArtLayer {
          position: absolute;
          inset: 0;
          transition: opacity 420ms ease;
        }

        .remixTvTopArtGlow {
          position: absolute;
          inset: -40%;
          background:
            radial-gradient(circle at 30% 25%, rgba(0,247,255,0.24), transparent 55%),
            radial-gradient(circle at 75% 80%, rgba(255,57,212,0.2), transparent 62%);
          animation: remixTvPulse 4.5s ease-in-out infinite;
          filter: blur(20px);
          opacity: 0.85;
          z-index: 2;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .remixTvTopRibbon {
          position: absolute;
          top: 8px;
          left: -34px;
          transform: rotate(-17deg);
          padding: 5px 36px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,57,212,0.9), rgba(0,247,255,0.72));
          color: #07070c;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          box-shadow: var(--glowB);
          z-index: 5;
        }

        .remixTvTopMeta {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .remixTvTopLabel {
          font-weight: 1000;
          letter-spacing: 1.4px;
          opacity: 0.72;
          text-transform: uppercase;
        }

        .remixTvTopCard--landscape .remixTvTopLabel {
          font-size: 13px;
          margin-bottom: 5px;
        }

        .remixTvTopCard--portrait .remixTvTopLabel {
          font-size: 11px;
          margin-bottom: 4px;
        }

        .remixTvTopSong {
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.45px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 0 12px rgba(255,255,255,0.12);
        }

        .remixTvTopCard--landscape .remixTvTopSong {
          font-size: clamp(24px, 1.75vw, 34px);
        }

        .remixTvTopCard--portrait .remixTvTopSong {
          font-size: clamp(20px, 2.45vw, 28px);
        }

        .remixTvTopArtist {
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTopCard--landscape .remixTvTopArtist {
          margin-top: 6px;
          font-size: clamp(16px, 1vw, 20px);
        }

        .remixTvTopCard--portrait .remixTvTopArtist {
          margin-top: 5px;
          font-size: clamp(13px, 1.6vw, 18px);
        }

        .remixTvTopMetaRow {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .remixTvTopBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          box-shadow: var(--glowA);
        }

        .remixTvTopBadge--boosted {
          background: linear-gradient(90deg, rgba(255,57,212,0.24), rgba(0,247,255,0.16));
          box-shadow: var(--glowB);
        }

        .remixTvTagRow {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .remixTvUrl {
          margin-top: 8px;
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10Header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 16px;
          font-weight: 1000;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.8);
          padding: 2px 4px 0;
        }

        .remixTvTop10HeaderSub {
          font-size: 11px;
          letter-spacing: 1px;
          opacity: 0.65;
        }

        .remixTvTop10List {
          display: grid;
          gap: 10px;
          align-content: start;
          min-height: 0;
          overflow: hidden;
        }

        .remixTvTop10Row {
          display: grid;
          grid-template-columns: 38px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(
            90deg,
            rgba(28, 16, 48, 0.76),
            rgba(16, 18, 45, 0.72),
            rgba(40, 13, 54, 0.62)
          );
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        }

        .remixTvTop10Row--portrait {
          grid-template-columns: 30px 1fr auto;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 18px;
        }

        .remixTvTop10Pos {
          font-size: 28px;
          font-weight: 1000;
          line-height: 1;
          text-align: center;
          color: #fff;
          text-shadow: 0 0 14px rgba(255,255,255,0.18);
        }

        .remixTvTop10Row--portrait .remixTvTop10Pos {
          font-size: 22px;
        }

        .remixTvTop10Text {
          min-width: 0;
        }

        .remixTvTop10Song {
          font-size: clamp(16px, 0.95vw, 20px);
          font-weight: 1000;
          line-height: 1.12;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10Row--portrait .remixTvTop10Song {
          font-size: clamp(14px, 1.65vw, 18px);
        }

        .remixTvTop10Artist {
          margin-top: 4px;
          font-size: clamp(12px, 0.8vw, 15px);
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10Row--portrait .remixTvTop10Artist {
          font-size: clamp(11px, 1.28vw, 14px);
          margin-top: 3px;
        }

        .remixTvTop10Score {
          min-width: 38px;
          height: 38px;
          padding: 0 12px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 14px;
          font-weight: 1000;
          background: rgba(0,247,255,0.09);
          border: 1px solid rgba(0,247,255,0.24);
          box-shadow: var(--glowA);
        }

        .remixTvTop10Row--portrait .remixTvTop10Score {
          min-width: 30px;
          height: 30px;
          padding: 0 10px;
          font-size: 12px;
        }

        .remixTvEmptyState {
          padding: 16px 10px;
          font-size: 18px;
          color: var(--muted);
        }

        .remixTvEmptyState--portrait {
          padding: 14px 8px;
          font-size: 15px;
          line-height: 1.35;
        }

        .remixTvBottomCta {
          border-top: 1px solid rgba(255,255,255,0.12);
          margin-top: 2px;
          display: grid;
          align-items: center;
        }

        .remixTvBottomCta--landscape {
          padding-top: 12px;
          grid-template-columns: 1fr 122px;
          gap: 16px;
        }

        .remixTvBottomCta--portrait {
          padding-top: 10px;
          grid-template-columns: 1fr 98px;
          gap: 12px;
        }

        .remixTvBottomText {
          line-height: 1.08;
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 0.35px;
        }

        .remixTvBottomText--landscape {
          font-size: clamp(16px, 1vw, 20px);
          text-align: center;
        }

        .remixTvBottomText--portrait {
          font-size: clamp(14px, 1.5vw, 18px);
          text-align: left;
        }

        .remixTvBottomTextLineStrong {
          display: block;
          color: #fff;
        }

        .remixTvBottomTextLineMuted {
          display: block;
          color: rgba(255,255,255,0.7);
          margin-top: 4px;
        }

        .remixTvBottomQrWrap {
          justify-self: end;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
        }

        .remixTvBottomQrWrap--landscape {
          width: 112px;
          height: 112px;
          padding: 4px;
        }

        .remixTvBottomQrWrap--portrait {
          width: 98px;
          height: 98px;
          padding: 4px;
          border-radius: 14px;
        }

        .remixTvBottomQr {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 12px;
        }

        .remixTvPortraitCluster {
          display: grid;
          gap: 10px;
          min-height: 0;
          grid-template-rows: auto auto 1fr auto;
        }

        .remixTvPortraitAdWrap {
          display: none;
        }

        .remixTvPortraitTop10Block {
          min-height: 0;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 8px;
        }

        .remixTvFlash::before {
          content: "";
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 50% 40%, rgba(255,57,212,0.18), transparent 55%),
            radial-gradient(circle at 40% 60%, rgba(0,247,255,0.14), transparent 60%);
          animation: remixTvFlashAnim 900ms ease-out 1;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: screen;
        }

        @media (max-width: 1400px) and (orientation: landscape) {
          .remixTvWrap {
            grid-template-columns: minmax(0, 1.22fr) minmax(380px, 0.92fr);
          }

          .remixTvBubbleLayout--side {
            grid-template-columns: minmax(310px, 46%) minmax(0, 1fr);
          }

          .remixTvBubbleLayout--stacked {
            grid-template-rows: minmax(210px, 0.7fr) auto;
          }

          .remixTvBubbleLayout--side .remixTvBubbleBody,
          .remixTvBubbleLayout--stacked .remixTvBubbleBody {
            font-size: clamp(22px, 3vw, 42px);
          }

          .remixTvBubbleLayout--side .remixTvBubbleFrom,
          .remixTvBubbleLayout--stacked .remixTvBubbleFrom {
            font-size: clamp(15px, 1.4vw, 24px);
          }

          .remixTvFeatureMediaShell--portrait {
            min-height: 500px;
          }

          .remixTvFeatureMediaShell--landscape,
          .remixTvFeatureMediaShell--square {
            min-height: 200px;
          }

          .remixTvFeatureMediaImg--portrait {
            min-height: 500px;
          }

          .remixTvFeatureMediaImg--landscape,
          .remixTvFeatureMediaImg--square {
            min-height: 200px;
          }
        }

        @media (orientation: portrait) {
          .remixTvWrap {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(0, 1.14fr) minmax(0, 0.86fr);
            height: 100vh;
          }

          .remixTvShoutoutPanel {
            padding: 10px 10px 12px;
            gap: 10px;
            grid-template-rows: auto minmax(0, 1fr) auto;
          }

          .remixTvSectionTitle {
            font-size: clamp(18px, 4.2vw, 30px);
          }

          .remixTvCountdownPill {
            min-width: 68px;
            height: 34px;
            padding: 0 11px;
            font-size: clamp(16px, 3.5vw, 22px);
          }

          .remixTvBubble {
            border-radius: 28px;
            padding: 10px 12px 14px 12px;
          }

          .remixTvBubbleTimerRow {
            height: 18px;
            grid-template-columns: 12px 1fr;
            gap: 8px;
            margin-bottom: 10px;
          }

          .remixTvBubbleTimerDot {
            width: 12px;
            height: 12px;
          }

          .remixTvBubbleTimerTrack {
            height: 14px;
          }

          .remixTvBubbleLayout--side {
            grid-template-columns: minmax(0, 42%) minmax(0, 1fr);
            gap: 12px;
          }

          .remixTvBubbleLayout--stacked {
            grid-template-rows: minmax(170px, 0.72fr) auto;
            gap: 12px;
          }

          .remixTvBubbleLayout--side .remixTvBubbleBody,
          .remixTvBubbleLayout--stacked .remixTvBubbleBody {
            font-size: clamp(20px, 4.6vw, 34px);
          }

          .remixTvBubbleLayout--textOnly .remixTvBubbleBody {
            font-size: clamp(28px, 6vw, 44px);
          }

          .remixTvBubbleLayout--side .remixTvBubbleFrom,
          .remixTvBubbleLayout--stacked .remixTvBubbleFrom {
            font-size: clamp(14px, 2.6vw, 22px);
          }

          .remixTvFeatureMediaShell {
            border-radius: 18px;
          }

          .remixTvFeatureMediaShell--portrait {
            min-height: 270px;
          }

          .remixTvFeatureMediaShell--landscape,
          .remixTvFeatureMediaShell--square {
            min-height: 160px;
          }

          .remixTvFeatureMediaImg--portrait {
            min-height: 270px;
          }

          .remixTvFeatureMediaImg--landscape,
          .remixTvFeatureMediaImg--square {
            min-height: 160px;
          }

          .remixTvQueuePanel--portrait {
            padding: 10px;
            gap: 10px;
          }

          .remixTvPortraitAdWrap {
            display: block;
          }

          .remixTvBottomCta--portrait {
            min-height: 110px;
            align-content: center;
          }
        }
      `}</style>
    </div>
  );
}

function LandscapeQueuePanel({
  nowPlaying,
  queueList,
  topIsBoosted,
  showA,
  artA,
  artB,
  qrSrc,
  requestUrl,
  defaultAlbumArtUrl,
}: {
  nowPlaying: QueueItem | null;
  queueList: QueueItem[];
  topIsBoosted: boolean;
  showA: boolean;
  artA: string | null;
  artB: string | null;
  qrSrc: string;
  requestUrl: string;
  defaultAlbumArtUrl?: string | null;
}) {
  return (
    <div className="neonPanel remixTvQueuePanel remixTvQueuePanel--landscape">
      <div className="remixTvSectionHeader remixTvQueueHeader">
        <div className="remixTvSectionTitle">Queued Up</div>
      </div>

<TopCard
  mode="landscape"
  nowPlaying={nowPlaying}
  topIsBoosted={topIsBoosted}
  showA={showA}
  artA={artA}
  artB={artB}
  defaultAlbumArtUrl={defaultAlbumArtUrl}
>
        <div className="remixTvTagRow">
          <div className="tvTag">REMIX REQUESTS</div>
          <div className="tvTag" style={{ boxShadow: "var(--glowB)" }}>
            PLAY NOW • UP NEXT
          </div>
          <div className="tvTag" style={{ boxShadow: "var(--glowA)" }}>
            TOP 10
          </div>
        </div>

        <div className="neonEQ" aria-hidden="true" style={{ marginTop: 12 }}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="remixTvUrl">{requestUrl.replace("https://", "")}</div>
      </TopCard>

      <Top10Block queueList={queueList} mode="landscape" />

      <CtaBlock mode="landscape" qrSrc={qrSrc} />
    </div>
  );
}

function PortraitQueuePanel({
  nowPlaying,
  queueList,
  topIsBoosted,
  showA,
  artA,
  artB,
  qrSrc,
  defaultAlbumArtUrl,
}: {
  nowPlaying: QueueItem | null;
  queueList: QueueItem[];
  topIsBoosted: boolean;
  showA: boolean;
  artA: string | null;
  artB: string | null;
  qrSrc: string;
  defaultAlbumArtUrl?: string | null;
}) {
  return (
    <div className="neonPanel remixTvQueuePanel remixTvQueuePanel--portrait">
      <div className="remixTvPortraitCluster">
        <div className="remixTvSectionHeader remixTvQueueHeader">
          <div className="remixTvSectionTitle">Queued Up</div>
        </div>

<TopCard
  mode="portrait"
  nowPlaying={nowPlaying}
  topIsBoosted={topIsBoosted}
  showA={showA}
  artA={artA}
  artB={artB}
  defaultAlbumArtUrl={defaultAlbumArtUrl}
>
          <div className="remixTvTopMetaRow">
            <div className="remixTvTopBadge">Top 10 Live</div>
            {topIsBoosted ? <div className="remixTvTopBadge remixTvTopBadge--boosted">Boosted</div> : null}
          </div>
        </TopCard>

        <div className="remixTvPortraitTop10Block">
          <Top10Block queueList={queueList} mode="portrait" />
        </div>

        <CtaBlock mode="portrait" qrSrc={qrSrc} />
      </div>
    </div>
  );
}

function TopCard({
  mode,
  nowPlaying,
  topIsBoosted,
  showA,
  artA,
  artB,
  children,
  defaultAlbumArtUrl,
}: {
  mode: "landscape" | "portrait";
  nowPlaying: QueueItem | null;
  topIsBoosted: boolean;
  showA: boolean;
  artA: string | null;
  artB: string | null;
  children?: ReactNode;
  defaultAlbumArtUrl?: string | null;
}) {
  return (
    <div className={`remixTvTopCard remixTvTopCard--${mode} ${topIsBoosted ? "remixTvTopCardBoosted" : ""}`}>
      <div className="remixTvTopArtWrap">
        <div className="remixTvTopArtFrame">
          <div className="remixTvTopArtGlow" />
          <div className="remixTvTopArtLayer" style={{ opacity: showA ? 1 : 0 }}>
            <Artwork src={artA} alt="" defaultSrc={defaultAlbumArtUrl} />
          </div>
          <div className="remixTvTopArtLayer" style={{ opacity: showA ? 0 : 1 }}>
            <Artwork src={artB} alt="" defaultSrc={defaultAlbumArtUrl} />
          </div>
          {topIsBoosted && mode === "landscape" ? <div className="remixTvTopRibbon">BOOSTED</div> : null}
        </div>
      </div>

      <div className="remixTvTopMeta">
        <div className="remixTvTopLabel">Now Playing</div>
        <div className="remixTvTopSong">{nowPlaying?.title || "No requests yet"}</div>
        <div className="remixTvTopArtist">
          {nowPlaying?.artist || "Scan the QR to get started"}
        </div>
        {children}
      </div>
    </div>
  );
}

function Top10Block({
  queueList,
  mode,
}: {
  queueList: QueueItem[];
  mode: "landscape" | "portrait";
}) {
  return (
    <>
      <div className="remixTvTop10Header">
        <span>Top 10</span>
        {mode === "portrait" ? (
          <span className="remixTvTop10HeaderSub">Up next favorites</span>
        ) : null}
      </div>

      <div className="remixTvTop10List">
        {queueList.length === 0 ? (
          <div className={`remixTvEmptyState ${mode === "portrait" ? "remixTvEmptyState--portrait" : ""}`}>
            No requests yet — scan the QR and start the vibe.
          </div>
        ) : (
          queueList.map((item, index) => (
            <div
              className={`remixTvTop10Row ${mode === "portrait" ? "remixTvTop10Row--portrait" : ""}`}
              key={item.id}
            >
              <div className="remixTvTop10Pos">{index + 1}</div>

              <div className="remixTvTop10Text">
                <div className="remixTvTop10Song">{item.title}</div>
                <div className="remixTvTop10Artist">{item.artist}</div>
              </div>

              <div className="remixTvTop10Score">{item.score}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function CtaBlock({
  mode,
  qrSrc,
  variant = "default",
}: {
  mode: "landscape" | "portrait";
  qrSrc: string;
  variant?: "default" | "shoutout";
}) {
  return (
    <div className={`remixTvBottomCta remixTvBottomCta--${mode}`}>
      <div className={`remixTvBottomText remixTvBottomText--${mode}`}>
        {mode === "portrait" ? (
          variant === "shoutout" ? (
            <>
              <span className="remixTvBottomTextLineStrong">Scan to send a shout out</span>
              <span className="remixTvBottomTextLineMuted">or request a song from your phone</span>
            </>
          ) : (
            <>
              <span className="remixTvBottomTextLineStrong">Scan to request a song</span>
              <span className="remixTvBottomTextLineMuted">or send a shout out to the screen</span>
            </>
          )
        ) : (
          <>
            <div>SCAN TO</div>
            <div>REQUEST SONG OR</div>
            <div>SEND MESSAGE</div>
          </>
        )}
      </div>

      <div className={`remixTvBottomQrWrap remixTvBottomQrWrap--${mode}`}>
        <img
          src={qrSrc}
          alt="QR code to request songs"
          className="remixTvBottomQr"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

function FeatureBubble({
  imageUrl,
  body,
  fromName,
}: {
  imageUrl?: string | null;
  body: string;
  fromName: string;
}) {
  const [layout, setLayout] = useState<"side" | "stacked" | "textOnly">(
    imageUrl ? "side" : "textOnly"
  );

  const isShortMessage = body.trim().length <= 70;
  const textClassName = `remixTvBubbleText${
    imageUrl && isShortMessage ? " remixTvBubbleText--imageShort" : ""
  }`;

  if (!imageUrl) {
    return (
      <div className="remixTvBubbleLayout remixTvBubbleLayout--textOnly">
        <div className={textClassName}>
          <div>
            <div className="remixTvBubbleBody">{body}</div>
          </div>
          <div className="remixTvBubbleFrom">— {fromName}</div>
        </div>
      </div>
    );
  }

  return (
    <ImageOrientationFrame
      src={imageUrl}
      onOrientation={(orientation) => {
        setLayout(orientation === "portrait" ? "side" : "stacked");
      }}
    >
      {(media) => (
        <div
          className={`remixTvBubbleLayout ${
            layout === "stacked"
              ? "remixTvBubbleLayout--stacked"
              : "remixTvBubbleLayout--side"
          }`}
        >
          <div className="remixTvBubbleMedia">{media}</div>

          <div className={textClassName}>
            <div>
              <div className="remixTvBubbleBody">{body}</div>
            </div>
            <div className="remixTvBubbleFrom">— {fromName}</div>
          </div>
        </div>
      )}
    </ImageOrientationFrame>
  );
}

function Artwork({ src, alt, defaultSrc }: { src?: string | null; alt: string; defaultSrc?: string | null }) {
  const [bad, setBad] = useState(false);

  const finalSrc = !bad && src ? src : (defaultSrc || null);

  if (!finalSrc) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          fontWeight: 1000,
          opacity: 0.65,
          fontSize: 22,
          letterSpacing: 1.2,
        }}
      >
        REMIX
      </div>
    );
  }

  return (
    <img
      src={finalSrc}
      alt={alt}
      onError={() => setBad(true)}
      loading="lazy"
      referrerPolicy="no-referrer"
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}

function ImageOrientationFrame({
  src,
  onOrientation,
  children,
}: {
  src: string;
  onOrientation: (orientation: "portrait" | "landscape" | "square") => void;
  children: (media: ReactNode) => ReactNode;
}) {
  const [bad, setBad] = useState(false);
  const [mode, setMode] = useState<"portrait" | "landscape" | "square">("square");

  if (bad) {
    return (
      <div className="remixTvBubbleLayout remixTvBubbleLayout--textOnly">
        <div className="remixTvBubbleText">
          <div className="remixTvBubbleBody">Image unavailable</div>
        </div>
      </div>
    );
  }

  const media = (
    <div className={`remixTvFeatureMediaShell remixTvFeatureMediaShell--${mode}`}>
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={`remixTvFeatureMediaImg remixTvFeatureMediaImg--${mode}`}
        onError={() => setBad(true)}
        onLoad={(e) => {
          const img = e.currentTarget;
          const w = img.naturalWidth || 0;
          const h = img.naturalHeight || 0;

          if (!w || !h) {
            setMode("square");
            onOrientation("square");
            return;
          }

          const ratio = w / h;
          if (ratio > 1.15) {
            setMode("landscape");
            onOrientation("landscape");
          } else if (ratio < 0.85) {
            setMode("portrait");
            onOrientation("portrait");
          } else {
            setMode("square");
            onOrientation("square");
          }
        }}
      />
    </div>
  );

  return <>{children(media)}</>;
}
