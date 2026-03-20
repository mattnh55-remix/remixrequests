import type { InterstitialAsset } from "@/lib/booth/interstitial-types";

type DbInterstitialAsset = {
  id: string;
  name: string;
  category: string;
  fileUrl: string;
  durationSec: number | null;
  active: boolean;
  priority: number;
  randomWeight: number;
  scheduleMode: string;
  intervalMinutes: number | null;
  allowedProfiles: string[];
  blockedProfiles: string[];
};

export function mapDbInterstitialAssetsToPreview(
  assets: DbInterstitialAsset[]
): InterstitialAsset[] {
  return assets.map((asset) => {
    return {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      fileUrl: asset.fileUrl,
      filePath: asset.fileUrl,
      durationSec: asset.durationSec ?? 0,
      active: asset.active,
      priority: asset.priority,
      randomWeight: asset.randomWeight,
      scheduleMode: asset.scheduleMode,
      intervalMinutes: asset.intervalMinutes,
      allowedProfiles: asset.allowedProfiles ?? [],
      blockedProfiles: asset.blockedProfiles ?? [],

      // bridge defaults for the older preview type
      triggerType: "MANUAL",
      cooldownSongs: 0,
      cooldownMinutes: 0,
    } as unknown as InterstitialAsset;
  });
}