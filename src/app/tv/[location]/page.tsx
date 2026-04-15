"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Barlow_Condensed,
  DM_Serif_Display,
  Satisfy,
} from "next/font/google";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-barlow-condensed",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif-display",
});

const satisfy = Satisfy({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-satisfy",
});

const REMIX_LOGO_URL =
  "https://skateremix.com/wp-content/uploads/2026/03/Remix_Globe_Logo_350px.png";

type FeedMessage = {
  id: string;
  title?: string;
  fromName?: string;
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
  imagePath?: string | null;
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

type DisplaySlide =
  | {
      id: string;
      kind: "teaser";
      durationSec: number;
    }
  | {
      id: string;
      kind: "message";
      durationSec: number;
      title: string;
      body: string;
      fromName: string;
      imageUrl?: string | null;
      accent: "gold" | "cyan" | "pink";
      isFallback?: boolean;
    };

const DEFAULT_SLIDE_SECONDS = 20;

const PLACEHOLDER_MESSAGES: PlaceholderMessage[] = [
  {
    id: "placeholder-1",
    title: "REMIX SHOUTOUT!",
    body: "Celebrate a birthday, surprise your crew, or put your message on the big screen.",
    fromName: "- Remix Guests",
    accent: "cyan",
    displayDurationSec: 20,
  },
  {
    id: "placeholder-2",
    title: "REMIX SHOUTOUT!",
    body: "Photo shoutouts and message slides are live tonight.",
    fromName: "- Scan your table code",
    accent: "pink",
    displayDurationSec: 20,
  },
  {
    id: "placeholder-3",
    title: "REMIX SHOUTOUT!",
    body: "Your moment. Your message. Right up on the screen.",
    fromName: "- Remix Skate & Event Center",
    accent: "gold",
    displayDurationSec: 20,
  },
];

function placeholderKey(location: string) {
  return `rr_tv_placeholders:${location}`;
}

function safeSeconds(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

function loadSavedPlaceholders(location: string): PlaceholderMessage[] {
  try {
    const raw = localStorage.getItem(placeholderKey(location));
    if (!raw) return PLACEHOLDER_MESSAGES;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return PLACEHOLDER_MESSAGES;

    return parsed.map((p: any, i: number) => {
      const fallback = PLACEHOLDER_MESSAGES[i % PLACEHOLDER_MESSAGES.length];

      return {
        id: String(p?.id || `placeholder-${i + 1}`),
        title: String(
          p?.title ?? p?.header ?? fallback.title ?? "REMIX SHOUTOUT!"
        ),
        body: String(
          p?.body ?? p?.messageText ?? fallback.body ?? ""
        ),
        messageText: String(
          p?.messageText ?? p?.body ?? fallback.messageText ?? fallback.body ?? ""
        ),
        fromName: String(
          p?.fromName ??
            p?.productLabel ??
            p?.productTitle ??
            fallback.fromName ??
            "- Remix Guests"
        ),
        imageUrl: p?.imageUrl ?? null,
        imagePath: p?.imagePath ?? null,
        accent: (p?.accent ?? fallback.accent ?? "cyan") as
          | "gold"
          | "cyan"
          | "pink",
        productTitle: String(
          p?.productTitle ?? p?.productLabel ?? fallback.productTitle ?? ""
        ),
        displayDurationSec: safeSeconds(
          p?.displayDurationSec,
          fallback.displayDurationSec ?? DEFAULT_SLIDE_SECONDS
        ),
      };
    });
  } catch (error) {
    console.error("Failed to load saved shoutout placeholders", error);
    return PLACEHOLDER_MESSAGES;
  }
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
      const next =
        data?.rules?.shoutoutSlideSeconds ?? data?.shoutoutSlideSeconds;
      const seconds = safeSeconds(next, DEFAULT_SLIDE_SECONDS);
      if (seconds > 0) return seconds;
    } catch {
      // ignore
    }
  }

  return DEFAULT_SLIDE_SECONDS;
}

