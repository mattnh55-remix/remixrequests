export type QueueItemLike = {
  id: string;
  status: "QUEUED" | "LOADED" | "PLAYING" | "HELD" | "PLAYED" | "SKIPPED" | string;
  position: number;
  createdAt: string;

  sourceType?: "REQUEST" | "HOUSE" | "FILLER" | string;

  introAssigned?: boolean | null;
  clusterId?: string | null;

  title?: string | null;
  artist?: string | null;
};

export type InterstitialCategory =
  | "REQUEST_INTRO_SINGLE"
  | "REQUEST_INTRO_BLOCK"
  | "BRANDING_SHORT"
  | "RULES_ANNOUNCEMENT"
  | "GAME_ANNOUNCEMENT"
  | "BIRTHDAY"
  | "SAFETY"
  | "MANUAL_ONLY";

export type InterstitialTriggerType =
  | "REQUEST_SINGLE"
  | "REQUEST_CLUSTER"
  | "SCHEDULED_INTERVAL"
  | "TOP_OF_HOUR_WINDOW"
  | "RANDOM_BRANDING"
  | "MANUAL"
  | "PROFILE_EVENT";

export type InterstitialScheduleMode =
  | "NONE"
  | "INTERVAL_MINUTES"
  | "TOP_OF_HOUR_WINDOW"
  | "ONCE_PER_SESSION"
  | "MANUAL_ONLY";

export type InterstitialAsset = {
  id: string;
  name: string;
  category: InterstitialCategory;
  triggerType: InterstitialTriggerType;
  filePath: string;
  durationSec: number;
  active: boolean;

  priority: number;
  randomWeight: number | null;

  cooldownSongs: number | null;
  cooldownMinutes: number | null;

  allowedProfiles: string[];
  blockedProfiles: string[];

  scheduleMode: InterstitialScheduleMode;
  intervalMinutes: number | null;
  minSongsBetweenPlays: number | null;
  maxUsesPerSession: number | null;
  cleanTransitionOnly: boolean;

  requestClusterEligible: boolean;
  requestSingleEligible: boolean;
  brandingEligible: boolean;
  startsBlock: boolean;
  manualOnly: boolean;

  createdAt: string;
  updatedAt: string;
};

export type InterstitialReason =
  | "REQUEST_SINGLE"
  | "REQUEST_CLUSTER"
  | "SCHEDULED_INTERVAL"
  | "TOP_OF_HOUR_WINDOW"
  | "BRANDING_GAP_FILL"
  | "MANUAL_OVERRIDE"
  | "PROFILE_EVENT";

export type InterstitialEventStatus =
  | "PLANNED"
  | "SKIPPED"
  | "PLAYED"
  | "CANCELLED";

export type InterstitialEvent = {
  id: string;
  sessionId: string;
  locationId: string;

  assetId: string;
  status: InterstitialEventStatus;
  reason: InterstitialReason;

  insertedBeforeQueueItemId: string | null;
  insertedAfterQueueItemId: string | null;

  linkedRequestClusterId: string | null;

  plannedAt: string;
  playedAt: string | null;
  skippedAt: string | null;

  operatorOverride: boolean;
  overrideNote: string | null;

  metadata: Record<string, unknown> | null;
};

export type InterstitialRulesConfig = {
  requestClusterThreshold: number;
  lookaheadWindow: number;

  singleIntroCooldownSongs: number;
  singleIntroCooldownMinutes: number;

  blockIntroCooldownSongs: number;
  blockIntroCooldownMinutes: number;

  brandingMinSpacingSongs: number;
  brandingMinSpacingMinutes: number;

  maxNonCriticalInsertsPer15Min: number;

  topOfHourWindowMinutes: number;

  enableRequestIntros: boolean;
  enableBrandingDrops: boolean;
  enableScheduledInterstitials: boolean;
};

export type RequestClusterDetection = {
  consecutiveRequestCount: number;
  requestClusterDetected: boolean;
  singleRequestDetected: boolean;
  firstQueueItemId: string | null;
};

export type EligibilityContext = {
  nowIso: string;
  profile: string;
  queueItems: QueueItemLike[];
  nextQueueItem: QueueItemLike | null;
  recentInterstitialEvents: InterstitialEvent[];
  rules: InterstitialRulesConfig;
  reason:
    | "REQUEST_SINGLE"
    | "REQUEST_CLUSTER"
    | "SCHEDULED_INTERVAL"
    | "TOP_OF_HOUR_WINDOW"
    | "BRANDING_GAP_FILL";
};

export type NextPlaybackAction =
  | {
      action: "PLAY_QUEUE_ITEM";
      queueItemId: string;
      reason: "DIRECT_PLAY";
    }
  | {
      action: "PLAY_INTERSTITIAL_THEN_QUEUE_ITEM";
      assetId: string;
      queueItemId: string;
      reason:
        | "REQUEST_SINGLE"
        | "REQUEST_CLUSTER"
        | "SCHEDULED_INTERVAL"
        | "TOP_OF_HOUR_WINDOW"
        | "BRANDING_GAP_FILL";
    }
  | {
      action: "NO_ACTION";
      reason: "NO_PLAYABLE_QUEUE_ITEM";
    };

export const defaultInterstitialRules: InterstitialRulesConfig = {
  requestClusterThreshold: 2,
  lookaheadWindow: 4,

  singleIntroCooldownSongs: 2,
  singleIntroCooldownMinutes: 6,

  blockIntroCooldownSongs: 3,
  blockIntroCooldownMinutes: 8,

  brandingMinSpacingSongs: 3,
  brandingMinSpacingMinutes: 10,

  maxNonCriticalInsertsPer15Min: 3,

  topOfHourWindowMinutes: 10,

  enableRequestIntros: true,
  enableBrandingDrops: true,
  enableScheduledInterstitials: true,
};