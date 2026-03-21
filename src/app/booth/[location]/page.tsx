"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { deriveBoothSections } from "@/lib/booth/queue-rules";
import { buildSmartInsertContext } from "@/lib/booth/smart-insert-context";
import { computeNextPlaybackAction } from "@/lib/booth/compute-next-playback-action";
import type { InterstitialAsset } from "@/lib/booth/interstitial-types";
import { mockInterstitialAssets } from "@/lib/booth/mock-interstitial-assets";
import { mapDbInterstitialAssetsToPreview } from "@/lib/booth/map-db-interstitial-assets-to-preview";
import type { BoothSearchResult } from "@/lib/booth/booth-search-types";
import { canReorderBoothItem, canShowBoothSearchActions } from "@/lib/booth/queue-permissions";

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

type BoothTab = "queue" | "held" | "search" | "smart" | "history";
type AddMode = "BOTTOM" | "PLAY_NEXT" | "AFTER_CURRENT";

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
  const [activeTab, setActiveTab] = useState<BoothTab>("queue");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<BoothSearchResult[]>([]);
  const [addBusySongId, setAddBusySongId] = useState<string | null>(null);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const searchTimer = useRef<number | null>(null);

  const queueUrl = useMemo(() => {
    return location ? `/api/booth/queue/${location}` : "";
  }, [location]);

  const interstitialAssetsUrl = useMemo(() => {
    return location ? `/api/booth/interstitial-assets/${location}` : "";
  }, [location]);

  const searchUrl = useMemo(() => {
    return location ? `/api/booth/search-songs/${location}` : "";
  }, [location]);

  const addSongUrl = useMemo(() => {
    return location ? `/api/booth/add-song/${location}` : "";
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

  async function loadSearchResults(query: string) {
    if (!searchUrl) return;

    if (!query.trim()) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    try {
      setSearchBusy(true);
      setSearchError("");

      const res = await fetch(`${searchUrl}?q=${encodeURIComponent(query.trim())}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setSearchResults([]);
        setSearchError(data?.error || "Search unavailable.");
        return;
      }

      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
      setSearchError("Search unavailable.");
    } finally {
      setSearchBusy(false);
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

  async function addSong(songId: string, mode: AddMode) {
    if (!addSongUrl) return;

    try {
      setAddBusySongId(songId);
      setError("");
      setSearchError("");

      const res = await fetch(addSongUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ songId, mode }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setSearchError(data?.error || "Could not add song.");
        return;
      }

      setActiveTab("queue");
      await loadQueue(false);
    } catch {
      setSearchError("Could not add song.");
    } finally {
      setAddBusySongId(null);
    }
  }

  async function reorderQueuedItems(orderedQueuedItemIds: string[]) {
    if (!location || orderedQueuedItemIds.length === 0) return;

    try {
      setReorderBusy(true);
      setError("");

      const res = await fetch("/api/booth/queue/reorder", {
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
      setReorderBusy(false);
      setDraggingId(null);
    }
  }

  useEffect(() => {
    if (!location) return;

    async function loadInitial() {
      await Promise.all([loadQueue(true), loadInterstitialAssets()]);
    }

    loadInitial();
  }, [location, interstitialAssetsUrl]);

  useEffect(() => {
    if (!location) return;

    const timer = window.setInterval(() => {
      loadQueue(false);
      loadInterstitialAssets();
    }, 4000);

    return () => window.clearInterval(timer);
  }, [location, queueUrl, interstitialAssetsUrl]);

  useEffect(() => {
    if (searchTimer.current) {
      window.clearTimeout(searchTimer.current);
    }

    searchTimer.current = window.setTimeout(() => {
      loadSearchResults(searchTerm);
    }, 250);

    return () => {
      if (searchTimer.current) {
        window.clearTimeout(searchTimer.current);
      }
    };
  }, [searchTerm, searchUrl]);

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

    return previewInterstitialAssets.find((asset) => asset.id === nextPlaybackAction.assetId) || null;
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

  const nowPlaying = sections.playing || null;
  const onDeck = sections.loaded || null;
  const nextUp = sections.loaded ? sections.queued[0] || null : sections.queued[0] || null;
  const visibleQueueItems = sections.loaded ? sections.queued : sections.queued.slice(1);
  const movableQueuedIds = sections.queued.filter(canReorderBoothItem).map((item) => item.id);

  function moveQueueItem(queueItemId: string, direction: -1 | 1) {
    const currentIndex = movableQueuedIds.findIndex((id) => id === queueItemId);
    if (currentIndex === -1) return;

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= movableQueuedIds.length) return;

    const nextIds = [...movableQueuedIds];
    const [moved] = nextIds.splice(currentIndex, 1);
    nextIds.splice(targetIndex, 0, moved);
    reorderQueuedItems(nextIds);
  }

  function dropQueueItem(targetQueueItemId: string) {
    if (!draggingId || draggingId === targetQueueItemId) {
      setDraggingId(null);
      return;
    }

    const sourceIndex = movableQueuedIds.findIndex((id) => id === draggingId);
    const targetIndex = movableQueuedIds.findIndex((id) => id === targetQueueItemId);
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggingId(null);
      return;
    }

    const nextIds = [...movableQueuedIds];
    const [moved] = nextIds.splice(sourceIndex, 1);
    nextIds.splice(targetIndex, 0, moved);
    reorderQueuedItems(nextIds);
  }

  function dropAtQueueBottom() {
    if (!draggingId) return;
    const sourceIndex = movableQueuedIds.findIndex((id) => id === draggingId);
    if (sourceIndex === -1 || sourceIndex === movableQueuedIds.length - 1) {
      setDraggingId(null);
      return;
    }

    const nextIds = [...movableQueuedIds];
    const [moved] = nextIds.splice(sourceIndex, 1);
    nextIds.push(moved);
    reorderQueuedItems(nextIds);
  }

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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 40, marginBottom: 8 }}>🎧 Booth Control</h1>
          <p style={{ opacity: 0.82, marginTop: 0, marginBottom: 0 }}>
            Location: <strong>{location || "unknown"}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={async () => {
              await Promise.all([loadQueue(true), loadInterstitialAssets()]);
            }}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={() => setActiveTab("search")}>Search & Add</button>
        </div>
      </div>

      {error ? <ErrorBanner text={error} /> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(340px, 0.9fr)",
          gap: 20,
          alignItems: "start",
          marginTop: 20,
        }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <QueueSection title="NOW PLAYING">
            {nowPlaying ? (
              <BoothCard item={nowPlaying} tone="playing" busyId={busyId} hit={hit} />
            ) : (
              <EmptyState text="Nothing is currently playing." />
            )}
          </QueueSection>

          <QueueSection title="ON DECK">
            {onDeck ? (
              <BoothCard item={onDeck} tone="loaded" busyId={busyId} hit={hit} />
            ) : (
              <EmptyState text="No item is loaded yet." />
            )}
          </QueueSection>

          <QueueSection title="NEXT UP">
            {nextUp ? (
              <BoothCard item={nextUp} tone="queued" busyId={busyId} hit={hit} />
            ) : (
              <EmptyState text="No queued songs yet." />
            )}
          </QueueSection>

          {activeTab === "queue" ? (
            <QueueSection title={`QUEUE (${visibleQueueItems.length})`}>
              {visibleQueueItems.length === 0 ? (
                <EmptyState text="No additional queued songs." />
              ) : (
                <>
                  {visibleQueueItems.map((item) => (
                    <QueueReorderCard
                      key={item.id}
                      item={item}
                      busyId={busyId}
                      hit={hit}
                      reorderBusy={reorderBusy}
                      canMove={canReorderBoothItem(item)}
                      isDragging={draggingId === item.id}
                      onMoveUp={() => moveQueueItem(item.id, -1)}
                      onMoveDown={() => moveQueueItem(item.id, 1)}
                      onDragStart={() => setDraggingId(item.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onDrop={() => dropQueueItem(item.id)}
                    />
                  ))}

                  {movableQueuedIds.length > 1 ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={dropAtQueueBottom}
                      style={{
                        border: "1px dashed #2c5d8a",
                        borderRadius: 12,
                        padding: 12,
                        opacity: 0.7,
                        textAlign: "center",
                        fontSize: 13,
                      }}
                    >
                      Drag here to move song to bottom of movable queue
                    </div>
                  ) : null}
                </>
              )}
            </QueueSection>
          ) : null}

          {activeTab === "held" ? (
            <QueueSection title={`HELD (${sections.held.length})`}>
              {sections.held.length === 0 ? (
                <EmptyState text="No held songs." />
              ) : (
                sections.held.map((item) => (
                  <BoothCard key={item.id} item={item} tone="held" busyId={busyId} hit={hit} />
                ))
              )}
            </QueueSection>
          ) : null}

          {activeTab === "history" ? (
            <QueueSection title={`RECENTLY FINISHED (${sections.history.length})`}>
              {sections.history.length === 0 ? (
                <EmptyState text="No recent history yet." />
              ) : (
                sections.history.map((item) => (
                  <BoothCard key={item.id} item={item} tone="history" busyId={busyId} hit={hit} />
                ))
              )}
            </QueueSection>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {activeTab === "search" ? (
            <SearchPanel
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchBusy={searchBusy}
              searchError={searchError}
              searchResults={searchResults}
              addBusySongId={addBusySongId}
              onAddSong={addSong}
            />
          ) : null}

          {activeTab === "smart" || activeTab === "queue" ? (
            <>
              <NextPlaybackActionPanel
                nextPlaybackAction={nextPlaybackAction}
                plannedAsset={plannedAsset}
                plannedQueueItem={plannedQueueItem}
              />
              <SmartInsertPanel smartInsert={smartInsert} />
              <QueueRulesPanel />
            </>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 24 }}>
        <TabButton active={activeTab === "queue"} onClick={() => setActiveTab("queue")} text="Queue" />
        <TabButton active={activeTab === "held"} onClick={() => setActiveTab("held")} text="Held" />
        <TabButton active={activeTab === "search"} onClick={() => setActiveTab("search")} text="Search & Add" />
        <TabButton active={activeTab === "smart"} onClick={() => setActiveTab("smart")} text="Smart Insert" />
        <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")} text="History" />
      </div>
    </div>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        border: "1px solid #663",
        background: "#221",
        borderRadius: 10,
      }}
    >
      {text}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  text,
}: {
  active: boolean;
  onClick: () => void;
  text: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: active ? "1px solid #3b82f6" : "1px solid #333",
        background: active ? "#15233d" : "#0c0c0c",
        color: "#fff",
        fontWeight: 700,
      }}
    >
      {text}
    </button>
  );
}

function SearchPanel({
  searchTerm,
  setSearchTerm,
  searchBusy,
  searchError,
  searchResults,
  addBusySongId,
  onAddSong,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchBusy: boolean;
  searchError: string;
  searchResults: BoothSearchResult[];
  addBusySongId: string | null;
  onAddSong: (songId: string, mode: AddMode) => void;
}) {
  return (
    <section
      style={{
        border: "1px solid #1f2a3d",
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
        Search & Add
      </div>

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search title or artist"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #334155",
            background: "#0b1624",
            color: "#fff",
            outline: "none",
          }}
        />

        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#0d1f14",
            border: "1px solid #284835",
            fontSize: 13,
            lineHeight: 1.45,
            opacity: 0.92,
          }}
        >
          Search stays staff-only. Add to Queue puts the song at the bottom. Play Next places it right after the active playing/loaded area. Add After Current places it right after the current live song.
        </div>

        {searchBusy ? <div style={{ opacity: 0.7 }}>Searching…</div> : null}
        {searchError ? <div style={{ color: "#ffb4b4" }}>{searchError}</div> : null}
        {!searchBusy && !searchError && searchTerm.trim() && searchResults.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No results.</div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          {searchResults.map((result) => (
            <div
              key={result.id}
              style={{
                border: "1px solid #243244",
                borderRadius: 12,
                background: "#0b1624",
                padding: 12,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{result.title}</div>
                  <div style={{ opacity: 0.88 }}>{result.artist}</div>
                </div>
                {result.explicit ? (
                  <span style={{ fontSize: 12, padding: "4px 6px", borderRadius: 999, background: "#432", color: "#ffd3d3" }}>
                    Explicit
                  </span>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {canShowBoothSearchActions(result) ? (
                  <>
                    <button disabled={addBusySongId === result.id} onClick={() => onAddSong(result.id, "BOTTOM")}>
                      {addBusySongId === result.id ? "Adding..." : "Add to Queue"}
                    </button>
                    <button disabled={addBusySongId === result.id} onClick={() => onAddSong(result.id, "PLAY_NEXT")}>
                      Play Next
                    </button>
                    <button disabled={addBusySongId === result.id} onClick={() => onAddSong(result.id, "AFTER_CURRENT")}>
                      Add After Current
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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

function QueueReorderCard({
  item,
  busyId,
  hit,
  reorderBusy,
  canMove,
  isDragging,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  item: BoothQueueItem;
  busyId: string | null;
  hit: (endpoint: string, queueItemId: string) => void;
  reorderBusy: boolean;
  canMove: boolean;
  isDragging: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      draggable={canMove && !reorderBusy}
      onDragStart={() => {
        if (!canMove || reorderBusy) return;
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (!canMove) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (!canMove) return;
        e.preventDefault();
        onDrop();
      }}
      style={{ opacity: isDragging ? 0.55 : 1 }}
    >
      <BoothCard item={item} tone="queued" busyId={busyId} hit={hit} />
      {canMove ? (
        <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
          <button onClick={onMoveUp} disabled={reorderBusy}>↑ Move Up</button>
          <button onClick={onMoveDown} disabled={reorderBusy}>↓ Move Down</button>
        </div>
      ) : null}
    </div>
  );
}

function BoothCard({
  item,
  tone,
  busyId,
  hit,
}: {
  item: BoothQueueItem;
  tone: "playing" | "loaded" | "queued" | "held" | "history";
  busyId: string | null;
  hit: (endpoint: string, queueItemId: string) => void;
}) {
  const isBusy = busyId === item.id;
  const cardTone =
    tone === "playing"
      ? { border: "#1f4f2a", background: "#07110a" }
      : tone === "loaded"
      ? { border: "#29456a", background: "#08101b" }
      : tone === "held"
      ? { border: "#6a5229", background: "#1a1208" }
      : tone === "history"
      ? { border: "#333", background: "#0a0a0a" }
      : { border: "#2b2b2b", background: "#0b0b0b" };

  const title = item.title || "Unknown Title";
  const artist = item.artist || "Unknown Artist";

  return (
    <div
      style={{
        border: `1px solid ${cardTone.border}`,
        background: cardTone.background,
        borderRadius: 14,
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
          <div style={{ opacity: 0.86 }}>{artist}</div>
        </div>

        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <StatusPill status={item.status} sourceType={item.sourceType} />
          <div style={{ fontSize: 12, opacity: 0.7 }}>#{item.position}</div>
        </div>
      </div>

      <div style={{ fontSize: 13, opacity: 0.78 }}>
        Source: {item.sourceType} {item.introAssigned ? "• Intro assigned" : ""}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {item.status === "QUEUED" ? (
          <>
            <button disabled={isBusy} onClick={() => hit("/api/booth/queue/mark-loaded", item.id)}>
              Load
            </button>
            <button disabled={isBusy} onClick={() => hit("/api/booth/queue/mark-playing", item.id)}>
              Play
            </button>
            <button disabled={isBusy} onClick={() => hit("/api/booth/queue/hold", item.id)}>
              Hold
            </button>
            <button disabled={isBusy} onClick={() => hit("/api/booth/queue/skip", item.id)}>
              Skip
            </button>
          </>
        ) : null}

        {item.status === "LOADED" ? (
          <>
            <button disabled={isBusy} onClick={() => hit("/api/booth/queue/mark-playing", item.id)}>
              Play
            </button>
            <button disabled={isBusy} onClick={() => hit("/api/booth/queue/return-to-queue", item.id)}>
              Return
            </button>
            <button disabled={isBusy} onClick={() => hit("/api/booth/queue/hold", item.id)}>
              Hold
            </button>
          </>
        ) : null}

        {item.status === "PLAYING" ? (
          <>
            <button disabled={isBusy} onClick={() => hit("/api/booth/queue/mark-played", item.id)}>
              Mark Played
            </button>
            <button disabled={isBusy} onClick={() => hit("/api/booth/queue/return-to-queue", item.id)}>
              Return
            </button>
            <button disabled={isBusy} onClick={() => hit("/api/booth/queue/hold", item.id)}>
              Hold
            </button>
          </>
        ) : null}

        {item.status === "HELD" ? (
          <button disabled={isBusy} onClick={() => hit("/api/booth/queue/return-to-queue", item.id)}>
            Return to Queue
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StatusPill({ status, sourceType }: { status: string; sourceType: string }) {
  const background =
    status === "PLAYING"
      ? "#1b5e20"
      : status === "LOADED"
      ? "#0d47a1"
      : status === "HELD"
      ? "#8d6e00"
      : status === "PLAYED" || status === "SKIPPED"
      ? "#444"
      : sourceType === "INTERSTITIAL"
      ? "#4a148c"
      : "#333";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px 9px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background,
      }}
    >
      {status}
    </span>
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
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a2f22", fontWeight: 700, fontSize: 18 }}>
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
            <PlanningRow label="Duration" value={`${plannedAsset.durationSec ?? 0} sec`} />
            <PlanningRow label="File" value={(plannedAsset as any).filePath || (plannedAsset as any).fileUrl || "—"} />
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
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1b2a3b", fontWeight: 700, fontSize: 18 }}>
        Smart Insert Planning
      </div>

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <PlanningRow label="Next playable" value={formatTrackLabel(smartInsert.nextPlayable)} />
        <PlanningRow label="Current playable" value={formatTrackLabel(smartInsert.currentPlayable)} />
        <PlanningRow label="Queue depth" value={String(smartInsert.queueDepth)} />
        <PlanningRow label="Upcoming request count" value={String(smartInsert.consecutiveRequestCount)} />
        <PlanningRow label="Planning mode" value={requestMode} valueTone={smartInsert.requestClusterDetected ? "#7ee787" : smartInsert.singleRequestDetected ? "#79c0ff" : "#d2d2d2"} />
        <PlanningRow label="Intro already assigned" value={smartInsert.introAlreadyAssigned ? "Yes" : "No"} />
      </div>
    </section>
  );
}

function QueueRulesPanel() {
  return (
    <section
      style={{
        border: "1px solid #2d2d2d",
        borderRadius: 16,
        background: "#090909",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #202020", fontWeight: 700, fontSize: 18 }}>
        Booth Notes
      </div>
      <div style={{ padding: 16, display: "grid", gap: 10, fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>
        <div>• Staff can search and add songs directly from the booth.</div>
        <div>• Drag/drop and move buttons only reorder queued song rows.</div>
        <div>• Interstitial timing remains backend-managed.</div>
        <div>• Search actions create queue-safe booth items without changing the public request flow.</div>
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
      <div style={{ fontSize: 12, opacity: 0.68, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontWeight: 700, color: valueTone || "#fff" }}>{value}</div>
    </div>
  );
}

function formatTrackLabel(item: BoothQueueItem | null | undefined) {
  if (!item) return "None";
  return `${item.title || "Unknown Title"} — ${item.artist || "Unknown Artist"}`;
}

function formatReason(value: string | null | undefined) {
  if (!value) return "—";
  return String(value).replaceAll("_", " ");
}
