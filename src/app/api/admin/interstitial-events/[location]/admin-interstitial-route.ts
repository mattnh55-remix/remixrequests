import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const locationRow = await prisma.location.findFirst({
    where: {
      OR: [{ id: params.location }, { slug: params.location }],
    },
    select: { id: true },
  });

  if (!locationRow) {
    return NextResponse.json(
      { ok: false, error: "Invalid location" },
      { status: 400 }
    );
  }

  const where: any = {
    locationId: locationRow.id,
  };

  if (status) where.status = status;
  if (category) where.category = category;

  const events = await prisma.interstitialEvent.findMany({
    where,
    orderBy: [
      { skippedAt: "desc" },
      { playedAt: "desc" },
      { plannedAt: "desc" },
      { canceledAt: "desc" },
    ],
    take: 200,
    select: {
      id: true,
      category: true,
      status: true,
      assetId: true,
      scheduleId: true,
      operatorNote: true,
      playedAt: true,
      skippedAt: true,
      plannedAt: true,
      canceledAt: true,
      promptMinute: true,
      sessionId: true,
    },
  });

  return NextResponse.json({
    ok: true,
    events,
  });
}