import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({
      ok: true,
      location: {
        id: location.id,
        slug: location.slug,
        name: location.name,
      },
      spotify: location.spotifyConnection
        ? {
            connected: true,
            spotifyUserId: location.spotifyConnection.spotifyUserId,
            spotifyDisplayName: location.spotifyConnection.spotifyDisplayName,
            expiresAt: location.spotifyConnection.expiresAt,
            scope: location.spotifyConnection.scope,
            updatedAt: location.spotifyConnection.updatedAt,
          }
        : {
            connected: false,
          },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to load Spotify status." },
      { status: 500 }
    );
  }
}
