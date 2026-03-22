// SRC APP BOOTH LOCATION PAGE.TSX

"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { deriveBoothSections } from "@/lib/booth/queue-rules";
import { buildSmartInsertContext } from "@/lib/booth/smart-insert-context";
import { computeNextPlaybackAction } from "@/lib/booth/compute-next-playback-action";
import type { InterstitialAsset } from "@/lib/booth/interstitial-types";
import { mockInterstitialAssets } from "@/lib/booth/mock-interstitial-assets";
import { mapDbInterstitialAssetsToPreview } from "@/lib/booth/map-db-interstitial-assets-to-preview";

type BoothQueueItem = {
  id: string;
  requestId: string | null;
  position: number;
  status: string;
  sourceType: string;
  itemType?: "SONG" | "INTERSTITIAL";
  introAssigned: boolean;
  clusterId: string | null;
  loadedAt: string | null;
  playingAt: string | null;
  startedAt: string | null;
  expectedEndAt: string | null;
  completedAt: string | null;
  createdAt: string;
  durationSec: number | null;
  elapsedSec: number;
  remainingSec: number | null;
  progressPercent: number;
  isEndingSoon: boolean;
  title: string | null;
  artist: string | null;
  artworkUrl: string | null;
  explicit: boolean | null;
};

type SearchResult = {
  id: string;
  title: string;
  artist: string;
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
  const [dbInterstitialAssets, setDbInterstitialAssets] = useState<InterstitialAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [clockMs, setClockMs] = useState(Date.now());
  const materializeBusyRef = useRef(false);

  const queueUrl = useMemo(() => {
    return location ? `/api/booth/queue/${location}` : "";
  }, [location]);

  const interstitialAssetsUrl = useMemo(() => {
    return location ? `/api/booth/interstitial-assets/${location}` : "";
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

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
      setError("Could not load booth queue.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function loadInterstitialAssets() {
    if (!interstitialAssetsUrl) return;

    try {
      const res = await fetch(interstitialAssetsUrl, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setDbInterstitialAssets([]);
        return;
      }

      setDbInterstitialAssets(mapDbInterstitialAssetsToPreview(data.assets || []));
    } catch {
      setDbInterstitialAssets([]);
    }
  }

  async function loadSearch(q: string) {
    if (!location) return;
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    try {
      setSearchBusy(true);
      setSearchError("");

      const res = await fetch(
        `/api/booth/search-songs/${location}?q=${encodeURIComponent(trimmed)}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setSearchResults([]);
        setSearchError(data?.error || "Search unavailable.");
        return;
      }

      setSearchResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setSearchResults([]);
      setSearchError("Search unavailable.");
    } finally {
      setSearchBusy(false);
    }
  }

  async function addSong(
    mode: "ADD_TO_QUEUE" | "PLAY_NEXT" | "ADD_AFTER_CURRENT",
    songId: string
  ) {
    if (!location) return;

    try {
      setBusyId(`search:${songId}`);
      setError("");

      const res = await fetch(`/api/booth/add-song/${location}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          songId,
          mode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setError(data?.error || "Could not add song.");
        return;
      }

      await loadQueue(false);
    } catch {
      setError("Could not add song.");
    } finally {
      setBusyId(null);
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

  async function moveQueuedItem(itemId: string, direction: "up" | "down") {
    const queuedSongs = sections.queued.filter((item) => item.sourceType !== "INTERSTITIAL");
    const currentIndex = queuedSongs.findIndex((item) => item.id === itemId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= queuedSongs.length) return;

    const nextOrdered = [...queuedSongs];
    const [moved] = nextOrdered.splice(currentIndex, 1);
    nextOrdered.splice(targetIndex, 0, moved);

    const orderedQueuedItemIds = nextOrdered.map((item) => item.id);

    try {
      setBusyId(itemId);
      setError("");

      const res = await fetch(`/api/booth/queue/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          location,
          orderedQueuedItemIds,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setError(data?.error || "Could not reorder queue.");
        return;
      }

      await loadQueue(false);
    } catch {
      setError("Could not reorder queue.");
    } finally {
      setBusyId(null);
    }
  }

  const sections = useMemo(() => deriveBoothSections(items), [items]);
  const smartInsert = useMemo(() => buildSmartInsertContext(items), [items]);

  const previewInterstitialAssets = useMemo(() => {
    return dbInterstitialAssets.length > 0 ? dbInterstitialAssets : mockInterstitialAssets;
  }, [dbInterstitialAssets]);

  const nextPlaybackAction = useMemo(() => {
    return computeNextPlaybackAction({
      sessionId: "preview-session",
      locationId: location || "unknown",
      profile: "FAMILY",
      queueItems: items,
      interstitialAssets: previewInterstitialAssets,
      recentInterstitialEvents: [],
      nowIso: new Date().toISOString(),
    });
  }, [items, location, previewInterstitialAssets]);

  const plannedAsset = useMemo(() => {
    if (nextPlaybackAction.action !== "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM") {
      return null;
    }

    return (
      previewInterstitialAssets.find((asset) => asset.id === nextPlaybackAction.assetId) || null
    );
  }, [nextPlaybackAction, previewInterstitialAssets]);

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
  const nowPlaying = sections.playing || null;

  const liveProgressPercent = useMemo(() => {
    if (!nowPlaying) return 0;
    const durationSec = nowPlaying.durationSec || 0;
    if (!durationSec) return 0;

    const startedMs = nowPlaying.startedAt
      ? new Date(nowPlaying.startedAt).getTime()
      : nowPlaying.playingAt
      ? new Date(nowPlaying.playingAt).getTime()
      : null;

    if (!startedMs) {
      return nowPlaying.progressPercent || 0;
    }

    const elapsedSec = Math.max(0, (clockMs - startedMs) / 1000);
    return Math.min(100, Math.max(0, (elapsedSec / durationSec) * 100));
  }, [clockMs, nowPlaying]);

  const liveRemainingSec = useMemo(() => {
    if (!nowPlaying) return null;
    const durationSec = nowPlaying.durationSec || 0;
    const startedMs = nowPlaying.startedAt
      ? new Date(nowPlaying.startedAt).getTime()
      : nowPlaying.playingAt
      ? new Date(nowPlaying.playingAt).getTime()
      : null;

    if (!durationSec || !startedMs) {
      return nowPlaying.remainingSec;
    }

    const elapsedSec = Math.max(0, Math.floor((clockMs - startedMs) / 1000));
    return Math.max(0, durationSec - elapsedSec);
  }, [clockMs, nowPlaying]);

  async function maybeMaterializeNext() {
    if (!location || materializeBusyRef.current) return;
    materializeBusyRef.current = true;

    try {
      await fetch(`/api/booth/runtime/materialize-next/${location}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });
    } catch {
      // best effort only
    } finally {
      materializeBusyRef.current = false;
    }
  }

  useEffect(() => {
    if (!location) return;

    async function loadInitial() {
      await Promise.all([loadQueue(true), loadInterstitialAssets()]);
      await maybeMaterializeNext();
      await loadQueue(false);
    }

    loadInitial();
  }, [location]);

  useEffect(() => {
    if (!location) return;

    const timer = window.setInterval(async () => {
      setClockMs(Date.now());
      await loadQueue(false);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [location, queueUrl]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadSearch(searchQuery);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery, location]);

  useEffect(() => {
    if (!location) return;
    if (!nowPlaying || !nowPlaying.isEndingSoon) return;
    maybeMaterializeNext();
  }, [location, nowPlaying?.id, nowPlaying?.isEndingSoon]);

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 42, marginBottom: 8 }}>🎧 Booth Control</h1>
          <p style={{ opacity: 0.8, marginTop: 0, marginBottom: 0 }}>
            Location: <strong>{location || "unknown"}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={async () => {
              await Promise.all([loadQueue(true), loadInterstitialAssets()]);
            }}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button onClick={() => setSearchOpen((prev) => !prev)}>
            {searchOpen ? "Hide Search" : "Search & Add"}
          </button>
        </div>
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
          gridTemplateColumns: searchOpen ? "2fr 1fr" : "1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          <QueueSection title="NOW PLAYING">
            {sections.playing ? (
              <QueueCard
                item={sections.playing}
                hit={hit}
                busyId={busyId}
                tone="playing"
                progressPercent={liveProgressPercent}
                remainingSec={liveRemainingSec}
                canMove={false}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
              />
            ) : (
              <EmptyState text="Nothing is currently playing." />
            )}
          </QueueSection>

          <QueueSection title="ON DECK">
            {sections.loaded ? (
              <QueueCard
                item={sections.loaded}
                hit={hit}
                busyId={busyId}
                tone="loaded"
                canMove={false}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
              />
            ) : (
              <EmptyState text="No item is loaded yet." />
            )}
          </QueueSection>

          <QueueSection title="NEXT UP">
            {sections.nextUp && !sections.loaded ? (
              <QueueCard
                item={sections.nextUp}
                hit={hit}
                busyId={busyId}
                tone="next"
                canMove={false}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
              />
            ) : (
              <EmptyState text="No queued songs yet." />
            )}
          </QueueSection>

          <QueueSection
            title={`QUEUE${
              visibleQueueItems.length ? ` (${visibleQueueItems.length})` : ""
            }`}
          >
            {visibleQueueItems.length === 0 ? (
              <EmptyState text="No additional queued items." />
            ) : (
              visibleQueueItems.map((item, index) => {
                const songQueue = visibleQueueItems.filter(
                  (row) => row.sourceType !== "INTERSTITIAL"
                );
                const songIndex = songQueue.findIndex((row) => row.id === item.id);

                return (
                  <QueueCard
                    key={item.id}
                    item={item}
                    hit={hit}
                    busyId={busyId}
                    canMove={item.sourceType !== "INTERSTITIAL"}
                    onMoveUp={() => moveQueuedItem(item.id, "up")}
                    onMoveDown={() => moveQueuedItem(item.id, "down")}
                    disableMoveUp={item.sourceType === "INTERSTITIAL" || songIndex <= 0}
                    disableMoveDown={
                      item.sourceType === "INTERSTITIAL" ||
                      songIndex === -1 ||
                      songIndex >= songQueue.length - 1
                    }
                  />
                );
              })
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
                  canMove={false}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
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
                  canMove={false}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                />
              ))}
            </QueueSection>
          ) : null}
        </div>

        {searchOpen ? (
          <div style={{ display: "grid", gap: 20 }}>
            <NextPlaybackActionPanel
              nextPlaybackAction={nextPlaybackAction}
              plannedAsset={plannedAsset}
              plannedQueueItem={plannedQueueItem}
            />
            <SearchAddPanel
              query={searchQuery}
              setQuery={setSearchQuery}
              busyId={busyId}
              searchBusy={searchBusy}
              searchError={searchError}
              results={searchResults}
              addSong={addSong}
            />
            <SmartInsertPanel smartInsert={smartInsert} />
            <QueueRulesPanel />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function QueueSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
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

function QueueCard({
  item,
  hit,
  busyId,
  tone,
  progressPercent,
  remainingSec,
  canMove,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
}: {
  item: BoothQueueItem;
  hit: (endpoint: string, queueItemId: string) => Promise<void>;
  busyId: string | null;
  tone?: "playing" | "loaded" | "next" | "held" | "history";
  progressPercent?: number | null;
  remainingSec?: number | null;
  canMove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
}) {
  const isBusy = busyId === item.id;
  const isInterstitial = item.sourceType === "INTERSTITIAL";
  const duration = item.durationSec != null ? formatDuration(item.durationSec) : null;
  const barPercent =
    progressPercent != null ? progressPercent : item.progressPercent || 0;
  const remainingLabel =
    remainingSec != null
      ? `Ending in ${formatDuration(remainingSec)}`
      : item.remainingSec != null
      ? `Ending in ${formatDuration(item.remainingSec)}`
      : null;

  const palette =
    tone === "playing"
      ? { border: "#14532d", bg: "#03190d", badge: "#16a34a" }
      : tone === "loaded"
      ? { border: "#1d4ed8", bg: "#031328", badge: "#2563eb" }
      : tone === "held"
      ? { border: "#7c2d12", bg: "#211008", badge: "#c2410c" }
      : tone === "history"
      ? { border: "#3f3f46", bg: "#111114", badge: "#52525b" }
      : isInterstitial
      ? { border: "#6b21a8", bg: "#170726", badge: "#9333ea" }
      : { border: "#2a2a2a", bg: "#0b0b0b", badge: "#3f3f46" };

  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        borderRadius: isInterstitial ? 12 : 16,
        padding: isInterstitial ? "10px 14px" : 14,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: isInterstitial ? 14 : 16,
              fontWeight: 700,
              lineHeight: 1.25,
            }}
          >
            {item.title || (isInterstitial ? "Interstitial" : "Untitled")}
          </div>
          <div style={{ opacity: 0.9, marginTop: 2 }}>
            {item.artist || (isInterstitial ? "System insert" : "Unknown artist")}
          </div>
          <div style={{ opacity: 0.75, marginTop: 8, fontSize: 13 }}>
            Source: {item.sourceType}
            {duration ? ` · ${duration}` : ""}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <div
            style={{
              background: palette.badge,
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {item.status}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>#{item.position}</div>
        </div>
      </div>

      {item.status === "PLAYING" ? (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              width: "100%",
              height: 10,
              borderRadius: 999,
              background: "#1f2937",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${barPercent}%`,
                height: "100%",
                background: isInterstitial ? "#a855f7" : "#22c55e",
                transition: "width 900ms linear",
              }}
            />
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 13,
              opacity: 0.92,
            }}
          >
            <div>
              {item.isEndingSoon ? "Ending soon…" : "In progress"}
            </div>
            <div>{remainingLabel || "—"}</div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {item.status === "QUEUED" ? (
          <>
            <button
              disabled={isBusy}
              onClick={() => hit("/api/booth/queue/mark-loaded", item.id)}
            >
              Load
            </button>
            <button
              disabled={isBusy}
              onClick={() => hit("/api/booth/queue/hold", item.id)}
            >
              Hold
            </button>
          </>
        ) : null}

        {item.status === "LOADED" ? (
          <>
            <button
              disabled={isBusy}
              onClick={() => hit("/api/booth/queue/mark-playing", item.id)}
            >
              Play
            </button>
            <button
              disabled={isBusy}
              onClick={() => hit("/api/booth/queue/return-to-queue", item.id)}
            >
              Return
            </button>
            <button
              disabled={isBusy}
              onClick={() => hit("/api/booth/queue/hold", item.id)}
            >
              Hold
            </button>
          </>
        ) : null}

        {item.status === "PLAYING" ? (
          <>
            <button
              disabled={isBusy}
              onClick={() => hit("/api/booth/queue/mark-played", item.id)}
            >
              Mark Played
            </button>
            <button
              disabled={isBusy}
              onClick={() => hit("/api/booth/queue/return-to-queue", item.id)}
            >
              Return
            </button>
            <button
              disabled={isBusy}
              onClick={() => hit("/api/booth/queue/hold", item.id)}
            >
              Hold
            </button>
          </>
        ) : null}

        {item.status === "HELD" ? (
          <button
            disabled={isBusy}
            onClick={() => hit("/api/booth/queue/return-to-queue", item.id)}
          >
            Return to Queue
          </button>
        ) : null}

        {canMove ? (
          <>
            <button disabled={!!disableMoveUp || isBusy} onClick={onMoveUp}>
              Move Up
            </button>
            <button disabled={!!disableMoveDown || isBusy} onClick={onMoveDown}>
              Move Down
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function SearchAddPanel({
  query,
  setQuery,
  busyId,
  searchBusy,
  searchError,
  results,
  addSong,
}: {
  query: string;
  setQuery: (next: string) => void;
  busyId: string | null;
  searchBusy: boolean;
  searchError: string;
  results: SearchResult[];
  addSong: (
    mode: "ADD_TO_QUEUE" | "PLAY_NEXT" | "ADD_AFTER_CURRENT",
    songId: string
  ) => Promise<void>;
}) {
  return (
    <section
      style={{
        border: "1px solid #183153",
        borderRadius: 16,
        background: "#06101c",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #1c2f48",
          fontWeight: 700,
          fontSize: 18,
        }}
      >
        Search & Add
      </div>

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or artist"
          style={{
            width: "100%",
            borderRadius: 10,
            border: "1px solid #29425f",
            background: "#08192d",
            color: "#fff",
            padding: "12px 14px",
          }}
        />

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "#0b2a15",
            border: "1px solid #1f6f3e",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#d6fbe3",
          }}
        >
          Search stays staff-only. Add to Queue puts the song at the bottom. Play Next places
          it right after the active playing/loaded area. Add After Current places it right after
          the current live song.
        </div>

        {searchBusy ? <div>Searching…</div> : null}
        {searchError ? <div style={{ color: "#fca5a5" }}>{searchError}</div> : null}

        <div style={{ display: "grid", gap: 10 }}>
          {results.map((song) => {
            const rowBusy = busyId === `search:${song.id}`;
            return (
              <div
                key={song.id}
                style={{
                  border: "1px solid #20334d",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{song.title}</div>
                  <div style={{ opacity: 0.82 }}>{song.artist}</div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button disabled={rowBusy} onClick={() => addSong("ADD_TO_QUEUE", song.id)}>
                    Add to Queue
                  </button>
                  <button disabled={rowBusy} onClick={() => addSong("PLAY_NEXT", song.id)}>
                    Play Next
                  </button>
                  <button disabled={rowBusy} onClick={() => addSong("ADD_AFTER_CURRENT", song.id)}>
                    Add After Current
                  </button>
                </div>
              </div>
            );
          })}

          {!searchBusy && !searchError && query.trim() && results.length === 0 ? (
            <div style={{ opacity: 0.72 }}>No songs found.</div>
          ) : null}
        </div>
      </div>
    </section>
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
        <PlanningRow label="Reason" value={formatReason(nextPlaybackAction.reason)} />
        <PlanningRow label="Target queue item" value={formatTrackLabel(plannedQueueItem)} />

        {plannedAsset ? (
          <>
            <PlanningRow label="Planned interstitial" value={plannedAsset.name} />
            <PlanningRow label="Category" value={plannedAsset.category} />
            <PlanningRow label="Duration" value={`${plannedAsset.durationSec} sec`} />
            <PlanningRow label="File" value={plannedAsset.filePath || "—"} />
          </>
        ) : (
          <PlanningRow label="Planned interstitial" value="None" />
        )}
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
        <PlanningRow label="Next playable" value={formatTrackLabel(smartInsert.nextPlayable)} />
        <PlanningRow label="Current playable" value={formatTrackLabel(smartInsert.currentPlayable)} />
        <PlanningRow label="Request mode" value={requestMode} />
        <PlanningRow label="Queued requests" value={String(smartInsert.requestCount || 0)} />
      </div>
    </section>
  );
}

function QueueRulesPanel() {
  return (
    <section
      style={{
        border: "1px solid #2a2a2a",
        borderRadius: 16,
        background: "#090909",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #1f1f1f",
          fontWeight: 700,
          fontSize: 18,
        }}
      >
        Queue Rules
      </div>

      <div style={{ padding: 16, display: "grid", gap: 10, opacity: 0.88, lineHeight: 1.5 }}>
        <div>• Songs can be searched, added, and reordered by staff.</div>
        <div>• Interstitial rows are backend-managed and stay locked in place.</div>
        <div>• Runtime inserts are created as real queue rows before the target song.</div>
      </div>
    </section>
  );
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
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ textTransform: "uppercase", fontSize: 12, opacity: 0.65 }}>{label}</div>
      <div style={{ fontWeight: 700, color: valueTone || "#fff" }}>{value}</div>
    </div>
  );
}

function formatTrackLabel(item: BoothQueueItem | null | undefined) {
  if (!item) return "None";
  return `${item.title || "Untitled"} — ${item.artist || "Unknown artist"}`;
}

function formatReason(reason: string | null | undefined) {
  if (!reason) return "—";
  return reason.replaceAll("_", " ");
}

function formatDuration(totalSec: number) {
  const safe = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
