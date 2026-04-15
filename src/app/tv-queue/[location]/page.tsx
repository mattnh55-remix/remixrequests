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
  requestedByMe?: boolean;
  sourceType?: string;
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

const ROTATE_MS = 25000;
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

function pickTwo(items: QueueItem[], pairIndex: number) {
  if (items.length <= 2) return items.slice(0, 2);

  const pairs = Math.ceil(items.length / 2);
  const safePair = pairIndex % pairs;
  const start = safePair * 2;
  return items.slice(start, start + 2);
}

function decorativeSeed(item: QueueItem) {
  const seed = `${item.id}-${item.title}-${item.artist}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return {
    up: (hash % 7) + 1,
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

  const [visiblePair, setVisiblePair] = useState<QueueItem[]>([]);
  const [sceneMode, setSceneMode] = useState<"requests" | "featured">("featured");
  const [pairIndex, setPairIndex] = useState(0);
  const [animCycle, setAnimCycle] = useState(0);

  const requestKeyRef = useRef("");
  const featuredKeyRef = useRef("");
  const rulesKeyRef = useRef<string | null>(null);

  const activePool = useMemo(
    () => (requestItems.length > 0 ? requestItems : featuredItems),
    [requestItems, featuredItems]
  );

  const isRequestsMode = requestItems.length > 0;

  useEffect(() => {
    setSceneMode(isRequestsMode ? "requests" : "featured");
    setPairIndex(0);
  }, [isRequestsMode]);

  useEffect(() => {
    const nextPair = pickTwo(activePool, pairIndex);
    setVisiblePair(nextPair);
    setAnimCycle((prev) => prev + 1);
  }, [activePool, pairIndex, sceneMode]);

  useEffect(() => {
    const canRotate = activePool.length > 2;
    if (!canRotate) return;

    const timer = window.setInterval(() => {
      setPairIndex((prev) => prev + 1);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [activePool.length]);

  useEffect(() => {
    let isMounted = true;

    async function loadQueue() {
      try {
        const res = await fetch(`/api/public/queue/${location}`, {
          cache: "no-store",
        });
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
        const res = await fetch(`/api/public/featured-songs/${location}`, {
          cache: "no-store",
        });
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
        const res = await fetch(`/api/public/rules/${location}`, {
          cache: "no-store",
        });
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

  return (
    <div className="tvBillboardRoot">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap");

        :root {
          --font-barlow-condensed: "Barlow Condensed";
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #050814;
        }

        .tvBillboardRoot {
          position: relative;
          min-height: 100vh;
          height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at 22% 72%, rgba(0, 93, 166, 0.38), transparent 34%),
            radial-gradient(circle at 72% 22%, rgba(109, 27, 140, 0.38), transparent 34%),
            linear-gradient(90deg, #021f47 0%, #2c0644 100%);
          color: #f8f4ea;
          font-family: var(--font-barlow-condensed), sans-serif;
        }

        .tvBillboardFrame {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-rows: auto 1fr auto;
          min-height: 100vh;
          height: 100vh;
          padding: 0;
          box-sizing: border-box;
        }

        .tvHeaderWrap,
        .tvFooterWrap {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0;
          margin: 0;
          line-height: 0;
        }

        .tvHeaderWrap {
          align-self: start;
        }

        .tvFooterWrap {
          align-self: end;
        }

        .tvBadge {
          position: relative;
          overflow: hidden;
          background: #8c69d8;
          border: 4px solid #1f1031;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tvBadge::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(65, 36, 113, 0.42) 0 2.5px, transparent 3px);
          background-size: 28px 28px;
          background-position: 4px 4px;
          opacity: 1;
          pointer-events: none;
        }

        .tvHeaderBadge {
          width: min(78vw, 560px);
          min-height: clamp(58px, 7.2vh, 86px);
          padding: 10px 24px 14px;
          clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%);
        }

        .tvFooterBadge {
          width: min(80vw, 620px);
          min-height: clamp(46px, 5.4vh, 64px);
          padding: 8px 18px 10px;
        }

        .tvHeaderText {
          position: relative;
          z-index: 1;
          white-space: nowrap;
          text-align: center;
          font-family: var(--font-barlow-condensed), sans-serif;
          font-size: clamp(42px, 3.7vw, 78px);
          line-height: 0.94;
          letter-spacing: 1px;
          text-transform: uppercase;
          transform: translateY(-8px);
          color: #f8f4ea;
          text-shadow:
            4px 4px 0 rgba(0, 0, 0, 0.22),
            0 2px 0 rgba(0, 0, 0, 0.16);
          font-weight: 700;
        }

        .tvFooterText {
          position: relative;
          z-index: 1;
          white-space: nowrap;
          text-align: center;
          font-family: var(--font-barlow-condensed), sans-serif;
          font-size: clamp(26px, 2.3vw, 48px);
          line-height: 0.94;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #f8f4ea;
          text-shadow:
            4px 4px 0 rgba(0, 0, 0, 0.22),
            0 2px 0 rgba(0, 0, 0, 0.16);
          font-weight: 700;
        }

        .tvScene {
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(8px, 1vh, 12px) 0;
          overflow: hidden;
        }

        .tvSceneInner {
          width: 100%;
          height: 100%;
          display: grid;
          align-content: center;
          justify-items: center;
          gap: clamp(18px, 2.2vh, 26px);
        }

        .tvCardShell {
          width: min(61vw, 320px);
          display: grid;
          justify-items: center;
          align-content: start;
          gap: clamp(8px, 1vh, 12px);
          position: relative;
          will-change: transform, opacity;
        }

        .tvCardShell--top {
          transform: translateX(-48px);
        }

        .tvCardShell--bottom {
          transform: translateX(48px);
        }

        .tvCardAnimEnterLeft {
          animation: enterLeft 900ms cubic-bezier(0.22, 1, 0.36, 1) both, floaty 8s ease-in-out 900ms infinite;
        }

        .tvCardAnimEnterRight {
          animation: enterRight 900ms cubic-bezier(0.22, 1, 0.36, 1) both, floaty 8s ease-in-out 900ms infinite;
        }

        .tvCardArtWrap {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 8px 8px 0 rgba(100, 53, 10, 0.52);
          background: rgba(255, 255, 255, 0.08);
        }

        .tvCardArtWrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .tvCardTitle {
          width: 100%;
          text-align: center;
          font-weight: 700;
          font-size: clamp(34px, 3.5vw, 50px);
          line-height: 0.95;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          color: #f8f4ea;
          text-shadow:
            5px 5px 0 rgba(0, 0, 0, 0.22),
            0 2px 0 rgba(0, 0, 0, 0.14);
        }

        .tvCardArtist {
          width: 100%;
          text-align: center;
          font-weight: 600;
          font-size: clamp(18px, 2vw, 26px);
          line-height: 1;
          letter-spacing: 0.2px;
          text-transform: uppercase;
          color: #f8f4ea;
        }

        .tvCardMeta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 28px;
        }

        .tvMetaPill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 29px;
          height: 22px;
          padding: 0 7px;
          border-radius: 999px;
          background: linear-gradient(180deg, #6f6ff2 0%, #c56be2 100%);
          color: #f8f4ea;
          font-size: 15px;
          font-weight: 700;
          box-sizing: border-box;
        }

        .tvMetaFire {
          font-size: 19px;
          line-height: 1;
        }

        .tvRankBadge {
          position: absolute;
          left: -44px;
          top: 14px;
          width: 60px;
          height: 78px;
          background: linear-gradient(180deg, #5c7cff 0%, #ea60c2 100%);
          clip-path: polygon(0 0, 100% 0, 100% 78%, 52% 100%, 0 78%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 4px solid rgba(24, 15, 39, 0.96);
          box-sizing: border-box;
          box-shadow: 4px 6px 0 rgba(0, 0, 0, 0.18);
        }

        .tvRankBadgeText {
          font-weight: 700;
          font-size: 44px;
          line-height: 1;
          color: #f8f4ea;
          text-shadow:
            6px 6px 0 rgba(0, 0, 0, 0.24),
            0 2px 0 rgba(0, 0, 0, 0.16);
        }

        @keyframes enterLeft {
          0% {
            opacity: 0;
            transform: translateX(-108px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateX(-48px) scale(1);
          }
        }

        @keyframes enterRight {
          0% {
            opacity: 0;
            transform: translateX(108px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateX(48px) scale(1);
          }
        }

        @keyframes floaty {
          0%, 100% {
            margin-top: 0;
          }
          50% {
            margin-top: -4px;
          }
        }

        @media (max-height: 900px) {
          .tvHeaderBadge {
            width: min(74vw, 500px);
            min-height: 60px;
            padding: 8px 20px 12px;
          }

          .tvFooterBadge {
            width: min(76vw, 520px);
            min-height: 42px;
            padding: 6px 14px 8px;
          }

          .tvSceneInner {
            gap: 16px;
          }

          .tvCardShell {
            width: min(57vw, 282px);
            gap: 8px;
          }

          .tvCardTitle {
            font-size: clamp(30px, 3.4vw, 46px);
          }

          .tvCardArtist {
            font-size: clamp(18px, 1.9vw, 24px);
          }
        }
      `}</style>

      <div className="tvBillboardFrame">
        <div className="tvHeaderWrap">
          <div className="tvBadge tvHeaderBadge">
            <div className="tvHeaderText">REMIX REQUESTS</div>
          </div>
        </div>

        <div className="tvScene">
          <div className="tvSceneInner" key={`${sceneMode}-${animCycle}`}>
            {visiblePair.map((item, index) => {
              const decorative = decorativeSeed(item);
              const rank = isRequestsMode ? index + 3 : null;

              return (
                <div
                  key={`${sceneMode}-${item.id}-${index}`}
                  className={[
                    "tvCardShell",
                    index === 0
                      ? "tvCardShell--top tvCardAnimEnterLeft"
                      : "tvCardShell--bottom tvCardAnimEnterRight",
                  ].join(" ")}
                >
                  {rank ? (
                    <div className="tvRankBadge">
                      <div className="tvRankBadgeText">{rank}.</div>
                    </div>
                  ) : null}

                  <div className="tvCardArtWrap">
                    <Artwork
                      src={item.artworkUrl}
                      alt={`${item.title} artwork`}
                      defaultSrc={defaultAlbumArtUrl}
                    />
                  </div>

                  <div className="tvCardTitle">{item.title}</div>
                  <div className="tvCardArtist">{item.artist}</div>

                  <div className="tvCardMeta">
                    <span className="tvMetaPill">
                      {isRequestsMode ? Number(item.upvotes || 0) : decorative.up}
                    </span>
                    <span role="img" aria-label="thumbs up">
                      👍
                    </span>
                    <span className="tvMetaPill">
                      {isRequestsMode ? Number(item.downvotes || 0) : decorative.down}
                    </span>
                    <span role="img" aria-label="thumbs down">
                      👎
                    </span>
                    <span className="tvMetaPill">
                      {isRequestsMode ? Number(item.score || 0) : decorative.fire}
                    </span>
                    <span className="tvMetaFire" role="img" aria-label="fire">
                      🔥
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="tvFooterWrap">
          <div className="tvBadge tvFooterBadge">
            <div className="tvFooterText">REQUEST ON THE APP NOW!</div>
          </div>
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
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
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
    />
  );
}