function normalizeMessageSlide(
  source: FeedMessage | PlaceholderMessage,
  fallbackDurationSec: number,
  isFallback = false
): DisplaySlide {
  const body = String(
    source.body ?? source.messageText ?? ""
  ).trim();

  return {
    id: String(source.id || `slide-${Math.random().toString(36).slice(2)}`),
    kind: "message",
    title: String(source.title || "REMIX SHOUTOUT!"),
    body: body || "Your message here...",
    fromName: String(source.fromName || "- Remix Guest"),
    imageUrl: source.imageUrl ?? null,
    accent: (source.accent || "cyan") as "gold" | "cyan" | "pink",
    durationSec: safeSeconds(
      source.displayDurationSec,
      fallbackDurationSec
    ),
    isFallback,
  };
}

function makeTeaserSlide(durationSec: number): DisplaySlide {
  return {
    id: "teaser-slide",
    kind: "teaser",
    durationSec: safeSeconds(durationSec, DEFAULT_SLIDE_SECONDS),
  };
}

function getSlideDuration(slide: DisplaySlide) {
  return safeSeconds(slide.durationSec, DEFAULT_SLIDE_SECONDS);
}

export default function TvPage({
  params,
}: {
  params: { location: string };
}) {
  const location = params.location;

  const [liveSlides, setLiveSlides] = useState<DisplaySlide[]>([]);
  const [placeholderSlides, setPlaceholderSlides] = useState<DisplaySlide[]>([]);
  const [shoutoutSlideSeconds, setShoutoutSlideSeconds] = useState(
    DEFAULT_SLIDE_SECONDS
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideStartedAt, setSlideStartedAt] = useState(Date.now());
  const [nowMs, setNowMs] = useState(Date.now());

  const activeSlides = useMemo(() => {
    if (liveSlides.length) return liveSlides;

    const teaser = makeTeaserSlide(shoutoutSlideSeconds);
    return [teaser, ...placeholderSlides];
  }, [liveSlides, placeholderSlides, shoutoutSlideSeconds]);

  const activeSlide = activeSlides[currentIndex] || null;

  const activeSignature = useMemo(
    () => activeSlides.map((slide) => slide.id).join("|"),
    [activeSlides]
  );

  async function tickShoutouts() {
    try {
      const res = await fetch(`/api/public/shoutouts/feed/${location}`, {
        cache: "no-store",
      });
      const data = await res.json();

      const feedItems: FeedMessage[] = Array.isArray(data?.items)
        ? data.items
        : data?.current
          ? [data.current]
          : data?.message
            ? [data.message]
            : [];

      const normalized = feedItems
        .filter(Boolean)
        .map((item) =>
          normalizeMessageSlide(item, shoutoutSlideSeconds, false)
        );

      setLiveSlides(normalized);
    } catch {
      setLiveSlides([]);
    }
  }

  useEffect(() => {
    const nextPlaceholders = loadSavedPlaceholders(location).map((item) =>
      normalizeMessageSlide(item, shoutoutSlideSeconds, true)
    );

    setPlaceholderSlides(nextPlaceholders);
    setCurrentIndex(0);
    setSlideStartedAt(Date.now());

    void tickShoutouts();
    void loadShoutoutSlideSeconds(location).then((seconds) => {
      setShoutoutSlideSeconds(seconds);
    });

    const feedInterval = window.setInterval(() => {
      void tickShoutouts();
    }, 5000);

    const configInterval = window.setInterval(() => {
      void loadShoutoutSlideSeconds(location).then((seconds) => {
        setShoutoutSlideSeconds(seconds);
      });

      const refreshedPlaceholders = loadSavedPlaceholders(location).map((item) =>
        normalizeMessageSlide(item, shoutoutSlideSeconds, true)
      );

      setPlaceholderSlides(refreshedPlaceholders);
    }, 15000);

    const syncPlaceholders = () => {
      const synced = loadSavedPlaceholders(location).map((item) =>
        normalizeMessageSlide(item, shoutoutSlideSeconds, true)
      );
      setPlaceholderSlides(synced);
    };

    window.addEventListener("storage", syncPlaceholders);

    return () => {
      window.clearInterval(feedInterval);
      window.clearInterval(configInterval);
      window.removeEventListener("storage", syncPlaceholders);
    };
  }, [location, shoutoutSlideSeconds]);

  useEffect(() => {
    setNowMs(Date.now());

    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeSlides.length) return;

    setCurrentIndex((prev) => {
      const currentId = activeSlides[Math.min(prev, activeSlides.length - 1)]?.id;
      const nextIndex = activeSlides.findIndex((slide) => slide.id === currentId);
      return nextIndex >= 0 ? nextIndex : 0;
    });

    setSlideStartedAt(Date.now());
  }, [activeSignature, activeSlides]);

  useEffect(() => {
    if (!activeSlide || !activeSlides.length) return;

    const elapsed = nowMs - slideStartedAt;
    const durationMs = getSlideDuration(activeSlide) * 1000;

    if (elapsed < durationMs) return;

    setCurrentIndex((prev) => {
      if (!activeSlides.length) return 0;
      return (prev + 1) % activeSlides.length;
    });
    setSlideStartedAt(Date.now());
  }, [activeSlide, activeSlides, nowMs, slideStartedAt]);

  const remainingSec = activeSlide
    ? Math.max(
        0,
        Math.ceil((getSlideDuration(activeSlide) * 1000 - (nowMs - slideStartedAt)) / 1000)
      )
    : 0;

  const progressPct = activeSlide
    ? Math.max(
        0,
        Math.min(
          100,
          100 -
            ((nowMs - slideStartedAt) /
              (getSlideDuration(activeSlide) * 1000)) *
              100
        )
      )
    : 100;

  const timerLabel = `${Math.floor(remainingSec / 60)}:${String(
    remainingSec % 60
  ).padStart(2, "0")}`;

  return (
    <div
      className={[
        barlowCondensed.variable,
        dmSerifDisplay.variable,
        satisfy.variable,
        "remixShoutTvRoot",
      ].join(" ")}
    >
      {activeSlide ? (
        <div key={`${activeSlide.id}-${slideStartedAt}`} className="remixShoutTvFade">
          {activeSlide.kind === "teaser" ? (
            <TeaserSlide timerLabel={timerLabel} progressPct={progressPct} />
          ) : (
            <MessageSlide
              slide={activeSlide}
              timerLabel={timerLabel}
              progressPct={progressPct}
            />
          )}
        </div>
      ) : null}

      <style jsx global>{`
        :root {
          --remix-bg-a: #5f5a52;
          --remix-bg-b: #4e4942;
          --remix-cream: #f4eddf;
          --remix-shadow: rgba(0, 0, 0, 0.34);
          --remix-teal: #12a99d;
          --remix-teal-dark: #0d7e75;
          --remix-orange: #e4772f;
          --remix-aqua: #7fd0d8;
          --remix-gold: #c0ba3d;
          --remix-deep-teal: #007d73;
          --remix-ink: #21211f;
        }

        html,
        body {
          background: #26231f;
        }

        .remixShoutTvRoot {
          position: relative;
          min-height: 100vh;
          width: 100%;
          overflow: hidden;
          background:
            radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.08), transparent 24%),
            linear-gradient(135deg, var(--remix-bg-a) 0%, var(--remix-bg-b) 100%);
          color: var(--remix-cream);
        }

        .remixShoutTvFade {
          min-height: 100vh;
          width: 100%;
          animation: remixSlideFade 520ms ease both;
        }

        @keyframes remixSlideFade {
          0% {
            opacity: 0;
            transform: scale(1.01);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes remixPhotoFloat {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
          100% {
            transform: scale(1);
          }
        }

        .remixSlideShell {
          min-height: 100vh;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          padding: 24px 28px 0;
          box-sizing: border-box;
          gap: 14px;
        }

        .remixSlideTop {
          display: grid;
          grid-template-columns: minmax(420px, 1fr) 580px;
          align-items: start;
          gap: 18px;
        }

        .remixBannerWrap {
          display: flex;
          justify-content: center;
        }

        .remixBanner {
          position: relative;
          min-width: 520px;
          max-width: 720px;
          padding: 14px 42px 24px;
          background:
            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 46%),
            radial-gradient(circle, rgba(0,0,0,0.14) 1px, transparent 1px),
            linear-gradient(180deg, #17aa9d 0%, #14998d 100%);
          background-size: auto, 28px 28px, auto;
          border-bottom: 8px solid rgba(0, 0, 0, 0.34);
          clip-path: polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%);
          box-shadow: 0 14px 24px rgba(0, 0, 0, 0.18);
          text-align: center;
        }

        .remixBannerText {
          font-family: var(--font-barlow-condensed), sans-serif;
          font-size: clamp(46px, 4vw, 86px);
          line-height: 0.94;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #f8f4ea;
          text-shadow:
            6px 6px 0 rgba(0, 0, 0, 0.22),
            0 2px 0 rgba(0, 0, 0, 0.16);
        }

        .remixTimerWrap {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding-top: 16px;
        }

        .remixTimerTrack {
          position: relative;
          height: 28px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.88);
          overflow: hidden;
          box-shadow: inset 0 1px 1px rgba(0,0,0,0.08);
        }

        .remixTimerFill {
          position: absolute;
          inset: 0 auto 0 0;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #f7f5ee 0%, #ffffff 100%);
          transition: width 250ms linear;
        }

        .remixTimerText {
          font-family: var(--font-barlow-condensed), sans-serif;
          font-size: clamp(30px, 2.2vw, 56px);
          line-height: 1;
          color: #f7f4eb;
          text-shadow: 4px 4px 0 rgba(0, 0, 0, 0.22);
          white-space: nowrap;
        }

        .remixMessageMain {
          min-height: 0;
          display: grid;
        }

        .remixMessageMain--standard {
          grid-template-columns: minmax(460px, 45%) minmax(0, 1fr);
          gap: 0;
        }

        .remixMessageMain--landscape {
          grid-template-rows: minmax(360px, 46vh) minmax(0, 1fr);
          gap: 18px;
        }

        .remixVisualPanel {
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .remixVisualPanel--standard {
          padding-right: 24px;
        }

        .remixLandscapeMediaFrame {
          width: min(100%, 980px);
          height: 100%;
          margin: 0 auto;
          background: #c9bcab;
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 18px rgba(0,0,0,0.12);
        }

        .remixStandardMediaFrame {
          width: 100%;
          height: 100%;
          background: #c9bcab;
          overflow: hidden;
          position: relative;
        }

        .remixLinen {
          background:
            radial-gradient(circle at 20% 18%, rgba(255,255,255,0.16), transparent 26%),
            repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.06),
              rgba(255, 255, 255, 0.06) 1px,
              rgba(0, 0, 0, 0.015) 1px,
              rgba(0, 0, 0, 0.015) 2px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.055),
              rgba(255, 255, 255, 0.055) 1px,
              rgba(0, 0, 0, 0.018) 1px,
              rgba(0, 0, 0, 0.018) 2px
            ),
            linear-gradient(180deg, #d8c9b6 0%, #d4c2ae 100%);
        }

.remixPhotoCorner--tl,
.remixPhotoCorner--br {
  position: absolute;
  z-index: 4;
  width: 160px;
  height: 92px;
  pointer-events: none;
}

.remixPhotoCorner--tl {
  top: 0;
  left: 0;
}

.remixPhotoCorner--tl::before,
.remixPhotoCorner--tl::after,
.remixPhotoCorner--br::before,
.remixPhotoCorner--br::after {
  content: "";
  position: absolute;
  display: block;
}

.remixPhotoCorner--tl::before {
  top: 0;
  left: 0;
  width: 112px;
  height: 18px;
  background: #007d73;
  transform: skewX(-38deg);
  transform-origin: left top;
}

.remixPhotoCorner--tl::after {
  top: 0;
  left: 0;
  width: 132px;
  height: 32px;
  background: #e4772f;
  clip-path: polygon(0 0, 100% 0, 84% 100%, 0 100%);
}

.remixPhotoCorner--br {
  right: 0;
  bottom: 0;
}

.remixPhotoCorner--br::before {
  right: 0;
  bottom: 0;
  width: 112px;
  height: 18px;
  background: #7fd0d8;
  transform: skewX(-38deg);
  transform-origin: right bottom;
}

.remixPhotoCorner--br::after {
  right: 0;
  bottom: 0;
  width: 132px;
  height: 32px;
  background: #e4772f;
  clip-path: polygon(16% 0, 100% 0, 100% 100%, 0 100%);
}

.remixStandardMediaFrame,
.remixLandscapeMediaFrame {
  position: relative;
  isolation: isolate;
}
        .remixPhotoInner {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 36px;
        }

        .remixZoomMedia {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          transform-origin: center center;
          animation: remixPhotoFloat 30s ease-in-out infinite;
          will-change: transform;
        }

        .remixPlaceholderArt {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          padding: 48px;
          box-sizing: border-box;
        }

        .remixPlaceholderArtInner {
          width: min(72%, 520px);
          aspect-ratio: 1 / 1;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
        }

        .remixPlaceholderArtInner img {
          max-width: 72%;
          max-height: 72%;
          object-fit: contain;
          display: block;
          filter: saturate(0.9) contrast(1.04);
        }

        .remixMessagePanel {
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        .remixMessagePanel--standard {
          padding: 18px 20px 42px 34px;
        }

        .remixMessagePanel--landscape {
          padding: 0 56px 38px;
        }

        .remixMessageText {
          font-family: var(--font-dm-serif-display), serif;
          font-weight: 400;
          font-style: normal;
          color: var(--remix-cream);
          text-shadow: 6px 6px 0 var(--remix-shadow);
          letter-spacing: -0.02em;
          overflow-wrap: anywhere;
        }

        .remixMessageText--standard {
          font-size: clamp(54px, 4.9vw, 108px);
          line-height: 1.08;
        }

        .remixMessageText--landscape {
          font-size: clamp(44px, 4.1vw, 92px);
          line-height: 1.09;
          text-align: center;
        }

        .remixFrom {
          font-family: var(--font-dm-serif-display), serif;
          color: var(--remix-cream);
          text-shadow: 6px 6px 0 var(--remix-shadow);
          margin-top: 28px;
          overflow-wrap: anywhere;
        }

        .remixFrom--standard {
          font-size: clamp(40px, 3vw, 72px);
          text-align: right;
        }

        .remixFrom--landscape {
          font-size: clamp(36px, 2.8vw, 64px);
          text-align: center;
        }

        .remixFooter {
          height: 84px;
          position: relative;
        }

        .remixFooterBars {
          position: absolute;
          left: -28px;
          right: -28px;
          bottom: 0;
          height: 84px;
          background:
            linear-gradient(
              180deg,
              transparent 0 6px,
              var(--remix-orange) 6px 26px,
              var(--remix-aqua) 26px 46px,
              var(--remix-gold) 46px 66px,
              var(--remix-deep-teal) 66px 84px
            );
        }

        .remixFooterInner {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 22px;
          padding: 0 24px 18px;
        }

        .remixFooterTrack {
          width: min(100%, 680px);
          height: 30px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.88);
          overflow: hidden;
          box-shadow:
            inset 0 1px 1px rgba(0,0,0,0.08),
            0 2px 0 rgba(0,0,0,0.08);
        }

        .remixFooterFill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #f7f5ee 0%, #ffffff 100%);
          transition: width 250ms linear;
        }

        .remixFooterTime {
          font-family: var(--font-barlow-condensed), sans-serif;
          font-size: clamp(28px, 2vw, 52px);
          line-height: 1;
          color: #f7f4eb;
          text-shadow: 4px 4px 0 rgba(0, 0, 0, 0.22);
          white-space: nowrap;
        }

        .remixTeaser {
          min-height: 100vh;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 14px;
          padding: 24px 28px 0;
          box-sizing: border-box;
        }

        .remixTeaserCenter {
          min-height: 0;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 18px 40px 0;
        }

        .remixTeaserInner {
          max-width: 1500px;
          width: 100%;
        }

        .remixTeaserLead {
          font-family: var(--font-barlow-condensed), sans-serif;
          font-size: clamp(50px, 4.7vw, 108px);
          line-height: 0.95;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--remix-cream);
          text-shadow: 7px 7px 0 rgba(0,0,0,0.28);
        }

        .remixTeaserNow {
          font-family: var(--font-barlow-condensed), sans-serif;
          font-size: clamp(220px, 23vw, 520px);
          line-height: 0.82;
          letter-spacing: -0.05em;
          text-transform: uppercase;
          color: var(--remix-cream);
          text-shadow: 14px 14px 0 rgba(0,0,0,0.32);
          margin: 14px 0 0;
        }

        .remixTeaserScript {
          font-family: var(--font-satisfy), cursive;
          font-size: clamp(54px, 4.5vw, 110px);
          line-height: 1.04;
          color: #76d4db;
          text-shadow: 6px 6px 0 rgba(0,0,0,0.24);
          margin-top: 8px;
        }

        @media (max-width: 1600px) {
          .remixSlideTop {
            grid-template-columns: minmax(320px, 1fr) 420px;
          }

          .remixMessageMain--standard {
            grid-template-columns: minmax(380px, 43%) minmax(0, 1fr);
          }

          .remixMessageText--standard {
            font-size: clamp(42px, 4vw, 86px);
          }

          .remixFrom--standard {
            font-size: clamp(34px, 2.4vw, 58px);
          }

          .remixMessageText--landscape {
            font-size: clamp(36px, 3.5vw, 72px);
          }

          .remixFrom--landscape {
            font-size: clamp(30px, 2.1vw, 52px);
          }

          .remixFooterTrack {
            width: min(100%, 560px);
          }
        }

        @media (max-width: 1100px) {
          .remixSlideShell,
          .remixTeaser {
            padding: 16px 16px 0;
            gap: 12px;
          }

          .remixSlideTop {
            grid-template-columns: 1fr;
          }

          .remixBanner {
            min-width: 0;
            width: min(100%, 620px);
            margin: 0 auto;
          }

          .remixTimerWrap {
            padding-top: 0;
          }

          .remixMessageMain--standard,
          .remixMessageMain--landscape {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(260px, 42vh) auto;
            gap: 16px;
          }

          .remixMessagePanel--standard,
          .remixMessagePanel--landscape {
            padding: 0 10px 16px;
          }

          .remixMessageText--standard,
          .remixMessageText--landscape {
            text-align: center;
            font-size: clamp(34px, 6vw, 60px);
          }

          .remixFrom--standard,
          .remixFrom--landscape {
            text-align: center;
            font-size: clamp(28px, 4.5vw, 42px);
          }

          .remixVisualPanel--standard {
            padding-right: 0;
          }

          .remixStandardMediaFrame,
          .remixLandscapeMediaFrame {
            width: 100%;
          }

          .remixFooterBars {
            left: -16px;
            right: -16px;
          }

          .remixFooterInner {
            padding: 0 10px 18px;
          }

          .remixFooterTrack {
            width: min(100%, 420px);
            height: 24px;
          }

          .remixTeaserLead {
            font-size: clamp(36px, 7vw, 60px);
          }

          .remixTeaserNow {
            font-size: clamp(130px, 24vw, 220px);
          }

          .remixTeaserScript {
            font-size: clamp(34px, 6vw, 56px);
          }
        }
      `}</style>
    </div>
  );
}

