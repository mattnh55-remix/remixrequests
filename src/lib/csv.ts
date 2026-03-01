import { normalizeArtistKey } from "./security";

function parseBool(v: string) {
  const s = (v || "").trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(s);
}

function splitTags(v: string) {
  const raw = (v || "").trim();
  if (!raw) return [];
  const parts = raw.includes("|") ? raw.split("|") : raw.split(",");
  return parts.map(t => t.trim()).filter(Boolean);
}

export type SongRow = {
  title: string;
  artist: string;
  explicit: boolean;
  tags: string[];
  artworkUrl?: string;
};

export function parseCsvSongs(csv: string): SongRow[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map(h => h.trim());
  const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const iTitle = idx("title");
  const iArtist = idx("artist");
  const iExplicit = idx("explicit");
  const iTags = idx("tags");
  const iArtwork = idx("artworkUrl");

  if (iTitle < 0 || iArtist < 0) throw new Error("CSV must include title and artist columns.");

  const out: SongRow[] = [];

  for (let li = 1; li < lines.length; li++) {
    const cols = lines[li].split(",").map(c => c.trim());

    const title = cols[iTitle] || "";
    const artist = cols[iArtist] || "";
    if (!title || !artist) continue;

    const explicit = iExplicit >= 0 ? parseBool(cols[iExplicit] || "") : false;
    const tags = iTags >= 0 ? splitTags(cols[iTags] || "") : [];
    const artworkUrl = iArtwork >= 0 ? (cols[iArtwork] || "").trim() : "";

    out.push({ title, artist, explicit, tags, artworkUrl: artworkUrl || undefined });
  }

  return out;
}

export function artistKeyFor(artist: string) {
  return normalizeArtistKey(artist);
}
