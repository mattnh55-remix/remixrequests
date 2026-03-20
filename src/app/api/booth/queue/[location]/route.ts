import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function GET(
  req: Request,
  { params }: { params: { location: string } }
) {

   if (!isAdminFromCookie(req.headers.get("cookie"))) {
     return NextResponse.json({ ok: false }, { status: 401 });
   }

  const { loc } = await getRulesForLocation(params.location);
  const session = await getOrCreateCurrentSession(loc.id, 4);

  const items = await prisma.queueItem.findMany({
    where: {
      locationId: loc.id,
      sessionId: session.id,
      status: {
        in: ["QUEUED", "LOADED", "PLAYING", "HELD"],
      },
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      request: {
        include: {
          song: {
            select: {
              id: true,
              title: true,
              artist: true,
              artworkUrl: true,
              explicit: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    items: items.map((item) => ({
      id: item.id,
      requestId: item.requestId,
      position: item.position,
      status: item.status,
      sourceType: item.sourceType,
      introAssigned: item.introAssigned,
      clusterId: item.clusterId,
      loadedAt: item.loadedAt,
      playingAt: item.playingAt,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      title: item.request?.song?.title ?? null,
      artist: item.request?.song?.artist ?? null,
      artworkUrl: item.request?.song?.artworkUrl ?? null,
      explicit: item.request?.song?.explicit ?? null,
    })),
  });
}