import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { getTop10BucketAt, normalizeTop10Bucket } from "@/lib/top10";
import { Top10Bucket } from "@prisma/client";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const location = String(body.location || "").trim();
  const resetMode = String(body.resetMode || "current").trim().toLowerCase();
  const explicitBucket = normalizeTop10Bucket(body.bucket);

  if (!location) {
    return NextResponse.json({ ok: false, error: "Missing location." }, { status: 400 });
  }

  const { loc, rules } = await getRulesForLocation(location);
  const session = await getOrCreateCurrentSession(loc.id, 4);
  const currentBucket = getTop10BucketAt(new Date(), rules as any);

  let buckets: Top10Bucket[];
  if (resetMode === "all") {
    buckets = [Top10Bucket.GENERAL, Top10Bucket.ADULT];
  } else if (explicitBucket) {
    buckets = [explicitBucket];
  } else {
    buckets = [currentBucket];
  }

  const result = await prisma.top10Entry.deleteMany({
    where: {
      locationId: loc.id,
      sessionId: session.id,
      bucket: { in: buckets },
    },
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    deletedCount: result.count,
    buckets,
  });
}
