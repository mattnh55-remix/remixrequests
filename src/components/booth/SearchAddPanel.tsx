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

      <div className="searchAddWrap">
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
                  className={`searchAddRow ${isActive ? "searchAddRow--active" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <button
                    type="button"
                    className="searchAddRowMain"
                    onClick={() => void runFastAction(song, "ADD_TO_QUEUE")}
                  >
                    <div className="searchAddCopy">
                      <div className="searchAddTopline">
                        <span className="searchAddIndex">{index + 1}</span>
                        <span className="searchAddTitle">{song.title}</span>
                      </div>
                      <div className="searchAddArtist">{song.artist}</div>
                    </div>
                  </button>

                  <div className="searchAddButtons">
                    {isActive ? <span className="searchAddEnterPill">Enter</span> : null}

                    <button
                      type="button"
                      className="searchBtn searchBtn--neutral"
                      disabled={isSubmitting}
                      onClick={() => void addSong(song.id, "ADD_TO_QUEUE")}
                    >
                      Add
                    </button>

                    <button
                      type="button"
                      className="searchBtn searchBtn--primary"
                      disabled={isSubmitting}
                      onClick={() => void addSong(song.id, "PLAY_NEXT")}
                    >
                      Next
                    </button>

                    <button
                      type="button"
                      className="searchBtn searchBtn--neutral"
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

      <style jsx>{`
        .searchAddWrap {
          display: grid;
          gap: 8px;
        }

.searchAddInput {
  width: 100%;

  /* NEW: make it pop */
  background: linear-gradient(180deg, #1b2a3a 0%, #16202c 100%);
  border: 1px solid rgba(80, 140, 255, 0.35);
border-left: 3px solid rgba(80,140,255,0.6);
padding-left: 12px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.05),
    0 0 0 rgba(80,140,255,0);

  transition: all 0.18s ease;
}

/* hover */
.searchAddInput:hover {
  border-color: rgba(80, 140, 255, 0.55);
}

/* focus = THIS is where it comes alive */
.searchAddInput:focus {
  border-color: rgba(80, 140, 255, 0.9);

  box-shadow:
    0 0 0 2px rgba(80,140,255,0.15),
    0 0 12px rgba(80,140,255,0.25);

  background: linear-gradient(180deg, #1f3347 0%, #182433 100%);
}

        .searchAddHint {
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.2px;
          color: rgba(235, 241, 255, 0.82);
        }

        .searchAddState,
        .searchAddError {
          border-radius: 4px;
          padding: 9px 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .searchAddState {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(235, 241, 255, 0.75);
        }

        .searchAddError {
          border: 1px solid rgba(255, 120, 120, 0.2);
          background: rgba(255, 120, 120, 0.08);
          color: #ffd0d0;
        }

        .searchAddResults {
          display: grid;
          gap: 6px;
        }

        .searchAddRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 8px 10px;
          border-radius: 5px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.03),
            rgba(255, 255, 255, 0.015)
          );
        }

        .searchAddRow--active {
          border-color: rgba(94, 190, 255, 0.34);
          background: linear-gradient(
            90deg,
            rgba(57, 118, 196, 0.18),
            rgba(255, 255, 255, 0.04)
          );
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
        }

        .searchAddRowMain {
          appearance: none;
          border: 0;
          background: transparent;
          padding: 0;
          margin: 0;
          min-width: 0;
          text-align: left;
          cursor: pointer;
          color: inherit;
        }

        .searchAddCopy {
          min-width: 0;
        }

        .searchAddTopline {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .searchAddIndex {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          font-size: 10px;
          font-weight: 1000;
          color: rgba(233, 241, 252, 0.75);
        }

        .searchAddTitle {
          display: block;
          min-width: 0;
          font-size: 15px;
          line-height: 1.15;
          font-weight: 1000;
          color: #fbfdff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .searchAddArtist {
          margin-top: 3px;
          padding-left: 30px;
          font-size: 12px;
          line-height: 1.2;
          color: rgba(223, 233, 248, 0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .searchAddButtons {
          display: inline-flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
          align-items: center;
        }

        .searchAddEnterPill {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid rgba(89, 203, 255, 0.28);
          background: rgba(89, 203, 255, 0.1);
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #aee9ff;
        }

        .searchBtn {
          appearance: none;
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: pointer;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.4px;
          color: #f1f5fb;
        }

        .searchBtn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .searchBtn--neutral {
          background: linear-gradient(180deg, #4a5467 0%, #2d3441 52%, #232935 100%);
        }

        .searchBtn--primary {
          background: linear-gradient(180deg, #3d7ec0 0%, #245694 52%, #1c4479 100%);
        }

        @media (max-width: 900px) {
          .searchAddRow {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .searchAddButtons {
            justify-content: flex-start;
          }
        }
      `}</style>
    </section>
  );
}