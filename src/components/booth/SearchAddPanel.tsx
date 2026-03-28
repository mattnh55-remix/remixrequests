"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Song = {
  id: string;
  title: string;
  artist: string;
};

type Props = {
  location: string;
  onAdded?: () => void | Promise<void>;
};

export default function SearchAddPanel({ location, onAdded }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasResults = results.length > 0;
  const activeSong = useMemo(() => results[activeIndex] ?? null, [results, activeIndex]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setError("");
      setActiveIndex(0);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/booth/search-songs/${location}?q=${encodeURIComponent(query.trim())}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          setResults([]);
          setError(data?.error || "Search unavailable.");
          return;
        }

        const nextItems = Array.isArray(data.results) ? data.results : [];
        setResults(nextItems);
        setActiveIndex(0);
      } catch {
        setResults([]);
        setError("Search unavailable.");
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [query, location]);

  async function addSong(
    songId: string,
    mode: "ADD_TO_QUEUE" | "PLAY_NEXT" | "ADD_AFTER_CURRENT"
  ) {
    try {
      setSubmittingId(songId);
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
        throw new Error(data?.error || "Failed to add song");
      }

      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setError("");
      inputRef.current?.focus();
      await onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add song.");
    } finally {
      setSubmittingId(null);
    }
  }

  async function runFastAction(
    song: Song,
    mode: "ADD_TO_QUEUE" | "PLAY_NEXT" | "ADD_AFTER_CURRENT" = "ADD_TO_QUEUE"
  ) {
    await addSong(song.id, mode);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!hasResults) return;
      setActiveIndex((prev) => (prev + 1) % results.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!hasResults) return;
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setResults([]);
      setActiveIndex(0);
      setQuery("");
      setError("");
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (!activeSong) return;

      if (e.shiftKey) {
        void runFastAction(activeSong, "PLAY_NEXT");
        return;
      }

      if (e.altKey) {
        void runFastAction(activeSong, "ADD_AFTER_CURRENT");
        return;
      }

      void runFastAction(activeSong, "ADD_TO_QUEUE");
    }
  }

  return (
    <section className="boothPanel boothPanel--compact">
      <div className="boothPanelHeader">
        <div>
          <div className="boothPanelTitle">Search &amp; Add</div>
          <div className="boothPanelSub">
            Arrow keys move • Enter adds • Shift+Enter plays next
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search songs..."
          className="gunmetalInput searchAddInput"
          autoComplete="off"
        />

        <div className="rounded-[10px] border border-white/10 bg-black/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">
          Enter = Add to Queue • Shift+Enter = Play Next • Alt+Enter = After Current • Esc =
          Clear
        </div>

        {loading ? (
          <div className="rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
            Searching...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-[12px] border border-rose-400/20 bg-rose-400/10 px-3 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {!loading && !error && query.trim().length >= 2 && results.length === 0 ? (
          <div className="rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
            No results found.
          </div>
        ) : null}

        {results.length > 0 ? (
          <div
            role="listbox"
            aria-label="Song search results"
            className="space-y-2"
          >
            {results.map((song, index) => {
              const isActive = index === activeIndex;
              const isSubmitting = submittingId === song.id;

              return (
                <div
                  key={song.id}
                  className={[
                    "rounded-[14px] border transition",
                    isActive
                      ? "border-cyan-300/35 bg-[linear-gradient(90deg,rgba(42,126,214,0.18),rgba(255,255,255,0.04))] shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                  ].join(" ")}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => void runFastAction(song, "ADD_TO_QUEUE")}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/25 text-[11px] font-black text-white/75">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-extrabold leading-5 text-white">
                            {song.title}
                          </div>
                          <div className="truncate text-[12px] font-medium uppercase tracking-[0.08em] text-white/55">
                            {song.artist}
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {isActive ? (
                        <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                          Enter
                        </span>
                      ) : null}

                      <button
                        type="button"
                        className="rounded-[10px] border border-white/12 bg-white/[0.06] px-3 py-2 text-[12px] font-bold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isSubmitting}
                        onClick={() => void addSong(song.id, "ADD_TO_QUEUE")}
                      >
                        Add
                      </button>

                      <button
                        type="button"
                        className="rounded-[10px] border border-sky-300/30 bg-[linear-gradient(180deg,#4f9cf7,#2e6cc4)] px-3 py-2 text-[12px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isSubmitting}
                        onClick={() => void addSong(song.id, "PLAY_NEXT")}
                      >
                        Next
                      </button>

                      <button
                        type="button"
                        className="rounded-[10px] border border-white/12 bg-white/[0.06] px-3 py-2 text-[12px] font-bold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isSubmitting}
                        onClick={() => void addSong(song.id, "ADD_AFTER_CURRENT")}
                      >
                        After
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}