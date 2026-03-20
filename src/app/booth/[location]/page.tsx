"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { deriveBoothSections } from "@/lib/booth/queue-rules";
import { buildSmartInsertContext } from "@/lib/booth/smart-insert-context";
import { computeNextPlaybackAction } from "@/lib/booth/compute-next-playback-action";
import { mockInterstitialAssets } from "@/lib/booth/mock-interstitial-assets";
import type { InterstitialAsset } from "@/lib/booth/interstitial-types";

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

  const sections = useMemo(() => deriveBoothSections(items), [items]);
  const smartInsert = useMemo(() => buildSmartInsertContext(items), [items]);

  const nextPlaybackAction = useMemo(() => {
    return computeNextPlaybackAction({
      sessionId: "preview-session",
      locationId: location || "unknown",
      profile: "FAMILY",
      queueItems: items,
      interstitialAssets: mockInterstitialAssets,
      recentInterstitialEvents: [],
      nowIso: new Date().toISOString(),
    });
  }, [items, location]);

  const plannedAsset = useMemo(() => {
    if (nextPlaybackAction.action !== "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM") {
      return null;
    }

    return (
      mockInterstitialAssets.find(
        (asset) => asset.id === nextPlaybackAction.assetId
      ) || null
    );
  }, [nextPlaybackAction]);

  const plannedQueueItem = useMemo(() => {
    if (
      nextPlaybackAction.action !== "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM" &&
      nextPlaybackAction.action !== "PLAY_QUEUE_ITEM"
    ) {
      return null;
    }

    return items.find((item) => item.id === nextPlaybackAction.queueItemId) || null;
  }, [items, nextPlaybackAction]);

  const visibleQueueItems = sections.loaded ? sections.queued : sections.queued.slice(1);

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

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          {sections.playing ? (
            <QueueSection title="NOW PLAYING">
              <QueueCard
                item={sections.playing}
                hit={hit}
                busyId={busyId}
                tone="playing"
              />
            </QueueSection>
          ) : null}

          {sections.loaded ? (
            <QueueSection title="ON DECK / LOADED">
              <QueueCard
                item={sections.loaded}
                hit={hit}
                busyId={busyId}
                tone="loaded"
              />
            </QueueSection>
          ) : null}

          {sections.nextUp && !sections.loaded ? (
            <QueueSection title="NEXT UP">
              <QueueCard
                item={sections.nextUp}
                hit={hit}
                busyId={busyId}
                tone="next"
              />
            </QueueSection>
          ) : null}

          <QueueSection
            title={`QUEUE${
              sections.queued.length
                ? ` (${sections.loaded ? sections.queued.length : Math.max(sections.queued.length - 1, 0)})`
                : ""
            }`}
          >
            {visibleQueueItems.length === 0 ? (
              <EmptyState text="No additional queued items." />
            ) : (
              visibleQueueItems.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  hit={hit}
                  busyId={busyId}
                />
              ))
            )}
          </QueueSection>

          {sections.held.length > 0 ? (
            <QueueSection title={`HELD (${sections.held.length})`}>
              {sections.held.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  hit={hit}
                  busyId={busyId}
                  tone="held"
                />
              ))}
            </QueueSection>
          ) : null}

          {sections.history.length > 0 ? (
            <QueueSection title={`RECENTLY FINISHED (${sections.history.length})`}>
              {sections.history.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  hit={hit}
                  busyId={busyId}
                  tone="history"
                />
              ))}
            </QueueSection>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <NextPlaybackActionPanel
            nextPlaybackAction={nextPlaybackAction}
            plannedAsset={plannedAsset}
            plannedQueueItem={plannedQueueItem}
          />
          <SmartInsertPanel smartInsert={smartInsert} />
          <QueueRulesPanel />
        </div>
      </div>
    </div>
  );
}

function QueueSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid #222",
        borderRadius: 16,
        background: "#070707",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #1f1f1f",
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: 0.4,
        }}
      >
        {title}
      </div>

      <div style={{ display: "grid", gap: 12, padding: 16 }}>{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: "1px dashed #333",
        opacity: 0.7,
      }}
    >
      {text}
    </div>
  );
}

