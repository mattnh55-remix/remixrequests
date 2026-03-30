import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import {
  getTop10BucketAt,
  getTop10DisplayLabel,
  getTop10Title,
  normalizeTop10Bucket,
} from "@/lib/top10";

export async function GET(req: Request, { params }: { params: { location: string } }) {
  const { loc, rules } = await getRulesForLocation(params.location);
  const { searchParams } = new URL(req.url);

  const explicitBucket =
    normalizeTop10Bucket(searchParams.get("display")) ||
    normalizeTop10Bucket(searchParams.get("bucket"));

  const bucket = explicitBucket || getTop10BucketAt(new Date(), rules as any);

  const items = await prisma.top10Entry.findMany({
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

  return NextResponse.json({
    ok: true,
    location: { slug: loc.slug, name: loc.name },
    bucket,
    boardTitle: getTop10Title(bucket),
    displayLabel: getTop10DisplayLabel(bucket),
    updatedAt: new Date().toISOString(),
    logoUrl: (rules as any)?.logoUrl ?? null,
    queueCount,
    items: items.map((item) => ({
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
    })),
  });
}
