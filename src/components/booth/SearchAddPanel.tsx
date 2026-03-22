"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Song = {
  id: string;
  title: string;
  artist: string;
};

type Props = {
  location: string;
};

export default function SearchAddPanel({ location }: Props) {
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

  async function addSong(songId: string, mode: "ADD_TO_QUEUE" | "PLAY_NEXT" | "ADD_AFTER_CURRENT") {
    try {
      setSubmittingId(songId);

      const res = await fetch(`/api/booth/add-song/${location}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songId,
          mode,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add song");
      }

      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setError("");
      inputRef.current?.focus();
    } catch {
      setError("Could not add song.");
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
          <div className="boothPanelTitle">Search & Add</div>
          <div className="boothPanelSub">Arrow keys move • Enter adds • Shift+Enter plays next</div>
        </div>
      </div>

      <div className="searchAddPanel">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search songs..."
          className="gunmetalInput searchAddInput"
          autoComplete="off"
        />

        <div className="searchAddHint">
          Enter = Add to Queue • Shift+Enter = Play Next • Alt+Enter = After Current • Esc = Clear
        </div>

        {loading ? <div className="searchAddState">Searching...</div> : null}
        {!loading && error ? <div className="searchAddError">{error}</div> : null}
        {!loading && !error && query.trim().length >= 2 && results.length === 0 ? (
          <div className="searchAddState">No results found.</div>
        ) : null}

        {results.length > 0 ? (
          <div className="searchAddResults" role="listbox" aria-label="Song search results">
            {results.map((song, index) => {
              const isActive = index === activeIndex;
              const isSubmitting = submittingId === song.id;

              return (
                <div
                  key={song.id}
                  className={`searchAddResult ${isActive ? "searchAddResult--active" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <button
                    type="button"
                    className="searchAddMain"
                    onClick={() => void runFastAction(song, "ADD_TO_QUEUE")}
                  >
                    <span className="searchAddMeta">
                      <span className="searchAddTitle">{song.title}</span>
                      <span className="searchAddArtist">{song.artist}</span>
                    </span>
                    {isActive ? <span className="searchAddHotkey">ENTER</span> : null}
                  </button>

                  <div className="searchAddActions">
                    <button
                      type="button"
                      className="gunmetalBtn searchAddMiniBtn"
                      disabled={isSubmitting}
                      onClick={() => void addSong(song.id, "ADD_TO_QUEUE")}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="gunmetalBtn gunmetalBtn--primary searchAddMiniBtn"
                      disabled={isSubmitting}
                      onClick={() => void addSong(song.id, "PLAY_NEXT")}
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      className="gunmetalBtn searchAddMiniBtn"
                      disabled={isSubmitting}
                      onClick={() => void addSong(song.id, "ADD_AFTER_CURRENT")}
                    >
                      After
                    </button>
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