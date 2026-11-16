import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { refreshSpotifyAccessTokenIfNeeded } from "@/lib/spotify-oauth";

export async function GET(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locationSlug = searchParams.get("locationSlug") || "remixrequests";

    const location = await prisma.location.findUnique({
      where: { slug: locationSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        spotifyConnection: {
          select: {
            spotifyUserId: true,
            spotifyDisplayName: true,
            expiresAt: true,
            scope: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
    }

    let spotify: Record<string, unknown> = { connected: false };

    if (location.spotifyConnection) {
      try {
        // A saved row only proves that Spotify was connected in the past. Refreshing
        // an expired token here prevents the UI from showing a stale connection as live.
        const connection = await refreshSpotifyAccessTokenIfNeeded(locationSlug);
        spotify = {
          connected: true,
          spotifyUserId: connection.spotifyUserId,
          spotifyDisplayName: connection.spotifyDisplayName,
          expiresAt: connection.expiresAt,
          scope: connection.scope,
          updatedAt: connection.updatedAt,
        };
      } catch {
        spotify = {
          connected: false,
          reconnectRequired: true,
          spotifyUserId: location.spotifyConnection.spotifyUserId,
          spotifyDisplayName: location.spotifyConnection.spotifyDisplayName,
          scope: location.spotifyConnection.scope,
          error: "Spotify authorization has expired or was revoked. Reconnect Spotify to continue.",
        };
      }
    }

    return NextResponse.json({
      ok: true,
      location: {
        id: location.id,
        slug: location.slug,
        name: location.name,
      },
      spotify,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to load Spotify status." },
      { status: 500 }
    );
  }
}
