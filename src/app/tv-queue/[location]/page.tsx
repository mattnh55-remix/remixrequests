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

export default function TvQueuePortraitPage({
  params,
}: {
  params: { location: string };
}) {
  const location = params.location;

  const [playNow, setPlayNow] = useState<QueueItem[]>([]);
  const [upNext, setUpNext] = useState<QueueItem[]>([]);
  const [boostFlash, setBoostFlash] = useState(false);
  const [artA, setArtA] = useState<string | null>(null);
  const [artB, setArtB] = useState<string | null>(null);
  const [showA, setShowA] = useState(true);
  const [defaultAlbumArtUrl, setDefaultAlbumArtUrl] = useState<string | null>(null);
  const [featuredSongs, setFeaturedSongs] = useState<QueueItem[]>([]);
  const [tvScale, setTvScale] = useState(1);

  const prevTopId = useRef<string | null>(null);

  const requestUrl = useMemo(
    () => `https://skateremix.com/request/${location}`,
    [location]
  );

  const qrSrc = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      requestUrl
    )}`;
  }, [requestUrl]);

  const nowPlaying = playNow[0] || upNext[0] || null;
  const queueList = upNext.slice(0, 4);
  const topIsBoosted = Boolean(
    nowPlaying && (nowPlaying.isBoosted || nowPlaying.boosted || nowPlaying.wasBoosted)
  );

  useEffect(() => {
    function updateScale() {
      const h = window.innerHeight || 1080;
      const nextScale = Math.max(0.8, Math.min(1.22, h / 1080));
      setTvScale(Number(nextScale.toFixed(3)));
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    if (!featuredSongs.length) return;

    const t = window.setInterval(() => {
      setFeaturedSongs((prev) => [...prev].sort(() => Math.random() - 0.5));
    }, 10000);

    return () => window.clearInterval(t);
  }, [featuredSongs.length]);

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

  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await fetch(`/api/public/featured-songs/${location}`, {
          cache: "no-store",
        });
        const data = await res.json();

        const items = Array.isArray(data?.items) ? data.items : [];

        setFeaturedSongs(
          items.map((s: any) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            artworkUrl: s.artworkUrl,
            score: 0,
            upvotes: 0,
            downvotes: 0,
          }))
        );
      } catch {
        setFeaturedSongs([]);
      }
    }

    void tickQueue();
    void loadFeatured();
    void loadRules();

    const q = window.setInterval(() => void tickQueue(), 3000);
    const r = window.setInterval(() => void loadRules(), 15000);

    return () => {
      window.clearInterval(q);
      window.clearInterval(r);
    };
  }, [location]);

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

  return (
    <div
      className={`neonRoot remixTvRoot ${boostFlash ? "remixTvFlash" : ""}`}
      style={{ ["--tvScale" as any]: tvScale } as CSSProperties}
    >
      <div className="remixTvOrb remixTvOrbA" />
      <div className="remixTvOrb remixTvOrbB" />
      <div className="remixTvOrb remixTvOrbC" />
      <div className="remixTvSweep remixTvSweepA" />
      <div className="remixTvSweep remixTvSweepB" />

      <div className="remixTvQueueOnlyWrap">
        <PortraitQueueOnlyPanel
          nowPlaying={nowPlaying}
          queueList={queueList}
          featuredSongs={featuredSongs}
          topIsBoosted={topIsBoosted}
          showA={showA}
          artA={artA}
          artB={artB}
          qrSrc={qrSrc}
          defaultAlbumArtUrl={defaultAlbumArtUrl}
        />
      </div>

      <style jsx global>{`
        .remixTvRoot {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 16%, rgba(0, 247, 255, 0.08), transparent 28%),
            radial-gradient(circle at 84% 12%, rgba(255, 57, 212, 0.1), transparent 26%),
            radial-gradient(circle at 66% 78%, rgba(0, 247, 255, 0.07), transparent 28%),
            linear-gradient(180deg, #050814 0%, #061029 55%, #040710 100%);
          min-height: 100vh;
        }

        .remixTvOrb,
        .remixTvSweep {
          pointer-events: none;
          position: absolute;
          mix-blend-mode: screen;
        }

        .remixTvOrb {
          border-radius: 999px;
          filter: blur(calc(76px * var(--tvScale)));
          opacity: 0.22;
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

        .remixTvSweep {
          inset: -20% auto auto auto;
          width: 60vw;
          height: 120vh;
          filter: blur(calc(24px * var(--tvScale)));
          opacity: 0.18;
          transform: rotate(12deg);
          animation: remixTvSweep 11s ease-in-out infinite alternate;
        }

        .remixTvSweepA {
          left: 18%;
          background: linear-gradient(180deg, transparent, rgba(0,247,255,0.28), transparent 70%);
        }

        .remixTvSweepB {
          right: -8%;
          background: linear-gradient(180deg, transparent, rgba(255,57,212,0.24), transparent 70%);
          animation-delay: -4s;
          transform: rotate(-10deg);
        }

        @keyframes remixTvOrbFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(1.8vw, -1.2vw, 0) scale(1.07); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes remixTvSweep {
          0% { opacity: 0.12; transform: translateX(0) rotate(12deg); }
          50% { opacity: 0.22; transform: translateX(2vw) rotate(16deg); }
          100% { opacity: 0.14; transform: translateX(-1vw) rotate(10deg); }
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

        @keyframes remixTvCardBreathe {
          0%, 100% { transform: translateY(0); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02), 0 0 0 rgba(0,0,0,0); }
          50% { transform: translateY(calc(-2px * var(--tvScale))); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02), 0 calc(10px * var(--tvScale)) calc(26px * var(--tvScale)) rgba(0,0,0,0.16); }
        }

        @keyframes remixTvFeaturedFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(calc(-4px * var(--tvScale))); }
        }

        @keyframes remixTvShimmer {
          0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
          20% { opacity: 0.5; }
          100% { transform: translateX(180%) skewX(-18deg); opacity: 0; }
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

        .remixTvQueueOnlyWrap {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          padding: calc(22px * var(--tvScale));
          box-sizing: border-box;
        }

        .remixTvQueueOnlyPanel {
          min-height: calc(100vh - calc(44px * var(--tvScale)));
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto;
          gap: calc(18px * var(--tvScale));
          padding: calc(20px * var(--tvScale));
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
          font-size: clamp(28px, calc(42px * var(--tvScale)), 54px);
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.18);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTopCard {
          display: grid;
          align-items: center;
          border-radius: calc(28px * var(--tvScale));
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(
            90deg,
            rgba(8, 16, 40, 0.92),
            rgba(12, 26, 56, 0.76),
            rgba(31, 15, 50, 0.66)
          );
          position: relative;
          overflow: hidden;
          grid-template-columns: calc(144px * var(--tvScale)) 1fr;
          gap: calc(18px * var(--tvScale));
          min-height: calc(150px * var(--tvScale));
          padding: calc(16px * var(--tvScale));
        }

        .remixTvTopCard::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transform: translateX(-120%) skewX(-18deg);
          animation: remixTvShimmer 8.5s ease-in-out infinite;
          pointer-events: none;
        }

        .remixTvTopCardBoosted {
          box-shadow: var(--glowB);
        }

        .remixTvTopArtWrap {
          display: flex;
          align-items: center;
        }

        .remixTvTopArtFrame {
          width: calc(144px * var(--tvScale));
          height: calc(144px * var(--tvScale));
          border-radius: calc(26px * var(--tvScale));
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.05);
          box-shadow: var(--glowA), var(--shadow);
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
          filter: blur(calc(20px * var(--tvScale)));
          opacity: 0.85;
          z-index: 2;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .remixTvTopMeta {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .remixTvTopSong {
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.55px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 0 12px rgba(255,255,255,0.12);
          font-size: clamp(28px, calc(38px * var(--tvScale)), 50px);
        }

        .remixTvTopArtist {
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: calc(8px * var(--tvScale));
          font-size: clamp(18px, calc(22px * var(--tvScale)), 30px);
        }

        .remixTvTopMetaRow {
          display: flex;
          align-items: center;
          gap: calc(12px * var(--tvScale));
          margin-top: calc(14px * var(--tvScale));
          flex-wrap: wrap;
        }

        .remixTvTopBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: calc(38px * var(--tvScale));
          padding: 0 calc(16px * var(--tvScale));
          border-radius: 999px;
          font-size: clamp(12px, calc(16px * var(--tvScale)), 18px);
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

        .remixTvTop10Block {
          min-height: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: calc(12px * var(--tvScale));
          align-content: start;
        }

        .remixTvTop10Header {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: calc(12px * var(--tvScale));
          font-size: clamp(18px, calc(24px * var(--tvScale)), 28px);
          font-weight: 1000;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.86);
          padding: 4px 4px 0;
        }

        .remixTvTop10List {
          display: grid;
          gap: calc(14px * var(--tvScale));
          align-content: start;
          min-height: 0;
          overflow: hidden;
        }

        .remixTvTop10Block[data-featured="true"] .remixTvTop10List {
          gap: calc(18px * var(--tvScale));
          justify-items: center;
        }

        .remixTvTop10Row {
          display: grid;
          grid-template-columns: calc(52px * var(--tvScale)) minmax(0, 1fr) auto;
          gap: calc(14px * var(--tvScale));
          align-items: center;
          padding: calc(16px * var(--tvScale)) calc(18px * var(--tvScale));
          border-radius: calc(22px * var(--tvScale));
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(
            90deg,
            rgba(28, 16, 48, 0.76),
            rgba(16, 18, 45, 0.72),
            rgba(40, 13, 54, 0.62)
          );
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
          animation: remixTvCardBreathe 8s ease-in-out infinite;
        }

        .remixTvTop10Row:nth-child(2) { animation-delay: -1.2s; }
        .remixTvTop10Row:nth-child(3) { animation-delay: -2.4s; }
        .remixTvTop10Row:nth-child(4) { animation-delay: -3.6s; }

        .remixTvTop10Pos {
          font-size: clamp(24px, calc(34px * var(--tvScale)), 40px);
          font-weight: 1000;
          line-height: 1;
          text-align: center;
          color: #fff;
          text-shadow: 0 0 14px rgba(255,255,255,0.18);
        }

        .remixTvTop10Text {
          min-width: 0;
        }

        .remixTvTop10Song {
          font-size: clamp(18px, calc(24px * var(--tvScale)), 34px);
          font-weight: 1000;
          line-height: 1.08;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10Artist {
          margin-top: calc(6px * var(--tvScale));
          font-size: clamp(14px, calc(18px * var(--tvScale)), 24px);
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10MetaRow {
          margin-top: calc(10px * var(--tvScale));
          display: flex;
          align-items: center;
          gap: calc(10px * var(--tvScale));
          flex-wrap: wrap;
        }

        .remixTvTop10VoteRail {
          display: inline-flex;
          align-items: center;
          gap: calc(8px * var(--tvScale));
        }

        .remixTvTop10VotePill,
        .remixTvTop10Score {
          min-width: calc(48px * var(--tvScale));
          height: calc(40px * var(--tvScale));
          padding: 0 calc(14px * var(--tvScale));
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: clamp(13px, calc(18px * var(--tvScale)), 21px);
          font-weight: 1000;
          line-height: 1;
          white-space: nowrap;
        }

        .remixTvTop10VotePill {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        }

        .remixTvTop10Score {
          background: rgba(0,247,255,0.09);
          border: 1px solid rgba(0,247,255,0.24);
          box-shadow: var(--glowA);
          align-self: center;
        }

        .remixTvFeaturedCard {
          width: min(calc(360px * var(--tvScale)), 88%);
          display: grid;
          justify-items: center;
          text-align: center;
          gap: calc(10px * var(--tvScale));
          padding: calc(18px * var(--tvScale)) calc(16px * var(--tvScale)) calc(16px * var(--tvScale));
          border-radius: calc(24px * var(--tvScale));
          border: 1px solid rgba(255,255,255,0.12);
          background:
            linear-gradient(180deg, rgba(28,16,48,0.85), rgba(16,18,45,0.78), rgba(40,13,54,0.7));
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.02),
            0 calc(12px * var(--tvScale)) calc(28px * var(--tvScale)) rgba(0,0,0,0.25);
          position: relative;
          overflow: hidden;
          animation: remixTvFeaturedFloat 8s ease-in-out infinite;
        }

        .remixTvFeaturedCard:nth-child(2) { animation-delay: -1.5s; }
        .remixTvFeaturedCard:nth-child(3) { animation-delay: -3s; }

        .remixTvFeaturedCard::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transform: translateX(-130%) skewX(-18deg);
          animation: remixTvShimmer 9s ease-in-out infinite;
          pointer-events: none;
        }

        .remixTvFeaturedArtWrap {
          width: calc(180px * var(--tvScale));
          height: calc(180px * var(--tvScale));
          border-radius: calc(22px * var(--tvScale));
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.05);
        }

        .remixTvFeaturedArtGlow {
          position: absolute;
          inset: -40%;
          background:
            radial-gradient(circle at 30% 25%, rgba(0,247,255,0.22), transparent 55%),
            radial-gradient(circle at 75% 80%, rgba(255,57,212,0.2), transparent 62%);
          filter: blur(calc(22px * var(--tvScale)));
          opacity: 0.8;
          pointer-events: none;
          mix-blend-mode: screen;
          animation: remixTvPulse 5.5s ease-in-out infinite;
        }

        .remixTvFeaturedTitle {
          font-size: clamp(20px, calc(26px * var(--tvScale)), 32px);
          font-weight: 1000;
          line-height: 1.1;
          text-shadow: 0 0 10px rgba(255,255,255,0.12);
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvFeaturedArtist {
          font-size: clamp(15px, calc(20px * var(--tvScale)), 24px);
          color: var(--muted);
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvFeaturedMeta {
          display: flex;
          gap: calc(16px * var(--tvScale));
          margin-top: calc(6px * var(--tvScale));
          font-size: clamp(14px, calc(18px * var(--tvScale)), 22px);
          opacity: 0.8;
        }

        .remixTvEmptyState {
          padding: calc(20px * var(--tvScale)) 10px;
          font-size: clamp(16px, calc(22px * var(--tvScale)), 28px);
          line-height: 1.4;
          color: var(--muted);
        }

        .remixTvBottomCta {
          border-top: 1px solid rgba(255,255,255,0.12);
          margin-top: 2px;
          display: grid;
          align-items: center;
          padding-top: calc(14px * var(--tvScale));
          grid-template-columns: 1fr calc(132px * var(--tvScale));
          gap: calc(18px * var(--tvScale));
        }

        .remixTvBottomText {
          line-height: 1.06;
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 0.35px;
          font-size: clamp(15px, calc(19px * var(--tvScale)), 26px);
          text-align: left;
        }

        .remixTvBottomTextLineStrong {
          display: block;
          color: #fff;
        }

        .remixTvBottomTextLineMuted {
          display: block;
          color: rgba(255,255,255,0.7);
          margin-top: calc(5px * var(--tvScale));
        }

        .remixTvBottomQrWrap {
          justify-self: end;
          width: calc(132px * var(--tvScale));
          height: calc(132px * var(--tvScale));
          padding: calc(5px * var(--tvScale));
          border-radius: calc(16px * var(--tvScale));
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
        }

        .remixTvBottomQr {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: calc(12px * var(--tvScale));
        }

        .neonEQ {
          height: calc(24px * var(--tvScale));
          display: flex;
          align-items: flex-end;
          gap: calc(4px * var(--tvScale));
        }

        .neonEQ > span {
          width: calc(5px * var(--tvScale));
          height: calc(10px * var(--tvScale));
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(0,247,255,0.9), rgba(255,57,212,0.85));
          animation: eq 900ms ease-in-out infinite;
          box-shadow: var(--glowA);
        }

        .neonEQ > span:nth-child(2) { animation-delay: 120ms; }
        .neonEQ > span:nth-child(3) { animation-delay: 240ms; }
        .neonEQ > span:nth-child(4) { animation-delay: 360ms; }
        .neonEQ > span:nth-child(5) { animation-delay: 480ms; }

        @keyframes eq {
          0%, 100% { height: calc(7px * var(--tvScale)); opacity: 0.75; }
          50% { height: calc(22px * var(--tvScale)); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function PortraitQueueOnlyPanel({
  nowPlaying,
  queueList,
  featuredSongs,
  topIsBoosted,
  showA,
  artA,
  artB,
  qrSrc,
  defaultAlbumArtUrl,
}: {
  nowPlaying: QueueItem | null;
  queueList: QueueItem[];
  featuredSongs: QueueItem[];
  topIsBoosted: boolean;
  showA: boolean;
  artA: string | null;
  artB: string | null;
  qrSrc: string;
  defaultAlbumArtUrl?: string | null;
}) {
  return (
    <section className="neonPanel remixTvQueueOnlyPanel">
      <div className="remixTvSectionHeader remixTvQueueHeader">
        <div className="remixTvSectionTitle">Queued Up</div>
      </div>

      <TopCard
        nowPlaying={nowPlaying}
        topIsBoosted={topIsBoosted}
        showA={showA}
        artA={artA}
        artB={artB}
        defaultAlbumArtUrl={defaultAlbumArtUrl}
      >
        <div className="remixTvTopMetaRow">
          <div className="neonEQ" aria-hidden="true" style={{ marginTop: 12 }}>
            <span /><span /><span /><span /><span />
            <span /><span /><span /><span /><span />
            <span /><span /><span /><span /><span />
            <span /><span /><span /><span /><span />
          </div>
          {topIsBoosted ? (
            <div className="remixTvTopBadge remixTvTopBadge--boosted">Boosted</div>
          ) : null}
        </div>
      </TopCard>

      <Top10Block
        queueList={queueList}
        featuredSongs={featuredSongs}
        defaultAlbumArtUrl={defaultAlbumArtUrl}
      />

      <CtaBlock qrSrc={qrSrc} />
    </section>
  );
}

function TopCard({
  nowPlaying,
  topIsBoosted,
  showA,
  artA,
  artB,
  children,
  defaultAlbumArtUrl,
}: {
  nowPlaying: QueueItem | null;
  topIsBoosted: boolean;
  showA: boolean;
  artA: string | null;
  artB: string | null;
  children?: ReactNode;
  defaultAlbumArtUrl?: string | null;
}) {
  return (
    <div className={`remixTvTopCard ${topIsBoosted ? "remixTvTopCardBoosted" : ""}`}>
      <div className="remixTvTopArtWrap">
        <div className="remixTvTopArtFrame">
          <div className="remixTvTopArtGlow" />
          <div className="remixTvTopArtLayer" style={{ opacity: showA ? 1 : 0 }}>
            <Artwork src={artA} alt="" defaultSrc={defaultAlbumArtUrl} />
          </div>
          <div className="remixTvTopArtLayer" style={{ opacity: showA ? 0 : 1 }}>
            <Artwork src={artB} alt="" defaultSrc={defaultAlbumArtUrl} />
          </div>
        </div>
      </div>

      <div className="remixTvTopMeta">
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
  featuredSongs,
  defaultAlbumArtUrl,
}: {
  queueList: QueueItem[];
  featuredSongs: QueueItem[];
  defaultAlbumArtUrl?: string | null;
}) {
  const isEmpty = queueList.length === 0;
  const list = isEmpty ? featuredSongs : queueList;
  const title = isEmpty ? "Featured at Remix" : "Top 10";

  return (
    <div
      className="remixTvTop10Block"
      data-featured={isEmpty ? "true" : "false"}
    >
      <div className="remixTvTop10Header">
        <span>{title}</span>
      </div>

      <div className="remixTvTop10List">
        {list.length === 0 ? (
          <div className="remixTvEmptyState">
            Loading vibe...
          </div>
        ) : (
          list.map((item, index) => {
            const upvotes = Number(item.upvotes || 0);
            const downvotes = Number(item.downvotes || 0);
            const score = Number(item.score || 0);
            const decorative = decorativeSeed(item);

            if (isEmpty) {
              return (
                <div className="remixTvFeaturedCard" key={item.id}>
                  <div className="remixTvFeaturedArtWrap">
                    <Artwork
                      src={item.artworkUrl}
                      alt={`${item.title} artwork`}
                      defaultSrc={defaultAlbumArtUrl}
                    />
                    <div className="remixTvFeaturedArtGlow" />
                  </div>

                  <div className="remixTvFeaturedTitle">{item.title}</div>
                  <div className="remixTvFeaturedArtist">{item.artist}</div>

                  <div className="remixTvFeaturedMeta">
                    <span>👍 {decorative.up}</span>
                    <span>👎 {decorative.down}</span>
                    <span>🔥 {decorative.fire}</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="remixTvTop10Row" key={item.id}>
                <div className="remixTvTop10Pos">{index + 1}</div>

                <div className="remixTvTop10Text">
                  <div className="remixTvTop10Song">{item.title}</div>
                  <div className="remixTvTop10Artist">{item.artist}</div>

                  <div className="remixTvTop10MetaRow">
                    <div className="remixTvTop10VoteRail">
                      <div className="remixTvTop10VotePill">👎 {downvotes}</div>
                      <div className="remixTvTop10VotePill">👍 {upvotes}</div>
                    </div>
                  </div>
                </div>

                <div className="remixTvTop10Score">S {score}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CtaBlock({ qrSrc }: { qrSrc: string }) {
  return (
    <div className="remixTvBottomCta">
      <div className="remixTvBottomText">
        <span className="remixTvBottomTextLineStrong">Scan to request songs</span>
        <span className="remixTvBottomTextLineMuted">or send a shout out from your phone</span>
      </div>

      <div className="remixTvBottomQrWrap">
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
          opacity: 0.65,
          fontSize: 28,
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
