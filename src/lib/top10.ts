import { Prisma, Top10Bucket } from "@prisma/client";

type RulesLike = {
  timezone?: string | null;
  top10Timezone?: string | null;
  top10AdultCutoffHour?: number | null;
  top10AdultCutoffHourLocal?: number | null;
  adultTop10CutoffHour?: number | null;
  top10AdultModeEnabled?: boolean | null;
  top10AdultCutoffMinute?: number | null;
};

const DEFAULT_TZ = "America/New_York";
const DEFAULT_CUTOFF_HOUR = 21;
const DEFAULT_CUTOFF_MINUTE = 0;



export function getTop10Timezone(rules?: RulesLike | null) {
  const tz =
    String(rules?.top10Timezone || "").trim() || String(rules?.timezone || "").trim() || DEFAULT_TZ;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

export function getTop10CutoffHour(rules?: RulesLike | null) {
  const raw = Number(
    rules?.top10AdultCutoffHour ?? rules?.top10AdultCutoffHourLocal ?? rules?.adultTop10CutoffHour ?? DEFAULT_CUTOFF_HOUR
  );
  if (!Number.isFinite(raw)) return DEFAULT_CUTOFF_HOUR;
  return Math.min(23, Math.max(0, Math.floor(raw)));
}

export function getTop10BucketAt(date = new Date(), rules?: RulesLike | null): Top10Bucket {
  if (!Boolean(rules?.top10AdultModeEnabled ?? false)) {
    return Top10Bucket.GENERAL;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: getTop10Timezone(rules),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const rawHour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  const cutoffHour = getTop10CutoffHour(rules);
  const cutoffMinute = Math.min(
    59,
    Math.max(0, Math.floor(Number(rules?.top10AdultCutoffMinute ?? DEFAULT_CUTOFF_MINUTE)))
  );

  const nowMinutes = hour * 60 + minute;
  const cutoffMinutes = cutoffHour * 60 + cutoffMinute;

  return nowMinutes >= cutoffMinutes ? Top10Bucket.ADULT : Top10Bucket.GENERAL;
}

export function normalizeTop10Bucket(input?: string | null): Top10Bucket | null {
  const value = String(input || "").trim().toUpperCase();
  if (value === "GENERAL") return Top10Bucket.GENERAL;
  if (value === "ADULT") return Top10Bucket.ADULT;
  return null;
}

export function getTop10Title(bucket: Top10Bucket): string {
  return bucket === Top10Bucket.ADULT ? "Adult Night Top 10" : "General Top 10";
}

export function getTop10DisplayLabel(bucket: Top10Bucket): string {
  return bucket === Top10Bucket.ADULT ? "ADULT TOP 10" : "GENERAL TOP 10";
}

export function calcTop10Score(requestCount: number, upvotes: number, downvotes: number) {
  return Number(requestCount || 0) + Number(upvotes || 0) - Number(downvotes || 0);
}

type SongSnapshot = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string | null;
};

type Top10Where = {
  locationId_bucket_songId: {
    locationId: string;
    bucket: Top10Bucket;
    songId: string;
  };
};

function uniqueWhere(input: {
  locationId: string;
  bucket: Top10Bucket;
  songId: string;
}): Top10Where {
  return {
    locationId_bucket_songId: {
      locationId: input.locationId,
      bucket: input.bucket,
      songId: input.songId,
    },
  };
}

export async function bumpTop10Request(
  tx: Prisma.TransactionClient,
  input: {
    locationId: string;
    bucket: Top10Bucket;
    song: SongSnapshot;
  }
) {
  const where = uniqueWhere({
    locationId: input.locationId,
    bucket: input.bucket,
    songId: input.song.id,
  });

  const row = await tx.top10Entry.upsert({
    where,
    create: {
      locationId: input.locationId,
      bucket: input.bucket,
      songId: input.song.id,
      title: input.song.title,
      artist: input.song.artist,
      artworkUrl: input.song.artworkUrl ?? null,
      requestCount: 1,
      upvotes: 0,
      downvotes: 0,
      score: 1,
      lastActivityAt: new Date(),
    },
    update: {
      requestCount: { increment: 1 },
      title: input.song.title,
      artist: input.song.artist,
      artworkUrl: input.song.artworkUrl ?? null,
      lastActivityAt: new Date(),
    },
  });

  const nextScore = calcTop10Score(row.requestCount, row.upvotes, row.downvotes);
  if (row.score !== nextScore) {
    await tx.top10Entry.update({
      where: { id: row.id },
      data: { score: nextScore },
    });
  }

  return row.id;
}

export async function bumpTop10VoteForRequest(
  tx: Prisma.TransactionClient,
  input: {
    requestId: string;
    value: number;
  }
) {
  const reqRow = await tx.request.findUnique({
    where: { id: input.requestId },
    include: {
      song: {
        select: {
          id: true,
          title: true,
          artist: true,
          artworkUrl: true,
        },
      },
    },
  });

  if (!reqRow?.song || !reqRow.top10Bucket) return null;

  const where = uniqueWhere({
    locationId: reqRow.locationId,
    bucket: reqRow.top10Bucket,
    songId: reqRow.songId,
  });

  const isUp = Number(input.value) >= 1;

  const row = await tx.top10Entry.upsert({
    where,
    create: {
      locationId: reqRow.locationId,
      bucket: reqRow.top10Bucket,
      songId: reqRow.songId,
      title: reqRow.song.title,
      artist: reqRow.song.artist,
      artworkUrl: reqRow.song.artworkUrl ?? null,
      requestCount: 1,
      upvotes: isUp ? 1 : 0,
      downvotes: isUp ? 0 : 1,
      score: calcTop10Score(1, isUp ? 1 : 0, isUp ? 0 : 1),
      lastActivityAt: new Date(),
    },
    update: isUp
      ? {
          upvotes: { increment: 1 },
          title: reqRow.song.title,
          artist: reqRow.song.artist,
          artworkUrl: reqRow.song.artworkUrl ?? null,
          lastActivityAt: new Date(),
        }
      : {
          downvotes: { increment: 1 },
          title: reqRow.song.title,
          artist: reqRow.song.artist,
          artworkUrl: reqRow.song.artworkUrl ?? null,
          lastActivityAt: new Date(),
        },
  });

  const nextScore = calcTop10Score(row.requestCount, row.upvotes, row.downvotes);
  if (row.score !== nextScore) {
    await tx.top10Entry.update({
      where: { id: row.id },
      data: { score: nextScore },
    });
  }

  return row.id;
}

export async function removeRequestFromTop10(
  tx: Prisma.TransactionClient,
  input: {
    locationId: string;
    songId: string;
    bucket?: Top10Bucket | null;
  }
) {
  if (!input.bucket) return;

  const existing = await tx.top10Entry.findUnique({
    where: uniqueWhere({
      locationId: input.locationId,
      bucket: input.bucket,
      songId: input.songId,
    }),
  });

  if (!existing) return;

  const nextRequestCount = Math.max(0, existing.requestCount - 1);
  if (nextRequestCount <= 0) {
    await tx.top10Entry.delete({ where: { id: existing.id } });
    return;
  }

  await tx.top10Entry.update({
    where: { id: existing.id },
    data: {
      requestCount: nextRequestCount,
      score: calcTop10Score(nextRequestCount, existing.upvotes, existing.downvotes),
      lastActivityAt: new Date(),
    },
  });
}