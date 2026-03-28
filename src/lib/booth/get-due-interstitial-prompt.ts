import { prisma } from "@/lib/prisma";

type GetDueInterstitialPromptArgs = {
  location: string;
  sessionStartedAt?: string | null;
  now?: Date;
};

type PromptAsset = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  previewUrl: string | null;
  playFilename: string | null;
  lastPlayedAt: string | null;
  cooldownMinutes: number;
  cooldownRemainingMinutes: number;
};

type DuePromptResponse = {
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
  eligibleAssets: PromptAsset[];
  lastPlayedTimestamps: Array<{
    assetId: string | null;
    category: string | null;
    playedAt: string;
    status: string | null;
  }>;
};

const SESSION_CYCLE_MINUTES = 120;

const CATEGORY_ORDER = [
  "ANNOUNCEMENTS",
  "SONG_INTROS",
  "GAMES_DANCES",
  "REMIX_PROMOS",
] as const;

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function truthy(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value == null) return fallback;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "enabled", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "disabled", "inactive"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function minutesSince(date: Date | null, now: Date): number {
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - date.getTime()) / 60000);
}

function getElapsedSessionMinutes(
  now: Date,
  sessionStartedAt?: string | null
): { elapsedMinutes: number; startedAt: string | null } {
  const parsed = asDate(sessionStartedAt);

  if (parsed) {
    const elapsed = Math.max(
      0,
      Math.floor((now.getTime() - parsed.getTime()) / 60000)
    );

    return {
      elapsedMinutes: elapsed % SESSION_CYCLE_MINUTES,
      startedAt: parsed.toISOString(),
    };
  }

  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);

  const minutesIntoDay = Math.floor((now.getTime() - midnight.getTime()) / 60000);

  return {
    elapsedMinutes: minutesIntoDay % SESSION_CYCLE_MINUTES,
    startedAt: null,
  };
}

function getDayKey(now: Date): string {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][now.getDay()];
}

function getMinuteOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

function normalizeDayList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).toUpperCase().slice(0, 3));
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((v) => v.trim().toUpperCase().slice(0, 3))
      .filter(Boolean);
  }

  return [];
}

function matchesLocation(record: any, location: string): boolean {
  const directCandidates = [
    record?.location,
    record?.locationSlug,
    record?.locationId,
    record?.slug,
    record?.code,
  ]
    .map(asString)
    .filter(Boolean) as string[];

  if (directCandidates.includes(location)) return true;

  const nestedCandidates = [
    record?.profile?.slug,
    record?.profile?.code,
    record?.profile?.id,
    record?.boothProfile?.slug,
    record?.boothProfile?.code,
    record?.locationProfile?.slug,
    record?.locationProfile?.code,
  ]
    .map(asString)
    .filter(Boolean) as string[];

  return nestedCandidates.includes(location);
}

function isScheduleEnabled(schedule: any): boolean {
  const enabled = [
    schedule?.enabled,
    schedule?.isEnabled,
    schedule?.active,
    schedule?.isActive,
  ];

  return enabled.some((v) => v != null) ? enabled.some((v) => truthy(v)) : true;
}

function isAssetEnabled(asset: any): boolean {
  const enabled = [asset?.enabled, asset?.isEnabled, asset?.active, asset?.isActive];
  return enabled.some((v) => v != null) ? enabled.some((v) => truthy(v)) : true;
}

function getScheduleCategory(schedule: any): string | null {
  return asString(schedule?.category ?? schedule?.group ?? schedule?.type);
}

function getAssetCategory(asset: any): string | null {
  return asString(asset?.category ?? asset?.group ?? asset?.type);
}

function scheduleMinuteWindow(schedule: any): { start: number; end: number } {
  const start = asNumber(
    schedule?.startMinuteOfDay ??
      schedule?.windowStartMinute ??
      schedule?.startMinutes ??
      schedule?.startMinute ??
      0,
    0
  );

  const end = asNumber(
    schedule?.endMinuteOfDay ??
      schedule?.windowEndMinute ??
      schedule?.endMinutes ??
      schedule?.endMinute ??
      1439,
    1439
  );

  return { start, end };
}

function scheduleSessionWindow(schedule: any): { start: number; end: number } {
  const start = asNumber(
    schedule?.minSessionMinute ??
      schedule?.sessionStartMinute ??
      schedule?.startSessionMinute ??
      0,
    0
  );

  const end = asNumber(
    schedule?.maxSessionMinute ??
      schedule?.sessionEndMinute ??
      schedule?.endSessionMinute ??
      SESSION_CYCLE_MINUTES,
    SESSION_CYCLE_MINUTES
  );

  return { start, end };
}

