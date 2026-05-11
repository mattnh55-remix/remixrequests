"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type DuplicateStatus = {
  exactBySpotifyId: Record<string, boolean>;
  exactByTitleArtist: Record<string, boolean>;
  possibleByFuzzy: Record<string, { songId: string; title: string; artist: string }>;
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
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [results, setResults] = useState<Track[]>([]);

  const [duplicates, setDuplicates] = useState<DuplicateStatus>({
    exactBySpotifyId: {},
    exactByTitleArtist: {},
    possibleByFuzzy: {},
  });

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [featuredIds, setFeaturedIds] = useState<Record<string, boolean>>({});

  const [importing, setImporting] = useState(false);
  const [updatingArtIds, setUpdatingArtIds] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const [resultsSearch, setResultsSearch] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [hideExactDuplicates, setHideExactDuplicates] = useState(false);

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

  async function detectDuplicates(incomingTracks: Track[], currentLocationSlug: string) {
    if (!incomingTracks.length) {
      setDuplicates({
        exactBySpotifyId: {},
        exactByTitleArtist: {},
        possibleByFuzzy: {},
      });
      return;
    }

    setCheckingDuplicates(true);

    try {
      const res = await fetch("/api/admin/spotify/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: incomingTracks, locationSlug: currentLocationSlug }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Duplicate check failed.");
      }

      setDuplicates({
        exactBySpotifyId: data.exactBySpotifyId || {},
        exactByTitleArtist: data.exactByTitleArtist || {},
        possibleByFuzzy: data.possibleByFuzzy || {},
      });
    } catch (err: any) {
      setDuplicates({
        exactBySpotifyId: {},
        exactByTitleArtist: {},
        possibleByFuzzy: {},
      });
      setError(err?.message || "Duplicate check failed.");
    } finally {
      setCheckingDuplicates(false);
    }
  }

  async function searchSpotify(customQuery?: string) {
    const finalQuery = String(customQuery ?? query).trim();

    resetMessages();
    setDuplicates({
      exactBySpotifyId: {},
      exactByTitleArtist: {},
      possibleByFuzzy: {},
    });
    setSelectedIds({});
    setFeaturedIds({});

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

      await detectDuplicates(incomingTracks, locationSlug);

      setMessage(
        incomingTracks.length
          ? `Found ${incomingTracks.length} tracks. Exact duplicates are blocked. Possible duplicates are flagged.`
          : "No songs found for that search."
      );
    } catch (err: any) {
      setError(err?.message || "Spotify search failed.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function isExactDuplicate(track: Track) {
    if (!track.spotifyId) return false;
    return Boolean(
      duplicates.exactBySpotifyId[track.spotifyId] ||
      duplicates.exactByTitleArtist[track.spotifyId]
    );
  }

  function isPossibleDuplicate(track: Track) {
    if (!track.spotifyId) return false;
    return Boolean(duplicates.possibleByFuzzy[track.spotifyId]);
  }

  function toggleSelected(track: Track) {
    if (!track.spotifyId) return;
    if (isExactDuplicate(track)) return;
    setSelectedIds((prev) => ({ ...prev, [track.spotifyId!]: !prev[track.spotifyId!] }));
  }

  function toggleFeatured(track: Track) {
    if (!track.spotifyId) return;
    if (isExactDuplicate(track)) return;
    setFeaturedIds((prev) => ({ ...prev, [track.spotifyId!]: !prev[track.spotifyId!] }));
  }

  function clearSelected() {
    setSelectedIds({});
    setFeaturedIds({});
  }

  function selectTopVisible(count = 6) {
    const next = { ...selectedIds };
    let added = 0;

    for (const track of filteredResults) {
      if (!track.spotifyId) continue;
      if (isExactDuplicate(track)) continue;

      if (!next[track.spotifyId]) {
        next[track.spotifyId] = true;
        added += 1;
      }

      if (added >= count) break;
    }

    setSelectedIds(next);
  }

  const selectedTracks = useMemo(() => {
    return results.filter((track) => track.spotifyId && selectedIds[track.spotifyId] && !isExactDuplicate(track));
  }, [results, selectedIds, duplicates]);

  const selectedCount = selectedTracks.length;

  const featuredCount = useMemo(() => {
    return selectedTracks.filter((track) => track.spotifyId && featuredIds[track.spotifyId]).length;
  }, [selectedTracks, featuredIds]);

  const duplicateCounts = useMemo(() => {
    let exact = 0;
    let possible = 0;

    for (const track of results) {
      if (isExactDuplicate(track)) exact += 1;
      else if (isPossibleDuplicate(track)) possible += 1;
    }

    return { exact, possible };
  }, [results, duplicates]);

  const filteredResults = useMemo(() => {
    const q = resultsSearch.trim().toLowerCase();

    let base = results;

    if (hideExactDuplicates) {
      base = base.filter((track) => !isExactDuplicate(track));
    }

    if (selectedOnly) {
      base = base.filter((track) => track.spotifyId && selectedIds[track.spotifyId]);
    }

    if (!q) return base;

    return base.filter((track) => {
      const blob = `${track.title} ${track.artist} ${track.album}`.toLowerCase();
      return blob.includes(q);
    });
  }, [results, resultsSearch, selectedOnly, hideExactDuplicates, selectedIds, duplicates]);

  async function updateAlbumArt(track: Track) {
    resetMessages();

    if (!track.spotifyId) {
      setError("This Spotify result is missing a Spotify ID, so it cannot update album art.");
      return;
    }

    if (!track.albumArt) {
      setError("This Spotify result does not include album art to update.");
      return;
    }

    const artKey = track.spotifyId;
    setUpdatingArtIds((prev) => ({ ...prev, [artKey]: true }));

    try {
      const res = await fetch("/api/admin/spotify/update-album-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationSlug,
          spotifyId: track.spotifyId,
          title: track.title,
          artist: track.artist,
          album: track.album,
          albumArt: track.albumArt,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Album art update failed.");
      }

      setMessage(`Updated album art for ${track.title} — ${track.artist}.`);
    } catch (err: any) {
      setError(err?.message || "Album art update failed.");
    } finally {
      setUpdatingArtIds((prev) => {
        const next = { ...prev };
        delete next[artKey];
        return next;
      });
    }
  }

  async function importSelected() {
    resetMessages();

    const payloadTracks = results
      .filter((track) => track.spotifyId && selectedIds[track.spotifyId] && !isExactDuplicate(track))
      .map((track) => ({
        ...track,
        featured: Boolean(track.spotifyId && featuredIds[track.spotifyId]),
      }));

    if (!payloadTracks.length) {
      setError("Pick at least one non-duplicate song before importing.");
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

      const importedIds = new Set(
        payloadTracks.map((track) => track.spotifyId).filter(Boolean)
      );

      setSummary(data.summary || null);
      setMessage("Songs imported successfully.");

      setResults((prev) =>
        prev.filter((track) => !track.spotifyId || !importedIds.has(track.spotifyId))
      );

      setSelectedIds({});
      setFeaturedIds({});
    } catch (err: any) {
      setError(err?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const quickSearches = [
    "Taylor Swift",
    "Dua Lipa",
    "The Weeknd",
    "clean pop",
    "party songs",
    "skate music",
  ];

  return (
    <div className="rrAdminSpotifyPage">
      <div className="rrGlow rrGlowA" />
      <div className="rrGlow rrGlowB" />

      <div className="rrAdminSpotifyShell">
        <header className="rrAdminHeader">
          <div className="rrAdminHeaderLeft">
            <div className="rrAdminHeaderEyebrow">RemixRequests Admin</div>
            <h1 className="rrAdminHeaderTitle">Spotify Song Import</h1>
            <p className="rrAdminHeaderSub">Search Spotify, flag duplicates, and add songs to the Remix library.</p>
          </div>

          <div className="rrAdminHeaderActions">
            <div className="rrStatusPill">{locationSlug}</div>
            <Link className="rrBtn rrAdminBackBtn" href="/admin/remixrequests">
              ← Back to Admin
            </Link>
          </div>
        </header>

        <div className="rrCompactTop">
          <div className="rrHeroMini">
            <div className="rrHeroMiniTop">
              <div className="rrAdminHeroBadge">Spotify Song Finder</div>
              <div className="rrStatusPill">Fast Import</div>
            </div>
            <div className="rrHeroMiniTitle">Quick Add</div>
            <div className="rrHeroMiniText">
              Search, tap, flag duplicates, import.
            </div>
          </div>

          <div className="rrPanel rrConnectionPanel">
            <div className="rrPanelBody rrConnectionCompact">
              <input
                className="rrInput rrSlugInput"
                value={locationSlug}
                onChange={(e) => setLocationSlug(e.target.value)}
                placeholder="Location slug"
              />

              <div className="rrConnectionMeta">
                <div className="rrConnectionTitle">
                  {statusLoading
                    ? "Checking Spotify…"
                    : spotifyStatus.connected
                    ? `Connected as ${spotifyStatus.spotifyDisplayName || spotifyStatus.spotifyUserId || "Spotify user"}`
                    : "Spotify not connected"}
                </div>
                <div className="rrConnectionSub">
                  {spotifyStatus.connected
                    ? `Scopes: ${spotifyStatus.scope || "Spotify connected"}`
                    : "Connect the Remix account to search."}
                </div>
              </div>

              <button className="rrBtn rrBtnPrimary" onClick={connectSpotify}>
                {spotifyStatus.connected ? "Reconnect" : "Connect"}
              </button>
            </div>
          </div>
        </div>

        <div className="rrPanel rrSearchPanel">
          <div className="rrPanelBody rrPanelBodyTight">
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
                className="rrBtn rrBtnPrimary rrBtnSearch"
                onClick={() => searchSpotify()}
                disabled={searching || !query.trim() || !spotifyStatus.connected}
              >
                {searching ? "Searching…" : "Search"}
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

            <div className="rrTopStats">
              <div className="rrSmallStat">
                <span>Selected</span>
                <strong>{selectedCount}</strong>
              </div>
              <div className="rrSmallStat">
                <span>Exact dupes</span>
                <strong>{duplicateCounts.exact}</strong>
              </div>
              <div className="rrSmallStat">
                <span>Possible</span>
                <strong>{duplicateCounts.possible}</strong>
              </div>
              <div className="rrSmallStat">
                <span>Checking</span>
                <strong>{checkingDuplicates ? "Yes" : "No"}</strong>
              </div>
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
          <div className="rrPanelHead rrPanelHeadTight">
            <div>
              <div className="rrPanelTitle">Results</div>
              <div className="rrPanelSub">Exact duplicates are blocked. Possible duplicates are warnings only.</div>
            </div>

            <div className="rrQuickActions">
              <button className="rrBtn" onClick={() => selectTopVisible(6)}>
                Add top 6
              </button>
              <button className="rrBtn" onClick={() => setSelectedOnly((v) => !v)}>
                {selectedOnly ? "Show all" : "Selected"}
              </button>
              <button className="rrBtn" onClick={() => setHideExactDuplicates((v) => !v)}>
                {hideExactDuplicates ? "Show exact" : "Hide exact"}
              </button>
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

          <div className="rrPanelBody rrPanelBodyTight">
            <div className="rrResultsToolbar">
              <input
                className="rrInput"
                value={resultsSearch}
                onChange={(e) => setResultsSearch(e.target.value)}
                placeholder="Filter current results…"
              />
            </div>

            <div className="rrTrackGrid">
              {filteredResults.map((track) => {
                const id = track.spotifyId || `${track.title}-${track.artist}`;
                const isSelected = !!(track.spotifyId && selectedIds[track.spotifyId]);
                const isFeatured = !!(track.spotifyId && featuredIds[track.spotifyId]);
                const exactDuplicate = isExactDuplicate(track);
                const possibleDuplicate = isPossibleDuplicate(track);
                const possibleMatch = track.spotifyId ? duplicates.possibleByFuzzy[track.spotifyId] : null;
                const isUpdatingArt = !!(track.spotifyId && updatingArtIds[track.spotifyId]);

                return (
                  <div
                    key={id}
                    className={[
                      "rrTrackCard",
                      isSelected ? "rrTrackCardSelected" : "",
                      isFeatured ? "rrTrackCardFeatured" : "",
                      exactDuplicate ? "rrTrackCardExact" : "",
                      possibleDuplicate ? "rrTrackCardPossible" : "",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      className="rrTrackSelectLayer"
                      onClick={() => toggleSelected(track)}
                      aria-label={`Select ${track.title} by ${track.artist}`}
                      disabled={exactDuplicate}
                    />

                    <div className="rrTrackArtWrap">
                      {track.albumArt ? (
                        <img src={track.albumArt} alt={track.album} className="rrTrackArt" />
                      ) : (
                        <div className="rrTrackArt rrTrackArtPlaceholder">🎵</div>
                      )}

                      <div className="rrTrackCornerBadges">
                        {exactDuplicate ? <span className="rrChip rrChipExact">Already in library</span> : null}
                        {!exactDuplicate && possibleDuplicate ? <span className="rrChip rrChipPossible">Possible duplicate</span> : null}
                        {!exactDuplicate && isSelected ? <span className="rrChip rrChipSelected">In batch</span> : null}
                        {!exactDuplicate && isFeatured ? <span className="rrChip rrChipFeatured">Featured</span> : null}
                      </div>

                      <div className="rrTrackTapHint">
                        {exactDuplicate ? "Blocked" : isSelected ? "✓ Selected" : "Tap to add"}
                      </div>
                    </div>

                    <div className="rrTrackBody">
                      <div className="rrTrackTitle">{track.title}</div>
                      <div className="rrTrackMeta">{track.artist}</div>
                      <div className="rrTrackMeta rrTrackMetaSoft">{track.album}</div>

                      {possibleMatch ? (
                        <div className="rrPossibleMatchText">
                          Similar to: {possibleMatch.title} — {possibleMatch.artist}
                        </div>
                      ) : null}

                      <div className="rrTrackFoot">
                        <div className="rrTrackDuration">{formatDuration(track.durationMs)}</div>

                        <div className="rrTrackActions">
                          <button
                            type="button"
                            className={`rrActionBtn ${isSelected ? "rrActionBtnOn" : ""} ${exactDuplicate ? "rrActionBtnDisabled" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelected(track);
                            }}
                            disabled={exactDuplicate}
                          >
                            {exactDuplicate ? "Already imported" : isSelected ? "✓ Added" : "+ Add"}
                          </button>
                          <button
                            type="button"
                            className={`rrActionBtn rrActionBtnFeature ${isFeatured ? "rrActionBtnFeatureOn" : ""} ${exactDuplicate ? "rrActionBtnDisabled" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFeatured(track);
                            }}
                            disabled={exactDuplicate}
                          >
                            {exactDuplicate ? "Locked" : "🔥 Feature"}
                          </button>

                          {exactDuplicate ? (
                            <button
                              type="button"
                              className="rrActionBtn rrActionBtnAlbumArt"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateAlbumArt(track);
                              }}
                              disabled={isUpdatingArt || !track.albumArt}
                              title={track.albumArt ? "Update this existing library song with Spotify album art" : "No Spotify album art available"}
                            >
                              {isUpdatingArt ? "Updating…" : "🖼️ Update album art"}
                            </button>
                          ) : null}
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
                <div className="rrSelectedDockTitle">Batch ready</div>
                <div className="rrSelectedDockSub">
                  {selectedCount} selected • {featuredCount} featured
                </div>
              </div>

              <div className="rrSelectedThumbRow">
                {selectedTracks.slice(0, 6).map((track) => {
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
                {selectedCount > 6 ? (
                  <div className="rrSelectedMore">+{selectedCount - 6}</div>
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
            radial-gradient(circle at 8% 10%, rgba(255, 90, 154, 0.14), transparent 22%),
            radial-gradient(circle at 90% 10%, rgba(77, 143, 228, 0.16), transparent 24%),
            linear-gradient(180deg, #070811 0%, #0b1020 48%, #080b14 100%);
          color: #f5f7ff;
          padding: 10px 10px 82px;
        }

        .rrGlow {
          position: absolute;
          border-radius: 999px;
          filter: blur(60px);
          pointer-events: none;
          opacity: 0.38;
        }

        .rrGlowA {
          width: 240px;
          height: 240px;
          left: -80px;
          top: -60px;
          background: rgba(255, 57, 151, 0.18);
        }

        .rrGlowB {
          width: 260px;
          height: 260px;
          right: -70px;
          top: -30px;
          background: rgba(71, 145, 255, 0.16);
        }

        .rrAdminSpotifyShell {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 10px;
          max-width: 1020px;
        }

        .rrAdminHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          border-radius: 22px;
          border: 1px solid rgba(133, 158, 255, 0.18);
          background:
            radial-gradient(circle at 10% 15%, rgba(255, 78, 154, 0.16), transparent 24%),
            radial-gradient(circle at 88% 12%, rgba(83, 165, 255, 0.15), transparent 26%),
            linear-gradient(135deg, rgba(20, 23, 46, 0.97) 0%, rgba(12, 18, 37, 0.99) 58%, rgba(22, 14, 37, 0.99) 100%);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
          padding: 16px;
        }

        .rrAdminHeaderLeft {
          min-width: 0;
        }

        .rrAdminHeaderEyebrow {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #eef3ff;
          border: 1px solid rgba(138, 171, 255, 0.24);
          background: linear-gradient(180deg, rgba(48, 58, 95, 0.75), rgba(25, 32, 56, 0.92));
        }

        .rrAdminHeaderTitle {
          margin: 10px 0 0;
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 1000;
          line-height: 0.95;
          letter-spacing: -0.055em;
          color: #ffffff;
        }

        .rrAdminHeaderSub {
          margin: 8px 0 0;
          max-width: 620px;
          color: #c5d0e7;
          font-size: 13px;
          line-height: 1.4;
        }

        .rrAdminHeaderActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .rrAdminBackBtn {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .rrCompactTop {
          display: grid;
          grid-template-columns: 270px 1fr;
          gap: 10px;
        }

        .rrHeroMini {
          border-radius: 18px;
          border: 1px solid rgba(133, 158, 255, 0.16);
          background:
            radial-gradient(circle at 18% 18%, rgba(255, 78, 154, 0.16), transparent 22%),
            radial-gradient(circle at 84% 20%, rgba(83, 165, 255, 0.14), transparent 24%),
            linear-gradient(135deg, rgba(20, 23, 46, 0.96) 0%, rgba(12, 18, 37, 0.98) 54%, rgba(22, 14, 37, 0.98) 100%);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
          padding: 14px;
        }

        .rrHeroMiniTop {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .rrAdminHeroBadge,
        .rrStatusPill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #eef3ff;
          border: 1px solid rgba(138, 171, 255, 0.24);
          background: linear-gradient(180deg, rgba(48, 58, 95, 0.75), rgba(25, 32, 56, 0.92));
        }

        .rrHeroMiniTitle {
          margin-top: 10px;
          font-size: 24px;
          font-weight: 1000;
          line-height: 0.95;
          letter-spacing: -0.04em;
        }

        .rrHeroMiniText {
          margin-top: 6px;
          color: #c5d0e7;
          font-size: 12px;
          line-height: 1.35;
        }

        .rrPanel {
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(119, 145, 207, 0.14);
          background: linear-gradient(180deg, rgba(15, 21, 37, 0.95) 0%, rgba(9, 13, 24, 0.985) 100%);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
        }

        .rrConnectionPanel .rrPanelBody {
          padding: 12px;
        }

        .rrConnectionCompact {
          display: grid;
          grid-template-columns: 170px 1fr auto;
          gap: 10px;
          align-items: center;
        }

        .rrSlugInput {
          min-height: 40px;
        }

        .rrConnectionTitle {
          font-size: 14px;
          font-weight: 900;
        }

        .rrConnectionSub {
          margin-top: 4px;
          color: #b7c2d8;
          font-size: 11px;
          line-height: 1.3;
        }

        .rrSearchPanel {
          border-color: rgba(255, 111, 173, 0.14);
          background:
            radial-gradient(circle at 8% 14%, rgba(255, 74, 149, 0.1), transparent 20%),
            linear-gradient(180deg, rgba(19, 21, 41, 0.96) 0%, rgba(10, 13, 24, 0.99) 100%);
        }

        .rrPanelHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 12px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background:
            linear-gradient(180deg, rgba(27, 36, 59, 0.6), rgba(13, 18, 33, 0.08)),
            linear-gradient(90deg, rgba(104, 126, 255, 0.06), rgba(255, 77, 148, 0.05), rgba(0, 0, 0, 0));
        }

        .rrPanelHeadTight {
          padding: 10px 12px 8px;
        }

        .rrPanelTitle {
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .rrPanelSub {
          margin-top: 3px;
          color: #b8c4dd;
          font-size: 11px;
          line-height: 1.3;
        }

        .rrPanelBody {
          padding: 12px;
        }

        .rrPanelBodyTight {
          padding: 10px;
        }

        .rrSearchBar {
          display: grid;
          grid-template-columns: 1fr 128px;
          gap: 10px;
        }

        .rrResultsToolbar {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          align-items: center;
          margin-bottom: 10px;
        }

        .rrInput {
          width: 100%;
          min-height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(129, 151, 197, 0.2);
          background: linear-gradient(180deg, rgba(16, 24, 39, 0.96), rgba(10, 15, 27, 0.99));
          color: #f5f7ff;
          padding: 0 12px;
          outline: none;
          font: inherit;
          font-size: 14px;
        }

        .rrSearchInput {
          font-size: 15px;
        }

        .rrInput::placeholder {
          color: #7f8ca7;
        }

        .rrBtn {
          min-height: 40px;
          border: 1px solid rgba(136, 159, 201, 0.16);
          border-radius: 12px;
          padding: 0 12px;
          color: #edf4ff;
          background: linear-gradient(180deg, rgba(52, 63, 88, 0.94), rgba(26, 36, 54, 0.98));
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          transition: transform 120ms ease, opacity 120ms ease;
          white-space: nowrap;
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
          border-color: rgba(201, 153, 255, 0.28);
          color: white;
          box-shadow: 0 10px 20px rgba(66, 39, 133, 0.28);
        }

        .rrBtnSearch {
          min-width: 0;
        }

        .rrQuickChipRow {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .rrQuickChip {
          min-height: 28px;
          border-radius: 999px;
          padding: 0 10px;
          border: 1px solid rgba(150, 168, 210, 0.16);
          background: linear-gradient(180deg, rgba(37, 45, 67, 0.92), rgba(20, 28, 44, 0.98));
          color: #edf3ff;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .rrTopStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 8px;
        }

        .rrSmallStat {
          min-height: 46px;
          display: grid;
          align-content: center;
          gap: 2px;
          border-radius: 12px;
          padding: 8px 10px;
          border: 1px solid rgba(130, 153, 196, 0.14);
          background: linear-gradient(180deg, rgba(19, 27, 43, 0.96), rgba(10, 16, 27, 0.98));
        }

        .rrSmallStat span {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #99a7c2;
        }

        .rrSmallStat strong {
          font-size: 16px;
        }

        .rrNotice {
          margin-top: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 12px;
          line-height: 1.35;
        }

        .rrNoticeSuccess {
          border: 1px solid rgba(93, 194, 145, 0.24);
          background: linear-gradient(180deg, rgba(19, 53, 36, 0.86), rgba(10, 25, 19, 0.96));
          color: #def8e7;
        }

        .rrNoticeError {
          border: 1px solid rgba(230, 108, 108, 0.22);
          background: linear-gradient(180deg, rgba(57, 20, 20, 0.86), rgba(28, 11, 11, 0.96));
          color: #ffdede;
        }

        .rrSummaryGrid {
          margin-top: 8px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .rrMiniStat {
          border-radius: 12px;
          padding: 10px;
          border: 1px solid rgba(112, 135, 184, 0.14);
          background: linear-gradient(180deg, rgba(18, 27, 43, 0.96), rgba(10, 16, 27, 0.98));
        }

        .rrMiniStatLabel {
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8694ae;
        }

        .rrMiniStatValue {
          margin-top: 4px;
          font-size: 22px;
          font-weight: 1000;
          line-height: 1;
        }

        .rrQuickActions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .rrTrackGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
          gap: 10px;
        }

        .rrTrackCard {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(127, 155, 214, 0.14);
          background:
            radial-gradient(circle at 14% 12%, rgba(80, 133, 255, 0.12), transparent 34%),
            linear-gradient(180deg, rgba(23, 34, 53, 0.985) 0%, rgba(13, 20, 33, 0.99) 56%, rgba(8, 14, 24, 0.995) 100%);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
          transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
        }

        .rrTrackCard:hover {
          transform: translateY(-1px);
        }

        .rrTrackCardSelected {
          border-color: rgba(255, 115, 184, 0.42);
          box-shadow: 0 14px 24px rgba(122, 42, 116, 0.22);
        }

        .rrTrackCardFeatured {
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 132, 71, 0.18), transparent 30%),
            linear-gradient(135deg, rgba(42, 27, 57, 0.99) 0%, rgba(20, 21, 39, 0.995) 68%, rgba(12, 16, 27, 0.995) 100%);
        }

        .rrTrackCardExact {
          border-color: rgba(255, 95, 95, 0.32);
          opacity: 0.86;
        }

        .rrTrackCardPossible {
          border-color: rgba(255, 191, 84, 0.34);
        }

        .rrTrackSelectLayer {
          position: absolute;
          inset: 0;
          z-index: 1;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .rrTrackSelectLayer:disabled {
          cursor: not-allowed;
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
          font-size: 34px;
        }

        .rrTrackCornerBadges {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          z-index: 2;
        }

        .rrChip {
          display: inline-flex;
          align-items: center;
          min-height: 20px;
          padding: 0 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          backdrop-filter: blur(8px);
        }

        .rrChipSelected {
          color: #fff3fb;
          border: 1px solid rgba(255, 157, 210, 0.28);
          background: rgba(143, 37, 98, 0.82);
        }

        .rrChipFeatured {
          color: #fff3ea;
          border: 1px solid rgba(255, 170, 124, 0.26);
          background: rgba(121, 53, 21, 0.82);
        }

        .rrChipExact {
          color: #ffe7e7;
          border: 1px solid rgba(255, 150, 150, 0.28);
          background: rgba(110, 23, 31, 0.86);
        }

        .rrChipPossible {
          color: #fff5dd;
          border: 1px solid rgba(255, 202, 109, 0.28);
          background: rgba(107, 71, 14, 0.86);
        }

        .rrTrackTapHint {
          position: absolute;
          right: 8px;
          bottom: 8px;
          z-index: 2;
          min-height: 24px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0 8px;
          font-size: 10px;
          font-weight: 1000;
          color: #fff;
          background: rgba(10, 13, 24, 0.74);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
        }

        .rrTrackBody {
          position: relative;
          z-index: 2;
          display: grid;
          gap: 6px;
          padding: 9px;
        }

        .rrTrackTitle {
          font-size: 13px;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -0.02em;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 30px;
        }

        .rrTrackMeta {
          font-size: 11px;
          color: #e3ebfc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rrTrackMetaSoft {
          color: #95a7c7;
        }

        .rrPossibleMatchText {
          min-height: 30px;
          font-size: 10px;
          line-height: 1.25;
          color: #ffd891;
          background: rgba(255, 191, 84, 0.08);
          border: 1px solid rgba(255, 191, 84, 0.14);
          border-radius: 10px;
          padding: 6px 7px;
        }

        .rrTrackFoot {
          display: grid;
          gap: 8px;
          margin-top: 2px;
        }

        .rrTrackDuration {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #a9c1f3;
        }

        .rrTrackActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .rrActionBtnAlbumArt {
          grid-column: 1 / -1;
          color: #ecfbff;
          background: linear-gradient(180deg, rgba(31, 131, 160, 0.96), rgba(18, 78, 101, 0.98));
          border-color: rgba(117, 220, 250, 0.28);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .rrActionBtnAlbumArt:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          filter: grayscale(0.12);
        }

        .rrActionBtn {
          position: relative;
          z-index: 3;
          min-height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(136, 159, 201, 0.16);
          background: linear-gradient(180deg, rgba(48, 60, 83, 0.96), rgba(24, 35, 52, 0.98));
          color: #eef4ff;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          padding: 0 8px;
        }

        .rrActionBtnOn {
          background: linear-gradient(180deg, rgba(255, 84, 157, 0.98), rgba(132, 83, 255, 0.98));
          border-color: rgba(223, 164, 255, 0.3);
        }

        .rrActionBtnFeature {
          background: linear-gradient(180deg, rgba(88, 57, 37, 0.96), rgba(48, 30, 18, 0.98));
          border-color: rgba(196, 128, 83, 0.18);
        }

        .rrActionBtnFeatureOn {
          background: linear-gradient(180deg, rgba(255, 132, 71, 0.98), rgba(213, 88, 34, 0.99));
          border-color: rgba(255, 180, 134, 0.3);
          color: #fff;
        }

        .rrActionBtnDisabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .rrEmpty {
          border-radius: 12px;
          border: 1px dashed rgba(125, 156, 206, 0.22);
          padding: 18px;
          text-align: center;
          color: #b8c4dd;
          background: rgba(255, 255, 255, 0.02);
          font-size: 12px;
        }

        .rrSelectedDock {
          position: fixed;
          left: 10px;
          right: 10px;
          bottom: 10px;
          z-index: 30;
          max-width: 1020px;
        }

        .rrSelectedDockInner {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          border-radius: 18px;
          border: 1px solid rgba(255, 151, 204, 0.16);
          background: linear-gradient(135deg, rgba(25, 20, 43, 0.96) 0%, rgba(13, 18, 32, 0.98) 100%);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.3);
          padding: 10px 12px;
          backdrop-filter: blur(12px);
        }

        .rrSelectedDockTitle {
          font-size: 13px;
          font-weight: 1000;
        }

        .rrSelectedDockSub {
          margin-top: 2px;
          font-size: 11px;
          color: #b7c2d8;
        }

        .rrSelectedThumbRow {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          overflow: hidden;
        }

        .rrSelectedThumb {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border-radius: 10px;
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
          min-width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 1000;
          color: #fff;
          background: linear-gradient(180deg, rgba(255, 84, 157, 0.98), rgba(132, 83, 255, 0.98));
        }

        .rrSelectedDockActions {
          display: flex;
          gap: 6px;
        }

        @media (max-width: 1020px) {
          .rrCompactTop {
            grid-template-columns: 1fr;
          }

          .rrConnectionCompact {
            grid-template-columns: 1fr;
          }

          .rrTopStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .rrSummaryGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .rrSelectedDockInner {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .rrAdminHeader {
            align-items: stretch;
            flex-direction: column;
          }

          .rrAdminHeaderActions {
            justify-content: flex-start;
          }

          .rrAdminBackBtn {
            width: 100%;
          }

          .rrSearchBar {
            grid-template-columns: 1fr;
          }

          .rrTrackGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .rrQuickActions,
          .rrSelectedDockActions {
            width: 100%;
            flex-wrap: wrap;
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