function NextPlaybackActionPanel({
  nextPlaybackAction,
  plannedAsset,
  plannedQueueItem,
}: {
  nextPlaybackAction: any;
  plannedAsset: InterstitialAsset | null;
  plannedQueueItem: BoothQueueItem | null;
}) {
  const heading =
    nextPlaybackAction.action === "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM"
      ? "Interstitial Planned"
      : nextPlaybackAction.action === "PLAY_QUEUE_ITEM"
      ? "Direct Song Playback"
      : "No Action";

  return (
    <section
      style={{
        border: "1px solid #1f3b2a",
        borderRadius: 16,
        background: "#08140d",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #1a2f22",
          fontWeight: 700,
          fontSize: 18,
        }}
      >
        Next Playback Action
      </div>

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <PlanningRow label="Engine decision" value={heading} valueTone="#7ee787" />

        <PlanningRow
          label="Reason"
          value={formatReason(nextPlaybackAction.reason)}
        />

        <PlanningRow
          label="Target queue item"
          value={formatTrackLabel(plannedQueueItem)}
        />

        {plannedAsset ? (
          <>
            <PlanningRow label="Planned interstitial" value={plannedAsset.name} />
            <PlanningRow
              label="Category"
              value={plannedAsset.category}
            />
            <PlanningRow
              label="Duration"
              value={`${plannedAsset.durationSec} sec`}
            />
            <PlanningRow
              label="File"
              value={plannedAsset.filePath}
            />
          </>
        ) : (
          <PlanningRow
            label="Planned interstitial"
            value="None"
          />
        )}

        <div
          style={{
            marginTop: 4,
            padding: 12,
            borderRadius: 12,
            background: "#0d1f14",
            border: "1px solid #284835",
            fontSize: 13,
            lineHeight: 1.5,
            opacity: 0.92,
          }}
        >
          This panel is driven by the backend-style decision engine. Staff can still
          reorder songs, but this preview shows what the system would choose at the
          next clean transition.
        </div>
      </div>
    </section>
  );
}

function SmartInsertPanel({ smartInsert }: { smartInsert: any }) {
  const requestMode = smartInsert.requestClusterDetected
    ? "Block intro candidate"
    : smartInsert.singleRequestDetected
    ? "Single request intro candidate"
    : "No request intro currently needed";

  return (
    <section
      style={{
        border: "1px solid #243244",
        borderRadius: 16,
        background: "#08111c",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #1b2a3b",
          fontWeight: 700,
          fontSize: 18,
        }}
      >
        Smart Insert Planning
      </div>

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <PlanningRow
          label="Next playable"
          value={formatTrackLabel(smartInsert.nextPlayable)}
        />

        <PlanningRow
          label="Current playable"
          value={formatTrackLabel(smartInsert.currentPlayable)}
        />

        <PlanningRow
          label="Queue depth"
          value={String(smartInsert.queueDepth)}
        />

        <PlanningRow
          label="Upcoming request count"
          value={String(smartInsert.consecutiveRequestCount)}
        />

        <PlanningRow
          label="Planning mode"
          value={requestMode}
          valueTone={
            smartInsert.requestClusterDetected
              ? "#7ee787"
              : smartInsert.singleRequestDetected
              ? "#79c0ff"
              : "#d2d2d2"
          }
        />

        <PlanningRow
          label="Intro already assigned"
          value={smartInsert.introAlreadyAssigned ? "Yes" : "No"}
          valueTone={smartInsert.introAlreadyAssigned ? "#ffb86b" : "#7ee787"}
        />
      </div>
    </section>
  );
}

function QueueRulesPanel() {
  return (
    <section
      style={{
        border: "1px solid #30263a",
        borderRadius: 16,
        background: "#120a16",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #2a2031",
          fontWeight: 700,
          fontSize: 18,
        }}
      >
        Queue Rules Snapshot
      </div>

      <div style={{ padding: 16, display: "grid", gap: 10, fontSize: 14 }}>
        <RuleLine text="Songs are staff-shaped." />
        <RuleLine text="Interstitials are backend-decided." />
        <RuleLine text="PLAYING always displays separately." />
        <RuleLine text="LOADED is reserved / on deck." />
        <RuleLine text="HELD is excluded from next-up logic." />
        <RuleLine text="The engine evaluates the next clean transition." />
      </div>
    </section>
  );
}

function RuleLine({ text }: { text: string }) {
  return <div style={{ opacity: 0.9 }}>• {text}</div>;
}

function PlanningRow({
  label,
  value,
  valueTone,
}: {
  label: string;
  value: string;
  valueTone?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 4,
        padding: 10,
        borderRadius: 10,
        background: "#0b1624",
        border: "1px solid #1b2a3b",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 700, color: valueTone || "#fff" }}>{value}</div>
    </div>
  );
}

function formatTrackLabel(item: any) {
  if (!item) return "None";
  const title = item.title || "Unknown Title";
  const artist = item.artist || "Unknown Artist";
  return `${title} — ${artist}`;
}

