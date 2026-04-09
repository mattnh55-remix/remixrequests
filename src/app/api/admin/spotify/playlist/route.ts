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

type SpotifyTrackItem = {
  track?: any;
};

type SpotifyTracksPage = {
  items?: SpotifyTrackItem[];
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

async function fetchRemainingTrackPages(
  nextUrl: string | null | undefined,
  accessToken: string
): Promise<SpotifyTrack[]> {
  const allTracks: SpotifyTrack[] = [];
  let currentUrl: string | null = nextUrl ?? null;

  while (currentUrl) {
    const result = await spotifyGetJson(currentUrl, accessToken);

    if (!result.ok) {
      const apiError = result.json as SpotifyApiErrorShape;
      throw new Error(
        `Spotify tracks request failed (${result.status}): ${
          apiError?.error?.message || result.text || "Unknown Spotify error"
        }`
      );
    }

    const page = result.json as SpotifyTracksPage;

    for (const item of page.items ?? []) {
      const mapped = mapTrack(item?.track);
      if (mapped) allTracks.push(mapped);
    }

    currentUrl = page.next ?? null;
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

    const meResult = await spotifyGetJson("https://api.spotify.com/v1/me", connection.accessToken);
    const meJson = meResult.json || {};

    const playlistResult = await spotifyGetJson(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,description,images,external_urls,owner(display_name,id),tracks(total,next,items(track(id,name,preview_url,duration_ms,artists(name),album(name,images))))`,
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
    const firstTracksPage: SpotifyTracksPage = playlistJson?.tracks || {};

    const initialTracks: SpotifyTrack[] = [];
    for (const item of firstTracksPage.items ?? []) {
      const mapped = mapTrack(item?.track);
      if (mapped) initialTracks.push(mapped);
    }

    let remainingTracks: SpotifyTrack[] = [];
    if (firstTracksPage.next) {
      remainingTracks = await fetchRemainingTrackPages(firstTracksPage.next, connection.accessToken);
    }

    const tracks = [...initialTracks, ...remainingTracks];

    return NextResponse.json({
      ok: true,
      playlist: {
        id: playlistJson.id ?? playlistId,
        name: playlistJson.name ?? "Spotify Playlist",
        description: playlistJson.description ?? "",
        image: playlistJson.images?.[0]?.url ?? null,
        owner: playlistJson.owner?.display_name ?? playlistJson.owner?.id ?? "",
        totalTracks: typeof firstTracksPage.total === "number" ? firstTracksPage.total : tracks.length,
        externalUrl: playlistJson.external_urls?.spotify ?? null,
      },
      tracks,
      connection: {
        spotifyDisplayName: connection.spotifyDisplayName ?? null,
        spotifyUserId: connection.spotifyUserId ?? null,
      },
      debug: {
        meId: meJson?.id ?? null,
        meDisplayName: meJson?.display_name ?? null,
        playlistOwnerId: playlistJson.owner?.id ?? null,
        playlistOwnerDisplayName: playlistJson.owner?.display_name ?? null,
        usedEmbeddedTracks: true,
        embeddedTrackCount: initialTracks.length,
        pagedExtraTrackCount: remainingTracks.length,
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