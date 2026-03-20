import type { InterstitialAsset } from "@/lib/booth/interstitial-types";

export const mockInterstitialAssets: InterstitialAsset[] = [
  {
    id: "asset_request_single_1",
    name: "Here's a Song by Request",
    category: "REQUEST_INTRO_SINGLE",
    triggerType: "REQUEST_SINGLE",
    filePath: "/audio/interstitials/request-single.mp3",
    durationSec: 4,
    active: true,

    priority: 80,
    randomWeight: 1,

    cooldownSongs: 2,
    cooldownMinutes: 6,

    allowedProfiles: [],
    blockedProfiles: [],

    scheduleMode: "NONE",
    intervalMinutes: null,
    minSongsBetweenPlays: 2,
    maxUsesPerSession: null,
    cleanTransitionOnly: true,

    requestClusterEligible: false,
    requestSingleEligible: true,
    brandingEligible: false,
    startsBlock: false,
    manualOnly: false,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "asset_request_block_1",
    name: "Here's a Block of Your Requests",
    category: "REQUEST_INTRO_BLOCK",
    triggerType: "REQUEST_CLUSTER",
    filePath: "/audio/interstitials/request-block.mp3",
    durationSec: 5,
    active: true,

    priority: 90,
    randomWeight: 1,

    cooldownSongs: 3,
    cooldownMinutes: 8,

    allowedProfiles: [],
    blockedProfiles: [],

    scheduleMode: "NONE",
    intervalMinutes: null,
    minSongsBetweenPlays: 3,
    maxUsesPerSession: null,
    cleanTransitionOnly: true,

    requestClusterEligible: true,
    requestSingleEligible: false,
    brandingEligible: false,
    startsBlock: true,
    manualOnly: false,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "asset_branding_1",
    name: "REMIX Roller Rink Drop",
    category: "BRANDING_SHORT",
    triggerType: "RANDOM_BRANDING",
    filePath: "/audio/interstitials/remix-branding-1.mp3",
    durationSec: 3,
    active: true,

    priority: 40,
    randomWeight: 3,

    cooldownSongs: 3,
    cooldownMinutes: 10,

    allowedProfiles: [],
    blockedProfiles: [],

    scheduleMode: "NONE",
    intervalMinutes: null,
    minSongsBetweenPlays: 3,
    maxUsesPerSession: null,
    cleanTransitionOnly: true,

    requestClusterEligible: false,
    requestSingleEligible: false,
    brandingEligible: true,
    startsBlock: false,
    manualOnly: false,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "asset_rules_family_1",
    name: "Family Session Rules Reminder",
    category: "RULES_ANNOUNCEMENT",
    triggerType: "SCHEDULED_INTERVAL",
    filePath: "/audio/interstitials/family-rules.mp3",
    durationSec: 8,
    active: true,

    priority: 100,
    randomWeight: 1,

    cooldownSongs: 6,
    cooldownMinutes: 120,

    allowedProfiles: ["FAMILY"],
    blockedProfiles: [],

    scheduleMode: "INTERVAL_MINUTES",
    intervalMinutes: 120,
    minSongsBetweenPlays: 6,
    maxUsesPerSession: 4,
    cleanTransitionOnly: true,

    requestClusterEligible: false,
    requestSingleEligible: false,
    brandingEligible: false,
    startsBlock: false,
    manualOnly: false,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];