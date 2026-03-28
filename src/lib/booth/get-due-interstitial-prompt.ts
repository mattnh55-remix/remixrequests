import { prisma } from "@/lib/prisma";
import { InterstitialEventStatus, type SessionProfile } from "@prisma/client";

export type DueInterstitialPromptOption = {
  assetId: string;
  name: string;
  previewGifUrl: string | null;
  iconLabel: string | null;
  durationSec: number | null;
  lastPlayedText: string;
};

export type DueInterstitialPrompt = {
  eventId: string | null;
  scheduleId: string;
  category: string;
  title: string;
  body: string | null;
  startMinute: number;
  endMinute: number;
  promptMinute: number;
  required: boolean;
  options: DueInterstitialPromptOption[];
};

function getElapsedSessionMinutes(sessionStartedAt: Date | string, now = new Date()) {
  const started = new Date(sessionStartedAt);
  const diffMs = now.getTime() - started.getTime();
  return Math.max(0, Math.floor(diffMs / 1000 / 60));
}

function formatLastPlayedText(playedAt: Date | null) {
  if (!playedAt) return "Never played";

  const diffMs = Date.now() - playedAt.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 1000 / 60));

  if (diffMin < 1) return "Played just now";
  if (diffMin === 1) return "Played 1 min ago";
  if (diffMin < 60) return `Played ${diffMin} min ago`;

  const hours = Math.floor(diffMin / 60);
  if (hours === 1) return "Played 1 hr ago";
  if (hours < 24) return `Played ${hours} hrs ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Played 1 day ago";
  return `Played ${days} days ago`;
}

function categoryTitle(value: string) {
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function getDueInterstitialPromptForSession(args: {
  locationId: string;
  sessionId: string;
  sessionStartedAt: Date | string;
  profile: SessionProfile;
}) {
  const { locationId, sessionId, sessionStartedAt, profile } = args;

  const promptMinute = getElapsedSessionMinutes(sessionStartedAt);

  const activeSchedules = await prisma.interstitialSchedule.findMany({
    where: {
      locationId,
      active: true,
      startMinute: { lte: promptMinute },
      endMinute: { gte: promptMinute },
    },
    orderBy: [{ sortOrder: "asc" }, { startMinute: "asc" }, { category: "asc" }],
  });

  if (activeSchedules.length === 0) {
    return null;
  }

  for (const schedule of activeSchedules) {
    const handledEvent = await prisma.interstitialEvent.findFirst({
      where: {
        locationId,
        sessionId,
        scheduleId: schedule.id,
        status: {
          in: [
            InterstitialEventStatus.PLAYED,
            InterstitialEventStatus.SKIPPED,
            InterstitialEventStatus.CANCELED,
          ],
        },
      },
      orderBy: { plannedAt: "desc" },
      select: {
        id: true,
        status: true,
      },
    });

    if (handledEvent) {
      continue;
    }

    let plannedEvent = await prisma.interstitialEvent.findFirst({
      where: {
        locationId,
        sessionId,
        scheduleId: schedule.id,
        status: InterstitialEventStatus.PLANNED,
      },
      orderBy: { plannedAt: "desc" },
      select: {
        id: true,
        plannedAt: true,
      },
    });

    const assets = await prisma.interstitialAsset.findMany({
      where: {
        locationId,
        active: true,
        category: schedule.category,
      },
      orderBy: [{ priority: "desc" }, { randomWeight: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        previewGifUrl: true,
        iconLabel: true,
        durationSec: true,
        allowedProfiles: true,
        blockedProfiles: true,
      },
    });

    const filteredAssets = assets.filter((asset) => {
      if (asset.blockedProfiles.includes(profile)) return false;
      if (asset.allowedProfiles.length === 0) return true;
      return asset.allowedProfiles.includes(profile);
    });

    if (filteredAssets.length === 0) {
      continue;
    }

    if (!plannedEvent) {
      const created = await prisma.interstitialEvent.create({
        data: {
          locationId,
          sessionId,
          scheduleId: schedule.id,
          category: schedule.category,
          status: InterstitialEventStatus.PLANNED,
          promptMinute,
          plannedAt: new Date(),
        },
        select: {
          id: true,
          plannedAt: true,
        },
      });

      plannedEvent = created;
    }

    const options: DueInterstitialPromptOption[] = await Promise.all(
      filteredAssets.map(async (asset) => {
        const lastPlayed = await prisma.interstitialEvent.findFirst({
          where: {
            locationId,
            assetId: asset.id,
            status: InterstitialEventStatus.PLAYED,
          },
          orderBy: { playedAt: "desc" },
          select: { playedAt: true },
        });

        return {
          assetId: asset.id,
          name: asset.name,
          previewGifUrl: asset.previewGifUrl ?? null,
          iconLabel: asset.iconLabel ?? null,
          durationSec: asset.durationSec ?? null,
          lastPlayedText: formatLastPlayedText(lastPlayed?.playedAt ?? null),
        };
      }),
    );

    return {
      eventId: plannedEvent?.id ?? null,
      scheduleId: schedule.id,
      category: String(schedule.category),
      title:
        schedule.promptTitle?.trim() ||
        `Time to play ${categoryTitle(String(schedule.category))}`,
      body: schedule.promptBody?.trim() || "Choose one interstitial to play now.",
      startMinute: schedule.startMinute,
      endMinute: schedule.endMinute,
      promptMinute,
      required: schedule.required,
      options,
    } satisfies DueInterstitialPrompt;
  }

  return null;
}