function formatReason(reason: string) {
  if (reason === "DIRECT_PLAY") return "Direct play";
  if (reason === "REQUEST_SINGLE") return "Single request intro";
  if (reason === "REQUEST_CLUSTER") return "Request block intro";
  if (reason === "SCHEDULED_INTERVAL") return "Scheduled interval asset";
  if (reason === "TOP_OF_HOUR_WINDOW") return "Top-of-hour window asset";
  if (reason === "BRANDING_GAP_FILL") return "Branding gap fill";
  if (reason === "NO_PLAYABLE_QUEUE_ITEM") return "No playable queue item";
  return reason;
}

function QueueCard({
  item,
  hit,
  busyId,
  tone,
}: {
  item: BoothQueueItem;
  hit: (endpoint: string, queueItemId: string) => Promise<void>;
  busyId: string | null;
  tone?: "playing" | "loaded" | "held" | "next" | "history";
}) {
  const isBusy = busyId === item.id;
  const badge = statusBadge(item);
  const visual = cardStyle(tone || item.status);

  const showLoad = item.status === "QUEUED" || item.status === "HELD";
  const showPlay =
    item.status === "QUEUED" || item.status === "LOADED" || item.status === "HELD";
  const showPlayed = item.status === "PLAYING" || item.status === "LOADED";
  const showHold =
    item.status === "QUEUED" || item.status === "LOADED" || item.status === "PLAYING";
  const showReturn =
    item.status === "HELD" || item.status === "LOADED" || item.status === "PLAYING";

  return (
    <div
      style={{
        border: visual.border,
        borderRadius: 12,
        padding: 16,
        background: visual.background,
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
            Source: {item.sourceType || "unknown"}
          </div>

          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            QueueItem ID: {item.id}
          </div>

          {item.requestId ? (
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
              Request ID: {item.requestId}
            </div>
          ) : null}
        </div>

        {badge ? (
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: visual.badgeBg,
              fontWeight: 700,
            }}
          >
            {badge}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {showLoad ? (
          <button
            onClick={() => hit("/api/booth/queue/mark-loaded", item.id)}
            disabled={isBusy}
          >
            ⏺ Load
          </button>
        ) : null}

        {showPlay ? (
          <button
            onClick={() => hit("/api/booth/queue/mark-playing", item.id)}
            disabled={isBusy}
          >
            ▶ Play
          </button>
        ) : null}

        {showPlayed ? (
          <button
            onClick={() => hit("/api/booth/queue/mark-played", item.id)}
            disabled={isBusy}
          >
            ✅ Played
          </button>
        ) : null}

        <button
          onClick={() => hit("/api/booth/queue/skip", item.id)}
          disabled={isBusy || item.status === "PLAYED" || item.status === "SKIPPED"}
        >
          ⏭ Skip
        </button>

        {showHold ? (
          <button
            onClick={() => hit("/api/booth/queue/hold", item.id)}
            disabled={isBusy}
          >
            ⏸ Hold
          </button>
        ) : null}

        {showReturn ? (
          <button
            onClick={() => hit("/api/booth/queue/return-to-queue", item.id)}
            disabled={isBusy}
          >
            ↩ Return
          </button>
        ) : null}
      </div>
    </div>
  );
}

function statusBadge(item: BoothQueueItem) {
  if (item.status === "PLAYING") return "NOW PLAYING";
  if (item.status === "LOADED") return "LOADED";
  if (item.status === "HELD") return "HELD";
  if (item.status === "PLAYED") return "PLAYED";
  if (item.status === "SKIPPED") return "SKIPPED";
  return null;
}

function cardStyle(tone: string) {
  if (tone === "playing" || tone === "PLAYING") {
    return {
      border: "2px solid #4caf50",
      background: "#0f1a0f",
      badgeBg: "#1f5f2a",
    };
  }

  if (tone === "loaded" || tone === "LOADED") {
    return {
      border: "2px solid #2196f3",
      background: "#0b1520",
      badgeBg: "#17476a",
    };
  }

  if (tone === "held" || tone === "HELD") {
    return {
      border: "2px solid #a67c00",
      background: "#1a1508",
      badgeBg: "#6b5200",
    };
  }

  if (tone === "next") {
    return {
      border: "2px solid #8b5cf6",
      background: "#151020",
      badgeBg: "#5b3c9a",
    };
  }

  if (tone === "history" || tone === "PLAYED" || tone === "SKIPPED") {
    return {
      border: "1px solid #444",
      background: "#101010",
      badgeBg: "#333",
    };
  }

  return {
    border: "1px solid #333",
    background: "#0a0a0a",
    badgeBg: "#333",
  };
}