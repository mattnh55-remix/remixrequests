import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";

type AddMode = "BOTTOM" | "PLAY_NEXT" | "AFTER_CURRENT";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeMode(input: unknown): AddMode | null {
  const value = String(input || "").trim().toUpperCase();

  if (value === "BOTTOM" || value === "ADD_TO_QUEUE" || value === "QUEUE_BOTTOM") {
    return "BOTTOM";
  }

  if (value === "PLAY_NEXT" || value === "NEXT") {
    return "PLAY_NEXT";
  }

  if (value === "AFTER_CURRENT" || value === "ADD_AFTER_CURRENT") {
    return "AFTER_CURRENT";
  }

  return null;
}

function resolveInsertIndex(
  activeItems: { id: string; status: string }[],
  mode: AddMode
) {
  if (mode === "BOTTOM") {
    return activeItems.length;
  }

  const playingIndex = activeItems.findIndex((item) => item.status === "PLAYING");
  const loadedIndexes = activeItems
    .map((item, index) => ({ status: item.status, index }))
    .filter((item) => item.status === "LOADED")
    .map((item) => item.index);

  const lastLoadedIndex =
    loadedIndexes.length > 0 ? loadedIndexes[loadedIndexes.length - 1] : -1;

  if (mode === "AFTER_CURRENT") {
    if (playingIndex >= 0) return playingIndex + 1;
    if (lastLoadedIndex >= 0) return lastLoadedIndex + 1;
    return 0;
  }

  if (lastLoadedIndex >= 0) return lastLoadedIndex + 1;
  if (playingIndex >= 0) return playingIndex + 1;
  return 0;
}

export async function POST(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const songId = String(body.songId || "").trim();
  const mode = normalizeMode(body.mode ?? "BOTTOM");

  if (!songId) return jsonFail("Missing songId.");
  if (!mode) return jsonFail("Invalid mode.");

  try {
    const { loc } = await getRulesForLocation(params.location);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const song = await prisma.song.findFirst({
      where: {
        id: songId,
        locationId: loc.id,
      },
      select: {
        id: true,
        title: true,
        artist: true,
      },
    });

    if (!song) {
      return jsonFail("Song not found.", 404);
    }

    const duplicateActiveItem = await prisma.queueItem.findFirst({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: {
          in: ["QUEUED", "LOADED", "PLAYING", "HELD"],
        },
        request: {
          is: {
            songId: song.id,
          },
        },
      },
      select: { id: true },
    });

    if (duplicateActiveItem) {
      return jsonFail("That song is already active in the booth queue.", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const activeItems = await tx.queueItem.findMany({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: {
            in: ["QUEUED", "LOADED", "PLAYING", "HELD"],
          },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          status: true,
        },
      });

      const insertIndex = resolveInsertIndex(activeItems, mode);
      const tempPosition = activeItems.length + 1;

      const reqRow = await tx.request.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          songId: song.id,
          emailHash: "__booth_admin__",
          type: "NEXT",
          status: "APPROVED",
        },
      });

      const queueItem = await tx.queueItem.create({
        data: {
          requestId: reqRow.id,
          locationId: loc.id,
          sessionId: session.id,
          status: "QUEUED",
          position: tempPosition,
          sourceType: "HOUSE",
          introAssigned: false,
        },
      });

      const finalOrderedIds = [...activeItems.map((item) => item.id)];
      finalOrderedIds.splice(insertIndex, 0, queueItem.id);

      for (let index = 0; index < finalOrderedIds.length; index++) {
        await tx.queueItem.update({
          where: { id: finalOrderedIds[index] },
          data: { position: index + 1 },
        });
      }

      await tx.playbackEvent.create({
        data: {
          locationId: loc.id,
          queueItemId: queueItem.id,
          type: "QUEUED",
          metadata: {
            requestId: reqRow.id,
            songId: song.id,
            source: "booth_add_song",
            mode,
            sourceType: "HOUSE",
          },
        },
      });

      return {
        queueItemId: queueItem.id,
        requestId: reqRow.id,
      };
    });

    return NextResponse.json({
      ok: true,
      songTitle: song.title,
      songArtist: song.artist,
      queueItemId: result.queueItemId,
      requestId: result.requestId,
    });
  } catch (error) {
    console.error("booth add-song error", error);
    return jsonFail("Could not add song to booth queue.", 500);
  }
}