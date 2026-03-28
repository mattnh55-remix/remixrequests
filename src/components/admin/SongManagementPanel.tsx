"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SongAdminTab = "all" | "featured" | "writeins" | "tools";
type SortField =
  | "artist"
  | "title"
  | "songWeight"
  | "featureBoost"
  | "releaseYear"
  | "active"
  | "explicit";
type SortDir = "asc" | "desc";

type SongRow = {
  id: string;
  songId: string;
  title: string;
  artist: string;
  active: boolean;
  explicit: boolean;
  genre?: string | null;
  tags: string[];
  songWeight: number;
  featureBoost: number;
  album?: string | null;
  releaseYear?: number | null;
  preferredAudience?: string | null;
  albumArtFile?: string | null;
  artworkUrl?: string | null;
  importBatch?: string | null;
  notes?: string | null;
};

type SongListResponse = {
  ok?: boolean;
  items?: SongRow[];
  total?: number;
  counts?: {
    total: number;
    featured: number;
    active: number;
    explicit: number;
  };
  page?: number;
  pageSize?: number;
  error?: string;
};

type WriteInRow = {
  id: string;
  title: string;
  artist: string;
  notes?: string | null;
  status?: string | null;
  createdAt?: string | null;
  matchedSongId?: string | null;
};

type WriteInResponse = {
  ok?: boolean;
  items?: WriteInRow[];
  diagnostics?: {
    adapterReady: boolean;
    sourceModel?: string | null;
    message?: string;
  };
  error?: string;
};

type RulesSnapshot = {
  albumArtBaseUrl?: string;
  defaultAlbumArtUrl?: string;
};

type Props = {
  location: string;
  rules?: RulesSnapshot | null;
  onGlobalMessage?: (message: string) => void;
};

const PAGE_SIZE = 50;

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function subtitle(song: SongRow) {
  const parts = [song.album, song.releaseYear].filter(Boolean);
  return parts.length ? parts.join(" • ") : "—";
}

