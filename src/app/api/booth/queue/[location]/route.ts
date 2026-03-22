import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { isAdminFromCookie } from "@/lib/adminAuth";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function GET(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const locationSlug = String(params.location || "").trim();
    if (!locationSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing location." },
        { status: 400 }
      );
    }

    const { loc } = await getRulesForLocation(locationSlug);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const items = await prisma.queueItem.findMany({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: {
          in: ["QUEUED", "LOADED", "PLAYING", "HELD", "PLAYED", "SKIPPED"],
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

    const nowMs = Date.now();

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      items: items.map((item) => {
        const startedAt = item.playingAt ?? null;
        const durationSec = item.durationSec ?? null;
        const expectedEndAt =
          item.expectedEndAt ??
          (startedAt && durationSec
            ? new Date(startedAt.getTime() + durationSec * 1000)
            : null);

        const elapsedSec =
          startedAt ? Math.max(0, Math.floor((nowMs - startedAt.getTime()) / 1000)) : 0;

        const remainingSec =
          durationSec != null ? Math.max(0, durationSec - elapsedSec) : null;

        const progressPercent =
          durationSec && durationSec > 0
            ? Math.min(100, Math.max(0, (elapsedSec / durationSec) * 100))
            : 0;

        return {
          id: item.id,
          requestId: item.requestId,
          position: item.position,
          status: item.status,
          sourceType: item.sourceType,
          introAssigned: item.introAssigned,
          clusterId: item.clusterId,

          loadedAt: toIso(item.loadedAt),
          playingAt: toIso(item.playingAt),
          completedAt: toIso(item.completedAt),
          createdAt: toIso(item.createdAt),

          durationSec,
          startedAt: toIso(startedAt),
          expectedEndAt: toIso(expectedEndAt),
          elapsedSec,
          remainingSec,
          progressPercent,
          isEndingSoon: remainingSec != null ? remainingSec <= 20 : false,

          title: item.request?.song?.title ?? null,
          artist: item.request?.song?.artist ?? null,
          artworkUrl: item.request?.song?.artworkUrl ?? null,
          explicit: item.request?.song?.explicit ?? null,
        };
      }),
    });
  } catch (error) {
    console.error("booth queue get error", error);
    return NextResponse.json(
      { ok: false, error: "Could not load booth queue." },
      { status: 500 }
    );
  }
}