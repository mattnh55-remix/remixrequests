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

const TITLE_ROTATION = ["TODAY'S TOP 10", "WEEK'S TOP 10", "ADULT NIGHT TOP 10"] as const;
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

export default function TvTop10Page({ params }: { params: { location: string } }) {
  const location = params.location;

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<Snapshot | null>(null);
  const [isPortraitLayout, setIsPortraitLayout] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);
  const [logoUrl, setLogoUrl] = useState("");
  const [locationName, setLocationName] = useState("REMIX");
  const [bucketLabel, setBucketLabel] = useState("REMIX TOP 10");
  const [queueCount, setQueueCount] = useState(0);
  const [boardUpdatedAt, setBoardUpdatedAt] = useState("");
  const snapshotRef = useRef<Snapshot | null>(null);

  const requestUrl = useMemo(() => requestUrlFor(location), [location]);
  const qrSrc = useMemo(() => {
    const size = isPortraitLayout ? 230 : 260;
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
    const id = window.setInterval(() => {
      setTitleIndex((v) => (v + 1) % TITLE_ROTATION.length);
    }, 9000);
    return () => window.clearInterval(id);
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
  const rest = items.slice(1);
  const activeTitle = TITLE_ROTATION[titleIndex];

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
              <div className="remixTop10LogoFallback">REMIX</div>
            )}
            <div className="remixTop10BrandText">
              <div className="remixTop10Title">REMIX TOP 10</div>
              <div className="remixTop10Sub">{locationName} • LIVE CROWD SCOREBOARD</div>
            </div>
          </div>

          <div className="remixTop10HeaderMeta">
            <div className="remixTop10ModePill">{activeTitle}</div>
            <div className="remixTop10LivePill">
              {items.length} RANKED • {queueCount} IN QUEUE
            </div>
          </div>
        </section>

        <div className={`remixTop10Content ${isPortraitLayout ? "remixTop10Content--portrait" : ""}`}>
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
                    src={hero.artworkUrl && hero.artworkUrl !== "unknown" ? hero.artworkUrl : DEFAULT_ART}
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
              <div className="remixTop10Empty">No ranked songs yet — scan the QR and start the board.</div>
            )}
          </section>

          <section className="neonPanel remixTop10ListPanel">
            <div className="remixTop10ListHeaderRow">
              <div className="remixTop10ListTitle">{bucketLabel}</div>
              <div className="remixTop10ListMeta">
                Updated {formatShortTime(boardUpdatedAt || snapshot?.createdAt || "")}
              </div>
            </div>

            {rest.length ? (
              <div className="remixTop10List">
                {rest.map((item, index) => {
                  const rank = index + 2;
                  const movement = movementById.get(item.songId || item.id) || { kind: "same" as const };
                  return (
                    <div className="remixTop10Row" key={item.id}>
                      <div className="remixTop10RowRank">{rank}</div>
                      <div className="remixTop10RowArtWrap">
                        <img
                          className="remixTop10RowArt"
                          src={item.artworkUrl && item.artworkUrl !== "unknown" ? item.artworkUrl : DEFAULT_ART}
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
              <div className="remixTop10Empty remixTop10Empty--small">Only one song ranked so far.</div>
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
      </div>

      <style jsx global>{`
        .remixTop10Root {
          min-height: 100vh;
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
        .remixTop10Wrap { position: relative; z-index: 1; min-height: 100vh; padding: 18px; display: grid; grid-template-rows: auto 1fr; gap: 16px; box-sizing: border-box; }
        .remixTop10Wrap--portrait { padding: 14px; gap: 14px; }
        .remixTop10HeaderPanel { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 16px 18px; }
        .remixTop10Brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .remixTop10Logo, .remixTop10LogoFallback { width: 72px; height: 72px; border-radius: 18px; object-fit: contain; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); box-shadow: var(--glowA); }
        .remixTop10LogoFallback { display: grid; place-items: center; font-weight: 1000; letter-spacing: 1px; }
        .remixTop10BrandText { min-width: 0; }
        .remixTop10Title { font-size: clamp(28px, 2.6vw, 40px); line-height: 1; font-weight: 1000; letter-spacing: -.9px; }
        .remixTop10Sub { margin-top: 6px; color: var(--muted); font-size: clamp(13px, 1vw, 16px); }
        .remixTop10HeaderMeta { display: grid; gap: 8px; justify-items: end; }
        .remixTop10ModePill, .remixTop10LivePill { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 16px; border-radius: 999px; font-size: 13px; font-weight: 1000; letter-spacing: 1px; text-transform: uppercase; box-shadow: var(--glowA); border: 1px solid rgba(255,255,255,.12); }
        .remixTop10ModePill { background: linear-gradient(90deg, rgba(0,247,255,.16), rgba(255,57,212,.14)); }
        .remixTop10LivePill { background: rgba(255,255,255,.05); }
        .remixTop10Content { display: grid; grid-template-columns: minmax(420px, 1.06fr) minmax(520px, 1.2fr) 320px; gap: 16px; min-height: 0; }
        .remixTop10Content--portrait { grid-template-columns: 1fr; grid-template-rows: auto auto auto; }
        .remixTop10HeroPanel, .remixTop10ListPanel, .remixTop10CtaPanel { padding: 18px; min-height: 0; }
        .remixTop10HeroPanel { display: grid; grid-template-rows: auto 1fr; }
        .remixTop10HeroHeader { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .remixTop10HeroKicker { font-weight: 1000; letter-spacing: 1.3px; opacity: .78; font-size: 12px; }
        .remixTop10HeroChip { padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: 1000; letter-spacing: 1px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); }
        .remixTop10HeroBody { display: grid; grid-template-columns: minmax(190px, 220px) 1fr; gap: 18px; align-items: center; min-height: 0; }
        .remixTop10HeroArtWrap { position: relative; aspect-ratio: 1; border-radius: 30px; overflow: hidden; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.04); }
        .remixTop10HeroArtGlow { position: absolute; inset: -20%; background: radial-gradient(circle at center, rgba(0,247,255,.22), transparent 52%); filter: blur(22px); pointer-events: none; }
        .remixTop10HeroArt { position: relative; z-index: 1; width: 100%; height: 100%; object-fit: cover; display: block; }
        .remixTop10HeroMeta { min-width: 0; }
        .remixTop10HeroRank { font-size: clamp(40px, 3.6vw, 70px); font-weight: 1000; letter-spacing: -1.6px; line-height: 1; }
        .remixTop10HeroSong { margin-top: 10px; font-size: clamp(24px, 2.4vw, 38px); font-weight: 1000; line-height: 1.02; text-wrap: balance; }
        .remixTop10HeroArtist { margin-top: 8px; color: var(--muted); font-size: clamp(16px, 1.2vw, 22px); }
        .remixTop10HeroStats { margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; }
        .remixTop10Stat { display: inline-flex; align-items: center; min-height: 34px; padding: 0 12px; border-radius: 999px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.10); font-size: 12px; font-weight: 1000; letter-spacing: .8px; }
        .remixTop10Stat--score { background: linear-gradient(90deg, rgba(0,247,255,.16), rgba(255,57,212,.14)); }
        .remixTop10ListHeaderRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .remixTop10ListTitle { font-size: 18px; font-weight: 1000; letter-spacing: .8px; }
        .remixTop10ListMeta { color: var(--muted); font-size: 12px; }
        .remixTop10List { display: grid; gap: 10px; }
        .remixTop10Row { display: grid; grid-template-columns: 44px 58px 1fr 78px 74px; gap: 12px; align-items: center; min-height: 72px; padding: 10px 12px; border-radius: 18px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); box-shadow: var(--shadow); }
        .remixTop10RowRank { font-size: 28px; font-weight: 1000; text-align: center; }
        .remixTop10RowArtWrap { width: 58px; height: 58px; border-radius: 14px; overflow: hidden; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); }
        .remixTop10RowArt { width: 100%; height: 100%; object-fit: cover; display: block; }
        .remixTop10RowText { min-width: 0; }
        .remixTop10RowSong { font-size: 18px; font-weight: 1000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .remixTop10RowArtist { margin-top: 3px; color: var(--muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .remixTop10RowScore { justify-self: end; min-width: 56px; text-align: right; font-size: 24px; font-weight: 1000; }
        .remixTop10Move { justify-self: end; min-width: 62px; text-align: center; padding: 8px 10px; border-radius: 999px; font-size: 12px; font-weight: 1000; letter-spacing: .8px; border: 1px solid rgba(255,255,255,.08); }
        .remixTop10Move--up { background: rgba(33, 200, 120, .18); color: #9ef0ba; }
        .remixTop10Move--down { background: rgba(255, 80, 120, .18); color: #ffb0c7; }
        .remixTop10Move--new { background: rgba(0,247,255,.14); color: #9ef7ff; }
        .remixTop10Move--same { background: rgba(255,255,255,.06); color: rgba(255,255,255,.72); }
        .remixTop10CtaPanel { display: grid; align-content: center; justify-items: center; text-align: center; gap: 14px; }
        .remixTop10CtaTitle { font-size: 22px; font-weight: 1000; line-height: 1.05; }
        .remixTop10CtaSub { margin-top: 6px; color: var(--muted); font-size: 14px; }
        .remixTop10QrWrap { padding: 14px; border-radius: 24px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.12); box-shadow: var(--glowA); }
        .remixTop10Qr { width: min(100%, 240px); display: block; border-radius: 18px; background: #fff; }
        .remixTop10Empty { display: grid; place-items: center; min-height: 220px; text-align: center; color: var(--muted); font-size: 18px; }
        .remixTop10Empty--small { min-height: 120px; font-size: 16px; }
        @media (orientation: portrait) {
          .remixTop10HeaderPanel { padding: 14px; align-items: flex-start; flex-direction: column; }
          .remixTop10HeaderMeta { justify-items: start; width: 100%; }
          .remixTop10Logo, .remixTop10LogoFallback { width: 58px; height: 58px; border-radius: 15px; }
          .remixTop10Content { grid-template-columns: 1fr; }
          .remixTop10HeroBody { grid-template-columns: 116px 1fr; gap: 12px; }
          .remixTop10HeroArtWrap { border-radius: 22px; }
          .remixTop10HeroRank { font-size: 40px; }
          .remixTop10HeroSong { font-size: 24px; }
          .remixTop10HeroArtist { font-size: 15px; }
          .remixTop10Row { grid-template-columns: 34px 48px 1fr 54px 56px; gap: 8px; min-height: 62px; padding: 9px 10px; }
          .remixTop10RowRank { font-size: 22px; }
          .remixTop10RowArtWrap { width: 48px; height: 48px; border-radius: 12px; }
          .remixTop10RowSong { font-size: 15px; }
          .remixTop10RowArtist { font-size: 12px; }
          .remixTop10RowScore { font-size: 18px; min-width: 42px; }
          .remixTop10Move { min-width: 52px; padding: 7px 6px; font-size: 11px; }
        }
      `}</style>
    </div>
  );
}

function formatShortTime(value: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return value;
  }
}
