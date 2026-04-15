"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
      displayDurationSec?: number;
      approvedAt?: string;
      createdAt?: string;
    };

type Orientation = "portrait" | "landscape" | "square";

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
        title: String(p?.title ?? p?.header ?? fallback.title ?? "REMIX SHOUTOUT!"),
        body: String(p?.body ?? p?.messageText ?? fallback.body ?? ""),
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
        accent: (p?.accent ?? fallback.accent ?? "cyan") as "gold" | "cyan" | "pink",
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
      const next = data?.rules?.shoutoutSlideSeconds ?? data?.shoutoutSlideSeconds;
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
  const body = String(source.body ?? source.messageText ?? "").trim();

  return {
    id: String(source.id || `slide-${Math.random().toString(36).slice(2)}`),
    kind: "message",
    title: String(source.title || "REMIX SHOUTOUT!"),
    body: body || "Your message here...",
    fromName: String(source.fromName || "- Remix Guest"),
    imageUrl: source.imageUrl ?? null,
    accent: (source.accent || "cyan") as "gold" | "cyan" | "pink",
    durationSec: safeSeconds(source.displayDurationSec, fallbackDurationSec),
    displayDurationSec: safeSeconds(source.displayDurationSec, fallbackDurationSec),
    approvedAt: "approvedAt" in source ? source.approvedAt : undefined,
    createdAt: "createdAt" in source ? source.createdAt : undefined,
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
  const [shoutoutSlideSeconds, setShoutoutSlideSeconds] =
    useState(DEFAULT_SLIDE_SECONDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideStartedAt, setSlideStartedAt] = useState(Date.now());
  const [nowMs, setNowMs] = useState(Date.now());

  const activeSlides = useMemo(() => {
    if (liveSlides.length) return liveSlides;
    return [makeTeaserSlide(shoutoutSlideSeconds), ...placeholderSlides];
  }, [liveSlides, placeholderSlides, shoutoutSlideSeconds]);

  const activeSlide = activeSlides[currentIndex] || null;

  const activeSignature = useMemo(
    () => activeSlides.map((slide) => slide.id).join("|"),
    [activeSlides]
  );

  async function tickShoutouts(nextFallbackSeconds?: number) {
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
          normalizeMessageSlide(
            item,
            nextFallbackSeconds ?? shoutoutSlideSeconds,
            false
          )
        );

      setLiveSlides(normalized);
    } catch {
      setLiveSlides([]);
    }
  }

  useEffect(() => {
    const initialSeconds = DEFAULT_SLIDE_SECONDS;
    const nextPlaceholders = loadSavedPlaceholders(location).map((item) =>
      normalizeMessageSlide(item, initialSeconds, true)
    );

    setPlaceholderSlides(nextPlaceholders);
    setCurrentIndex(0);
    setSlideStartedAt(Date.now());

    void tickShoutouts(initialSeconds);

    void loadShoutoutSlideSeconds(location).then((seconds) => {
      setShoutoutSlideSeconds(seconds);

      const withFreshSeconds = loadSavedPlaceholders(location).map((item) =>
        normalizeMessageSlide(item, seconds, true)
      );
      setPlaceholderSlides(withFreshSeconds);
      void tickShoutouts(seconds);
    });

    const feedInterval = window.setInterval(() => {
      void tickShoutouts();
    }, 5000);

    const configInterval = window.setInterval(() => {
      void loadShoutoutSlideSeconds(location).then((seconds) => {
        setShoutoutSlideSeconds(seconds);

        const refreshedPlaceholders = loadSavedPlaceholders(location).map((item) =>
          normalizeMessageSlide(item, seconds, true)
        );

        setPlaceholderSlides(refreshedPlaceholders);
        void tickShoutouts(seconds);
      });
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
  }, [location]);

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
      const safePrev = Math.min(prev, activeSlides.length - 1);
      return safePrev >= 0 ? safePrev : 0;
    });
  }, [activeSignature]);

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

  const liveDisplayStartMs =
    activeSlide && activeSlide.kind === "message" && !activeSlide.isFallback
      ? new Date(
          activeSlide.approvedAt || activeSlide.createdAt || Date.now()
        ).getTime()
      : 0;

  const liveDisplayDurationSec =
    activeSlide && activeSlide.kind === "message"
      ? safeSeconds(activeSlide.displayDurationSec, getSlideDuration(activeSlide))
      : 0;

  const usingLifetimeTimer =
    !!activeSlide &&
    activeSlide.kind === "message" &&
    !activeSlide.isFallback &&
    liveDisplayDurationSec > 0;

  const remainingSec = activeSlide
    ? usingLifetimeTimer
      ? Math.max(
          0,
          Math.ceil(
            (liveDisplayDurationSec * 1000 -
              Math.max(0, nowMs - liveDisplayStartMs)) /
              1000
          )
        )
      : Math.max(
          0,
          Math.ceil(
            (getSlideDuration(activeSlide) * 1000 - (nowMs - slideStartedAt)) /
              1000
          )
        )
    : 0;

  const progressPct = activeSlide
    ? usingLifetimeTimer
      ? Math.max(
          0,
          Math.min(
            100,
            100 -
              (Math.max(0, nowMs - liveDisplayStartMs) /
                (liveDisplayDurationSec * 1000)) *
                100
          )
        )
      : Math.max(
          0,
          Math.min(
            100,
            100 -
              ((nowMs - slideStartedAt) / (getSlideDuration(activeSlide) * 1000)) *
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
        <div
          key={`${activeSlide.id}-${slideStartedAt}`}
          className="remixShoutTvFade"
        >
          {activeSlide.kind === "teaser" ? (
            <TeaserSlide />
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
          --remix-cream: #f4eddf;
          --remix-shadow: rgba(0, 0, 0, 0.34);
          --remix-orange: #e4772f;
          --remix-aqua: #7fd0d8;
          --remix-gold: #c0ba3d;
          --remix-deep-teal: #007d73;
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
            radial-gradient(circle at 18% 28%, rgba(0, 210, 255, 0.09), transparent 28%),
            radial-gradient(circle at 82% 22%, rgba(255, 66, 180, 0.08), transparent 26%),
            radial-gradient(circle at 56% 82%, rgba(0, 255, 170, 0.06), transparent 30%),
            linear-gradient(135deg, #2d3138 0%, #23272e 42%, #1d2127 100%);
          color: var(--remix-cream);
        }

        .remixShoutTvRoot::before {
          content: "";
          position: absolute;
          inset: -12%;
          pointer-events: none;
          background:
            radial-gradient(circle at 20% 35%, rgba(0, 220, 255, 0.1), transparent 22%),
            radial-gradient(circle at 78% 26%, rgba(255, 78, 173, 0.09), transparent 20%),
            radial-gradient(circle at 62% 72%, rgba(0, 255, 170, 0.07), transparent 24%);
          filter: blur(44px);
          opacity: 0.85;
          animation: remixClubGlow 20s ease-in-out infinite alternate;
          z-index: 0;
        }

        .remixShoutTvRoot::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            115deg,
            rgba(255, 255, 255, 0.025),
            transparent 32%,
            rgba(255, 255, 255, 0.012) 52%,
            transparent 72%
          );
          mix-blend-mode: screen;
          opacity: 0.45;
          animation: remixLightSweep 26s ease-in-out infinite;
          z-index: 0;
        }

        @keyframes remixClubGlow {
          0% {
            transform: translate3d(-1.5%, -1%, 0) scale(1);
          }
          50% {
            transform: translate3d(1.5%, 1%, 0) scale(1.05);
          }
          100% {
            transform: translate3d(0%, -1%, 0) scale(1.02);
          }
        }

        @keyframes remixLightSweep {
          0% {
            transform: translateX(-6%);
            opacity: 0.22;
          }
          50% {
            transform: translateX(4%);
            opacity: 0.42;
          }
          100% {
            transform: translateX(-2%);
            opacity: 0.26;
          }
        }

        .remixShoutTvFade {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          width: 100%;
          animation: remixSlideFade 1100ms cubic-bezier(0.22, 0.8, 0.22, 1)
            both;
        }

        @keyframes remixSlideFade {
          0% {
            opacity: 0;
            transform: scale(1.003);
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
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
          padding: 0 28px 0;
          box-sizing: border-box;
          gap: 8px;
        }

        .remixPortraitShell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(430px, 45%) minmax(0, 1fr);
          padding: 0 0 0 0;
          box-sizing: border-box;
          gap: 0;
        }

        .remixPortraitMediaCol {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
        }

        .remixPortraitContentCol {
          min-width: 0;
          min-height: 100vh;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          padding: 0 28px 0 32px;
          gap: 8px;
          box-sizing: border-box;
        }

        .remixLandscapeShell {
          min-height: 100vh;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          padding: 0 28px 0;
          box-sizing: border-box;
          gap: 10px;
        }

        .remixLandscapeContent {
          min-height: 0;
          display: grid;
          grid-template-rows: minmax(280px, 42vh) minmax(0, 1fr);
          gap: 16px;
        }

        .remixTextOnlyContent {
          min-height: 0;
          display: grid;
          grid-template-rows: minmax(280px, 0.92fr) minmax(0, 1fr);
          gap: 18px;
        }

        .remixTextOnlyVisualWrap {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remixTextOnlyTextWrap {
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 18px 18px;
        }

        .remixSlideTop {
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .remixSlideTop--portrait {
          justify-content: flex-end;
          padding-right: 72px;
        }

        .remixBannerWrap {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .remixBannerWrap--portrait {
          justify-content: flex-end;
        }

        .remixBanner {
          position: relative;
          width: min(100vw - 56px, 1280px);
          min-width: 0;
          margin-top: 0;
          padding: 10px 42px 18px;
          background: linear-gradient(180deg, #18b1a4 0%, #11988d 100%);
          border-bottom: 8px solid rgba(0, 0, 0, 0.34);
          clip-path: polygon(0 0, 100% 0, 100% 86%, 50% 100%, 0 86%);
          box-shadow: 0 14px 24px rgba(0, 0, 0, 0.18);
          text-align: center;
          overflow: hidden;
        }

        .remixBanner--portrait {
          width: min(100%, 560px);
          padding: 10px 28px 16px;
        }

        .remixBanner--arched {
          transform: perspective(1200px) rotateX(2deg);
          transform-origin: center top;
        }

        .remixBannerDots {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.34) 1.5px,
            transparent 1.5px
          );
          background-size: 20px 20px;
          opacity: 0.55;
          transform: none;
          pointer-events: none;
        }

        .remixBannerText {
          position: relative;
          z-index: 2;
          font-family: var(--font-barlow-condensed), sans-serif;
          font-size: clamp(46px, 4vw, 86px);
          line-height: 0.94;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #f8f4ea;
          text-shadow: 6px 6px 0 rgba(0, 0, 0, 0.22), 0 2px 0 rgba(0, 0, 0, 0.16);
        }

        .remixBanner--portrait .remixBannerText {
          font-size: clamp(38px, 3.1vw, 64px);
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

        .remixPortraitMessageWrap {
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 12px 14px 8px;
        }

        .remixPortraitMessageText {
          font-size: clamp(46px, 4.8vw, 100px);
          line-height: 1.05;
        }

        .remixPortraitFrom {
          margin-top: 28px;
          text-align: right;
          font-size: clamp(34px, 2.8vw, 64px);
        }

        .remixLandscapeMessageWrap {
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 0 36px 8px;
          text-align: center;
        }

        .remixLandscapeMessageText {
          font-size: clamp(40px, 4vw, 84px);
          line-height: 1.07;
          text-align: center;
        }

        .remixLandscapeFrom {
          margin-top: 22px;
          text-align: center;
          font-size: clamp(30px, 2.4vw, 56px);
        }

        .remixTextOnlyMessageText {
          font-size: clamp(50px, 4.7vw, 104px);
          line-height: 1.05;
          text-align: center;
        }

        .remixTextOnlyFrom {
          margin-top: 28px;
          text-align: center;
          font-size: clamp(34px, 2.6vw, 58px);
        }

        .remixFrom {
          font-family: var(--font-dm-serif-display), serif;
          color: var(--remix-cream);
          text-shadow: 6px 6px 0 var(--remix-shadow);
          overflow-wrap: anywhere;
        }

        .remixVisualPanel {
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .remixLandscapeVisualPanel {
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remixPortraitMediaFrame {
          width: 100%;
          height: 100%;
          min-height: 100vh;
          background: #c9bcab;
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
        }

        .remixLandscapeMediaFrame {
          width: min(100%, 980px);
          height: 100%;
          background: #c9bcab;
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
        }

        .remixTextOnlyMediaFrame {
          width: min(100%, 820px);
          height: 100%;
          min-height: 280px;
          background: #c9bcab;
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
        }

        .remixLinen {
          background:
            radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.16), transparent 26%),
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

        .remixPortraitMediaFrame,
        .remixLandscapeMediaFrame,
        .remixTextOnlyMediaFrame {
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

        .remixPhotoInner--portrait {
          padding: 0;
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

        .remixZoomMedia--portrait {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
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

        .remixFooter {
          height: 84px;
          position: relative;
        }

        .remixFooter--teaser {
          height: 84px;
        }

        .remixTeaserTop {
          display: flex;
          justify-content: center;
          padding-top: 0;
        }

        .remixFooterBars {
          position: absolute;
          left: -28px;
          right: -28px;
          bottom: 0;
          height: 84px;
          background: linear-gradient(
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
            inset 0 1px 1px rgba(0, 0, 0, 0.08),
            0 2px 0 rgba(0, 0, 0, 0.08);
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
          gap: 10px;
          padding: 0 28px 0;
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
          text-shadow: 7px 7px 0 rgba(0, 0, 0, 0.28);
        }

        .remixTeaserNow {
          font-family: var(--font-barlow-condensed), sans-serif;
          font-size: clamp(220px, 23vw, 520px);
          line-height: 0.82;
          letter-spacing: -0.05em;
          text-transform: uppercase;
          color: var(--remix-cream);
          text-shadow: 14px 14px 0 rgba(0, 0, 0, 0.32);
          margin: 14px 0 0;
        }

        .remixTeaserScript {
          font-family: var(--font-satisfy), cursive;
          font-size: clamp(54px, 4.5vw, 110px);
          line-height: 1.04;
          color: #76d4db;
          text-shadow: 6px 6px 0 rgba(0, 0, 0, 0.24);
          margin-top: 8px;
        }

        @media (max-width: 1600px) {
          .remixPortraitShell {
            grid-template-columns: minmax(360px, 43%) minmax(0, 1fr);
          }

          .remixPortraitContentCol {
            padding: 0 24px 0 24px;
          }

          .remixLandscapeContent {
            grid-template-rows: minmax(240px, 38vh) minmax(0, 1fr);
          }

          .remixPortraitMessageText {
            font-size: clamp(38px, 4.1vw, 82px);
          }

          .remixPortraitFrom {
            font-size: clamp(28px, 2.2vw, 52px);
          }

          .remixLandscapeMessageText {
            font-size: clamp(34px, 3.3vw, 68px);
          }

          .remixLandscapeFrom {
            font-size: clamp(26px, 2vw, 48px);
          }

          .remixTextOnlyMessageText {
            font-size: clamp(42px, 4vw, 86px);
          }

          .remixTextOnlyFrom {
            font-size: clamp(28px, 2.2vw, 50px);
          }

          .remixFooterTrack {
            width: min(100%, 560px);
          }
        }

        @media (max-width: 1100px) {
          .remixLandscapeShell,
          .remixSlideShell,
          .remixTeaser {
            padding: 0 16px 0;
            gap: 12px;
          }

          .remixPortraitShell {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(300px, 46vh) minmax(0, 1fr);
          }

          .remixPortraitMediaCol {
            min-height: 300px;
          }

          .remixPortraitContentCol {
            min-height: 0;
            padding: 0 16px 0;
          }

          .remixSlideTop--portrait {
            justify-content: center;
            padding-right: 0;
          }

          .remixBannerWrap--portrait {
            justify-content: center;
          }

          .remixBanner {
            min-width: 0;
            width: min(100%, 760px);
            margin: 0 auto;
          }

          .remixBanner--portrait {
            width: min(100%, 560px);
          }

          .remixLandscapeContent,
          .remixTextOnlyContent {
            grid-template-rows: minmax(220px, 38vh) auto;
          }

          .remixPortraitMessageWrap,
          .remixLandscapeMessageWrap,
          .remixTextOnlyTextWrap {
            padding: 0 8px 12px;
          }

          .remixPortraitMessageText,
          .remixLandscapeMessageText,
          .remixTextOnlyMessageText {
            text-align: center;
            font-size: clamp(34px, 6vw, 60px);
          }

          .remixPortraitFrom,
          .remixLandscapeFrom,
          .remixTextOnlyFrom {
            text-align: center;
            font-size: clamp(24px, 4.5vw, 40px);
          }

          .remixLandscapeMediaFrame,
          .remixTextOnlyMediaFrame {
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
      <TextOnlyMessageLayout
        title={slide.title}
        body={slide.body}
        fromName={slide.fromName}
        timerLabel={timerLabel}
        progressPct={progressPct}
      />
    );
  }

  const imageUrl = slide.imageUrl;

  return (
    <ImageOrientationSwitch src={imageUrl}>
      {(orientation) =>
        orientation === "landscape" ? (
          <LandscapeMessageLayout
            title={slide.title}
            body={slide.body}
            fromName={slide.fromName}
            imageUrl={imageUrl}
            timerLabel={timerLabel}
            progressPct={progressPct}
          />
        ) : (
          <PortraitMessageLayout
            title={slide.title}
            body={slide.body}
            fromName={slide.fromName}
            imageUrl={imageUrl}
            timerLabel={timerLabel}
            progressPct={progressPct}
          />
        )
      }
    </ImageOrientationSwitch>
  );
}

function PortraitMessageLayout({
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
    <div className="remixPortraitShell">
      <div className="remixPortraitMediaCol">
        <PortraitVisualFrame imageUrl={imageUrl} />
      </div>

      <div className="remixPortraitContentCol">
        <SlideTop title={title} variant="portrait" />
        <div className="remixPortraitMessageWrap">
          <div className="remixMessageText remixPortraitMessageText">{body}</div>
          <div className="remixFrom remixPortraitFrom">{fromName}</div>
        </div>
        <SlideFooter timerLabel={timerLabel} progressPct={progressPct} />
      </div>
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
    <div className="remixLandscapeShell">
      <SlideTop title={title} />
      <div className="remixLandscapeContent">
        <div className="remixLandscapeVisualPanel">
          <LandscapeVisualFrame imageUrl={imageUrl} />
        </div>

        <div className="remixLandscapeMessageWrap">
          <div className="remixMessageText remixLandscapeMessageText">{body}</div>
          <div className="remixFrom remixLandscapeFrom">{fromName}</div>
        </div>
      </div>
      <SlideFooter timerLabel={timerLabel} progressPct={progressPct} />
    </div>
  );
}

function TextOnlyMessageLayout({
  title,
  body,
  fromName,
  timerLabel,
  progressPct,
}: {
  title: string;
  body: string;
  fromName: string;
  timerLabel: string;
  progressPct: number;
}) {
  return (
    <div className="remixSlideShell">
      <SlideTop title={title} />
      <div className="remixTextOnlyContent">
        <div className="remixTextOnlyVisualWrap">
          <TextOnlyVisualFrame />
        </div>

        <div className="remixTextOnlyTextWrap">
          <div className="remixMessageText remixTextOnlyMessageText">{body}</div>
          <div className="remixFrom remixTextOnlyFrom">{fromName}</div>
        </div>
      </div>
      <SlideFooter timerLabel={timerLabel} progressPct={progressPct} />
    </div>
  );
}

function SlideTop({
  title,
  variant = "default",
}: {
  title: string;
  variant?: "default" | "portrait";
}) {
  const topClass =
    variant === "portrait"
      ? "remixSlideTop remixSlideTop--portrait"
      : "remixSlideTop";
  const wrapClass =
    variant === "portrait"
      ? "remixBannerWrap remixBannerWrap--portrait"
      : "remixBannerWrap";
  const bannerClass =
    variant === "portrait"
      ? "remixBanner remixBanner--portrait remixBanner--arched"
      : "remixBanner remixBanner--arched";

  return (
    <div className={topClass}>
      <div className={wrapClass}>
        <div className={bannerClass}>
          <div className="remixBannerDots" />
          <div className="remixBannerText">{title || "REMIX SHOUTOUT!"}</div>
        </div>
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

function TeaserSlide() {
  return (
    <div className="remixTeaser">
      <div className="remixTeaserTop">
        <div className="remixBannerWrap">
          <div className="remixBanner remixBanner--arched">
            <div className="remixBannerDots" />
            <div className="remixBannerText">REMIX SHOUTOUT!</div>
          </div>
        </div>
      </div>

      <main className="remixTeaserCenter">
        <div className="remixTeaserInner">
          <div className="remixTeaserLead">YOUR MESSAGE HERE...</div>
          <div className="remixTeaserNow">NOW!</div>
          <div className="remixTeaserScript">Scan the Code at your Table!</div>
        </div>
      </main>

      <footer className="remixFooter remixFooter--teaser">
        <div className="remixFooterBars" />
      </footer>
    </div>
  );
}

function PortraitVisualFrame({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="remixPortraitMediaFrame remixLinen">
      <div className="remixPhotoCorner--tl" />
      <div className="remixPhotoCorner--br" />
      <div className="remixPhotoInner remixPhotoInner--portrait">
        <img
          src={imageUrl}
          alt=""
          className="remixZoomMedia remixZoomMedia--portrait"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

function LandscapeVisualFrame({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="remixLandscapeMediaFrame remixLinen">
      <div className="remixPhotoCorner--tl" />
      <div className="remixPhotoCorner--br" />
      <div className="remixPhotoInner">
        <img
          src={imageUrl}
          alt=""
          className="remixZoomMedia"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

function TextOnlyVisualFrame() {
  return (
    <div className="remixTextOnlyMediaFrame remixLinen">
      <div className="remixPhotoCorner--tl" />
      <div className="remixPhotoCorner--br" />
      <div className="remixPhotoInner">
        <div className="remixPlaceholderArt">
          <div className="remixPlaceholderArtInner">
            <img src={REMIX_LOGO_URL} alt="Remix placeholder art" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageOrientationSwitch({
  src,
  children,
}: {
  src: string;
  children: (orientation: Orientation) => ReactNode;
}) {
  const [orientation, setOrientation] = useState<Orientation>("portrait");

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

      if (ratio > 1.15) {
        setOrientation("landscape");
      } else if (ratio < 0.85) {
        setOrientation("portrait");
      } else {
        setOrientation("square");
      }
    };

    img.onerror = () => {
      if (!cancelled) {
        setOrientation("portrait");
      }
    };

    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return <>{children(orientation)}</>;
}