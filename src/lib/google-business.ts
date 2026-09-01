import { prisma } from "@/lib/prisma";
import { decryptOAuthToken, encryptOAuthToken } from "@/lib/oauth-token-crypto";

const clientId = process.env.GOOGLE_CLIENT_ID || "";
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || "";

export const GOOGLE_BUSINESS_SCOPE = "https://www.googleapis.com/auth/business.manage";

export function getGoogleBusinessEnv() {
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_OAUTH_REDIRECT_URI");
  }
  return { clientId, clientSecret, redirectUri };
}

export function makeGoogleState(locationSlug: string) {
  return Buffer.from(JSON.stringify({ locationSlug, nonce: crypto.randomUUID() })).toString("base64url");
}

export function parseGoogleState(state: string | null) {
  try {
    const value = JSON.parse(Buffer.from(String(state || ""), "base64url").toString("utf8"));
    return typeof value?.locationSlug === "string" && typeof value?.nonce === "string" ? value : null;
  } catch { return null; }
}

async function googleJson(url: string, accessToken: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || "Google Business Profile request failed.");
  return json;
}

export async function getGoogleBusinessAccess(locationSlug: string) {
  const connection = await prisma.googleBusinessConnection.findFirst({ where: { location: { slug: locationSlug } } });
  if (!connection) throw new Error("Google Business Profile is not connected for this location.");
  if (connection.expiresAt.getTime() > Date.now() + 60_000) return { connection, accessToken: decryptOAuthToken(connection.accessToken) };
  if (!connection.refreshToken) throw new Error("Google refresh token is missing. Reconnect Google Business Profile.");
  const env = getGoogleBusinessEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.clientId, client_secret: env.clientSecret, refresh_token: decryptOAuthToken(connection.refreshToken), grant_type: "refresh_token" }).toString(), cache: "no-store" });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error_description || "Google token refresh failed.");
  const updated = await prisma.googleBusinessConnection.update({ where: { id: connection.id }, data: { accessToken: encryptOAuthToken(json.access_token), expiresAt: new Date(Date.now() + Math.max(0, (json.expires_in || 3600) - 60) * 1000), scope: json.scope || connection.scope } });
  return { connection: updated, accessToken: json.access_token as string };
}

export async function listGoogleReviews(locationSlug: string) {
  const { connection, accessToken } = await getGoogleBusinessAccess(locationSlug);
  const data = await googleJson(`https://mybusiness.googleapis.com/v4/${connection.googleAccount}/${connection.googleLocation}/reviews?orderBy=updateTime%20desc&pageSize=10`, accessToken);
  return (Array.isArray(data?.reviews) ? data.reviews : []).map((review: any) => ({
    id: review.reviewId || review.name,
    reviewer: review.reviewer?.displayName || "Google guest",
    rating: review.starRating || "UNSPECIFIED",
    comment: review.comment || "",
    updatedAt: review.updateTime || review.createTime || null,
    hasReply: Boolean(review.reviewReply?.comment),
  }));
}
