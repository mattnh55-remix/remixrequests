import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { GOOGLE_BUSINESS_SCOPE, getGoogleBusinessEnv, makeGoogleState } from "@/lib/google-business";

export async function GET(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { clientId, redirectUri } = getGoogleBusinessEnv();
    const locationSlug = new URL(req.url).searchParams.get("locationSlug") || "remixrequests";
    const state = makeGoogleState(locationSlug);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId); url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code"); url.searchParams.set("scope", GOOGLE_BUSINESS_SCOPE);
    url.searchParams.set("access_type", "offline"); url.searchParams.set("prompt", "consent"); url.searchParams.set("state", state);
    const response = NextResponse.redirect(url);
    response.cookies.set("rr_google_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
    return response;
  } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || "Could not start Google connection." }, { status: 500 }); }
}
