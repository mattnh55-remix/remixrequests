//--- src/app/api/public/top10/[location]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import {
  getTop10BucketAt,
  getTop10DisplayLabel,
  getTop10Title,
  normalizeTop10Bucket,
} from "@/lib/top10";

type Top10Bucket = "GENERAL" | "ADULT";

function resolveBucket(explicitBucket: Top10Bucket | null, rules: any): Top10Bucket {
  if (explicitBucket) return explicitBucket;

  // Default is intentionally OFF. If this rule is not enabled, the public TV
  // board remains the all-ages/general board all day.
  if (!Boolean(rules?.top10AdultModeEnabled ?? false)) {
    return "GENERAL";
  }

  return getTop10BucketAt(new Date(), rules as any);
}

function preferredAudienceForBucket(bucket: Top10Bucket) {
  return bucket === "ADULT" ? ["adult", "both", "ADULT", "BOTH"] : ["general", "both", "all", "GENERAL", "BOTH", "ALL"];
}

export async function GET(req: Request, { params }: { params: { location: string } }) {
  const { loc, rules } = await getRulesForLocation(params.location);
  const { searchParams } = new URL(req.url);

  if (!Boolean((rules as any)?.top10Enabled ?? true)) {
    return NextResponse.json({
      ok: true,
      location: { slug: loc.slug, name: loc.name },
      bucket: "GENERAL",
      boardTitle: "Top 10 Paused",
      displayLabel: "TOP 10 PAUSED",
      updatedAt: new Date().toISOString(),
      logoUrl: (rules as any)?.logoUrl ?? null,
      queueCount: 0,
      dataSource: "DISABLED",
      items: [],
    });
  }

  const explicitBucket =
    normalizeTop10Bucket(searchParams.get("display")) ||
    normalizeTop10Bucket(searchParams.get("bucket"));

  const bucket = resolveBucket(explicitBucket as Top10Bucket | null, rules as any);

  const top10Items = await prisma.top10Entry.findMany({
    where: {
      locationId: loc.id,
      bucket,
    },
    orderBy: [{ score: "desc" }, { lastActivityAt: "desc" }, { createdAt: "asc" }],
    take: 10,
  });

  const queueCount = await prisma.request.count({
    where: { locationId: loc.id, status: "APPROVED" },
  });

  const hasRealTop10 = top10Items.length > 0;

  const featuredSongs = hasRealTop10
    ? []
    : await prisma.song.findMany({
        where: {
          locationId: loc.id,
          active: true,
          explicit: false,
          OR: [
            { featureBoost: { gt: 0 } },
            { preferredAudience: { in: preferredAudienceForBucket(bucket) } },
            { preferredAudience: null },
          ],
        },
        orderBy: [{ featureBoost: "desc" }, { songWeight: "desc" }, { createdAt: "desc" }],
        take: 10,
      });

  const items = hasRealTop10
    ? top10Items.map((item) => ({
        id: item.id,
        songId: item.songId,
        title: item.title,
        artist: item.artist,
        artworkUrl: item.artworkUrl,
        score: item.score,
        requestCount: item.requestCount,
        upvotes: item.upvotes,
        downvotes: item.downvotes,
        lastActivityAt: item.lastActivityAt,
        createdAt: item.createdAt,
        filler: false,
      }))
    : featuredSongs.map((song, index) => ({
        id: `featured-${song.id}`,
        songId: song.id,
        title: song.title,
        artist: song.artist,
        artworkUrl: song.artworkUrl,
        score: Math.max(0, Number(song.featureBoost || 0)),
        requestCount: 0,
        upvotes: 0,
        downvotes: 0,
        lastActivityAt: song.createdAt,
        createdAt: song.createdAt,
        filler: true,
        rank: index + 1,
      }));

  const baseTitle = getTop10Title(bucket);
  const baseLabel = getTop10DisplayLabel(bucket);

  return NextResponse.json({
    ok: true,
    location: { slug: loc.slug, name: loc.name },
    bucket,
    boardTitle: hasRealTop10 ? baseTitle : "Featured Tracks",
    displayLabel: hasRealTop10 ? baseLabel : "FEATURED TRACKS",
    updatedAt: new Date().toISOString(),
    logoUrl: (rules as any)?.logoUrl ?? null,
    queueCount,
    dataSource: hasRealTop10 ? "TOP10" : "FEATURED_TRACKS",
    items,
  });
}
