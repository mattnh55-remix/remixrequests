"use client";

import { useEffect, useState } from "react";

type QueueItem = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  score: number;
};

type Shoutout = {
  id: string;
  fromName: string;
  messageText: string;
  tier: string;
};

export default function TvPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [playNow, setPlayNow] = useState<QueueItem[]>([]);
  const [upNext, setUpNext] = useState<QueueItem[]>([]);
  const [shoutout, setShoutout] = useState<Shoutout | null>(null);

  async function tickQueue() {
    const res = await fetch(`/api/public/queue/${location}`, {
      cache: "no-store",
    });

    const data = await res.json();

    setPlayNow(data.playNow || []);
    setUpNext(data.upNext || []);
  }

  async function tickShoutout() {
    const res = await fetch(`/api/public/shoutouts/feed/${location}`, {
      cache: "no-store",
    });

    const data = await res.json();

    setShoutout(data.message || null);
  }

  useEffect(() => {
    tickQueue();
    tickShoutout();

    const q = setInterval(tickQueue, 4000);
    const s = setInterval(tickShoutout, 10000);

    return () => {
      clearInterval(q);
      clearInterval(s);
    };
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        height: "100vh",
        background: "#000",
        color: "#fff",
        padding: 20,
        gap: 20,
      }}
    >
      <div
        style={{
          border: "2px solid #444",
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {shoutout ? (
          <div>
            <div style={{ fontSize: 36, marginBottom: 10 }}>
              {shoutout.messageText}
            </div>

            <div style={{ fontSize: 22, opacity: 0.8 }}>
              — {shoutout.fromName}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 28 }}>
            🎉 Celebrate a birthday, shout out a friend, or send a message to the
            rink! Scan the QR code to send your own shout out!
          </div>
        )}
      </div>

      <div>
        <h2>Now Playing</h2>

        {playNow.map((s) => (
          <div key={s.id} style={{ marginBottom: 10 }}>
            <b>{s.title}</b> — {s.artist}
          </div>
        ))}

        <h2 style={{ marginTop: 20 }}>Up Next</h2>

        {upNext.map((s) => (
          <div key={s.id} style={{ marginBottom: 10 }}>
            {s.title} — {s.artist}
          </div>
        ))}
      </div>
    </div>
  );
}