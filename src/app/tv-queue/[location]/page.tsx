"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

type QueueItem = {
  id: string;
  requestId?: string;
  songId?: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  score: number;
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

type VisibleCard = QueueItem & {
  visualNumber?: number;
};

const FEATURE_ROTATE_MS = 25000;
const POLL_QUEUE_MS = 5000;
const POLL_FEATURED_MS = 30000;
const POLL_RULES_MS = 45000;

function sameItems(a: QueueItem[], b: QueueItem[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left?.id !== right?.id ||
      left?.title !== right?.title ||
      left?.artist !== right?.artist ||
      left?.artworkUrl !== right?.artworkUrl ||
      Number(left?.upvotes || 0) !== Number(right?.upvotes || 0) ||
      Number(left?.downvotes || 0) !== Number(right?.downvotes || 0) ||
      Number(left?.score || 0) !== Number(right?.score || 0)
    ) {
      return false;
    }
  }
  return true;
}

function makeFeaturedPair(items: QueueItem[], start: number): QueueItem[] {
  if (items.length <= 2) return items;

  const first = items[start % items.length];
  const second = items[(start + 1) % items.length];
  return [first, second].filter(Boolean);
}

export default function TvQueuePortraitPage({
  params,
}: {
  params: { location: string };
}) {
  const location = params.location;

  const [upNext, setUpNext] = useState<QueueItem[]>([]);
  const [featuredSongs, setFeaturedSongs] = useState<QueueItem[]>([]);
  const [defaultAlbumArtUrl, setDefaultAlbumArtUrl] = useState<string | null>(null);
  const [tvScale, setTvScale] = useState(1);
  const [featuredStart, setFeaturedStart] = useState(0);
  const [sceneKey, setSceneKey] = useState(0);

  const previousRequestIdsRef = useRef<string>("");
  const previousFeaturedIdsRef = useRef<string>("");

  const requestCards = useMemo<VisibleCard[]>(() => {
    return upNext.slice(0, 2).map((item, index) => ({
      ...item,
      visualNumber: index + 3,
    }));
  }, [upNext]);

  const hasRequests = requestCards.length > 0;

  const featuredCards = useMemo<VisibleCard[]>(() => {
    return makeFeaturedPair(featuredSongs, featuredStart);
  }, [featuredSongs, featuredStart]);

  const visibleCards = hasRequests ? requestCards : featuredCards;
  const mode = hasRequests ? "requests" : "featured";

  useEffect(() => {
    function updateScale() {
      const h = window.innerHeight || 1080;
      const w = window.innerWidth || 720;
      const heightScale = h / 1920;
      const widthScale = w / 1080;
      const nextScale = Math.max(0.8, Math.min(1.28, Math.min(heightScale, widthScale) * 1.12));
      setTvScale(Number(nextScale.toFixed(3)));
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    if (hasRequests) return;

    const timer = window.setInterval(() => {
      setFeaturedStart((prev) => {
        if (featuredSongs.length <= 2) return 0;
        return (prev + 2) % featuredSongs.length;
      });
      setSceneKey((prev) => prev + 1);
    }, FEATURE_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [featuredSongs.length, hasRequests]);

  useEffect(() => {
    const requestSignature = requestCards
      .map((item) => `${item.id}:${item.visualNumber}:${item.upvotes || 0}:${item.downvotes || 0}:${item.score || 0}`)
      .join("|");

    if (requestSignature && requestSignature !== previousRequestIdsRef.current) {
      previousRequestIdsRef.current = requestSignature;
      setSceneKey((prev) => prev + 1);
    }

    if (!requestSignature) {
      previousRequestIdsRef.current = "";
    }
  }, [requestCards]);

  useEffect(() => {
    const featuredSignature = featuredCards.map((item) => item.id).join("|");

    if (!hasRequests && featuredSignature && featuredSignature !== previousFeaturedIdsRef.current) {
      previousFeaturedIdsRef.current = featuredSignature;
      setSceneKey((prev) => prev + 1);
    }
  }, [featuredCards, hasRequests]);

  async function loadQueue() {
    try {
      const res = await fetch(`/api/public/queue/${location}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const nextItems = Array.isArray(data?.upNext) ? data.upNext.slice(0, 2) : [];

      setUpNext((current) => (sameItems(current, nextItems) ? current : nextItems));
    } catch {
      setUpNext((current) => (current.length === 0 ? current : []));
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
      setDefaultAlbumArtUrl(url);
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
      const nextItems = items.map((s: any) => ({
        id: String(s.id),
        title: String(s.title || ""),
        artist: String(s.artist || ""),
        artworkUrl: s.artworkUrl || undefined,
        score: 0,
        upvotes: 0,
        downvotes: 0,
      })) as QueueItem[];

      setFeaturedSongs((current) => (sameItems(current, nextItems) ? current : nextItems));
    } catch {
      setFeaturedSongs((current) => (current.length === 0 ? current : []));
    }
  }

  useEffect(() => {
    void loadQueue();
    void loadFeatured();
    void loadRules();

    const queueTimer = window.setInterval(() => void loadQueue(), POLL_QUEUE_MS);
    const featuredTimer = window.setInterval(() => void loadFeatured(), POLL_FEATURED_MS);
    const rulesTimer = window.setInterval(() => void loadRules(), POLL_RULES_MS);

    return () => {
      window.clearInterval(queueTimer);
      window.clearInterval(featuredTimer);
      window.clearInterval(rulesTimer);
    };
  }, [location]);

  return (
    <div className="remixRequestsBillboardRoot" style={{ ["--tvScale" as any]: tvScale } as CSSProperties}>
      <div className="remixRequestsBg remixRequestsBgA" />
      <div className="remixRequestsBg remixRequestsBgB" />
      <div className="remixRequestsGlow remixRequestsGlowA" />
      <div className="remixRequestsGlow remixRequestsGlowB" />

      <main className="remixRequestsStage">
        <HeaderBadge />

        <section className="remixRequestsCardsViewport">
          {visibleCards.length === 0 ? (
            <div className="remixRequestsLoading">Loading featured songs...</div>
          ) : (
            <div className="remixRequestsCardsTrack" key={`${mode}-${sceneKey}`}>
              {visibleCards.map((item, index) => (
                <BillboardCard
                  key={`${mode}-${item.id}-${index}`}
                  item={item}
                  side={index === 0 ? "left" : "right"}
                  defaultAlbumArtUrl={defaultAlbumArtUrl}
                  showNumber={hasRequests}
                />
              ))}
            </div>
          )}
        </section>

        <FooterBanner mode={mode} />
      </main>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&display=swap");

        .remixRequestsBillboardRoot {
          --font-barlow-condensed: "Barlow Condensed";
          --bgLeft: #02152f;
          --bgRight: #2b0c45;
          --panel: rgba(255, 255, 255, 0.05);
          --line: rgba(255, 255, 255, 0.14);
          --text: #fff7ea;
          --shadowText: #251334;
          --purpleA: #7854d7;
          --purpleB: #d95ac5;
          --pink: #ef6ecb;
          --blue: #4e72ff;
          --gold: #ffd661;
          --orange: #ff8a2a;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, var(--bgLeft) 0%, #07152d 26%, #130d3b 63%, var(--bgRight) 100%);
          color: var(--text);
        }

        .remixRequestsBg,
        .remixRequestsGlow {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .remixRequestsBgA {
          background:
            radial-gradient(circle at 16% 80%, rgba(0, 122, 255, 0.12), transparent 28%),
            radial-gradient(circle at 84% 18%, rgba(237, 78, 201, 0.12), transparent 26%);
        }

        .remixRequestsBgB {
          background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent 18%, transparent 82%, rgba(255,255,255,0.02));
        }

        .remixRequestsGlow {
          mix-blend-mode: screen;
          filter: blur(calc(90px * var(--tvScale)));
          opacity: 0.18;
        }

        .remixRequestsGlowA {
          background: radial-gradient(circle at 8% 50%, rgba(0, 247, 255, 0.46), transparent 20%);
          animation: remixRequestsDriftA 16s ease-in-out infinite;
        }

        .remixRequestsGlowB {
          background: radial-gradient(circle at 92% 20%, rgba(255, 57, 212, 0.4), transparent 18%);
          animation: remixRequestsDriftB 18s ease-in-out infinite;
        }

        .remixRequestsStage {
          min-height: 100vh;
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: calc(18px * var(--tvScale));
          padding: 0 calc(18px * var(--tvScale)) 0;
          box-sizing: border-box;
        }

        .remixRequestsHeaderWrap {
          display: flex;
          justify-content: center;
          padding-top: -2px;
        }

        .remixRequestsHeaderBadge {
          width: min(74vw, calc(620px * var(--tvScale)));
          max-width: calc(620px * var(--tvScale));
          background:
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05), transparent 70%),
            linear-gradient(180deg, #7a58c0 0%, #6547a9 100%);
          border: calc(4px * var(--tvScale)) solid #0c0717;
          margin-top: 0;
          clip-path: polygon(0 0, 100% 0, 100% 74%, 50% 100%, 0 74%);
          padding: calc(8px * var(--tvScale)) calc(20px * var(--tvScale)) calc(16px * var(--tvScale));
          text-align: center;
          box-shadow: 0 calc(18px * var(--tvScale)) calc(32px * var(--tvScale)) rgba(0,0,0,0.3);
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        .remixRequestsHeaderBadge::before {
          content: "";
          position: absolute;
          inset: calc(-28px * var(--tvScale));
          background:
            radial-gradient(circle, rgba(67, 40, 112, 0.52) 18%, transparent 19%);
          background-size: calc(28px * var(--tvScale)) calc(28px * var(--tvScale));
          background-position: center center;
          transform: none;
          opacity: 0.9;
          z-index: 0;
          pointer-events: none;
        }

        .remixRequestsHeaderText {
          position: relative;
          z-index: 1;
          font-size: clamp(28px, 3.2vw, 62px);
          font-weight: 800;
          line-height: 0.94;
          letter-spacing: 1px;
          text-transform: uppercase;
          white-space: nowrap;
          font-family: var(--font-barlow-condensed), sans-serif;
          color: #f8f4ea;
          text-shadow:
            4px 4px 0 rgba(0, 0, 0, 0.22),
            0 2px 0 rgba(0, 0, 0, 0.16);
        }

        .remixRequestsCardsViewport {
          min-height: 0;
          display: grid;
          align-items: center;
          overflow: hidden;
        }

        .remixRequestsCardsTrack {
          display: grid;
          grid-template-columns: 1fr;
          gap: calc(20px * var(--tvScale));
          align-content: center;
        }

        .remixRequestsCard {
          position: relative;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: calc(14px * var(--tvScale));
          align-items: center;
          max-width: calc(860px * var(--tvScale));
          width: 100%;
          justify-self: center;
          animation-duration: 25s;
          animation-timing-function: ease-in-out;
          animation-fill-mode: both;
          will-change: transform, opacity;
        }

.remixRequestsCard.is-left {
          justify-self: start;
          margin-left: calc(16px * var(--tvScale));
          animation-name: remixRequestsLeftScene;
        }

        .remixRequestsCard.is-right {
          justify-self: end;
          margin-right: calc(48px * var(--tvScale));
          animation-name: remixRequestsRightScene;
        }

        .remixRequestsCardNumber {
          width: calc(116px * var(--tvScale));
          min-width: calc(116px * var(--tvScale));
          align-self: start;
          background: linear-gradient(180deg, #5f71ff 0%, #ef63c8 100%);
          border: calc(4px * var(--tvScale)) solid rgba(13, 6, 22, 0.98);
          clip-path: polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%);
          display: grid;
          place-items: center;
          padding: calc(16px * var(--tvScale)) 0 calc(26px * var(--tvScale));
          box-shadow: 0 calc(10px * var(--tvScale)) calc(20px * var(--tvScale)) rgba(0,0,0,0.28);
        }

        .remixRequestsCardNumberText {
          font-size: clamp(38px, calc(70px * var(--tvScale)), 100px);
          font-weight: 800;
          font-family: var(--font-barlow-condensed), sans-serif;
          line-height: 1;
          color: var(--text);
          text-shadow: calc(5px * var(--tvScale)) calc(5px * var(--tvScale)) 0 rgba(26, 10, 36, 0.65);
        }

        .remixRequestsCardMain {
          min-width: 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: calc(14px * var(--tvScale));
          align-items: center;
          justify-items: center;
        }

        .remixRequestsCardMain.no-number {
          grid-template-columns: 1fr;
        }

        .remixRequestsArtWrap {
          position: relative;
          width: min(100%, calc(340px * var(--tvScale)));
          aspect-ratio: 1 / 1;
          border-radius: calc(28px * var(--tvScale));
          overflow: hidden;
          box-shadow: 0 calc(20px * var(--tvScale)) calc(34px * var(--tvScale)) rgba(0,0,0,0.32);
          background: rgba(255,255,255,0.04);
        }

        .remixRequestsArtWrap::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
          pointer-events: none;
        }

        .remixRequestsCardText {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: calc(8px * var(--tvScale));
          align-items: center;
          text-align: center;
          width: 100%;
        }

        .remixRequestsTitle {
          font-size: clamp(30px, calc(56px * var(--tvScale)), 82px);
          line-height: 0.96;
          font-weight: 800;
          font-family: var(--font-barlow-condensed), sans-serif;
          text-transform: uppercase;
          color: var(--text);
          text-shadow: calc(4px * var(--tvScale)) calc(4px * var(--tvScale)) 0 rgba(25, 11, 35, 0.64);
          word-break: break-word;
        }

        .remixRequestsArtist {
          font-size: clamp(18px, calc(28px * var(--tvScale)), 42px);
          line-height: 1;
          font-weight: 700;
          font-family: var(--font-barlow-condensed), sans-serif;
          text-transform: uppercase;
          color: var(--text);
          text-shadow: calc(3px * var(--tvScale)) calc(3px * var(--tvScale)) 0 rgba(25, 11, 35, 0.58);
          word-break: break-word;
        }

        .remixRequestsVotes {
          display: flex;
          align-items: center;
          gap: calc(10px * var(--tvScale));
          flex-wrap: wrap;
          margin-top: calc(2px * var(--tvScale));
          justify-content: center;
        }

        .remixRequestsVoteChip,
        .remixRequestsFireChip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: calc(6px * var(--tvScale));
          min-height: calc(44px * var(--tvScale));
          padding: 0 calc(14px * var(--tvScale));
          border-radius: 999px;
          font-size: clamp(16px, calc(26px * var(--tvScale)), 40px);
          font-weight: 700;
          font-family: var(--font-barlow-condensed), sans-serif;
          box-shadow: 0 calc(6px * var(--tvScale)) calc(14px * var(--tvScale)) rgba(0,0,0,0.2);
        }

        .remixRequestsVoteChip {
          background: linear-gradient(90deg, #6d6bff 0%, #d86bcb 100%);
          color: #fff5e5;
        }

        .remixRequestsFireChip {
          background: rgba(31, 13, 50, 0.9);
          border: 2px solid #5873ff;
          color: #fff5e5;
        }

        .remixRequestsFooter {
          display: flex;
          justify-content: center;
          padding-bottom: 0;
        }

        .remixRequestsFooterBadge {
          width: min(72vw, calc(720px * var(--tvScale)));
          background:
            radial-gradient(circle, rgba(44, 22, 76, 0.32) 18%, transparent 19%),
            linear-gradient(180deg, #7a58c0 0%, #6547a9 100%);
          background-size: calc(28px * var(--tvScale)) calc(28px * var(--tvScale)), auto;
          border: calc(4px * var(--tvScale)) solid rgba(13, 6, 22, 0.98);
          padding: calc(8px * var(--tvScale)) calc(14px * var(--tvScale));
          text-align: center;
          box-shadow: 0 calc(16px * var(--tvScale)) calc(30px * var(--tvScale)) rgba(0,0,0,0.28);
        }

        .remixRequestsFooterText {
          font-size: clamp(22px, calc(40px * var(--tvScale)), 62px);
          line-height: 0.96;
          font-weight: 700;
          font-family: var(--font-barlow-condensed), sans-serif;
          text-transform: uppercase;
          color: var(--text);
          text-shadow: calc(4px * var(--tvScale)) calc(4px * var(--tvScale)) 0 rgba(25, 11, 35, 0.62);
        }

        .remixRequestsLoading {
          justify-self: center;
          align-self: center;
          padding: calc(20px * var(--tvScale)) calc(24px * var(--tvScale));
          border-radius: calc(24px * var(--tvScale));
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          font-size: clamp(20px, calc(34px * var(--tvScale)), 48px);
          font-weight: 700;
          font-family: var(--font-barlow-condensed), sans-serif;
          text-transform: uppercase;
        }

        @keyframes remixRequestsLeftScene {
          0% { opacity: 0; transform: translateX(-72px) scale(0.96); }
          7% { opacity: 1; transform: translateX(0) scale(1); }
          12%, 80% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          46% { transform: translate3d(0, calc(-6px * var(--tvScale)), 0) scale(1.012); }
          63% { transform: translate3d(0, calc(4px * var(--tvScale)), 0) scale(1); }
          100% { opacity: 0; transform: translateX(-56px) scale(0.975); }
        }

        @keyframes remixRequestsRightScene {
          0% { opacity: 0; transform: translateX(116px) scale(0.96); }
          7% { opacity: 1; transform: translateX(0) scale(1); }
          12%, 80% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          44% { transform: translate3d(0, calc(5px * var(--tvScale)), 0) scale(1.012); }
          62% { transform: translate3d(0, calc(-5px * var(--tvScale)), 0) scale(1); }
          100% { opacity: 0; transform: translateX(96px) scale(0.975); }
        }

        @keyframes remixRequestsDriftA {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(2vw, -2vh, 0); }
        }

        @keyframes remixRequestsDriftB {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-2vw, 2vh, 0); }
        }

        @media (max-width: 900px) {
          .remixRequestsCard {
            max-width: 100%;
          }

          .remixRequestsCardMain,
          .remixRequestsCardMain.no-number {
            grid-template-columns: 1fr;
            gap: calc(18px * var(--tvScale));
          }

          .remixRequestsArtWrap {
            max-width: min(66vw, calc(360px * var(--tvScale)));
          }
        }
      `}</style>
    </div>
  );
}

function HeaderBadge() {
  return (
    <div className="remixRequestsHeaderWrap">
      <div className="remixRequestsHeaderBadge">
        <div className="remixRequestsHeaderText" aria-label="Remix Requests">
          Remix Requests
        </div>
      </div>
    </div>
  );
}

function FooterBanner({ mode }: { mode: "featured" | "requests" }) {
  return (
    <div className="remixRequestsFooter">
      <div className="remixRequestsFooterBadge">
        <div className="remixRequestsFooterText">
          {mode === "requests" ? "Vote on the app now!" : "Request on the app now!"}
        </div>
      </div>
    </div>
  );
}

function BillboardCard({
  item,
  side,
  defaultAlbumArtUrl,
  showNumber,
}: {
  item: VisibleCard;
  side: "left" | "right";
  defaultAlbumArtUrl?: string | null;
  showNumber: boolean;
}) {
  const upvotes = Number(item.upvotes || 0);
  const downvotes = Number(item.downvotes || 0);
  const score = Number(item.score || 0);

  return (
    <article className={`remixRequestsCard is-${side}`}>
      {showNumber ? (
        <div className="remixRequestsCardNumber" aria-hidden="true">
          <div className="remixRequestsCardNumberText">{item.visualNumber}</div>
        </div>
      ) : null}

      <div className={`remixRequestsCardMain ${showNumber ? "" : "no-number"}`}>
        <div className="remixRequestsArtWrap">
          <Artwork src={item.artworkUrl} alt={`${item.title} artwork`} defaultSrc={defaultAlbumArtUrl} />
        </div>

        <div className="remixRequestsCardText">
          <div className="remixRequestsTitle">{item.title}</div>
          <div className="remixRequestsArtist">{item.artist}</div>

          {showNumber ? (
            <div className="remixRequestsVotes">
              <div className="remixRequestsVoteChip">{upvotes} 👍</div>
              <div className="remixRequestsVoteChip">{downvotes} 👎</div>
              <div className="remixRequestsFireChip">{score} 🔥</div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
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
  const [bad, setBad] = useState(false);
  const finalSrc = !bad && src ? src : defaultSrc || null;

  if (!finalSrc) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          fontWeight: 1000,
          fontSize: "clamp(24px, 5vw, 44px)",
          letterSpacing: 1,
          background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
          color: "#fff7ea",
          textTransform: "uppercase",
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
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}
