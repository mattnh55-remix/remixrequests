"use client";

import { useEffect, useMemo, useState } from "react";

type QItem = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  score: number;
};

type Snapshot = {
  location: string;
  createdAt: string;
  items: QItem[];
};

type SessionRes = {
  location?: { slug: string; name: string };
  rules?: { logoUrl?: string | null };
};

type Movement = {
  kind: "up" | "down" | "new" | "same";
  delta?: number;
};

const TITLE_ROTATION = ["TODAY'S TOP 10", "WEEK'S TOP 10", "ADULT NIGHT TOP 10"] as const;

function snapshotKey(location: string) {
  return `remix_top10_snapshot:${location}`;
}

function previousSnapshotKey(location: string) {
  return `remix_top10_snapshot_prev:${location}`;
}

function requestUrlFor(location: string) {
  return `https://skateremix.com/request/${location}`;
}

export default function TvTop10Page({ params }: { params: { location: string } }) {
  const location = params.location;

  const [livePlayNow, setLivePlayNow] = useState<QItem[]>([]);
  const [liveUpNext, setLiveUpNext] = useState<QItem[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<Snapshot | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [locationName, setLocationName] = useState("REMIX");
  const [titleIndex, setTitleIndex] = useState(0);
  const [isPortraitLayout, setIsPortraitLayout] = useState(false);

  const refreshRequested = useMemo(() => {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    return url.searchParams.get("refresh") === "1";
  }, []);

  const requestUrl = useMemo(() => requestUrlFor(location), [location]);

  const qrSrc = useMemo(() => {
    const size = isPortraitLayout ? 230 : 260;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      requestUrl
    )}`;
  }, [isPortraitLayout, requestUrl]);

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${location}`, { cache: "no-store" });
      const data = (await res.json()) as SessionRes;
      if (data?.location?.name) setLocationName(data.location.name.toUpperCase());
      if (data?.rules?.logoUrl) setLogoUrl(data.rules.logoUrl);
    } catch {
      // ignore
    }
  }

  async function fetchQueue() {
    const res = await fetch(`/api/public/queue/${location}`, { cache: "no-store" });
    const data = await res.json();
    const playNow = Array.isArray(data.playNow) ? data.playNow : [];
    const upNext = Array.isArray(data.upNext) ? data.upNext : [];
    setLivePlayNow(playNow);
    setLiveUpNext(upNext);
    return { playNow, upNext };
  }

  function computeTop10(playNow: QItem[], upNext: QItem[]) {
    const seen = new Set<string>();
    return [...(playNow || []), ...(upNext || [])]
      .filter((x) => {
        if (!x?.id) return false;
        if (seen.has(x.id)) return false;
        seen.add(x.id);
        return true;
      })
      .slice(0, 10);
  }

  function loadSnapshot(key: string) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Snapshot;
      if (!parsed?.items?.length) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveSnapshot(items: QItem[]) {
    const current = loadSnapshot(snapshotKey(location));
    if (current?.items?.length) {
      localStorage.setItem(previousSnapshotKey(location), JSON.stringify(current));
      setPreviousSnapshot(current);
    }

    const next: Snapshot = {
      location,
      createdAt: new Date().toISOString(),
      items,
    };

    localStorage.setItem(snapshotKey(location), JSON.stringify(next));
    setSnapshot(next);
  }

  useEffect(() => {
    void refreshSession();
  }, [location]);

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
      setTitleIndex((value) => (value + 1) % TITLE_ROTATION.length);
    }, 9000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      const existing = loadSnapshot(snapshotKey(location));
      const previous = loadSnapshot(previousSnapshotKey(location));
      if (previous) setPreviousSnapshot(previous);

      const live = await fetchQueue();

      if (refreshRequested) {
        saveSnapshot(computeTop10(live.playNow, live.upNext));
        return;
      }

      if (existing) {
        setSnapshot(existing);
        return;
      }

      saveSnapshot(computeTop10(live.playNow, live.upNext));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchQueue().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, [location]);

  const items = snapshot?.items || [];
  const hero = items[0] || null;
  const rest = items.slice(1);
  const liveCount = Math.max(0, livePlayNow.length + liveUpNext.length);
  const activeTitle = TITLE_ROTATION[titleIndex];

  const movementById = useMemo(() => {
    const previousPositions = new Map<string, number>();
    (previousSnapshot?.items || []).forEach((item, index) => {
      previousPositions.set(item.id, index + 1);
    });

    const map = new Map<string, Movement>();
    items.forEach((item, index) => {
      const currentRank = index + 1;
      const prevRank = previousPositions.get(item.id);

      if (!prevRank) {
        map.set(item.id, { kind: "new" });
        return;
      }

      if (prevRank === currentRank) {
        map.set(item.id, { kind: "same" });
        return;
      }

      if (prevRank > currentRank) {
        map.set(item.id, { kind: "up", delta: prevRank - currentRank });
        return;
      }

      map.set(item.id, { kind: "down", delta: currentRank - prevRank });
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
            <div className="remixTop10LivePill">{items.length || 0} RANKED • {liveCount} IN QUEUE</div>
          </div>
        </section>

        <div className={`remixTop10Content ${isPortraitLayout ? "remixTop10Content--portrait" : ""}`}>
          <section className="neonPanel remixTop10HeroPanel">
            <div className="remixTop10HeroHeader">
              <div className="remixTop10HeroKicker">#1 RIGHT NOW</div>
              <div className="remixTop10HeroChip">CROWD FAVORITE</div>
            </div>

            {hero ? (
              <div className={`remixTop10HeroCard ${isPortraitLayout ? "remixTop10HeroCard--portrait" : ""}`}>
                <div className="remixTop10HeroArtWrap">
                  <div className="remixTop10HeroArtGlow" />
                  <Artwork src={hero.artworkUrl} alt="" className="remixTop10HeroArt" fallbackLabel="REMIX" />
                </div>

                <div className="remixTop10HeroMeta">
                  <div className="remixTop10HeroRank">#1</div>
                  <div className="remixTop10HeroSong">{hero.title}</div>
                  <div className="remixTop10HeroArtist">{hero.artist}</div>

                  <div className="remixTop10HeroBadges">
                    <div className="remixTop10ScorePill">
                      <span className="remixTop10ScoreLabel">SCORE</span>
                      <span className="remixTop10ScoreValue">{hero.score}</span>
                    </div>
                    <MovementChip movement={movementById.get(hero.id)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="remixTop10EmptyHero">
                <div className="remixTop10EmptyTitle">No songs ranked yet</div>
                <div className="remixTop10EmptySub">Scan the QR to request a song and start the board.</div>
              </div>
            )}
          </section>

          <section className="neonPanel remixTop10ListPanel">
            <div className="remixTop10ListHeader">
              <div className="remixTop10ListTitle">CHART POSITIONS</div>
              <div className="remixTop10ListSub">LIVE MOVEMENT + SCORE</div>
            </div>

            <div className="remixTop10List">
              {rest.length ? (
                rest.map((item, index) => {
                  const movement = movementById.get(item.id);
                  const rank = index + 2;
                  return (
                    <div className={`remixTop10Row ${isPortraitLayout ? "remixTop10Row--portrait" : ""}`} key={item.id}>
                      <div className="remixTop10RowRank">{rank}</div>

                      <div className="remixTop10RowArtWrap">
                        <Artwork src={item.artworkUrl} alt="" className="remixTop10RowArt" fallbackLabel="R" />
                      </div>

                      <div className="remixTop10RowText">
                        <div className="remixTop10RowSong">{item.title}</div>
                        <div className="remixTop10RowArtist">{item.artist}</div>
                      </div>

                      <div className="remixTop10RowRight">
                        <MovementChip movement={movement} compact />
                        <div className="remixTop10RowScore">{item.score}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="remixTop10EmptyList">No ranked songs yet — requests will appear here once the board fills.</div>
              )}
            </div>
          </section>
        </div>

        <section className="neonPanel remixTop10CtaPanel">
          <div className="remixTop10CtaText">
            <div className="remixTop10CtaTitle">THINK YOUR SONG SHOULD BE #1?</div>
            <div className="remixTop10CtaSub">SCAN TO REQUEST NOW</div>
          </div>

          <div className="remixTop10CtaQrWrap">
            <img
              src={qrSrc}
              alt="QR code to request songs"
              className="remixTop10CtaQr"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>
      </div>

      <style jsx global>{`
        .remixTop10Root {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 14% 12%, rgba(0, 247, 255, 0.08), transparent 34%),
            radial-gradient(circle at 86% 14%, rgba(255, 57, 212, 0.08), transparent 28%),
            radial-gradient(circle at 50% 84%, rgba(0, 247, 255, 0.06), transparent 32%),
            #050814;
        }

        .remixTop10Orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(82px);
          opacity: 0.22;
          pointer-events: none;
          mix-blend-mode: screen;
          animation: remixTop10OrbFloat 18s ease-in-out infinite;
        }

        .remixTop10OrbA {
          width: 38vw;
          height: 38vw;
          left: -8vw;
          top: -10vw;
          background: radial-gradient(circle, rgba(0, 247, 255, 0.46), transparent 70%);
        }

        .remixTop10OrbB {
          width: 30vw;
          height: 30vw;
          right: -6vw;
          top: 5vh;
          background: radial-gradient(circle, rgba(255, 57, 212, 0.42), transparent 70%);
          animation-delay: -5s;
        }

        .remixTop10OrbC {
          width: 28vw;
          height: 28vw;
          left: 42vw;
          bottom: -12vw;
          background: radial-gradient(circle, rgba(69, 126, 255, 0.34), transparent 72%);
          animation-delay: -10s;
        }

        @keyframes remixTop10OrbFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(1.2vw, -1vw, 0) scale(1.06); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }

        .remixTop10Wrap {
          position: relative;
          z-index: 2;
          height: 100vh;
          padding: 14px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 14px;
          box-sizing: border-box;
        }

        .remixTop10Wrap--portrait {
          gap: 12px;
          padding: 12px;
        }

        .remixTop10HeaderPanel,
        .remixTop10HeroPanel,
        .remixTop10ListPanel,
        .remixTop10CtaPanel {
          position: relative;
          overflow: hidden;
        }

        .remixTop10HeaderPanel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 14px 18px;
        }

        .remixTop10Brand {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .remixTop10Logo {
          width: auto;
          height: 70px;
          max-width: 180px;
          object-fit: contain;
          border-radius: 18px;
          filter: drop-shadow(0 0 16px rgba(0,247,255,0.22));
          flex: 0 0 auto;
        }

        .remixTop10LogoFallback {
          width: 92px;
          height: 70px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-weight: 1000;
          letter-spacing: 1px;
          border: 1px solid rgba(255,255,255,0.14);
          background: linear-gradient(135deg, rgba(0,247,255,0.12), rgba(255,57,212,0.10));
          box-shadow: var(--glowA), var(--glowB);
          flex: 0 0 auto;
        }

        .remixTop10BrandText {
          min-width: 0;
        }

        .remixTop10Title {
          font-size: clamp(28px, 2.6vw, 50px);
          font-weight: 1000;
          line-height: 1;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          text-shadow: 0 0 20px rgba(255,255,255,0.08);
        }

        .remixTop10Sub {
          margin-top: 6px;
          font-size: clamp(12px, 1vw, 16px);
          letter-spacing: 1.2px;
          color: rgba(255,255,255,0.66);
          text-transform: uppercase;
        }

        .remixTop10HeaderMeta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          flex: 0 0 auto;
        }

        .remixTop10ModePill,
        .remixTop10LivePill {
          display: inline-flex;
          align-items: center;
          min-height: 38px;
          padding: 0 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 1000;
          letter-spacing: 1.1px;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          box-shadow: var(--glowA);
          white-space: nowrap;
        }

        .remixTop10ModePill {
          background: linear-gradient(90deg, rgba(0,247,255,0.18), rgba(255,57,212,0.16));
          box-shadow: var(--glowA), var(--glowB);
        }

        .remixTop10Content {
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(420px, 0.96fr) minmax(0, 1.04fr);
          gap: 14px;
        }

        .remixTop10Content--portrait {
          grid-template-columns: 1fr;
          grid-template-rows: auto minmax(0, 1fr);
          gap: 12px;
        }

        .remixTop10HeroPanel {
          padding: 16px;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 14px;
        }

        .remixTop10HeroHeader,
        .remixTop10ListHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .remixTop10HeroKicker,
        .remixTop10ListTitle {
          font-size: 14px;
          font-weight: 1000;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.8);
        }

        .remixTop10HeroChip,
        .remixTop10ListSub {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.6);
        }

        .remixTop10HeroCard {
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(200px, 40%) minmax(0, 1fr);
          gap: 16px;
          align-items: center;
          border-radius: 28px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          background:
            radial-gradient(circle at 22% 20%, rgba(0,247,255,0.14), transparent 40%),
            radial-gradient(circle at 80% 82%, rgba(255,57,212,0.12), transparent 36%),
            linear-gradient(135deg, rgba(9, 18, 44, 0.94), rgba(14, 27, 58, 0.84), rgba(28, 12, 50, 0.78));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 18px 40px rgba(0,0,0,0.34),
            0 0 22px rgba(0,247,255,0.12);
        }

        .remixTop10HeroCard--portrait {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto;
          gap: 12px;
          padding: 14px;
          border-radius: 24px;
        }

        .remixTop10HeroArtWrap {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.05);
          box-shadow: var(--glowA), 0 16px 34px rgba(0,0,0,0.3);
        }

        .remixTop10HeroArtGlow {
          position: absolute;
          inset: -36%;
          background:
            radial-gradient(circle at 30% 25%, rgba(0,247,255,0.28), transparent 55%),
            radial-gradient(circle at 78% 82%, rgba(255,57,212,0.2), transparent 60%);
          filter: blur(24px);
          pointer-events: none;
          animation: remixTop10HeroPulse 4.5s ease-in-out infinite;
          z-index: 1;
          mix-blend-mode: screen;
        }

        @keyframes remixTop10HeroPulse {
          0% { transform: scale(1); opacity: 0.72; }
          50% { transform: scale(1.08); opacity: 0.34; }
          100% { transform: scale(1); opacity: 0.72; }
        }

        .remixTop10HeroArt {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .remixTop10HeroMeta {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .remixTop10HeroRank {
          font-size: clamp(54px, 5vw, 90px);
          line-height: 0.9;
          font-weight: 1000;
          letter-spacing: -2px;
          color: rgba(255,255,255,0.16);
          text-shadow: 0 0 18px rgba(0,247,255,0.08);
        }

        .remixTop10HeroSong {
          margin-top: 10px;
          font-size: clamp(28px, 2.6vw, 46px);
          line-height: 0.98;
          font-weight: 1000;
          letter-spacing: -0.8px;
          text-wrap: balance;
          overflow-wrap: anywhere;
        }

        .remixTop10HeroArtist {
          margin-top: 8px;
          font-size: clamp(16px, 1.2vw, 22px);
          color: var(--muted);
          line-height: 1.08;
          overflow-wrap: anywhere;
        }

        .remixTop10HeroBadges {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
        }

        .remixTop10ScorePill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          padding: 0 16px;
          border-radius: 999px;
          background: rgba(0,247,255,0.09);
          border: 1px solid rgba(0,247,255,0.24);
          box-shadow: var(--glowA);
        }

        .remixTop10ScoreLabel {
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.74);
        }

        .remixTop10ScoreValue {
          font-size: 26px;
          line-height: 1;
          font-weight: 1000;
        }

        .remixTop10ListPanel {
          padding: 16px;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 12px;
          min-height: 0;
        }

        .remixTop10List {
          min-height: 0;
          display: grid;
          gap: 10px;
          align-content: start;
          overflow: hidden;
        }

        .remixTop10Row {
          display: grid;
          grid-template-columns: 44px 68px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(
            90deg,
            rgba(20, 16, 48, 0.82),
            rgba(14, 18, 45, 0.76),
            rgba(34, 13, 52, 0.68)
          );
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        }

        .remixTop10Row--portrait {
          grid-template-columns: 34px 52px 1fr auto;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 16px;
        }

        .remixTop10RowRank {
          font-size: 30px;
          line-height: 1;
          font-weight: 1000;
          text-align: center;
          color: #fff;
          text-shadow: 0 0 14px rgba(255,255,255,0.16);
        }

        .remixTop10Row--portrait .remixTop10RowRank {
          font-size: 24px;
        }

        .remixTop10RowArtWrap {
          width: 68px;
          height: 68px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 14px rgba(0,247,255,0.12);
        }

        .remixTop10Row--portrait .remixTop10RowArtWrap {
          width: 52px;
          height: 52px;
          border-radius: 14px;
        }

        .remixTop10RowArt {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .remixTop10RowText {
          min-width: 0;
        }

        .remixTop10RowSong {
          font-size: clamp(18px, 1.1vw, 22px);
          line-height: 1.06;
          font-weight: 1000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTop10Row--portrait .remixTop10RowSong {
          font-size: clamp(15px, 1.85vw, 18px);
        }

        .remixTop10RowArtist {
          margin-top: 4px;
          font-size: clamp(12px, 0.82vw, 15px);
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remixTop10Row--portrait .remixTop10RowArtist {
          margin-top: 3px;
          font-size: clamp(11px, 1.36vw, 13px);
        }

        .remixTop10RowRight {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
          min-width: 0;
        }

        .remixTop10RowScore {
          min-width: 44px;
          height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 15px;
          font-weight: 1000;
          background: rgba(0,247,255,0.09);
          border: 1px solid rgba(0,247,255,0.24);
          box-shadow: var(--glowA);
        }

        .remixTop10Row--portrait .remixTop10RowScore {
          min-width: 38px;
          height: 30px;
          padding: 0 10px;
          font-size: 12px;
        }

        .remixTop10Move {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 58px;
          height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          white-space: nowrap;
        }

        .remixTop10Move--compact {
          min-width: 50px;
          height: 30px;
          padding: 0 10px;
          font-size: 11px;
        }

        .remixTop10Move--up {
          color: #9fffd8;
          border-color: rgba(124,255,58,0.28);
          background: rgba(124,255,58,0.10);
        }

        .remixTop10Move--down {
          color: #ffd5e8;
          border-color: rgba(255,57,212,0.26);
          background: rgba(255,57,212,0.10);
        }

        .remixTop10Move--new {
          color: #b7f7ff;
          border-color: rgba(0,247,255,0.28);
          background: rgba(0,247,255,0.10);
          box-shadow: var(--glowA);
        }

        .remixTop10Move--same {
          color: rgba(255,255,255,0.72);
        }

        .remixTop10CtaPanel {
          padding: 12px 16px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .remixTop10CtaText {
          min-width: 0;
        }

        .remixTop10CtaTitle {
          font-size: clamp(18px, 1.35vw, 26px);
          line-height: 1;
          font-weight: 1000;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 0.35px;
        }

        .remixTop10CtaSub {
          margin-top: 6px;
          font-size: clamp(13px, 0.95vw, 16px);
          color: rgba(255,255,255,0.68);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 900;
        }

        .remixTop10CtaQrWrap {
          width: 112px;
          height: 112px;
          padding: 4px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
        }

        .remixTop10CtaQr {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 14px;
        }

        .remixTop10EmptyHero,
        .remixTop10EmptyList {
          display: grid;
          place-items: center;
          text-align: center;
          color: var(--muted);
        }

        .remixTop10EmptyHero {
          min-height: 280px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          padding: 20px;
        }

        .remixTop10EmptyTitle {
          font-size: 28px;
          font-weight: 1000;
          color: #fff;
        }

        .remixTop10EmptySub,
        .remixTop10EmptyList {
          margin-top: 8px;
          font-size: 16px;
          line-height: 1.3;
        }

        @media (max-width: 1400px) and (orientation: landscape) {
          .remixTop10Content {
            grid-template-columns: minmax(360px, 0.9fr) minmax(0, 1.1fr);
          }

          .remixTop10HeroSong {
            font-size: clamp(24px, 2.2vw, 38px);
          }

          .remixTop10RowSong {
            font-size: clamp(16px, 1vw, 20px);
          }
        }

        @media (orientation: portrait) {
          .remixTop10HeaderPanel {
            padding: 12px 14px;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .remixTop10Brand {
            gap: 12px;
          }

          .remixTop10Logo {
            height: 52px;
            max-width: 120px;
            border-radius: 14px;
          }

          .remixTop10LogoFallback {
            width: 70px;
            height: 52px;
            border-radius: 14px;
            font-size: 14px;
          }

          .remixTop10Title {
            font-size: clamp(22px, 6vw, 34px);
          }

          .remixTop10Sub {
            margin-top: 4px;
            font-size: 11px;
            letter-spacing: 0.9px;
          }

          .remixTop10HeaderMeta {
            align-items: flex-start;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
          }

          .remixTop10ModePill,
          .remixTop10LivePill {
            min-height: 32px;
            padding: 0 12px;
            font-size: 11px;
          }

          .remixTop10HeroPanel,
          .remixTop10ListPanel {
            padding: 12px;
          }

          .remixTop10HeroKicker,
          .remixTop10ListTitle {
            font-size: 12px;
          }

          .remixTop10HeroChip,
          .remixTop10ListSub {
            font-size: 10px;
          }

          .remixTop10HeroArtWrap {
            border-radius: 22px;
          }

          .remixTop10HeroRank {
            font-size: clamp(34px, 10vw, 58px);
          }

          .remixTop10HeroSong {
            margin-top: 4px;
            font-size: clamp(22px, 6.8vw, 30px);
          }

          .remixTop10HeroArtist {
            font-size: clamp(13px, 3.8vw, 18px);
          }

          .remixTop10HeroBadges {
            margin-top: 12px;
            gap: 8px;
          }

          .remixTop10ScorePill {
            min-height: 40px;
            padding: 0 12px;
          }

          .remixTop10ScoreLabel {
            font-size: 11px;
          }

          .remixTop10ScoreValue {
            font-size: 21px;
          }

          .remixTop10Move {
            min-width: 54px;
            height: 32px;
            padding: 0 10px;
            font-size: 11px;
          }

          .remixTop10List {
            gap: 8px;
          }

          .remixTop10CtaPanel {
            padding: 10px 12px;
            grid-template-columns: 1fr 94px;
            gap: 12px;
          }

          .remixTop10CtaTitle {
            font-size: clamp(15px, 4.4vw, 20px);
          }

          .remixTop10CtaSub {
            font-size: 11px;
            line-height: 1.15;
          }

          .remixTop10CtaQrWrap {
            width: 94px;
            height: 94px;
            border-radius: 14px;
          }

          .remixTop10CtaQr {
            border-radius: 10px;
          }
        }
      `}</style>
    </div>
  );
}

function MovementChip({
  movement,
  compact,
}: {
  movement?: Movement;
  compact?: boolean;
}) {
  const resolved = movement || { kind: "same" as const };

  let text = "—";
  if (resolved.kind === "up") text = `▲ +${resolved.delta ?? 1}`;
  if (resolved.kind === "down") text = `▼ -${resolved.delta ?? 1}`;
  if (resolved.kind === "new") text = "NEW";

  return (
    <div className={`remixTop10Move remixTop10Move--${resolved.kind} ${compact ? "remixTop10Move--compact" : ""}`}>
      {text}
    </div>
  );
}

function Artwork({
  src,
  alt,
  className,
  fallbackLabel,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel: string;
}) {
  const [bad, setBad] = useState(false);

  if (!src || bad) {
    return (
      <div
        className={className}
        style={{
          display: "grid",
          placeItems: "center",
          fontWeight: 1000,
          letterSpacing: 1,
          color: "rgba(255,255,255,0.64)",
          background:
            "radial-gradient(circle at 30% 25%, rgba(0,247,255,0.18), transparent 55%), radial-gradient(circle at 75% 80%, rgba(255,57,212,0.14), transparent 62%), rgba(255,255,255,0.06)",
        }}
      >
        {fallbackLabel}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBad(true)}
    />
  );
}