export default function SongManagementPanel({
  location,
  rules,
  onGlobalMessage,
}: Props) {
  const [tab, setTab] = useState<SongAdminTab>("all");
  const [items, setItems] = useState<SongRow[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    featured: 0,
    active: 0,
    explicit: 0,
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [localMsg, setLocalMsg] = useState("");

  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [explicitFilter, setExplicitFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("artist");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("activate");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const [editingSong, setEditingSong] = useState<SongRow | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [writeIns, setWriteIns] = useState<WriteInRow[]>([]);
  const [writeInBusy, setWriteInBusy] = useState(false);
  const [writeInDiagnostics, setWriteInDiagnostics] =
    useState<WriteInResponse["diagnostics"]>();
  const [writeInMatchId, setWriteInMatchId] = useState<Record<string, string>>(
    {}
  );

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedSet.has(item.id));

  function pushMessage(message: string) {
    setLocalMsg(message);
    onGlobalMessage?.(message);
  }

  async function fetchSongs(nextPage = 1, nextTab: SongAdminTab = tab) {
    if (nextTab === "writeins") return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(PAGE_SIZE),
        q: searchApplied,
        active: activeFilter,
        explicit: explicitFilter,
        audience: audienceFilter,
        genre: genreFilter.trim(),
        tags: tagFilter.trim(),
        sort: sortField,
        dir: sortDir,
        tab: nextTab,
      });

      const res = await fetch(`/api/admin/songs/${location}?${params.toString()}`, {
        cache: "no-store",
      });
      const data = parseJson<SongListResponse>(await res.text());

      if (!data?.ok) {
        pushMessage(data?.error || "Could not load songs.");
        return;
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
      setCounts(
        data.counts || { total: 0, featured: 0, active: 0, explicit: 0 }
      );
      setPage(Number(data.page || nextPage));
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWriteIns() {
    setWriteInBusy(true);
    try {
      const res = await fetch(`/api/admin/songs/write-ins/${location}`, {
        cache: "no-store",
      });
      const data = parseJson<WriteInResponse>(await res.text());

      if (!data?.ok) {
        pushMessage(data?.error || "Could not load write-ins.");
        return;
      }

      setWriteIns(Array.isArray(data.items) ? data.items : []);
      setWriteInDiagnostics(data.diagnostics);
    } finally {
      setWriteInBusy(false);
    }
  }

  useEffect(() => {
    if (tab === "writeins") {
      void fetchWriteIns();
      return;
    }
    void fetchSongs(1, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    location,
    searchApplied,
    activeFilter,
    explicitFilter,
    audienceFilter,
    genreFilter,
    tagFilter,
    sortField,
    sortDir,
  ]);

  async function postSongsAction(payload: Record<string, unknown>) {
    const res = await fetch(`/api/admin/songs/${location}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = parseJson<{ ok?: boolean; error?: string; message?: string }>(
      await res.text()
    );

    if (!data?.ok) throw new Error(data?.error || "Request failed.");
    if (data.message) pushMessage(data.message);
  }

  async function submitWriteInAction(
    action: string,
    writeInId: string,
    extra?: Record<string, unknown>
  ) {
    const res = await fetch(`/api/admin/songs/write-ins/${location}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, writeInId, ...extra }),
    });

    const data = parseJson<{ ok?: boolean; error?: string; message?: string }>(
      await res.text()
    );

    if (!data?.ok) {
      pushMessage(data?.error || "Write-in action failed.");
      return;
    }

    pushMessage(data.message || "Write-in updated.");
    await fetchWriteIns();
    await fetchSongs(1, "all");
  }

  async function saveSongEdit() {
    if (!editingSong) return;
    setEditBusy(true);
    try {
      await postSongsAction({
        action: "update-song",
        songId: editingSong.id,
        patch: {
          active: editingSong.active,
          explicit: editingSong.explicit,
          genre: editingSong.genre || null,
          tags: editingSong.tags,
          preferredAudience: editingSong.preferredAudience || "both",
          songWeight: editingSong.songWeight,
          featureBoost: editingSong.featureBoost,
          album: editingSong.album || null,
          releaseYear: editingSong.releaseYear || null,
          albumArtFile: editingSong.albumArtFile || null,
          artworkUrl: editingSong.artworkUrl || null,
          importBatch: editingSong.importBatch || null,
          notes: editingSong.notes || null,
        },
      });
      setEditingSong(null);
      await fetchSongs(page, tab === "featured" ? "featured" : "all");
    } catch (error) {
      pushMessage(error instanceof Error ? error.message : "Could not save song.");
    } finally {
      setEditBusy(false);
    }
  }

  async function runBulkAction() {
    if (!selectedIds.length) {
      pushMessage("Select at least one song first.");
      return;
    }

    setBulkBusy(true);
    try {
      const payload: Record<string, unknown> = {
        action: "bulk-update",
        songIds: selectedIds,
        bulkAction,
      };

      if (bulkAction === "setAudience") payload.value = bulkValue || "both";
      if (bulkAction === "setGenre") payload.value = bulkValue || null;
      if (bulkAction === "setSongWeight") payload.value = Number(bulkValue || 0);
      if (bulkAction === "setFeatureBoost") payload.value = Number(bulkValue || 0);
      if (bulkAction === "addTags" || bulkAction === "removeTags") payload.value = bulkValue;

      await postSongsAction(payload);
      await fetchSongs(page, tab === "featured" ? "featured" : "all");
    } catch (error) {
      pushMessage(error instanceof Error ? error.message : "Bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function clearFeatured() {
    const ok = window.confirm("Clear feature boosts from all songs for this location?");
    if (!ok) return;

    try {
      await postSongsAction({ action: "clear-featured" });
      await fetchSongs(1, "featured");
    } catch (error) {
      pushMessage(error instanceof Error ? error.message : "Could not clear featured songs.");
    }
  }

  async function importSongs(file: File) {
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`/api/admin/songs/import/${location}`, {
        method: "POST",
        body: form,
      });
      const data = parseJson<{ ok?: boolean; created?: number; error?: string }>(
        await res.text()
      );

      if (!data?.ok) throw new Error(data?.error || "Import failed.");

      pushMessage(`✅ Imported ${Number(data.created || 0)} songs.`);
      await fetchSongs(1, tab === "featured" ? "featured" : "all");
    } catch (error) {
      pushMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return (
    <div className="admSectionStack">
      {localMsg ? <div className="admNotice">{localMsg}</div> : null}

      <div className="admTabs">
        <button type="button" className={`admTab ${tab === "all" ? "is-active" : ""}`} onClick={() => setTab("all")}>All Songs</button>
        <button type="button" className={`admTab ${tab === "featured" ? "is-active" : ""}`} onClick={() => setTab("featured")}>Featured</button>
        <button type="button" className={`admTab ${tab === "writeins" ? "is-active" : ""}`} onClick={() => setTab("writeins")}>Write-Ins</button>
        <button type="button" className={`admTab ${tab === "tools" ? "is-active" : ""}`} onClick={() => setTab("tools")}>Import / Tools</button>
      </div>

      <div className="admMetricGrid" style={{ marginBottom: 10 }}>
        <div className="admMetricCard"><div className="admMetricLabel">Catalog songs</div><div className="admMetricValue">{counts.total}</div></div>
        <div className="admMetricCard"><div className="admMetricLabel">Featured</div><div className="admMetricValue">{counts.featured}</div></div>
        <div className="admMetricCard"><div className="admMetricLabel">Active</div><div className="admMetricValue">{counts.active}</div></div>
        <div className="admMetricCard"><div className="admMetricLabel">Explicit</div><div className="admMetricValue">{counts.explicit}</div></div>
      </div>

      {(tab === "all" || tab === "featured") && (
        <>
          <div className="admPanel">
            <div className="admPanelHead">
              <div className="admPanelTitle">{tab === "featured" ? "Featured songs" : "All songs"}</div>
              <div className="admPanelSub">Search, filter, sort, bulk edit, and manage catalog rows.</div>
            </div>
            <div className="admPanelBody">
              <div className="admGrid2" style={{ gridTemplateColumns: "1.3fr 0.8fr" }}>
                <label className="admField">
                  <span className="admLabel">Search</span>
                  <div className="admActionRow" style={{ gap: 8 }}>
                    <input className="admInput" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="title, artist, album, songId, notes" />
                    <button type="button" className="admBtnGhost" onClick={() => { setPage(1); setSearchApplied(search.trim()); }}>Apply</button>
                    <button type="button" className="admBtnGhost" onClick={() => { setPage(1); setSearch(""); setSearchApplied(""); }}>Clear</button>
                  </div>
                </label>
                <label className="admField">
                  <span className="admLabel">Genre contains</span>
                  <input className="admInput" value={genreFilter} onChange={(e) => { setPage(1); setGenreFilter(e.target.value); }} placeholder="pop, country, edm" />
                </label>
              </div>

              <div className="admGrid2" style={{ marginTop: 10 }}>
                <label className="admField">
                  <span className="admLabel">Active</span>
                  <select className="admSelect" value={activeFilter} onChange={(e) => { setPage(1); setActiveFilter(e.target.value); }}>
                    <option value="all">All</option>
                    <option value="true">Active only</option>
                    <option value="false">Inactive only</option>
                  </select>
                </label>
                <label className="admField">
                  <span className="admLabel">Explicit</span>
                  <select className="admSelect" value={explicitFilter} onChange={(e) => { setPage(1); setExplicitFilter(e.target.value); }}>
                    <option value="all">All</option>
                    <option value="true">Explicit only</option>
                    <option value="false">Clean only</option>
                  </select>
                </label>
                <label className="admField">
                  <span className="admLabel">Audience</span>
                  <select className="admSelect" value={audienceFilter} onChange={(e) => { setPage(1); setAudienceFilter(e.target.value); }}>
                    <option value="all">All</option>
                    <option value="all-ages">All ages</option>
                    <option value="adult">Adult</option>
                    <option value="both">Both</option>
                  </select>
                </label>
                <label className="admField">
                  <span className="admLabel">Tags contains</span>
                  <input className="admInput" value={tagFilter} onChange={(e) => { setPage(1); setTagFilter(e.target.value); }} placeholder="comma,separated" />
                </label>
              </div>

              <div className="admGrid2" style={{ marginTop: 10 }}>
                <label className="admField">
                  <span className="admLabel">Sort by</span>
                  <select className="admSelect" value={sortField} onChange={(e) => { setPage(1); setSortField(e.target.value as SortField); }}>
                    <option value="artist">Artist</option>
                    <option value="title">Title</option>
                    <option value="songWeight">Song Weight</option>
                    <option value="featureBoost">Feature Boost</option>
                    <option value="releaseYear">Release Year</option>
                    <option value="active">Active</option>
                    <option value="explicit">Explicit</option>
                  </select>
                </label>
                <label className="admField">
                  <span className="admLabel">Direction</span>
                  <select className="admSelect" value={sortDir} onChange={(e) => { setPage(1); setSortDir(e.target.value as SortDir); }}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </label>
                <div className="admField">
                  <span className="admLabel">Results</span>
                  <div className="admSubCopy">{loading ? "Loading…" : `${items.length} shown of ${total}`}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="admPanel">
            <div className="admPanelHead">
              <div className="admPanelTitle">Bulk actions</div>
              <div className="admPanelSub">Apply quick catalog changes to the current selection.</div>
            </div>
            <div className="admPanelBody">
              <div className="admGrid2" style={{ gridTemplateColumns: "1fr 1fr 0.9fr" }}>
                <label className="admField">
                  <span className="admLabel">Action</span>
                  <select className="admSelect" value={bulkAction} onChange={(e) => { const next = e.target.value; setBulkAction(next); setBulkValue(next === "setAudience" ? "both" : ""); }}>
                    <option value="activate">Set active</option>
                    <option value="deactivate">Set inactive</option>
                    <option value="setAudience">Set audience</option>
                    <option value="setGenre">Set genre</option>
                    <option value="setSongWeight">Set songWeight</option>
                    <option value="setFeatureBoost">Set featureBoost</option>
                    <option value="clearFeatureBoost">Clear feature boost</option>
                    <option value="addTags">Add tag(s)</option>
                    <option value="removeTags">Remove tag(s)</option>
                  </select>
                </label>
                <label className="admField">
                  <span className="admLabel">Value</span>
                  {bulkAction === "setAudience" ? (
                    <select className="admSelect" value={bulkValue || "both"} onChange={(e) => setBulkValue(e.target.value)}>
                      <option value="both">Both</option>
                      <option value="all-ages">All ages</option>
                      <option value="adult">Adult</option>
                    </select>
                  ) : (
                    <input className="admInput" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} placeholder={bulkAction.includes("Tag") ? "comma,separated,tags" : bulkAction.includes("Weight") || bulkAction.includes("Boost") ? "number" : "not required"} disabled={["activate", "deactivate", "clearFeatureBoost"].includes(bulkAction)} />
                  )}
                </label>
                <div className="admField">
                  <span className="admLabel">Selected</span>
                  <div className="admSubCopy" style={{ marginBottom: 10 }}>{selectedIds.length} song(s)</div>
                  <button type="button" className="admBtn" onClick={() => void runBulkAction()} disabled={bulkBusy}>{bulkBusy ? "Working..." : "Run bulk action"}</button>
                </div>
              </div>
            </div>
          </div>

          <div className="admPanel">
            <div className="admPanelHead">
              <div className="admPanelTitle">{tab === "featured" ? "Featured catalog" : "Song catalog"}</div>
              <div className="admPanelSub">Artwork, metadata, toggles, and direct row editing.</div>
            </div>
            <div className="admPanelBody">
              <div className="admActionRow" style={{ marginBottom: 10 }}>
                <button type="button" className="admBtnGhost" onClick={() => setSelectedIds(allVisibleSelected ? [] : items.map((item) => item.id))}>{allVisibleSelected ? "Clear page selection" : "Select visible page"}</button>
                {tab === "featured" ? <button type="button" className="admBtnDanger" onClick={() => void clearFeatured()}>Clear all featured</button> : null}
                <button type="button" className="admBtnGhost" onClick={() => void fetchSongs(page, tab === "featured" ? "featured" : "all")}>Refresh</button>
              </div>

              {loading ? <div className="admSubPanel"><div className="admSubCopy">Loading songs…</div></div> : null}
              {!loading && items.length === 0 ? <div className="admSubPanel"><div className="admSubCopy">No songs match the current filter set.</div></div> : null}

              <div className="admRows">
                {items.map((song) => (
                  <div key={song.id} className="admRowCard" style={{ gap: 14, alignItems: "flex-start" }}>
                    <input type="checkbox" checked={selectedSet.has(song.id)} onChange={(e) => setSelectedIds((curr) => e.target.checked ? [...curr, song.id] : curr.filter((id) => id !== song.id))} style={{ width: 18, height: 18, marginTop: 10 }} />
                    <div style={{ width: 70, minWidth: 70 }}>
                      <img src={song.artworkUrl || rules?.defaultAlbumArtUrl || "/logo.png"} alt={`${song.title} artwork`} style={{ width: 70, height: 70, borderRadius: 12, objectFit: "cover", border: "1px solid rgba(125,156,206,0.18)", background: "#0f1320" }} />
                    </div>
                    <div className="admTextWrap" style={{ flex: 1 }}>
                      <div className="admActionRow" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 1000, fontSize: 18 }}>{song.title}</div>
                        <div className="admPill">{song.artist}</div>
                        <div className={`admPill ${song.active ? "admPill--live" : "admPill--warn"}`}>{song.active ? "Active" : "Inactive"}</div>
                        {song.explicit ? <div className="admPill admPill--danger">Explicit</div> : null}
                        {song.featureBoost > 0 ? <div className="admPill">Featured +{song.featureBoost}</div> : null}
                      </div>
                      <div className="admMuted" style={{ marginTop: 6 }}>{subtitle(song)}</div>
                      <div className="admFieldHelp" style={{ marginTop: 6 }}>Audience {song.preferredAudience || "both"} • Weight {song.songWeight} • Genre {song.genre || "—"} • songId {song.songId}</div>
                      <div className="admFieldHelp" style={{ marginTop: 6 }}>Tags {song.tags?.length ? song.tags.join(", ") : "—"}</div>
                      {song.notes ? <div className="admFieldHelp" style={{ marginTop: 6 }}>Notes {song.notes}</div> : null}
                    </div>
                    <div style={{ minWidth: 250 }}>
                      <div className="admActionRow" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
                        <button type="button" className="admBtnGhost" onClick={() => void postSongsAction({ action: "update-song", songId: song.id, patch: { active: !song.active } }).then(() => fetchSongs(page, tab === "featured" ? "featured" : "all"))}>{song.active ? "Deactivate" : "Activate"}</button>
                        <button type="button" className="admBtnGhost" onClick={() => setEditingSong({ ...song, tags: [...(song.tags || [])] })}>Edit</button>
                        {song.featureBoost > 0 ? (
                          <button type="button" className="admBtnDanger" onClick={() => void postSongsAction({ action: "update-song", songId: song.id, patch: { featureBoost: 0 } }).then(() => fetchSongs(page, tab === "featured" ? "featured" : "all"))}>Remove featured</button>
                        ) : (
                          <button type="button" className="admBtn" onClick={() => void postSongsAction({ action: "update-song", songId: song.id, patch: { featureBoost: 100 } }).then(() => fetchSongs(page, tab === "featured" ? "featured" : "all"))}>Add to featured</button>
                        )}
                      </div>
                      <div className="admFieldHelp" style={{ textAlign: "right" }}>Import batch {song.importBatch || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="admSplitActions" style={{ marginTop: 12 }}>
                <div className="admFieldHelp">Page {page} • {items.length} row(s) shown</div>
                <div className="admActionRow">
                  <button type="button" className="admBtnGhost" disabled={page <= 1 || loading} onClick={() => { const next = Math.max(1, page - 1); setPage(next); void fetchSongs(next, tab === "featured" ? "featured" : "all"); }}>Prev</button>
                  <button type="button" className="admBtnGhost" disabled={loading || items.length < PAGE_SIZE} onClick={() => { const next = page + 1; setPage(next); void fetchSongs(next, tab === "featured" ? "featured" : "all"); }}>Next</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "writeins" && (
        <div className="admPanel">
          <div className="admPanelHead">
            <div className="admPanelTitle">Write-in requests</div>
            <div className="admPanelSub">Separate workflow for guest-entered songs that are not yet in the catalog.</div>
          </div>
          <div className="admPanelBody">
            <div className="admActionRow" style={{ marginBottom: 10 }}>
              <button type="button" className="admBtnGhost" onClick={() => void fetchWriteIns()}>{writeInBusy ? "Refreshing..." : "Refresh write-ins"}</button>
            </div>

            <div className="admSubPanel" style={{ marginBottom: 12 }}>
              <div className="admSubCopy">Adapter status: <b>{writeInDiagnostics?.adapterReady ? "Ready" : "Stub mode"}</b>{writeInDiagnostics?.sourceModel ? <> • Model <b>{writeInDiagnostics.sourceModel}</b></> : null}</div>
              {writeInDiagnostics?.message ? <div className="admFieldHelp" style={{ marginTop: 6 }}>{writeInDiagnostics.message}</div> : null}
            </div>

            {writeInBusy ? <div className="admSubPanel"><div className="admSubCopy">Loading write-ins…</div></div> : null}
            {!writeInBusy && writeIns.length === 0 ? <div className="admSubPanel"><div className="admSubCopy">No pending write-ins yet.</div></div> : null}

            <div className="admRows">
              {writeIns.map((item) => (
                <div key={item.id} className="admRowCard">
                  <div className="admTextWrap" style={{ flex: 1 }}>
                    <div className="admActionRow" style={{ gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 1000, fontSize: 18 }}>{item.title}</div>
                      <div className="admPill">{item.artist}</div>
                      {item.status ? <div className="admPill">{item.status}</div> : null}
                    </div>
                    <div className="admFieldHelp" style={{ marginTop: 6 }}>Submitted {formatDate(item.createdAt)}</div>
                    {item.notes ? <div className="admFieldHelp" style={{ marginTop: 6 }}>{item.notes}</div> : null}
                    {item.matchedSongId ? <div className="admFieldHelp" style={{ marginTop: 6 }}>Matched songId {item.matchedSongId}</div> : null}
                  </div>
                  <div style={{ minWidth: 320 }}>
                    <div className="admActionRow" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
                      <button type="button" className="admBtn" onClick={() => void submitWriteInAction("promote-to-catalog", item.id)}>Promote to catalog</button>
                      <button type="button" className="admBtnDanger" onClick={() => void submitWriteInAction("reject", item.id)}>Reject</button>
                    </div>
                    <div className="admActionRow" style={{ justifyContent: "flex-end" }}>
                      <input className="admInput" value={writeInMatchId[item.id] || ""} onChange={(e) => setWriteInMatchId((curr) => ({ ...curr, [item.id]: e.target.value }))} placeholder="Existing songId to match" style={{ maxWidth: 220 }} />
                      <button type="button" className="admBtnGhost" onClick={() => void submitWriteInAction("match-existing", item.id, { songId: writeInMatchId[item.id] || "" })}>Match existing</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "tools" && (
        <div className="admGridSettings">
          <div className="admPanel">
            <div className="admPanelHead">
              <div className="admPanelTitle">Import catalog</div>
              <div className="admPanelSub">Upload the latest spreadsheet to replace the location song catalog.</div>
            </div>
            <div className="admPanelBody">
              <input ref={importInputRef} type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importSongs(file); }} className="admFileInput" disabled={importing} />
              <div className="admFieldHelp" style={{ marginTop: 8 }}>{importing ? "Importing songs..." : "Upload a spreadsheet using the approved song import template."}</div>
            </div>
          </div>

          <div className="admPanel">
            <div className="admPanelHead">
              <div className="admPanelTitle">Artwork tools</div>
              <div className="admPanelSub">Current rule snapshot used for album art generation and fallback behavior.</div>
            </div>
            <div className="admPanelBody">
              <div className="admSubPanel">
                <div className="admSubCopy">Album art base URL</div>
                <div className="admFieldHelp" style={{ marginTop: 6, wordBreak: "break-all" }}>{rules?.albumArtBaseUrl || "—"}</div>
              </div>
              <div className="admSubPanel" style={{ marginTop: 10 }}>
                <div className="admSubCopy">Default album art URL</div>
                <div className="admFieldHelp" style={{ marginTop: 6, wordBreak: "break-all" }}>{rules?.defaultAlbumArtUrl || "—"}</div>
              </div>
            </div>
          </div>

          <div className="admPanel">
            <div className="admPanelHead">
              <div className="admPanelTitle">Featured controls</div>
              <div className="admPanelSub">Fast utilities for promotion management.</div>
            </div>
            <div className="admPanelBody">
              <div className="admActionRow">
                <button type="button" className="admBtnGhost" onClick={() => setTab("featured")}>Open Featured tab</button>
                <button type="button" className="admBtnDanger" onClick={() => void clearFeatured()}>Clear all featured</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingSong ? (
        <div className="admOverlay">
          <div className="admModalCard" style={{ width: "min(840px, 96vw)" }}>
            <div className="admSplitActions" style={{ marginBottom: 12 }}>
              <div>
                <div className="admPanelTitle" style={{ fontSize: 18 }}>Edit song</div>
                <div className="admPanelSub">{editingSong.artist} • {editingSong.title}</div>
              </div>
              <button type="button" className="admBtnGhost" onClick={() => { if (!editBusy) setEditingSong(null); }}>Close</button>
            </div>

            <div className="admGrid2">
              <label className="admField"><span className="admLabel">Song ID</span><input className="admInput" value={editingSong.songId} readOnly /></label>
              <label className="admField"><span className="admLabel">Preferred audience</span><select className="admSelect" value={editingSong.preferredAudience || "both"} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, preferredAudience: e.target.value } : curr)}><option value="both">Both</option><option value="all-ages">All ages</option><option value="adult">Adult</option></select></label>
              <label className="admField"><span className="admLabel">Genre</span><input className="admInput" value={editingSong.genre || ""} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, genre: e.target.value } : curr)} /></label>
              <label className="admField"><span className="admLabel">Release year</span><input className="admInput" type="number" value={editingSong.releaseYear || ""} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, releaseYear: e.target.value ? Number(e.target.value) : null } : curr)} /></label>
              <label className="admField"><span className="admLabel">Song weight</span><input className="admInput" type="number" value={editingSong.songWeight} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, songWeight: Number(e.target.value || 0) } : curr)} /></label>
              <label className="admField"><span className="admLabel">Feature boost</span><input className="admInput" type="number" value={editingSong.featureBoost} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, featureBoost: Number(e.target.value || 0) } : curr)} /></label>
              <label className="admField"><span className="admLabel">Album</span><input className="admInput" value={editingSong.album || ""} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, album: e.target.value } : curr)} /></label>
              <label className="admField"><span className="admLabel">Import batch</span><input className="admInput" value={editingSong.importBatch || ""} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, importBatch: e.target.value } : curr)} /></label>
              <label className="admField"><span className="admLabel">Album art file</span><input className="admInput" value={editingSong.albumArtFile || ""} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, albumArtFile: e.target.value } : curr)} /></label>
              <label className="admField"><span className="admLabel">Artwork URL</span><input className="admInput" value={editingSong.artworkUrl || ""} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, artworkUrl: e.target.value } : curr)} /></label>
              <label className="admField" style={{ gridColumn: "1 / -1" }}><span className="admLabel">Tags</span><input className="admInput" value={editingSong.tags.join(", ")} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) } : curr)} /></label>
              <label className="admField" style={{ gridColumn: "1 / -1" }}><span className="admLabel">Notes</span><textarea className="admTextarea" rows={4} value={editingSong.notes || ""} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, notes: e.target.value } : curr)} /></label>
            </div>

            <div className="admActionRow" style={{ marginTop: 12 }}>
              <label className="admRow" style={{ marginBottom: 0, cursor: "pointer" }}><div style={{ fontWeight: 900 }}>Active</div><input type="checkbox" checked={editingSong.active} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, active: e.target.checked } : curr)} /></label>
              <label className="admRow" style={{ marginBottom: 0, cursor: "pointer" }}><div style={{ fontWeight: 900 }}>Explicit</div><input type="checkbox" checked={editingSong.explicit} onChange={(e) => setEditingSong((curr) => curr ? { ...curr, explicit: e.target.checked } : curr)} /></label>
              <div style={{ flex: 1 }} />
              <button type="button" className="admBtn" onClick={() => void saveSongEdit()} disabled={editBusy}>{editBusy ? "Saving..." : "Save song"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