function MessageSlide({
  slide,
  timerLabel,
  progressPct,
}: {
  slide: Extract<DisplaySlide, { kind: "message" }>;
  timerLabel: string;
  progressPct: number;
}) {
  if (!slide.imageUrl) {
    return (
      <StandardMessageLayout
        title={slide.title}
        body={slide.body}
        fromName={slide.fromName}
        imageUrl={null}
        timerLabel={timerLabel}
        progressPct={progressPct}
      />
    );
  }

  return (
    <ImageOrientationSwitch src={slide.imageUrl}>
      {(orientation) =>
        orientation === "landscape" ? (
          <LandscapeMessageLayout
            title={slide.title}
            body={slide.body}
            fromName={slide.fromName}
            imageUrl={slide.imageUrl}
            timerLabel={timerLabel}
            progressPct={progressPct}
          />
        ) : (
          <StandardMessageLayout
            title={slide.title}
            body={slide.body}
            fromName={slide.fromName}
            imageUrl={slide.imageUrl}
            timerLabel={timerLabel}
            progressPct={progressPct}
          />
        )
      }
    </ImageOrientationSwitch>
  );
}

function StandardMessageLayout({
  title,
  body,
  fromName,
  imageUrl,
  timerLabel,
  progressPct,
}: {
  title: string;
  body: string;
  fromName: string;
  imageUrl?: string | null;
  timerLabel: string;
  progressPct: number;
}) {
  return (
    <div className="remixSlideShell">
      <SlideTop title={title} timerLabel={timerLabel} progressPct={progressPct} />

      <main className="remixMessageMain remixMessageMain--standard">
        <div className="remixVisualPanel remixVisualPanel--standard">
          <VisualFrame imageUrl={imageUrl} mode="standard" />
        </div>

        <div className="remixMessagePanel remixMessagePanel--standard">
          <div className="remixMessageText remixMessageText--standard">{body}</div>
          <div className="remixFrom remixFrom--standard">{fromName}</div>
        </div>
      </main>

      <SlideFooter timerLabel={timerLabel} progressPct={progressPct} />
    </div>
  );
}

