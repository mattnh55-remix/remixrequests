import type { QueueItem, Request, Song, InterstitialAsset } from "@prisma/client";

export function parseInterstitialAssetId(clusterId: string | null | undefined) {
  if (!clusterId) return null;
  if (!clusterId.startsWith("interstitial:")) return null;
  return clusterId.slice("interstitial:".length) || null;
}

export function buildInterstitialClusterId(assetId: string) {
  return `interstitial:${assetId}`;
}

export function deriveRuntimeFields(args: {
  playingAt: Date | null;
  durationSec: number | null;
  expectedEndAt: Date | null;
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const startedAt = args.playingAt ?? null;

  const expectedEndAt =
    args.expectedEndAt ??
    (startedAt && args.durationSec != null
      ? new Date(startedAt.getTime() + args.durationSec * 1000)
      : null);

  const elapsedSec = startedAt
    ? Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000))
    : 0;

  const remainingSec =
    args.durationSec != null ? Math.max(0, args.durationSec - elapsedSec) : null;

  const progressPercent =
    args.durationSec && args.durationSec > 0
      ? Math.min(100, Math.max(0, (elapsedSec / args.durationSec) * 100))
      : 0;

  return {
    startedAt,
    expectedEndAt,
    elapsedSec,
    remainingSec,
    progressPercent,
    isEndingSoon: remainingSec != null ? remainingSec <= 20 : false,
  };
}

export function resolveQueueItemDurationSec(args: {
  item: QueueItem & { request?: (Request & { song?: Song | null }) | null };
  interstitialAsset?: Pick<InterstitialAsset, "durationSec"> | null;
}) {
  if (args.item.durationSec != null) return args.item.durationSec;
  if (args.item.sourceType === "INTERSTITIAL") {
    return args.interstitialAsset?.durationSec ?? 8;
  }
  return args.item.request?.song?.durationSec ?? null;
}
