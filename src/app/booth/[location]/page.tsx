"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type BoothQueueItem = {
  id: string;
  requestId: string | null;
  position: number;
  status: string;
  sourceType: string;
  introAssigned: boolean;
  clusterId: string | null;
  loadedAt: string | null;
  playingAt: string | null;
  completedAt: string | null;
  createdAt: string;
  title: string | null;
  artist: string | null;
  artworkUrl: string | null;
  explicit: boolean | null;
};

export default function BoothLocationPage() {
  const params = useParams();
  const location =
    typeof params?.location === "string"
      ? params.location
      : Array.isArray(params?.location)
      ? params.location[0]
      : "";

  const [items, setItems] = useState<BoothQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const queueUrl = useMemo(() => {
    return location ? `/api/booth/queue/${location}` : "";
  }, [location]);

  async function loadQueue(showSpinner = false) {
    if (!queueUrl) return;

    try {
      if (showSpinner) setLoading(true);
      setError("");

      const res = await fetch(queueUrl, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setItems([]);
        setError(data?.error || "Could not load booth queue.");
        return;
      }

      setItems(data.items || []);
    } catch {
      setItems([]);
      setError("Could not load booth queue.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function hit(endpoint: string, queueItemId: string) {
    try {
      setBusyId(queueItemId);
      setError("");

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ queueItemId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setError(data?.error || "Action failed.");
        return;
      }

      await loadQueue(false);
    } catch {
      setError("Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (!location) return;
    loadQueue(true);
  }, [location]);

  useEffect(() => {
    if (!location) return;

    const timer = window.setInterval(() => {
      loadQueue(false);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [location, queueUrl]);

  const nowPlayingId =
    items.find((item) => item.status === "PLAYING")?.id ?? null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 42, marginBottom: 8 }}>🎧 Booth Control</h1>

      <p style={{ opacity: 0.8, marginTop: 0, marginBottom: 20 }}>
        Location: <strong>{location || "unknown"}</strong>
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button onClick={() => loadQueue(true)} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid #663",
            background: "#221",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      ) : null}

      {!loading && items.length === 0 ? <p>No booth queue items found.</p> : null}

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => {
          const isPlaying = item.id === nowPlayingId;
          const isBusy = busyId === item.id;

          return (
            <div
              key={item.id}
              style={{
                border: isPlaying ? "2px solid #4caf50" : "1px solid #333",
                borderRadius: 12,
                padding: 16,
                background: isPlaying ? "#0f1a0f" : "#0a0a0a",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                    Position #{item.position} • {item.status}
                  </div>

                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {item.title || "Unknown Title"}
                  </div>

                  <div style={{ fontSize: 18, opacity: 0.9, marginTop: 4 }}>
                    {item.artist || "Unknown Artist"}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 10 }}>
                    QueueItem ID: {item.id}
                  </div>

                  {item.requestId ? (
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                      Request ID: {item.requestId}
                    </div>
                  ) : null}
                </div>

                {isPlaying ? (
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#1f5f2a",
                      fontWeight: 700,
                    }}
                  >
                    NOW PLAYING
                  </div>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <button
                  onClick={() => hit("/api/booth/queue/mark-playing", item.id)}
                  disabled={isBusy}
                >
                  ▶ Play
                </button>

                <button
                  onClick={() => hit("/api/booth/queue/mark-played", item.id)}
                  disabled={isBusy}
                >
                  ✅ Played
                </button>

                <button
                  onClick={() => hit("/api/booth/queue/skip", item.id)}
                  disabled={isBusy}
                >
                  ⏭ Skip
                </button>

                <button
                  onClick={() => hit("/api/booth/queue/hold", item.id)}
                  disabled={isBusy}
                >
                  ⏸ Hold
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}