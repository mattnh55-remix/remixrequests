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

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const query = String(body?.query || "").trim();
    const locationSlug = String(body?.locationSlug || "remixrequests");

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Please enter a song title or artist name." },
        { status: 400 }
      );
    }

    const connection = await refreshSpotifyAccessTokenIfNeeded(locationSlug);

    const searchUrl =
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`;

    const result = await spotifyGetJson(searchUrl, connection.accessToken, "US");

    if (!result.ok) {
      const apiError = result.json as SpotifyApiErrorShape;

      return NextResponse.json(
        {
          ok: false,
          error:
            `Spotify search failed (${result.status}): ` +
            (apiError?.error?.message || result.text || "Unknown Spotify error"),
        },
        { status: result.status || 500 }
      );
    }

    const items = Array.isArray(result.json?.tracks?.items)
      ? result.json.tracks.items
      : [];

    const tracks = items.map(mapTrack).filter(Boolean);

    return NextResponse.json({
      ok: true,
      tracks,
      query,
      total: typeof result.json?.tracks?.total === "number" ? result.json.tracks.total : tracks.length,
      connection: {
        spotifyDisplayName: connection.spotifyDisplayName ?? null,
        spotifyUserId: connection.spotifyUserId ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to search Spotify.",
      },
      { status: 500 }
    );
  }
}