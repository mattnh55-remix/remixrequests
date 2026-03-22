import type { InterstitialAsset, QueueItem, Request, Song } from "@prisma/client";

export function parseInterstitialAssetId(clusterId: string | null | undefined) {
  if (!clusterId) return null;
  if (!clusterId.startsWith("interstitial:")) return null;
  return clusterId.slice("interstitial:".length) || null;
}

export function buildInterstitialClusterId(assetId: string) {
  return `interstitial:${assetId}`;
}