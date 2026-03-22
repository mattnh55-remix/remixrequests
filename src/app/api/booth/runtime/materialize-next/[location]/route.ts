// src/app/api/booth/runtime/materialize-next/[location]/route.ts

import { NextResponse } from "next/server";
import {
  InterstitialEventStatus,
  PlaybackEventType,
  QueueItemStatus,
  QueueSourceType,
  SessionProfile,
  Prisma,
} from "@prisma/client";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { computeNextPlaybackAction } from "@/lib/booth/compute-next-playback-action";
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

function isInterstitialAction(action: unknown): boolean {
  const type = String((action as any)?.type ?? "").toUpperCase();
  return type === "INTERSTITIAL" || type === "INSERT_INTERSTITIAL";
}

function extractAssetId(action: any): string | null {
  const candidates = [
    action?.assetId,
    action?.interstitialAssetId,
    action?.asset?.id,
    action?.interstitialAsset?.id,
    action?.payload?.assetId,
    action?.payload?.interstitialAssetId,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function extractClusterId(action: any, assetId: string): string {
  const candidates = [
    action?.clusterId,
    action?.payload?.clusterId,
    action?.targetClusterId,
    action?.interstitial?.clusterId,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return `INTERSTITIAL:${assetId}`;
}

function extractTargetQueueItemId(action: any): string | null {
  const candidates = [
    action?.targetQueueItemId,
    action?.beforeQueueItemId,
    action?.target?.queueItemId,
    action?.target?.id,
    action?.targetSongQueueItemId,
    action?.song?.queueItemId,
    action?.payload?.targetQueueItemId,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function extractDurationSec(action: any, asset: { durationSec: number | null }): number | null {
  const candidates = [
    action?.durationSec,
    action?.asset?.durationSec,
    action?.interstitialAsset?.durationSec,
    action?.payload?.durationSec,
    asset.durationSec,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
  }

  return null;
}

async function normalizeActiveQueuePositions(
  tx: Prisma.TransactionClient,
  locationId: string,
  sessionId: string,
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
      }),
    ),
  );

  return activeItems.length;
}

export async function POST(
  req: Request,
  { params }: { params: { location: string } },
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

    const action = await computeNextPlaybackAction({
      locationId: loc.id,
      sessionId: session.id,
      profile,
    } as any);

    if (!isInterstitialAction(action)) {
      return NextResponse.json({
        ok: true,
        materialized: false,
        reason: "NO_INTERSTITIAL_ACTION",
        action,
        sessionId: session.id,
        locationId: loc.id,
        locationSlug,
      });
    }

    const assetId = extractAssetId(action);
    if (!assetId) {
      return jsonFail("Interstitial action did not include an assetId.", 500);
    }

    const targetQueueItemId = extractTargetQueueItemId(action);
    if (!targetQueueItemId) {
      return jsonFail("Interstitial action did not include a target queue item.", 500);
    }

    const asset = await prisma.interstitialAsset.findFirst({
      where: {
        id: assetId,
        locationId: loc.id,
        active: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
        durationSec: true,
        fileUrl: true,
      },
    });

    if (!asset) {
      return jsonFail("Interstitial asset not found or inactive.", 404);
    }

    const clusterId = extractClusterId(action, assetId);
    const durationSec = extractDurationSec(action, asset);

    const result = await prisma.$transaction(async (tx) => {
      const activeItems = await tx.queueItem.findMany({
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

      const targetIndex = activeItems.findIndex((item) => item.id === targetQueueItemId);
      if (targetIndex === -1) {
        throw new Error("TARGET_QUEUE_ITEM_NOT_FOUND");
      }

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
          clusterId,
          targetQueueItemId,
        };
      }

      const insertPosition = activeItems[targetIndex].position;

      const queueItem = await tx.queueItem.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          status: QueueItemStatus.QUEUED,
          position: insertPosition,
          sourceType: QueueSourceType.INTERSTITIAL,
          introAssigned: false,
          clusterId,
          durationSec,
        },
        select: {
          id: true,
          position: true,
          status: true,
          sourceType: true,
          clusterId: true,
          durationSec: true,
          createdAt: true,
        },
      });

      const eventMetadata = {
        assetId: asset.id,
        assetName: asset.name,
        assetCategory: asset.category,
        fileUrl: asset.fileUrl,
        clusterId,
        targetQueueItemId,
        insertedBeforeQueueItemId: targetQueueItemId,
        materializedBy: "runtime/materialize-next",
        plannedFromActionType: String((action as any)?.type ?? "INTERSTITIAL"),
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
        clusterId,
        targetQueueItemId,
      };
    });

    return NextResponse.json({
      ...result,
      action,
      sessionId: session.id,
      locationId: loc.id,
      locationSlug,
      profile,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TARGET_QUEUE_ITEM_NOT_FOUND") {
      return jsonFail("Target queue item was not found in the active queue.", 409);
    }

    console.error("materialize-next error", error);
    return jsonFail("Could not process materialization request.", 500);
  }
}
