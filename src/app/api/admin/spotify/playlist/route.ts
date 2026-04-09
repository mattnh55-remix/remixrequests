import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { refreshSpotifyAccessTokenIfNeeded } from "@/lib/spotify-oauth";

type SpotifyTrack = {
  title: string;
  artist: string;
  album: string;
  albumArt: string | null;
  spotifyId: string | null;
  previewUrl: string | null;
  durationMs: number | null;
};

type SpotifyPlaylistTracksResponse = {
  items?: Array<{ track?: any }>;
  next?: string | null;
};

function extractPlaylistId(input: string): string | null {
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

async function fetchPlaylistTracks(playlistId: string, accessToken: string): Promise<SpotifyTrack[]> {
  const allTracks: SpotifyTrack[] = [];
  let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const text = await res.text();
    const data: SpotifyPlaylistTracksResponse & { error?: { message?: string } } = text ? JSON.parse(text) : {};

    if (!res.ok) {
      throw new Error(data?.error?.message || "Spotify playlist request failed.");
    }

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
    const locationSlug = String(body?.locationSlug || "remixrequests");
    const playlistId = extractPlaylistId(url);

    if (!playlistId) {
      return NextResponse.json(
        { ok: false, error: "Please paste a valid Spotify playlist link." },
        { status: 400 }
      );
    }

    const connection = await refreshSpotifyAccessTokenIfNeeded(locationSlug);

    const playlistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
      },
      cache: "no-store",
    });

    const playlistText = await playlistRes.text();
    const playlistJson: any = playlistText ? JSON.parse(playlistText) : {};

    if (!playlistRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: playlistJson?.error?.message || "Spotify playlist request failed.",
        },
        { status: playlistRes.status || 500 }
      );
    }

    const tracks = await fetchPlaylistTracks(playlistId, connection.accessToken);

    return NextResponse.json({
      ok: true,
      playlist: {
        id: playlistJson.id ?? playlistId,
        name: playlistJson.name ?? "Spotify Playlist",
        description: playlistJson.description ?? "",
        image: playlistJson.images?.[0]?.url ?? null,
        owner: playlistJson.owner?.display_name ?? playlistJson.owner?.id ?? "",
        totalTracks: tracks.length,
        externalUrl: playlistJson.external_urls?.spotify ?? null,
      },
      tracks,
      connection: {
        spotifyDisplayName: connection.spotifyDisplayName,
        spotifyUserId: connection.spotifyUserId,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to load Spotify playlist." },
      { status: 500 }
    );
  }
}
