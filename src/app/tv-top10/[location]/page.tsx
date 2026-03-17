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
  displayLabel?: string;
  updatedAt?: string;
  logoUrl?: string | null;
  queueCount?: number;
  items?: Top10Item[];
};

type Snapshot = {
  items: Top10Item[];
  createdAt: string;
};

const POLL_MS = 12000;

const DEFAULT_ART =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <rect width="100%" height="100%" fill="#0b132d"/>
    <text x="50%" y="50%" fill="white" font-size="60" text-anchor="middle" dominant-baseline="middle">
      REMIX
    </text>
  </svg>
`);

function safeArt(url?: string | null) {
  return url && url !== "unknown" ? url : DEFAULT_ART;
}

export default function Page({ params }: { params: { location: string } }) {
  const location = params.location;

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [isPortrait, setIsPortrait] = useState(false);
  const [logo, setLogo] = useState("");
  const [label, setLabel] = useState("TOP 10");
  const [queueCount, setQueueCount] = useState(0);

  const snapshotRef = useRef<Snapshot | null>(null);

  const qr = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://skateremix.com/request/${location}`;
  }, [location]);

  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const update = () => setIsPortrait(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  async function fetchBoard() {
    const res = await fetch(`/api/public/top10/${location}`, { cache: "no-store" });
    const data: Top10Res = await res.json();

    if (!data.ok) return;

    setLogo(data.logoUrl || "");
    setLabel(data.displayLabel || "TOP 10");
    setQueueCount(data.queueCount || 0);

    const next = {
      items: data.items || [],
      createdAt: data.updatedAt || new Date().toISOString(),
    };

    const prev = snapshotRef.current;

    if (!prev || JSON.stringify(prev.items) !== JSON.stringify(next.items)) {
      snapshotRef.current = next;
      setSnapshot(next);
    }
  }

  useEffect(() => {
    fetchBoard();
    const id = setInterval(fetchBoard, POLL_MS);
    return () => clearInterval(id);
  }, [location]);

  const items = snapshot?.items || [];
  const hero = items[0];
  const restPortrait = items.slice(1, 4);
  const restLandscape = items.slice(1);

  return (
    <div style={{ height: "100vh", overflow: "hidden", padding: 16 }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {logo && <img src={logo} style={{ width: 50, height: 50 }} />}
          <div>
            <div style={{ fontWeight: 900 }}>REMIX TOP 10</div>
            <div style={{ fontSize: 12 }}>{label}</div>
          </div>
        </div>
        <div style={{ fontSize: 12 }}>
          {items.length} ranked • {queueCount} queue
        </div>
      </div>

      {/* LANDSCAPE */}
      {!isPortrait && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: 12, height: "90%" }}>
          
          {/* HERO */}
          <div>
            {hero && (
              <>
                <img src={safeArt(hero.artworkUrl)} style={{ width: "100%", borderRadius: 12 }} />
                <h1>{hero.title}</h1>
                <div>{hero.artist}</div>
                <div>Score: {hero.score}</div>
              </>
            )}
          </div>

          {/* LIST */}
          <div>
            {restLandscape.map((i, idx) => (
              <div key={i.id}>
                #{idx + 2} {i.title} ({i.score})
              </div>
            ))}
          </div>

          {/* QR */}
          <div style={{ textAlign: "center" }}>
            <img src={qr} />
          </div>
        </div>
      )}

      {/* PORTRAIT */}
      {isPortrait && (
        <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "90%", gap: 8 }}>
          
          {/* HERO */}
          <div style={{ display: "flex", gap: 10 }}>
            {hero && (
              <>
                <img src={safeArt(hero.artworkUrl)} style={{ width: 100, borderRadius: 10 }} />
                <div>
                  <div>#1</div>
                  <div>{hero.title}</div>
                  <div>{hero.artist}</div>
                  <div>{hero.score}</div>
                </div>
              </>
            )}
          </div>

          {/* MINI LIST */}
          <div>
            {restPortrait.map((i, idx) => (
              <div key={i.id}>
                #{idx + 2} {i.title} ({i.score})
              </div>
            ))}
          </div>

          {/* QR */}
          <div style={{ textAlign: "center" }}>
            <img src={qr} style={{ width: 140 }} />
          </div>
        </div>
      )}
    </div>
  );
}