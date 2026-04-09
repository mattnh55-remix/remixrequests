import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import {
  SPOTIFY_SCOPES,
  getSpotifyEnv,
  makeSpotifyState,
} from "@/lib/spotify-oauth";

export async function GET(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, redirectUri } = getSpotifyEnv();
    const { searchParams } = new URL(req.url);
    const locationSlug = searchParams.get("locationSlug") || "remixrequests";
    const state = makeSpotifyState(locationSlug);

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("scope", SPOTIFY_SCOPES);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("show_dialog", "true");

    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to start Spotify login." },
      { status: 500 }
    );
  }
}
