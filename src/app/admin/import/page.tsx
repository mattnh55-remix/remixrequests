"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PlaylistInfo = {
  id: string;
  name: string;
  description: string;
  image: string | null;
  owner: string;
  totalTracks: number;
  externalUrl?: string | null;
};

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

export default function AdminSpotifyImportPage() {
  const searchParams = useSearchParams();
  const [locationSlug, setLocationSlug] = useState("remixrequests");
  const [spotifyStatus, setSpotifyStatus] = useState<SpotifyStatus>({ connected: false });
  const [statusLoading, setStatusLoading] = useState(true);

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [featuredIds, setFeaturedIds] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [search, setSearch] = useState("");

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
        const res = await fetch(`/api/admin/spotify/status?locationSlug=${encodeURIComponent(locationSlug)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load Spotify status.");
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

  const filteredTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tracks;

    return tracks.filter((track) => {
      const blob = `${track.title} ${track.artist} ${track.album}`.toLowerCase();
      return blob.includes(q);
    });
  }, [tracks, search]);

  const selectedCount = useMemo(() => {
    return tracks.filter((track) => track.spotifyId && selectedIds[track.spotifyId]).length;
  }, [tracks, selectedIds]);

  function resetMessages() {
    setMessage("");
    setError("");
    setSummary(null);
  }

  function setAllVisibleSelected(nextValue: boolean) {
    const next = { ...selectedIds };
    for (const track of filteredTracks) {
      if (!track.spotifyId) continue;
      next[track.spotifyId] = nextValue;
    }
    setSelectedIds(next);
  }

  function toggleSelected(spotifyId: string | null) {
    if (!spotifyId) return;
    setSelectedIds((prev) => ({ ...prev, [spotifyId]: !prev[spotifyId] }));
  }

  function toggleFeatured(spotifyId: string | null) {
    if (!spotifyId) return;
    setFeaturedIds((prev) => ({ ...prev, [spotifyId]: !prev[spotifyId] }));
  }

  function connectSpotify() {
    window.location.href = `/api/admin/spotify/login?locationSlug=${encodeURIComponent(locationSlug)}`;
  }

  async function loadPlaylist() {
    resetMessages();
    setLoading(true);
    setTracks([]);
    setPlaylist(null);

    try {
      const res = await fetch("/api/admin/spotify/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, locationSlug }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Could not load playlist.");

      const incomingTracks: Track[] = Array.isArray(data.tracks) ? data.tracks : [];
      setPlaylist(data.playlist || null);
      setTracks(incomingTracks);

      const nextSelected: Record<string, boolean> = {};
      for (const track of incomingTracks) {
        if (track.spotifyId) nextSelected[track.spotifyId] = true;
      }
      setSelectedIds(nextSelected);
      setFeaturedIds({});
      setMessage(`Loaded ${incomingTracks.length} songs from Spotify.`);
    } catch (err: any) {
      setError(err?.message || "Could not load playlist.");
    } finally {
      setLoading(false);
    }
  }

  async function importSelected() {
    resetMessages();

    const payloadTracks = tracks
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
      if (!res.ok || !data.ok) throw new Error(data?.error || "Import failed.");

      setSummary(data.summary || null);
      setMessage("Playlist imported successfully.");
    } catch (err: any) {
      setError(err?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="rrAdminSpotifyPage">
      <div className="rrAdminSpotifyShell">
        <div className="rrAdminHero">
          <div className="rrAdminHeroBadge">Spotify Import</div>
          <div className="rrAdminHeroTitle">Build the vibe for tonight</div>
          <div className="rrAdminHeroText">
            Connect the Remix Spotify account, paste a playlist, review the album art cards, then import the bangers into your catalog.
          </div>
        </div>

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Spotify connection</div>
              <div className="rrPanelSub">Use one shared Remix Spotify account so staff can import private store playlists.</div>
            </div>
            <div className="rrStatusPill">{locationSlug}</div>
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
                    ? `Scopes: ${spotifyStatus.scope || "playlist-read-private playlist-read-collaborative"}`
                    : "Click connect, log in with the Remix Spotify account, then come back here and load a playlist."}
                </div>
              </div>

              <button className="rrBtn rrBtnPrimary" onClick={connectSpotify}>
                {spotifyStatus.connected ? "Reconnect Spotify" : "Connect Spotify"}
              </button>
            </div>
          </div>
        </div>

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Import playlist</div>
              <div className="rrPanelSub">Paste the Spotify playlist link from the connected Remix account.</div>
            </div>
            <div className="rrStatusPill">{selectedCount} selected</div>
          </div>

          <div className="rrPanelBody">
            <div className="rrInputRow">
              <input
                className="rrInput"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste Spotify playlist link…"
                disabled={!spotifyStatus.connected}
              />
              <button
                className="rrBtn rrBtnPrimary"
                onClick={loadPlaylist}
                disabled={loading || !url.trim() || !spotifyStatus.connected}
              >
                {loading ? "Loading…" : "Load Playlist"}
              </button>
            </div>

            {message ? <div className="rrNotice rrNoticeSuccess">{message}</div> : null}
            {error ? <div className="rrNotice rrNoticeError">{error}</div> : null}

            {summary ? (
              <div className="rrSummaryGrid">
                <div className="rrMiniStat"><div className="rrMiniStatLabel">Added</div><div className="rrMiniStatValue">{summary.added}</div></div>
                <div className="rrMiniStat"><div className="rrMiniStatLabel">Updated</div><div className="rrMiniStatValue">{summary.updated}</div></div>
                <div className="rrMiniStat"><div className="rrMiniStatLabel">Skipped</div><div className="rrMiniStatValue">{summary.skipped}</div></div>
                <div className="rrMiniStat"><div className="rrMiniStatLabel">Total</div><div className="rrMiniStatValue">{summary.total}</div></div>
              </div>
            ) : null}
          </div>
        </div>

        {playlist ? (
          <div className="rrPlaylistWrap">
            <div className="rrPlaylistCard">
              <div className="rrPlaylistArtWrap">
                {playlist.image ? <img src={playlist.image} alt={playlist.name} className="rrPlaylistArt" /> : <div className="rrPlaylistArt rrPlaylistArtPlaceholder">🎧</div>}
              </div>

              <div className="rrPlaylistMeta">
                <div className="rrPlaylistEyebrow">Loaded playlist</div>
                <div className="rrPlaylistName">{playlist.name}</div>
                <div className="rrPlaylistSub">{playlist.owner ? `by ${playlist.owner}` : "Spotify playlist"} • {playlist.totalTracks} tracks</div>
                {playlist.externalUrl ? (
                  <a className="rrLink" href={playlist.externalUrl} target="_blank" rel="noreferrer">
                    Open in Spotify
                  </a>
                ) : null}
                {playlist.description ? (
                  <div className="rrPlaylistDesc" dangerouslySetInnerHTML={{ __html: playlist.description }} />
                ) : null}
              </div>
            </div>

            <div className="rrPanel">
              <div className="rrPanelHead">
                <div>
                  <div className="rrPanelTitle">Review songs</div>
                  <div className="rrPanelSub">Select what to import. Mark standouts as featured.</div>
                </div>
                <div className="rrQuickActions">
                  <button className="rrBtn" onClick={() => setAllVisibleSelected(true)}>Select visible</button>
                  <button className="rrBtn" onClick={() => setAllVisibleSelected(false)}>Clear visible</button>
                  <button className="rrBtn rrBtnPrimary" onClick={importSelected} disabled={importing || !selectedCount}>
                    {importing ? "Importing…" : `Import ${selectedCount} song${selectedCount === 1 ? "" : "s"}`}
                  </button>
                </div>
              </div>

              <div className="rrPanelBody">
                <div className="rrToolbar">
                  <input className="rrInput" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search loaded songs…" />
                </div>

                <div className="rrTrackGrid">
                  {filteredTracks.map((track) => {
                    const id = track.spotifyId || `${track.title}-${track.artist}`;
                    const isSelected = !!(track.spotifyId && selectedIds[track.spotifyId]);
                    const isFeatured = !!(track.spotifyId && featuredIds[track.spotifyId]);

                    return (
                      <div key={id} className={["rrTrackCard", isSelected ? "rrTrackCardSelected" : "", isFeatured ? "rrTrackCardFeatured" : ""].join(" ")}>
                        <button type="button" className="rrTrackSelectLayer" onClick={() => toggleSelected(track.spotifyId)} aria-label={`Select ${track.title} by ${track.artist}`} />
                        <div className="rrTrackArtWrap">
                          {track.albumArt ? <img src={track.albumArt} alt={track.album} className="rrTrackArt" /> : <div className="rrTrackArt rrTrackArtPlaceholder">🎵</div>}
                          <div className="rrTrackCornerBadges">
                            {isSelected ? <span className="rrChip rrChipSelected">Selected</span> : null}
                            {isFeatured ? <span className="rrChip rrChipFeatured">Featured</span> : null}
                          </div>
                        </div>
                        <div className="rrTrackBody">
                          <div className="rrTrackTitle">{track.title}</div>
                          <div className="rrTrackMeta">{track.artist}</div>
                          <div className="rrTrackMeta rrTrackMetaSoft">{track.album}</div>
                          <div className="rrTrackFoot">
                            <div className="rrTrackDuration">{formatDuration(track.durationMs)}</div>
                            <div className="rrTrackActions">
                              <button type="button" className={`rrActionBtn ${isSelected ? "rrActionBtnOn" : ""}`} onClick={(e) => { e.stopPropagation(); toggleSelected(track.spotifyId); }}>
                                {isSelected ? "✓ Added" : "+ Add"}
                              </button>
                              <button type="button" className={`rrActionBtn rrActionBtnFeature ${isFeatured ? "rrActionBtnFeatureOn" : ""}`} onClick={(e) => { e.stopPropagation(); toggleFeatured(track.spotifyId); }}>
                                🔥 Feature
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!filteredTracks.length ? <div className="rrEmpty">No songs match your search.</div> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .rrAdminSpotifyPage { min-height: 100vh; background: radial-gradient(circle at 20% 0%, rgba(80, 90, 140, 0.14), transparent 38%), linear-gradient(180deg, #05070f 0%, #070a14 100%); color: #f3f6fb; padding: 20px; }
        .rrAdminSpotifyShell { display: grid; gap: 18px; }
        .rrStack12 { display: grid; gap: 12px; }
        .rrAdminHero { position: relative; overflow: hidden; border-radius: 18px; border: 1px solid rgba(108, 137, 186, 0.18); background: radial-gradient(circle at 12% 14%, rgba(93, 138, 219, 0.18), transparent 28%), linear-gradient(135deg, rgba(21, 31, 47, 0.98) 0%, rgba(9, 14, 23, 0.99) 70%, rgba(20, 12, 30, 0.98) 100%); box-shadow: 0 18px 40px rgba(0, 0, 0, 0.42); padding: 18px; }
        .rrAdminHeroBadge, .rrStatusPill { display: inline-flex; min-height: 24px; align-items: center; border-radius: 999px; padding: 0 10px; font-size: 10px; font-weight: 1000; letter-spacing: 0.12em; text-transform: uppercase; color: #dceaff; border: 1px solid rgba(101, 166, 252, 0.34); background: linear-gradient(180deg, rgba(37, 59, 90, 0.72), rgba(15, 31, 52, 0.92)); }
        .rrStatusPill { min-height: 30px; padding: 0 12px; font-size: 11px; }
        .rrAdminHeroTitle { margin-top: 10px; font-size: 34px; font-weight: 1000; line-height: 1; letter-spacing: -0.04em; }
        .rrAdminHeroText { margin-top: 8px; max-width: 760px; color: #b3bfd2; font-size: 14px; line-height: 1.45; }
        .rrPanel { overflow: hidden; border-radius: 16px; border: 1px solid rgba(108, 137, 186, 0.18); background: linear-gradient(180deg, rgba(17, 24, 37, 0.94) 0%, rgba(8, 13, 22, 0.98) 100%); box-shadow: 0 18px 40px rgba(0, 0, 0, 0.26); }
        .rrPanelHead { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 16px 16px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: linear-gradient(180deg, rgba(20, 31, 49, 0.74), rgba(12, 20, 32, 0.08)), linear-gradient(90deg, rgba(65, 118, 198, 0.08), rgba(15, 24, 38, 0) 36%, rgba(77, 143, 228, 0.1)); }
        .rrPanelTitle { font-size: 13px; font-weight: 1000; letter-spacing: 0.12em; text-transform: uppercase; }
        .rrPanelSub { margin-top: 4px; color: #b3bfd2; font-size: 12px; line-height: 1.35; }
        .rrPanelBody { padding: 16px; }
        .rrConnectionCard { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 14px; border-radius: 14px; border: 1px solid rgba(117, 145, 197, 0.18); background: linear-gradient(180deg, rgba(16, 24, 37, 0.96), rgba(9, 15, 24, 0.98)); }
        .rrConnectionTitle { font-size: 16px; font-weight: 900; }
        .rrConnectionSub { margin-top: 6px; color: #b3bfd2; font-size: 12px; line-height: 1.35; }
        .rrInputRow, .rrToolbar { display: grid; grid-template-columns: 1fr auto; gap: 10px; }
        .rrToolbar { grid-template-columns: 1fr; margin-bottom: 14px; }
        .rrInput { width: 100%; min-height: 48px; border-radius: 12px; border: 1px solid rgba(117, 145, 197, 0.22); background: linear-gradient(180deg, rgba(16, 24, 37, 0.96), rgba(9, 15, 24, 0.98)); color: #f3f6fb; padding: 0 14px; outline: none; font: inherit; }
        .rrInput::placeholder { color: #7c899f; }
        .rrBtn { min-height: 48px; border: 1px solid rgba(136, 159, 201, 0.18); border-radius: 12px; padding: 0 14px; color: #ecf4ff; background: linear-gradient(180deg, rgba(46, 58, 80, 0.94), rgba(24, 35, 52, 0.98)); cursor: pointer; font: inherit; font-weight: 800; }
        .rrBtnPrimary { background: linear-gradient(180deg, rgba(77, 143, 228, 0.98), rgba(47, 111, 198, 0.99)); border-color: rgba(111, 174, 255, 0.34); color: white; box-shadow: 0 12px 26px rgba(17, 47, 89, 0.32); }
        .rrNotice { margin-top: 12px; padding: 12px 14px; border-radius: 12px; font-size: 13px; line-height: 1.35; }
        .rrNoticeSuccess { border: 1px solid rgba(78, 170, 122, 0.3); background: linear-gradient(180deg, rgba(18, 44, 31, 0.86), rgba(11, 26, 19, 0.96)); color: #dff8e8; }
        .rrNoticeError { border: 1px solid rgba(205, 91, 91, 0.26); background: linear-gradient(180deg, rgba(53, 20, 20, 0.86), rgba(29, 11, 11, 0.96)); color: #ffdede; }
        .rrSummaryGrid { margin-top: 14px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .rrMiniStat { border-radius: 12px; padding: 12px; border: 1px solid rgba(108, 137, 186, 0.18); background: linear-gradient(180deg, rgba(18, 27, 43, 0.96), rgba(10, 16, 27, 0.98)); }
        .rrMiniStatLabel { font-size: 10px; font-weight: 1000; letter-spacing: 0.12em; text-transform: uppercase; color: #7c899f; }
        .rrMiniStatValue { margin-top: 6px; font-size: 30px; font-weight: 1000; line-height: 1; }
        .rrPlaylistWrap { display: grid; gap: 18px; }
        .rrPlaylistCard { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 16px; align-items: center; border-radius: 18px; border: 1px solid rgba(108, 137, 186, 0.18); background: radial-gradient(circle at 10% 20%, rgba(92, 142, 220, 0.16), transparent 30%), linear-gradient(180deg, rgba(24, 37, 58, 0.98) 0%, rgba(12, 21, 34, 0.985) 54%, rgba(8, 14, 23, 0.995) 100%); padding: 16px; box-shadow: 0 18px 40px rgba(0, 0, 0, 0.34); }
        .rrPlaylistArtWrap { width: 140px; height: 140px; }
        .rrPlaylistArt { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 16px; border: 1px solid rgba(125, 156, 206, 0.18); box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28); background: #050814; }
        .rrPlaylistArtPlaceholder, .rrTrackArtPlaceholder { display: grid; place-items: center; font-size: 46px; }
        .rrPlaylistEyebrow { font-size: 10px; font-weight: 1000; letter-spacing: 0.12em; text-transform: uppercase; color: #9bb8e8; }
        .rrPlaylistName { margin-top: 4px; font-size: 28px; font-weight: 1000; line-height: 1.05; letter-spacing: -0.03em; }
        .rrPlaylistSub, .rrPlaylistDesc { margin-top: 8px; color: #b3bfd2; font-size: 13px; }
        .rrPlaylistDesc { line-height: 1.45; }
        .rrLink { display: inline-block; margin-top: 8px; color: #9ec5ff; font-size: 13px; font-weight: 800; text-decoration: none; }
        .rrQuickActions { display: flex; flex-wrap: wrap; gap: 8px; }
        .rrTrackGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
        .rrTrackCard { position: relative; overflow: hidden; border-radius: 16px; border: 1px solid rgba(123, 157, 213, 0.18); background: radial-gradient(circle at 14% 12%, rgba(92, 142, 220, 0.16), transparent 34%), linear-gradient(180deg, rgba(24, 37, 58, 0.98) 0%, rgba(12, 21, 34, 0.985) 54%, rgba(8, 14, 23, 0.995) 100%); }
        .rrTrackCardSelected { border-color: rgba(97, 154, 236, 0.5); }
        .rrTrackCardFeatured { background: radial-gradient(circle at 18% 12%, rgba(245, 105, 55, 0.16), transparent 30%), linear-gradient(135deg, rgba(38, 29, 52, 0.98) 0%, rgba(17, 21, 36, 0.99) 68%, rgba(12, 16, 27, 0.995) 100%); }
        .rrTrackSelectLayer { position: absolute; inset: 0; z-index: 1; border: 0; background: transparent; cursor: pointer; }
        .rrTrackArtWrap { position: relative; aspect-ratio: 1 / 1; }
        .rrTrackArt { width: 100%; height: 100%; object-fit: cover; display: block; background: #050814; }
        .rrTrackCornerBadges { position: absolute; top: 10px; left: 10px; display: flex; flex-wrap: wrap; gap: 6px; z-index: 2; }
        .rrChip { display: inline-flex; align-items: center; min-height: 22px; padding: 0 8px; border-radius: 999px; font-size: 10px; font-weight: 1000; letter-spacing: 0.08em; text-transform: uppercase; backdrop-filter: blur(8px); }
        .rrChipSelected { color: #eef8ff; border: 1px solid rgba(111, 174, 255, 0.3); background: rgba(24, 63, 116, 0.78); }
        .rrChipFeatured { color: #fff3ea; border: 1px solid rgba(255, 162, 109, 0.28); background: rgba(110, 46, 16, 0.8); }
        .rrTrackBody { position: relative; z-index: 2; display: grid; gap: 8px; padding: 12px; }
        .rrTrackTitle { font-size: 15px; font-weight: 900; line-height: 1.2; letter-spacing: -0.02em; }
        .rrTrackMeta { font-size: 12px; color: #dfe8fb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rrTrackMetaSoft { color: #8ea0bd; }
        .rrTrackFoot { display: grid; gap: 10px; margin-top: 4px; }
        .rrTrackDuration { font-size: 11px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: #9bb8e8; }
        .rrTrackActions { display: flex; gap: 8px; }
        .rrActionBtn { position: relative; z-index: 3; flex: 1; min-height: 38px; border-radius: 10px; border: 1px solid rgba(136, 159, 201, 0.18); background: linear-gradient(180deg, rgba(46, 58, 80, 0.94), rgba(24, 35, 52, 0.98)); color: #eef4ff; font: inherit; font-size: 12px; font-weight: 900; cursor: pointer; }
        .rrActionBtnOn { background: linear-gradient(180deg, rgba(77, 143, 228, 0.98), rgba(47, 111, 198, 0.99)); border-color: rgba(111, 174, 255, 0.34); }
        .rrActionBtnFeature { background: linear-gradient(180deg, rgba(73, 52, 38, 0.96), rgba(44, 28, 18, 0.98)); border-color: rgba(196, 128, 83, 0.2); }
        .rrActionBtnFeatureOn { background: linear-gradient(180deg, rgba(255, 122, 69, 0.98), rgba(202, 84, 33, 0.99)); border-color: rgba(255, 171, 129, 0.34); color: #fff; }
        .rrEmpty { border-radius: 12px; border: 1px dashed rgba(125, 156, 206, 0.24); padding: 18px; text-align: center; color: #b3bfd2; background: rgba(255, 255, 255, 0.02); }
        @media (max-width: 900px) { .rrPlaylistCard { grid-template-columns: 1fr; } .rrPlaylistArtWrap { width: 120px; height: 120px; } .rrInputRow, .rrConnectionCard { grid-template-columns: 1fr; display: grid; } .rrSummaryGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .rrAdminSpotifyPage { padding: 12px; } .rrAdminHeroTitle { font-size: 26px; } .rrTrackGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .rrTrackActions { flex-direction: column; } .rrQuickActions { width: 100%; } }
      `}</style>
    </div>
  );
}
