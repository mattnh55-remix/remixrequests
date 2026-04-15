"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

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

const EMPTY_CTA_MESSAGES = [
  "SCAN THE CODE AT YOUR TABLE",
  "REQUEST YOUR SONG",
  "BOOST YOUR FAVORITES",
  "SEND A SHOUTOUT",
];

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
  const [ctaIndex, setCtaIndex] = useState(0);
  const [featuredStart, setFeaturedStart] = useState(0);

  const prevTopId = useRef<string | null>(null);

  const nowPlaying = playNow[0] || upNext[0] || null;
  const queueList = upNext.slice(0, 2);
  const topIsBoosted = Boolean(
    nowPlaying && (nowPlaying.isBoosted || nowPlaying.boosted || nowPlaying.wasBoosted)
  );
  const showFeatured = queueList.length === 0;
  const featuredVisible = featuredSongs.length <= 2
    ? featuredSongs
    : featuredSongs.slice(featuredStart, featuredStart + 2);

  useEffect(() => {
    function updateScale() {
      const h = window.innerHeight || 1080;
      const w = window.innerWidth || 1080;
      const heightScale = h / 1080;
      const widthScale = w / 720;
      const nextScale = Math.max(0.92, Math.min(1.55, Math.min(heightScale, widthScale) * 1.08));
      setTvScale(Number(nextScale.toFixed(3)));
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCtaIndex((prev) => (prev + 1) % EMPTY_CTA_MESSAGES.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFeaturedStart((prev) => {
        if (featuredSongs.length <= 2) return 0;
        const next = prev + 2;
        return next >= featuredSongs.length ? 0 : next;
      });
    }, 10000);

    return () => window.clearInterval(timer);
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

  async function loadFeatured() {
    try {
      const res = await fetch(`/api/public/featured-songs/${location}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      setFeaturedSongs(
        items.map((s: any) => ({
          id: String(s.id),
          title: String(s.title || ""),
          artist: String(s.artist || ""),
          artworkUrl: s.artworkUrl || undefined,
          score: 0,
          upvotes: 0,
          downvotes: 0,
        }))
      );
    } catch {
      setFeaturedSongs([]);
    }
  }

  useEffect(() => {
    void tickQueue();
    void loadFeatured();
    void loadRules();

    const queueTimer = window.setInterval(() => void tickQueue(), 3000);
    const featuredTimer = window.setInterval(() => void loadFeatured(), 15000);
    const rulesTimer = window.setInterval(() => void loadRules(), 15000);

    return () => {
      window.clearInterval(queueTimer);
      window.clearInterval(featuredTimer);
      window.clearInterval(rulesTimer);
    };
  }, [location]);

  useEffect(() => {
    const topId = playNow[0]?.id ?? null;
    if (!topId) return;

    if (prevTopId.current && prevTopId.current !== topId) {
      setBoostFlash(true);
      const timer = window.setTimeout(() => setBoostFlash(false), 900);
      prevTopId.current = topId;
      return () => window.clearTimeout(timer);
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
      className={`remixQueueTvRoot ${boostFlash ? "remixQueueTvFlash" : ""}`}
      style={{ ["--tvScale" as any]: tvScale } as CSSProperties}
    >
      <div className="remixQueueTvGlow remixQueueTvGlowA" />
      <div className="remixQueueTvGlow remixQueueTvGlowB" />
      <div className="remixQueueTvGlow remixQueueTvGlowC" />
      <div className="remixQueueTvBeam remixQueueTvBeamA" />
      <div className="remixQueueTvBeam remixQueueTvBeamB" />
      <div className="remixQueueTvGrid" />

      <main className="remixQueueTvStage">
        <section className="remixQueueHeroCard">
          <div className="remixQueueHeroTopline">
            <div className="remixQueueHeroLabelWrap">
              <span className="remixQueueHeroLabel">Now Playing</span>
              {topIsBoosted ? (
                <span className="remixQueueHeroBoost">Boosted</span>
              ) : null}
            </div>
            <div className="remixQueueHeroDots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="remixQueueHeroBody">
            <div className="remixQueueHeroArtShell">
              <div className="remixQueueHeroArtFrame">
                <div className="remixQueueHeroArtAura" />
                <div className="remixQueueHeroArtLayer" style={{ opacity: showA ? 1 : 0 }}>
                  <Artwork src={artA} alt="" defaultSrc={defaultAlbumArtUrl} />
                </div>
                <div className="remixQueueHeroArtLayer" style={{ opacity: showA ? 0 : 1 }}>
                  <Artwork src={artB} alt="" defaultSrc={defaultAlbumArtUrl} />
                </div>
              </div>
            </div>

            <div className="remixQueueHeroMeta">
              <div className={`remixQueueHeroTitle ${!nowPlaying ? "is-empty" : ""}`}>
                {nowPlaying?.title || "You Control The Music"}
              </div>
              <div className={`remixQueueHeroArtist ${!nowPlaying ? "is-empty" : ""}`}>
                {nowPlaying?.artist || EMPTY_CTA_MESSAGES[ctaIndex]}
              </div>

              <div className="remixQueueHeroFooter">
                <AudioPulse />
                <div className="remixQueueHeroFooterText">
                  {nowPlaying
                    ? "Vote and boost from your phone"
                    : "Pick the next song from your table"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="remixQueueLowerPanel">
          <div className="remixQueuePanelHeader">
            <div className="remixQueuePanelTitle">{showFeatured ? "Featured at Remix" : "Up Next"}</div>
            <div className="remixQueuePanelKicker">
              {showFeatured ? "Crowd favorites" : "Big picks coming up"}
            </div>
          </div>

          <div className="remixQueueLowerContent">
            {showFeatured ? (
              featuredVisible.length > 0 ? (
                featuredVisible.map((item, index) => (
                  <FeaturedBillboardCard
                    key={`${item.id}-${index}`}
                    item={item}
                    defaultAlbumArtUrl={defaultAlbumArtUrl}
                  />
                ))
              ) : (
                <div className="remixQueueLoadingState">Loading vibe...</div>
              )
            ) : (
              queueList.map((item, index) => (
                <QueueBillboardCard
                  key={item.id}
                  item={item}
                  index={index}
                  defaultAlbumArtUrl={defaultAlbumArtUrl}
                />
              ))
            )}
          </div>
        </section>

        <section className="remixQueueBottomBar">
          <div className="remixQueueBottomText">Scan the code at your table</div>
          <div className="remixQueueBottomDivider" />
          <div className="remixQueueBottomText remixQueueBottomTextAccent">
            Request songs • Vote • Boost • Shoutout
          </div>
        </section>
      </main>

      <style jsx global>{`
        .remixQueueTvRoot {
          --bgA: #050816;
          --bgB: #081226;
          --bgC: #120820;
          --line: rgba(255, 255, 255, 0.11);
          --softLine: rgba(255, 255, 255, 0.06);
          --text: #ffffff;
          --muted: rgba(255, 255, 255, 0.78);
          --cyan: #00f7ff;
          --pink: #ff39d4;
          --blue: #5d8cff;
          --card: rgba(10, 17, 38, 0.78);
          --cardStrong: rgba(12, 19, 45, 0.9);
          --glowA: 0 0 calc(20px * var(--tvScale)) rgba(0, 247, 255, 0.16);
          --glowB: 0 0 calc(26px * var(--tvScale)) rgba(255, 57, 212, 0.18);
          --shadow: 0 calc(18px * var(--tvScale)) calc(40px * var(--tvScale)) rgba(0, 0, 0, 0.32);
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          color: var(--text);
          background:
            radial-gradient(circle at 18% 12%, rgba(0, 247, 255, 0.11), transparent 28%),
            radial-gradient(circle at 88% 14%, rgba(255, 57, 212, 0.12), transparent 30%),
            radial-gradient(circle at 50% 110%, rgba(93, 140, 255, 0.14), transparent 40%),
            linear-gradient(180deg, var(--bgA) 0%, var(--bgB) 52%, var(--bgC) 100%);
        }

        .remixQueueTvGlow,
        .remixQueueTvBeam,
        .remixQueueTvGrid {
          pointer-events: none;
          position: absolute;
          inset: 0;
        }

        .remixQueueTvGlow {
          border-radius: 999px;
          filter: blur(calc(80px * var(--tvScale)));
          mix-blend-mode: screen;
          opacity: 0.22;
          animation: remixQueueFloatGlow 18s ease-in-out infinite;
        }

        .remixQueueTvGlowA {
          width: 52vw;
          height: 52vw;
          left: -16vw;
          top: -12vw;
          background: radial-gradient(circle, rgba(0, 247, 255, 0.45), transparent 68%);
        }

        .remixQueueTvGlowB {
          width: 40vw;
          height: 40vw;
          right: -10vw;
          top: 10vh;
          background: radial-gradient(circle, rgba(255, 57, 212, 0.4), transparent 70%);
          animation-delay: -6s;
        }

        .remixQueueTvGlowC {
          width: 42vw;
          height: 42vw;
          left: 28vw;
          bottom: -18vw;
          background: radial-gradient(circle, rgba(93, 140, 255, 0.34), transparent 72%);
          animation-delay: -10s;
        }

        .remixQueueTvBeam {
          mix-blend-mode: screen;
          opacity: 0.18;
          filter: blur(calc(26px * var(--tvScale)));
        }

        .remixQueueTvBeamA {
          background: linear-gradient(135deg, transparent 34%, rgba(0, 247, 255, 0.16) 50%, transparent 66%);
          animation: remixQueueBeamMoveA 14s ease-in-out infinite alternate;
        }

        .remixQueueTvBeamB {
          background: linear-gradient(225deg, transparent 30%, rgba(255, 57, 212, 0.14) 49%, transparent 68%);
          animation: remixQueueBeamMoveB 16s ease-in-out infinite alternate;
        }

        .remixQueueTvGrid {
          opacity: 0.08;
          background-image:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: calc(34px * var(--tvScale)) calc(34px * var(--tvScale));
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.95));
        }

        .remixQueueTvStage {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: grid;
          grid-template-rows: minmax(calc(390px * var(--tvScale)), 0.92fr) minmax(calc(310px * var(--tvScale)), 0.88fr) auto;
          gap: calc(18px * var(--tvScale));
          padding: calc(24px * var(--tvScale));
          box-sizing: border-box;
        }

        .remixQueueHeroCard,
        .remixQueueLowerPanel,
        .remixQueueBottomBar {
          position: relative;
          border: 1px solid var(--line);
          background: linear-gradient(180deg, rgba(14, 22, 46, 0.82), rgba(8, 13, 30, 0.84));
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .remixQueueHeroCard::before,
        .remixQueueLowerPanel::before,
        .remixQueueBottomBar::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.06), transparent 28%, transparent 72%, rgba(255,255,255,0.04));
          pointer-events: none;
        }

        .remixQueueHeroCard {
          border-radius: calc(34px * var(--tvScale));
          padding: calc(20px * var(--tvScale));
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: calc(16px * var(--tvScale));
        }

        .remixQueueHeroTopline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: calc(12px * var(--tvScale));
        }

        .remixQueueHeroLabelWrap {
          display: flex;
          align-items: center;
          gap: calc(12px * var(--tvScale));
          min-width: 0;
          flex-wrap: wrap;
        }

        .remixQueueHeroLabel,
        .remixQueueHeroBoost {
          display: inline-flex;
          align-items: center;
          min-height: calc(38px * var(--tvScale));
          border-radius: 999px;
          padding: 0 calc(16px * var(--tvScale));
          font-size: clamp(13px, calc(17px * var(--tvScale)), 22px);
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 1.2px;
        }

        .remixQueueHeroLabel {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
        }

        .remixQueueHeroBoost {
          background: linear-gradient(90deg, rgba(255,57,212,0.24), rgba(0,247,255,0.16));
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: var(--glowB);
        }

        .remixQueueHeroDots {
          display: inline-flex;
          align-items: center;
          gap: calc(8px * var(--tvScale));
          flex-shrink: 0;
        }

        .remixQueueHeroDots span {
          width: calc(10px * var(--tvScale));
          height: calc(10px * var(--tvScale));
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(0,247,255,0.95), rgba(255,57,212,0.9));
          box-shadow: var(--glowA);
          animation: remixQueueDotPulse 1.8s ease-in-out infinite;
        }

        .remixQueueHeroDots span:nth-child(2) { animation-delay: 200ms; }
        .remixQueueHeroDots span:nth-child(3) { animation-delay: 400ms; }

        .remixQueueHeroBody {
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(calc(240px * var(--tvScale)), 0.9fr) minmax(0, 1.1fr);
          gap: calc(20px * var(--tvScale));
          align-items: center;
        }

        .remixQueueHeroArtShell {
          display: grid;
          place-items: center;
          min-height: 0;
        }

        .remixQueueHeroArtFrame {
          position: relative;
          width: min(100%, calc(360px * var(--tvScale)));
          aspect-ratio: 1 / 1;
          border-radius: calc(30px * var(--tvScale));
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 calc(32px * var(--tvScale)) rgba(0, 247, 255, 0.14);
        }

        .remixQueueHeroArtAura {
          position: absolute;
          inset: -34%;
          background:
            radial-gradient(circle at 30% 24%, rgba(0,247,255,0.24), transparent 55%),
            radial-gradient(circle at 80% 80%, rgba(255,57,212,0.24), transparent 58%);
          filter: blur(calc(28px * var(--tvScale)));
          opacity: 0.9;
          mix-blend-mode: screen;
          animation: remixQueueHeroAura 5s ease-in-out infinite;
          pointer-events: none;
          z-index: 2;
        }

        .remixQueueHeroArtLayer {
          position: absolute;
          inset: 0;
          transition: opacity 420ms ease;
        }

        .remixQueueHeroMeta {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: calc(14px * var(--tvScale));
        }

        .remixQueueHeroTitle {
          font-size: clamp(40px, calc(56px * var(--tvScale)), 74px);
          line-height: 0.95;
          font-weight: 1000;
          letter-spacing: -1.6px;
          text-shadow: 0 0 calc(16px * var(--tvScale)) rgba(255,255,255,0.12);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .remixQueueHeroTitle.is-empty {
          font-size: clamp(42px, calc(62px * var(--tvScale)), 80px);
          line-height: 0.92;
        }

        .remixQueueHeroArtist {
          font-size: clamp(22px, calc(28px * var(--tvScale)), 38px);
          line-height: 1.08;
          color: var(--muted);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .remixQueueHeroArtist.is-empty {
          color: rgba(255,255,255,0.96);
          font-weight: 900;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          animation: remixQueueCtaGlow 2.4s ease-in-out infinite;
        }

        .remixQueueHeroFooter {
          display: flex;
          align-items: center;
          gap: calc(14px * var(--tvScale));
          margin-top: calc(4px * var(--tvScale));
          flex-wrap: wrap;
        }

        .remixQueueHeroFooterText {
          font-size: clamp(15px, calc(20px * var(--tvScale)), 26px);
          font-weight: 800;
          letter-spacing: 0.4px;
          color: rgba(255,255,255,0.9);
        }

        .remixQueueLowerPanel {
          border-radius: calc(30px * var(--tvScale));
          padding: calc(18px * var(--tvScale));
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: calc(14px * var(--tvScale));
        }

        .remixQueuePanelHeader {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: calc(12px * var(--tvScale));
        }

        .remixQueuePanelTitle {
          font-size: clamp(28px, calc(40px * var(--tvScale)), 54px);
          line-height: 1;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .remixQueuePanelKicker {
          font-size: clamp(14px, calc(18px * var(--tvScale)), 24px);
          color: rgba(255,255,255,0.72);
          text-align: right;
          font-weight: 800;
        }

        .remixQueueLowerContent {
          min-height: 0;
          display: grid;
          gap: calc(14px * var(--tvScale));
          align-content: stretch;
        }

        .remixQueueCard {
          min-height: 0;
          position: relative;
          display: grid;
          gap: calc(14px * var(--tvScale));
          border-radius: calc(24px * var(--tvScale));
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(135deg, rgba(28, 16, 48, 0.88), rgba(13, 18, 42, 0.84));
          overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        }

        .remixQueueCard::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transform: translateX(-130%) skewX(-18deg);
          animation: remixQueueShimmer 8.8s ease-in-out infinite;
          pointer-events: none;
        }

        .remixQueueNextCard {
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          padding: calc(14px * var(--tvScale)) calc(16px * var(--tvScale));
        }

        .remixQueueNextRank {
          width: calc(60px * var(--tvScale));
          font-size: clamp(28px, calc(40px * var(--tvScale)), 52px);
          font-weight: 1000;
          line-height: 1;
          text-align: center;
          text-shadow: 0 0 calc(14px * var(--tvScale)) rgba(255,255,255,0.16);
        }

        .remixQueueNextMeta {
          min-width: 0;
          display: grid;
          gap: calc(8px * var(--tvScale));
        }

        .remixQueueNextTitle {
          font-size: clamp(26px, calc(34px * var(--tvScale)), 46px);
          line-height: 0.98;
          font-weight: 1000;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .remixQueueNextArtist {
          font-size: clamp(16px, calc(22px * var(--tvScale)), 30px);
          color: var(--muted);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .remixQueueNextStats {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: calc(8px * var(--tvScale));
        }

        .remixQueueStatPill {
          min-width: calc(84px * var(--tvScale));
          min-height: calc(44px * var(--tvScale));
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 calc(16px * var(--tvScale));
          font-size: clamp(15px, calc(19px * var(--tvScale)), 25px);
          font-weight: 1000;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          white-space: nowrap;
        }

        .remixQueueStatPill.score {
          background: rgba(0,247,255,0.1);
          border-color: rgba(0,247,255,0.25);
          box-shadow: var(--glowA);
        }

        .remixQueueFeaturedCard {
          grid-template-columns: calc(118px * var(--tvScale)) minmax(0, 1fr);
          align-items: center;
          padding: calc(14px * var(--tvScale));
          animation: remixQueueCardFloat 8s ease-in-out infinite;
        }

        .remixQueueFeaturedCard:nth-child(2) {
          animation-delay: -1.8s;
        }

        .remixQueueFeaturedArt {
          position: relative;
          width: calc(118px * var(--tvScale));
          height: calc(118px * var(--tvScale));
          border-radius: calc(18px * var(--tvScale));
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.05);
        }

        .remixQueueFeaturedAura {
          position: absolute;
          inset: -38%;
          background:
            radial-gradient(circle at 30% 22%, rgba(0,247,255,0.2), transparent 55%),
            radial-gradient(circle at 78% 78%, rgba(255,57,212,0.2), transparent 58%);
          filter: blur(calc(18px * var(--tvScale)));
          opacity: 0.8;
          mix-blend-mode: screen;
          animation: remixQueueHeroAura 5.6s ease-in-out infinite;
        }

        .remixQueueFeaturedMeta {
          min-width: 0;
          display: grid;
          gap: calc(8px * var(--tvScale));
        }

        .remixQueueFeaturedEyebrow {
          font-size: clamp(12px, calc(15px * var(--tvScale)), 20px);
          font-weight: 1000;
          color: rgba(255,255,255,0.76);
          text-transform: uppercase;
          letter-spacing: 1.2px;
        }

        .remixQueueFeaturedTitle {
          font-size: clamp(24px, calc(30px * var(--tvScale)), 42px);
          line-height: 1;
          font-weight: 1000;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .remixQueueFeaturedArtist {
          font-size: clamp(16px, calc(21px * var(--tvScale)), 28px);
          color: var(--muted);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .remixQueueLoadingState {
          min-height: calc(130px * var(--tvScale));
          display: grid;
          place-items: center;
          font-size: clamp(18px, calc(24px * var(--tvScale)), 30px);
          color: var(--muted);
        }

        .remixQueueBottomBar {
          border-radius: calc(22px * var(--tvScale));
          min-height: calc(84px * var(--tvScale));
          display: flex;
          align-items: center;
          justify-content: center;
          gap: calc(16px * var(--tvScale));
          padding: calc(14px * var(--tvScale)) calc(18px * var(--tvScale));
          text-align: center;
          flex-wrap: wrap;
        }

        .remixQueueBottomText {
          font-size: clamp(16px, calc(21px * var(--tvScale)), 28px);
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.88);
        }

        .remixQueueBottomTextAccent {
          color: #fff;
          text-shadow:
            0 0 calc(10px * var(--tvScale)) rgba(0,247,255,0.26),
            0 0 calc(16px * var(--tvScale)) rgba(255,57,212,0.16);
        }

        .remixQueueBottomDivider {
          width: calc(2px * var(--tvScale));
          height: calc(28px * var(--tvScale));
          background: linear-gradient(180deg, rgba(0,247,255,0.1), rgba(255,57,212,0.9), rgba(0,247,255,0.1));
          border-radius: 999px;
        }

        .remixQueueTvFlash::before {
          content: "";
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 50% 36%, rgba(255,57,212,0.18), transparent 55%),
            radial-gradient(circle at 42% 64%, rgba(0,247,255,0.12), transparent 60%);
          animation: remixQueueFlashAnim 900ms ease-out 1;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: screen;
        }

        @keyframes remixQueueFloatGlow {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(1.8vw, -1.1vw, 0) scale(1.07); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes remixQueueBeamMoveA {
          0% { transform: translateX(-4%) translateY(-2%) scale(1); }
          100% { transform: translateX(5%) translateY(3%) scale(1.04); }
        }

        @keyframes remixQueueBeamMoveB {
          0% { transform: translateX(2%) translateY(2%) scale(1); }
          100% { transform: translateX(-4%) translateY(-3%) scale(1.05); }
        }

        @keyframes remixQueueHeroAura {
          0%, 100% { transform: scale(0.98); opacity: 0.72; }
          50% { transform: scale(1.05); opacity: 0.98; }
        }

        @keyframes remixQueueDotPulse {
          0%, 100% { transform: scale(0.85); opacity: 0.72; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        @keyframes remixQueueShimmer {
          0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
          20% { opacity: 0.45; }
          100% { transform: translateX(170%) skewX(-18deg); opacity: 0; }
        }

        @keyframes remixQueueCardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(calc(-4px * var(--tvScale))); }
        }

        @keyframes remixQueueCtaGlow {
          0%, 100% {
            opacity: 0.84;
            text-shadow:
              0 0 0 rgba(0,247,255,0),
              0 0 0 rgba(255,57,212,0);
          }
          50% {
            opacity: 1;
            text-shadow:
              0 0 calc(10px * var(--tvScale)) rgba(0,247,255,0.3),
              0 0 calc(16px * var(--tvScale)) rgba(255,57,212,0.18);
          }
        }

        @keyframes remixQueueFlashAnim {
          0% { opacity: 0; }
          18% { opacity: 1; }
          100% { opacity: 0; }
        }

        @media (max-height: 950px) {
          .remixQueueTvStage {
            grid-template-rows: minmax(calc(350px * var(--tvScale)), 0.95fr) minmax(calc(280px * var(--tvScale)), 0.85fr) auto;
          }
        }

        @media (max-width: 760px) {
          .remixQueueHeroBody {
            grid-template-columns: 1fr;
            gap: calc(16px * var(--tvScale));
          }

          .remixQueueHeroArtFrame {
            width: min(100%, calc(260px * var(--tvScale)));
          }

          .remixQueuePanelHeader {
            align-items: start;
            flex-direction: column;
          }

          .remixQueueNextCard {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .remixQueueNextStats {
            grid-column: 1 / -1;
            flex-direction: row;
            justify-content: flex-start;
            padding-left: calc(60px * var(--tvScale));
          }
        }
      `}</style>
    </div>
  );
}

function QueueBillboardCard({
  item,
  index,
  defaultAlbumArtUrl,
}: {
  item: QueueItem;
  index: number;
  defaultAlbumArtUrl?: string | null;
}) {
  const upvotes = Number(item.upvotes || 0);
  const score = Number(item.score || 0);

  return (
    <article className="remixQueueCard remixQueueNextCard">
      <div className="remixQueueNextRank">{index + 1}</div>

      <div className="remixQueueNextMeta">
        <div className="remixQueueNextTitle">{item.title}</div>
        <div className="remixQueueNextArtist">{item.artist}</div>
      </div>

      <div className="remixQueueNextStats">
        <div className="remixQueueStatPill">👍 {upvotes}</div>
        <div className="remixQueueStatPill score">S {score}</div>
      </div>
    </article>
  );
}

function FeaturedBillboardCard({
  item,
  defaultAlbumArtUrl,
}: {
  item: QueueItem;
  defaultAlbumArtUrl?: string | null;
}) {
  return (
    <article className="remixQueueCard remixQueueFeaturedCard">
      <div className="remixQueueFeaturedArt">
        <Artwork
          src={item.artworkUrl}
          alt={`${item.title} artwork`}
          defaultSrc={defaultAlbumArtUrl}
        />
        <div className="remixQueueFeaturedAura" />
      </div>

      <div className="remixQueueFeaturedMeta">
        <div className="remixQueueFeaturedEyebrow">Featured at Remix</div>
        <div className="remixQueueFeaturedTitle">{item.title}</div>
        <div className="remixQueueFeaturedArtist">{item.artist}</div>
      </div>
    </article>
  );
}

function AudioPulse() {
  return (
    <div className="neonEQ" aria-hidden="true">
      <span /><span /><span /><span /><span />
      <span /><span /><span /><span /><span />
      <style jsx>{`
        .neonEQ {
          height: calc(28px * var(--tvScale));
          display: flex;
          align-items: flex-end;
          gap: calc(4px * var(--tvScale));
        }

        .neonEQ > span {
          width: calc(5px * var(--tvScale));
          height: calc(10px * var(--tvScale));
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(0,247,255,0.92), rgba(255,57,212,0.86));
          animation: eq 900ms ease-in-out infinite;
          box-shadow: 0 0 calc(10px * var(--tvScale)) rgba(0,247,255,0.24);
        }

        .neonEQ > span:nth-child(2) { animation-delay: 120ms; }
        .neonEQ > span:nth-child(3) { animation-delay: 240ms; }
        .neonEQ > span:nth-child(4) { animation-delay: 360ms; }
        .neonEQ > span:nth-child(5) { animation-delay: 480ms; }
        .neonEQ > span:nth-child(6) { animation-delay: 180ms; }
        .neonEQ > span:nth-child(7) { animation-delay: 300ms; }
        .neonEQ > span:nth-child(8) { animation-delay: 420ms; }
        .neonEQ > span:nth-child(9) { animation-delay: 540ms; }
        .neonEQ > span:nth-child(10) { animation-delay: 660ms; }

        @keyframes eq {
          0%, 100% { height: calc(8px * var(--tvScale)); opacity: 0.75; }
          50% { height: calc(26px * var(--tvScale)); opacity: 1; }
        }
      `}</style>
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
