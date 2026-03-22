import type { QueueLikeItem } from "@/components/booth/types";

type InterstitialDisplay = {
  title: string;
  reasonChip: string;
  durationLabel: string | null;
  contextLabel: string | null;
  assetLabel: string | null;
  clusterLabel: string | null;
};

function cleanLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(value: string) {
  return cleanLabel(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSeconds(durationSec: unknown) {
  if (typeof durationSec !== "number" || !Number.isFinite(durationSec) || durationSec <= 0) {
    return null;
  }

  if (durationSec < 60) return `${Math.round(durationSec)}s`;

  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.round(durationSec % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function extractReasonChip(item: QueueLikeItem) {
  const clusterId = String(item.clusterId || "");

  if (clusterId.includes("request")) return "REQUEST BLOCK";
  if (clusterId.includes("reverse")) return "GAME START";
  if (clusterId.includes("chicken")) return "DANCE INTRO";
  if (clusterId.includes("promo")) return "PROMO";
  if (clusterId.includes("birthday")) return "BIRTHDAY";

  return "AUTO INSERT";
}

function extractContextLabel(item: QueueLikeItem) {
  const metadata = (item as QueueLikeItem & { metadata?: Record<string, unknown> }).metadata;
  const targetTitle =
    typeof metadata?.targetTitle === "string"
      ? metadata.targetTitle
      : typeof metadata?.targetSongName === "string"
        ? metadata.targetSongName
        : null;

  if (targetTitle) {
    return `Before: ${targetTitle}`;
  }

  return null;
}

function extractAssetLabel(item: QueueLikeItem) {
  const metadata = (item as QueueLikeItem & { metadata?: Record<string, unknown> }).metadata;
  const assetName =
    typeof metadata?.assetName === "string"
      ? metadata.assetName
      : typeof metadata?.interstitialAssetName === "string"
        ? metadata.interstitialAssetName
        : null;

  if (assetName) return `Asset: ${assetName}`;
  return null;
}

export function getInterstitialDisplay(item: QueueLikeItem): InterstitialDisplay {
  const rawTitle = String(item.title || "").trim();
  const title = rawTitle ? rawTitle : "Play Interstitial";
  const clusterId = String(item.clusterId || "").trim();

  return {
    title,
    reasonChip: extractReasonChip(item),
    durationLabel: formatSeconds(item.durationSec),
    contextLabel: extractContextLabel(item),
    assetLabel: extractAssetLabel(item),
    clusterLabel: clusterId ? `Cluster ${toTitleCase(clusterId)}` : null,
  };
}
