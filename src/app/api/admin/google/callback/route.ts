import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleBusinessEnv, parseGoogleState } from "@/lib/google-business";
import { encryptOAuthToken } from "@/lib/oauth-token-crypto";
import { isAdminFromCookie } from "@/lib/adminAuth";

async function googleJson(url: string, accessToken: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || "Could not read Google Business Profile.");
  return json;
}

export async function GET(req: Request) {
  const url = new URL(req.url); const origin = url.origin;
  const finish = (slug: string, params: Record<string, string>) => NextResponse.redirect(new URL(`/admin/${encodeURIComponent(slug)}?${new URLSearchParams({ tab: "dashboard", ...params })}`, origin));
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) throw new Error("Your admin session expired. Sign in and connect Google again.");
    const state = url.searchParams.get("state"); const parsed = parseGoogleState(state);
    if (!parsed || state !== req.headers.get("cookie")?.match(/(?:^|;\s*)rr_google_oauth_state=([^;]+)/)?.[1]) throw new Error("Google connection expired. Start the connection again.");
    const slug = parsed.locationSlug; const error = url.searchParams.get("error");
    if (error) return finish(slug, { google_error: error });
    const code = url.searchParams.get("code"); if (!code) return finish(slug, { google_error: "missing_code" });
    const env = getGoogleBusinessEnv();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: env.clientId, client_secret: env.clientSecret, redirect_uri: env.redirectUri, grant_type: "authorization_code" }).toString(), cache: "no-store" });
    const token = await tokenResponse.json().catch(() => ({})); if (!tokenResponse.ok) throw new Error(token?.error_description || "Google token exchange failed.");
    const accounts = await googleJson("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", token.access_token);
    const choices: Array<{ account: any; business: any }> = [];
    for (const account of accounts?.accounts || []) {
      if (!account?.name) continue;
      const locations = await googleJson(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title&pageSize=100`, token.access_token);
      for (const business of locations?.locations || []) if (business?.name) choices.push({ account, business });
    }
    if (choices.length === 0) throw new Error("No Google Business Profile location was found for this Google user.");
    if (choices.length > 1) throw new Error("More than one Google Business Profile location was found. Location selection will be added before connecting.");
    const { account, business } = choices[0];
    const location = await prisma.location.findUnique({ where: { slug }, select: { id: true } }); if (!location) throw new Error("Remix location not found.");
    await prisma.googleBusinessConnection.upsert({ where: { locationId: location.id }, update: { googleAccount: account.name, googleLocation: business.name, displayName: business.title || null, accessToken: encryptOAuthToken(token.access_token), refreshToken: token.refresh_token ? encryptOAuthToken(token.refresh_token) : undefined, expiresAt: new Date(Date.now() + Math.max(0, (token.expires_in || 3600) - 60) * 1000), scope: token.scope || null }, create: { locationId: location.id, googleAccount: account.name, googleLocation: business.name, displayName: business.title || null, accessToken: encryptOAuthToken(token.access_token), refreshToken: token.refresh_token ? encryptOAuthToken(token.refresh_token) : null, expiresAt: new Date(Date.now() + Math.max(0, (token.expires_in || 3600) - 60) * 1000), scope: token.scope || null } });
    const response = finish(slug, { google: "connected" }); response.cookies.set("rr_google_oauth_state", "", { maxAge: 0, path: "/" }); return response;
  } catch (error: any) { return finish("remixrequests", { google_error: error?.message || "Google connect failed" }); }
}
