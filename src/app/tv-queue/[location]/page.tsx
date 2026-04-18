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

export default function TvQueuePortraitBillboardPage({
  params,
}: {
  params: { location: string };
}) {
  const location = params.location;

  const [requestItems, setRequestItems] = useState<QueueItem[]>([]);
  const [featuredItems, setFeaturedItems] = useState<QueueItem[]>([]);
  const [defaultAlbumArtUrl, setDefaultAlbumArtUrl] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const requestKeyRef = useRef("");
  const featuredKeyRef = useRef("");
  const rulesKeyRef = useRef<string | null>(null);

  const isRequestsMode = requestItems.length > 0;

  const activePool = useMemo(
    () => (isRequestsMode ? requestItems : featuredItems),
    [isRequestsMode, requestItems, featuredItems]
  );

  const activeItem = activePool.length > 0 ? activePool[activeIndex % activePool.length] : null;
  const nextUp = activePool.slice(1, 4);

  useEffect(() => {
    setActiveIndex(0);
  }, [isRequestsMode, requestItems.length, featuredItems.length]);

  useEffect(() => {
    if (activePool.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activePool.length);
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

  return (
    <div className="tvPortraitRoot">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap");

        :root {
          --font-barlow-condensed: "Barlow Condensed";
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #040612;
          overflow: hidden;
        }

        * {
          box-sizing: border-box;
        }

        .tvPortraitRoot {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
          color: #f8f4ea;
          font-family: var(--font-barlow-condensed), sans-serif;
          background:
            radial-gradient(circle at 20% 15%, rgba(143, 82, 255, 0.22), transparent 26%),
            radial-gradient(circle at 84% 22%, rgba(0, 211, 255, 0.14), transparent 22%),
            radial-gradient(circle at 50% 86%, rgba(255, 102, 196, 0.16), transparent 24%),
            linear-gradient(180deg, #06091a 0%, #090f27 48%, #050816 100%);
        }

        .tvPortraitChrome {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.52;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 100% 22px, 22px 100%;
          mask-image: linear-gradient(180deg, transparent, black 10%, black 90%, transparent);
        }

        .tvPortraitFrame {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 22px 18px 22px;
          gap: 16px;
        }

        .tvTopBadge,
        .tvBottomBadge {
          position: relative;
          overflow: hidden;
          border-radius: 22px;
          border: 3px solid rgba(181, 129, 255, 0.45);
          background:
            linear-gradient(180deg, rgba(150, 98, 242, 0.96), rgba(98, 56, 182, 0.96));
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .tvTopBadge::before,
        .tvBottomBadge::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(33, 10, 63, 0.28) 0 2px, transparent 2.6px);
          background-size: 24px 24px;
          opacity: 0.85;
        }

        .tvTopBadge {
          padding: 14px 18px 18px;
        }

        .tvBottomBadge {
          padding: 13px 16px;
        }

        .tvBadgeText {
          position: relative;
          z-index: 1;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1px;
          line-height: 0.92;
          font-weight: 800;
          color: #fff7ee;
          text-shadow: 0 3px 0 rgba(36, 14, 64, 0.5);
        }

        .tvBadgeText--top {
          font-size: clamp(34px, 9vw, 62px);
        }

        .tvBadgeText--bottom {
          font-size: clamp(24px, 6.8vw, 40px);
        }

        .tvStage {
          min-height: 0;
          display: grid;
          align-content: stretch;
        }

        .tvCard {
          position: relative;
          min-height: 0;
          height: 100%;
          border-radius: 34px;
          padding: 18px;
          display: grid;
          grid-template-rows: auto auto auto auto 1fr;
          gap: 14px;
          background:
            linear-gradient(180deg, rgba(14, 20, 45, 0.94), rgba(8, 12, 29, 0.98));
          border: 2px solid rgba(118, 144, 255, 0.24);
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
          overflow: hidden;
        }

        .tvCard::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at top right, rgba(154, 87, 255, 0.22), transparent 24%),
            radial-gradient(circle at bottom left, rgba(0, 214, 255, 0.12), transparent 22%);
          pointer-events: none;
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
        }

        .tvModePill {
          min-height: 38px;
          padding: 0 16px;
          font-size: clamp(18px, 4.5vw, 24px);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f8f4ea;
        }

        .tvBoostPill {
          min-height: 38px;
          padding: 0 16px;
          font-size: clamp(18px, 4.5vw, 24px);
          background: linear-gradient(180deg, #ff8c5f, #ff4fb3);
          color: white;
          box-shadow: 0 8px 18px rgba(255, 89, 177, 0.22);
          animation: pulseGlow 2.2s ease-in-out infinite;
        }

        .tvArtworkWrap {
          position: relative;
          z-index: 1;
          width: 100%;
          aspect-ratio: 1 / 1;
          min-height: 0;
          border-radius: 28px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
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
          text-align: center;
          display: grid;
          gap: 8px;
        }

        .tvTitle {
          font-size: clamp(34px, 9vw, 62px);
          line-height: 0.92;
          font-weight: 800;
          text-transform: uppercase;
          text-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
        }

        .tvArtist {
          font-size: clamp(22px, 5.8vw, 34px);
          line-height: 0.98;
          font-weight: 600;
          text-transform: uppercase;
          color: rgba(248, 244, 234, 0.82);
        }

        .tvStatsRow {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .tvStatCard {
          border-radius: 18px;
          padding: 12px 8px 10px;
          text-align: center;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .tvStatValue {
          font-size: clamp(24px, 6vw, 36px);
          line-height: 1;
          font-weight: 800;
        }

        .tvStatLabel {
          margin-top: 6px;
          font-size: clamp(14px, 3.4vw, 18px);
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(248, 244, 234, 0.66);
        }

        .tvQueueStrip {
          position: relative;
          z-index: 1;
          align-self: end;
          display: grid;
          gap: 10px;
        }

        .tvQueueStripTitle {
          font-size: clamp(18px, 4.4vw, 24px);
          text-transform: uppercase;
          letter-spacing: 1.1px;
          color: rgba(248, 244, 234, 0.68);
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
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .tvQueueRank {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 800;
          background: linear-gradient(180deg, #8f68ff, #4fc3ff);
          color: white;
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
          color: rgba(248, 244, 234, 0.7);
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tvMiniPill {
          min-height: 30px;
          padding: 0 10px;
          font-size: clamp(14px, 3.3vw, 18px);
          background: rgba(255, 255, 255, 0.09);
          color: white;
        }

        .tvEmptyState {
          position: relative;
          z-index: 1;
          height: 100%;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 10px;
        }

        .tvEmptyInner {
          display: grid;
          gap: 16px;
          max-width: 88%;
        }

        .tvEmptyKicker {
          font-size: clamp(20px, 5vw, 28px);
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(248, 244, 234, 0.62);
        }

        .tvEmptyHeadline {
          font-size: clamp(42px, 11vw, 72px);
          line-height: 0.9;
          font-weight: 800;
          text-transform: uppercase;
        }

        .tvEmptySub {
          font-size: clamp(22px, 5.5vw, 32px);
          line-height: 1;
          color: rgba(248, 244, 234, 0.78);
          text-transform: uppercase;
        }

        @keyframes pulseGlow {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 8px 18px rgba(255, 89, 177, 0.22);
          }
          50% {
            transform: scale(1.03);
            box-shadow: 0 14px 28px rgba(255, 89, 177, 0.34);
          }
        }

        @keyframes slowZoom {
          0% {
            transform: scale(1.01);
          }
          100% {
            transform: scale(1.06);
          }
        }

        @media (max-width: 430px) {
          .tvPortraitFrame {
            padding: 14px 12px 14px;
            gap: 12px;
          }

          .tvCard {
            border-radius: 28px;
            padding: 14px;
            gap: 12px;
          }

          .tvTopBadge {
            padding: 12px 14px 15px;
          }

          .tvBottomBadge {
            padding: 11px 12px;
          }
        }
      `}</style>

      <div className="tvPortraitChrome" />

      <div className="tvPortraitFrame">
        <div className="tvTopBadge">
          <div className="tvBadgeText tvBadgeText--top">
            {isRequestsMode ? "Remix Requests" : "Featured At Remix"}
          </div>
        </div>

        <div className="tvStage">
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

        <div className="tvBottomBadge">
          <div className="tvBadgeText tvBadgeText--bottom">Request on the app now</div>
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
            "linear-gradient(135deg, rgba(143,104,255,0.42), rgba(50,184,255,0.18), rgba(255,255,255,0.06))",
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
