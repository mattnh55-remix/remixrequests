import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import {
  getLocationBySlugOrThrow,
  getSpotifyEnv,
  parseSpotifyState,
  upsertSpotifyConnection,
} from "@/lib/spotify-oauth";

export async function GET(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) {
      return NextResponse.redirect(new URL("/admin/import?spotify=unauthorized", req.url));
    }

    const { clientId, clientSecret, redirectUri } = getSpotifyEnv();
    const { searchParams, origin } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const locationSlug = parseSpotifyState(state) || "remixrequests";

    if (error) {
      return NextResponse.redirect(
        new URL(`/admin/import?locationSlug=${encodeURIComponent(locationSlug)}&spotify_error=${encodeURIComponent(error)}`, origin)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(`/admin/import?locationSlug=${encodeURIComponent(locationSlug)}&spotify_error=missing_code`, origin)
      );
    }

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
      cache: "no-store",
    });

    const tokenText = await tokenRes.text();
    const tokenJson = tokenText ? JSON.parse(tokenText) : {};

    if (!tokenRes.ok) {
      throw new Error(
        tokenJson?.error_description || tokenJson?.error || "Spotify token exchange failed."
      );
    }

    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
      cache: "no-store",
    });

    const profileText = await profileRes.text();
    const profileJson = profileText ? JSON.parse(profileText) : {};

    if (!profileRes.ok) {
      throw new Error(
        profileJson?.error?.message || "Spotify profile fetch failed."
      );
    }

    const location = await getLocationBySlugOrThrow(locationSlug);

    await upsertSpotifyConnection({
      locationId: location.id,
      spotifyUserId: profileJson.id || null,
      spotifyDisplayName: profileJson.display_name || profileJson.id || null,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token || null,
      expiresIn: tokenJson.expires_in ?? 3600,
      scope: tokenJson.scope || null,
    });

    return NextResponse.redirect(
      new URL(`/admin/import?locationSlug=${encodeURIComponent(locationSlug)}&spotify=connected`, origin)
    );
  } catch (error: any) {
    const url = new URL(req.url);
    const origin = url.origin;
    return NextResponse.redirect(
      new URL(`/admin/import?spotify_error=${encodeURIComponent(error?.message || "Spotify connect failed")}`, origin)
    );
  }
}