function getScheduleCooldown(schedule: any): number {
  return asNumber(
    schedule?.cooldownMinutes ??
      schedule?.cooldownMin ??
      schedule?.categoryCooldownMinutes ??
      0,
    0
  );
}

function getAssetCooldown(asset: any): number {
  return asNumber(asset?.cooldownMinutes ?? asset?.cooldownMin ?? 0, 0);
}

function getSchedulePromptTitle(schedule: any): string | null {
  return asString(schedule?.promptTitle ?? schedule?.title ?? schedule?.name);
}

function getSchedulePromptBody(schedule: any): string | null {
  return asString(
    schedule?.promptBody ?? schedule?.body ?? schedule?.description ?? null
  );
}

function getAssetTitle(asset: any): string {
  return (
    asString(asset?.title ?? asset?.name ?? asset?.label ?? asset?.filename) ??
    "Interstitial Asset"
  );
}

function getAssetBody(asset: any): string | null {
  return asString(asset?.body ?? asset?.description ?? asset?.promptBody ?? null);
}

function getAssetPreviewUrl(asset: any): string | null {
  return asString(
    asset?.previewUrl ??
      asset?.gifUrl ??
      asset?.previewGifUrl ??
      asset?.imageUrl ??
      asset?.thumbnailUrl ??
      null
  );
}

function getAssetPlayFilename(asset: any): string | null {
  return asString(
    asset?.playFilename ??
      asset?.filename ??
      asset?.audioFilename ??
      asset?.assetFilename ??
      asset?.fileName ??
      null
  );
}

function eventStatus(event: any): string | null {
  return asString(event?.status);
}

function eventCreatedAt(event: any): Date | null {
  return asDate(event?.createdAt ?? event?.playedAt ?? event?.updatedAt);
}

function isInDayWindow(schedule: any, now: Date): boolean {
  const days = normalizeDayList(
    schedule?.daysOfWeek ?? schedule?.days ?? schedule?.weekdays ?? null
  );

  if (!days.length) return true;

  return days.includes(getDayKey(now));
}

function isInMinuteWindow(schedule: any, now: Date): boolean {
  const { start, end } = scheduleMinuteWindow(schedule);
  const minuteNow = getMinuteOfDay(now);

  if (start <= end) {
    return minuteNow >= start && minuteNow <= end;
  }

  return minuteNow >= start || minuteNow <= end;
}

function isInSessionWindow(schedule: any, sessionElapsedMinutes: number): boolean {
  const { start, end } = scheduleSessionWindow(schedule);
  return sessionElapsedMinutes >= start && sessionElapsedMinutes <= end;
}

function newestCategoryEvent(
  events: any[],
  category: string,
  statuses: string[]
): any | null {
  const filtered = events
    .filter((event) => {
      const sameCategory = asString(event?.category) === category;
      const status = eventStatus(event);
      return sameCategory && status && statuses.includes(status);
    })
    .sort((a, b) => {
      const aTime = eventCreatedAt(a)?.getTime() ?? 0;
      const bTime = eventCreatedAt(b)?.getTime() ?? 0;
      return bTime - aTime;
    });

  return filtered[0] ?? null;
}

function newestAssetEvent(
  events: any[],
  assetId: string,
  statuses: string[]
): any | null {
  const filtered = events
    .filter((event) => {
      const sameAsset = asString(event?.assetId) === assetId;
      const status = eventStatus(event);
      return sameAsset && status && statuses.includes(status);
    })
    .sort((a, b) => {
      const aTime = eventCreatedAt(a)?.getTime() ?? 0;
      const bTime = eventCreatedAt(b)?.getTime() ?? 0;
      return bTime - aTime;
    });

  return filtered[0] ?? null;
}

