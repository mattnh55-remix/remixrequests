import { NextResponse } from "next/server";
import {
  InterstitialEventStatus,
  PlaybackEventType,
  Prisma,
  QueueItemStatus,
  QueueSourceType,
  SessionProfile,
} from "@prisma/client";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { buildInterstitialClusterId } from "@/lib/booth/runtime-queue";
import { prisma } from "@/lib/prisma";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";

const ACTIVE_QUEUE_STATUSES: QueueItemStatus[] = [
  QueueItemStatus.QUEUED,
  QueueItemStatus.LOADED,
  QueueItemStatus.PLAYING,
  QueueItemStatus.HELD,
];

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeProfile(value: unknown): SessionProfile {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";

  switch (raw) {
    case SessionProfile.FAMILY:
      return SessionProfile.FAMILY;
    case SessionProfile.ADULT:
      return SessionProfile.ADULT;
    case SessionProfile.BIRTHDAY:
      return SessionProfile.BIRTHDAY;
    case SessionProfile.SCHOOL:
      return SessionProfile.SCHOOL;
    case SessionProfile.PRIVATE_EVENT:
      return SessionProfile.PRIVATE_EVENT;
    case SessionProfile.GENERAL:
    default:
      return SessionProfile.GENERAL;
  }
}

async function normalizeActiveQueuePositions(
  tx: Prisma.TransactionClient,
  locationId: string,
  sessionId: string
) {
  const activeItems = await tx.queueItem.findMany({
    where: {
      locationId,
      sessionId,
      status: { in: ACTIVE_QUEUE_STATUSES },
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  await Promise.all(
    activeItems.map((item, index) =>
      tx.queueItem.update({
        where: { id: item.id },
        data: { position: index + 1 },
      })
    )
  );

  return activeItems.length;
}

export async function POST(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return jsonFail("Unauthorized.", 401);
  }

  try {
    const locationSlug = String(params.location || "").trim();

    if (!locationSlug) {
      return jsonFail("Missing location.");
    }

    const { loc } = await getRulesForLocation(locationSlug);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const body = await req.json().catch(() => ({}));
    const profile = normalizeProfile(body?.profile);

    const activeQueue = await prisma.queueItem.findMany({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: { in: ACTIVE_QUEUE_STATUSES },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        position: true,
        status: true,
        sourceType: true,
        clusterId: true,
        createdAt: true,
      },
    });

    const targetQueueItem =
      activeQueue.find((item) => item.status === QueueItemStatus.LOADED) ||
      activeQueue.find((item) => item.status === QueueItemStatus.QUEUED) ||
      null;

    if (!targetQueueItem) {
      return NextResponse.json({
        ok: true,
        materialized: false,
        reason: "NO_TARGET_QUEUE_ITEM",
        sessionId: session.id,
        locationId: loc.id,
        locationSlug,
        profile,
      });
    }

    const assets = await prisma.interstitialAsset.findMany({
      where: {
        locationId: loc.id,
        active: true,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        category: true,
        fileUrl: true,
        durationSec: true,
        allowedProfiles: true,
        blockedProfiles: true,
      },
    });

    const eligibleAssets = assets.filter((asset) => {
      const blocked = asset.blockedProfiles.map(String);
      const allowed = asset.allowedProfiles.map(String);

      if (blocked.includes(profile)) return false;
      if (allowed.length > 0 && !allowed.includes(profile)) return false;
      if (!asset.fileUrl || !String(asset.fileUrl).trim()) return false;
      if (!asset.durationSec || asset.durationSec <= 0) return false;

      return true;
    });

    if (eligibleAssets.length === 0) {
      return NextResponse.json({
        ok: true,
        materialized: false,
        reason: "NO_INTERSTITIAL_ACTION",
        sessionId: session.id,
        locationId: loc.id,
        locationSlug,
        profile,
      });
    }

    const asset = eligibleAssets[0];
    const clusterId = buildInterstitialClusterId(asset.id);

    const result = await prisma.$transaction(async (tx) => {
      const existingMatchingInterstitial = await tx.queueItem.findFirst({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          sourceType: QueueSourceType.INTERSTITIAL,
          status: { in: ACTIVE_QUEUE_STATUSES },
          clusterId,
        },
        select: { id: true, position: true },
      });

      if (existingMatchingInterstitial) {
        return {
          ok: true,
          materialized: false,
          reason: "ALREADY_MATERIALIZED",
          queueItemId: existingMatchingInterstitial.id,
          queuePosition: existingMatchingInterstitial.position,
          assetId: asset.id,
          assetName: asset.name,
          assetFileUrl: asset.fileUrl,
          bridgePlaybackFilename: asset.fileUrl,
          clusterId,
          targetQueueItemId: targetQueueItem.id,
        };
      }

      const queueItem = await tx.queueItem.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          status: QueueItemStatus.QUEUED,
          position: targetQueueItem.position,
          sourceType: QueueSourceType.INTERSTITIAL,
          introAssigned: false,
          clusterId,
          durationSec: asset.durationSec,
        },
        select: {
          id: true,
          position: true,
          status: true,
          sourceType: true,
          clusterId: true,
          durationSec: true,
        },
      });

      const eventMetadata = {
        assetId: asset.id,
        assetName: asset.name,
        assetCategory: asset.category,
        fileUrl: asset.fileUrl,
        clusterId,
        targetQueueItemId: targetQueueItem.id,
        insertedBeforeQueueItemId: targetQueueItem.id,
        materializedBy: "runtime/materialize-next-simple",
        profile,
      } satisfies Prisma.JsonObject;

      await tx.playbackEvent.create({
        data: {
          locationId: loc.id,
          queueItemId: queueItem.id,
          type: PlaybackEventType.QUEUED,
          metadata: eventMetadata,
        },
      });

      await tx.playbackEvent.create({
        data: {
          locationId: loc.id,
          queueItemId: queueItem.id,
          type: PlaybackEventType.INTRO_INSERTED,
          metadata: eventMetadata,
        },
      });

      const interstitialEvent = await tx.interstitialEvent.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          assetId: asset.id,
          status: InterstitialEventStatus.PLANNED,
        },
        select: {
          id: true,
          status: true,
          plannedAt: true,
          playedAt: true,
        },
      });

      await normalizeActiveQueuePositions(tx, loc.id, session.id);

      const normalizedQueueItem = await tx.queueItem.findUnique({
        where: { id: queueItem.id },
        select: {
          id: true,
          position: true,
          status: true,
          sourceType: true,
          clusterId: true,
          durationSec: true,
        },
      });

      return {
        ok: true,
        materialized: true,
        reason: "INTERSTITIAL_INSERTED",
        queueItem: normalizedQueueItem,
        interstitialEvent,
        assetId: asset.id,
        assetName: asset.name,
        assetFileUrl: asset.fileUrl,
        bridgePlaybackFilename: asset.fileUrl,
        clusterId,
        targetQueueItemId: targetQueueItem.id,
      };
    });

    return NextResponse.json({
      ...result,
      sessionId: session.id,
      locationId: loc.id,
      locationSlug,
      profile,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "TARGET_QUEUE_ITEM_NOT_FOUND"
    ) {
      return jsonFail("Target queue item was not found in the active queue.", 409);
    }

    console.error("materialize-next error", error);
    return jsonFail("Could not process materialization request.", 500);
  }
}