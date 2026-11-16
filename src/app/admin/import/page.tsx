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
  reconnectRequired?: boolean;
  error?: string | null;
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
  const embedded = searchParams.get("songView") === "spotify";

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
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("locationSlug");
    if (fromQuery) setLocationSlug(fromQuery);
    const requestedSearch = searchParams.get("q");
    if (requestedSearch) setQuery(requestedSearch);
  }, [searchParams]);

  useEffect(() => {
    const spotify = searchParams.get("spotify");
    const spotifyError = searchParams.get("spotify_error");
    const requestedQuery = searchParams.get("q")?.trim();

    if (requestedQuery) {
      setQuery(requestedQuery);
    }

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
    setReviewOpen(false);
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

  function openImportReview() {
    resetMessages();

    if (!selectedTracks.length) {
      setError("Pick at least one non-duplicate song before adding to the library.");
      return;
    }

    setReviewOpen(true);
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
      setReviewOpen(false);
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
            <p className="rrAdminHeaderSub">
              {embedded
                ? "Grow the Remix Library! Search Spotify, choose the right songs, then spotlight featured picks."
                : "Grow the Remix Library! Search Spotify, choose the right songs, then spotlight featured picks."}
            </p>
          </div>

          <div className="rrAdminHeaderActions">
            <div className={`rrConnectionInline ${spotifyStatus.connected ? "rrConnectionInlineOn" : ""}`}>
              <span className="rrStatusLight" />
              <span>
                {statusLoading
                  ? "Checking Spotify"
                  : spotifyStatus.connected
                  ? `Spotify · ${spotifyStatus.spotifyDisplayName || "Connected"}`
                  : "Spotify needs attention"}
              </span>
              <button className="rrLinkButton" onClick={connectSpotify}>
                {spotifyStatus.connected ? "Reconnect" : "Connect"}
              </button>
            </div>
            <Link
              className="rrBtn rrBtnUtility rrAdminBackBtn"
              href={`/admin/${encodeURIComponent(locationSlug)}?tab=songs`}
            >
              ← Song Library
            </Link>
          </div>
        </header>

        <div className="rrPanel rrSearchPanel">
          <div className="rrPanelBody rrPanelBodyTight">
            <div className="rrSearchHeader">
              <div>
                <div className="rrPanelTitle">Find songs on Spotify</div>
                <div className="rrPanelSub">Search by title, artist, album, or a quick starting point.</div>
              </div>
              <div className="rrSearchStep">01 · Search</div>
            </div>
            <label className="rrFieldLabel" htmlFor="spotify-search">Song or artist</label>
            <div className="rrSearchBar">
              <div className="rrInputGroup">
                <span aria-hidden="true">⌕</span>
                <input
                id="spotify-search"
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
              </div>

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
              <button className="rrBtn rrBtnUtility" onClick={() => selectTopVisible(6)}>
                Select top 6
              </button>
              <button className={`rrBtn rrBtnUtility ${selectedOnly ? "rrBtnUtilityOn" : ""}`} onClick={() => setSelectedOnly((v) => !v)}>
                {selectedOnly ? "Show all" : "Selected"}
              </button>
              <button className={`rrBtn rrBtnUtility ${hideExactDuplicates ? "rrBtnUtilityOn" : ""}`} onClick={() => setHideExactDuplicates((v) => !v)}>
                {hideExactDuplicates ? "Show exact" : "Hide exact"}
              </button>
              <button className="rrBtn rrBtnUtility" onClick={clearSelected}>
                Clear
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
                      exactDuplicate ? "rrTrackCardExact" : "",
                      possibleDuplicate ? "rrTrackCardPossible" : "",
                    ].join(" ")}
                  >
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
                              toggleSelected(track);
                            }}
                            disabled={exactDuplicate}
                          >
                            {exactDuplicate ? "Already imported" : isSelected ? "✓ Added" : "+ Add"}
                          </button>
                          {exactDuplicate ? (
                            <button
                              type="button"
                              className="rrActionBtn rrActionBtnAlbumArt"
                              onClick={(e) => {
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
                <div className="rrSelectedDockTitle">Ready for review</div>
                <div className="rrSelectedDockSub">
                  {selectedCount} selected • choose featured songs next
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
                <button className="rrBtn rrBtnUtility" onClick={clearSelected}>
                  Clear
                </button>
                <button
                  className="rrBtn rrBtnPrimary rrBtnLibrary"
                  onClick={openImportReview}
                  disabled={importing || !selectedCount}
                >
                  {importing ? "Adding…" : `Review ${selectedCount} songs`}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {reviewOpen ? (
          <div className="rrReviewOverlay" role="dialog" aria-modal="true" aria-label="Review songs before adding">
            <div className="rrReviewSheet">
              <div className="rrReviewHeader">
                <div>
                  <div className="rrAdminHeroBadge">Library review</div>
                  <h2>Add {selectedCount} {selectedCount === 1 ? "song" : "songs"} to Remix</h2>
                  <p>Choose any tracks that should appear as featured picks. Everything else will be added to the regular library.</p>
                </div>
                <button className="rrReviewClose" onClick={() => setReviewOpen(false)} aria-label="Close review">×</button>
              </div>

              <div className="rrReviewTools">
                <span>{featuredCount} featured</span>
                <div>
                  <button className="rrBtn rrBtnUtility" onClick={() => setFeaturedIds(Object.fromEntries(selectedTracks.map((track) => [track.spotifyId!, true])))}>Mark all featured</button>
                  <button className="rrBtn rrBtnUtility" onClick={() => setFeaturedIds({})}>Clear featured</button>
                </div>
              </div>

              <div className="rrReviewList">
                {selectedTracks.map((track) => {
                  const isFeatured = Boolean(track.spotifyId && featuredIds[track.spotifyId]);
                  return (
                    <div className="rrReviewTrack" key={track.spotifyId}>
                      {track.albumArt ? <img src={track.albumArt} alt="" /> : <div className="rrReviewArtFallback">♫</div>}
                      <div className="rrReviewTrackMeta"><strong>{track.title}</strong><span>{track.artist}</span></div>
                      <button className={`rrFeatureToggle ${isFeatured ? "rrFeatureToggleOn" : ""}`} onClick={() => toggleFeatured(track)} aria-pressed={isFeatured}>
                        {isFeatured ? "★ Featured" : "Feature"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="rrReviewActions">
                <button className="rrBtn rrBtnUtility" onClick={() => setReviewOpen(false)} disabled={importing}>Back to results</button>
                <button className="rrBtn rrBtnPrimary rrBtnLibrary" onClick={importSelected} disabled={importing}>
                  {importing ? "Adding songs…" : `Add ${selectedCount} to library`}
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
          padding: 8px 10px 82px;
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
          gap: 12px;
          max-width: 1020px;
        }

        .rrAdminHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          border-radius: 14px;
          border: 1px solid rgba(133, 158, 255, 0.2);
          background: linear-gradient(145deg, rgba(20, 27, 44, 0.96), rgba(10, 15, 27, 0.99));
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
          padding: 14px 16px;
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
          margin: 7px 0 0;
          font-size: clamp(25px, 3vw, 38px);
          font-weight: 1000;
          line-height: 0.95;
          letter-spacing: -0.055em;
          color: #ffffff;
        }

        .rrAdminHeaderSub {
          margin: 6px 0 0;
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

        .rrConnectionInline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 34px;
          padding: 0 8px 0 10px;
          border: 1px solid rgba(143, 164, 205, 0.2);
          border-radius: 9px;
          background: rgba(6, 11, 20, 0.46);
          color: #aab8d0;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .rrStatusLight {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #697891;
          box-shadow: 0 0 0 3px rgba(105, 120, 145, 0.12);
        }

        .rrConnectionInlineOn .rrStatusLight {
          background: #47e4dc;
          box-shadow: 0 0 0 3px rgba(71, 228, 220, 0.12), 0 0 12px rgba(71, 228, 220, 0.74);
        }

        .rrLinkButton {
          border: 0;
          border-left: 1px solid rgba(160, 181, 220, 0.16);
          background: transparent;
          color: #e3dcff;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          padding: 2px 0 2px 8px;
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
          border-radius: 14px;
          border: 1px solid rgba(119, 145, 207, 0.17);
          background: linear-gradient(180deg, rgba(16, 23, 38, 0.96) 0%, rgba(9, 13, 24, 0.99) 100%);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
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
          border-color: rgba(122, 158, 213, 0.28);
          background: #0d1623;
        }

        .rrPanelHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 12px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: #121d2c;
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

        .rrSearchHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .rrSearchStep {
          flex: 0 0 auto;
          border: 1px solid rgba(106, 233, 226, 0.28);
          border-radius: 7px;
          background: #0b2027;
          color: #75ece3;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          padding: 6px 8px;
          text-transform: uppercase;
        }

        .rrFieldLabel {
          display: block;
          margin: 0 0 6px;
          color: #dce7fa;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .rrInputGroup {
          display: flex;
          align-items: center;
          min-width: 0;
          border: 1px solid #45617d;
          border-radius: 8px;
          background: #08111c;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.52);
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }

        .rrInputGroup:focus-within {
          border-color: #65ded5;
          box-shadow: 0 0 0 3px rgba(101, 222, 213, 0.12), inset 0 1px 2px rgba(0, 0, 0, 0.52);
        }

        .rrInputGroup > span {
          padding-left: 12px;
          color: #6d8fae;
          font-size: 20px;
          line-height: 1;
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
          border-radius: 8px;
          border: 1px solid #3c5570;
          background: #08111c;
          color: #f5f7ff;
          padding: 0 12px;
          outline: none;
          font: inherit;
          font-size: 14px;
        }

        .rrSearchInput {
          min-width: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
          font-size: 15px;
        }

        .rrSearchInput:focus { outline: none; }

        .rrInput::placeholder {
          color: #7f8ca7;
        }

        .rrBtn {
          min-height: 34px;
          border: 1px solid rgba(156, 177, 218, 0.28);
          border-radius: 9px;
          padding: 0 11px;
          color: #edf4ff;
          background: #26384e;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 2px 0 #09111b, 0 4px 8px rgba(0, 0, 0, 0.18);
          transition: transform 100ms ease, opacity 120ms ease, border-color 120ms ease, background 120ms ease, box-shadow 100ms ease;
          white-space: nowrap;
        }

        .rrBtn:hover {
          transform: translateY(-1px);
          border-color: rgba(105, 233, 229, 0.56);
          background: #304862;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 2px 0 #09111b, 0 0 12px rgba(71, 228, 220, 0.13);
        }

        .rrBtn:active {
          transform: translateY(2px);
          box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.38), 0 0 0 rgba(0, 0, 0, 0);
        }

        .rrBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .rrBtnPrimary {
          background: #4169b1;
          border-color: #7da6ed;
          color: white;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 2px 0 #1b3766, 0 6px 12px rgba(38, 91, 175, 0.23);
        }

        .rrBtnLibrary {
          min-width: 154px;
          box-shadow: 0 10px 24px rgba(92, 63, 255, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .rrBtnConnection,
        .rrBtnUtility {
          background: #172536;
          border-color: #3c526b;
          color: #cbd7ed;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }

        .rrBtnConnection:hover,
        .rrBtnUtility:hover,
        .rrBtnUtilityOn {
          border-color: #66dcd3;
          background: #1c3846;
          color: #fff;
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
          border-radius: 7px;
          padding: 0 10px;
          border: 1px solid #32485f;
          background: #142336;
          color: #edf3ff;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .rrTopStats {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0;
          margin-top: 12px;
          overflow: hidden;
          border: 1px solid #30465d;
          border-radius: 8px;
          background: #0a131f;
        }

        .rrSmallStat {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          border-right: 1px solid #30465d;
        }

        .rrSmallStat span {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #99a7c2;
        }

        .rrSmallStat strong {
          font-size: 13px;
          color: #f5f8ff;
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
          box-shadow: inset 3px 0 0 #ff79bf, 0 14px 24px rgba(122, 42, 116, 0.22);
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
          grid-template-columns: 1fr;
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

        .rrReviewOverlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(3, 7, 16, 0.74);
          backdrop-filter: blur(10px);
        }

        .rrReviewSheet {
          width: min(660px, 100%);
          max-height: min(760px, calc(100vh - 40px));
          overflow: auto;
          border: 1px solid rgba(179, 151, 255, 0.3);
          border-radius: 22px;
          padding: 18px;
          background:
            radial-gradient(circle at 88% 0%, rgba(120, 77, 255, 0.2), transparent 32%),
            linear-gradient(155deg, #182238 0%, #0b1120 62%, #070b14 100%);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.62);
        }

        .rrReviewHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .rrReviewHeader h2 {
          margin: 8px 0 6px;
          color: #fff;
          font-size: clamp(22px, 4vw, 30px);
          line-height: 1;
          letter-spacing: -0.045em;
        }

        .rrReviewHeader p {
          max-width: 500px;
          margin: 0;
          color: #acbad5;
          font-size: 13px;
          line-height: 1.45;
        }

        .rrReviewClose {
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          border: 1px solid rgba(159, 180, 221, 0.2);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.045);
          color: #dce8ff;
          cursor: pointer;
          font-size: 24px;
          line-height: 1;
        }

        .rrReviewTools,
        .rrReviewActions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 18px;
        }

        .rrReviewTools {
          padding: 10px 0;
          border-top: 1px solid rgba(162, 181, 220, 0.12);
          border-bottom: 1px solid rgba(162, 181, 220, 0.12);
          color: #d7e1f4;
          font-size: 12px;
          font-weight: 800;
        }

        .rrReviewTools > div {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .rrReviewList {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .rrReviewTrack {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border: 1px solid rgba(148, 170, 212, 0.13);
          border-radius: 14px;
          background: rgba(5, 11, 22, 0.48);
        }

        .rrReviewTrack img,
        .rrReviewArtFallback {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          object-fit: cover;
          background: #050914;
        }

        .rrReviewArtFallback {
          display: grid;
          place-items: center;
          color: #c8b5ff;
          font-size: 21px;
        }

        .rrReviewTrackMeta {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .rrReviewTrackMeta strong,
        .rrReviewTrackMeta span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rrReviewTrackMeta strong { color: #f6f8ff; font-size: 13px; }
        .rrReviewTrackMeta span { color: #9eafce; font-size: 11px; }

        .rrFeatureToggle {
          min-height: 32px;
          padding: 0 10px;
          border: 1px solid rgba(184, 154, 255, 0.28);
          border-radius: 10px;
          background: rgba(79, 56, 124, 0.24);
          color: #dbcfff;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
        }

        .rrFeatureToggleOn {
          border-color: rgba(255, 193, 93, 0.56);
          background: linear-gradient(180deg, #ffb54d, #e47b3d);
          color: #241207;
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

          .rrReviewTools,
          .rrReviewActions {
            align-items: stretch;
            flex-direction: column;
          }

          .rrReviewTools > div,
          .rrReviewActions > button {
            width: 100%;
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
