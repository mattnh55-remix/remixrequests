"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type QueueItem = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  score: number;
  isBoosted?: boolean;
  boosted?: boolean;
  wasBoosted?: boolean;
};

type FeedMessage = {
  id: string;
  title?: string;
  fromName: string;
  body?: string;
  messageText?: string;
  imageUrl?: string | null;
  accent?: "gold" | "cyan" | "pink";
  productKey?: string;
  productTitle?: string;
  displayDurationSec?: number;
};

const PLACEHOLDER_MESSAGES: FeedMessage[] = [
  {
    id: "placeholder-1",
    title: "REMIX SHOUT OUTS!",
    body: "Celebrate a birthday, shout out a friend, or send a message to the rink!",
    fromName: "Scan the QR to send yours",
    accent: "cyan",
    productTitle: "Remix Shout Out",
  },
  {
    id: "placeholder-2",
    title: "REMIX SHOUT OUTS!",
    body: "Upload a photo, add your message, and put your moment on the screen.",
    fromName: "Photo shout outs are live",
    accent: "pink",
    productTitle: "Photo Shout Out",
  },
  {
    id: "placeholder-3",
    title: "REMIX SHOUT OUTS!",
    body: "Request your favorite song and send a shout out while you skate.",
    fromName: "Use the QR to get started",
    accent: "gold",
    productTitle: "Requests + Shout Outs",
  },
];

