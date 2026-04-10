"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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

useEffect(() => {
  if (!featuredSongs.length) return;

  const t = setInterval(() => {
    setFeaturedSongs((prev) => [...prev].sort(() => Math.random() - 0.5));
  }, 10000); // every 10 seconds

  return () => clearInterval(t);
}, [featuredSongs.length]);

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
    void tickQueue();
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
    <div className={`neonRoot remixTvRoot ${boostFlash ? "remixTvFlash" : ""}`}>
      <div className="remixTvOrb remixTvOrbA" />
      <div className="remixTvOrb remixTvOrbB" />
      <div className="remixTvOrb remixTvOrbC" />

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
            radial-gradient(circle at 18% 16%, rgba(0, 247, 255, 0.07), transparent 28%),
            radial-gradient(circle at 84% 12%, rgba(255, 57, 212, 0.08), transparent 26%),
            radial-gradient(circle at 66% 78%, rgba(0, 247, 255, 0.06), transparent 28%),
            #050814;
          min-height: 100vh;
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
          padding: 22px;
          box-sizing: border-box;
        }

        .remixTvQueueOnlyPanel {
          min-height: calc(100vh - 44px);
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto;
          gap: 18px;
          padding: 20px;
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
          font-size: clamp(34px, 4.2vw, 54px);
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
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(
            90deg,
            rgba(8, 16, 40, 0.92),
            rgba(12, 26, 56, 0.76),
            rgba(31, 15, 50, 0.66)
          );
          position: relative;
          overflow: hidden;
          grid-template-columns: 144px 1fr;
          gap: 18px;
          min-height: 150px;
          padding: 16px;
        }

        .remixTvTopCardBoosted {
          box-shadow: var(--glowB);
        }

        .remixTvTopArtWrap {
          display: flex;
          align-items: center;
        }

        .remixTvTopArtFrame {
          width: 144px;
          height: 144px;
          border-radius: 26px;
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
          filter: blur(20px);
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
          font-size: clamp(32px, 3.8vw, 50px);
        }

        .remixTvTopArtist {
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 8px;
          font-size: clamp(20px, 2.2vw, 30px);
        }

        .remixTvTopMetaRow {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .remixTvTopBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 16px;
          border-radius: 999px;
          font-size: 16px;
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
          gap: 12px;
          align-content: start;
        }

        .remixTvTop10Header {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          font-size: 24px;
          font-weight: 1000;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.86);
          padding: 4px 4px 0;
        }

        .remixTvTop10List {
          display: grid;
          gap: 14px;
          align-content: start;
          min-height: 0;
          overflow: hidden;
        }

        .remixTvTop10Row {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          padding: 16px 18px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(
            90deg,
            rgba(28, 16, 48, 0.76),
            rgba(16, 18, 45, 0.72),
            rgba(40, 13, 54, 0.62)
          );
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        }

        .remixTvTop10Pos {
          font-size: 34px;
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
          font-size: clamp(24px, 2.4vw, 34px);
          font-weight: 1000;
          line-height: 1.08;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10Artist {
          margin-top: 6px;
          font-size: clamp(17px, 1.8vw, 24px);
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10MetaRow {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .remixTvTop10VoteRail {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .remixTvTop10VotePill,
        .remixTvTop10Score {
          min-width: 48px;
          height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 18px;
          font-weight: 1000;
          line-height: 1;
          white-space: nowrap;
        }

        .remixTvTop10VotePill {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        }

        .remixTvTop10VoteEmoji {
          font-size: 16px;
          line-height: 1;
        }

        .remixTvTop10VoteValue {
          min-width: 10px;
          text-align: center;
        }

        .remixTvTop10Score {
          background: rgba(0,247,255,0.09);
          border: 1px solid rgba(0,247,255,0.24);
          box-shadow: var(--glowA);
          align-self: center;
        }

        .remixTvEmptyState {
          padding: 20px 10px;
          font-size: 22px;
          line-height: 1.4;
          color: var(--muted);
        }

        .remixTvBottomCta {
          border-top: 1px solid rgba(255,255,255,0.12);
          margin-top: 2px;
          display: grid;
          align-items: center;
          padding-top: 14px;
          grid-template-columns: 1fr 132px;
          gap: 18px;
        }

        .remixTvBottomText {
          line-height: 1.06;
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 0.35px;
          font-size: clamp(18px, 1.9vw, 26px);
          text-align: left;
        }

        .remixTvBottomTextLineStrong {
          display: block;
          color: #fff;
        }

        .remixTvBottomTextLineMuted {
          display: block;
          color: rgba(255,255,255,0.7);
          margin-top: 5px;
        }

        .remixTvBottomQrWrap {
          justify-self: end;
          width: 132px;
          height: 132px;
          padding: 5px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
        }

        .remixTvBottomQr {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 12px;
        }

        .neonEQ {
          height: 24px;
          display: flex;
          align-items: flex-end;
          gap: 4px;
        }

        .neonEQ > span {
          width: 5px;
          height: 10px;
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
          0%, 100% { height: 7px; opacity: 0.75; }
          50% { height: 22px; opacity: 1; }
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
}: {
  queueList: QueueItem[];
  featuredSongs: QueueItem[];
}) {
  const isEmpty = queueList.length === 0;
  const list = isEmpty ? featuredSongs : queueList;
  const title = isEmpty ? "Featured at Remix" : "Top 10";

  return (
    <div className="remixTvTop10Block">
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

            return (
              <div className="remixTvTop10Row" key={item.id}>
                <div className="remixTvTop10Pos">
                  {isEmpty ? "🔥" : index + 1}
                </div>

                <div className="remixTvTop10Text">
                  <div className="remixTvTop10Song">{item.title}</div>
                  <div className="remixTvTop10Artist">{item.artist}</div>

                  {!isEmpty && (
                    <div className="remixTvTop10MetaRow">
                      <div className="remixTvTop10VoteRail">
                        <div className="remixTvTop10VotePill">
                          👎 {downvotes}
                        </div>
                        <div className="remixTvTop10VotePill">
                          👍 {upvotes}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!isEmpty && (
                  <div className="remixTvTop10Score">S {score}</div>
                )}
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
