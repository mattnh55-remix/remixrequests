"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Track = {
  title: string;
  artist: string;
  album: string;
  albumArt: string | null;
  spotifyId: string | null;
  previewUrl: string | null;
  durationMs: number | null;
};

type ImportSummary = {
  added: number;
  updated: number;
  skipped: number;
  total: number;
};

type SpotifyStatus = {
  connected: boolean;
  spotifyUserId?: string | null;
  spotifyDisplayName?: string | null;
  expiresAt?: string | null;
  scope?: string | null;
  updatedAt?: string | null;
};

function formatDuration(ms: number | null | undefined) {
  if (!ms || Number.isNaN(ms)) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function AdminSpotifyImportPageInner() {
  const searchParams = useSearchParams();

  const [locationSlug, setLocationSlug] = useState("remixrequests");
  const [spotifyStatus, setSpotifyStatus] = useState<SpotifyStatus>({ connected: false });
  const [statusLoading, setStatusLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Track[]>([]);

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [featuredIds, setFeaturedIds] = useState<Record<string, boolean>>({});

  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const [resultsSearch, setResultsSearch] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("locationSlug");
    if (fromQuery) setLocationSlug(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    const spotify = searchParams.get("spotify");
    const spotifyError = searchParams.get("spotify_error");

    if (spotify === "connected") {
      setMessage("Spotify connected successfully.");
      setError("");
    }

    if (spotifyError) {
      setError(`Spotify connect failed: ${spotifyError}`);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadStatus() {
      setStatusLoading(true);

      try {
        const res = await fetch(
          `/api/admin/spotify/status?locationSlug=${encodeURIComponent(locationSlug)}`,
          { cache: "no-store" }
        );

        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data?.error || "Failed to load Spotify status.");
        }

        setSpotifyStatus(data.spotify || { connected: false });
      } catch (err: any) {
        setSpotifyStatus({ connected: false });
        setError(err?.message || "Failed to load Spotify status.");
      } finally {
        setStatusLoading(false);
      }
    }

    loadStatus();
  }, [locationSlug]);

  function resetMessages() {
    setMessage("");
    setError("");
    setSummary(null);
  }

  function connectSpotify() {
    window.location.href = `/api/admin/spotify/login?locationSlug=${encodeURIComponent(locationSlug)}`;
  }

  async function searchSpotify(customQuery?: string) {
    const finalQuery = String(customQuery ?? query).trim();

    resetMessages();

    if (!finalQuery) {
      setError("Type a song title or artist first.");
      return;
    }

    setSearching(true);

    try {
      const res = await fetch("/api/admin/spotify/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery, locationSlug }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Spotify search failed.");
      }

      const incomingTracks: Track[] = Array.isArray(data.tracks) ? data.tracks : [];
      setResults(incomingTracks);
      setQuery(finalQuery);

      setMessage(
        incomingTracks.length
          ? `Found ${incomingTracks.length} track${incomingTracks.length === 1 ? "" : "s"}. Tap cards to build your import batch.`
          : "No songs found for that search."
      );
    } catch (err: any) {
      setError(err?.message || "Spotify search failed.");
    } finally {
      setSearching(false);
    }
  }

  function toggleSelected(spotifyId: string | null) {
    if (!spotifyId) return;
    setSelectedIds((prev) => ({ ...prev, [spotifyId]: !prev[spotifyId] }));
  }

  function toggleFeatured(spotifyId: string | null) {
    if (!spotifyId) return;
    setFeaturedIds((prev) => ({ ...prev, [spotifyId]: !prev[spotifyId] }));
  }

  function clearSelected() {
    setSelectedIds({});
    setFeaturedIds({});
  }

  function selectTopVisible(count = 8) {
    const next = { ...selectedIds };
    let added = 0;

    for (const track of filteredResults) {
      if (!track.spotifyId) continue;
      if (!next[track.spotifyId]) {
        next[track.spotifyId] = true;
        added += 1;
      }
      if (added >= count) break;
    }

    setSelectedIds(next);
  }

  const selectedTracks = useMemo(() => {
    return results.filter((track) => track.spotifyId && selectedIds[track.spotifyId]);
  }, [results, selectedIds]);

  const selectedCount = selectedTracks.length;

  const featuredCount = useMemo(() => {
    return selectedTracks.filter((track) => track.spotifyId && featuredIds[track.spotifyId]).length;
  }, [selectedTracks, featuredIds]);

  const filteredResults = useMemo(() => {
    const q = resultsSearch.trim().toLowerCase();

    let base = results;

    if (selectedOnly) {
      base = base.filter((track) => track.spotifyId && selectedIds[track.spotifyId]);
    }

    if (!q) return base;

    return base.filter((track) => {
      const blob = `${track.title} ${track.artist} ${track.album}`.toLowerCase();
      return blob.includes(q);
    });
  }, [results, resultsSearch, selectedOnly, selectedIds]);

  async function importSelected() {
    resetMessages();

    const payloadTracks = results
      .filter((track) => track.spotifyId && selectedIds[track.spotifyId])
      .map((track) => ({
        ...track,
        featured: Boolean(track.spotifyId && featuredIds[track.spotifyId]),
      }));

    if (!payloadTracks.length) {
      setError("Pick at least one song before importing.");
      return;
    }

    setImporting(true);

    try {
      const res = await fetch("/api/admin/spotify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: payloadTracks, locationSlug }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Import failed.");
      }

      setSummary(data.summary || null);
      setMessage("Songs imported successfully.");
    } catch (err: any) {
      setError(err?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const quickSearches = [
    "Dua Lipa",
    "The Weeknd",
    "Taylor Swift",
    "Bad Bunny",
    "dance hits",
    "2000s pop",
    "party songs",
    "clean skate music",
  ];

  return (
    <div className="rrAdminSpotifyPage">
      <div className="rrGlow rrGlowA" />
      <div className="rrGlow rrGlowB" />
      <div className="rrGlow rrGlowC" />

      <div className="rrAdminSpotifyShell">
        <div className="rrAdminHero">
          <div className="rrAdminHeroTop">
            <div className="rrAdminHeroBadge">Spotify Song Finder</div>
            <div className="rrStatusPill">{locationSlug}</div>
          </div>

          <div className="rrAdminHeroTitle">Build tonight’s vibe</div>
          <div className="rrAdminHeroText">
            Search Spotify by song or artist, tap the album art cards your staff likes,
            then import the picks into your song list. Easy-add now, cleanup later in the
            main song manager.
          </div>

          <div className="rrFunRow">
            <div className="rrFunBubble">🎵 Search</div>
            <div className="rrFunBubble">💿 Tap cards</div>
            <div className="rrFunBubble">🔥 Feature favorites</div>
            <div className="rrFunBubble">✅ Import selected</div>
          </div>
        </div>

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Spotify connection</div>
              <div className="rrPanelSub">
                Staff can search using the shared Remix Spotify connection.
              </div>
            </div>
          </div>

          <div className="rrPanelBody rrStack12">
            <input
              className="rrInput"
              value={locationSlug}
              onChange={(e) => setLocationSlug(e.target.value)}
              placeholder="Location slug"
            />

            <div className="rrConnectionCard">
              <div>
                <div className="rrConnectionTitle">
                  {statusLoading
                    ? "Checking Spotify connection…"
                    : spotifyStatus.connected
                    ? `Connected as ${spotifyStatus.spotifyDisplayName || spotifyStatus.spotifyUserId || "Spotify user"}`
                    : "Spotify not connected yet"}
                </div>

                <div className="rrConnectionSub">
                  {spotifyStatus.connected
                    ? `Scopes: ${spotifyStatus.scope || "Spotify connected"}`
                    : "Click connect, log in with the Remix Spotify account, then come back and search songs."}
                </div>
              </div>

              <button className="rrBtn rrBtnPrimary" onClick={connectSpotify}>
                {spotifyStatus.connected ? "Reconnect Spotify" : "Connect Spotify"}
              </button>
            </div>
          </div>
        </div>

        <div className="rrPanel rrSearchPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Song search</div>
              <div className="rrPanelSub">
                Search by song title, artist, album, or a general vibe.
              </div>
            </div>

            <div className="rrStatusPill rrStatusPillHot">
              {selectedCount} selected
            </div>
          </div>

          <div className="rrPanelBody">
            <div className="rrSearchBar">
              <input
                className="rrInput rrSearchInput"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Spotify by song or artist…"
                disabled={!spotifyStatus.connected}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchSpotify();
                  }
                }}
              />

              <button
                className="rrBtn rrBtnPrimary rrBtnBig"
                onClick={() => searchSpotify()}
                disabled={searching || !query.trim() || !spotifyStatus.connected}
              >
                {searching ? "Searching…" : "Search Spotify"}
              </button>
            </div>

            <div className="rrQuickChipRow">
              {quickSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rrQuickChip"
                  onClick={() => {
                    setQuery(item);
                    searchSpotify(item);
                  }}
                  disabled={!spotifyStatus.connected || searching}
                >
                  {item}
                </button>
              ))}
            </div>

            {message ? <div className="rrNotice rrNoticeSuccess">{message}</div> : null}
            {error ? <div className="rrNotice rrNoticeError">{error}</div> : null}

            {summary ? (
              <div className="rrSummaryGrid">
                <div className="rrMiniStat">
                  <div className="rrMiniStatLabel">Added</div>
                  <div className="rrMiniStatValue">{summary.added}</div>
                </div>
                <div className="rrMiniStat">
                  <div className="rrMiniStatLabel">Updated</div>
                  <div className="rrMiniStatValue">{summary.updated}</div>
                </div>
                <div className="rrMiniStat">
                  <div className="rrMiniStatLabel">Skipped</div>
                  <div className="rrMiniStatValue">{summary.skipped}</div>
                </div>
                <div className="rrMiniStat">
                  <div className="rrMiniStatLabel">Total</div>
                  <div className="rrMiniStatValue">{summary.total}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Tap-to-add results</div>
              <div className="rrPanelSub">
                Album art first. Fast adds. Big buttons. Staff-friendly.
              </div>
            </div>

            <div className="rrQuickActions">
              <button className="rrBtn" onClick={() => selectTopVisible(8)}>
                Add top 8
              </button>
              <button className="rrBtn" onClick={() => setSelectedOnly((v) => !v)}>
                {selectedOnly ? "Show all" : "Selected only"}
              </button>
              <button className="rrBtn" onClick={clearSelected}>
                Clear picks
              </button>
              <button
                className="rrBtn rrBtnPrimary"
                onClick={importSelected}
                disabled={importing || !selectedCount}
              >
                {importing ? "Importing…" : `Import ${selectedCount} song${selectedCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>

          <div className="rrPanelBody">
            <div className="rrResultsToolbar">
              <input
                className="rrInput"
                value={resultsSearch}
                onChange={(e) => setResultsSearch(e.target.value)}
                placeholder="Filter current results…"
              />

              <div className="rrSelectionStats">
                <div className="rrSelectionStat">
                  <span className="rrSelectionLabel">Selected</span>
                  <strong>{selectedCount}</strong>
                </div>
                <div className="rrSelectionStat">
                  <span className="rrSelectionLabel">Featured</span>
                  <strong>{featuredCount}</strong>
                </div>
              </div>
            </div>

            <div className="rrTrackGrid">
              {filteredResults.map((track) => {
                const id = track.spotifyId || `${track.title}-${track.artist}`;
                const isSelected = !!(track.spotifyId && selectedIds[track.spotifyId]);
                const isFeatured = !!(track.spotifyId && featuredIds[track.spotifyId]);

                return (
                  <div
                    key={id}
                    className={[
                      "rrTrackCard",
                      isSelected ? "rrTrackCardSelected" : "",
                      isFeatured ? "rrTrackCardFeatured" : "",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      className="rrTrackSelectLayer"
                      onClick={() => toggleSelected(track.spotifyId)}
                      aria-label={`Select ${track.title} by ${track.artist}`}
                    />

                    <div className="rrTrackArtWrap">
                      {track.albumArt ? (
                        <img src={track.albumArt} alt={track.album} className="rrTrackArt" />
                      ) : (
                        <div className="rrTrackArt rrTrackArtPlaceholder">🎵</div>
                      )}

                      <div className="rrTrackCornerBadges">
                        {isSelected ? <span className="rrChip rrChipSelected">Added</span> : null}
                        {isFeatured ? <span className="rrChip rrChipFeatured">Featured</span> : null}
                      </div>

                      <div className="rrTrackTapHint">
                        {isSelected ? "✓ In batch" : "Tap to add"}
                      </div>
                    </div>

                    <div className="rrTrackBody">
                      <div className="rrTrackTitle">{track.title}</div>
                      <div className="rrTrackMeta">{track.artist}</div>
                      <div className="rrTrackMeta rrTrackMetaSoft">{track.album}</div>

                      <div className="rrTrackFoot">
                        <div className="rrTrackDuration">{formatDuration(track.durationMs)}</div>

                        <div className="rrTrackActions">
                          <button
                            type="button"
                            className={`rrActionBtn ${isSelected ? "rrActionBtnOn" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelected(track.spotifyId);
                            }}
                          >
                            {isSelected ? "✓ Added" : "+ Add"}
                          </button>

                          <button
                            type="button"
                            className={`rrActionBtn rrActionBtnFeature ${isFeatured ? "rrActionBtnFeatureOn" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFeatured(track.spotifyId);
                            }}
                          >
                            🔥 Feature
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!filteredResults.length ? (
              <div className="rrEmpty">
                Search Spotify above to start building your import batch.
              </div>
            ) : null}
          </div>
        </div>

        {selectedTracks.length ? (
          <div className="rrSelectedDock">
            <div className="rrSelectedDockInner">
              <div className="rrSelectedDockMeta">
                <div className="rrSelectedDockTitle">Import batch ready</div>
                <div className="rrSelectedDockSub">
                  {selectedCount} selected • {featuredCount} featured
                </div>
              </div>

              <div className="rrSelectedThumbRow">
                {selectedTracks.slice(0, 8).map((track) => {
                  const id = track.spotifyId || `${track.title}-${track.artist}`;
                  return (
                    <div key={id} className="rrSelectedThumb">
                      {track.albumArt ? (
                        <img src={track.albumArt} alt={track.album} className="rrSelectedThumbImg" />
                      ) : (
                        <div className="rrSelectedThumbImg rrTrackArtPlaceholder">🎵</div>
                      )}
                    </div>
                  );
                })}
                {selectedCount > 8 ? (
                  <div className="rrSelectedMore">+{selectedCount - 8}</div>
                ) : null}
              </div>

              <div className="rrSelectedDockActions">
                <button className="rrBtn" onClick={clearSelected}>
                  Clear
                </button>
                <button
                  className="rrBtn rrBtnPrimary"
                  onClick={importSelected}
                  disabled={importing || !selectedCount}
                >
                  {importing ? "Importing…" : `Import ${selectedCount}`}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .rrAdminSpotifyPage {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at 12% 12%, rgba(255, 90, 154, 0.16), transparent 24%),
            radial-gradient(circle at 82% 8%, rgba(77, 143, 228, 0.18), transparent 24%),
            radial-gradient(circle at 74% 72%, rgba(255, 160, 58, 0.14), transparent 22%),
            linear-gradient(180deg, #070811 0%, #0b1020 48%, #080b14 100%);
          color: #f5f7ff;
          padding: 20px 20px 110px;
        }

        .rrGlow {
          position: absolute;
          border-radius: 999px;
          filter: blur(60px);
          pointer-events: none;
          opacity: 0.45;
        }

        .rrGlowA {
          width: 320px;
          height: 320px;
          left: -60px;
          top: -80px;
          background: rgba(255, 57, 151, 0.22);
        }

        .rrGlowB {
          width: 360px;
          height: 360px;
          right: -80px;
          top: 30px;
          background: rgba(71, 145, 255, 0.18);
        }

        .rrGlowC {
          width: 320px;
          height: 320px;
          right: 10%;
          bottom: 40px;
          background: rgba(255, 153, 61, 0.14);
        }

        .rrAdminSpotifyShell {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 18px;
        }

        .rrStack12 {
          display: grid;
          gap: 12px;
        }

        .rrAdminHero {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(133, 158, 255, 0.18);
          background:
            radial-gradient(circle at 18% 18%, rgba(255, 78, 154, 0.22), transparent 22%),
            radial-gradient(circle at 84% 20%, rgba(83, 165, 255, 0.22), transparent 24%),
            linear-gradient(135deg, rgba(20, 23, 46, 0.96) 0%, rgba(12, 18, 37, 0.98) 54%, rgba(22, 14, 37, 0.98) 100%);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
          padding: 24px;
        }

        .rrAdminHeroTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .rrAdminHeroBadge,
        .rrStatusPill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          border-radius: 999px;
          padding: 0 12px;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #eef3ff;
          border: 1px solid rgba(138, 171, 255, 0.28);
          background: linear-gradient(180deg, rgba(48, 58, 95, 0.75), rgba(25, 32, 56, 0.92));
          backdrop-filter: blur(8px);
        }

        .rrStatusPillHot {
          background: linear-gradient(180deg, rgba(255, 113, 71, 0.95), rgba(210, 70, 31, 0.96));
          border-color: rgba(255, 177, 153, 0.35);
          color: #fff;
        }

        .rrAdminHeroTitle {
          margin-top: 14px;
          font-size: 42px;
          font-weight: 1000;
          line-height: 0.95;
          letter-spacing: -0.05em;
        }

        .rrAdminHeroText {
          margin-top: 12px;
          max-width: 820px;
          color: #c5d0e7;
          font-size: 15px;
          line-height: 1.5;
        }

        .rrFunRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }

        .rrFunBubble {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0 14px;
          font-size: 13px;
          font-weight: 900;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.04));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .rrPanel {
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(119, 145, 207, 0.16);
          background: linear-gradient(180deg, rgba(15, 21, 37, 0.95) 0%, rgba(9, 13, 24, 0.985) 100%);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
        }

        .rrSearchPanel {
          border-color: rgba(255, 111, 173, 0.16);
          background:
            radial-gradient(circle at 8% 14%, rgba(255, 74, 149, 0.12), transparent 22%),
            linear-gradient(180deg, rgba(19, 21, 41, 0.96) 0%, rgba(10, 13, 24, 0.99) 100%);
        }

        .rrPanelHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          padding: 18px 18px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background:
            linear-gradient(180deg, rgba(27, 36, 59, 0.6), rgba(13, 18, 33, 0.08)),
            linear-gradient(90deg, rgba(104, 126, 255, 0.06), rgba(255, 77, 148, 0.05), rgba(0, 0, 0, 0));
        }

        .rrPanelTitle {
          font-size: 13px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .rrPanelSub {
          margin-top: 4px;
          color: #b8c4dd;
          font-size: 12px;
          line-height: 1.4;
        }

        .rrPanelBody {
          padding: 18px;
        }

        .rrConnectionCard {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(125, 147, 194, 0.16);
          background: linear-gradient(180deg, rgba(19, 27, 43, 0.98), rgba(10, 16, 29, 0.98));
        }

        .rrConnectionTitle {
          font-size: 16px;
          font-weight: 900;
        }

        .rrConnectionSub {
          margin-top: 6px;
          color: #b7c2d8;
          font-size: 12px;
          line-height: 1.4;
        }

        .rrSearchBar {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
        }

        .rrResultsToolbar {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
          margin-bottom: 14px;
        }

        .rrInput {
          width: 100%;
          min-height: 50px;
          border-radius: 14px;
          border: 1px solid rgba(129, 151, 197, 0.22);
          background: linear-gradient(180deg, rgba(16, 24, 39, 0.96), rgba(10, 15, 27, 0.99));
          color: #f5f7ff;
          padding: 0 14px;
          outline: none;
          font: inherit;
        }

        .rrSearchInput {
          font-size: 16px;
        }

        .rrInput::placeholder {
          color: #7f8ca7;
        }

        .rrBtn {
          min-height: 48px;
          border: 1px solid rgba(136, 159, 201, 0.18);
          border-radius: 14px;
          padding: 0 16px;
          color: #edf4ff;
          background: linear-gradient(180deg, rgba(52, 63, 88, 0.94), rgba(26, 36, 54, 0.98));
          cursor: pointer;
          font: inherit;
          font-weight: 900;
          transition: transform 120ms ease, opacity 120ms ease;
        }

        .rrBtn:hover {
          transform: translateY(-1px);
        }

        .rrBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .rrBtnPrimary {
          background: linear-gradient(180deg, rgba(255, 77, 150, 0.98), rgba(92, 87, 255, 0.98));
          border-color: rgba(201, 153, 255, 0.32);
          color: white;
          box-shadow: 0 12px 26px rgba(66, 39, 133, 0.34);
        }

        .rrBtnBig {
          min-width: 180px;
        }

        .rrQuickChipRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .rrQuickChip {
          min-height: 34px;
          border-radius: 999px;
          padding: 0 12px;
          border: 1px solid rgba(150, 168, 210, 0.18);
          background: linear-gradient(180deg, rgba(37, 45, 67, 0.92), rgba(20, 28, 44, 0.98));
          color: #edf3ff;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .rrNotice {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.4;
        }

        .rrNoticeSuccess {
          border: 1px solid rgba(93, 194, 145, 0.26);
          background: linear-gradient(180deg, rgba(19, 53, 36, 0.86), rgba(10, 25, 19, 0.96));
          color: #def8e7;
        }

        .rrNoticeError {
          border: 1px solid rgba(230, 108, 108, 0.24);
          background: linear-gradient(180deg, rgba(57, 20, 20, 0.86), rgba(28, 11, 11, 0.96));
          color: #ffdede;
        }

        .rrSummaryGrid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .rrMiniStat {
          border-radius: 14px;
          padding: 12px;
          border: 1px solid rgba(112, 135, 184, 0.16);
          background: linear-gradient(180deg, rgba(18, 27, 43, 0.96), rgba(10, 16, 27, 0.98));
        }

        .rrMiniStatLabel {
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8694ae;
        }

        .rrMiniStatValue {
          margin-top: 6px;
          font-size: 30px;
          font-weight: 1000;
          line-height: 1;
        }

        .rrQuickActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .rrSelectionStats {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .rrSelectionStat {
          min-height: 50px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 14px;
          padding: 0 12px;
          border: 1px solid rgba(130, 153, 196, 0.16);
          background: linear-gradient(180deg, rgba(19, 27, 43, 0.96), rgba(10, 16, 27, 0.98));
          color: #e9f1ff;
        }

        .rrSelectionLabel {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #99a7c2;
        }

        .rrTrackGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }

        .rrTrackCard {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(127, 155, 214, 0.16);
          background:
            radial-gradient(circle at 14% 12%, rgba(80, 133, 255, 0.14), transparent 34%),
            linear-gradient(180deg, rgba(23, 34, 53, 0.985) 0%, rgba(13, 20, 33, 0.99) 56%, rgba(8, 14, 24, 0.995) 100%);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
          transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
        }

        .rrTrackCard:hover {
          transform: translateY(-2px);
        }

        .rrTrackCardSelected {
          border-color: rgba(255, 115, 184, 0.48);
          box-shadow: 0 20px 38px rgba(122, 42, 116, 0.24);
        }

        .rrTrackCardFeatured {
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 132, 71, 0.18), transparent 30%),
            linear-gradient(135deg, rgba(42, 27, 57, 0.99) 0%, rgba(20, 21, 39, 0.995) 68%, rgba(12, 16, 27, 0.995) 100%);
        }

        .rrTrackSelectLayer {
          position: absolute;
          inset: 0;
          z-index: 1;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .rrTrackArtWrap {
          position: relative;
          aspect-ratio: 1 / 1;
        }

        .rrTrackArt {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: #050814;
        }

        .rrTrackArtPlaceholder {
          display: grid;
          place-items: center;
          font-size: 46px;
        }

        .rrTrackCornerBadges {
          position: absolute;
          top: 10px;
          left: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          z-index: 2;
        }

        .rrChip {
          display: inline-flex;
          align-items: center;
          min-height: 22px;
          padding: 0 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          backdrop-filter: blur(8px);
        }

        .rrChipSelected {
          color: #fff3fb;
          border: 1px solid rgba(255, 157, 210, 0.3);
          background: rgba(143, 37, 98, 0.82);
        }

        .rrChipFeatured {
          color: #fff3ea;
          border: 1px solid rgba(255, 170, 124, 0.28);
          background: rgba(121, 53, 21, 0.82);
        }

        .rrTrackTapHint {
          position: absolute;
          right: 10px;
          bottom: 10px;
          z-index: 2;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 11px;
          font-weight: 1000;
          color: #fff;
          background: rgba(10, 13, 24, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
        }

        .rrTrackBody {
          position: relative;
          z-index: 2;
          display: grid;
          gap: 8px;
          padding: 12px;
        }

        .rrTrackTitle {
          font-size: 15px;
          font-weight: 900;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .rrTrackMeta {
          font-size: 12px;
          color: #e3ebfc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rrTrackMetaSoft {
          color: #95a7c7;
        }

        .rrTrackFoot {
          display: grid;
          gap: 10px;
          margin-top: 4px;
        }

        .rrTrackDuration {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #a9c1f3;
        }

        .rrTrackActions {
          display: flex;
          gap: 8px;
        }

        .rrActionBtn {
          position: relative;
          z-index: 3;
          flex: 1;
          min-height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(136, 159, 201, 0.18);
          background: linear-gradient(180deg, rgba(48, 60, 83, 0.96), rgba(24, 35, 52, 0.98));
          color: #eef4ff;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .rrActionBtnOn {
          background: linear-gradient(180deg, rgba(255, 84, 157, 0.98), rgba(132, 83, 255, 0.98));
          border-color: rgba(223, 164, 255, 0.34);
        }

        .rrActionBtnFeature {
          background: linear-gradient(180deg, rgba(88, 57, 37, 0.96), rgba(48, 30, 18, 0.98));
          border-color: rgba(196, 128, 83, 0.2);
        }

        .rrActionBtnFeatureOn {
          background: linear-gradient(180deg, rgba(255, 132, 71, 0.98), rgba(213, 88, 34, 0.99));
          border-color: rgba(255, 180, 134, 0.34);
          color: #fff;
        }

        .rrEmpty {
          border-radius: 14px;
          border: 1px dashed rgba(125, 156, 206, 0.24);
          padding: 24px;
          text-align: center;
          color: #b8c4dd;
          background: rgba(255, 255, 255, 0.02);
        }

        .rrSelectedDock {
          position: fixed;
          left: 20px;
          right: 20px;
          bottom: 16px;
          z-index: 30;
        }

        .rrSelectedDockInner {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 14px;
          border-radius: 22px;
          border: 1px solid rgba(255, 151, 204, 0.18);
          background:
            linear-gradient(135deg, rgba(25, 20, 43, 0.96) 0%, rgba(13, 18, 32, 0.98) 100%);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.38);
          padding: 14px 16px;
          backdrop-filter: blur(12px);
        }

        .rrSelectedDockTitle {
          font-size: 15px;
          font-weight: 1000;
        }

        .rrSelectedDockSub {
          margin-top: 4px;
          font-size: 12px;
          color: #b7c2d8;
        }

        .rrSelectedThumbRow {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          overflow: hidden;
        }

        .rrSelectedThumb {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #0b1020;
        }

        .rrSelectedThumbImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .rrSelectedMore {
          min-width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 1000;
          color: #fff;
          background: linear-gradient(180deg, rgba(255, 84, 157, 0.98), rgba(132, 83, 255, 0.98));
        }

        .rrSelectedDockActions {
          display: flex;
          gap: 8px;
        }

        @media (max-width: 980px) {
          .rrSearchBar,
          .rrResultsToolbar,
          .rrConnectionCard,
          .rrSelectedDockInner {
            grid-template-columns: 1fr;
            display: grid;
          }

          .rrSummaryGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .rrSelectedThumbRow {
            order: 3;
          }
        }

        @media (max-width: 640px) {
          .rrAdminSpotifyPage {
            padding: 12px 12px 120px;
          }

          .rrAdminHero {
            padding: 18px;
          }

          .rrAdminHeroTitle {
            font-size: 30px;
          }

          .rrTrackGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .rrTrackActions {
            flex-direction: column;
          }

          .rrQuickActions,
          .rrSelectionStats,
          .rrSelectedDockActions {
            width: 100%;
          }

          .rrSelectedDock {
            left: 12px;
            right: 12px;
            bottom: 12px;
          }
        }
      `}</style>
    </div>
  );
}

export default function AdminSpotifyImportPage() {
  return (
    <Suspense
      fallback={
        <div className="rrAdminSpotifyPage">
          <div className="rrAdminSpotifyShell">
            <div className="rrPanel">
              <div className="rrPanelBody">Loading Spotify search…</div>
            </div>
          </div>
        </div>
      }
    >
      <AdminSpotifyImportPageInner />
    </Suspense>
  );
}