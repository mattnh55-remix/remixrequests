import { prisma } from "@/lib/prisma";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "";

export const SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export type SpotifyConnectionRecord = {
  id: string;
  locationId: string;
  spotifyUserId: string | null;
  spotifyDisplayName: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string | null;
};

export function getSpotifyEnv() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or SPOTIFY_REDIRECT_URI"
    );
  }

  return {
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
    redirectUri: SPOTIFY_REDIRECT_URI,
  };
}

export function makeSpotifyState(locationSlug: string) {
  const nonce = Math.random().toString(36).slice(2, 10);
  return `${locationSlug}:${nonce}`;
}

export function parseSpotifyState(state: string | null | undefined) {
  if (!state) return null;
  const [locationSlug] = String(state).split(":");
  return locationSlug || null;
}

export async function getLocationBySlugOrThrow(locationSlug: string) {
  const location = await prisma.location.findUnique({
    where: { slug: locationSlug },
    select: { id: true, slug: true, name: true },
  });

  if (!location) {
    throw new Error(`Location not found for slug: ${locationSlug}`);
  }

  return location;
}

export async function upsertSpotifyConnection(params: {
  locationId: string;
  spotifyUserId?: string | null;
  spotifyDisplayName?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
  scope?: string | null;
}) {
  const expiresAt = new Date(Date.now() + Math.max(0, params.expiresIn - 60) * 1000);

  return prisma.spotifyConnection.upsert({
    where: { locationId: params.locationId },
    update: {
      spotifyUserId: params.spotifyUserId ?? null,
      spotifyDisplayName: params.spotifyDisplayName ?? null,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken ?? undefined,
      expiresAt,
      scope: params.scope ?? null,
    },
    create: {
      locationId: params.locationId,
      spotifyUserId: params.spotifyUserId ?? null,
      spotifyDisplayName: params.spotifyDisplayName ?? null,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken ?? null,
      expiresAt,
      scope: params.scope ?? null,
    },
  });
}

export async function getSpotifyConnectionByLocationSlug(locationSlug: string) {
  return prisma.spotifyConnection.findFirst({
    where: {
      location: { slug: locationSlug },
    },
  });
}

export async function refreshSpotifyAccessTokenIfNeeded(locationSlug: string) {
  const env = getSpotifyEnv();
  const connection = await getSpotifyConnectionByLocationSlug(locationSlug);

  if (!connection) {
    throw new Error("Spotify is not connected for this location yet.");
  }

  const nowPlusBuffer = Date.now() + 60_000;
  if (connection.expiresAt.getTime() > nowPlusBuffer && connection.accessToken) {
    return connection;
  }

  if (!connection.refreshToken) {
    throw new Error("Spotify refresh token is missing. Please reconnect Spotify.");
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${env.clientId}:${env.clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    }).toString(),
    cache: "no-store",
  });

  const tokenText = await tokenRes.text();
  const tokenJson = tokenText ? JSON.parse(tokenText) : {};

  if (!tokenRes.ok) {
    throw new Error(
      tokenJson?.error_description || tokenJson?.error || "Spotify refresh failed."
    );
  }

  const updated = await prisma.spotifyConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token || connection.refreshToken,
      expiresAt: new Date(Date.now() + Math.max(0, (tokenJson.expires_in ?? 3600) - 60) * 1000),
      scope: tokenJson.scope || connection.scope,
    },
  });

  return updated;
}
