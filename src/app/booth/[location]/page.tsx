"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { deriveBoothSections } from "@/lib/booth/queue-rules";

export default function BoothLocationPage() {
  const params = useParams();
  const location =
    typeof params?.location === "string"
      ? params.location
      : Array.isArray(params?.location)
      ? params.location[0]
      : "";

  const [items, setItems] = useState<any[]>([]);
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
        headers: { "Content-Type": "application/json" },
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

    const timer = setInterval(() => loadQueue(false), 4000);
    return () => clearInterval(timer);
  }, [location]);

  const sections = deriveBoothSections(items);

  return (
    <div style={{ padding: 24, background: "#000", color: "#fff", minHeight: "100vh" }}>
      <h1>🎧 Booth Control</h1>

      {error && <div style={{ color: "orange" }}>{error}</div>}

      {/* NOW PLAYING */}
      {sections.playing && (
        <Section title="NOW PLAYING">
          <Card item={sections.playing} hit={hit} busyId={busyId} highlight="green" />
        </Section>
      )}

      {/* LOADED */}
      {sections.loaded && (
        <Section title="ON DECK">
          <Card item={sections.loaded} hit={hit} busyId={busyId} highlight="blue" />
        </Section>
      )}

      {/* NEXT UP */}
      {sections.nextUp && !sections.loaded && (
        <Section title="NEXT UP">
          <Card item={sections.nextUp} hit={hit} busyId={busyId} highlight="purple" />
        </Section>
      )}

      {/* QUEUE */}
      <Section title="QUEUE">
        {sections.queued.map((item) => (
          <Card key={item.id} item={item} hit={hit} busyId={busyId} />
        ))}
      </Section>

      {/* HELD */}
      {sections.held.length > 0 && (
        <Section title="HELD">
          {sections.held.map((item) => (
            <Card key={item.id} item={item} hit={hit} busyId={busyId} highlight="gold" />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ borderBottom: "1px solid #333" }}>{title}</h2>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function Card({ item, hit, busyId, highlight }: any) {
  const isBusy = busyId === item.id;

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        border: "1px solid #333",
        background: "#111",
      }}
    >
      <div style={{ fontWeight: "bold" }}>
        {item.title || "Unknown"} — {item.artist || "Unknown"}
      </div>

      <div style={{ opacity: 0.6, fontSize: 12 }}>
        {item.status} • Position {item.position}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <button onClick={() => hit("/api/booth/queue/mark-loaded", item.id)} disabled={isBusy}>
          Load
        </button>

        <button onClick={() => hit("/api/booth/queue/mark-playing", item.id)} disabled={isBusy}>
          Play
        </button>

        <button onClick={() => hit("/api/booth/queue/mark-played", item.id)} disabled={isBusy}>
          Played
        </button>

        <button onClick={() => hit("/api/booth/queue/skip", item.id)} disabled={isBusy}>
          Skip
        </button>

        <button onClick={() => hit("/api/booth/queue/hold", item.id)} disabled={isBusy}>
          Hold
        </button>
      </div>
    </div>
  );
}