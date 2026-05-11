// src/app/tv-top10/[location]/page.tsx
 "use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Top10Item = {
  id: string;
  songId: string;
  title: string;
  artist: string;
  artworkUrl?: string | null;
  score: number;
  requestCount: number;
  upvotes: number;
  downvotes: number;
};

type Top10Res = {
  ok: boolean;
  location?: { slug: string; name: string };
  bucket?: "GENERAL" | "ADULT";
  boardTitle?: string;
  displayLabel?: string;
  updatedAt?: string;
  logoUrl?: string | null;
  queueCount?: number;
  items?: Top10Item[];
};

type Snapshot = {
  location: string;
  createdAt: string;
  bucket: string;
  items: Top10Item[];
};

type Movement = { kind: "up" | "down" | "new" | "same"; delta?: number };

const POLL_MS = 12000;

const DEFAULT_ART =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#0b132d"/>
        <stop offset="1" stop-color="#19102d"/>
      </linearGradient>
    </defs>
    <rect width="800" height="800" fill="url(#g)"/>
    <circle cx="210" cy="180" r="160" fill="#00f7ff" fill-opacity="0.14"/>
    <circle cx="620" cy="610" r="220" fill="#ff39d4" fill-opacity="0.14"/>
    <text x="400" y="380" text-anchor="middle" fill="#ffffff" fill-opacity="0.9" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="700">REMIX</text>
    <text x="400" y="470" text-anchor="middle" fill="#d6defa" fill-opacity="0.7" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">TOP 10</text>
  </svg>`);

function requestUrlFor(location: string) {
  return `https://skateremix.com/request/${location}`;
}

function snapshotEquals(a: Snapshot | null, b: Snapshot | null) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.bucket !== b.bucket) return false;
  if (a.items.length !== b.items.length) return false;

  for (let i = 0; i < a.items.length; i += 1) {
    const left = a.items[i];
    const right = b.items[i];
    if (
      left.id !== right.id ||
      left.songId !== right.songId ||
      left.title !== right.title ||
      left.artist !== right.artist ||
      (left.artworkUrl || "") !== (right.artworkUrl || "") ||
      left.score !== right.score ||
      left.requestCount !== right.requestCount ||
      left.upvotes !== right.upvotes ||
      left.downvotes !== right.downvotes
    ) {
      return false;
    }
  }

  return true;
}

function safeArt(url?: string | null, defaultUrl?: string | null) {
  if (url && url !== "unknown") return url;
  if (defaultUrl && defaultUrl !== "unknown") return defaultUrl;
  return DEFAULT_ART;
}

function formatShortTime(value: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return value;
  }
}

