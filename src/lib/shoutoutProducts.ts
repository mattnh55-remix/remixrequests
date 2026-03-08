
export type ShoutoutProductKey =
  | "TEXT_BASIC"
  | "PHOTO_BASIC"
  | "TEXT_ROLLER"
  | "PHOTO_ROLLER"
  | "TEXT_VIP"
  | "PHOTO_VIP";

export type ShoutoutProduct = {
  key: ShoutoutProductKey;
  title: string;
  description: string;
  creditsCost: number;
  displayDurationSec: number;
  weight: number;
  hasImage: boolean;
  accent: "cyan" | "gold" | "pink";
  enabled: boolean;
  comingSoon?: boolean;
};

export const SHOUTOUT_PRODUCTS: ShoutoutProduct[] = [
  {
    key: "TEXT_BASIC",
    title: "Basic Text Shout Out",
    description: "A text-only message that stays live on our screen for 5 minutes.",
    creditsCost: 3,
    displayDurationSec: 300,
    weight: 1,
    hasImage: false,
    accent: "cyan",
    enabled: true,
  },
  {
    key: "PHOTO_BASIC",
    title: "Basic Text & Photo Shout Out",
    description: "A text message with an uploaded photo that stays live on our screen for 5 minutes.",
    creditsCost: 6,
    displayDurationSec: 300,
    weight: 1,
    hasImage: true,
    accent: "cyan",
    enabled: false,
    comingSoon: true,
  },
  {
    key: "TEXT_ROLLER",
    title: "Remix Roller Text Shout Out",
    description: "A text-only message that stays live on our screen for 20 minutes.",
    creditsCost: 8,
    displayDurationSec: 1200,
    weight: 2,
    hasImage: false,
    accent: "gold",
    enabled: true,
  },
  {
    key: "PHOTO_ROLLER",
    title: "Remix Roller Text & Photo Shout Out",
    description: "A text message with an uploaded photo that stays live on our screen for 20 minutes.",
    creditsCost: 12,
    displayDurationSec: 1200,
    weight: 2,
    hasImage: true,
    accent: "gold",
    enabled: false,
    comingSoon: true,
  },
  {
    key: "TEXT_VIP",
    title: "VIP Text Shout Out",
    description: "A text-only message that stays live on our screen for 60 minutes.",
    creditsCost: 18,
    displayDurationSec: 3600,
    weight: 4,
    hasImage: false,
    accent: "pink",
    enabled: true,
  },
  {
    key: "PHOTO_VIP",
    title: "VIP Text & Photo Shout Out",
    description: "A text message with an uploaded photo that stays live on our screen for 60 minutes.",
    creditsCost: 25,
    displayDurationSec: 3600,
    weight: 4,
    hasImage: true,
    accent: "pink",
    enabled: false,
    comingSoon: true,
  },
];

export function getShoutoutProduct(key?: string | null): ShoutoutProduct | null {
  if (!key) return null;
  return SHOUTOUT_PRODUCTS.find((p) => p.key === key) ?? null;
}

export function getLegacyProductAlias(input?: string | null): ShoutoutProductKey | null {
  const v = String(input || "").trim().toUpperCase();
  if (!v) return null;
  if (v === "BASIC") return "TEXT_BASIC";
  if (v === "FEATURED") return "TEXT_ROLLER";
  if (SHOUTOUT_PRODUCTS.some((p) => p.key === v)) return v as ShoutoutProductKey;
  return null;
}

export function getShoutoutAccent(key?: string | null): "cyan" | "gold" | "pink" {
  return getShoutoutProduct(key)?.accent || "cyan";
}

export function formatShoutoutProductLabel(key?: string | null): string {
  return getShoutoutProduct(key)?.title || "Shout Out";
}
