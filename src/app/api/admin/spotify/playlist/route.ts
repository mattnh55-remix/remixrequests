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

type SpotifyTracksPage = {
  items?: Array<{
    track?: any | null;
  }>;
  next?: string | null;
  total?: number;
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

function withMarketFromToken(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}market=from_token`;
}

async function spotifyGetJson(url: string, accessToken: string) {
  const finalUrl = withMarketFromToken(url);

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

async function fetchPlaylistTracks(
  playlistId: string,
  accessToken: string
): Promise<{
  tracks: SpotifyTrack[];
  totalFromSpotify: number;
  skippedNullTracks: number;
}> {
  const allTracks: SpotifyTrack[] = [];
  let skippedNullTracks = 0;

  let nextUrl: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks` +
    `?limit=100&offset=0&additional_types=track` +
    `&fields=items(track(id,name,preview_url,duration_ms,artists(name),album(name,images))),next,total`;

  let totalFromSpotify = 0;

  while (nextUrl) {
    const result = await spotifyGetJson(nextUrl, accessToken);

    if (!result.ok) {
      const apiError = result.json as SpotifyApiErrorShape;
      throw new Error(
        `Spotify tracks request failed (${result.status}): ${
          apiError?.error?.message || result.text || "Unknown Spotify error"
        }`
      );
    }

    const page = result.json as SpotifyTracksPage;

    if (typeof page.total === "number") {
      totalFromSpotify = page.total;
    }

    for (const item of page.items ?? []) {
      if (!item?.track) {
        skippedNullTracks += 1;
        continue;
      }

      const mapped = mapTrack(item.track);
      if (mapped) {
        allTracks.push(mapped);
      } else {
        skippedNullTracks += 1;
      }
    }

    nextUrl = page.next ?? null;
  }

  return {
    tracks: allTracks,
    totalFromSpotify,
    skippedNullTracks,
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

    const meResult = await spotifyGetJson("https://api.spotify.com/v1/me", connection.accessToken);
    const meJson = meResult.json || {};

    const playlistResult = await spotifyGetJson(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,description,images,external_urls,owner(display_name,id)`,
      connection.accessToken
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
            playlistId,
            locationSlug,
            connectedSpotifyUserId: connection.spotifyUserId ?? null,
            connectedSpotifyDisplayName: connection.spotifyDisplayName ?? null,
            meId: meJson?.id ?? null,
            meDisplayName: meJson?.display_name ?? null,
            requestUrl: playlistResult.url,
          },
        },
        { status: playlistResult.status || 500 }
      );
    }

    const playlistJson: any = playlistResult.json || {};
    const trackResult = await fetchPlaylistTracks(playlistId, connection.accessToken);

    return NextResponse.json({
      ok: true,
      playlist: {
        id: playlistJson.id ?? playlistId,
        name: playlistJson.name ?? "Spotify Playlist",
        description: playlistJson.description ?? "",
        image: playlistJson.images?.[0]?.url ?? null,
        owner: playlistJson.owner?.display_name ?? playlistJson.owner?.id ?? "",
        totalTracks: trackResult.totalFromSpotify || trackResult.tracks.length,
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
        totalFromSpotify: trackResult.totalFromSpotify,
        usableTrackCount: trackResult.tracks.length,
        skippedNullTracks: trackResult.skippedNullTracks,
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