export default function TvPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [playNow, setPlayNow] = useState<QueueItem[]>([]);
  const [upNext, setUpNext] = useState<QueueItem[]>([]);
  const [liveMessage, setLiveMessage] = useState<FeedMessage | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [boostFlash, setBoostFlash] = useState(false);
  const [artA, setArtA] = useState<string | null>(null);
  const [artB, setArtB] = useState<string | null>(null);
  const [showA, setShowA] = useState(true);

  const prevTopId = useRef<string | null>(null);

  const requestUrl = useMemo(
    () => `https://skateremix.com/request/${location}`,
    [location]
  );

  const qrSrc = useMemo(() => {
    const size = 320;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      requestUrl
    )}`;
  }, [requestUrl]);

  const featuredFallback =
    PLACEHOLDER_MESSAGES[placeholderIndex % PLACEHOLDER_MESSAGES.length];
  const featuredMessage = liveMessage || featuredFallback;
  const featuredBody =
    featuredMessage.body || featuredMessage.messageText || "";
  const featuredTitle = featuredMessage.title || "REMIX SHOUT OUTS!";

  const nowPlaying = playNow[0] || upNext[0] || null;
  const queueList = upNext.slice(0, 10);
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

  async function tickShoutouts() {
    try {
      const res = await fetch(`/api/public/shoutouts/feed/${location}`, {
        cache: "no-store",
      });
      const data = await res.json();

      const next =
        data?.current ||
        data?.message ||
        (Array.isArray(data?.items) && data.items.length ? data.items[0] : null) ||
        null;

      setLiveMessage(next);
    } catch {
      setLiveMessage(null);
    }
  }

  useEffect(() => {
    void tickQueue();
    void tickShoutouts();

    const q = window.setInterval(() => void tickQueue(), 3000);
    const s = window.setInterval(() => void tickShoutouts(), 5000);

    return () => {
      window.clearInterval(q);
      window.clearInterval(s);
    };
  }, [location]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIndex((v) => (v + 1) % PLACEHOLDER_MESSAGES.length);
    }, 10000);

    return () => window.clearInterval(id);
  }, []);

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

      <div className="remixTvWrap">
        <section className="neonPanel remixTvShoutoutPanel">
          <div className="remixTvSectionHeader">
            <div className="remixTvSectionTitle">{featuredTitle}</div>
          </div>

          <div
            key={featuredMessage.id}
            className={`remixTvBubble remixTvBubble--${featuredMessage.accent || "cyan"}`}
          >
            <div className="remixTvBubbleInner">
              <FeatureBubble
                imageUrl={featuredMessage.imageUrl}
                body={featuredBody}
                fromName={featuredMessage.fromName}
                productTitle={featuredMessage.productTitle}
              />
            </div>

            <svg
              className="remixTvBubbleTail"
              viewBox="0 0 44 28"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 5 C15 7, 24 12, 34 24 C25 22, 15 21, 7 17 C5 13, 4 9, 5 5 Z"
                className="remixTvBubbleTailPath"
              />
            </svg>
          </div>
        </section>

        <section className="remixTvQueueCol">
          <div className="neonPanel remixTvQueuePanel">
            <div className="remixTvSectionHeader remixTvQueueHeader">
              <div className="remixTvSectionTitle">Queued Up</div>
            </div>

            <div className={`remixTvTopCard ${topIsBoosted ? "remixTvTopCardBoosted" : ""}`}>
              <div className="remixTvTopArtWrap">
                <div className="remixTvTopArtFrame">
                  <div className="remixTvTopArtGlow" />
                  <div className="remixTvTopArtLayer" style={{ opacity: showA ? 1 : 0 }}>
                    <Artwork src={artA} alt="" />
                  </div>
                  <div className="remixTvTopArtLayer" style={{ opacity: showA ? 0 : 1 }}>
                    <Artwork src={artB} alt="" />
                  </div>
                  {topIsBoosted ? <div className="remixTvTopRibbon">BOOSTED</div> : null}
                </div>
              </div>

              <div className="remixTvTopMeta">
                <div className="remixTvTopLabel">NOW PLAYING</div>
                <div className="remixTvTopSong">{nowPlaying?.title || "No requests yet"}</div>
                <div className="remixTvTopArtist">
                  {nowPlaying?.artist || "Scan the QR to get started"}
                </div>

                <div className="remixTvTagRow">
                  <div className="tvTag">REMIX REQUESTS</div>
                  <div className="tvTag" style={{ boxShadow: "var(--glowB)" }}>
                    PLAY NOW • UP NEXT
                  </div>
                  <div className="tvTag" style={{ boxShadow: "var(--glowA)" }}>
                    TOP 10
                  </div>
                </div>

                <div className="neonEQ" aria-hidden="true" style={{ marginTop: 12 }}>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <div className="remixTvUrl">{requestUrl.replace("https://", "")}</div>
              </div>
            </div>

            <div className="remixTvTop10Header">TOP 10</div>

            <div className="remixTvTop10List">
              {queueList.length === 0 ? (
                <div className="remixTvEmptyState">
                  No requests yet — scan the QR and start the vibe.
                </div>
              ) : (
                queueList.map((item, index) => (
                  <div className="remixTvTop10Row" key={item.id}>
                    <div className="remixTvTop10Pos">{index + 1}</div>

                    <div className="remixTvTop10Text">
                      <div className="remixTvTop10Song">{item.title}</div>
                      <div className="remixTvTop10Artist">{item.artist}</div>
                    </div>

                    <div className="remixTvTop10Score">{item.score}</div>
                  </div>
                ))
              )}
            </div>

            <div className="remixTvBottomCta">
              <div className="remixTvBottomText">
                <div>SCAN TO</div>
                <div>REQUEST SONG OR</div>
                <div>SEND MESSAGE</div>
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
          </div>
        </section>
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

        @keyframes remixTvBubbleFloat {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.002); }
          100% { transform: translateY(0px) scale(1); }
        }

        @keyframes remixTvBubbleIn {
          0% { opacity: 0; transform: translateY(18px) scale(0.94); }
          60% { opacity: 1; transform: translateY(-2px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0px) scale(1); }
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

        .remixTvWrap {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1.38fr) minmax(420px, 0.94fr);
          gap: 16px;
          height: 100vh;
          padding: 14px;
          box-sizing: border-box;
        }

        .remixTvShoutoutPanel,
        .remixTvQueuePanel {
          position: relative;
          min-height: 0;
          overflow: hidden;
        }

        .remixTvShoutoutPanel {
          padding: 14px 14px 18px;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 12px;
          overflow: visible;
        }

        .remixTvQueueCol {
          min-height: 0;
          display: grid;
        }

        .remixTvQueuePanel {
          padding: 12px;
          display: grid;
          grid-template-rows: auto auto auto 1fr auto;
          gap: 12px;
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
          font-size: clamp(24px, 2vw, 40px);
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.18);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvBubble {
          position: relative;
          min-height: 0;
          border-radius: 34px 34px 34px 20px;
          padding: 18px 30px 22px 18px;
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          animation:
            remixTvBubbleIn 360ms cubic-bezier(0.2, 0.9, 0.2, 1),
            remixTvBubbleFloat 6s ease-in-out 360ms infinite;
          transform-origin: 86% 100%;
          overflow: visible;
        }

        .remixTvBubble--gold {
          background: linear-gradient(180deg, #e8e39b 0%, #e1dc92 100%);
          color: #080808;
        }

        .remixTvBubble--cyan {
          background: linear-gradient(180deg, #bde8fb 0%, #a9ddf5 100%);
          color: #05070c;
        }

        .remixTvBubble--pink {
          background: linear-gradient(180deg, #ffc4ee 0%, #f6aadf 100%);
          color: #160811;
        }

        .remixTvBubbleInner {
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        .remixTvBubbleTail {
          position: absolute;
          right: 12px;
          bottom: -8px;
          width: 42px;
          height: 26px;
          pointer-events: none;
          z-index: 1;
        }

        .remixTvBubble--gold .remixTvBubbleTailPath { fill: #e1dc92; }
        .remixTvBubble--cyan .remixTvBubbleTailPath { fill: #a9ddf5; }
        .remixTvBubble--pink .remixTvBubbleTailPath { fill: #f6aadf; }

        .remixTvBubbleLayout {
          display: grid;
          grid-template-columns: minmax(300px, 46%) 1fr;
          gap: 20px;
          align-items: stretch;
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        .remixTvBubbleLayout--textOnly {
          grid-template-columns: 1fr;
        }

        .remixTvBubbleLayout--stacked {
          grid-template-columns: 1fr;
          grid-template-rows: minmax(0, 1fr) auto;
        }

        .remixTvBubbleMedia {
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: stretch;
          justify-content: center;
        }

        .remixTvBubbleText {
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 10px 8px 6px 2px;
        }

        .remixTvBubbleKicker {
          font-size: clamp(15px, 1.1vw, 22px);
          font-weight: 1000;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          opacity: 0.8;
          margin-bottom: 12px;
        }

        .remixTvBubbleBody {
          font-size: clamp(34px, 4.5vw, 74px);
          line-height: 1.02;
          font-weight: 1000;
          font-style: italic;
          letter-spacing: -1.15px;
          word-break: break-word;
          text-wrap: balance;
          overflow-wrap: anywhere;
        }

        .remixTvBubbleFrom {
          margin-top: 18px;
          font-size: clamp(24px, 2.5vw, 48px);
          line-height: 1;
          font-weight: 1000;
          font-style: italic;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTopCard {
          display: grid;
          grid-template-columns: 118px 1fr;
          gap: 16px;
          align-items: center;
          padding: 12px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(
            90deg,
            rgba(8, 16, 40, 0.92),
            rgba(12, 26, 56, 0.76),
            rgba(31, 15, 50, 0.66)
          );
          min-height: 126px;
          position: relative;
          overflow: hidden;
        }

        .remixTvTopCardBoosted {
          box-shadow: var(--glowB);
        }

        .remixTvTopArtWrap {
          display: flex;
          align-items: center;
        }

        .remixTvTopArtFrame {
          width: 118px;
          height: 118px;
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

        .remixTvTopRibbon {
          position: absolute;
          top: 8px;
          left: -34px;
          transform: rotate(-17deg);
          padding: 5px 36px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,57,212,0.9), rgba(0,247,255,0.72));
          color: #07070c;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          box-shadow: var(--glowB);
          z-index: 5;
        }

        .remixTvTopMeta {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .remixTvTopLabel {
          font-size: 13px;
          font-weight: 1000;
          letter-spacing: 1.4px;
          opacity: 0.72;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .remixTvTopSong {
          font-size: clamp(24px, 1.75vw, 34px);
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.45px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 0 12px rgba(255,255,255,0.12);
        }

        .remixTvTopArtist {
          margin-top: 6px;
          font-size: clamp(16px, 1vw, 20px);
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTagRow {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .remixTvUrl {
          margin-top: 8px;
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10Header {
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
          grid-template-columns: 38px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-radius: 20px;
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
          font-size: 28px;
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
          font-size: clamp(16px, 0.95vw, 20px);
          font-weight: 1000;
          line-height: 1.12;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10Artist {
          margin-top: 4px;
          font-size: clamp(12px, 0.8vw, 15px);
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTvTop10Score {
          min-width: 38px;
          height: 38px;
          padding: 0 12px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 14px;
          font-weight: 1000;
          background: rgba(0,247,255,0.09);
          border: 1px solid rgba(0,247,255,0.24);
          box-shadow: var(--glowA);
        }

        .remixTvEmptyState {
          padding: 16px 10px;
          font-size: 18px;
          color: var(--muted);
        }

        .remixTvBottomCta {
          border-top: 1px solid rgba(255,255,255,0.12);
          margin-top: 2px;
          padding-top: 12px;
          display: grid;
          grid-template-columns: 1fr 122px;
          gap: 16px;
          align-items: center;
        }

        .remixTvBottomText {
          font-size: clamp(16px, 1vw, 20px);
          line-height: 1.08;
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          text-align: center;
          letter-spacing: 0.35px;
        }

        .remixTvBottomQrWrap {
          width: 112px;
          height: 112px;
          justify-self: end;
          padding: 4px;
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

        @media (max-width: 1400px) and (orientation: landscape) {
          .remixTvWrap {
            grid-template-columns: minmax(0, 1.22fr) minmax(380px, 0.92fr);
          }

          .remixTvBubbleLayout {
            grid-template-columns: minmax(250px, 42%) 1fr;
          }

          .remixTvBubbleBody {
            font-size: clamp(30px, 4vw, 58px);
          }

          .remixTvBubbleFrom {
            font-size: clamp(22px, 2.2vw, 38px);
          }
        }

        @media (orientation: portrait) {
          .remixTvWrap {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(0, 1.08fr) minmax(0, 0.92fr);
            height: 100vh;
          }

          .remixTvQueuePanel {
            grid-template-rows: auto auto auto 1fr auto;
          }

          .remixTvTopCard {
            grid-template-columns: 104px 1fr;
          }

          .remixTvTopArtFrame {
            width: 104px;
            height: 104px;
          }

          .remixTvTop10List {
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}

function FeatureBubble({
  imageUrl,
  body,
  fromName,
  productTitle,
}: {
  imageUrl?: string | null;
  body: string;
  fromName: string;
  productTitle?: string;
}) {
  const [layout, setLayout] = useState<"side" | "stacked" | "textOnly">(
    imageUrl ? "side" : "textOnly"
  );

  if (!imageUrl) {
    return (
      <div className="remixTvBubbleLayout remixTvBubbleLayout--textOnly">
        <div className="remixTvBubbleText">
          <div>
            <div className="remixTvBubbleKicker">{productTitle || "Remix Shout Out"}</div>
            <div className="remixTvBubbleBody">{body}</div>
          </div>
          <div className="remixTvBubbleFrom">— {fromName}</div>
        </div>
      </div>
    );
  }

  return (
    <ImageOrientationFrame
      src={imageUrl}
      onOrientation={(orientation) => {
        setLayout(orientation === "portrait" ? "side" : "stacked");
      }}
    >
      {(media) => (
        <div
          className={`remixTvBubbleLayout ${
            layout === "stacked"
              ? "remixTvBubbleLayout--stacked"
              : "remixTvBubbleLayout--side"
          }`}
        >
          <div className="remixTvBubbleMedia">{media}</div>

          <div className="remixTvBubbleText">
            <div>
              <div className="remixTvBubbleKicker">{productTitle || "Photo Shout Out"}</div>
              <div className="remixTvBubbleBody">{body}</div>
            </div>
            <div className="remixTvBubbleFrom">— {fromName}</div>
          </div>
        </div>
      )}
    </ImageOrientationFrame>
  );
}

function Artwork({ src, alt }: { src?: string | null; alt: string }) {
  const [bad, setBad] = useState(false);

  if (!src || bad) {
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
      src={src}
      alt={alt}
      onError={() => setBad(true)}
      loading="lazy"
      referrerPolicy="no-referrer"
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}

function ImageOrientationFrame({
  src,
  onOrientation,
  children,
}: {
  src: string;
  onOrientation: (orientation: "portrait" | "landscape" | "square") => void;
  children: (media: React.ReactNode) => React.ReactNode;
}) {
  const [bad, setBad] = useState(false);
  const [mode, setMode] = useState<"portrait" | "landscape" | "square">("square");

  if (bad) {
    return (
      <div className="remixTvBubbleLayout remixTvBubbleLayout--textOnly">
        <div className="remixTvBubbleText">
          <div>
            <div className="remixTvBubbleKicker">Photo Shout Out</div>
          </div>
          <div className="remixTvBubbleFrom">Image unavailable</div>
        </div>
      </div>
    );
  }

  const media = (
    <>
      <div className={`remixTvFeatureMediaShell remixTvFeatureMediaShell--${mode}`}>
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className={`remixTvFeatureMediaImg remixTvFeatureMediaImg--${mode}`}
          onError={() => setBad(true)}
          onLoad={(e) => {
            const img = e.currentTarget;
            const w = img.naturalWidth || 0;
            const h = img.naturalHeight || 0;

            if (!w || !h) {
              setMode("square");
              onOrientation("square");
              return;
            }

            const ratio = w / h;
            if (ratio > 1.15) {
              setMode("landscape");
              onOrientation("landscape");
            } else if (ratio < 0.85) {
              setMode("portrait");
              onOrientation("portrait");
            } else {
              setMode("square");
              onOrientation("square");
            }
          }}
        />
      </div>

      <style jsx global>{`
        .remixTvFeatureMediaShell {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          align-items: stretch;
          justify-content: center;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.18);
          border-radius: 26px;
        }

        .remixTvFeatureMediaShell--portrait {
          align-items: center;
          justify-content: center;
        }

        .remixTvFeatureMediaShell--landscape,
        .remixTvFeatureMediaShell--square {
          align-items: stretch;
          justify-content: center;
        }

        .remixTvFeatureMediaImg {
          display: block;
        }

        .remixTvFeatureMediaImg--portrait {
          width: auto;
          height: 100%;
          max-width: 100%;
          object-fit: contain;
          background: #000;
        }

        .remixTvFeatureMediaImg--landscape,
        .remixTvFeatureMediaImg--square {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </>
  );

  return <>{children(media)}</>;
}