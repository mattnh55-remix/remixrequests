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

function mapItemsToTracks(items: Array<{ track?: any | null }> | undefined) {
  const tracks: SpotifyTrack[] = [];
  let skippedNullTracks = 0;

  for (const item of items ?? []) {
    if (!item?.track) {
      skippedNullTracks += 1;
      continue;
    }

    const mapped = mapTrack(item.track);
    if (mapped) {
      tracks.push(mapped);
    } else {
      skippedNullTracks += 1;
    }
  }

  return { tracks, skippedNullTracks };
}

async function fetchPlaylistTracksDirect(
  playlistId: string,
  accessToken: string
): Promise<{
  ok: boolean;
  tracks: SpotifyTrack[];
  totalFromSpotify: number;
  skippedNullTracks: number;
  debug: any;
}> {
  const allTracks: SpotifyTrack[] = [];
  let skippedNullTracks = 0;
  let totalFromSpotify = 0;

  let nextUrl: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks` +
    `?limit=100&offset=0&additional_types=track` +
    `&fields=items(track(id,name,preview_url,duration_ms,artists(name),album(name,images))),next,total`;

  while (nextUrl) {
    const result = await spotifyGetJson(nextUrl, accessToken, "US");

    if (!result.ok) {
      const apiError = result.json as SpotifyApiErrorShape;
      return {
        ok: false,
        tracks: [],
        totalFromSpotify: 0,
        skippedNullTracks: 0,
        debug: {
          strategy: "direct-tracks-endpoint",
          status: result.status,
          requestUrl: result.url,
          errorMessage: apiError?.error?.message || result.text || "Unknown Spotify error",
        },
      };
    }

    const page = result.json as SpotifyTracksPage;

    if (typeof page.total === "number") {
      totalFromSpotify = page.total;
    }

    const mapped = mapItemsToTracks(page.items);
    allTracks.push(...mapped.tracks);
    skippedNullTracks += mapped.skippedNullTracks;

    nextUrl = page.next ?? null;
  }

  return {
    ok: true,
    tracks: allTracks,
    totalFromSpotify,
    skippedNullTracks,
    debug: {
      strategy: "direct-tracks-endpoint",
      totalFromSpotify,
      usableTrackCount: allTracks.length,
      skippedNullTracks,
    },
  };
}

async function fetchPlaylistTracksEmbedded(
  playlistId: string,
  accessToken: string
): Promise<{
  ok: boolean;
  tracks: SpotifyTrack[];
  totalFromSpotify: number;
  skippedNullTracks: number;
  debug: any;
}> {
  const result = await spotifyGetJson(
    `https://api.spotify.com/v1/playlists/${playlistId}` +
      `?fields=tracks(total,items(track(id,name,preview_url,duration_ms,artists(name),album(name,images))))`,
    accessToken,
    "US"
  );

  if (!result.ok) {
    const apiError = result.json as SpotifyApiErrorShape;
    return {
      ok: false,
      tracks: [],
      totalFromSpotify: 0,
      skippedNullTracks: 0,
      debug: {
        strategy: "embedded-playlist-tracks",
        status: result.status,
        requestUrl: result.url,
        errorMessage: apiError?.error?.message || result.text || "Unknown Spotify error",
      },
    };
  }

  const tracksObj = result.json?.tracks || {};
  const mapped = mapItemsToTracks(tracksObj.items);

  return {
    ok: true,
    tracks: mapped.tracks,
    totalFromSpotify: typeof tracksObj.total === "number" ? tracksObj.total : mapped.tracks.length,
    skippedNullTracks: mapped.skippedNullTracks,
    debug: {
      strategy: "embedded-playlist-tracks",
      totalFromSpotify: typeof tracksObj.total === "number" ? tracksObj.total : mapped.tracks.length,
      usableTrackCount: mapped.tracks.length,
      skippedNullTracks: mapped.skippedNullTracks,
    },
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

    const meResult = await spotifyGetJson("https://api.spotify.com/v1/me", connection.accessToken, "US");
    const meJson = meResult.json || {};

    const playlistResult = await spotifyGetJson(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,description,images,external_urls,owner(display_name,id)`,
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
            requestUrl: playlistResult.url,
          },
        },
        { status: playlistResult.status || 500 }
      );
    }

    const playlistJson: any = playlistResult.json || {};

    const directResult = await fetchPlaylistTracksDirect(playlistId, connection.accessToken);
    let chosenResult = directResult;

    if (!directResult.ok || directResult.tracks.length === 0) {
      const embeddedResult = await fetchPlaylistTracksEmbedded(playlistId, connection.accessToken);

      if (embeddedResult.ok && embeddedResult.tracks.length > 0) {
        chosenResult = embeddedResult;
      } else if (!directResult.ok && embeddedResult.ok) {
        chosenResult = embeddedResult;
      } else {
        chosenResult = directResult.ok ? directResult : embeddedResult;
      }
    }

    if (!chosenResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Spotify tracks request failed (${chosenResult.debug?.status ?? 500}): ` +
            (chosenResult.debug?.errorMessage || "Forbidden"),
          debug: {
            phase: "playlist-tracks",
            playlistId,
            locationSlug,
            connectedSpotifyUserId: connection.spotifyUserId ?? null,
            connectedSpotifyDisplayName: connection.spotifyDisplayName ?? null,
            meId: meJson?.id ?? null,
            meDisplayName: meJson?.display_name ?? null,
            playlistOwnerId: playlistJson.owner?.id ?? null,
            playlistOwnerDisplayName: playlistJson.owner?.display_name ?? null,
            directAttempt: directResult.debug,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      playlist: {
        id: playlistJson.id ?? playlistId,
        name: playlistJson.name ?? "Spotify Playlist",
        description: playlistJson.description ?? "",
        image: playlistJson.images?.[0]?.url ?? null,
        owner: playlistJson.owner?.display_name ?? playlistJson.owner?.id ?? "",
        totalTracks: chosenResult.totalFromSpotify || chosenResult.tracks.length,
        externalUrl: playlistJson.external_urls?.spotify ?? null,
      },
      tracks: chosenResult.tracks,
      connection: {
        spotifyDisplayName: connection.spotifyDisplayName ?? null,
        spotifyUserId: connection.spotifyUserId ?? null,
      },
      debug: {
        meId: meJson?.id ?? null,
        meDisplayName: meJson?.display_name ?? null,
        playlistOwnerId: playlistJson.owner?.id ?? null,
        playlistOwnerDisplayName: playlistJson.owner?.display_name ?? null,
        chosenStrategy: chosenResult.debug?.strategy ?? null,
        totalFromSpotify: chosenResult.totalFromSpotify,
        usableTrackCount: chosenResult.tracks.length,
        skippedNullTracks: chosenResult.skippedNullTracks,
        directAttempt: directResult.debug,
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