export async function getDueInterstitialPrompt({
  location,
  sessionStartedAt,
  now = new Date(),
}: GetDueInterstitialPromptArgs): Promise<DuePromptResponse> {
  const session = getElapsedSessionMinutes(now, sessionStartedAt);

  const [rawSchedules, rawAssets, rawEventsUnsorted] = await Promise.all([
    prisma.interstitialSchedule.findMany({
      orderBy: [{ updatedAt: "desc" as const }],
    }) as Promise<any[]>,
    prisma.interstitialAsset.findMany({
      orderBy: [{ updatedAt: "desc" as const }],
    }) as Promise<any[]>,
    prisma.interstitialEvent.findMany({
      take: 200,
    }) as Promise<any[]>,
  ]);

  const rawEvents = [...rawEventsUnsorted].sort((a, b) => {
    const aTime = eventCreatedAt(a)?.getTime() ?? 0;
    const bTime = eventCreatedAt(b)?.getTime() ?? 0;
    return bTime - aTime;
  });


  const schedules = rawSchedules.filter(
    (schedule) =>
      matchesLocation(schedule, location) &&
      isScheduleEnabled(schedule) &&
      isInDayWindow(schedule, now) &&
      isInMinuteWindow(schedule, now) &&
      isInSessionWindow(schedule, session.elapsedMinutes)
  );

  const assets = rawAssets.filter(
    (asset) => matchesLocation(asset, location) && isAssetEnabled(asset)
  );

  for (const category of CATEGORY_ORDER) {
    const categorySchedules = schedules
      .filter((schedule) => getScheduleCategory(schedule) === category)
      .sort((a, b) => {
        const aPriority = asNumber(a?.priority ?? a?.sortOrder ?? 0, 0);
        const bPriority = asNumber(b?.priority ?? b?.sortOrder ?? 0, 0);
        return bPriority - aPriority;
      });

    if (!categorySchedules.length) continue;

    for (const schedule of categorySchedules) {
      const scheduleCooldown = getScheduleCooldown(schedule);

      const lastResolvedCategoryEvent = newestCategoryEvent(rawEvents, category, [
        "PLAYED",
        "SKIPPED",
      ]);

      const lastResolvedAt = eventCreatedAt(lastResolvedCategoryEvent);
      const categoryMinutesSince = minutesSince(lastResolvedAt, now);

      if (scheduleCooldown > 0 && categoryMinutesSince < scheduleCooldown) {
        continue;
      }

      const categoryAssets = assets
        .filter((asset) => getAssetCategory(asset) === category)
        .map((asset) => {
          const assetId = asString(asset?.id) ?? "";
          const lastPlayedEvent = newestAssetEvent(rawEvents, assetId, ["PLAYED"]);
          const lastPlayedAtDate = eventCreatedAt(lastPlayedEvent);
          const cooldownMinutes = getAssetCooldown(asset);
          const minsSinceLastPlayed = minutesSince(lastPlayedAtDate, now);
          const cooldownRemainingMinutes =
            cooldownMinutes > 0 && minsSinceLastPlayed < cooldownMinutes
              ? cooldownMinutes - minsSinceLastPlayed
              : 0;

          return {
            id: assetId,
            category,
            title: getAssetTitle(asset),
            body: getAssetBody(asset),
            previewUrl: getAssetPreviewUrl(asset),
            playFilename: getAssetPlayFilename(asset),
            lastPlayedAt: lastPlayedAtDate?.toISOString() ?? null,
            cooldownMinutes,
            cooldownRemainingMinutes,
          } satisfies PromptAsset;
        })
        .filter((asset) => !!asset.id && asset.cooldownRemainingMinutes <= 0);

      if (!categoryAssets.length) {
        continue;
      }

      const recentCategoryEvents = rawEvents
        .filter((event) => asString(event?.category) === category)
        .slice(0, 12)
        .map((event) => ({
          assetId: asString(event?.assetId),
          category: asString(event?.category),
          playedAt:
            eventCreatedAt(event)?.toISOString() ?? new Date(0).toISOString(),
          status: eventStatus(event),
        }));

      return {
        due: true,
        location,
        category,
        scheduleId: asString(schedule?.id),
        promptTitle: getSchedulePromptTitle(schedule),
        promptBody: getSchedulePromptBody(schedule),
        session: {
          cycleMinutes: SESSION_CYCLE_MINUTES,
          elapsedMinutes: session.elapsedMinutes,
          startedAt: session.startedAt,
        },
        eligibleAssets: categoryAssets.sort((a, b) => {
          const aLast = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
          const bLast = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
          return aLast - bLast;
        }),
        lastPlayedTimestamps: recentCategoryEvents,
      };
    }
  }

  return {
    due: false,
    location,
    category: null,
    scheduleId: null,
    promptTitle: null,
    promptBody: null,
    session: {
      cycleMinutes: SESSION_CYCLE_MINUTES,
      elapsedMinutes: session.elapsedMinutes,
      startedAt: session.startedAt,
    },
    eligibleAssets: [],
    lastPlayedTimestamps: [],
  };
}