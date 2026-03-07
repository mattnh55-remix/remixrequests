// src/app/tv-top10/[location]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type QItem = { id: string; title: string; artist: string; artworkUrl?: string; score: number };

type Snapshot = {
  location: string;
  createdAt: string; // ISO
  items: QItem[];
};

function keyFor(location: string) {
  return `remix_top10_snapshot:${location}`;
}

export default function TvTop10Page({ params }: { params: { location: string } }) {
  const location = params.location;

  const [livePlayNow, setLivePlayNow] = useState<QItem[]>([]);
  const [liveUpNext, setLiveUpNext] = useState<QItem[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<string>("");

  const refreshRequested = useMemo(() => {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    return url.searchParams.get("refresh") === "1";
  }, []);

  async function fetchQueue() {
    const res = await fetch(`/api/public/queue/${location}`, { cache: "no-store" });
    const data = await res.json();
    setLivePlayNow(data.playNow || []);
    setLiveUpNext(data.upNext || []);
  }

  function computeTop10(playNow: QItem[], upNext: QItem[]) {
    // Priority: Play Now first, then Up Next, dedupe by id, take 10
    const seen = new Set<string>();
    const merged = [...(playNow || []), ...(upNext || [])].filter((x) => {
      if (!x?.id) return false;
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });

    // Keep queue ordering as delivered by backend; just slice top 10
    return merged.slice(0, 10);
  }

  function loadSnapshot() {
    try {
      const raw = localStorage.getItem(keyFor(location));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Snapshot;
      if (!parsed?.items?.length) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveSnapshot(items: QItem[]) {
    const snap: Snapshot = {
      location,
      createdAt: new Date().toISOString(),
      items,
    };
    localStorage.setItem(keyFor(location), JSON.stringify(snap));
    setSnapshot(snap);
  }

  // Initial load: snapshot (if exists) OR build one from live queue
  useEffect(() => {
    (async () => {
      // 1) Try to load snapshot
      const existing = loadSnapshot();

      // 2) Always pull live once (so we can build if needed)
      setStatus("Loading live queue…");
      await fetchQueue();

      // 3) If refresh=1, rebuild snapshot from live
      if (refreshRequested) {
        setStatus("Refreshing Top 10…");
        const items = computeTop10(livePlayNow, liveUpNext);
        saveSnapshot(items);
        setStatus("Top 10 refreshed.");
        return;
      }

      // 4) If snapshot exists, use it
      if (existing) {
        setSnapshot(existing);
        setStatus("Showing saved Top 10 snapshot.");
        return;
      }

      // 5) Otherwise, create snapshot from live
      const items = computeTop10(livePlayNow, liveUpNext);
      saveSnapshot(items);
      setStatus("Created new Top 10 snapshot.");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Keep polling live data in background (optional): doesn’t change snapshot
  useEffect(() => {
    const id = setInterval(() => {
      fetchQueue().catch(() => {});
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const items = snapshot?.items || [];

  const createdAtNice = useMemo(() => {
    if (!snapshot?.createdAt) return "";
    try {
      const d = new Date(snapshot.createdAt);
      return d.toLocaleString();
    } catch {
      return snapshot.createdAt;
    }
  }, [snapshot?.createdAt]);

  return (
    <div className="neonRoot tvRoot">
      <div className="tvTop10Wrap">
        {/* HEADER */}
        <div className="neonPanel" style={{ padding: 22, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <div>
            <div style={{ fontSize: 52, fontWeight: 1000, letterSpacing: -1.2, lineHeight: 1 }}>
              Top 10 Requests
            </div>
            <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 18 }}>
              {location.toUpperCase()} • Snapshot locked until refresh
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
            <div className="tvTag" style={{ boxShadow: "var(--glowA)" }}>
              SNAPSHOT: {createdAtNice || "—"}
            </div>
            <div className="tvTag" style={{ opacity: 0.85 }}>
              To refresh: add <b>?refresh=1</b>
            </div>
          </div>
        </div>

        {/* LIST */}
        <div className="neonPanel" style={{ padding: 18, minHeight: 0, overflow: "hidden" }}>
          {items.length ? (
            <div className="tvTop10Grid">
              {items.map((q, idx) => (
                <div key={q.id} className="tvTop10Row">
                  <div className="tvTop10Rank">{idx + 1}</div>

                  <div className="tvTop10Art">
                    {q.artworkUrl ? (
                      <img
                        src={q.artworkUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className="tvTop10ArtFallback">REMIX</div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div className="tvTop10Song">{q.title}</div>
                    <div className="tvTop10Artist">{q.artist}</div>
                  </div>

                  <div className="tvTag" style={{ justifySelf: "end" }}>
                    {q.score}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 16, fontSize: 24, color: "var(--muted)" }}>
              No snapshot yet. Add requests, then refresh once with <b>?refresh=1</b>.
            </div>
          )}

          {status ? (
            <div style={{ marginTop: 14, color: "rgba(255,255,255,0.55)", fontSize: 14 }}>
              {status}
            </div>
          ) : null}
        </div>
      </div>

      {/* Local TV styles */}
      <style jsx global>{`
        .tvTop10Wrap {
          height: 100vh;
          padding: 18px;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 18px;
          box-sizing: border-box;
        }

        .tvTop10Grid {
          display: grid;
          gap: 12px;
        }

        .tvTop10Row {
          display: grid;
          grid-template-columns: 70px 84px 1fr auto;
          gap: 16px;
          align-items: center;
          padding: 14px 14px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.18);
          box-shadow: var(--shadow);
          overflow: hidden;
          position: relative;
        }

        .tvTop10Row::before {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 30% 25%, rgba(0,247,255,0.10), transparent 55%),
                      radial-gradient(circle at 75% 80%, rgba(255,57,212,0.08), transparent 62%);
          filter: blur(18px);
          opacity: 0.9;
          pointer-events: none;
        }

        .tvTop10Rank {
          font-size: 44px;
          font-weight: 1000;
          letter-spacing: -1px;
          opacity: 0.95;
          text-align: center;
          text-shadow: 0 0 10px rgba(255,255,255,0.18);
          position: relative;
          z-index: 1;
        }

        .tvTop10Art {
          width: 84px;
          height: 84px;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.06);
          box-shadow: var(--glowA);
          position: relative;
          z-index: 1;
        }

        .tvTop10ArtFallback {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-weight: 1000;
          opacity: 0.6;
          font-size: 14px;
          letter-spacing: 1px;
        }

        .tvTop10Song {
          font-size: 30px;
          font-weight: 1000;
          letter-spacing: -0.4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          position: relative;
          z-index: 1;
        }

        .tvTop10Artist {
          font-size: 18px;
          color: var(--muted);
          margin-top: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          position: relative;
          z-index: 1;
        }

        /* ✅ Portrait */
        @media (orientation: portrait) {
          .tvTop10Row {
            grid-template-columns: 56px 74px 1fr;
          }
          .tvTop10Rank { font-size: 38px; }
          .tvTop10Art { width: 74px; height: 74px; }
          .tvTop10Song { font-size: 26px; }
        }
      `}</style>
    </div>
  );
}