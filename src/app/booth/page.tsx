"use client";

import { useEffect, useState } from "react";

type QueueItem = {
  id: string;
  status: string;
  request?: {
    song?: {
      title: string;
      artist: string;
    };
  };
};

export default function BoothPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadQueue() {
    setLoading(true);
    const res = await fetch("/api/admin/queue/remixrequests");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    loadQueue();
  }, []);

  async function hit(endpoint: string, id: string) {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ queueItemId: id }),
    });

    await loadQueue();
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>🎧 Booth Control</h1>

      <button onClick={loadQueue}>Refresh</button>

      {loading && <p>Loading...</p>}

      {!loading &&
        items.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #ccc",
              margin: "10px 0",
              padding: 10,
            }}
          >
            <div>
              <strong>
                {item.request?.song?.title || "Unknown"} –{" "}
                {item.request?.song?.artist || ""}
              </strong>
            </div>

            <div>Status: {item.status}</div>

            <div style={{ marginTop: 10 }}>
              <button onClick={() => hit("/api/booth/queue/mark-playing", item.id)}>
                ▶ Play
              </button>

              <button onClick={() => hit("/api/booth/queue/mark-played", item.id)}>
                ✅ Played
              </button>

              <button onClick={() => hit("/api/booth/queue/skip", item.id)}>
                ⏭ Skip
              </button>

              <button onClick={() => hit("/api/booth/queue/hold", item.id)}>
                ⏸ Hold
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}