function LandscapeMessageLayout({
  title,
  body,
  fromName,
  imageUrl,
  timerLabel,
  progressPct,
}: {
  title: string;
  body: string;
  fromName: string;
  imageUrl: string;
  timerLabel: string;
  progressPct: number;
}) {
  return (
    <div className="remixSlideShell">
      <SlideTop title={title} timerLabel={timerLabel} progressPct={progressPct} />

      <main className="remixMessageMain remixMessageMain--landscape">
        <div className="remixVisualPanel">
          <VisualFrame imageUrl={imageUrl} mode="landscape" />
        </div>

        <div className="remixMessagePanel remixMessagePanel--landscape">
          <div className="remixMessageText remixMessageText--landscape">{body}</div>
          <div className="remixFrom remixFrom--landscape">{fromName}</div>
        </div>
      </main>

      <SlideFooter timerLabel={timerLabel} progressPct={progressPct} />
    </div>
  );
}

function SlideTop({
  title,
  timerLabel,
  progressPct,
}: {
  title: string;
  timerLabel: string;
  progressPct: number;
}) {
  return (
    <div className="remixSlideTop">
      <div className="remixBannerWrap">
        <div className="remixBanner">
          <div className="remixBannerText">{title || "REMIX SHOUTOUT!"}</div>
        </div>
      </div>

      <div className="remixTimerWrap">
        <div className="remixTimerTrack" aria-hidden="true">
          <div className="remixTimerFill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="remixTimerText">{timerLabel}</div>
      </div>
    </div>
  );
}

