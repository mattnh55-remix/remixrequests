"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type QItem = { id: string; title: string; artist: string; artworkUrl?: string; score: number };

export default function TvPage({ params }: { params: { location: string } }) {
  const location = params.location;
  const [playNow, setPlayNow] = useState<QItem[]>([]);
  const [upNext, setUpNext] = useState<QItem[]>([]);

  // Flash when a new boosted item hits / changes at top
  const prevTopBoostId = useRef<string | null>(null);
  const [boostFlash, setBoostFlash] = useState(false);

  // Artwork crossfade
  const [artA, setArtA] = useState<string | null>(null);
  const [artB, setArtB] = useState<string | null>(null);
  const [showA, setShowA] = useState(true);

  const requestUrl = useMemo(() => `https://skateremix.com/request/${location}`, [location]);

  // Simple external QR image (no backend changes).
  // If you prefer: swap the domain to your dev URL during testing.
  const qrSrc = useMemo(() => {
    const size = 260;
    // Reliable QR image service
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(requestUrl)}`;
  }, [requestUrl]);

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

  const nowPlaying = playNow?.[0];
  const totalQueue = useMemo(() => upNext.length + playNow.length, [upNext, playNow]);

  // Flash when top Play Now changes
  useEffect(() => {
    const topId = playNow?.[0]?.id ?? null;
    if (!topId) return;

    if (prevTopBoostId.current && prevTopBoostId.current !== topId) {
      setBoostFlash(true);
      const t = setTimeout(() => setBoostFlash(false), 900);
      return () => clearTimeout(t);
    }
    prevTopBoostId.current = topId;
  }, [playNow]);

  // Artwork crossfade on nowPlaying.artworkUrl changes
  useEffect(() => {
    const next = nowPlaying?.artworkUrl || null;

    // First load
    if (!artA && !artB) {
      setArtA(next);
      setShowA(true);
      return;
    }

    // If unchanged, do nothing
    const currentVisible = showA ? artA : artB;
    if (next === currentVisible) return;

    // Load into hidden layer then flip
    if (showA) {
      setArtB(next);
      // allow browser to paint new image before flipping opacity
      requestAnimationFrame(() => setShowA(false));
    } else {
      setArtA(next);
      requestAnimationFrame(() => setShowA(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlaying?.artworkUrl]);

  return (
    <div className={`neonRoot tvRoot ${boostFlash ? "tvFlash" : ""}`}>
      <div className="tvWrap">
        {/* LEFT: BIG NOW PLAYING */}
        <div className="neonPanel tvLeft" style={{ padding: 22, display: "grid", gap: 18, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div className="tvBig">Now Playing</div>
            <div className="tvTag">{(location || "").toUpperCase()}</div>
          </div>

          <div className="tvNowGrid">
            {/* BIG ARTWORK with crossfade */}
            <div className="tvArtFrame" aria-hidden="true">
              <div className="tvArtPulse" />
              <div className="tvArtLayer" style={{ opacity: showA ? 1 : 0 }}>
                <Artwork src={artA} alt="" />
              </div>
              <div className="tvArtLayer" style={{ opacity: showA ? 0 : 1 }}>
                <Artwork src={artB} alt="" />
              </div>

              {/* Boost ribbon if there is a playNow item */}
              {nowPlaying?.id ? (
                <div className="tvRibbon">
                  BOOSTED
                </div>
              ) : null}
            </div>

            {/* Title / meta */}
            <div style={{ minWidth: 0 }}>
              <div className="tvTitle">{nowPlaying?.title || "—"}</div>
              <div className="tvArtistBig">{nowPlaying?.artist || " "}</div>

              <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div className="tvTag">REMIX REQUESTS</div>
                <div className="tvTag" style={{ boxShadow: "var(--glowB)" }}>
                  PLAY NOW • UP NEXT
                </div>
                <div className="tvTag" style={{ boxShadow: "var(--glowA)" }}>
                  STARTING AT $5
                </div>
              </div>

              <div style={{ marginTop: 16 }} className="neonEQ" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 18 }}>
                {requestUrl.replace("https://", "")}
              </div>
            </div>
          </div>

          {/* QR / CTA panel */}
          <div className="neonPanel tvCta">
            <div>
              <div className="tvCtaTitle">Scan to Request</div>
              <div className="tvCtaSub">Verify • Buy Credits • Tap a Song</div>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div className="tvTag">IMPULSE MODE</div>
                <div className="tvTag" style={{ boxShadow: "var(--glowB)" }}>
                  BIG ARTWORK
                </div>
                <div className="tvTag" style={{ boxShadow: "var(--glowA)" }}>
                  NEON RINK AESTHETIC
                </div>
              </div>
            </div>

            <div className="tvQrBox">
              <img
                src={qrSrc}
                alt="QR code to request songs"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 26 }}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: QUEUES */}
        <div className="tvRight" style={{ display: "grid", gap: 16, minHeight: 0 }}>
          <div className="neonPanel tvQueue" style={{ minHeight: 0 }}>
            <div className="tvQueueHeader">
              <div className="tvQueueTitle">Up Next</div>
              <div className="tvQueueMeta">{upNext.length ? `${upNext.length} in queue` : "Be the first!"}</div>
            </div>

            {upNext.slice(0, 10).map((q, i) => (
              <div className="tvRow" key={q.id}>
                <div className="tvPos">{i + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="tvSong">{q.title}</div>
                  <div className="tvArtist">{q.artist}</div>
                </div>
                <div className="tvTag">{q.score}</div>
              </div>
            ))}

            {upNext.length === 0 ? (
              <div style={{ padding: 12, color: "var(--muted)", fontSize: 18 }}>
                No requests yet — scan the QR and start the vibe.
              </div>
            ) : null}
          </div>

          <div className="neonPanel tvQueue" style={{ minHeight: 0 }}>
            <div className="tvQueueHeader">
              <div className="tvQueueTitle" style={{ color: "#ff39d4" }}>Play Now Lane</div>
              <div className="tvQueueMeta">{playNow.length ? `${playNow.length} boosted` : "No boosts yet"}</div>
            </div>

            {playNow.slice(0, 5).map((q, i) => (
              <div className="tvRow tvRowBoost" key={q.id}>
                <div className="tvPos">{i + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="tvSong">{q.title}</div>
                  <div className="tvArtist">{q.artist}</div>
                </div>
                <div className="tvBoostScore">
                  <span className="tvBoostPill">BOOST</span>
                  <span className="tvBoostNum">{q.score}</span>
                </div>

                {/* ribbon on each boosted row */}
                <div className="tvMiniRibbon">BOOSTED</div>
              </div>
            ))}

            {playNow.length === 0 ? (
              <div style={{ padding: 12, color: "var(--muted)", fontSize: 18 }}>
                No Play Now requests — want it next? Scan and hit <b>Play Now</b>.
              </div>
            ) : null}
          </div>

          {/* Optional quick total meta */}
          <div className="tvFooterMeta">
            <div className="tvTag">TOTAL QUEUE: {totalQueue}</div>
            <div className="tvTag" style={{ boxShadow: "var(--glowA)" }}>LIVE UPDATES</div>
          </div>
        </div>
      </div>

      {/* Local styles (portrait layout + animations) */}
      <style jsx global>{`
        /* Layout sizing */
        .tvWrap {
          display: grid;
          grid-template-columns: 1.3fr 0.9fr;
          gap: 18px;
          padding: 18px;
          height: 100vh;
          box-sizing: border-box;
        }

        .tvLeft { overflow: hidden; }
        .tvRight { overflow: hidden; }

        .tvNowGrid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 18px;
          align-items: center;
          min-height: 0;
        }

        .tvBig {
          font-size: 44px;
          font-weight: 1000;
          letter-spacing: -0.8px;
          text-shadow: 0 0 12px rgba(255,255,255,0.18);
        }

        .tvTitle {
          font-size: 62px;
          font-weight: 1000;
          line-height: 1.0;
          letter-spacing: -1.4px;
          text-shadow: 0 0 14px rgba(255,255,255,0.22);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tvArtistBig {
          font-size: 26px;
          color: var(--muted);
          margin-top: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Artwork frame + crossfade */
        .tvArtFrame {
          width: 260px;
          height: 260px;
          border-radius: 44px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
          box-shadow: var(--glowA), var(--glowB), var(--shadow);
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        .tvArtLayer {
          position: absolute;
          inset: 0;
          transition: opacity 420ms ease;
        }

        .tvArtPulse {
          position: absolute;
          inset: -60%;
          background:
            radial-gradient(circle at 30% 25%, rgba(0,247,255,0.22), transparent 55%),
            radial-gradient(circle at 75% 80%, rgba(255,57,212,0.18), transparent 62%);
          animation: tvPulse 4.5s ease-in-out infinite;
          filter: blur(22px);
          opacity: 0.9;
          z-index: 2;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        @keyframes tvPulse {
          0% { transform: scale(1.0); opacity: 0.85; }
          50% { transform: scale(1.08); opacity: 0.35; }
          100% { transform: scale(1.0); opacity: 0.85; }
        }

        /* Big BOOSTED ribbon on artwork */
        .tvRibbon {
          position: absolute;
          top: 18px;
          left: -54px;
          transform: rotate(-18deg);
          padding: 10px 64px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,57,212,0.85), rgba(0,247,255,0.75));
          color: #07070c;
          font-weight: 1000;
          letter-spacing: 2px;
          text-transform: uppercase;
          box-shadow: var(--glowB);
          z-index: 5;
        }

        /* CTA */
        .tvCta {
          padding: 14px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.18);
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 16px;
          align-items: center;
        }
        .tvCtaTitle { font-size: 34px; font-weight: 1000; letter-spacing: 0.6px; }
        .tvCtaSub { margin-top: 6px; font-size: 20px; color: var(--muted); }

        .tvQrBox {
          width: 260px;
          height: 260px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(0,0,0,0.20);
          box-shadow: var(--shadow);
          justify-self: end;
          overflow: hidden;
        }

        /* Queue headers */
        .tvQueueHeader {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 4px 6px 2px;
        }
        .tvQueueTitle {
          font-size: 28px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .tvQueueMeta { color: var(--muted); font-size: 16px; }

        /* Boost styling */
        .tvRowBoost {
          position: relative;
          border-color: rgba(255,57,212,0.28);
          box-shadow: var(--glowB);
          overflow: hidden;
        }
        .tvBoostScore {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: flex-end;
          min-width: 120px;
        }
        .tvBoostPill {
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,57,212,0.18);
          border: 1px solid rgba(255,57,212,0.34);
          box-shadow: var(--glowB);
          font-weight: 1000;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          font-size: 12px;
        }
        .tvBoostNum {
          font-weight: 1000;
          font-size: 18px;
        }
        .tvMiniRibbon {
          position: absolute;
          top: 10px;
          right: -54px;
          transform: rotate(18deg);
          padding: 6px 56px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,57,212,0.75), rgba(0,247,255,0.65));
          color: #07070c;
          font-weight: 1000;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          opacity: 0.9;
          pointer-events: none;
        }

        /* Flash screen on new boosted */
        .tvFlash::before {
          content: "";
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 50% 40%, rgba(255,57,212,0.18), transparent 55%),
                      radial-gradient(circle at 40% 60%, rgba(0,247,255,0.14), transparent 60%);
          animation: tvFlashAnim 900ms ease-out 1;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: screen;
        }
        @keyframes tvFlashAnim {
          0% { opacity: 0; }
          18% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Small footer meta */
        .tvFooterMeta {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          align-items: center;
          padding-right: 6px;
          opacity: 0.95;
        }

        /* ✅ Portrait layout */
        @media (orientation: portrait) {
          .tvWrap {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto;
            height: 100vh;
          }

          .tvNowGrid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .tvArtFrame {
            width: 100%;
            height: 360px;
            border-radius: 44px;
          }

          .tvCta {
            grid-template-columns: 1fr;
          }

          .tvQrBox {
            justify-self: start;
            width: 320px;
            height: 320px;
          }

          .tvTitle {
            font-size: 54px;
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .tvBig { font-size: 40px; }
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
          fontSize: 28,
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