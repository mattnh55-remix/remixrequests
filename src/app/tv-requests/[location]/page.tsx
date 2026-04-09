// src/app/tv-queue/[location]/page.tsx

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

  const prevTopId = useRef<string | null>(null);

  const requestUrl = useMemo(
    () => `https://skateremix.com/request/${location}`,
    [location]
  );

  const qrSrc = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      requestUrl
    )}`;
  }, [requestUrl]);

  const nowPlaying = playNow[0] || upNext[0] || null;
  const queueList = upNext.slice(0, 6);
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

  useEffect(() => {
    void tickQueue();

    fetch(`/api/public/rules/${location}`)
      .then((r) => r.json())
      .then((d) => {
        const url = d?.rules?.defaultAlbumArtUrl || d?.defaultAlbumArtUrl || null;
        if (url) setDefaultAlbumArtUrl(url);
      })
      .catch(() => {});

    const q = window.setInterval(() => void tickQueue(), 3000);

    const r = window.setInterval(() => {
      fetch(`/api/public/rules/${location}`)
        .then((rr) => rr.json())
        .then((d) => {
          const url = d?.rules?.defaultAlbumArtUrl || d?.defaultAlbumArtUrl || null;
          if (url) setDefaultAlbumArtUrl(url);
        })
        .catch(() => {});
    }, 15000);

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
          padding: 12px;
          box-sizing: border-box;
        }

        .remixTvQueueOnlyPanel {
          min-height: calc(100vh - 24px);
          display: grid;
          grid-template-rows: auto auto 1fr auto;
          gap: 10px;
          padding: 12px;
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
          font-size: clamp(20px, 4.6vw, 32px);
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.18);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
          grid-template-columns: 88px 1fr;
          gap: 12px;
          min-height: 96px;
          padding: 10px 12px;
        }

        .remixTvTopCardBoosted {
          box-shadow: var(--glowB);
        }

        .remixTvTopArtWrap {
          display: flex;
          align-items: center;
        }

        .remixTvTopArtFrame {
          width: 88px;
          height: 88px;
          border-radius: 22px;
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
          letter-spacing: -0.45px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 0 12px rgba(255,255,255,0.12);
          font-size: clamp(20px, 2.45vw, 28px);
        }

        .remixTvTopArtist {
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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

        .remixTvTop10Header {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          font-size: 16px;
          font-weight: 1000;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.8);
          padding: 2px 4px 0;
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
          grid-template-columns: 30px minmax(0, 1fr) auto auto;
          gap: 10px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 18px;
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
          font-size: 22px;
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
          font-size: clamp(14px, 1.65vw, 18px);
          font-weight: 1000;
          line-height: 1.12;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10Artist {
          margin-top: 3px;
          font-size: clamp(11px, 1.28vw, 14px);
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10MetaRow {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .remixTvTop10VoteRail {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .remixTvTop10VotePill,
        .remixTvTop10Score {
          min-width: 30px;
          height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 12px;
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
          font-size: 11px;
          line-height: 1;
        }

        .remixTvTop10VoteValue {
          min-width: 8px;
          text-align: center;
        }

        .remixTvTop10Score {
          background: rgba(0,247,255,0.09);
          border: 1px solid rgba(0,247,255,0.24);
          box-shadow: var(--glowA);
        }

        .remixTvEmptyState {
          padding: 14px 8px;
          font-size: 15px;
          line-height: 1.35;
          color: var(--muted);
        }

        .remixTvBottomCta {
          border-top: 1px solid rgba(255,255,255,0.12);
          margin-top: 2px;
          display: grid;
          align-items: center;
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
          width: 98px;
          height: 98px;
          padding: 4px;
          border-radius: 14px;
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
      `}</style>
    </div>
  );
}

function PortraitQueueOnlyPanel({
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

      <Top10Block queueList={queueList} />

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

function Top10Block({ queueList }: { queueList: QueueItem[] }) {
  return (
    <>
      <div className="remixTvTop10Header">
        <span>Top 10</span>
      </div>

      <div className="remixTvTop10List">
        {queueList.length === 0 ? (
          <div className="remixTvEmptyState">
            No requests yet — scan the QR and start the vibe.
          </div>
        ) : (
          queueList.map((item, index) => {
            const upvotes = Number(item.upvotes || 0);
            const downvotes = Number(item.downvotes || 0);
            const score = Number(item.score || 0);

            return (
              <div className="remixTvTop10Row" key={item.id}>
                <div className="remixTvTop10Pos">{index + 1}</div>

                <div className="remixTvTop10Text">
                  <div className="remixTvTop10Song">{item.title}</div>
                  <div className="remixTvTop10Artist">{item.artist}</div>
                  <div className="remixTvTop10MetaRow">
                    <div className="remixTvTop10VoteRail" aria-label="Vote counts">
                      <div className="remixTvTop10VotePill">
                        <span className="remixTvTop10VoteEmoji" aria-hidden="true">👎</span>
                        <span className="remixTvTop10VoteValue">{downvotes}</span>
                      </div>
                      <div className="remixTvTop10VotePill">
                        <span className="remixTvTop10VoteEmoji" aria-hidden="true">👍</span>
                        <span className="remixTvTop10VoteValue">{upvotes}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="remixTvTop10Score">S {score}</div>
              </div>
            );
          })
        )}
      </div>
    </>
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