// src/app/tv-queue/[location]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type QueueItem = {
  id: string;
  requestId?: string;
  songId?: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  score?: number;
  upvotes?: number;
  downvotes?: number;
  priority?: string;
  isBoosted?: boolean;
  boosted?: boolean;
  wasBoosted?: boolean;
};

type RulesResponse = {
  ok?: boolean;
  rules?: {
    defaultAlbumArtUrl?: string | null;
  } | null;
  defaultAlbumArtUrl?: string | null;
};

const ROTATE_MS = 12000;
const QUEUE_POLL_MS = 5000;
const FEATURED_POLL_MS = 20000;
const RULES_POLL_MS = 30000;

function stableKey(items: QueueItem[]) {
  return items
    .map((item) =>
      [
        item.id,
        item.title,
        item.artist,
        item.artworkUrl || "",
        item.score || 0,
        item.upvotes || 0,
        item.downvotes || 0,
        item.isBoosted ? 1 : 0,
        item.boosted ? 1 : 0,
        item.wasBoosted ? 1 : 0,
      ].join("|")
    )
    .join("~~");
}

function decorativeSeed(item: QueueItem) {
  const seed = `${item.id}-${item.title}-${item.artist}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return {
    up: (hash % 7) + 2,
    down: hash % 3,
    fire: (hash % 5) + 1,
  };
}

export default function TvQueuePortraitPremiumPage({
  params,
}: {
  params: { location: string };
}) {
  const location = params.location;

  const [requestItems, setRequestItems] = useState<QueueItem[]>([]);
  const [featuredItems, setFeaturedItems] = useState<QueueItem[]>([]);
  const [defaultAlbumArtUrl, setDefaultAlbumArtUrl] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipCycle, setFlipCycle] = useState(0);

  const requestKeyRef = useRef("");
  const featuredKeyRef = useRef("");
  const rulesKeyRef = useRef<string | null>(null);

  const isRequestsMode = requestItems.length > 0;

  const activePool = useMemo(
    () => (isRequestsMode ? requestItems : featuredItems),
    [isRequestsMode, requestItems, featuredItems]
  );

  const safeIndex = activePool.length > 0 ? activeIndex % activePool.length : 0;
  const activeItem = activePool.length > 0 ? activePool[safeIndex] : null;
  const nextUp = activePool.filter((_, index) => index !== safeIndex).slice(0, 3);

  useEffect(() => {
    setActiveIndex(0);
    setFlipCycle((prev) => prev + 1);
  }, [isRequestsMode, requestItems.length, featuredItems.length]);

  useEffect(() => {
    if (activePool.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % activePool.length;
        return next;
      });
      setFlipCycle((prev) => prev + 1);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [activePool.length]);

  useEffect(() => {
    let isMounted = true;

    async function loadQueue() {
      try {
        const res = await fetch(`/api/public/queue/${location}`, { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        const upNext = Array.isArray(data?.upNext) ? data.upNext : [];
        const items = upNext.slice(0, 10).map((item: any) => ({
          id: String(item.id ?? item.requestId ?? item.songId ?? `${item.title}-${item.artist}`),
          requestId: item.requestId ? String(item.requestId) : undefined,
          songId: item.songId ? String(item.songId) : undefined,
          title: String(item.title || ""),
          artist: String(item.artist || ""),
          artworkUrl: item.artworkUrl || undefined,
          score: Number(item.score || 0),
          upvotes: Number(item.upvotes || 0),
          downvotes: Number(item.downvotes || 0),
          isBoosted: Boolean(item.isBoosted),
          boosted: Boolean(item.boosted),
          wasBoosted: Boolean(item.wasBoosted),
        })) as QueueItem[];

        const nextKey = stableKey(items);
        if (isMounted && nextKey !== requestKeyRef.current) {
          requestKeyRef.current = nextKey;
          setRequestItems(items);
        }
      } catch {
        // ignore
      }
    }

    async function loadFeatured() {
      try {
        const res = await fetch(`/api/public/featured-songs/${location}`, { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const normalized = items.slice(0, 10).map((item: any) => ({
          id: String(item.id ?? `${item.title}-${item.artist}`),
          title: String(item.title || ""),
          artist: String(item.artist || ""),
          artworkUrl: item.artworkUrl || undefined,
          score: 0,
          upvotes: 0,
          downvotes: 0,
        })) as QueueItem[];

        const nextKey = stableKey(normalized);
        if (isMounted && nextKey !== featuredKeyRef.current) {
          featuredKeyRef.current = nextKey;
          setFeaturedItems(normalized);
        }
      } catch {
        // ignore
      }
    }

    async function loadRules() {
      try {
        const res = await fetch(`/api/public/rules/${location}`, { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as RulesResponse;
        const url = data?.rules?.defaultAlbumArtUrl || data?.defaultAlbumArtUrl || null;

        if (isMounted && url !== rulesKeyRef.current) {
          rulesKeyRef.current = url;
          setDefaultAlbumArtUrl(url);
        }
      } catch {
        // ignore
      }
    }

    void loadQueue();
    void loadFeatured();
    void loadRules();

    const queueTimer = window.setInterval(() => void loadQueue(), QUEUE_POLL_MS);
    const featuredTimer = window.setInterval(() => void loadFeatured(), FEATURED_POLL_MS);
    const rulesTimer = window.setInterval(() => void loadRules(), RULES_POLL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(queueTimer);
      window.clearInterval(featuredTimer);
      window.clearInterval(rulesTimer);
    };
  }, [location]);

  const decorative = activeItem ? decorativeSeed(activeItem) : null;
  const cardKey = activeItem ? `${activeItem.id}-${flipCycle}` : `empty-${flipCycle}`;

  return (
    <div className="tvPremiumRoot">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap");

        :root {
          --font-barlow-condensed: "Barlow Condensed";
          --tv-bg-1: #040613;
          --tv-bg-2: #090d24;
          --tv-bg-3: #0d1334;
          --tv-purple: #8b5eff;
          --tv-purple-2: #b17cff;
          --tv-cyan: #38d7ff;
          --tv-pink: #ff4fc3;
          --tv-orange: #ff9a5c;
          --tv-cream: #f9f4ea;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #030511;
          overflow: hidden;
        }

        * {
          box-sizing: border-box;
        }

        .tvPremiumRoot {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
          color: var(--tv-cream);
          font-family: var(--font-barlow-condensed), sans-serif;
          background:
            radial-gradient(circle at 18% 12%, rgba(139, 94, 255, 0.34), transparent 22%),
            radial-gradient(circle at 82% 14%, rgba(56, 215, 255, 0.18), transparent 18%),
            radial-gradient(circle at 68% 80%, rgba(255, 79, 195, 0.16), transparent 22%),
            linear-gradient(180deg, var(--tv-bg-1) 0%, var(--tv-bg-2) 42%, var(--tv-bg-3) 100%);
        }

        .tvPremiumRoot::before,
        .tvPremiumRoot::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .tvPremiumRoot::before {
          opacity: 0.34;
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 100% 22px, 22px 100%;
          mask-image: linear-gradient(180deg, transparent, black 9%, black 91%, transparent);
        }

        .tvPremiumRoot::after {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.05), transparent 18%, transparent 82%, rgba(0,0,0,0.18)),
            radial-gradient(circle at center, transparent 58%, rgba(0,0,0,0.3) 100%);
        }

        .tvPremiumFrame {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          padding: 18px 16px 18px;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 14px;
        }

        .tvMarquee,
        .tvFooterCTA {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          border: 2px solid rgba(177, 124, 255, 0.4);
          background:
            linear-gradient(180deg, rgba(146, 95, 247, 0.98), rgba(88, 49, 171, 0.98));
          box-shadow:
            0 14px 32px rgba(0, 0, 0, 0.35),
            0 0 24px rgba(139, 94, 255, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        .tvMarquee::before,
        .tvFooterCTA::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.95;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.08), transparent 18%, transparent 82%, rgba(255,255,255,0.05)),
            radial-gradient(circle, rgba(36, 14, 64, 0.3) 0 2px, transparent 2.6px);
          background-size: auto, 24px 24px;
        }

        .tvMarqueeInner,
        .tvFooterCTAInner {
          position: relative;
          z-index: 1;
          text-align: center;
          text-transform: uppercase;
          font-weight: 800;
          line-height: 0.92;
          color: #fff8ee;
          text-shadow:
            0 3px 0 rgba(34, 12, 62, 0.62),
            0 0 18px rgba(255,255,255,0.18);
        }

        .tvMarqueeInner {
          padding: 14px 16px 18px;
          font-size: clamp(34px, 9vw, 62px);
          letter-spacing: 1px;
        }

        .tvFooterCTAInner {
          padding: 12px 14px 14px;
          font-size: clamp(24px, 6.4vw, 40px);
          letter-spacing: 1px;
        }

        .tvStage {
          min-height: 0;
          perspective: 1800px;
        }

        .tvCardShell {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: flipCardIn 900ms cubic-bezier(0.2, 0.76, 0.2, 1);
        }

        .tvCard {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: hidden;
          display: grid;
          grid-template-rows: auto auto auto auto 1fr;
          gap: 12px;
          padding: 16px;
          border-radius: 34px;
          background:
            linear-gradient(180deg, rgba(16, 20, 44, 0.96), rgba(7, 11, 28, 0.99));
          border: 1px solid rgba(121, 146, 255, 0.22);
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.38),
            0 0 32px rgba(56, 215, 255, 0.08),
            0 0 32px rgba(139, 94, 255, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backface-visibility: hidden;
          transform: translateZ(0);
        }

        .tvCard::before,
        .tvCard::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .tvCard::before {
          background:
            radial-gradient(circle at top right, rgba(139, 94, 255, 0.28), transparent 26%),
            radial-gradient(circle at bottom left, rgba(56, 215, 255, 0.14), transparent 22%),
            linear-gradient(135deg, rgba(255,255,255,0.06), transparent 26%);
        }

        .tvCard::after {
          inset: 1px;
          border-radius: 33px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .tvModeRow {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .tvModePill,
        .tvBoostPill,
        .tvMiniPill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 700;
          white-space: nowrap;
        }

        .tvModePill {
          min-height: 38px;
          padding: 0 15px;
          font-size: clamp(18px, 4.4vw, 24px);
          color: #eef4ff;
          background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05));
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
        }

        .tvBoostPill {
          min-height: 38px;
          padding: 0 15px;
          font-size: clamp(18px, 4.4vw, 24px);
          color: #fffaf4;
          background: linear-gradient(135deg, var(--tv-orange), var(--tv-pink));
          box-shadow:
            0 10px 24px rgba(255, 79, 195, 0.22),
            0 0 18px rgba(255, 154, 92, 0.18);
          animation: premiumPulse 2.2s ease-in-out infinite;
        }

        .tvArtworkWrap {
          position: relative;
          z-index: 1;
          width: 100%;
          aspect-ratio: 1 / 1;
          min-height: 0;
          overflow: hidden;
          border-radius: 28px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow:
            0 16px 34px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .tvArtworkWrap::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.1), transparent 22%, transparent 78%, rgba(0,0,0,0.16)),
            linear-gradient(135deg, rgba(255,255,255,0.16), transparent 28%);
        }

        .tvArtworkWrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          animation: slowZoom 14s ease-in-out infinite alternate;
        }

        .tvSongInfo {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 7px;
          text-align: center;
        }

        .tvTitle {
          font-size: clamp(36px, 9.6vw, 64px);
          line-height: 0.9;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-shadow:
            0 4px 22px rgba(0, 0, 0, 0.34),
            0 0 18px rgba(139, 94, 255, 0.12);
        }

        .tvArtist {
          font-size: clamp(22px, 5.8vw, 34px);
          line-height: 0.96;
          font-weight: 600;
          text-transform: uppercase;
          color: rgba(249, 244, 234, 0.82);
        }

        .tvStatsRow {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .tvStatCard {
          border-radius: 20px;
          padding: 11px 8px 10px;
          text-align: center;
          background: linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.05));
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .tvStatValue {
          font-size: clamp(24px, 6vw, 36px);
          line-height: 1;
          font-weight: 800;
        }

        .tvStatLabel {
          margin-top: 5px;
          font-size: clamp(14px, 3.4vw, 18px);
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(249, 244, 234, 0.64);
        }

        .tvQueueStrip {
          position: relative;
          z-index: 1;
          align-self: end;
          display: grid;
          gap: 10px;
          min-height: 0;
        }

        .tvQueueStripTitle {
          font-size: clamp(18px, 4.4vw, 24px);
          text-transform: uppercase;
          letter-spacing: 1.1px;
          color: rgba(249, 244, 234, 0.68);
        }

        .tvQueueList {
          display: grid;
          gap: 8px;
        }

        .tvQueueRow {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 10px 12px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.045));
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .tvQueueRank {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 800;
          color: white;
          background: linear-gradient(180deg, var(--tv-purple-2), var(--tv-cyan));
          box-shadow: 0 8px 18px rgba(56, 215, 255, 0.16);
        }

        .tvQueueText {
          min-width: 0;
        }

        .tvQueueSong {
          font-size: clamp(18px, 4.5vw, 24px);
          line-height: 0.98;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tvQueueArtist {
          margin-top: 2px;
          font-size: clamp(14px, 3.5vw, 18px);
          color: rgba(249, 244, 234, 0.7);
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tvMiniPill {
          min-height: 30px;
          padding: 0 10px;
          font-size: clamp(14px, 3.3vw, 18px);
          color: white;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .tvEmptyState {
          position: relative;
          z-index: 1;
          height: 100%;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 8px;
        }

        .tvEmptyInner {
          display: grid;
          gap: 16px;
          max-width: 90%;
        }

        .tvEmptyKicker {
          font-size: clamp(20px, 5vw, 28px);
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(249, 244, 234, 0.6);
        }

        .tvEmptyHeadline {
          font-size: clamp(42px, 11vw, 74px);
          line-height: 0.88;
          font-weight: 800;
          text-transform: uppercase;
          text-shadow: 0 0 20px rgba(139, 94, 255, 0.15);
        }

        .tvEmptySub {
          font-size: clamp(22px, 5.5vw, 32px);
          line-height: 0.98;
          text-transform: uppercase;
          color: rgba(249, 244, 234, 0.78);
        }

        @keyframes premiumPulse {
          0%,
          100% {
            transform: translateZ(0) scale(1);
            box-shadow:
              0 10px 24px rgba(255, 79, 195, 0.22),
              0 0 18px rgba(255, 154, 92, 0.18);
          }
          50% {
            transform: translateZ(0) scale(1.03);
            box-shadow:
              0 14px 30px rgba(255, 79, 195, 0.34),
              0 0 26px rgba(255, 154, 92, 0.24);
          }
        }

        @keyframes slowZoom {
          0% { transform: scale(1.01); }
          100% { transform: scale(1.06); }
        }

        @keyframes flipCardIn {
          0% {
            opacity: 0;
            transform: rotateY(-92deg) scale(0.94) translateX(-14px);
            filter: blur(7px);
          }
          48% {
            opacity: 1;
            transform: rotateY(12deg) scale(1.01) translateX(0);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: rotateY(0deg) scale(1) translateX(0);
            filter: blur(0);
          }
        }

        @media (max-width: 430px) {
          .tvPremiumFrame {
            padding: 14px 12px 14px;
            gap: 12px;
          }

          .tvMarqueeInner {
            padding: 12px 12px 15px;
          }

          .tvFooterCTAInner {
            padding: 11px 12px 13px;
          }

          .tvCard {
            padding: 14px;
            gap: 11px;
            border-radius: 28px;
          }

          .tvArtworkWrap {
            border-radius: 24px;
          }
        }
      `}</style>

      <div className="tvPremiumFrame">
        <div className="tvMarquee">
          <div className="tvMarqueeInner">
            {isRequestsMode ? "Remix Requests" : "Featured At Remix"}
          </div>
        </div>

        <div className="tvStage">
          <div className="tvCardShell" key={cardKey}>
            <div className="tvCard">
              {activeItem ? (
                <>
                  <div className="tvModeRow">
                    <div className="tvModePill">{isRequestsMode ? "Up Next Queue" : "Staff Picks"}</div>
                    {isRequestsMode && (activeItem.isBoosted || activeItem.boosted || activeItem.wasBoosted) ? (
                      <div className="tvBoostPill">Boosted</div>
                    ) : null}
                  </div>

                  <div className="tvArtworkWrap">
                    <Artwork
                      src={activeItem.artworkUrl}
                      alt={`${activeItem.title} artwork`}
                      defaultSrc={defaultAlbumArtUrl}
                    />
                  </div>

                  <div className="tvSongInfo">
                    <div className="tvTitle">{activeItem.title}</div>
                    <div className="tvArtist">{activeItem.artist}</div>
                  </div>

                  <div className="tvStatsRow">
                    <div className="tvStatCard">
                      <div className="tvStatValue">{isRequestsMode ? Number(activeItem.upvotes || 0) : decorative?.up}</div>
                      <div className="tvStatLabel">👍 Likes</div>
                    </div>
                    <div className="tvStatCard">
                      <div className="tvStatValue">{isRequestsMode ? Number(activeItem.score || 0) : decorative?.fire}</div>
                      <div className="tvStatLabel">🔥 Heat</div>
                    </div>
                    <div className="tvStatCard">
                      <div className="tvStatValue">{isRequestsMode ? Number(activeItem.downvotes || 0) : decorative?.down}</div>
                      <div className="tvStatLabel">👎 Drops</div>
                    </div>
                  </div>

                  <div className="tvQueueStrip">
                    <div className="tvQueueStripTitle">
                      {nextUp.length > 0 ? (isRequestsMode ? "Also coming up" : "More featured picks") : "Now showing"}
                    </div>

                    {nextUp.length > 0 ? (
                      <div className="tvQueueList">
                        {nextUp.map((item, idx) => (
                          <div className="tvQueueRow" key={item.id}>
                            <div className="tvQueueRank">{idx + 2}</div>
                            <div className="tvQueueText">
                              <div className="tvQueueSong">{item.title}</div>
                              <div className="tvQueueArtist">{item.artist}</div>
                            </div>
                            <div className="tvMiniPill">
                              {isRequestsMode ? `${Number(item.score || 0)} pts` : "Pick"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="tvQueueRow">
                        <div className="tvQueueRank">1</div>
                        <div className="tvQueueText">
                          <div className="tvQueueSong">{activeItem.title}</div>
                          <div className="tvQueueArtist">{activeItem.artist}</div>
                        </div>
                        <div className="tvMiniPill">Live</div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="tvEmptyState">
                  <div className="tvEmptyInner">
                    <div className="tvEmptyKicker">Nothing in queue yet</div>
                    <div className="tvEmptyHeadline">Request the next song</div>
                    <div className="tvEmptySub">Scan the code at your table and get your pick on screen</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="tvFooterCTA">
          <div className="tvFooterCTAInner">Request on the app now</div>
        </div>
      </div>
    </div>
  );
}

function Artwork({
  src,
  alt,
  defaultSrc,
}: {
  src?: string | null;
  alt: string;
  defaultSrc?: string | null;
}) {
  const finalSrc = src || defaultSrc || null;
  const [bad, setBad] = useState(false);

  if (!finalSrc || bad) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          color: "#f8f4ea",
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: 1,
          textTransform: "uppercase",
          background:
            "linear-gradient(135deg, rgba(139,94,255,0.46), rgba(56,215,255,0.18), rgba(255,255,255,0.06))",
        }}
      >
        Remix
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
    />
  );
}
