import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { getTop10BucketAt, getTop10Title, normalizeTop10Bucket } from "@/lib/top10";

export async function GET(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc, rules } = await getRulesForLocation(params.location);
  const session = await getOrCreateCurrentSession(loc.id, 4);
  const { searchParams } = new URL(req.url);
  const bucket =
    normalizeTop10Bucket(searchParams.get("bucket")) || getTop10BucketAt(new Date(), rules as any);

  const items = await prisma.top10Entry.findMany({
    where: { locationId: loc.id, sessionId: session.id, bucket },
    orderBy: [{ score: "desc" }, { lastActivityAt: "desc" }, { createdAt: "asc" }],
    take: 25,
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    bucket,
    boardTitle: getTop10Title(bucket),
    updatedAt: new Date().toISOString(),
    items,
  });
}