export default function TvTop10Page({ params }: { params: { location: string } }) {
  const location = params.location;

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<Snapshot | null>(null);
  const [isPortraitLayout, setIsPortraitLayout] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [locationName, setLocationName] = useState("REMIX");
  const [bucketLabel, setBucketLabel] = useState("REMIX TOP 10");
  const [queueCount, setQueueCount] = useState(0);
  const [boardUpdatedAt, setBoardUpdatedAt] = useState("");
  const [defaultAlbumArtUrl, setDefaultAlbumArtUrl] = useState<string | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);

  const requestUrl = useMemo(() => requestUrlFor(location), [location]);
  const qrSrc = useMemo(() => {
    const size = isPortraitLayout ? 200 : 260;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(requestUrl)}`;
  }, [isPortraitLayout, requestUrl]);

  async function fetchBoard() {
    const res = await fetch(`/api/public/top10/${location}`, { cache: "no-store" });
    const data = (await res.json()) as Top10Res;
    if (!data?.ok) return null;

    if (data.location?.name) setLocationName(data.location.name.toUpperCase());
    if (typeof data.logoUrl === "string") setLogoUrl(data.logoUrl);
    if (data.displayLabel) setBucketLabel(data.displayLabel);
    if (typeof data.queueCount === "number") setQueueCount(data.queueCount);
    if (data.updatedAt) setBoardUpdatedAt(data.updatedAt);

    try {
      const rulesRes = await fetch(`/api/public/rules/${location}`, { cache: "no-store" });
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        const nextDefaultArt =
          rulesData?.rules?.defaultAlbumArtUrl ||
          rulesData?.defaultAlbumArtUrl ||
          null;
        setDefaultAlbumArtUrl(typeof nextDefaultArt === "string" ? nextDefaultArt : null);
      }
    } catch {
      // ignore rules fallback lookup failures
    }

    return {
      location,
      createdAt: data.updatedAt || new Date().toISOString(),
      bucket: data.bucket || "GENERAL",
      items: Array.isArray(data.items) ? data.items : [],
    } satisfies Snapshot;
  }

  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const apply = () => setIsPortraitLayout(media.matches);
    apply();
    const handler = () => apply();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }

    media.addListener(handler);
    return () => media.removeListener(handler);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const live = await fetchBoard();
        if (!live || cancelled) return;

        const current = snapshotRef.current;
        if (!current) {
          snapshotRef.current = live;
          setSnapshot(live);
          return;
        }

        if (snapshotEquals(current, live)) {
          if (current.createdAt !== live.createdAt) {
            snapshotRef.current = { ...current, createdAt: live.createdAt };
            setSnapshot({ ...current, createdAt: live.createdAt });
          }
          return;
        }

        setPreviousSnapshot(current);
        snapshotRef.current = live;
        setSnapshot(live);
      } catch {
        // keep last good board visible
      }
    };

    void run();
    const id = window.setInterval(run, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [location]);

  const items = snapshot?.items || [];
  const hero = items[0] || null;
  const landscapeRest = items.slice(1);
  const portraitRest = items.slice(1, 4);

  const movementById = useMemo(() => {
    const previousPositions = new Map<string, number>();
    (previousSnapshot?.items || []).forEach((item, index) => {
      previousPositions.set(item.songId || item.id, index + 1);
    });

    const map = new Map<string, Movement>();
    items.forEach((item, index) => {
      const currentRank = index + 1;
      const prevRank = previousPositions.get(item.songId || item.id);
      const key = item.songId || item.id;

      if (!prevRank) {
        map.set(key, { kind: "new" });
        return;
      }
      if (prevRank === currentRank) {
        map.set(key, { kind: "same" });
        return;
      }
      if (prevRank > currentRank) {
        map.set(key, { kind: "up", delta: prevRank - currentRank });
        return;
      }
      map.set(key, { kind: "down", delta: currentRank - prevRank });
    });

    return map;
  }, [items, previousSnapshot]);

  return (
    <div className="neonRoot remixTop10Root">
      <div className="remixTop10Orb remixTop10OrbA" />
      <div className="remixTop10Orb remixTop10OrbB" />
      <div className="remixTop10Orb remixTop10OrbC" />

      <div className={`remixTop10Wrap ${isPortraitLayout ? "remixTop10Wrap--portrait" : ""}`}>
        <section className="neonPanel remixTop10HeaderPanel">
          <div className="remixTop10Brand">
            {logoUrl ? (
              <img className="remixTop10Logo" src={logoUrl} alt={`${locationName} logo`} />
            ) : (
              <div className="remixTop10LogoFallback remixTop10LogoFallback--hero">
                <div className="remixTop10LogoInner">REMIX</div>
              </div>
            )}
            <div className="remixTop10BrandText">
              <div className="remixTop10Title">{bucketLabel}</div>
              <div className="remixTop10Sub">{locationName} • LIVE CROWD SCOREBOARD</div>
            </div>
          </div></section>

{!isPortraitLayout ? (
  <div className="remixTop10HeaderMeta">
    <div className="remixTop10ModePill">{bucketLabel}</div>
    <div className="remixTop10LivePill">
      {items.length} RANKED • {queueCount} IN QUEUE
    </div>
  </div>
) : null}

        {!isPortraitLayout ? (
          <div className="remixTop10Content">
            <section className="neonPanel remixTop10HeroPanel">
              <div className="remixTop10HeroHeader">
                <div className="remixTop10HeroKicker">#1 RIGHT NOW</div>
                <div className="remixTop10HeroChip">{bucketLabel}</div>
              </div>

              {hero ? (
                <div className="remixTop10HeroBody">
                  <div className="remixTop10HeroArtWrap">
                    <div className="remixTop10HeroArtGlow" />
                    <img
                      className="remixTop10HeroArt"
                      src={safeArt(hero.artworkUrl, defaultAlbumArtUrl)}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="remixTop10HeroMeta">
                    <div className="remixTop10HeroRank">#1</div>
                    <div className="remixTop10HeroSong">{hero.title}</div>
                    <div className="remixTop10HeroArtist">{hero.artist}</div>
                    <div className="remixTop10HeroStats">
                      <span className="remixTop10Stat remixTop10Stat--score">SCORE {hero.score}</span>
                      <span className="remixTop10Stat">REQ {hero.requestCount}</span>
                      <span className="remixTop10Stat">▲ {hero.upvotes}</span>
                      <span className="remixTop10Stat">▼ {hero.downvotes}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="remixTop10Empty">FEATURED TRACKS loading — rankings will appear after requests build the board.</div>
              )}
            </section>

            <section className="neonPanel remixTop10ListPanel">
              <div className="remixTop10ListHeaderRow">
                <div className="remixTop10ListTitle">{bucketLabel}</div>
                <div className="remixTop10ListMeta">
                  Updated {formatShortTime(boardUpdatedAt || snapshot?.createdAt || "")}
                </div>
              </div>

              {landscapeRest.length ? (
                <div className="remixTop10List">
                  {landscapeRest.map((item, index) => {
                    const rank = index + 2;
                    const movement = movementById.get(item.songId || item.id) || { kind: "same" as const };
                    return (
                      <div className="remixTop10Row" key={item.id}>
                        <div className="remixTop10RowRank">{rank}</div>
                        <div className="remixTop10RowArtWrap">
                          <img
                            className="remixTop10RowArt"
                            src={safeArt(item.artworkUrl, defaultAlbumArtUrl)}
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="remixTop10RowText">
                          <div className="remixTop10RowSong">{item.title}</div>
                          <div className="remixTop10RowArtist">{item.artist}</div>
                        </div>
                        <div className="remixTop10RowScore">{item.score}</div>
                        <div className={`remixTop10Move remixTop10Move--${movement.kind}`}>
                          {movement.kind === "up" ? `▲ ${movement.delta}` : null}
                          {movement.kind === "down" ? `▼ ${movement.delta}` : null}
                          {movement.kind === "new" ? "NEW" : null}
                          {movement.kind === "same" ? "—" : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="remixTop10Empty remixTop10Empty--small">FEATURED TRACKS will fill this space until more songs rank.</div>
              )}
            </section>

            <section className="neonPanel remixTop10CtaPanel">
              <div className="remixTop10CtaCopy">
                <div className="remixTop10CtaTitle">Think your song should be #1?</div>
                <div className="remixTop10CtaSub">Scan to request now and push the board.</div>
              </div>
              <div className="remixTop10QrWrap">
                <img className="remixTop10Qr" src={qrSrc} alt="QR code" />
              </div>
            </section>
          </div>
        ) : (
          <div className="remixTop10ContentPortrait">
            <section className="neonPanel remixTop10PortraitHeroPanel">

              {hero ? (
                <div className="remixTop10PortraitHeroBody">
                  <div className="remixTop10PortraitArtWrap">
                    <div className="remixTop10HeroArtGlow" />
                    <img
                      className="remixTop10PortraitArt"
                      src={safeArt(hero.artworkUrl, defaultAlbumArtUrl)}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="remixTop10PortraitHeroMeta">
                    <div className="remixTop10PortraitHeroRank">#1</div>
                    <div className="remixTop10PortraitHeroSong">{hero.title}</div>
                    <div className="remixTop10PortraitHeroArtist">{hero.artist}</div>
                    <div className="remixTop10PortraitHeroStats remixTop10PortraitHeroStats--singleline">
  <span className="remixTop10Stat remixTop10Stat--score">SCORE {hero.score}</span>
  <span className="remixTop10Stat">REQ {hero.requestCount}</span>
  <span className="remixTop10Stat">▲ {hero.upvotes}</span>
  <span className="remixTop10Stat">▼ {hero.downvotes}</span>
</div>
                  </div>
                </div>
              ) : (
                <div className="remixTop10Empty remixTop10Empty--small">FEATURED TRACKS loading — rankings coming soon.</div>
              )}
            </section>

            <section className="neonPanel remixTop10PortraitListPanel">
            
              {portraitRest.length ? (
                <div className="remixTop10PortraitList">
                  {portraitRest.map((item, index) => {
                    const rank = index + 2;
                    const movement = movementById.get(item.songId || item.id) || { kind: "same" as const };

                    return (
                      <div className="remixTop10PortraitRow" key={item.id}>
                        <div className="remixTop10PortraitRowRank">{rank}</div>
                        <div className="remixTop10PortraitRowText">
                          <div className="remixTop10PortraitRowSong">{item.title}</div>
                          <div className="remixTop10PortraitRowArtist">{item.artist}</div>
                        </div>
                        <div className="remixTop10PortraitRowScore">{item.score}</div>
                        <div className={`remixTop10Move remixTop10Move--portrait remixTop10Move--${movement.kind}`}>
                          {movement.kind === "up" ? `▲ ${movement.delta}` : null}
                          {movement.kind === "down" ? `▼ ${movement.delta}` : null}
                          {movement.kind === "new" ? "NEW" : null}
                          {movement.kind === "same" ? "—" : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="remixTop10Empty remixTop10Empty--small">FEATURED TRACKS will fill this space until more songs rank.</div>
              )}
            </section>

            <section className="neonPanel remixTop10PortraitCtaPanel">
              <div className="remixTop10PortraitCtaCopy">
                <div className="remixTop10PortraitCtaTitle">Think your song should be #1?</div>
                <div className="remixTop10PortraitCtaSub">Scan to request now and push the board.</div>
              </div>
              <div className="remixTop10PortraitQrWrap">
                <img className="remixTop10PortraitQr" src={qrSrc} alt="QR code" />
              </div>
            </section>
          </div>
        )}
      </div>

      <style jsx global>{`
        .remixTop10Root {
          min-height: 100vh;
          height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at top left, rgba(0,247,255,0.09), transparent 26%),
            radial-gradient(circle at bottom right, rgba(255,57,212,0.09), transparent 30%),
            linear-gradient(180deg, #050816 0%, #060b18 48%, #05060c 100%);
        }
        .remixTop10Orb { position: absolute; border-radius: 999px; filter: blur(50px); opacity: .35; pointer-events: none; }
        .remixTop10OrbA { width: 320px; height: 320px; background: rgba(0,247,255,.18); top: -80px; left: -60px; }
        .remixTop10OrbB { width: 360px; height: 360px; background: rgba(255,57,212,.16); right: -90px; top: 18vh; }
        .remixTop10OrbC { width: 280px; height: 280px; background: rgba(120,160,255,.16); left: 25vw; bottom: -80px; }

        .remixTop10Wrap {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          height: 100vh;
          padding: 18px;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 16px;
          box-sizing: border-box;
        }
        .remixTop10Wrap--portrait {
          padding: 12px;
          gap: 10px;
          overflow: hidden;
        }

        .remixTop10HeaderPanel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          padding: 16px 18px;
          min-height: 0;
        }
        .remixTop10Brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .remixTop10Logo, .remixTop10LogoFallback {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          object-fit: contain;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.14);
          box-shadow: var(--glowA);
        }
        .remixTop10LogoFallback { display: grid; place-items: center; font-weight: 1000; letter-spacing: 1px; }

        .remixTop10LogoFallback--hero {
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 30% 30%, rgba(0,247,255,.25), transparent 60%),
                      linear-gradient(135deg, rgba(0,247,255,.15), rgba(255,57,212,.15));
          box-shadow: 0 0 20px rgba(0,247,255,.25), inset 0 0 10px rgba(255,255,255,.1);
        }
        .remixTop10LogoInner {
          font-weight: 1000;
          letter-spacing: 2px;
          font-size: 18px;
          background: linear-gradient(90deg, #00f7ff, #ff39d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .remixTop10BrandText { min-width: 0; }
        .remixTop10Title { font-size: clamp(28px, 2.6vw, 40px); line-height: 1; font-weight: 1000; letter-spacing: -.9px; }
        .remixTop10Sub { margin-top: 6px; color: var(--muted); font-size: clamp(13px, 1vw, 16px); }
        .remixTop10HeaderMeta { display: grid; gap: 8px; justify-items: end; }
        .remixTop10ModePill, .remixTop10LivePill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 0 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          box-shadow: var(--glowA);
          border: 1px solid rgba(255,255,255,.12);
        }
        .remixTop10ModePill { background: linear-gradient(90deg, rgba(0,247,255,.16), rgba(255,57,212,.14)); }
        .remixTop10LivePill { background: rgba(255,255,255,.05); }

        .remixTop10Content {
          display: grid;
          grid-template-columns: minmax(420px, 1.06fr) minmax(520px, 1.2fr) 320px;
          gap: 16px;
          min-height: 0;
          height: 100%;
        }

        .remixTop10HeroPanel, .remixTop10ListPanel, .remixTop10CtaPanel { padding: 18px; min-height: 0; }
        .remixTop10HeroPanel { display: grid; grid-template-rows: auto 1fr; }
        .remixTop10HeroHeader { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .remixTop10HeroHeader--portrait { margin-bottom: 10px; }
        .remixTop10HeroKicker { font-weight: 1000; letter-spacing: 1.3px; opacity: .78; font-size: 12px; }
        .remixTop10HeroChip {
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 1px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
        }

        .remixTop10HeroBody {
          display: grid;
          grid-template-columns: minmax(190px, 220px) 1fr;
          gap: 18px;
          align-items: center;
          min-height: 0;
        }
        .remixTop10HeroArtWrap,
        .remixTop10PortraitArtWrap {
          position: relative;
          aspect-ratio: 1;
          border-radius: 30px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(255,255,255,.04);
        }
        .remixTop10HeroArtGlow {
          position: absolute;
          inset: -20%;
          background: radial-gradient(circle at center, rgba(0,247,255,.22), transparent 52%);
          filter: blur(22px);
          pointer-events: none;
        }
        .remixTop10HeroArt,
        .remixTop10PortraitArt {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .remixTop10HeroMeta { min-width: 0; }
        .remixTop10HeroRank { font-size: clamp(40px, 3.6vw, 70px); font-weight: 1000; letter-spacing: -1.6px; line-height: 1; }
        .remixTop10HeroSong { margin-top: 10px; font-size: clamp(24px, 2.4vw, 38px); font-weight: 1000; line-height: 1.02; text-wrap: balance; }
        .remixTop10HeroArtist { margin-top: 8px; color: var(--muted); font-size: clamp(16px, 1.2vw, 22px); }
        .remixTop10HeroStats,
        .remixTop10PortraitHeroStats {
          margin-top: 14px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .remixTop10PortraitHeroStats--singleline {
  margin-top: 10px;
  gap: 4px;
  flex-wrap: nowrap;
}

@media (orientation: portrait) {
  .remixTop10PortraitHeroStats--singleline .remixTop10Stat {
    min-height: 28px;
    padding: 0 8px;
    font-size: 10px;
    letter-spacing: 0.4px;
  }
}

        .remixTop10Stat {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.10);
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: .8px;
        }
        .remixTop10Stat--score { background: linear-gradient(90deg, rgba(0,247,255,.16), rgba(255,57,212,.14)); }

        .remixTop10ListHeaderRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .remixTop10ListHeaderRow--portrait { margin-bottom: 8px; }
        .remixTop10ListTitle { font-size: 18px; font-weight: 1000; letter-spacing: .8px; }
        .remixTop10ListMeta { color: var(--muted); font-size: 12px; }

        .remixTop10List { display: grid; gap: 10px; }
        .remixTop10Row {
          display: grid;
          grid-template-columns: 44px 58px 1fr 78px 74px;
          gap: 12px;
          align-items: center;
          min-height: 72px;
          padding: 10px 12px;
          border-radius: 18px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: var(--shadow);
        }
        .remixTop10RowRank { font-size: 28px; font-weight: 1000; text-align: center; }
        .remixTop10RowArtWrap {
          width: 58px;
          height: 58px;
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.1);
        }
        .remixTop10RowArt { width: 100%; height: 100%; object-fit: cover; display: block; }
        .remixTop10RowText { min-width: 0; }
        .remixTop10RowSong { font-size: 18px; font-weight: 1000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .remixTop10RowArtist { margin-top: 3px; color: var(--muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .remixTop10RowScore { justify-self: end; min-width: 56px; text-align: right; font-size: 24px; font-weight: 1000; }

        .remixTop10Move {
          justify-self: end;
          min-width: 62px;
          text-align: center;
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: .8px;
          border: 1px solid rgba(255,255,255,.08);
        }
        .remixTop10Move--portrait {
          min-width: 48px;
          padding: 6px 8px;
          font-size: 10px;
        }
        .remixTop10Move--up { background: rgba(33, 200, 120, .18); color: #9ef0ba; }
        .remixTop10Move--down { background: rgba(255, 80, 120, .18); color: #ffb0c7; }
        .remixTop10Move--new { background: rgba(0,247,255,.14); color: #9ef7ff; }
        .remixTop10Move--same { background: rgba(255,255,255,.06); color: rgba(255,255,255,.72); }

        .remixTop10CtaPanel {
          display: grid;
          align-content: center;
          justify-items: center;
          text-align: center;
          gap: 14px;
        }
        .remixTop10CtaTitle { font-size: 22px; font-weight: 1000; line-height: 1.05; }
        .remixTop10CtaSub { margin-top: 6px; color: var(--muted); font-size: 14px; }
        .remixTop10QrWrap,
        .remixTop10PortraitQrWrap {
          padding: 14px;
          border-radius: 24px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: var(--glowA);
        }
        .remixTop10Qr,
        .remixTop10PortraitQr {
          width: min(100%, 240px);
          display: block;
          border-radius: 18px;
          background: #fff;
        }

        .remixTop10ContentPortrait {
          display: grid;
          grid-template-rows: auto auto 1fr;
          gap: 10px;
          min-height: 0;
          height: 100%;
          overflow: hidden;
        }
        .remixTop10PortraitHeroPanel,
        .remixTop10PortraitListPanel,
        .remixTop10PortraitCtaPanel {
          padding: 12px;
          min-height: 0;
          overflow: hidden;
        }
        .remixTop10PortraitHeroPanel { display: grid; grid-template-rows: auto 1fr; }
        .remixTop10PortraitHeroBody {
          display: grid;
          grid-template-columns: 104px 1fr;
          gap: 12px;
          align-items: center;
          min-height: 0;
        }
        .remixTop10PortraitArtWrap {
          width: 104px;
          height: 104px;
          border-radius: 22px;
          justify-self: start;
        }
        .remixTop10PortraitHeroMeta { min-width: 0; }
        .remixTop10PortraitHeroRank {
          font-size: 34px;
          font-weight: 1000;
          line-height: 1;
          letter-spacing: -1px;
        }
        .remixTop10PortraitHeroSong {
          margin-top: 6px;
          font-size: 18px;
          line-height: 1.03;
          font-weight: 1000;
          text-wrap: balance;
        }
        .remixTop10PortraitHeroArtist {
          margin-top: 6px;
          font-size: 12px;
          color: var(--muted);
        }

        .remixTop10PortraitListPanel {
          display: grid;
          grid-template-rows: auto 1fr;
        }
        .remixTop10PortraitList {
          display: grid;
          gap: 8px;
          min-height: 0;
          align-content: start;
        }
        .remixTop10PortraitRow {
          display: grid;
          grid-template-columns: 26px 1fr 32px 52px;
          gap: 8px;
          align-items: center;
          min-height: 48px;
          padding: 8px 10px;
          border-radius: 16px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: var(--shadow);
        }
        .remixTop10PortraitRowRank {
          font-size: 18px;
          font-weight: 1000;
          text-align: center;
        }
        .remixTop10PortraitRowText { min-width: 0; }
        .remixTop10PortraitRowSong {
          font-size: 14px;
          font-weight: 1000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .remixTop10PortraitRowArtist {
          margin-top: 2px;
          font-size: 11px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .remixTop10PortraitRowScore {
          text-align: right;
          font-size: 18px;
          font-weight: 1000;
        }

        .remixTop10PortraitCtaPanel {
          display: grid;
          justify-items: center;
          align-content: center;
          text-align: center;
          gap: 6px;
          padding-top: 10px;
          padding-bottom: 10px;
        }
        .remixTop10PortraitCtaCopy { display: grid; gap: 4px; }
        .remixTop10PortraitCtaTitle {
          font-size: 14px;
          font-weight: 1000;
          line-height: 1.05;
        }
        .remixTop10PortraitCtaSub {
          color: var(--muted);
          font-size: 11px;
        }
        .remixTop10PortraitQrWrap {
          padding: 10px;
          border-radius: 18px;
        }
        .remixTop10PortraitQr {
          width: 136px;
          border-radius: 12px;
        }

        .remixTop10Empty {
          display: grid;
          place-items: center;
          min-height: 220px;
          text-align: center;
          color: var(--muted);
          font-size: 18px;
        }
        .remixTop10Empty--small {
          min-height: 80px;
          font-size: 14px;
        }

        @media (orientation: portrait) {
          .remixTop10HeaderPanel {
            padding: 12px;
            gap: 10px;
            align-items: flex-start;
            flex-direction: column;
          }
          .remixTop10Brand { gap: 10px; }
          .remixTop10Logo, .remixTop10LogoFallback {
            width: 48px;
            height: 48px;
            border-radius: 14px;
          }
          .remixTop10Title { font-size: 20px; }
          .remixTop10Sub {
            margin-top: 4px;
            font-size: 10px;
            line-height: 1.15;
          }
          .remixTop10HeaderMeta {
            width: 100%;
            justify-items: start;
            gap: 6px;
          }
          .remixTop10ModePill,
          .remixTop10LivePill {
            min-height: 30px;
            padding: 0 12px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