function SlideFooter({
  timerLabel,
  progressPct,
}: {
  timerLabel: string;
  progressPct: number;
}) {
  return (
    <footer className="remixFooter">
      <div className="remixFooterBars" />
      <div className="remixFooterInner">
        <div className="remixFooterTrack" aria-hidden="true">
          <div className="remixFooterFill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="remixFooterTime">{timerLabel}</div>
      </div>
    </footer>
  );
}

function TeaserSlide({
  timerLabel,
  progressPct,
}: {
  timerLabel: string;
  progressPct: number;
}) {
  return (
    <div className="remixTeaser">
      <SlideTop
        title="REMIX SHOUTOUT!"
        timerLabel={timerLabel}
        progressPct={progressPct}
      />

      <main className="remixTeaserCenter">
        <div className="remixTeaserInner">
          <div className="remixTeaserLead">YOUR MESSAGE HERE...</div>
          <div className="remixTeaserNow">NOW!</div>
          <div className="remixTeaserScript">Scan the Code at your Table!</div>
        </div>
      </main>

      <SlideFooter timerLabel={timerLabel} progressPct={progressPct} />
    </div>
  );
}

function VisualFrame({
  imageUrl,
  mode,
}: {
  imageUrl?: string | null;
  mode: "standard" | "landscape";
}) {
  const frameClass =
    mode === "landscape"
      ? "remixLandscapeMediaFrame remixLinen"
      : "remixStandardMediaFrame remixLinen";

  return (
    <div className={frameClass}>
      <div className="remixPhotoCorner--tl" />
      <div className="remixPhotoCorner--br" />
      <div className="remixPhotoInner">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="remixZoomMedia"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="remixPlaceholderArt">
            <div className="remixPlaceholderArtInner">
              <img src={REMIX_LOGO_URL} alt="Remix placeholder art" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageOrientationSwitch({
  src,
  children,
}: {
  src: string;
  children: (orientation: "portrait" | "landscape" | "square") => ReactNode;
}) {
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | "square">(
    "portrait"
  );

  useEffect(() => {
    let cancelled = false;

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;

      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      if (!w || !h) {
        setOrientation("square");
        return;
      }

      const ratio = w / h;
      if (ratio > 1.15) setOrientation("landscape");
      else if (ratio < 0.85) setOrientation("portrait");
      else setOrientation("square");
    };

    img.onerror = () => {
      if (!cancelled) setOrientation("portrait");
    };

    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return <>{children(orientation)}</>;
}