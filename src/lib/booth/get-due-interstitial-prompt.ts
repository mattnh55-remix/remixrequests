import { prisma } from "@/lib/prisma";
import type { InterstitialCategory, InterstitialEventStatus } from "@prisma/client";

type GetDueInterstitialPromptArgs = {
  location: string;
  sessionStartedAt?: string | null;
  pausedElapsedMs?: number;
  now?: Date;
};

type BoothInterstitialAsset = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  previewUrl: string | null;
  durationSec: number | null;
  playFilename: string | null;
  lastPlayedAt: string | null;
  cooldownMinutes: number;
  cooldownRemainingMinutes: number;
};

type DueInterstitialPromptResult = {
  due: boolean;
  location: string;
  category: string | null;
  scheduleId: string | null;
  promptTitle: string | null;
  promptBody: string | null;
  session: {
    cycleMinutes: number;
    elapsedMinutes: number;
    startedAt: string | null;
  };
  eligibleAssets: BoothInterstitialAsset[];
};

const SESSION_CYCLE_MINUTES = 120;

function normalizeCategory(
  value: InterstitialCategory | string | null | undefined
): InterstitialCategory {
  const raw = String(value ?? "").trim().toUpperCase();

  if (raw === "ANNOUNCEMENTS") return "ANNOUNCEMENTS";
  if (raw === "SONG_INTROS") return "SONG_INTROS";
  if (raw === "GAMES_DANCES") return "GAMES_DANCES";
  return "REMIX_PROMOS";
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function diffMinutes(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
}

function minutesSince(date: Date, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
}

function eventTime(event: {
  playedAt?: Date | null;
  updatedAt?: Date | null;
}) {
  return event.playedAt ?? event.updatedAt ?? null;
}

function buildBaseResult(
  location: string,
  startedAt: Date | null,
  now: Date
): DueInterstitialPromptResult {
  return {
    due: false,
    location,
    category: null,
    scheduleId: null,
    promptTitle: null,
    promptBody: null,
    session: {
      cycleMinutes: SESSION_CYCLE_MINUTES,
      elapsedMinutes: startedAt ? diffMinutes(startedAt, now) : 0,
      startedAt: startedAt ? startedAt.toISOString() : null,
    },
    eligibleAssets: [],
  };
}

export async function getDueInterstitialPrompt({
  location,
  sessionStartedAt,
  pausedElapsedMs = 0,
  now = new Date(),
}: GetDueInterstitialPromptArgs): Promise<DueInterstitialPromptResult> {
  const startedAt = safeDate(sessionStartedAt);
  const base = buildBaseResult(location, startedAt, now);

  const rawLocation = String(location ?? "").trim();
  if (!rawLocation) {
    return base;
  }

  const locationRow = await prisma.location.findFirst({
    where: {
      OR: [{ id: rawLocation }, { slug: rawLocation }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!locationRow) {
    return base;
  }

  const elapsedMinutes = startedAt
  ? Math.max(
      0,
      Math.floor(
        (now.getTime() - startedAt.getTime() - pausedElapsedMs) / 60000
      )
    )
  : 0;

  const activeWindows = await prisma.interstitialSchedule.findMany({
    where: {
      locationId: locationRow.id,
      active: true,
      startMinute: { lte: elapsedMinutes },
      endMinute: { gte: elapsedMinutes },
    },
    orderBy: [{ sortOrder: "asc" }, { startMinute: "asc" }, { id: "asc" }],
    select: {
  id: true,
  category: true,
  label: true,
  promptTitle: true,
  promptBody: true,
  startMinute: true,
  endMinute: true,
  sortOrder: true,
  cooldownMinutes: true,
  required: true,
  active: true,
},
  });

  if (!activeWindows.length) {
    return {
      ...base,
      location: locationRow.slug || rawLocation,
      session: {
        ...base.session,
        elapsedMinutes,
      },
    };
  }

  const allEvents = await prisma.interstitialEvent.findMany({
    where: {
      locationId: locationRow.id,
    },
  });

  const sessionEvents = startedAt
    ? allEvents.filter((event) => {
        const t = eventTime(event);
        return t ? t.getTime() >= startedAt.getTime() : false;
      })
    : allEvents;

  for (const schedule of activeWindows) {
    const category = normalizeCategory(schedule.category);

    const eligibleRows = await prisma.interstitialAsset.findMany({
      where: {
        locationId: locationRow.id,
        active: true,
        category,
        manualOnly: false,
      },
      orderBy: [{ priority: "desc" }, { randomWeight: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        durationSec: true,
        fileUrl: true,
        previewGifUrl: true,
        notes: true,
      },
    });

    if (!eligibleRows.length) {
      continue;
    }

    const existingResolution = sessionEvents
      .filter(
        (event) =>
          event.scheduleId === schedule.id &&
          (event.status === "PLAYED" || event.status === "SKIPPED")
      )
      .sort((a, b) => {
        const aTime = eventTime(a)?.getTime() ?? 0;
        const bTime = eventTime(b)?.getTime() ?? 0;
        return bTime - aTime;
      })[0];

    if (existingResolution) {
      continue;
    }

    const latestSchedulePlay = allEvents
      .filter(
        (event) => event.scheduleId === schedule.id && event.status === "PLAYED"
      )
      .sort((a, b) => {
        const aTime = eventTime(a)?.getTime() ?? 0;
        const bTime = eventTime(b)?.getTime() ?? 0;
        return bTime - aTime;
      })[0];

    const scheduleCooldownMinutes = Math.max(0, schedule.cooldownMinutes ?? 0);

    if (latestSchedulePlay && scheduleCooldownMinutes > 0) {
      const lastTime = eventTime(latestSchedulePlay);
      if (lastTime) {
        const sinceLastSchedulePlay = minutesSince(lastTime, now);
        if (sinceLastSchedulePlay < scheduleCooldownMinutes) {
          continue;
        }
      }
    }

    const lastPlayedByAssetId = new Map<string, Date>();

    for (const row of eligibleRows) {
      const latestAssetPlay = allEvents
        .filter(
          (event) => event.assetId === row.id && event.status === "PLAYED"
        )
        .sort((a, b) => {
          const aTime = eventTime(a)?.getTime() ?? 0;
          const bTime = eventTime(b)?.getTime() ?? 0;
          return bTime - aTime;
        })[0];

      const playedAt = latestAssetPlay ? eventTime(latestAssetPlay) : null;
      if (playedAt) {
        lastPlayedByAssetId.set(row.id, playedAt);
      }
    }

    const eligibleAssets: BoothInterstitialAsset[] = eligibleRows.map((row) => {
      const lastPlayedAtDate = lastPlayedByAssetId.get(row.id) ?? null;
      const cooldownMinutes = scheduleCooldownMinutes;
      const cooldownRemainingMinutes =
        lastPlayedAtDate && cooldownMinutes > 0
          ? Math.max(0, cooldownMinutes - minutesSince(lastPlayedAtDate, now))
          : 0;

      return {
        id: row.id,
        category,
        title: row.name,
        body: row.notes ?? null,
        durationSec: row.durationSec ?? null,
        previewUrl: row.previewGifUrl ?? null,
        playFilename: row.fileUrl ?? null,
        lastPlayedAt: lastPlayedAtDate ? lastPlayedAtDate.toISOString() : null,
        cooldownMinutes,
        cooldownRemainingMinutes,
      };
    });

    return {
      due: true,
      location: locationRow.slug || rawLocation,
      category,
      scheduleId: schedule.id,
      promptTitle:
        schedule.promptTitle?.trim() ||
        schedule.label?.trim() ||
        `Time to play ${category.replaceAll("_", " ")}`,
      promptBody: schedule.promptBody?.trim() || null,
      session: {
        cycleMinutes: SESSION_CYCLE_MINUTES,
        elapsedMinutes,
        startedAt: startedAt ? startedAt.toISOString() : null,
      },
      eligibleAssets,
    };
  }

  return {
    ...base,
    location: locationRow.slug || rawLocation,
    session: {
      ...base.session,
      elapsedMinutes,
    },
  };
}