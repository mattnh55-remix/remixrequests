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

type SpotifyApiErrorShape = {
  error?: {
    status?: number;
    message?: string;
  };
};

function extractPlaylistId(input: string): string | null {
  const trimmed = String(input || "").trim();
  const match = trimmed.match(/playlist\/([a-zA-Z0-9]+)(\?|$)/);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;
  return null;
}

function parseJsonSafe(text: string): any {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function addMarket(url: string, market = "US"): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}market=${encodeURIComponent(market)}`;
}

async function spotifyGetJson(url: string, accessToken: string, market = "US") {
  const finalUrl = addMarket(url, market);

  const res = await fetch(finalUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const text = await res.text();
  const json = parseJsonSafe(text);

  return {
    ok: res.ok,
    status: res.status,
    text,
    json,
    url: finalUrl,
  };
}

function mapTrack(track: any): SpotifyTrack | null {
  if (!track) return null;

  const trackId = typeof track.id === "string" ? track.id : null;
  const title = typeof track.name === "string" ? track.name : "";

  if (!trackId || !title) return null;

  return {
    title,
    artist: Array.isArray(track.artists)
      ? track.artists.map((a: any) => a?.name).filter(Boolean).join(", ")
      : "",
    album: track.album?.name ?? "",
    albumArt: track.album?.images?.[0]?.url ?? null,
    spotifyId: trackId,
    previewUrl: track.preview_url ?? null,
    durationMs: typeof track.duration_ms === "number" ? track.duration_ms : null,
  };
}

async function fetchPlaylistTracks(
  playlistId: string,
  accessToken: string
): Promise<{
  tracks: SpotifyTrack[];
  totalFromSpotify: number;
  rawItemCount: number;
  nullTrackCount: number;
  unmappableTrackCount: number;
}> {
  const allTracks: SpotifyTrack[] = [];
  let rawItemCount = 0;
  let nullTrackCount = 0;
  let unmappableTrackCount = 0;
  let totalFromSpotify = 0;

  let nextUrl: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&offset=0`;

  while (nextUrl) {
    const result = await spotifyGetJson(nextUrl, accessToken, "US");

    if (!result.ok) {
      const apiError = result.json as SpotifyApiErrorShape;
      throw new Error(
        `Spotify tracks request failed (${result.status}): ${
          apiError?.error?.message || result.text || "Unknown Spotify error"
        }`
      );
    }

    const page = result.json || {};
    const items = Array.isArray(page.items) ? page.items : [];

    if (typeof page.total === "number") {
      totalFromSpotify = page.total;
    }

    rawItemCount += items.length;

    for (const item of items) {
      const rawTrack = item?.track;

      if (!rawTrack) {
        nullTrackCount += 1;
        continue;
      }

      const mapped = mapTrack(rawTrack);

      if (!mapped) {
        unmappableTrackCount += 1;
        continue;
      }

      allTracks.push(mapped);
    }

    nextUrl = typeof page.next === "string" ? page.next : null;
  }

  return {
    tracks: allTracks,
    totalFromSpotify,
    rawItemCount,
    nullTrackCount,
    unmappableTrackCount,
  };
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

    const meResult = await spotifyGetJson(
      "https://api.spotify.com/v1/me",
      connection.accessToken,
      "US"
    );
    const meJson = meResult.json || {};

    const playlistResult = await spotifyGetJson(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      connection.accessToken,
      "US"
    );

    if (!playlistResult.ok) {
      const apiError = playlistResult.json as SpotifyApiErrorShape;

      return NextResponse.json(
        {
          ok: false,
          error:
            `Spotify playlist request failed (${playlistResult.status}): ` +
            (apiError?.error?.message || playlistResult.text || "Unknown Spotify error"),
          debug: {
            phase: "playlist-metadata",
            playlistId,
            locationSlug,
            connectedSpotifyUserId: connection.spotifyUserId ?? null,
            connectedSpotifyDisplayName: connection.spotifyDisplayName ?? null,
            meId: meJson?.id ?? null,
            meDisplayName: meJson?.display_name ?? null,
            playlistOwnerId: playlistResult.json?.owner?.id ?? null,
            playlistOwnerDisplayName: playlistResult.json?.owner?.display_name ?? null,
            requestUrl: playlistResult.url,
          },
        },
        { status: playlistResult.status || 500 }
      );
    }

    const playlistJson = playlistResult.json || {};
    const trackResult = await fetchPlaylistTracks(playlistId, connection.accessToken);

    return NextResponse.json({
  ok: true,
  playlist: {
    id: playlistJson.id ?? playlistId,
    name: playlistJson.name ?? "Spotify Playlist",
    description: playlistJson.description ?? "",
    image: playlistJson.images?.[0]?.url ?? null,
    owner: playlistJson.owner?.display_name ?? playlistJson.owner?.id ?? "",
    ownerId: playlistJson.owner?.id ?? null,
    totalTracks:
      typeof trackResult.totalFromSpotify === "number" && trackResult.totalFromSpotify > 0
        ? trackResult.totalFromSpotify
        : trackResult.tracks.length,
    externalUrl: playlistJson.external_urls?.spotify ?? null,
  },
  tracks: trackResult.tracks,
  connection: {
    spotifyDisplayName: connection.spotifyDisplayName ?? null,
    spotifyUserId: connection.spotifyUserId ?? null,
  },
  debug: {
    meId: meJson?.id ?? null,
    meDisplayName: meJson?.display_name ?? null,
    playlistOwnerId: playlistJson.owner?.id ?? null,
    playlistOwnerDisplayName: playlistJson.owner?.display_name ?? null,
    savedConnectionUserId: connection.spotifyUserId ?? null,
    rawItemCount: trackResult.rawItemCount,
    usableTrackCount: trackResult.tracks.length,
    nullTrackCount: trackResult.nullTrackCount,
    unmappableTrackCount: trackResult.unmappableTrackCount,
  },
});
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to load Spotify playlist.",
      },
      { status: 500 }
    );
  }
}