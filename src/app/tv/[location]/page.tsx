"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type QItem = { id: string; title: string; artist: string; artworkUrl?: string; score: number };

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
    body: "Happy birthday, Ava! Thanks for celebrating at Remix tonight. Skate hard, laugh loud, and make it a night to remember.",
    fromName: "— Mom, Dad & Mason",
    imageUrl: null,
    accent: "gold"
  },
  {
    id: "msg2",
    title: "REMIX SHOUT OUTS!",
    body: "Shout out to the Salem Blue Devils! Great job this week. Keep rolling strong and have an awesome night at the rink.",
    fromName: "— Your biggest fans",
    imageUrl: null,
    accent: "cyan"
  },
  {
    id: "msg3",
    title: "REMIX SHOUT OUTS!",
    body: "Date night at Remix 💜 Thanks for choosing us for your Friday fun. Scan the code, request a song, and own the floor.",
    fromName: "— Remix Skate & Event Center",
    imageUrl: null,
    accent: "pink"
  }
];

export default function TvPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [playNow, setPlayNow] = useState<QItem[]>([]);
  const [upNext, setUpNext] = useState<QItem[]>([]);

  const prevTopBoostId = useRef<string | null>(null);
  const [boostFlash, setBoostFlash] = useState(false);

  const [artA, setArtA] = useState<string | null>(null);
  const [artB, setArtB] = useState<string | null>(null);
  const [showA, setShowA] = useState(true);

  const [messageIndex, setMessageIndex] = useState(0);

  const requestUrl = useMemo(() => `https://skateremix.com/request/${location}`, [location]);

  const qrSrc = useMemo(() => {
    const size = 260;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(requestUrl)}`;
  }, [requestUrl]);

  const featuredMessage = PLACEHOLDER_MESSAGES[messageIndex % PLACEHOLDER_MESSAGES.length];

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

  const nowPlaying = playNow?.[0] || upNext?.[0] || null;
  const queueList = upNext.slice(0, 6);
  const totalQueue = useMemo(() => upNext.length + playNow.length, [upNext, playNow]);

  useEffect(() => {
    const topId = playNow?.[0]?.id ?? null;
    if (!topId) return;

    if (prevTopBoostId.current && prevTopBoostId.current !== topId) {
      setBoostFlash(true);
      const t = setTimeout(() => setBoostFlash(false), 950);
      prevTopBoostId.current = topId;
      return () => clearTimeout(t);
    }

    prevTopBoostId.current = topId;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlaying?.artworkUrl]);

  return (
    <div className={`neonRoot tv2Root ${boostFlash ? "tvFlash" : ""}`}>
      <div className="tv2Wrap">
        {/* LEFT FEATURE / MESSAGE */}
        <section className="neonPanel tv2Left">
          <div className="tv2FeatureHeader">
            <div className="tv2FeatureTopBar" />
            <div className="tv2FeatureTitle">{featuredMessage.title}</div>
          </div>

          <div className={`tv2Bubble tv2Bubble--${featuredMessage.accent || "gold"}`}>
            <div className="tv2BubbleInner">
              <div className="tv2MessageMedia">
                {featuredMessage.imageUrl ? (
                  <img
                    src={featuredMessage.imageUrl}
                    alt=""
                    className="tv2MessageImage"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="tv2ImagePlaceholder">
                    <div className="tv2ImagePlaceholderX tv2ImagePlaceholderX1" />
                    <div className="tv2ImagePlaceholderX tv2ImagePlaceholderX2" />
                    <div className="tv2ImagePlaceholderText">
                      UPLOADED IMAGE
                      <br />
                      PLACEHOLDER
                    </div>
                  </div>
                )}
              </div>

              <div className="tv2MessageTextCol">
                <div className="tv2MessageHeadline">$MESSAGE CONTENTS HERE</div>
                <div className="tv2MessageBody">{featuredMessage.body}</div>
                <div className="tv2MessageFrom">{featuredMessage.fromName}</div>
              </div>
            </div>

            <div className="tv2BubbleTail" />
          </div>

          <div className="tv2Ambient tv2AmbientA" />
          <div className="tv2Ambient tv2AmbientB" />
        </section>

        {/* RIGHT SIDE */}
        <section className="tv2Right">
          <div className="neonPanel tv2QueuePanel">
            <div className="tv2QueueHeader">
              <div className="tv2QueueTitle">Queued Up</div>
              <div className="tv2QueueMeta">{totalQueue ? `${totalQueue} live` : "Be the first!"}</div>
            </div>

            <div className={`tv2Hero ${playNow.length ? "tv2HeroBoosted" : ""}`}>
              <div className="tv2HeroArtWrap">
                <div className="tv2HeroArtFrame">
                  <div className="tv2HeroArtPulse" />
                  <div className="tv2HeroArtLayer" style={{ opacity: showA ? 1 : 0 }}>
                    <Artwork src={artA} alt="" />
                  </div>
                  <div className="tv2HeroArtLayer" style={{ opacity: showA ? 0 : 1 }}>
                    <Artwork src={artB} alt="" />
                  </div>

                  {playNow.length ? <div className="tv2HeroRibbon">BOOSTED</div> : null}
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
                <div className="tv2EmptyState">
                  No requests yet — scan the QR and start the vibe.
                </div>
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
                <div>COOL AD TO</div>
                <div>DASHBOARD TO</div>
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
        .tv2Wrap {
          display: grid;
          grid-template-columns: 1.38fr 0.95fr;
          gap: 14px;
          padding: 14px;
          height: 100vh;
          box-sizing: border-box;
          background: #050814;
        }

        .tv2Left,
        .tv2QueuePanel {
          position: relative;
          overflow: hidden;
          min-height: 0;
        }

        .tv2Left {
          padding: 14px 14px 16px;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 12px;
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
          display: grid;
          grid-template-columns: 230px 1fr;
          align-items: center;
          gap: 20px;
          position: relative;
          z-index: 2;
        }

        .tv2FeatureTopBar {
          height: 38px;
          border-radius: 0;
          background:
            linear-gradient(90deg, rgba(53, 18, 77, 0.9), rgba(28, 34, 94, 0.6)),
            rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .tv2FeatureTitle {
          font-size: 34px;
          font-weight: 1000;
          letter-spacing: 0.5px;
          font-style: italic;
          text-transform: uppercase;
          text-shadow: 0 0 18px rgba(255,255,255,0.18);
        }

        .tv2Bubble {
          position: relative;
          min-height: 0;
          border-radius: 56px;
          padding: 26px;
          display: flex;
          align-items: stretch;
          z-index: 2;
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow:
            0 20px 60px rgba(0,0,0,0.35),
            0 0 0 1px rgba(255,255,255,0.05) inset;
        }

        .tv2Bubble--gold {
          background: linear-gradient(180deg, #e8e39b 0%, #e1dc92 100%);
          color: #090909;
        }

        .tv2Bubble--cyan {
          background: linear-gradient(180deg, #a2f4ff 0%, #82d9f0 100%);
          color: #041018;
        }

        .tv2Bubble--pink {
          background: linear-gradient(180deg, #ffc4ee 0%, #f6aadf 100%);
          color: #160811;
        }

        .tv2BubbleInner {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 28px;
          width: 100%;
          align-items: center;
        }

        .tv2MessageMedia {
          min-height: 0;
        }

        .tv2MessageImage,
        .tv2ImagePlaceholder {
          width: 100%;
          aspect-ratio: 1 / 1.3;
          object-fit: cover;
          display: block;
          border-radius: 0;
        }

        .tv2ImagePlaceholder {
          position: relative;
          background: #000;
          border: 1px solid rgba(255,255,255,0.25);
          overflow: hidden;
        }

        .tv2ImagePlaceholderX {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 1px;
          height: 120%;
          background: rgba(255,255,255,0.5);
          transform-origin: center;
        }

        .tv2ImagePlaceholderX1 { transform: rotate(40deg); }
        .tv2ImagePlaceholderX2 { transform: rotate(-40deg); }

        .tv2ImagePlaceholderText {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          text-align: center;
          color: white;
          font-weight: 1000;
          font-size: 22px;
          line-height: 1.15;
          letter-spacing: 0.4px;
          font-style: italic;
          padding: 20px;
        }

        .tv2MessageTextCol {
          min-width: 0;
        }

        .tv2MessageHeadline {
          font-size: 28px;
          line-height: 1;
          font-weight: 1000;
          font-style: italic;
          margin-bottom: 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tv2MessageBody {
          font-size: 30px;
          line-height: 1.28;
          font-weight: 900;
          font-style: italic;
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tv2MessageFrom {
          margin-top: 20px;
          font-size: 26px;
          font-weight: 1000;
          font-style: italic;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tv2BubbleTail {
          position: absolute;
          right: 26px;
          bottom: -28px;
          width: 0;
          height: 0;
          border-left: 54px solid transparent;
          border-right: 0 solid transparent;
          border-top: 58px solid currentColor;
          filter: drop-shadow(0 10px 14px rgba(0,0,0,0.22));
          opacity: 0.95;
          color: inherit;
        }

        .tv2Bubble--gold .tv2BubbleTail {
          border-top-color: #e1dc92;
        }

        .tv2Bubble--cyan .tv2BubbleTail {
          border-top-color: #82d9f0;
        }

        .tv2Bubble--pink .tv2BubbleTail {
          border-top-color: #f6aadf;
        }

        .tv2Ambient {
          position: absolute;
          pointer-events: none;
          border-radius: 24px;
          opacity: 0.55;
          filter: blur(0px);
          z-index: 1;
        }

        .tv2AmbientA {
          width: 220px;
          height: 84px;
          right: 10px;
          top: 16px;
          background: linear-gradient(90deg, rgba(111, 19, 111, 0.35), rgba(32, 83, 124, 0.18));
        }

        .tv2AmbientB {
          width: 180px;
          height: 110px;
          right: 92px;
          bottom: 32px;
          background: linear-gradient(90deg, rgba(103, 25, 129, 0.32), rgba(255, 57, 212, 0.18));
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

        .tv2QueueMeta {
          font-size: 15px;
          color: var(--muted);
          white-space: nowrap;
        }

        .tv2Hero {
          display: grid;
          grid-template-columns: 112px 1fr;
          gap: 16px;
          padding: 12px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.10);
          background:
            linear-gradient(90deg, rgba(8,16,40,0.92), rgba(12,26,56,0.76), rgba(31,15,50,0.66));
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
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.05);
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
            radial-gradient(circle at 30% 25%, rgba(0,247,255,0.24), transparent 55%),
            radial-gradient(circle at 75% 80%, rgba(255,57,212,0.20), transparent 62%);
          animation: tv2Pulse 4.5s ease-in-out infinite;
          filter: blur(20px);
          opacity: 0.85;
          z-index: 2;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        @keyframes tv2Pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.09); opacity: 0.35; }
          100% { transform: scale(1); opacity: 0.8; }
        }

        .tv2HeroRibbon {
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
          text-shadow: 0 0 12px rgba(255,255,255,0.12);
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
          border: 1px solid rgba(255,255,255,0.10);
          background:
            linear-gradient(90deg, rgba(28,16,48,0.72), rgba(16,18,45,0.68), rgba(40,13,54,0.58));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
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
          background: rgba(0,247,255,0.09);
          border: 1px solid rgba(0,247,255,0.24);
          box-shadow: var(--glowA);
        }

        .tv2EmptyState {
          padding: 16px 10px;
          font-size: 18px;
          color: var(--muted);
        }

        .tv2BottomCta {
          border-top: 1px solid rgba(255,255,255,0.12);
          margin-top: 2px;
          padding-top: 12px;
          display: grid;
          grid-template-columns: 1fr 120px;
          gap: 16px;
          align-items: center;
        }

        .tv2BottomCtaText {
          font-size: 18px;
          line-height: 1.18;
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          text-align: center;
          letter-spacing: 0.4px;
        }

        .tv2BottomQrWrap {
          width: 110px;
          height: 110px;
          justify-self: end;
          padding: 4px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
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
            radial-gradient(circle at 50% 40%, rgba(255,57,212,0.18), transparent 55%),
            radial-gradient(circle at 40% 60%, rgba(0,247,255,0.14), transparent 60%);
          animation: tvFlashAnim 950ms ease-out 1;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: screen;
        }

        @keyframes tvFlashAnim {
          0% { opacity: 0; }
          18% { opacity: 1; }
          100% { opacity: 0; }
        }

        @media (max-width: 1200px) and (orientation: landscape) {
          .tv2Wrap {
            grid-template-columns: 1.16fr 0.94fr;
          }

          .tv2BubbleInner {
            grid-template-columns: 240px 1fr;
          }

          .tv2MessageBody {
            font-size: 24px;
          }

          .tv2FeatureTitle {
            font-size: 28px;
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
          letterSpacing: 1.2
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