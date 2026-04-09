import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

type SpotifyTrack = {
  title: string;
  artist: string;
  album: string;
  albumArt: string | null;
  spotifyId: string | null;
  previewUrl: string | null;
  durationMs: number | null;
};

async function getSpotifyAccessToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token request failed: ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

function extractPlaylistId(input: string) {
  const trimmed = String(input || "").trim();

  const match = trimmed.match(/playlist\/([a-zA-Z0-9]+)(\?|$)/);
  if (match?.[1]) return match[1];

  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;

  return null;
}

function mapTrack(track: any): SpotifyTrack | null {
  if (!track || !track.id || !track.name) return null;

  return {
    title: track.name ?? "",
    artist: Array.isArray(track.artists)
      ? track.artists.map((a: any) => a?.name).filter(Boolean).join(", ")
      : "",
    album: track.album?.name ?? "",
    albumArt: track.album?.images?.[0]?.url ?? null,
    spotifyId: track.id ?? null,
    previewUrl: track.preview_url ?? null,
    durationMs: typeof track.duration_ms === "number" ? track.duration_ms : null,
  };
}

async function fetchPlaylistTracks(playlistId: string, token: string) {
  const allTracks: SpotifyTrack[] = [];
  let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Spotify playlist request failed: ${text}`);
    }

    const data = await res.json();

    for (const item of data.items ?? []) {
      const mapped = mapTrack(item?.track);
      if (mapped) allTracks.push(mapped);
    }

    nextUrl = data.next ?? null;
  }

  return allTracks;
}

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const url = String(body?.url || "");
    const playlistId = extractPlaylistId(url);

    if (!playlistId) {
      return NextResponse.json(
        { ok: false, error: "Please paste a valid Spotify playlist link." },
        { status: 400 }
      );
    }

    const token = await getSpotifyAccessToken();

    const playlistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!playlistRes.ok) {
      const text = await playlistRes.text();
      throw new Error(`Spotify playlist detail request failed: ${text}`);
    }

    const playlist = await playlistRes.json();
    const tracks = await fetchPlaylistTracks(playlistId, token);

    return NextResponse.json({
      ok: true,
      playlist: {
        id: playlist.id ?? playlistId,
        name: playlist.name ?? "Spotify Playlist",
        description: playlist.description ?? "",
        image: playlist.images?.[0]?.url ?? null,
        owner: playlist.owner?.display_name ?? "",
        totalTracks: tracks.length,
      },
      tracks,
    });
  } catch (error: any) {
    console.error("spotify playlist route error", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to load Spotify playlist.",
      },
      { status: 500 }
    );
  }
}
