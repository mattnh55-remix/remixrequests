"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type QItem = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  score: number;
  isBoosted?: boolean;
  boosted?: boolean;
  wasBoosted?: boolean;
};

type PlaceholderMessage = {
  id: string;
  title: string;
  body: string;
  fromName: string;
  imageUrl?: string | null;
  accent?: "gold" | "cyan" | "pink";
};

const PLACEHOLDER_MESSAGES: PlaceholderMessage[] = [
  {
    id: "msg1",
    title: "REMIX SHOUT OUTS!",
    body: "Happy Birthday Taylor and Hunter!",
    fromName: "-$name",
    imageUrl: null,
    accent: "cyan",
  },
  {
    id: "msg2",
    title: "REMIX SHOUT OUTS!",
    body: "Congrats to our birthday crew tonight. Thanks for celebrating at Remix!",
    fromName: "-$name",
    imageUrl: null,
    accent: "gold",
  },
  {
    id: "msg3",
    title: "REMIX SHOUT OUTS!",
    body: "Welcome to Remix! Scan the code, request your song, and send a shout out.",
    fromName: "-$name",
    imageUrl: null,
    accent: "pink",
  },
];

export default function TvPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [playNow, setPlayNow] = useState<QItem[]>([]);
  const [upNext, setUpNext] = useState<QItem[]>([]);
  const [boostFlash, setBoostFlash] = useState(false);
  const [artA, setArtA] = useState<string | null>(null);
  const [artB, setArtB] = useState<string | null>(null);
  const [showA, setShowA] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

  const prevTopId = useRef<string | null>(null);

  const requestUrl = useMemo(() => `https://skateremix.com/request/${location}`, [location]);

  const qrSrc = useMemo(() => {
    const size = 260;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(requestUrl)}`;
  }, [requestUrl]);

  const featuredMessage = PLACEHOLDER_MESSAGES[messageIndex % PLACEHOLDER_MESSAGES.length];
  const nowPlaying = playNow[0] || upNext[0] || null;
  const queueList = upNext.slice(0, 6);
  const topIsBoosted = Boolean(
    nowPlaying && (nowPlaying.isBoosted || nowPlaying.boosted || nowPlaying.wasBoosted)
  );

  async function tick() {
    const res = await fetch(`/api/public/queue/${location}`, { cache: "no-store" });
    const data = await res.json();
    setPlayNow(data.playNow || []);
    setUpNext(data.upNext || []);
  }

  useEffect(() => {
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((v) => (v + 1) % PLACEHOLDER_MESSAGES.length);
    }, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const topId = playNow[0]?.id ?? null;
    if (!topId) return;

    if (prevTopId.current && prevTopId.current !== topId) {
      setBoostFlash(true);
      const t = setTimeout(() => setBoostFlash(false), 950);
      prevTopId.current = topId;
      return () => clearTimeout(t);
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
    <div className={`neonRoot tv2Root ${boostFlash ? "tvFlash" : ""}`}>
      <div className="tv2BgOrb tv2BgOrbA" />
      <div className="tv2BgOrb tv2BgOrbB" />
      <div className="tv2BgOrb tv2BgOrbC" />

      <div className="tv2Wrap">
        <section className="neonPanel tv2Left">
          <div className="tv2FeatureHeader">
            <div className="tv2FeatureTitle">{featuredMessage.title}</div>
          </div>

          <div key={featuredMessage.id} className={`tv2Bubble tv2Bubble--${featuredMessage.accent || "cyan"}`}>
            <div className="tv2BubbleInner">
              <div className="tv2MessageMedia">
                <FeatureMedia src={featuredMessage.imageUrl} />
              </div>

              <div className="tv2MessageTextCol">
                <div className="tv2MessageBody">{featuredMessage.body}</div>
                <div className="tv2MessageFrom">{featuredMessage.fromName}</div>
              </div>
            </div>

            <div className="tv2BubbleTail" />
          </div>
        </section>

        <section className="tv2Right">
          <div className="neonPanel tv2QueuePanel">
            <div className="tv2QueueHeader">
              <div className="tv2QueueTitle">Queued Up</div>
            </div>

            <div className={`tv2Hero ${topIsBoosted ? "tv2HeroBoosted" : ""}`}>
              <div className="tv2HeroArtWrap">
                <div className="tv2HeroArtFrame">
                  <div className="tv2HeroArtPulse" />
                  <div className="tv2HeroArtLayer" style={{ opacity: showA ? 1 : 0 }}>
                    <Artwork src={artA} alt="" />
                  </div>
                  <div className="tv2HeroArtLayer" style={{ opacity: showA ? 0 : 1 }}>
                    <Artwork src={artB} alt="" />
                  </div>

                  {topIsBoosted ? <div className="tv2HeroRibbon">BOOSTED</div> : null}
                </div>
              </div>

              <div className="tv2HeroText">
                <div className="tv2HeroSong">{nowPlaying?.title || "No requests yet"}</div>
                <div className="tv2HeroArtist">{nowPlaying?.artist || "Scan the QR to get started"}</div>

                <div className="tv2HeroTags">
                  <div className="tvTag">REMIX REQUESTS</div>
                  <div className="tvTag" style={{ boxShadow: "var(--glowB)" }}>
                    PLAY NOW • UP NEXT
                  </div>
                  <div className="tvTag" style={{ boxShadow: "var(--glowA)" }}>
                    STARTING AT $5
                  </div>
                </div>

                <div className="neonEQ" aria-hidden="true" style={{ marginTop: 12 }}>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <div className="tv2Url">{requestUrl.replace("https://", "")}</div>
              </div>
            </div>

            <div className="tv2QueueList">
              {queueList.length === 0 ? (
                <div className="tv2EmptyState">No requests yet — scan the QR and start the vibe.</div>
              ) : (
                queueList.map((q, i) => (
                  <div className="tv2QueueRow" key={q.id}>
                    <div className="tv2QueuePos">{i + 1}</div>

                    <div className="tv2QueueSongWrap">
                      <div className="tv2QueueSong">{q.title}</div>
                      <div className="tv2QueueArtist">{q.artist}</div>
                    </div>

                    <div className="tv2QueueScorePill">{q.score}</div>
                  </div>
                ))
              )}
            </div>

            <div className="tv2BottomCta">
              <div className="tv2BottomCtaText">
                <div>SCAN TO</div>
                <div>REQUEST SONG OR</div>
                <div>SEND MESSAGE</div>
              </div>

              <div className="tv2BottomQrWrap">
                <img
                  src={qrSrc}
                  alt="QR code to request songs"
                  className="tv2BottomQr"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .tv2Root {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 20% 20%, rgba(0, 247, 255, 0.06), transparent 30%),
            radial-gradient(circle at 80% 15%, rgba(255, 57, 212, 0.06), transparent 28%),
            radial-gradient(circle at 70% 78%, rgba(0, 247, 255, 0.05), transparent 30%),
            #050814;
        }

        .tv2BgOrb {
          position: absolute;
          border-radius: 999px;
          filter: blur(70px);
          opacity: 0.22;
          pointer-events: none;
          mix-blend-mode: screen;
          animation: tv2OrbFloat 18s ease-in-out infinite;
        }

        .tv2BgOrbA {
          width: 40vw;
          height: 40vw;
          left: -8vw;
          top: -10vw;
          background: radial-gradient(circle, rgba(0, 247, 255, 0.45), transparent 70%);
        }

        .tv2BgOrbB {
          width: 34vw;
          height: 34vw;
          right: -8vw;
          top: 8vh;
          background: radial-gradient(circle, rgba(255, 57, 212, 0.38), transparent 70%);
          animation-delay: -6s;
        }

        .tv2BgOrbC {
          width: 36vw;
          height: 36vw;
          left: 32vw;
          bottom: -18vw;
          background: radial-gradient(circle, rgba(69, 126, 255, 0.28), transparent 72%);
          animation-delay: -10s;
        }

        @keyframes tv2OrbFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(1.6vw, -1.4vw, 0) scale(1.08); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes tv2BubbleFloat {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.003); }
          100% { transform: translateY(0px) scale(1); }
        }

        @keyframes tv2BubbleSendIn {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.92);
          }
          55% {
            opacity: 1;
            transform: translateY(-2px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes tv2TailIn {
          0% {
            opacity: 0;
            transform: rotate(45deg) translateY(8px) scale(0.82);
          }
          55% {
            opacity: 1;
            transform: rotate(45deg) translateY(-1px) scale(1.03);
          }
          100% {
            opacity: 1;
            transform: rotate(45deg) translateY(0) scale(0.96);
          }
        }

        @keyframes tv2Pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.09); opacity: 0.35; }
          100% { transform: scale(1); opacity: 0.8; }
        }

        @keyframes tvFlashAnim {
          0% { opacity: 0; }
          18% { opacity: 1; }
          100% { opacity: 0; }
        }

        .tv2Wrap {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 1.38fr 0.95fr;
          gap: 14px;
          padding: 14px;
          height: 100vh;
          box-sizing: border-box;
        }

        .tv2Left,
        .tv2QueuePanel {
          position: relative;
          overflow: hidden;
          min-height: 0;
        }

        .tv2Left {
          padding: 14px 14px 18px;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 12px;
          overflow: visible;
        }

        .tv2Right {
          min-height: 0;
          display: grid;
        }

        .tv2QueuePanel {
          padding: 12px;
          display: grid;
          grid-template-rows: auto auto 1fr auto;
          gap: 12px;
        }

        .tv2FeatureHeader {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          position: relative;
          z-index: 2;
          padding: 2px 4px 0;
        }

        .tv2FeatureTitle {
          font-size: 28px;
          font-weight: 1000;
          letter-spacing: 0.3px;
          font-style: italic;
          text-transform: uppercase;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.18);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

 .tv2Bubble {
          position: relative;
          min-height: 0;
          border-radius: 40px; /* Slightly more rounded for iMessage look */
          padding: 30px 40px;
          display: flex;
          align-items: stretch;
          z-index: 2;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          overflow: visible; /* Required so the tail isn't cut off */
          animation: tv2BubbleSendIn 360ms cubic-bezier(0.2, 0.9, 0.2, 1);
        }

        .tv2Bubble--gold {
          background-color: #febd2e;
          color: #000;
        }

        .tv2Bubble--cyan {
          background-color: #007aff; /* Standard iMessage Blue */
          color: #fff;
        }

        .tv2Bubble--pink {
          background-color: #ff2d55;
          color: #fff;
        }

        /* THE FIXED TAIL */
        .tv2BubbleTail {
          position: absolute;
          bottom: 0;
          right: 5px; /* Positions it on the right side */
          width: 25px;
          height: 20px;
          background-color: inherit; /* Matches Blue/Gold/Pink automatically */
          border-bottom-left-radius: 16px 14px;
          z-index: -1;
        }

        /* The 'Mask' that creates the iMessage curve */
        .tv2BubbleTail::after {
          content: "";
          position: absolute;
          top: 0;
          right: 0px;
          width: 20px;
          height: 25px;
          background-color: #050814; /* Matches your dark background */
          border-bottom-left-radius: 12px;
        }

        .tv2BubbleInner {
          display: grid;
          grid-template-columns: minmax(340px, 42%) 1fr;
          gap: 20px;
          width: 100%;
          align-items: stretch;
          min-height: 0;
        }

        .tv2MessageMedia {
          min-height: 0;
          display: flex;
        }

        .tv2MessageTextCol {
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 12px 10px 8px 2px;
        }

        .tv2MessageBody {
          font-size: clamp(40px, 4.9vw, 72px);
          line-height: 1.03;
          font-weight: 1000;
          font-style: italic;
          letter-spacing: -1.2px;
          word-break: break-word;
          text-wrap: balance;
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tv2MessageFrom {
          margin-top: 18px;
          font-size: clamp(28px, 3vw, 52px);
          font-weight: 1000;
          font-style: italic;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tv2BubbleTail {
          position: absolute;
          right: 28px;
          bottom: -14px;
          width: 30px;
          height: 30px;
          background: inherit;
          border-radius: 0 0 18px 0;
          z-index: 1;
          box-shadow: none;
          transform: rotate(45deg) scale(0.96);
          transform-origin: 50% 50%;
          animation: tv2TailIn 360ms cubic-bezier(0.2, 0.9, 0.2, 1);
        }

        .tv2Bubble::after {
          content: "";
          position: absolute;
          right: 22px;
          bottom: 0;
          width: 40px;
          height: 40px;
          background: inherit;
          border-radius: 50%;
          z-index: 0;
        }

        .tv2QueueHeader {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          padding: 0 2px;
        }

        .tv2QueueTitle {
          font-size: 30px;
          font-weight: 1000;
          text-transform: uppercase;
          font-style: italic;
          letter-spacing: 0.6px;
        }

        .tv2Hero {
          display: grid;
          grid-template-columns: 112px 1fr;
          gap: 16px;
          padding: 12px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(90deg, rgba(8, 16, 40, 0.92), rgba(12, 26, 56, 0.76), rgba(31, 15, 50, 0.66));
          min-height: 126px;
          position: relative;
          overflow: hidden;
        }

        .tv2HeroBoosted {
          box-shadow: var(--glowB);
        }

        .tv2HeroArtWrap {
          display: flex;
          align-items: center;
        }

        .tv2HeroArtFrame {
          width: 112px;
          height: 112px;
          border-radius: 26px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: var(--glowA), var(--shadow);
        }

        .tv2HeroArtLayer {
          position: absolute;
          inset: 0;
          transition: opacity 420ms ease;
        }

        .tv2HeroArtPulse {
          position: absolute;
          inset: -40%;
          background:
            radial-gradient(circle at 30% 25%, rgba(0, 247, 255, 0.24), transparent 55%),
            radial-gradient(circle at 75% 80%, rgba(255, 57, 212, 0.2), transparent 62%);
          animation: tv2Pulse 4.5s ease-in-out infinite;
          filter: blur(20px);
          opacity: 0.85;
          z-index: 2;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .tv2HeroRibbon {
          position: absolute;
          top: 8px;
          left: -34px;
          transform: rotate(-17deg);
          padding: 5px 36px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255, 57, 212, 0.9), rgba(0, 247, 255, 0.72));
          color: #07070c;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          box-shadow: var(--glowB);
          z-index: 5;
        }

        .tv2HeroText {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .tv2HeroSong {
          font-size: 29px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 0 12px rgba(255, 255, 255, 0.12);
        }

        .tv2HeroArtist {
          margin-top: 6px;
          font-size: 18px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tv2HeroTags {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .tv2Url {
          margin-top: 8px;
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tv2QueueList {
          display: grid;
          gap: 10px;
          align-content: start;
          min-height: 0;
        }

        .tv2QueueRow {
          display: grid;
          grid-template-columns: 34px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(90deg, rgba(28, 16, 48, 0.72), rgba(16, 18, 45, 0.68), rgba(40, 13, 54, 0.58));
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
        }

        .tv2QueuePos {
          font-size: 26px;
          font-weight: 1000;
          line-height: 1;
          opacity: 0.96;
          text-align: center;
        }

        .tv2QueueSongWrap {
          min-width: 0;
        }

        .tv2QueueSong {
          font-size: 17px;
          font-weight: 1000;
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tv2QueueArtist {
          margin-top: 4px;
          font-size: 13px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tv2QueueScorePill {
          min-width: 36px;
          height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 14px;
          font-weight: 1000;
          background: rgba(0, 247, 255, 0.09);
          border: 1px solid rgba(0, 247, 255, 0.24);
          box-shadow: var(--glowA);
        }

        .tv2EmptyState {
          padding: 16px 10px;
          font-size: 18px;
          color: var(--muted);
        }

        .tv2BottomCta {
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          margin-top: 2px;
          padding-top: 12px;
          display: grid;
          grid-template-columns: 1fr 120px;
          gap: 16px;
          align-items: center;
        }

        .tv2BottomCtaText {
          font-size: 18px;
          line-height: 1.1;
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          text-align: center;
          letter-spacing: 0.35px;
        }

        .tv2BottomQrWrap {
          width: 110px;
          height: 110px;
          justify-self: end;
          padding: 4px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
        }

        .tv2BottomQr {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 12px;
        }

        .tvFlash::before {
          content: "";
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 50% 40%, rgba(255, 57, 212, 0.18), transparent 55%),
            radial-gradient(circle at 40% 60%, rgba(0, 247, 255, 0.14), transparent 60%);
          animation: tvFlashAnim 950ms ease-out 1;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: screen;
        }

        @media (max-width: 1200px) and (orientation: landscape) {
          .tv2Wrap {
            grid-template-columns: 1.16fr 0.94fr;
          }

          .tv2BubbleInner {
            grid-template-columns: minmax(260px, 38%) 1fr;
          }

          .tv2MessageBody {
            font-size: clamp(34px, 4.1vw, 56px);
          }

          .tv2MessageFrom {
            font-size: clamp(24px, 2.3vw, 38px);
          }
        }

        @media (orientation: portrait) {
          .tv2Wrap {
            grid-template-columns: 1fr;
            height: 100vh;
          }

          .tv2BubbleInner {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
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

function FeatureMedia({ src }: { src?: string | null }) {
  const [bad, setBad] = useState(false);
  const [mode, setMode] = useState<"unknown" | "portrait" | "landscape" | "square">("unknown");

  if (!src || bad) {
    return (
      <>
        <div className="tv2FeatureMediaShell tv2FeatureMediaShell--placeholder">
          <div className="tv2FeaturePlaceholder">
            <div className="tv2FeaturePlaceholderX tv2FeaturePlaceholderX1" />
            <div className="tv2FeaturePlaceholderX tv2FeaturePlaceholderX2" />
            <div className="tv2FeaturePlaceholderText">
              UPLOADED IMAGE
              <br />
              PLACEHOLDER
            </div>
          </div>
        </div>

        <style jsx global>{`
          .tv2FeatureMediaShell {
            width: 100%;
            height: 100%;
            min-height: 0;
            display: flex;
            align-items: stretch;
            justify-content: center;
            overflow: hidden;
            background: rgba(0, 0, 0, 0.16);
            border: none;
            border-radius: 26px;
          }

          .tv2FeatureMediaShell--placeholder {
            align-items: stretch;
          }

          .tv2FeaturePlaceholder {
            width: 100%;
            height: 100%;
            min-height: 0;
            background: #000;
            border: 1px solid rgba(255, 255, 255, 0.25);
            position: relative;
            overflow: hidden;
            border-radius: 26px;
          }

          .tv2FeaturePlaceholderX {
            position: absolute;
            inset: 0;
            margin: auto;
            width: 1px;
            height: 132%;
            background: rgba(255, 255, 255, 0.5);
            transform-origin: center;
          }

          .tv2FeaturePlaceholderX1 { transform: rotate(33deg); }
          .tv2FeaturePlaceholderX2 { transform: rotate(-33deg); }

          .tv2FeaturePlaceholderText {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            text-align: center;
            color: white;
            font-weight: 1000;
            font-size: 24px;
            line-height: 1.08;
            letter-spacing: 0.4px;
            font-style: italic;
            padding: 24px;
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <div className={`tv2FeatureMediaShell tv2FeatureMediaShell--${mode}`}>
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className={`tv2FeatureMediaImg tv2FeatureMediaImg--${mode}`}
          onError={() => setBad(true)}
          onLoad={(e) => {
            const img = e.currentTarget;
            const w = img.naturalWidth || 0;
            const h = img.naturalHeight || 0;

            if (!w || !h) {
              setMode("unknown");
              return;
            }

            const ratio = w / h;
            if (ratio > 1.15) setMode("landscape");
            else if (ratio < 0.85) setMode("portrait");
            else setMode("square");
          }}
        />
      </div>

      <style jsx global>{`
        .tv2FeatureMediaShell {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          align-items: stretch;
          justify-content: center;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.16);
          border: none;
          border-radius: 26px;
        }

        .tv2FeatureMediaShell--portrait {
          align-items: center;
          justify-content: center;
        }

        .tv2FeatureMediaShell--landscape,
        .tv2FeatureMediaShell--square,
        .tv2FeatureMediaShell--unknown {
          align-items: stretch;
          justify-content: center;
        }

        .tv2FeatureMediaImg {
          display: block;
        }

        .tv2FeatureMediaImg--portrait {
          width: auto;
          height: 100%;
          max-width: 100%;
          object-fit: contain;
          background: #000;
        }

        .tv2FeatureMediaImg--landscape,
        .tv2FeatureMediaImg--square,
        .tv2FeatureMediaImg--unknown {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </>
  );
}
