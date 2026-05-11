// src/app/admin/[location]/page.tsx

"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import AdminGunmetalTheme from "../../../components/ui/admin/AdminGunmetalTheme";
import SongManagementPanel from "@/components/admin/SongManagementPanel";
import { SHOUTOUT_PRODUCTS } from "@/lib/shoutoutProducts";
import { useRouter, useSearchParams } from "next/navigation";

type TabKey =
  | "dashboard"
  | "songs"
  | "requestSettings"
  | "top10"
  | "manualTop10"
  | "users"
  | "staff"
  | "shoutoutSettings";

type RequestItem = {
  id: string;
  title: string;
  artist: string;
  score: number;
  createdAt?: string;
  type?: string;
  requestedByLabel?: string;
  boosted?: boolean;
  upvotes?: number;
  downvotes?: number;
  redemptionCode?: string | null;
};

type StaffRole = "STAFF" | "SUPER_ADMIN";

type StaffUserItem = {
  id: string;
  username: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
};

type MessageItem = {
  id: string;
  fromName: string;
  messageText: string;
  tier: string;
  creditsCost?: number;
  status?: string;
  moderationNotes?: string | null;
  autoTextModerationReason?: string | null;
  createdAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  displayDurationSec?: number;
  imageOriginalPath?: string | null;
  imagePreviewPath?: string | null;
  imageModerationStatus?: string | null;
  signedImageUrl?: string | null;
};

type PlaceholderMessage = {
  id: string;
  title: string;
  body: string;
  fromName: string;
  imageUrl?: string | null;
  imagePath?: string | null;
  accent?: "gold" | "cyan" | "pink";
  productTitle?: string;
};

type BonusChallengeConfig = {
  key: string;
  title: string;
  linkUrl?: string | null;
  pointValue: number;
  ctaText: string;
  buttonText: string;
  modalMessage?: string | null;
  isActive: boolean;
  sortOrder: number;
};

type RulesState = {
  costRequest: number;
  costUpvote: number;
  costDownvote: number;
  costPlayNow: number;
  enableVoting: boolean;
  albumArtBaseUrl?: string;
  defaultAlbumArtUrl?: string;
  enforceArtistCooldown?: boolean;
  enforceSongCooldown?: boolean;
  artistCooldownMinutes?: number;
  songCooldownMinutes?: number;
  maxRequestsPerSession?: number;
  maxVotesPerSession?: number;
  minSecondsBetweenActions?: number;
  maxArtistInQueue?: number;
  maxActiveRequestsPerUser?: number;
  maxOnDeck?: number;
  msgExplicit?: string;
  msgTooManyActiveRequests?: string;
  msgAlreadyRequested?: string;
  msgArtistCooldown?: string;
  msgSongCooldown?: string;
  msgArtistAlreadyQueued?: string;
  msgNoCredits?: string;
  msgQueueFull?: string;
  logoUrl?: string;
  packTier1PriceCents?: number;
  packTier2PriceCents?: number;
  packTier3PriceCents?: number;
  packTier4PriceCents?: number;
  bonusChallengeEnabled?: boolean;
  bonusChallengeRotationMode?: "daily" | "weekly" | "override";
  bonusChallengeOverrideKey?: string;
  bonusChallenges?: BonusChallengeConfig[];
  top10Enabled?: boolean;
  top10AdultModeEnabled?: boolean;
  top10Timezone?: string;
  top10AdultCutoffHour?: number;
  top10AdultCutoffMinute?: number;
  top10AutoRefreshEnabled?: boolean;
  top10AutoRefreshDays?: string[];
  shoutoutSlideSeconds?: number;
  enabled?: boolean;
  maxFromNameChars?: number;
  maxMessageChars?: number;
  maxPendingPerIdentity?: number;
  filterBlockMessage?: string;
};

type MessageRulesState = {
  enabled: boolean;
  maxFromNameChars: number;
  maxMessageChars: number;
  maxPendingPerIdentity: number;
  filterBlockMessage: string;
};

type SessionUser = {
  emailHash: string;
  label: string;
  verified: boolean;
  points: number;
  redemptionCode?: string | null;
};

type RecentUserFilter = "qualifying" | "redeem" | "purchase" | "both";

type RecentUserItem = {
  emailHash: string;
  label: string;
  verified: boolean;
  points: number;
  lastActivityAt?: string;
  redeemedCount: number;
  purchaseCount: number;
  redeemedRecently?: boolean;
  purchasedRecently?: boolean;
};

type UserLedgerEntry = {
  id: string;
  createdAt: string;
  delta: number;
  reason: string;
  expiresAt?: string | null;
};

type UserHistoryDetail = {
  emailHash: string;
  label: string;
  verified: boolean;
  points: number;
  lastActivityAt?: string;
  entries: UserLedgerEntry[];
};

type RecentUsersResponse = {
  ok?: boolean;
  items?: RecentUserItem[];
  total?: number;
  page?: number;
  pageSize?: number;
};

type Top10Bucket = "GENERAL" | "ADULT";

type Top10Item = {
  id: string;
  title: string;
  artist: string;
  score: number;
  requestCount?: number;
  upvotes?: number;
  downvotes?: number;
  artworkUrl?: string | null;
  lastActivityAt?: string;
};

type Top10Response = {
  ok?: boolean;
  sessionId?: string;
  bucket?: Top10Bucket;
  boardTitle?: string;
  displayLabel?: string;
  updatedAt?: string;
  dataSource?: "TOP10" | "FEATURED_TRACKS" | "DISABLED";
  items?: Top10Item[];
};

type ManualRequestStatus = "A" | "R" | "P";

type ManualTop10Item = {
  id: string;
  requestId: string;
  songId: string;
  title: string;
  artist: string;
  artworkUrl?: string | null;
  requestStatus: string;
  statusSymbol: ManualRequestStatus;
  createdAt?: string;
  requesterLabel?: string;
  upvotes: number;
  downvotes: number;
  score: number;
  rank?: number;
};

type ManualTop10Response = {
  ok?: boolean;
  requestPool?: ManualTop10Item[];
  boardItems?: ManualTop10Item[];
  targetVotes?: number;
  updatedAt?: string | null;
  error?: string;
};

const TOP10_WEEKDAYS = [
  { key: "SUNDAY", label: "Sun" },
  { key: "MONDAY", label: "Mon" },
  { key: "TUESDAY", label: "Tue" },
  { key: "WEDNESDAY", label: "Wed" },
  { key: "THURSDAY", label: "Thu" },
  { key: "FRIDAY", label: "Fri" },
  { key: "SATURDAY", label: "Sat" },
] as const;

type RedemptionCode = {
  id: string;
  code: string;
  points: number;
  uses: number;
  maxUses: number;
  expiresAt: string;
  disabledAt?: string | null;
};

type RedemptionCodeUseItem = {
  id: string;
  usedAt: string;
  emailHash: string;
  label: string;
  reason: string;
  delta: number;
};

type AdminShoutoutsResponse = {
  ok?: boolean;
  pending?: MessageItem[];
  approved?: MessageItem[];
  active?: MessageItem[];
  rejected?: MessageItem[];
  blockedCount?: number;
};

type DashboardLedgerStats = {
  baselineAt: string | null;
  activeUsers: number;
  verifiedUsers: number;
  liveQueueCount: number;
  boostedQueueCount: number;
  standardQueueCount: number;
  redemptionCodesLoaded: number;
  totalQualifyingUsers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  pointsAvailable: number;
  purchaseCount: number;
  estimatedRevenueCents: number;
  welcomeUsers: number;
  redeemedUsers: number;
};

const DEFAULT_PLACEHOLDERS: PlaceholderMessage[] = [
  {
    id: "msg1",
    title: "REMIX SHOUT OUTS!",
    body: "Happy Birthday Taylor and Hunter!",
    fromName: "-$name",
    imageUrl: null,
    imagePath: null,
    accent: "cyan",
    productTitle: "Basic Text Shout Out",
  },
  {
    id: "msg2",
    title: "REMIX SHOUT OUTS!",
    body: "Congrats to our birthday crew tonight. Thanks for celebrating at Remix!",
    fromName: "-$name",
    imageUrl: null,
    imagePath: null,
    accent: "gold",
    productTitle: "Remix Roller Text Shout Out",
  },
  {
    id: "msg3",
    title: "REMIX SHOUT OUTS!",
    body: "Welcome to Remix! Scan the code, request your song, and send a shout out.",
    fromName: "-$name",
    imageUrl: null,
    imagePath: null,
    accent: "pink",
    productTitle: "VIP Text Shout Out",
  },
];

const DEFAULT_BONUS_CHALLENGES: BonusChallengeConfig[] = [
  {
    key: "google_review",
    title: "Leave a Google Review!",
    linkUrl: "https://g.page/r/CZtixt2Zc7i1EBM/review",
    pointValue: 10,
    ctaText: "Show a Staff Member to Receive Your Bonus Card",
    buttonText: "Leave Review",
    modalMessage: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    key: "social_tag",
    title: "Tag Us On Social Media!",
    linkUrl: null,
    pointValue: 10,
    ctaText: "Show a Staff Member to Receive Your Bonus Card",
    buttonText: "Redeem Now!",
    modalMessage:
      "Show a staff member your social media post tagging Remix to receive your bonus card.",
    isActive: true,
    sortOrder: 2,
  },
  {
    key: "skate_selfie",
    title: "#SkateSelfie at Our Remix Wall!",
    linkUrl: null,
    pointValue: 10,
    ctaText:
      "Tag a photo of your crew at the Remix Mural on any Social Media Platform! Use #SkateSelfie! Show a Staff Member to Receive Your Bonus Card.",
    buttonText: "Redeem Now!",
    modalMessage:
      "Tag a photo of your crew at the Remix Mural on any social media platform using #SkateSelfie, then show a staff member to receive your bonus card.",
    isActive: true,
    sortOrder: 3,
  },
];

function normalizeBonusChallenges(value: unknown): BonusChallengeConfig[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_BONUS_CHALLENGES;
  }

  return value.map((item: any, index: number) => ({
    key: String(item?.key || `challenge_${index + 1}`),
    title: String(item?.title || DEFAULT_BONUS_CHALLENGES[index]?.title || ""),
    linkUrl:
      item?.linkUrl === null ||
      item?.linkUrl === undefined ||
      item?.linkUrl === ""
        ? (DEFAULT_BONUS_CHALLENGES[index]?.linkUrl ?? null)
        : String(item.linkUrl),
    pointValue: Number(
      item?.pointValue ?? DEFAULT_BONUS_CHALLENGES[index]?.pointValue ?? 10,
    ),
    ctaText: String(
      item?.ctaText || DEFAULT_BONUS_CHALLENGES[index]?.ctaText || "",
    ),
    buttonText: String(
      item?.buttonText ||
        DEFAULT_BONUS_CHALLENGES[index]?.buttonText ||
        "Learn More",
    ),
    modalMessage:
      item?.modalMessage === null ||
      item?.modalMessage === undefined ||
      item?.modalMessage === ""
        ? (DEFAULT_BONUS_CHALLENGES[index]?.modalMessage ?? null)
        : String(item.modalMessage),
    isActive: Boolean(
      item?.isActive ?? DEFAULT_BONUS_CHALLENGES[index]?.isActive ?? true,
    ),
    sortOrder: Number(
      item?.sortOrder ??
        DEFAULT_BONUS_CHALLENGES[index]?.sortOrder ??
        index + 1,
    ),
  }));
}

function getWeekNumber(date: Date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getActiveBonusChallenge(rules: any): BonusChallengeConfig | null {
  if (!rules?.bonusChallengeEnabled) return null;

  const challenges = normalizeBonusChallenges(rules?.bonusChallenges);
  if (!challenges.length) return null;

  const mode = rules?.bonusChallengeRotationMode || "weekly";
  const overrideKey = String(rules?.bonusChallengeOverrideKey || "").trim();

  if (mode === "override" && overrideKey) {
    return challenges.find((c) => c.key === overrideKey) || challenges[0];
  }

  const now = new Date();

  if (mode === "daily") {
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const day = Math.floor(diff / 86400000);
    return challenges[day % challenges.length];
  }

  const week = getWeekNumber(now);
  return challenges[week % challenges.length];
}

function placeholderKey(location: string) {
  return `rr_tv_placeholders:${location}`;
}

function logoKey(location: string) {
  return `rr_admin_logoUrl:${location}`;
}

function loadSavedPlaceholders(location: string): PlaceholderMessage[] {
  try {
    const raw = localStorage.getItem(placeholderKey(location));
    if (!raw) return DEFAULT_PLACEHOLDERS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_PLACEHOLDERS;

    return parsed.map((p: any, i: number) => ({
      id: p?.id || `msg${i + 1}`,
      title: String(
        p?.title || DEFAULT_PLACEHOLDERS[i]?.title || "REMIX SHOUT OUTS!",
      ),
      body: String(p?.body || DEFAULT_PLACEHOLDERS[i]?.body || ""),
      fromName: String(
        p?.fromName || DEFAULT_PLACEHOLDERS[i]?.fromName || "-$name",
      ),
      imageUrl: p?.imageUrl || null,
      imagePath: p?.imagePath || null,
      accent: (p?.accent || DEFAULT_PLACEHOLDERS[i]?.accent || "cyan") as
        | "gold"
        | "cyan"
        | "pink",
      productTitle: String(
        p?.productTitle ||
          DEFAULT_PLACEHOLDERS[i]?.productTitle ||
          "Remix Shout Out",
      ),
    }));
  } catch {
    return DEFAULT_PLACEHOLDERS;
  }
}

function savePlaceholders(location: string, items: PlaceholderMessage[]) {
  localStorage.setItem(placeholderKey(location), JSON.stringify(items));
}

function safeProduct(tier?: string) {
  return tier ? (SHOUTOUT_PRODUCTS as any)[tier] : null;
}

function centsToDollars(cents: any): string {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "0.00";
  return (Math.max(0, Math.round(n)) / 100).toFixed(2);
}

function dollarsToCents(dollars: any): number {
  const n = Number(dollars);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return { ok: false, _raw: "", _nonJson: true };
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, _raw: text.slice(0, 500), _nonJson: true };
  }
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.value = 880;
    o2.frequency.value = 1320;
    g.gain.value = 0.0001;

    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    o1.start(now);
    o2.start(now);
    o1.stop(now + 0.25);
    o2.stop(now + 0.25);

    setTimeout(() => ctx.close().catch(() => {}), 400);
  } catch {}
}

function rulesCostsFromRules(rules: RulesState | null) {
  return {
    costRequest: Number(rules?.costRequest ?? 1),
    costPlayNow: Number(rules?.costPlayNow ?? 5),
    costUpvote: Number(rules?.costUpvote ?? 1),
    costDownvote: Number(rules?.costDownvote ?? 1),
  };
}

function requestTypeLabel(q: RequestItem) {
  if (q.type === "PLAY_NOW" || q.boosted) return "BOOST";
  return "REQUEST";
}

function requestMetaLine(q: RequestItem) {
  const who = q.requestedByLabel || "Skater";
  const parts = [`Requested by ${who}`];
  if (q.redemptionCode) parts.push(`Code: ${q.redemptionCode}`);
  return parts.join(" • ");
}

function shortHash(hash?: string) {
  const raw = String(hash || "");
  if (raw.length <= 12) return raw || "Unknown";
  return `${raw.slice(0, 8)}…${raw.slice(-4)}`;
}

function userLabel(label?: string, emailHash?: string) {
  const clean = String(label || "").trim();
  if (clean) return clean;
  return `User ${shortHash(emailHash)}`;
}

function reasonTone(reason?: string) {
  const raw = String(reason || "").toUpperCase();
  if (raw.includes("ADMIN")) return "warn";
  if (raw.includes("REDEEM")) return "live";
  if (
    raw.includes("PURCHASE") ||
    raw.includes("PAYMENT") ||
    raw.includes("CHECKOUT") ||
    raw.includes("PACK")
  )
    return "live";
  if (
    raw.includes("REQUEST") ||
    raw.includes("UPVOTE") ||
    raw.includes("DOWNVOTE") ||
    raw.includes("PLAY_NOW")
  )
    return "danger";
  return undefined;
}

function queueBuckets(items: RequestItem[]) {
  return {
    boosts: items.filter((q) => q.boosted || q.type === "PLAY_NOW"),
    next: items.filter((q) => !(q.boosted || q.type === "PLAY_NOW")),
  };
}

function dashboardStatsStorageKey(location: string) {
  return `rr_admin_dashboard_stats_reset:${location}`;
}

function readDashboardBaseline(location: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(dashboardStatsStorageKey(location));
  } catch {
    return null;
  }
}

function writeDashboardBaseline(location: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!value) {
      localStorage.removeItem(dashboardStatsStorageKey(location));
      return;
    }
    localStorage.setItem(dashboardStatsStorageKey(location), value);
  } catch {}
}

function normalizeReason(reason?: string) {
  return String(reason || "")
    .trim()
    .toUpperCase();
}

function isWelcomeReason(reason?: string) {
  const raw = normalizeReason(reason);
  return raw.includes("WELCOME") || raw.includes("VERIFY");
}

function isRedeemReason(reason?: string) {
  const raw = normalizeReason(reason);
  return raw.includes("REDEEM");
}

function isPurchaseReason(reason?: string) {
  const raw = normalizeReason(reason);
  return (
    raw.includes("PURCHASE") ||
    raw.includes("PAYMENT") ||
    raw.includes("CHECKOUT") ||
    raw.includes("PACK")
  );
}

function isSpendReason(reason?: string) {
  const raw = normalizeReason(reason);
  return (
    raw.includes("REQUEST") ||
    raw.includes("UPVOTE") ||
    raw.includes("DOWNVOTE") ||
    raw.includes("PLAY_NOW") ||
    raw.includes("BOOST") ||
    raw.includes("SHOUTOUT") ||
    raw.includes("MESSAGE")
  );
}

function estimatePurchaseRevenueCents(delta: number, rules: RulesState | null) {
  const amount = Math.max(0, Number(delta || 0));
  if (!amount || !rules) return 0;

  const packMap: Record<number, number> = {
    10: Number(rules.packTier1PriceCents || 500),
    25: Number(rules.packTier2PriceCents || 1000),
    35: Number(rules.packTier3PriceCents || 1500),
    50: Number(rules.packTier4PriceCents || 2000),
  };

  return packMap[amount] || 0;
}

function formatCurrencyFromCents(cents: number) {
  return `$${centsToDollars(cents)}`;
}

function formatDashboardSince(value: string | null) {
  if (!value) return "All time";
  try {
    return `Since ${new Date(value).toLocaleString()}`;
  } catch {
    return "Custom range";
  }
}

export default function AdminPage({
  params,
}: {
  params: { location: string };
}) {
  const location = params.location;
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/signin");
  }

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const res = await fetch("/api/admin/me");

      if (!res.ok) {
        router.push("/signin");
        return;
      }

      setCheckingAuth(false);
    }

    checkAuth();
  }, []);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [msg, setMsg] = useState("");
  const [rulesDirty, setRulesDirty] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [requestSettingsMsg, setRequestSettingsMsg] = useState("");
  const [top10SettingsMsg, setTop10SettingsMsg] = useState("");
  const [shoutoutSettingsMsg, setShoutoutSettingsMsg] = useState("");
  const [cachedLogoUrl, setCachedLogoUrl] = useState("");
  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [pendingMessages, setPendingMessages] = useState<MessageItem[]>([]);
  const [approvedMessages, setApprovedMessages] = useState<MessageItem[]>([]);
  const [activeMessages, setActiveMessages] = useState<MessageItem[]>([]);
  const [rejectedMessages, setRejectedMessages] = useState<MessageItem[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);

  const [rules, setRules] = useState<RulesState | null>(null);
  const [messageRules, setMessageRules] = useState<MessageRulesState | null>(
    null,
  );
  const [messageRulesDirty, setMessageRulesDirty] = useState(false);
  const [placeholders, setPlaceholders] =
    useState<PlaceholderMessage[]>(DEFAULT_PLACEHOLDERS);
  const [placeholderUploadBusyId, setPlaceholderUploadBusyId] =
    useState<string>("");
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUserItem[]>([]);
  const [recentUsersTotal, setRecentUsersTotal] = useState(0);
  const [recentUsersPage, setRecentUsersPage] = useState(1);
  const [recentUsersPageSize] = useState(50);
  const [recentUsersFilter, setRecentUsersFilter] =
    useState<RecentUserFilter>("qualifying");
  const [recentUsersBusy, setRecentUsersBusy] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalBusy, setUserModalBusy] = useState(false);
  const [userModalSaving, setUserModalSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserHistoryDetail | null>(
    null,
  );
  const [targetBalance, setTargetBalance] = useState("");
  const [adjustReason, setAdjustReason] = useState("Manual correction");
  const [top10, setTop10] = useState<Top10Item[]>([]);
  const [top10BucketView, setTop10BucketView] = useState<Top10Bucket | "AUTO">(
    "AUTO",
  );
  const [top10ActiveBucket, setTop10ActiveBucket] = useState<Top10Bucket | "">(
    "",
  );
  const [top10BoardTitle, setTop10BoardTitle] = useState("Top 10");
  const [top10UpdatedAt, setTop10UpdatedAt] = useState("");
  const [top10SessionId, setTop10SessionId] = useState("");
  const [top10DataSource, setTop10DataSource] = useState<
    "TOP10" | "FEATURED_TRACKS" | "DISABLED" | ""
  >("");
  const [top10Busy, setTop10Busy] = useState(false);
  const [manualRequestPool, setManualRequestPool] = useState<ManualTop10Item[]>([]);
  const [manualTop10Items, setManualTop10Items] = useState<ManualTop10Item[]>([]);
  const [manualTargetVotes, setManualTargetVotes] = useState("512");
  const [manualTop10Msg, setManualTop10Msg] = useState("");
  const [manualTop10Busy, setManualTop10Busy] = useState(false);
  const [manualTop10UpdatedAt, setManualTop10UpdatedAt] = useState<string | null>(null);
  const [manualDragId, setManualDragId] = useState<string>("");
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [codesMsg, setCodesMsg] = useState("");
  const [codeNew, setCodeNew] = useState("");
  const [codePoints, setCodePoints] = useState<number>(10);
  const [codeMaxUses, setCodeMaxUses] = useState<number>(1);
  const [importingCodes, setImportingCodes] = useState(false);
  const [codeUsesOpen, setCodeUsesOpen] = useState(false);
  const [codeUsesLoading, setCodeUsesLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<RedemptionCode | null>(null);
  const [selectedCodeUses, setSelectedCodeUses] = useState<
    RedemptionCodeUseItem[]
  >([]);
  const [editOpen, setEditOpen] = useState(false);

  const [currentStaffRole, setCurrentStaffRole] = useState<StaffRole | "">("");
  const [staffUsers, setStaffUsers] = useState<StaffUserItem[]>([]);
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffMsg, setStaffMsg] = useState("");
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffPin, setNewStaffPin] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>("STAFF");
  const [currentStaffUsername, setCurrentStaffUsername] = useState("");

  const [dashboardLedgerStats, setDashboardLedgerStats] =
    useState<DashboardLedgerStats>({
      baselineAt: null,
      activeUsers: 0,
      verifiedUsers: 0,
      liveQueueCount: 0,
      boostedQueueCount: 0,
      standardQueueCount: 0,
      redemptionCodesLoaded: 0,
      totalQualifyingUsers: 0,
      pointsIssued: 0,
      pointsRedeemed: 0,
      pointsAvailable: 0,
      purchaseCount: 0,
      estimatedRevenueCents: 0,
      welcomeUsers: 0,
      redeemedUsers: 0,
    });
  const [dashboardStatsBusy, setDashboardStatsBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string>("");

  const [editBusy, setEditBusy] = useState(false);
  const [editMessageId, setEditMessageId] = useState("");
  const [editFromName, setEditFromName] = useState("");
  const [editMessageText, setEditMessageText] = useState("");
  const prevRequestIdsRef = useRef<Set<string>>(new Set());
  const prevMessageIdsRef = useRef<Set<string>>(new Set());
  const hasBootedRef = useRef(false);

  const liveProducts = useMemo(() => Object.values(SHOUTOUT_PRODUCTS), []);
  const logoUrl = rules?.logoUrl || cachedLogoUrl || "/logo.png";
  const requestBuckets = useMemo(
    () => queueBuckets(pendingRequests),
    [pendingRequests],
  );

  function cacheLogo(url?: string | null) {
    if (!url) return;
    try {
      localStorage.setItem(logoKey(location), url);
      setCachedLogoUrl(url);
    } catch {}
  }

  function loadCachedLogo() {
    try {
      const v = localStorage.getItem(logoKey(location));
      if (v) setCachedLogoUrl(v);
    } catch {}
  }

  function maybePlayChime(
    nextRequestItems: RequestItem[],
    nextPendingMessages: MessageItem[],
  ) {
    const requestIds = new Set(nextRequestItems.map((r) => r.id));
    const messageIds = new Set(nextPendingMessages.map((m) => m.id));
    if (hasBootedRef.current) {
      let foundNew = false;
      for (const id of requestIds)
        if (!prevRequestIdsRef.current.has(id)) {
          foundNew = true;
          break;
        }
      if (!foundNew)
        for (const id of messageIds)
          if (!prevMessageIdsRef.current.has(id)) {
            foundNew = true;
            break;
          }
      if (foundNew) playChime();
    } else {
      hasBootedRef.current = true;
    }
    prevRequestIdsRef.current = requestIds;
    prevMessageIdsRef.current = messageIds;
  }

  async function loadMe() {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const data = await res.json();

      if (data?.ok && data?.user) {
        setCurrentStaffRole(data.user.role || "");
        setCurrentStaffUsername(data.user.username || "");
      }
    } catch {}
  }

  async function loadStaffUsers() {
    setStaffBusy(true);
    setStaffMsg("");

    try {
      const res = await fetch("/api/admin/staff/list", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setStaffMsg(data?.error || "Could not load staff users.");
        setStaffUsers([]);
        return;
      }

      setStaffUsers(Array.isArray(data.items) ? data.items : []);
    } catch {
      setStaffMsg("Could not load staff users.");
      setStaffUsers([]);
    } finally {
      setStaffBusy(false);
    }
  }

  async function createStaffUser() {
    setStaffMsg("");

    const username = newStaffUsername.trim();
    const pin = newStaffPin.trim();

    if (!username) {
      setStaffMsg("Enter a username.");
      return;
    }

    if (!pin) {
      setStaffMsg("Enter a PIN.");
      return;
    }

    const res = await fetch("/api/admin/staff/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username,
        pin,
        role: newStaffRole,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      setStaffMsg(data?.error || "Could not create user.");
      return;
    }

    setNewStaffUsername("");
    setNewStaffPin("");
    setNewStaffRole("STAFF");
    setStaffMsg("✅ Staff user created.");
    await loadStaffUsers();
  }

  async function deleteStaffUser(user: StaffUserItem) {
    const confirmDelete = confirm(
      `Delete ${user.username}? This cannot be undone.`,
    );
    if (!confirmDelete) return;

    const res = await fetch("/api/admin/staff/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        active: false,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      setStaffMsg(data?.error || "Could not delete user.");
      return;
    }

    setStaffMsg(`🗑️ ${user.username} deleted.`);
    await loadStaffUsers();
  }

  async function resetStaffPin(user: StaffUserItem) {
    const pin = prompt(`Enter a new PIN for ${user.username}`);
    if (!pin) return;

    const res = await fetch("/api/admin/staff/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        pin,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      setStaffMsg(data?.error || "Could not reset PIN.");
      return;
    }

    setStaffMsg(`✅ PIN updated for ${user.username}.`);
    await loadStaffUsers();
  }

  async function changeStaffRole(user: StaffUserItem, role: StaffRole) {
    const res = await fetch("/api/admin/staff/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        role,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      setStaffMsg(data?.error || "Could not update role.");
      return;
    }

    setStaffMsg(`✅ Role updated for ${user.username}.`);
    await loadStaffUsers();
  }

  async function loadRequests() {
    try {
      const res = await fetch(`/api/admin/queue/${location}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const nextPending = data.pending || data.upNext || [];
      setPendingRequests(nextPending);
      return nextPending as RequestItem[];
    } catch {
      return [] as RequestItem[];
    }
  }

  async function loadMessages() {
    try {
      const res = await fetch(`/api/admin/shoutouts/${location}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as AdminShoutoutsResponse;
      const nextPending = data.pending || [];
      setPendingMessages(nextPending);
      setApprovedMessages(data.approved || []);
      setActiveMessages(data.active || []);
      setRejectedMessages(data.rejected || []);
      setBlockedCount(Number(data.blockedCount || 0));
      return nextPending as MessageItem[];
    } catch {
      return [] as MessageItem[];
    }
  }

  async function loadRules(force = false) {
    if (rulesDirty && !force) return rules;
    try {
      const res = await fetch(`/api/admin/rules/get/${location}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push("/signin");
        return null;
      }
      const data: any = await safeJson(res);
      if (data?.rules) {
        const normalizedRules: RulesState = {
          ...data.rules,
          bonusChallengeRotationMode:
            data.rules.bonusChallengeRotationMode === "daily" ||
            data.rules.bonusChallengeRotationMode === "override"
              ? data.rules.bonusChallengeRotationMode
              : "weekly",
          bonusChallenges: normalizeBonusChallenges(data.rules.bonusChallenges),
        };

        setRules(normalizedRules);
        cacheLogo(normalizedRules.logoUrl);
        return normalizedRules;
      }
    } catch {}
    return null;
  }

  async function saveRules(successMessage = "✅ Request settings saved.") {
    if (!rules || savingRules) return false;
    setSavingRules(true);
    try {
      const res = await fetch(`/api/admin/rules/set/${location}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...rules,
          bonusChallenges: normalizeBonusChallenges(rules.bonusChallenges),
        }),
      });
      const data: any = await safeJson(res);
      if (data?.ok) {
        const nextRules = (data.rules || rules) as RulesState;
        setRules(nextRules);
        setRulesDirty(false);
        if (nextRules.logoUrl) cacheLogo(nextRules.logoUrl);
        setRequestSettingsMsg(successMessage);
        return true;
      }
      setRequestSettingsMsg(String(data?.error || "Could not save settings."));
      return false;
    } catch {
      setRequestSettingsMsg("Could not save settings.");
      return false;
    } finally {
      setSavingRules(false);
    }
  }

  function patchRules(patch: Partial<RulesState>) {
    setRules((curr) => (curr ? { ...curr, ...patch } : curr));
    setRulesDirty(true);
    setRequestSettingsMsg("");
    setTop10SettingsMsg("");
    setShoutoutSettingsMsg("");
  }

  function patchBonusChallenge(
    index: number,
    patch: Partial<BonusChallengeConfig>,
  ) {
    setRules((curr) => {
      if (!curr) return curr;
      const next = normalizeBonusChallenges(curr.bonusChallenges).map(
        (item, i) => (i === index ? { ...item, ...patch } : item),
      );
      return { ...curr, bonusChallenges: next };
    });

    setRulesDirty(true);
    setRequestSettingsMsg("");
  }

  async function loadMessageRules(force = false) {
    if (messageRulesDirty && !force) return messageRules;

    try {
      const res = await fetch(`/api/admin/shoutout-rules/${location}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push("/signin");
        return null;
      }

      const data: any = await safeJson(res);
      if (data?.rules) {
        setMessageRules(data.rules as MessageRulesState);
        return data.rules as MessageRulesState;
      }
    } catch {}

    return null;
  }

  async function saveMessageRules() {
    if (!messageRules) return false;

    try {
      const res = await fetch(`/api/admin/shoutout-rules/${location}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(messageRules),
      });

      const data: any = await safeJson(res);
      if (!data?.ok || !data?.rules) {
        setShoutoutSettingsMsg(
          String(data?.error || "Could not save shout-out rules."),
        );
        return false;
      }

      setMessageRules(data.rules as MessageRulesState);
      setMessageRulesDirty(false);
      return true;
    } catch {
      setShoutoutSettingsMsg("Could not save shout-out rules.");
      return false;
    }
  }

  function patchMessageRules(patch: Partial<MessageRulesState>) {
    setMessageRules((curr) => (curr ? { ...curr, ...patch } : curr));
    setMessageRulesDirty(true);
    setShoutoutSettingsMsg("");
  }

  async function loadUsers() {
    try {
      const res = await fetch(`/api/admin/session-users/${location}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
  }

  async function loadRecentUsers(
    pageOverride?: number,
    filterOverride?: RecentUserFilter,
  ) {
    const page = pageOverride ?? recentUsersPage;
    const filter = filterOverride ?? recentUsersFilter;
    setRecentUsersBusy(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(recentUsersPageSize),
        filter,
      });
      const res = await fetch(
        `/api/admin/user-history/${location}?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = (await safeJson(res)) as RecentUsersResponse;
      setRecentUsers(Array.isArray(data.items) ? data.items : []);
      setRecentUsersTotal(Number(data.total || 0));
      setRecentUsersPage(Number(data.page || page));
    } catch {
      setRecentUsers([]);
      setRecentUsersTotal(0);
    } finally {
      setRecentUsersBusy(false);
    }
  }

  async function openUserHistory(emailHash: string) {
    setUserModalOpen(true);
    setUserModalBusy(true);
    setSelectedUser(null);
    setMsg("");

    try {
      const params = new URLSearchParams({
        location,
        emailHash,
      });

      const res = await fetch(
        `/api/admin/user-history/detail?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const data = await safeJson(res);

      if (!data?.success) {
        setMsg(data?.error || "Could not load user history.");
        return;
      }

      const detail: UserHistoryDetail = {
        emailHash,
        label: String(data.label || ""),
        verified: Boolean(data.verified),
        points: Number(data.balance || 0),
        lastActivityAt: data.latestActivity || undefined,
        entries: Array.isArray(data.ledger)
          ? data.ledger.map((e: any) => ({
              id: e.id,
              createdAt: e.createdAt,
              delta: e.delta,
              reason: e.reason,
              expiresAt: e.expiresAt || null,
            }))
          : [],
      };

      setSelectedUser(detail);
      setTargetBalance(String(detail.points));
    } catch (err) {
      console.error("openUserHistory error", err);
      setMsg("Could not load user history.");
    } finally {
      setUserModalBusy(false);
    }
  }

  async function saveUserBalanceOverride() {
    if (!selectedUser) return;
    const nextTarget = Number(targetBalance);
    if (!Number.isFinite(nextTarget))
      return setMsg("Enter a valid target balance.");
    const cleanReason = String(adjustReason || "").trim();
    if (!cleanReason) return setMsg("Enter a reason for the balance change.");
    setUserModalSaving(true);
    try {
      const res = await fetch(`/api/admin/user-history/adjust`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location,
          emailHash: selectedUser.emailHash,
          targetBalance: nextTarget,
          reason: cleanReason,
        }),
      });
      const data: any = await safeJson(res);
      if (!data?.success)
        return setMsg(data?.error || "Could not update balance.");
      setMsg(
        data?.delta === 0
          ? "✅ Balance already matched target."
          : "✅ User balance updated.",
      );
      await openUserHistory(selectedUser.emailHash);
      await Promise.all([loadRecentUsers(), loadUsers()]);
    } finally {
      setUserModalSaving(false);
    }
  }

  async function loadTop10(bucketOverride?: Top10Bucket | "AUTO") {
    try {
      const bucket = bucketOverride ?? top10BucketView;
      const query = bucket && bucket !== "AUTO" ? `?display=${bucket}` : "";
      const res = await fetch(`/api/admin/top10/${location}${query}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as Top10Response;
      setTop10(Array.isArray(data.items) ? data.items : []);
      setTop10ActiveBucket((data.bucket as Top10Bucket) || "");
      setTop10BoardTitle(data.displayLabel || data.boardTitle || "Top 10");
      setTop10UpdatedAt(data.updatedAt || "");
      setTop10SessionId(data.sessionId || "");
      setTop10DataSource(data.dataSource || "");
    } catch {}
  }

  async function resetTop10(
    resetMode: "current" | "all" | "bucket",
    bucket?: Top10Bucket,
  ) {
    setTop10Busy(true);
    try {
      const res = await fetch(`/api/admin/top10/reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, resetMode, bucket }),
      });
      const data: any = await safeJson(res);
      if (!data?.ok)
        return setMsg(data?.error || "Could not reset Top 10 board.");
      setMsg(
        `✅ Top 10 reset complete. Removed ${Number(data.deletedCount || 0)} row(s).`,
      );
      await loadTop10();
    } finally {
      setTop10Busy(false);
    }
  }

  function normalizeManualTop10Items(items: ManualTop10Item[]) {
    return items.map((item, index) => ({
      ...item,
      rank: index + 1,
      upvotes: Math.max(0, Math.floor(Number(item.upvotes || 0))),
      downvotes: Math.max(0, Math.floor(Number(item.downvotes || 0))),
      score: Math.floor(Number(item.upvotes || 0)) - Math.floor(Number(item.downvotes || 0)),
    }));
  }

  async function loadManualTop10() {
    try {
      const res = await fetch(`/api/admin/manual-top10/${location}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as ManualTop10Response;
      if (!data?.ok) {
        setManualTop10Msg(data?.error || "Could not load manual Top 10.");
        return;
      }
      const pool = Array.isArray(data.requestPool) ? data.requestPool : [];
      const saved = Array.isArray(data.boardItems) ? data.boardItems : [];
      setManualRequestPool(pool);
      setManualTop10Items(saved.length ? normalizeManualTop10Items(saved).slice(0, 10) : pool.slice(0, 10));
      setManualTargetVotes(String(Number(data.targetVotes || 512)));
      setManualTop10UpdatedAt(data.updatedAt || null);
    } catch {
      setManualTop10Msg("Could not load manual Top 10.");
    }
  }

  function addManualTop10Item(item: ManualTop10Item) {
    setManualTop10Msg("");
    setManualTop10Items((current) => {
      if (current.some((row) => row.id === item.id)) return current;
      if (current.length >= 10) {
        setManualTop10Msg("Manual Top 10 already has 10 songs. Remove one first.");
        return current;
      }
      return normalizeManualTop10Items([...current, item]);
    });
  }

  function removeManualTop10Item(id: string) {
    setManualTop10Items((current) => normalizeManualTop10Items(current.filter((item) => item.id !== id)));
  }

  function moveManualTop10Item(fromId: string, toId: string) {
    if (!fromId || !toId || fromId === toId) return;
    setManualTop10Items((current) => {
      const fromIndex = current.findIndex((item) => item.id === fromId);
      const toIndex = current.findIndex((item) => item.id === toId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return normalizeManualTop10Items(next);
    });
  }

  function generateManualVotes() {
    const topScore = Math.max(1, Math.floor(Number(manualTargetVotes || 0)));
    setManualTop10Items((current) => {
      const total = Math.max(1, current.length);
      const step = Math.max(7, Math.floor(topScore / (total + 2)));
      return normalizeManualTop10Items(
        current.map((item, index) => {
          const jitter = Math.floor(Math.random() * Math.max(4, Math.floor(step * 0.35)));
          const score = Math.max(1, topScore - index * step - jitter);
          const downvotes = Math.max(0, Math.floor(score * (0.03 + Math.random() * 0.16)) + Math.floor(Math.random() * 4));
          const upvotes = score + downvotes;
          return { ...item, upvotes, downvotes, score };
        }),
      );
    });
    setManualTop10Msg("✅ Randomized believable thumbs up/down counts for the current order.");
  }

  async function saveManualTop10() {
    setManualTop10Busy(true);
    setManualTop10Msg("");
    try {
      const items = normalizeManualTop10Items(manualTop10Items).slice(0, 10);
      const res = await fetch(`/api/admin/manual-top10/${location}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetVotes: Math.max(1, Math.floor(Number(manualTargetVotes || 0))),
          items,
        }),
      });
      const data = (await safeJson(res)) as ManualTop10Response;
      if (!data?.ok) {
        setManualTop10Msg(data?.error || "Could not save manual Top 10.");
        return;
      }
      setManualTop10Items(normalizeManualTop10Items(Array.isArray(data.boardItems) ? data.boardItems : items));
      setManualTop10UpdatedAt(data.updatedAt || new Date().toISOString());
      setManualTop10Msg("✅ Manual Top 10 saved for staff.");
    } finally {
      setManualTop10Busy(false);
    }
  }

  function statusPillVariant(symbol: ManualRequestStatus): "live" | "warn" | "danger" {
    if (symbol === "A") return "live";
    if (symbol === "R") return "danger";
    return "warn";
  }

  function toggleTop10AutoRefreshDay(day: string) {
    const current = Array.isArray(rules?.top10AutoRefreshDays)
      ? rules?.top10AutoRefreshDays || []
      : [];
    const exists = current.includes(day);
    const next = exists
      ? current.filter((item) => item !== day)
      : [...current, day];
    patchRules({ top10AutoRefreshDays: next });
  }

  async function loadCodes() {
    try {
      const res = await fetch(`/api/admin/redemption-codes/${location}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setCodes(data.items || []);
    } catch {}
  }

  async function createCode() {
    setCodesMsg("");
    const code = codeNew.trim().toUpperCase();
    if (!code) return setCodesMsg("Enter a code.");
    const res = await fetch(`/api/admin/redemption-codes/${location}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        points: codePoints,
        maxUses: codeMaxUses,
        source: "manual",
      }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) return setCodesMsg(data?.error || "Could not create code.");
    setCodeNew("");
    setCodesMsg("✅ Code created.");
    await loadCodes();
  }

  async function importCodes(file: File) {
    setCodesMsg("");
    setImportingCodes(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `/api/admin/redemption-codes/import/${location}`,
        { method: "POST", body: form },
      );
      const data: any = await safeJson(res);
      if (!data?.ok)
        return setCodesMsg(data?.error || "Could not import codes.");
      setCodesMsg(
        `✅ Imported ${Number(data.created || 0)} codes.${Number(data.skipped || 0) ? ` Skipped ${Number(data.skipped || 0)}.` : ""}`,
      );
      await loadCodes();
    } finally {
      setImportingCodes(false);
    }
  }

  async function disableCode(id: string) {
    await fetch(`/api/admin/redemption-codes/disable`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadCodes();
    setCodesMsg("✅ Code disabled.");
  }

  async function deleteCode(id: string, code: string) {
    const ok = window.confirm(
      `Delete code ${code}? This removes it from the list permanently.`,
    );
    if (!ok) return;
    const res = await fetch(`/api/admin/redemption-codes/delete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) return setCodesMsg(data?.error || "Could not delete code.");
    setCodesMsg("✅ Code deleted.");
    if (selectedCode?.id === id) {
      setCodeUsesOpen(false);
      setSelectedCode(null);
      setSelectedCodeUses([]);
    }
    await loadCodes();
  }

  async function showCodeUses(codeItem: RedemptionCode) {
    setSelectedCode(codeItem);
    setCodeUsesOpen(true);
    setCodeUsesLoading(true);
    setSelectedCodeUses([]);
    const res = await fetch(`/api/admin/redemption-codes/uses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: codeItem.id }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) {
      setCodesMsg(data?.error || "Could not load code uses.");
      setCodeUsesLoading(false);
      return;
    }
    setSelectedCodeUses(Array.isArray(data.items) ? data.items : []);
    setCodeUsesLoading(false);
  }

  async function approveMessage(messageId: string) {
    const res = await fetch(`/api/admin/shoutouts/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) return setMsg(data?.error || "Could not approve message.");
    setMsg("✅ Message approved.");
    playChime();
    await loadAll();
  }

  function editMessage(
    messageId: string,
    currentFromName: string,
    currentMessageText: string,
  ) {
    setEditMessageId(messageId);
    setEditFromName(currentFromName || "");
    setEditMessageText(currentMessageText || "");
    setEditOpen(true);
  }

  async function saveEditedMessage() {
    const nextFromName = String(editFromName || "").trim();
    const nextMessage = String(editMessageText || "").trim();
    if (!editMessageId) return setMsg("Missing message ID.");
    if (!nextFromName || !nextMessage)
      return setMsg("Name and shout-out text are required.");
    setEditBusy(true);
    try {
      const res = await fetch(`/api/admin/shoutouts/edit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messageId: editMessageId,
          fromName: nextFromName,
          messageText: nextMessage,
        }),
      });
      const data: any = await safeJson(res);
      if (!data?.ok) return setMsg(data?.error || "Could not edit message.");
      setEditOpen(false);
      setEditMessageId("");
      setEditFromName("");
      setEditMessageText("");
      setMsg("✅ Message updated.");
      await loadAll();
    } finally {
      setEditBusy(false);
    }
  }

  async function rejectMessage(messageId: string) {
    const note =
      prompt("Reject reason?", "Rejected from dashboard") ||
      "Rejected from dashboard";
    const res = await fetch(`/api/admin/shoutouts/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId, note }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) return setMsg(data?.error || "Could not reject message.");
    setMsg(
      data?.refunded
        ? "✅ Message rejected and credits refunded."
        : "✅ Message rejected.",
    );
    await loadAll();
  }

  async function markPlayed(requestId: string) {
    await fetch(`/api/admin/queue/played`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    await loadAll();
  }

  async function rejectRequest(requestId: string) {
    const reason = prompt("Reject reason?", "Rejected");
    if (!reason) return;
    await fetch(`/api/admin/queue/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId, reason }),
    });
    await loadAll();
  }

  async function importSongs(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/songs/import/${location}`, {
      method: "POST",
      body: form,
    });
    const data: any = await safeJson(res);
    setMsg(
      data?.ok
        ? `✅ Imported ${data.created} songs.`
        : data?.error || "Import failed.",
    );
  }

  function updatePlaceholder(
    index: number,
    patch: Partial<PlaceholderMessage>,
  ) {
    setPlaceholders((curr) =>
      curr.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }
  async function uploadPlaceholderPhoto(index: number, file: File) {
    const target = placeholders[index];
    if (!target) return;

    setMsg("");
    setPlaceholderUploadBusyId(target.id);

    try {
      const form = new FormData();
      form.append("location", location);
      form.append("placeholderId", target.id);
      form.append("file", file);

      const res = await fetch("/api/admin/shoutouts/upload-placeholder-photo", {
        method: "POST",
        body: form,
      });

      const data: any = await safeJson(res);

      if (!data?.ok) {
        setMsg(data?.error || "Could not upload placeholder photo.");
        return;
      }

      updatePlaceholder(index, {
        imagePath: data.imagePath || null,
        imageUrl: data.signedImageUrl || null,
      });

      setMsg("✅ Placeholder photo uploaded.");
    } catch {
      setMsg("Could not upload placeholder photo.");
    } finally {
      setPlaceholderUploadBusyId("");
    }
  }

  function savePlaceholderSettings() {
    savePlaceholders(location, placeholders);
    setMsg("✅ Placeholder shout-outs saved for this browser.");
  }

  function resetPlaceholderSettings() {
    setPlaceholders(DEFAULT_PLACEHOLDERS);
    savePlaceholders(location, DEFAULT_PLACEHOLDERS);
    setMsg("✅ Placeholder shout-outs reset.");
  }

  async function saveTop10Settings() {
    setTop10SettingsMsg("");
    const ok = await saveRules("✅ Top 10 settings saved.");
    if (ok) {
      setTop10SettingsMsg("✅ Top 10 settings saved.");
      await loadTop10();
    } else {
      setTop10SettingsMsg("Could not save Top 10 settings.");
    }
  }

  async function saveShoutoutSettings() {
    setShoutoutSettingsMsg("");

    let tvOk = true;
    if (rulesDirty) {
      tvOk = await saveRules("✅ TV settings saved.");
    }

    let messageOk = true;
    if (messageRulesDirty) {
      messageOk = await saveMessageRules();
    }

    if (tvOk && messageOk) {
      setShoutoutSettingsMsg("✅ Shout-out settings saved.");
    } else if (!messageOk) {
      setShoutoutSettingsMsg("Could not save shout-out rules.");
    } else {
      setShoutoutSettingsMsg("Could not save TV rotation settings.");
    }
  }

  async function loadDashboardLedgerStats() {
    const baselineAt = readDashboardBaseline(location);
    setDashboardStatsBusy(true);

    try {
      const pageSize = 100;
      let page = 1;
      let total = 0;
      const allUsers: RecentUserItem[] = [];

      while (true) {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          filter: "qualifying",
        });

        const res = await fetch(
          `/api/admin/user-history/${location}?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

        const data = (await safeJson(res)) as RecentUsersResponse;
        const items = Array.isArray(data.items) ? data.items : [];
        total = Number(data.total || total || 0);
        allUsers.push(...items);

        if (items.length < pageSize || allUsers.length >= total) break;
        page += 1;
      }

      let issued = 0;
      let redeemed = 0;
      let purchaseCount = 0;
      let estimatedRevenueCents = 0;
      let welcomeUsers = 0;
      let redeemedUsers = 0;

      for (const user of allUsers) {
        try {
          const params = new URLSearchParams({
            location,
            emailHash: user.emailHash,
          });

          const res = await fetch(
            `/api/admin/user-history/detail?${params.toString()}`,
            {
              cache: "no-store",
            },
          );

          const data = await safeJson(res);
          const entries = Array.isArray((data as any)?.ledger)
            ? (data as any).ledger
            : [];
          let userHadWelcome = false;
          let userHadRedeem = false;

          for (const entry of entries) {
            const createdAt = entry?.createdAt ? String(entry.createdAt) : "";
            if (
              baselineAt &&
              createdAt &&
              new Date(createdAt).getTime() < new Date(baselineAt).getTime()
            ) {
              continue;
            }

            const delta = Number(entry?.delta || 0);
            const reason = String(entry?.reason || "");

            if (
              delta > 0 &&
              (isWelcomeReason(reason) ||
                isRedeemReason(reason) ||
                isPurchaseReason(reason))
            ) {
              issued += delta;

              if (isWelcomeReason(reason)) userHadWelcome = true;
              if (isRedeemReason(reason)) userHadRedeem = true;
              if (isPurchaseReason(reason)) {
                purchaseCount += 1;
                estimatedRevenueCents += estimatePurchaseRevenueCents(
                  delta,
                  rules,
                );
              }
            }

            if (delta < 0 && isSpendReason(reason)) {
              redeemed += Math.abs(delta);
            }
          }

          if (userHadWelcome) welcomeUsers += 1;
          if (userHadRedeem) redeemedUsers += 1;
        } catch {}
      }

      setDashboardLedgerStats({
        baselineAt,
        activeUsers: users.length,
        verifiedUsers: users.filter((u) => u.verified).length,
        liveQueueCount: pendingRequests.length,
        boostedQueueCount: requestBuckets.boosts.length,
        standardQueueCount: requestBuckets.next.length,
        redemptionCodesLoaded: codes.length,
        totalQualifyingUsers: total || allUsers.length,
        pointsIssued: issued,
        pointsRedeemed: redeemed,
        pointsAvailable: Math.max(0, issued - redeemed),
        purchaseCount,
        estimatedRevenueCents,
        welcomeUsers,
        redeemedUsers,
      });
    } catch {
      setDashboardLedgerStats((curr) => ({
        ...curr,
        baselineAt,
        activeUsers: users.length,
        verifiedUsers: users.filter((u) => u.verified).length,
        liveQueueCount: pendingRequests.length,
        boostedQueueCount: requestBuckets.boosts.length,
        standardQueueCount: requestBuckets.next.length,
        redemptionCodesLoaded: codes.length,
      }));
    } finally {
      setDashboardStatsBusy(false);
    }
  }

  function resetDashboardStatsWindow() {
    const nextBaseline = new Date().toISOString();
    writeDashboardBaseline(location, nextBaseline);
    void loadDashboardLedgerStats();
    setMsg(
      "✅ Dashboard money + points snapshot reset for this location on this browser.",
    );
  }

  function clearDashboardStatsWindow() {
    writeDashboardBaseline(location, null);
    void loadDashboardLedgerStats();
    setMsg("✅ Dashboard money + points snapshot returned to all-time view.");
  }

  const effectiveTop10CutoffHour = Number(rules?.top10AdultCutoffHour ?? 21);
  const effectiveTop10CutoffMinute = Number(rules?.top10AdultCutoffMinute ?? 0);
  const effectiveTop10Timezone = rules?.top10Timezone || "America/New_York";
  const effectiveShoutoutSlideSeconds = Math.max(
    1,
    Number(rules?.shoutoutSlideSeconds ?? 10),
  );

  function activeTabLabel() {
    if (tab === "dashboard") return "Dashboard";
    if (tab === "songs") return "Songs";
    if (tab === "requestSettings") return "Request Settings";
    if (tab === "top10") return "Top 10";
    if (tab === "manualTop10") return "Manual Top 10";
    if (tab === "users") return "Users & Points";
    if (tab === "staff") return "Staff Users";
    if (tab === "shoutoutSettings") return "Shoutout Settings";
    return "Current Tab";
  }

  async function refreshCurrentTab(showBusy = true) {
    if (showBusy && refreshBusy) return;
    if (showBusy) setRefreshBusy(true);

    try {
      if (tab === "dashboard") {
        await loadAll();
        await loadDashboardLedgerStats();
      } else if (tab === "songs") {
        await loadRules(true);
      } else if (tab === "requestSettings") {
        await Promise.all([loadRules(true), loadCodes()]);
      } else if (tab === "top10") {
        await Promise.all([loadRules(true), loadTop10()]);
      } else if (tab === "manualTop10") {
        await loadManualTop10();
      } else if (tab === "users") {
        await Promise.all([loadUsers(), loadRecentUsers()]);
      } else if (tab === "staff") {
        await loadMe();
        if (currentStaffRole === "SUPER_ADMIN") await loadStaffUsers();
      } else if (tab === "shoutoutSettings") {
        await Promise.all([
          loadRules(true),
          loadMessageRules(true),
          loadMessages(),
        ]);
      }

      setLastRefreshAt(
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } finally {
      if (showBusy) setRefreshBusy(false);
    }
  }

  async function loadAll() {
    const isEditingRulesTab =
      tab === "requestSettings" ||
      tab === "top10" ||
      tab === "shoutoutSettings";

    if (!isEditingRulesTab || !rulesDirty) await loadRules();
    if (tab !== "shoutoutSettings" || !messageRulesDirty)
      await loadMessageRules();

    const nextRequests = await loadRequests();
    const nextPendingMessages = await loadMessages();

    await Promise.all([
      loadUsers(),
      loadTop10(),
      ...(tab === "manualTop10" ? [loadManualTop10()] : []),
      loadCodes(),
      ...(tab === "users" ? [loadRecentUsers()] : []),
    ]);

    maybePlayChime(nextRequests, nextPendingMessages);
  }

  useEffect(() => {
    loadCachedLogo();
    setRules(null);
  }, [location]);

  useEffect(() => {
    const allowedTabs: TabKey[] = [
      "dashboard",
      "songs",
      "requestSettings",
      "top10",
      "manualTop10",
      "users",
      "staff",
      "shoutoutSettings",
    ];

    if (requestedTab && allowedTabs.includes(requestedTab as TabKey)) {
      setTab(requestedTab as TabKey);
      return;
    }

    setTab("dashboard");
  }, [requestedTab, location]);

  useEffect(() => {
    setPlaceholders(loadSavedPlaceholders(location));
  }, [location]);

  useEffect(() => {
    if (checkingAuth) return;
    void refreshCurrentTab(false);
  }, [checkingAuth, location, top10BucketView, tab]);

  useEffect(() => {
    if (checkingAuth) return;
    void loadMe();
  }, [checkingAuth]);

  useEffect(() => {
    if (checkingAuth || tab !== "staff" || currentStaffRole !== "SUPER_ADMIN")
      return;
    void loadStaffUsers();
  }, [checkingAuth, tab, currentStaffRole]);

  if (checkingAuth) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div className="admPage">
      <AdminGunmetalTheme />
      <style>{`
        @keyframes admRefreshPulse {
          0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 0 0 rgba(58, 160, 255, 0); }
          50% { transform: translateY(-1px) scale(1.025); box-shadow: 0 0 24px rgba(58, 160, 255, 0.36); }
        }
        .admRefreshStrip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(91, 154, 255, 0.24);
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(14, 24, 47, 0.88), rgba(10, 13, 25, 0.94));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .admRefreshPulse {
          border: 1px solid rgba(100, 190, 255, 0.48);
          border-radius: 999px;
          padding: 9px 14px;
          color: #f8fbff;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          background: linear-gradient(135deg, rgba(58, 160, 255, 0.34), rgba(139, 92, 246, 0.28));
          animation: admRefreshPulse 1.8s ease-in-out infinite;
        }
        .admRefreshPulse:disabled {
          cursor: wait;
          opacity: 0.7;
        }
        .admRefreshMeta {
          color: rgba(232, 238, 255, 0.66);
          font-size: 12px;
          line-height: 1.35;
          text-align: right;
        }
        @media (max-width: 760px) {
          .admRefreshStrip { align-items: stretch; flex-direction: column; }
          .admRefreshMeta { text-align: left; }
        }
      `}</style>
      <div className="admShell">
        <div className="admHero">
          <div className="admHeroMain">
            <div className="admHeroLogoWrap">
              <img src={logoUrl} alt="Admin Logo" className="admHeroLogo" />
            </div>
            <div>
              <div className="admKicker">RemixRequests control center</div>
              <div className="admTitle">Admin Dashboard</div>
              <div className="admSubTitle">
                {location} • Live request control, points settings, Top 10, and
                shout-out moderation.
              </div>
            </div>
          </div>
          <div className="admHeroStats">
            <span className="admPill admPill--live">
              Requests {pendingRequests.length}
            </span>
            <span className="admPill">Messages {pendingMessages.length}</span>
            <span className="admPill admPill--warn">
              Rules {rulesDirty ? "Unsaved" : "Saved"}
            </span>
            <span className="admPill">
              {currentStaffUsername || "Unknown"} (
              {currentStaffRole || "no role"})
            </span>
            <button type="button" className="admBtnGhost" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
          <div className="admTabs" style={{ marginBottom: 0 }}>
            <TabButton
              active={tab === "dashboard"}
              onClick={() => setTab("dashboard")}
            >
              Dashboard
            </TabButton>

            <TabButton active={tab === "songs"} onClick={() => setTab("songs")}>
              Songs
            </TabButton>

            <TabButton
              active={tab === "requestSettings"}
              onClick={() => setTab("requestSettings")}
            >
              Request Settings
            </TabButton>

            <TabButton active={tab === "top10"} onClick={() => setTab("top10")}>
              Top 10
            </TabButton>

            <TabButton
              active={tab === "manualTop10"}
              onClick={() => setTab("manualTop10")}
            >
              Manual Top 10
            </TabButton>

            <TabButton active={tab === "users"} onClick={() => setTab("users")}>
              Users & Points
            </TabButton>

            <TabButton
              active={tab === "shoutoutSettings"}
              onClick={() => setTab("shoutoutSettings")}
            >
              Shoutout Settings
            </TabButton>

            {currentStaffRole === "SUPER_ADMIN" ? (
              <TabButton
                active={tab === "staff"}
                onClick={() => setTab("staff")}
              >
                Staff Users
              </TabButton>
            ) : null}
          </div>

          <div
            className="admTabs"
            style={{
              marginBottom: 0,
              paddingTop: 0,
              borderTop: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <a
              href={`/booth/${location}`}
              className="admTab admTabLink"
              style={{
                minHeight: 34,
                padding: "0 12px",
                fontSize: 11,
                letterSpacing: "0.08em",
              }}
            >
              DJ Booth
            </a>

            <a
              href={`/admin/${location}/interstitials`}
              className="admTab admTabLink"
              style={{
                minHeight: 34,
                padding: "0 12px",
                fontSize: 11,
                letterSpacing: "0.08em",
              }}
            >
              Interstitials
            </a>

            <a
              href="/admin/import"
              className="admTab admTabLink"
              style={{
                minHeight: 34,
                padding: "0 12px",
                fontSize: 11,
                letterSpacing: "0.08em",
              }}
            >
              <i>Spotify Import</i>
            </a>
          </div>

          <div className="admRefreshStrip">
            <button
              type="button"
              className="admRefreshPulse"
              onClick={() => void refreshCurrentTab(true)}
              disabled={refreshBusy}
            >
              {refreshBusy ? "Refreshing…" : `Refresh ${activeTabLabel()}`}
            </button>
            <div className="admRefreshMeta">
              Manual refresh is now the default to protect Supabase connections.
              {lastRefreshAt ? ` Last refreshed ${lastRefreshAt}.` : ""}
            </div>
          </div>
        </div>

        {msg ? <div className="admNotice">{msg}</div> : null}

        {tab === "dashboard" && (
          <>
            <Panel
              title="Tonight at a glance"
              sub="A cleaner landing screen with live operational context, top song focus, and money + point flow."
            >
              <div
                className="admDashboardHero"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
                  gap: 10,
                  alignItems: "stretch",
                }}
              >
                <div className="admDashboardHeroMain">
                  <div className="admDashboardEyebrow">LIVE SNAPSHOT</div>
                  <div className="admDashboardHeadline">
                    {dashboardStatsBusy
                      ? "Refreshing live dashboard…"
                      : top10[0]
                        ? `${top10[0].title} is leading right now.`
                        : "Dashboard ready for tonight."}
                  </div>
                  <div className="admDashboardSub">
                    {top10[0]
                      ? `${top10[0].artist} • Score ${top10[0].score}${top10[0].requestCount ? ` • ${top10[0].requestCount} requests` : ""}`
                      : "Your deep controls now live inside the tabs. This front page is focused on quick pulse, top activity, and money flow."}
                  </div>
                </div>

                <div
                  className="admDashboardHeroStats"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                    alignContent: "start",
                  }}
                >
                  <DashboardHeroStat
                    label="Queue live"
                    value={dashboardLedgerStats.liveQueueCount}
                    sub={`${dashboardLedgerStats.boostedQueueCount} boosted • ${dashboardLedgerStats.standardQueueCount} standard`}
                  />
                  <DashboardHeroStat
                    label="Active users"
                    value={dashboardLedgerStats.activeUsers}
                    sub={`${dashboardLedgerStats.verifiedUsers} verified`}
                  />
                  <DashboardHeroStat
                    label="Points issued"
                    value={dashboardLedgerStats.pointsIssued}
                    sub={formatDashboardSince(dashboardLedgerStats.baselineAt)}
                  />
                  <DashboardHeroStat
                    label="Purchased $"
                    value={formatCurrencyFromCents(
                      dashboardLedgerStats.estimatedRevenueCents,
                    )}
                    sub={`${dashboardLedgerStats.purchaseCount} purchases`}
                  />
                </div>
              </div>
            </Panel>

            <div
              className="admDashboardTriGrid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
                alignItems: "start",
              }}
            >
              <Panel
                title="Stats"
                sub="Usage snapshot without diving into the deeper tabs."
              >
                <div
                  className="admDashboardMiniGrid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <DashboardMiniStat
                    label="Songs in queue"
                    value={dashboardLedgerStats.liveQueueCount}
                    tone="live"
                  />
                  <DashboardMiniStat
                    label="Boosted live"
                    value={dashboardLedgerStats.boostedQueueCount}
                    tone="warn"
                  />
                  <DashboardMiniStat
                    label="Standard live"
                    value={dashboardLedgerStats.standardQueueCount}
                  />
                  <DashboardMiniStat
                    label="Active users"
                    value={dashboardLedgerStats.activeUsers}
                  />
                  <DashboardMiniStat
                    label="Verified users"
                    value={dashboardLedgerStats.verifiedUsers}
                  />
                  <DashboardMiniStat
                    label="Qualifying users"
                    value={dashboardLedgerStats.totalQualifyingUsers}
                  />
                  <DashboardMiniStat
                    label="Pending shout-outs"
                    value={pendingMessages.length}
                  />
                  <DashboardMiniStat
                    label="Redemption codes"
                    value={dashboardLedgerStats.redemptionCodesLoaded}
                  />
                </div>

                <div className="admSubPanel" style={{ marginTop: 10 }}>
                  <div className="admSubTitleText">Quick pulse</div>
                  <div className="admSubCopy" style={{ marginTop: 8 }}>
                    Requests and shout-outs now live in the booth flow, so this
                    page is better used as a live pulse page instead of an old
                    moderation board.
                  </div>
                  <div className="admActionRow" style={{ marginTop: 12 }}>
                    <a
                      href={`/booth/${location}`}
                      className="admBtn"
                      style={{ textDecoration: "none" }}
                    >
                      Open DJ Booth
                    </a>
                    <a
                      href={`/admin/${location}?tab=users`}
                      className="admBtnGhost"
                      style={{ textDecoration: "none" }}
                    >
                      Open Users & Points
                    </a>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Top 1 + activity"
                sub="A slimmer center stack with what is happening right now."
              >
                <div className="admSubPanel admDashboardTopCard">
                  <div className="admDashboardTopLabel">TOP SONG RIGHT NOW</div>
                  {top10[0] ? (
                    <>
                      <div className="admDashboardTopTitle">
                        {top10[0].title}
                      </div>
                      <div className="admDashboardTopArtist">
                        {top10[0].artist}
                      </div>
                      <div className="admActionRow" style={{ marginTop: 10 }}>
                        <Pill variant="live">Score {top10[0].score}</Pill>
                        <Pill>Req {Number(top10[0].requestCount || 0)}</Pill>
                        <Pill>👍 {Number(top10[0].upvotes || 0)}</Pill>
                        <Pill>👎 {Number(top10[0].downvotes || 0)}</Pill>
                      </div>
                    </>
                  ) : (
                    <EmptyState>No Top 10 leader yet.</EmptyState>
                  )}
                </div>

                <div className="admSubPanel" style={{ marginTop: 10 }}>
                  <div className="admSubTitleText">Slim activity stack</div>
                  <div
                    className="admDashboardActivityList"
                    style={{ display: "grid", gap: 8 }}
                  >
                    {requestBuckets.boosts.slice(0, 3).map((q) => (
                      <DashboardActivityRow
                        key={`boost-${q.id}`}
                        label="BOOST"
                        title={q.title}
                        meta={q.artist}
                        accent="boost"
                      />
                    ))}
                    {requestBuckets.next.slice(0, 4).map((q) => (
                      <DashboardActivityRow
                        key={`queue-${q.id}`}
                        label="QUEUE"
                        title={q.title}
                        meta={`${q.artist} • score ${q.score}`}
                      />
                    ))}
                    {pendingMessages.slice(0, 3).map((m) => (
                      <DashboardActivityRow
                        key={`msg-${m.id}`}
                        label="MSG"
                        title={m.fromName}
                        meta={m.messageText}
                        accent="message"
                      />
                    ))}
                    {!requestBuckets.boosts.length &&
                    !requestBuckets.next.length &&
                    !pendingMessages.length ? (
                      <EmptyState>No live activity yet.</EmptyState>
                    ) : null}
                  </div>
                </div>

                <div className="admSubPanel" style={{ marginTop: 10 }}>
                  <div className="admSubTitleText">Read-only board preview</div>
                  <div className="admSubCopy" style={{ marginTop: 8 }}>
                    {top10UpdatedAt
                      ? `Updated ${new Date(top10UpdatedAt).toLocaleString()}`
                      : "No board update time yet."}
                  </div>
                  <div className="admActionRow" style={{ marginTop: 12 }}>
                    <a
                      href={`/admin/${location}?tab=top10`}
                      className="admBtnGhost"
                      style={{ textDecoration: "none" }}
                    >
                      Open Top 10 tab
                    </a>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Money + points"
                sub="Issued points, redeemed points, active balances, and purchased revenue."
              >
                <div
                  className="admDashboardMoneyStack"
                  style={{ display: "grid", gap: 8 }}
                >
                  <DashboardMoneyRow
                    label="Points issued"
                    value={dashboardLedgerStats.pointsIssued}
                    sub={`${dashboardLedgerStats.welcomeUsers} welcome users • ${dashboardLedgerStats.redeemedUsers} redeemed users`}
                  />
                  <DashboardMoneyRow
                    label="Points redeemed"
                    value={dashboardLedgerStats.pointsRedeemed}
                    sub="Requests, boosts, votes, and shout-outs spent"
                  />
                  <DashboardMoneyRow
                    label="Points active"
                    value={dashboardLedgerStats.pointsAvailable}
                    sub="Issued minus redeemed"
                  />
                  <DashboardMoneyRow
                    label="Purchased $"
                    value={formatCurrencyFromCents(
                      dashboardLedgerStats.estimatedRevenueCents,
                    )}
                    sub={`${dashboardLedgerStats.purchaseCount} point-pack purchases`}
                    highlight
                  />
                </div>

                <div className="admSubPanel" style={{ marginTop: 10 }}>
                  <div className="admSubTitleText">Stats window</div>
                  <div className="admSubCopy" style={{ marginTop: 8 }}>
                    {formatDashboardSince(dashboardLedgerStats.baselineAt)}
                  </div>
                  <div className="admFieldHelp" style={{ marginTop: 8 }}>
                    Issued includes welcome points, redeemed code points, and
                    purchased points. Unused codes are not counted.
                  </div>
                  {currentStaffRole === "SUPER_ADMIN" ? (
                    <div className="admActionRow" style={{ marginTop: 12 }}>
                      <ActionButton onClick={resetDashboardStatsWindow}>
                        Reset stats window
                      </ActionButton>
                      <ActionButton alt onClick={clearDashboardStatsWindow}>
                        All-time view
                      </ActionButton>
                    </div>
                  ) : null}
                </div>
              </Panel>
            </div>
          </>
        )}

        {tab === "songs" && (
          <SongManagementPanel
            location={location}
            rules={
              rules
                ? {
                    albumArtBaseUrl: rules.albumArtBaseUrl,
                    defaultAlbumArtUrl: rules.defaultAlbumArtUrl,
                  }
                : null
            }
            onGlobalMessage={setMsg}
          />
        )}

        {tab === "requestSettings" && rules && (
          <div className="admGridSettings">
            <Panel
              title="Request settings"
              sub="Pricing, queue behavior, limits, and front-end response copy."
            >
              <div className="admSectionStack">
                <SubPanel
                  title="Pricing"
                  sub="Controls how users spend points and how much revenue each action generates. Higher costs increase revenue but reduce participation — balance carefully."
                >
                  <div className="admGrid2">
                    <div className="admFieldStack">
                      <Field
                        label="Request cost"
                        value={rules.costRequest}
                        onChange={(v) => patchRules({ costRequest: v })}
                      />
                      <div className="admFieldHelp">
                        Cost to add a song to the queue. Lower = more
                        engagement. Higher = more selective requests.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Field
                        label="Play Now / Boost cost"
                        value={rules.costPlayNow}
                        onChange={(v) => patchRules({ costPlayNow: v })}
                      />
                      <div className="admFieldHelp">
                        Premium skip-to-front action. This is your biggest
                        monetization lever — higher values increase revenue per
                        user.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Field
                        label="Upvote cost"
                        value={rules.costUpvote}
                        onChange={(v) => patchRules({ costUpvote: v })}
                      />
                      <div className="admFieldHelp">
                        Cost to support a song. Keep low to encourage
                        participation and crowd interaction.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Field
                        label="Downvote cost"
                        value={rules.costDownvote}
                        onChange={(v) => patchRules({ costDownvote: v })}
                      />
                      <div className="admFieldHelp">
                        Cost to push songs down. Usually kept equal to upvote
                        for fairness.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <MoneyField
                        label="10 credit package ($)"
                        centsValue={rules.packTier1PriceCents || 500}
                        onChangeCents={(c) =>
                          patchRules({ packTier1PriceCents: c })
                        }
                      />
                      <div className="admFieldHelp">
                        Entry-level purchase. Lower price improves conversion
                        rate for first-time users.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <MoneyField
                        label="25 credit package ($)"
                        centsValue={rules.packTier2PriceCents || 1000}
                        onChangeCents={(c) =>
                          patchRules({ packTier2PriceCents: c })
                        }
                      />
                      <div className="admFieldHelp">
                        Mid-tier option. Should feel like a better value per
                        credit than the starter pack.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <MoneyField
                        label="35 credit package ($)"
                        centsValue={rules.packTier3PriceCents || 1500}
                        onChangeCents={(c) =>
                          patchRules({ packTier3PriceCents: c })
                        }
                      />
                      <div className="admFieldHelp">
                        High-value pack. Encourages larger purchases from
                        engaged users.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <MoneyField
                        label="50 credit package ($)"
                        centsValue={rules.packTier4PriceCents || 2000}
                        onChangeCents={(c) =>
                          patchRules({ packTier4PriceCents: c })
                        }
                      />
                      <div className="admFieldHelp">
                        Best value tier. Designed for power users and groups
                        pooling points.
                      </div>
                    </div>
                  </div>
                </SubPanel>

                <SubPanel
                  title="Voting and enforcement"
                  sub="Controls how fair, fast, and controlled the queue feels. These rules prevent repeats, spam, and playlist domination."
                >
                  <div className="admGrid2">
                    <div className="admFieldStack">
                      <Toggle
                        label="Enable voting"
                        checked={Boolean(rules.enableVoting)}
                        onChange={(v) => patchRules({ enableVoting: v })}
                      />
                      <div className="admFieldHelp">
                        Allows users to influence song order. Disabling creates
                        a DJ-controlled experience.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Toggle
                        label="Enforce artist cooldown"
                        checked={Boolean(rules.enforceArtistCooldown)}
                        onChange={(v) =>
                          patchRules({ enforceArtistCooldown: v })
                        }
                      />
                      <div className="admFieldHelp">
                        Prevents the same artist from playing too frequently.
                        Keeps music variety high.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Toggle
                        label="Enforce song cooldown"
                        checked={Boolean(rules.enforceSongCooldown)}
                        onChange={(v) => patchRules({ enforceSongCooldown: v })}
                      />
                      <div className="admFieldHelp">
                        Prevents the same song from being requested repeatedly
                        within a short time window.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <div className="admFieldHelp">
                        Turn these safeguards on or off depending on how
                        crowd-driven or DJ-controlled you want the session to
                        feel.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Field
                        label="Artist cooldown minutes"
                        value={rules.artistCooldownMinutes || 0}
                        onChange={(v) =>
                          patchRules({ artistCooldownMinutes: v })
                        }
                      />
                      <div className="admFieldHelp">
                        Minimum time before the same artist can appear again.
                        Typical: 10–30 minutes.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Field
                        label="Song cooldown minutes"
                        value={rules.songCooldownMinutes || 0}
                        onChange={(v) => patchRules({ songCooldownMinutes: v })}
                      />
                      <div className="admFieldHelp">
                        Minimum time before the exact same song can be requested
                        again. Typical: 60–180 minutes.
                      </div>
                    </div>
                  </div>
                </SubPanel>

                <SubPanel
                  title="Limits"
                  sub="Controls how aggressive or controlled the request system feels during a session. These settings prevent spam, balance fairness, and protect the DJ flow."
                >
                  <div className="admGrid2">
                    <div className="admFieldStack">
                      <Field
                        label="Max requests per session"
                        value={rules.maxRequestsPerSession || 0}
                        onChange={(v) =>
                          patchRules({ maxRequestsPerSession: v })
                        }
                      />
                      <div className="admFieldHelp">
                        Total number of songs a single user can request during
                        one session. Helps prevent one person from dominating
                        the queue.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Field
                        label="Max votes per session"
                        value={rules.maxVotesPerSession || 0}
                        onChange={(v) => patchRules({ maxVotesPerSession: v })}
                      />
                      <div className="admFieldHelp">
                        Limits how many upvotes/downvotes a user can spend per
                        session. Keeps voting meaningful and prevents spam
                        tapping.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Field
                        label="Min seconds between actions"
                        value={rules.minSecondsBetweenActions || 0}
                        onChange={(v) =>
                          patchRules({ minSecondsBetweenActions: v })
                        }
                      />
                      <div className="admFieldHelp">
                        Cooldown between any actions (request, vote, boost).
                        Prevents rapid-fire abuse and accidental double taps.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Field
                        label="Max same artist in queue"
                        value={rules.maxArtistInQueue || 0}
                        onChange={(v) => patchRules({ maxArtistInQueue: v })}
                      />
                      <div className="admFieldHelp">
                        Limits how many songs from the same artist can exist in
                        the queue at once. Keeps variety high and avoids artist
                        stacking.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Field
                        label="Max active requests per user"
                        value={rules.maxActiveRequestsPerUser || 0}
                        onChange={(v) =>
                          patchRules({ maxActiveRequestsPerUser: v })
                        }
                      />
                      <div className="admFieldHelp">
                        How many of a user's songs can be sitting in the queue
                        at the same time before any of them are played.
                      </div>
                    </div>

                    <div className="admFieldStack">
                      <Field
                        label="Max On Deck songs"
                        value={(rules as any).maxOnDeck || 0}
                        onChange={(v) => patchRules({ maxOnDeck: v } as any)}
                      />
                      <div className="admFieldHelp">
                        Maximum number of songs visible in the upcoming queue.
                        Controls how full the system feels and how far ahead
                        users can influence playback.
                      </div>
                    </div>
                  </div>
                </SubPanel>

                <SubPanel
                  title="Branding and messages"
                  sub="Logo and front-end message copy."
                >
                  <div className="admFieldStack">
                    <TextField
                      label="Logo URL"
                      value={rules.logoUrl || ""}
                      onChange={(v) => patchRules({ logoUrl: v })}
                    />
                    <TextField
                      label="Explicit message"
                      value={rules.msgExplicit || ""}
                      onChange={(v) => patchRules({ msgExplicit: v })}
                    />
                    <TextField
                      label="Too many active requests message"
                      value={rules.msgTooManyActiveRequests || ""}
                      onChange={(v) =>
                        patchRules({ msgTooManyActiveRequests: v })
                      }
                    />
                    <TextField
                      label="Already requested message"
                      value={rules.msgAlreadyRequested || ""}
                      onChange={(v) => patchRules({ msgAlreadyRequested: v })}
                    />
                    <TextField
                      label="Artist cooldown message"
                      value={rules.msgArtistCooldown || ""}
                      onChange={(v) => patchRules({ msgArtistCooldown: v })}
                    />
                    <TextField
                      label="Song cooldown message"
                      value={rules.msgSongCooldown || ""}
                      onChange={(v) => patchRules({ msgSongCooldown: v })}
                    />
                    <TextField
                      label="Artist already queued message"
                      value={rules.msgArtistAlreadyQueued || ""}
                      onChange={(v) =>
                        patchRules({ msgArtistAlreadyQueued: v })
                      }
                    />
                    <TextField
                      label="Not enough credits message"
                      value={rules.msgNoCredits || ""}
                      onChange={(v) => patchRules({ msgNoCredits: v })}
                    />
                    <TextField
                      label="Queue full message"
                      value={(rules as any).msgQueueFull || ""}
                      onChange={(v) => patchRules({ msgQueueFull: v } as any)}
                    />
                  </div>
                </SubPanel>

                <SubPanel
                  title="Bonus challenge settings"
                  sub="Controls the rotating welcome-page challenge that rewards guests with bonus-card points."
                >
                  <div className="admFieldStack">
                    <Toggle
                      label="Enable bonus challenge system"
                      checked={Boolean(rules.bonusChallengeEnabled)}
                      onChange={(v) => patchRules({ bonusChallengeEnabled: v })}
                    />

                    <div className="admGrid2">
                      <label className="admField">
                        <span className="admLabel">Rotation mode</span>
                        <select
                          className="admSelect"
                          value={rules.bonusChallengeRotationMode || "weekly"}
                          onChange={(e) =>
                            patchRules({
                              bonusChallengeRotationMode: e.target.value as
                                | "daily"
                                | "weekly"
                                | "override",
                            })
                          }
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="override">Admin Override</option>
                        </select>
                      </label>

                      <label className="admField">
                        <span className="admLabel">Override challenge</span>
                        <select
                          className="admSelect"
                          value={rules.bonusChallengeOverrideKey || ""}
                          onChange={(e) =>
                            patchRules({
                              bonusChallengeOverrideKey: e.target.value || "",
                            })
                          }
                          disabled={
                            (rules.bonusChallengeRotationMode || "weekly") !==
                            "override"
                          }
                        >
                          <option value="">Select challenge</option>
                          {normalizeBonusChallenges(rules.bonusChallenges).map(
                            (c) => (
                              <option key={c.key} value={c.key}>
                                {c.title}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    </div>

                    <div className="admFieldHelp">
                      Daily rotates by day, Weekly rotates by week, and Admin
                      Override forces one specific challenge.
                    </div>

                    <div className="admRows">
                      {normalizeBonusChallenges(rules.bonusChallenges).map(
                        (challenge, idx) => (
                          <div key={challenge.key} className="admSubPanel">
                            <div
                              className="admSplitActions"
                              style={{ marginBottom: 10 }}
                            >
                              <div className="admSubTitleText">
                                Challenge {idx + 1}
                              </div>
                              <Toggle
                                label="Active"
                                checked={Boolean(challenge.isActive)}
                                onChange={(v) =>
                                  patchBonusChallenge(idx, { isActive: v })
                                }
                              />
                            </div>

                            <div className="admGrid2">
                              <TextField
                                label="Challenge title"
                                value={challenge.title}
                                onChange={(v) =>
                                  patchBonusChallenge(idx, { title: v })
                                }
                              />

                              <Field
                                label="Point value"
                                value={challenge.pointValue}
                                onChange={(v) =>
                                  patchBonusChallenge(idx, {
                                    pointValue: Number(v),
                                  })
                                }
                              />

                              <TextField
                                label="Button text"
                                value={challenge.buttonText}
                                onChange={(v) =>
                                  patchBonusChallenge(idx, { buttonText: v })
                                }
                              />

                              <Field
                                label="Sort order"
                                value={challenge.sortOrder}
                                onChange={(v) =>
                                  patchBonusChallenge(idx, {
                                    sortOrder: Number(v),
                                  })
                                }
                              />
                            </div>

                            <TextField
                              label="Link to do challenge"
                              value={challenge.linkUrl || ""}
                              onChange={(v) =>
                                patchBonusChallenge(idx, {
                                  linkUrl: v.trim() || null,
                                })
                              }
                            />

                            <TextField
                              label="CTA text"
                              value={challenge.ctaText}
                              onChange={(v) =>
                                patchBonusChallenge(idx, { ctaText: v })
                              }
                            />

                            <label className="admField">
                              <span className="admLabel">
                                Modal message (used when link is blank)
                              </span>
                              <textarea
                                className="admTextarea"
                                rows={3}
                                value={challenge.modalMessage || ""}
                                onChange={(e) =>
                                  patchBonusChallenge(idx, {
                                    modalMessage: e.target.value.trim() || null,
                                  })
                                }
                              />
                            </label>

                            <div className="admFieldHelp">
                              If link is blank, the welcome page button opens a
                              modal using the modal message or CTA text.
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </SubPanel>

                <div className="admStickySave">
                  {requestSettingsMsg ? (
                    <div className="admNotice">{requestSettingsMsg}</div>
                  ) : null}
                  <div className="admActionRow">
                    <ActionButton onClick={() => void saveRules()}>
                      {savingRules ? "Saving..." : "Save request settings"}
                    </ActionButton>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel
              title="Import songs"
              sub="Upload CSV or XLSX song list files."
            >
              <div className="admFieldStack">
                <div className="admSubPanel">
                  <div className="admSubCopy">
                    Upload CSV or XLSX song list files here.
                  </div>
                </div>

                <input
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importSongs(f);
                  }}
                  className="admFileInput"
                />

                <TextField
                  label="Album Art Base URL"
                  value={rules.albumArtBaseUrl || ""}
                  onChange={(v) => patchRules({ albumArtBaseUrl: v })}
                />

                <TextField
                  label="Default Album Art URL"
                  value={rules.defaultAlbumArtUrl || ""}
                  onChange={(v) => patchRules({ defaultAlbumArtUrl: v })}
                />
              </div>
            </Panel>
          </div>
        )}

        {tab === "top10" && rules && (
          <div
            className="admGridSettings"
            style={{ gridTemplateColumns: "0.92fr 1.08fr" } as CSSProperties}
          >
            <Panel title="Top 10 settings" sub="Time rules and board behavior.">
              <div className="admSectionStack">
                <SubPanel
                  title="Board controls"
                  sub="Controls when the Top 10 board is active, which time zone it follows, and when the system switches into adult-night behavior."
                >
                  <div className="admFieldStack">
                    <Toggle
                      label="Enable Top 10 board"
                      checked={Boolean(rules.top10Enabled ?? true)}
                      onChange={(v) => patchRules({ top10Enabled: v })}
                    />
                    <div className="admFieldHelp">
                      Turns the public Top 10 board on or off. Disable this if
                      you do not want a live rankings board shown on screens.
                    </div>

                    <Toggle
                      label="Enable Adult Top 10 after cutoff"
                      checked={Boolean(rules.top10AdultModeEnabled ?? false)}
                      onChange={(v) => patchRules({ top10AdultModeEnabled: v })}
                    />
                    <div className="admFieldHelp">
                      Default is OFF. When disabled, the TV Top 10 stays on the
                      all-ages/general board all day, even after the cutoff time.
                    </div>

                    <TextField
                      label="Top 10 timezone"
                      value={rules.top10Timezone || "America/New_York"}
                      onChange={(v) => patchRules({ top10Timezone: v })}
                    />
                    <div className="admFieldHelp">
                      Time zone the board uses for session timing and automatic
                      bucket changes. Keep this set to your venue’s local time
                      zone.
                    </div>

                    <div className="admGrid2">
                      <Field
                        label="Adult cutoff hour (24h)"
                        value={rules.top10AdultCutoffHour ?? 21}
                        onChange={(v) =>
                          patchRules({ top10AdultCutoffHour: v })
                        }
                      />
                      <Field
                        label="Adult cutoff minute"
                        value={rules.top10AdultCutoffMinute ?? 0}
                        onChange={(v) =>
                          patchRules({ top10AdultCutoffMinute: v })
                        }
                      />
                    </div>

                    <div className="admFieldHelp">
                      Time when the Top 10 board begins treating the night as
                      adult programming instead of general public skating.
                      Example: 21:00 = 9:00 PM.
                    </div>

                    <Toggle
                      label="Auto refresh Top 10 stats"
                      checked={Boolean(rules.top10AutoRefreshEnabled ?? false)}
                      onChange={(v) =>
                        patchRules({ top10AutoRefreshEnabled: v })
                      }
                    />
                    <div className="admFieldHelp">
                      Default is OFF. Use this for future scheduled refreshes,
                      likely once weekly. Manual refresh/reset controls remain
                      available below.
                    </div>

                    <div className="admLabel">Auto refresh day(s)</div>
                    <div className="admActionRow">
                      {TOP10_WEEKDAYS.map((day) => {
                        const selected = Array.isArray(rules.top10AutoRefreshDays)
                          ? rules.top10AutoRefreshDays.includes(day.key)
                          : false;
                        return (
                          <ActionButton
                            key={day.key}
                            alt={!selected}
                            onClick={() => toggleTop10AutoRefreshDay(day.key)}
                          >
                            {selected ? "✓ " : ""}
                            {day.label}
                          </ActionButton>
                        );
                      })}
                    </div>
                    <div className="admFieldHelp">
                      Leave every day off until you are ready for scheduled
                      refreshes. Selecting one day gives you a clean weekly
                      refresh plan.
                    </div>
                  </div>
                </SubPanel>

                <SubPanel
                  title="Active board rules"
                  sub="Current effective values and preview mode."
                >
                  <div className="admFieldStack">
                    <div className="admSubCopy">
                      Timezone: <b>{effectiveTop10Timezone}</b>
                    </div>
                    <div className="admSubCopy">
                      Adult cutoff:{" "}
                      <b>
                        {String(effectiveTop10CutoffHour).padStart(2, "0")}:
                        {String(effectiveTop10CutoffMinute).padStart(2, "0")}
                      </b>
                    </div>
                    <div className="admSubCopy">
                      Adult auto-switch:{" "}
                      <b>{rules.top10AdultModeEnabled ? "Enabled" : "Off"}</b>
                    </div>
                    <div className="admSubCopy">
                      Auto refresh:{" "}
                      <b>{rules.top10AutoRefreshEnabled ? "Enabled" : "Off"}</b>
                    </div>
                    <div className="admSubCopy">
                      Refresh days:{" "}
                      <b>
                        {Array.isArray(rules.top10AutoRefreshDays) &&
                        rules.top10AutoRefreshDays.length > 0
                          ? rules.top10AutoRefreshDays.join(", ")
                          : "None"}
                      </b>
                    </div>
                    <div className="admSubCopy">
                      Preview mode:{" "}
                      <b>
                        {top10BucketView === "AUTO"
                          ? "Auto bucket"
                          : top10BucketView}
                      </b>
                    </div>
                    <div className="admSubCopy">
                      Active board from API: <b>{top10ActiveBucket || "—"}</b>
                    </div>
                  </div>
                </SubPanel>

                {top10SettingsMsg ? (
                  <div className="admNotice">{top10SettingsMsg}</div>
                ) : null}
                <div className="admActionRow">
                  <ActionButton onClick={saveTop10Settings}>
                    Save Top 10 settings
                  </ActionButton>
                  <ActionButton alt onClick={() => loadTop10()}>
                    Refresh Top 10 preview
                  </ActionButton>
                </div>
              </div>
            </Panel>

            <Panel
              title="Live Top 10 board"
              sub="Preview the current or forced board bucket."
            >
              <div className="admSectionStack">
                <div className="admActionRow">
                  <ActionButton alt onClick={() => setTop10BucketView("AUTO")}>
                    Auto
                  </ActionButton>
                  <ActionButton
                    alt
                    onClick={() => setTop10BucketView("GENERAL")}
                  >
                    General
                  </ActionButton>
                  <ActionButton alt onClick={() => setTop10BucketView("ADULT")}>
                    Adult
                  </ActionButton>
                </div>
                <div className="admActionRow">
                  <Pill>{top10BoardTitle}</Pill>
                  {top10ActiveBucket ? (
                    <Pill>Bucket {top10ActiveBucket}</Pill>
                  ) : null}
                  {top10UpdatedAt ? (
                    <Pill>
                      Updated {new Date(top10UpdatedAt).toLocaleTimeString()}
                    </Pill>
                  ) : null}
                  {top10DataSource === "FEATURED_TRACKS" ? (
                    <Pill variant="live">Featured filler</Pill>
                  ) : null}
                </div>
                <div className="admActionRow">
                  <ActionButton alt onClick={() => resetTop10("current")}>
                    {top10Busy ? "Working..." : "Clear current stats"}
                  </ActionButton>
                  <ActionButton
                    alt
                    onClick={() => resetTop10("bucket", "GENERAL")}
                  >
                    Clear General
                  </ActionButton>
                  <ActionButton
                    alt
                    onClick={() => resetTop10("bucket", "ADULT")}
                  >
                    Clear Adult
                  </ActionButton>
                  <ActionButton danger onClick={() => resetTop10("all")}>
                    Clear All
                  </ActionButton>
                </div>
                {top10.length === 0 ? (
                  <EmptyState>
                    No Top 10 stats yet. The public TV board will show FEATURED
                    TRACKS filler until real request data is available.
                  </EmptyState>
                ) : (
                  <div className="admRows">
                    {top10.map((item, i) => (
                      <div key={item.id} className="admRow">
                        <div className="admTextWrap" style={{ flex: 1 }}>
                          <div style={{ fontWeight: 900 }}>
                            {i + 1}. {item.title}
                          </div>
                          <div className="admMuted" style={{ marginTop: 2 }}>
                            {item.artist}
                          </div>
                          <div
                            className="admFieldHelp"
                            style={{ marginTop: 6 }}
                          >
                            Requests {Number(item.requestCount || 0)} • 👍{" "}
                            {Number(item.upvotes || 0)} • 👎{" "}
                            {Number(item.downvotes || 0)}
                            {item.lastActivityAt
                              ? ` • Active ${new Date(item.lastActivityAt).toLocaleString()}`
                              : ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", minWidth: 90 }}>
                          <div className="admFieldHelp">Score</div>
                          <div style={{ fontWeight: 1000, fontSize: 22 }}>
                            {item.score}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

        {tab === "manualTop10" && (
          <div
            className="admGridSettings"
            style={{ gridTemplateColumns: "1.08fr 0.92fr" } as CSSProperties}
          >
            <Panel
              title="Manual Top 10 for staff"
              sub="Drag rows into any order, generate believable thumbs up/down numbers, then save. This does not change real request votes."
            >
              <div className="admSectionStack">
                <div className="admActionRow">
                  <div style={{ width: 180 }}>
                    <Field
                      label="Top item score"
                      value={Number(manualTargetVotes || 0)}
                      onChange={(v) => setManualTargetVotes(String(v))}
                    />
                  </div>
                  <ActionButton alt onClick={generateManualVotes}>
                    Generate Votes
                  </ActionButton>
                  <ActionButton onClick={saveManualTop10} disabled={manualTop10Busy}>
                    {manualTop10Busy ? "Saving…" : "Save Top 10"}
                  </ActionButton>
                  <ActionButton alt onClick={loadManualTop10}>
                    Refresh
                  </ActionButton>
                </div>

                <div className="admFieldHelp">
                  Use this as a staff-facing training/display list. Approved, Rejected, and Pending requests are all available below.
                  {manualTop10UpdatedAt ? ` Last saved ${new Date(manualTop10UpdatedAt).toLocaleString()}.` : ""}
                </div>

                {manualTop10Msg ? <div className="admNotice">{manualTop10Msg}</div> : null}

                {manualTop10Items.length === 0 ? (
                  <EmptyState>No manual songs selected yet. Add songs from the request pool.</EmptyState>
                ) : (
                  <div className="admRows">
                    {manualTop10Items.map((item, i) => (
                      <div
                        key={item.id}
                        className="admRow"
                        draggable
                        onDragStart={() => setManualDragId(item.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          moveManualTop10Item(manualDragId, item.id);
                          setManualDragId("");
                        }}
                        style={{
                          alignItems: "center",
                          gap: 12,
                          cursor: "grab",
                          borderColor: manualDragId === item.id ? "rgba(94, 234, 212, .75)" : undefined,
                        }}
                      >
                        <div style={{ fontWeight: 1000, width: 28, textAlign: "center" }}>{i + 1}</div>
                        <img
                          src={item.artworkUrl || rules?.defaultAlbumArtUrl || "/logo.png"}
                          alt=""
                          style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 12, flex: "0 0 auto" }}
                        />
                        <div className="admTextWrap" style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <span style={{ fontWeight: 1000, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.title}
                            </span>
                            <Pill variant={statusPillVariant(item.statusSymbol)}>{item.statusSymbol}</Pill>
                          </div>
                          <div className="admMuted" style={{ marginTop: 2, textTransform: "uppercase", fontSize: 11, fontWeight: 900 }}>
                            {item.artist}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", minWidth: 168 }}>
                          <Pill>👍 {Number(item.upvotes || 0)}</Pill>
                          <Pill>👎 {Number(item.downvotes || 0)}</Pill>
                          <ActionButton danger onClick={() => removeManualTop10Item(item.id)}>
                            Remove
                          </ActionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            <Panel
              title="All incoming requests"
              sub="Approved, rejected, and unanswered/pending requests. Add up to 10 into the manual staff board."
            >
              <div className="admSectionStack">
                <div className="admActionRow">
                  <Pill>{manualRequestPool.length} total requests</Pill>
                  <Pill>{manualTop10Items.length}/10 selected</Pill>
                </div>
                {manualRequestPool.length === 0 ? (
                  <EmptyState>No requests found yet.</EmptyState>
                ) : (
                  <div className="admRows" style={{ maxHeight: 740, overflow: "auto", paddingRight: 4 }}>
                    {manualRequestPool.map((item) => {
                      const selected = manualTop10Items.some((row) => row.id === item.id);
                      return (
                        <div key={item.id} className="admRow" style={{ alignItems: "center", gap: 10 }}>
                          <img
                            src={item.artworkUrl || rules?.defaultAlbumArtUrl || "/logo.png"}
                            alt=""
                            style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 11, flex: "0 0 auto" }}
                          />
                          <div className="admTextWrap" style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Pill variant={statusPillVariant(item.statusSymbol)}>{item.statusSymbol}</Pill>
                              <span style={{ fontWeight: 1000, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.title}
                              </span>
                            </div>
                            <div className="admMuted" style={{ marginTop: 2, textTransform: "uppercase", fontSize: 11, fontWeight: 900 }}>
                              {item.artist}
                              {item.createdAt ? ` • ${new Date(item.createdAt).toLocaleString()}` : ""}
                            </div>
                            <div className="admFieldHelp" style={{ marginTop: 5 }}>
                              Real votes: 👍 {Number(item.upvotes || 0)} • 👎 {Number(item.downvotes || 0)} • Score {Number(item.score || 0)}
                            </div>
                          </div>
                          <ActionButton
                            alt={selected}
                            disabled={selected || manualTop10Items.length >= 10}
                            onClick={() => addManualTop10Item(item)}
                          >
                            {selected ? "Added" : "Add"}
                          </ActionButton>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

        {tab === "users" && (
          <div
            className="admGridSettings"
            style={{ gridTemplateColumns: "1.02fr 0.98fr" } as CSSProperties}
          >
            <div className="admSectionStack">
              <Panel
                title="Recent users and purchases"
                sub="Last 50 qualifying identities with code redemption and point purchase activity."
              >
                <div className="admSectionStack">
                  <div className="admSplitActions">
                    <div className="admActionRow">
                      <Pill>{recentUsersTotal} total</Pill>
                      <Pill variant="live">Page {recentUsersPage}</Pill>
                      <ActionButton
                        alt
                        onClick={() =>
                          void Promise.all([loadRecentUsers(), loadUsers()])
                        }
                      >
                        Refresh
                      </ActionButton>
                    </div>
                    <div className="admActionRow">
                      <TabButton
                        active={recentUsersFilter === "qualifying"}
                        onClick={() => {
                          setRecentUsersPage(1);
                          setRecentUsersFilter("qualifying");
                        }}
                      >
                        All qualifying
                      </TabButton>
                      <TabButton
                        active={recentUsersFilter === "redeem"}
                        onClick={() => {
                          setRecentUsersPage(1);
                          setRecentUsersFilter("redeem");
                        }}
                      >
                        Redeemed
                      </TabButton>
                      <TabButton
                        active={recentUsersFilter === "purchase"}
                        onClick={() => {
                          setRecentUsersPage(1);
                          setRecentUsersFilter("purchase");
                        }}
                      >
                        Purchased
                      </TabButton>
                      <TabButton
                        active={recentUsersFilter === "both"}
                        onClick={() => {
                          setRecentUsersPage(1);
                          setRecentUsersFilter("both");
                        }}
                      >
                        Both
                      </TabButton>
                    </div>
                  </div>

                  <div className="admRows">
                    {recentUsersBusy ? (
                      <EmptyState>Loading recent user activity…</EmptyState>
                    ) : recentUsers.length === 0 ? (
                      <EmptyState>
                        No qualifying user history returned yet.
                      </EmptyState>
                    ) : (
                      recentUsers.map((u) => (
                        <button
                          key={u.emailHash}
                          type="button"
                          className="admRow admUserHistoryRow"
                          style={{ color: "#f3f6fb" }}
                          onClick={() => openUserHistory(u.emailHash)}
                        >
                          <div className="admTextWrap" style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{ fontWeight: 900, color: "#f3f6fb" }}
                              >
                                {userLabel(u.label, u.emailHash)}
                              </div>
                              {u.verified ? (
                                <Pill variant="live">Verified</Pill>
                              ) : (
                                <Pill>Unverified</Pill>
                              )}
                              {u.purchaseCount > 0 ? (
                                <Pill variant="live">
                                  Purchase {u.purchaseCount}
                                </Pill>
                              ) : null}
                              {u.redeemedCount > 0 ? (
                                <Pill variant="warn">
                                  Redeem {u.redeemedCount}
                                </Pill>
                              ) : null}
                            </div>
                            <div
                              className="admFieldHelp admMono"
                              style={{ marginTop: 6 }}
                            >
                              {shortHash(u.emailHash)}
                            </div>
                            <div
                              className="admFieldHelp"
                              style={{ marginTop: 6 }}
                            >
                              Last activity{" "}
                              {u.lastActivityAt
                                ? new Date(u.lastActivityAt).toLocaleString()
                                : "—"}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", minWidth: 96 }}>
                            <div className="admFieldHelp">Points</div>
                            <div style={{ fontWeight: 1000, fontSize: 20 }}>
                              {u.points}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="admSplitActions">
                    <div className="admFieldHelp">
                      Showing {recentUsers.length} of {recentUsersTotal}{" "}
                      matching users.
                    </div>
                    <div className="admActionRow">
                      <ActionButton
                        alt
                        onClick={() =>
                          setRecentUsersPage((p) => Math.max(1, p - 1))
                        }
                        disabled={recentUsersPage <= 1}
                      >
                        Prev
                      </ActionButton>
                      <ActionButton
                        alt
                        onClick={() => setRecentUsersPage((p) => p + 1)}
                        disabled={recentUsers.length < recentUsersPageSize}
                      >
                        Next
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Active session users"
                sub="Current verified status, points, and code attribution."
              >
                <div className="admRows">
                  {users.length === 0 ? (
                    <EmptyState>No active users returned yet.</EmptyState>
                  ) : (
                    users.map((u) => (
                      <div key={u.emailHash} className="admRow">
                        <div>
                          <div style={{ fontWeight: 900 }}>{u.label}</div>
                          <div className="admMuted">
                            {u.verified ? "Verified" : "Unverified"}
                            {u.redemptionCode ? (
                              <> • Code {u.redemptionCode}</>
                            ) : null}
                          </div>
                        </div>
                        <div className="admMuted">Points {u.points}</div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </div>

            <Panel
              title="Redemption codes"
              sub="Create, import, disable, inspect, and delete codes."
            >
              <div className="admSectionStack">
                <SubPanel
                  title="Create single code"
                  sub="Manual entry for one-off point grants."
                >
                  <div
                    className="admGrid2"
                    style={
                      {
                        gridTemplateColumns: "1fr 0.6fr 0.6fr",
                      } as CSSProperties
                    }
                  >
                    <Input
                      value={codeNew}
                      onChange={(e) => setCodeNew(e.target.value.toUpperCase())}
                      placeholder="CODE2026"
                    />
                    <Input
                      type="number"
                      value={String(codePoints)}
                      onChange={(e) => setCodePoints(Number(e.target.value))}
                    />
                    <Input
                      type="number"
                      value={String(codeMaxUses)}
                      onChange={(e) => setCodeMaxUses(Number(e.target.value))}
                    />
                  </div>
                  <div className="admActionRow">
                    <ActionButton onClick={createCode}>
                      Create code
                    </ActionButton>
                  </div>
                </SubPanel>

                <div className="admHr" />

                <SubPanel
                  title="Import codes from XLSX or CSV"
                  sub="Expected columns: code, points, optional maxUses, redeemWindowMinutes, expiresAt."
                >
                  <input
                    type="file"
                    accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        void importCodes(f);
                        e.currentTarget.value = "";
                      }
                    }}
                    className="admFileInput"
                    disabled={importingCodes}
                  />
                  <div className="admFieldHelp">
                    {importingCodes
                      ? "Importing..."
                      : "Upload a spreadsheet to bulk-create redemption codes."}
                  </div>
                </SubPanel>

                {codesMsg ? <div className="admNotice">{codesMsg}</div> : null}

                <div className="admRows">
                  {codes.length === 0 ? (
                    <EmptyState>No codes yet.</EmptyState>
                  ) : (
                    codes.map((c) => (
                      <div key={c.id} className="admRow">
                        <div>
                          <div style={{ fontWeight: 900 }}>{c.code}</div>
                          <div className="admMuted">
                            {c.points} pts • {c.uses}/{c.maxUses} uses
                          </div>
                        </div>
                        <div className="admActionRow">
                          <ActionButton onClick={() => showCodeUses(c)}>
                            Show uses
                          </ActionButton>
                          {!c.disabledAt ? (
                            <ActionButton alt onClick={() => disableCode(c.id)}>
                              Disable
                            </ActionButton>
                          ) : (
                            <Pill variant="warn">Disabled</Pill>
                          )}
                          <ActionButton
                            danger
                            onClick={() => deleteCode(c.id, c.code)}
                          >
                            Delete
                          </ActionButton>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Panel>
          </div>
        )}

        {tab === "staff" && currentStaffRole === "SUPER_ADMIN" && (
          <div className="admGridSettings">
            <Panel
              title="Staff users"
              sub="Create staff logins, disable users, reset PINs, and manage upper-admin access."
            >
              <div className="admSectionStack">
                <SubPanel
                  title="Create new staff user"
                  sub="Simple username + PIN login."
                >
                  <div className="admGrid2">
                    <TextField
                      label="Username"
                      value={newStaffUsername}
                      onChange={setNewStaffUsername}
                    />
                    <TextField
                      label="PIN"
                      value={newStaffPin}
                      onChange={setNewStaffPin}
                    />
                  </div>

                  <label className="admField" style={{ marginTop: 12 }}>
                    <span className="admLabel">Role</span>
                    <select
                      className="admSelect"
                      value={newStaffRole}
                      onChange={(e) =>
                        setNewStaffRole(e.target.value as StaffRole)
                      }
                    >
                      <option value="STAFF">STAFF</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                  </label>

                  <div className="admActionRow" style={{ marginTop: 12 }}>
                    <ActionButton onClick={createStaffUser}>
                      Create staff user
                    </ActionButton>
                  </div>
                </SubPanel>

                {staffMsg ? <div className="admNotice">{staffMsg}</div> : null}

                <SubPanel
                  title="Existing staff users"
                  sub="Disable terminated users and manage access."
                >
                  <div className="admRows">
                    {staffBusy ? (
                      <EmptyState>Loading staff users…</EmptyState>
                    ) : staffUsers.length === 0 ? (
                      <EmptyState>No staff users found.</EmptyState>
                    ) : (
                      staffUsers.map((u) => (
                        <div key={u.id} className="admRow">
                          <div className="admTextWrap" style={{ flex: 1 }}>
                            <div style={{ fontWeight: 900 }}>{u.username}</div>
                            <div
                              className="admFieldHelp"
                              style={{ marginTop: 6 }}
                            >
                              Role {u.role} • {u.active ? "Active" : "Disabled"}
                            </div>
                          </div>

                          <div className="admActionRow">
                            <ActionButton alt onClick={() => resetStaffPin(u)}>
                              Reset PIN
                            </ActionButton>

                            <ActionButton
                              alt
                              onClick={() =>
                                changeStaffRole(
                                  u,
                                  u.role === "SUPER_ADMIN"
                                    ? "STAFF"
                                    : "SUPER_ADMIN",
                                )
                              }
                            >
                              Make{" "}
                              {u.role === "SUPER_ADMIN"
                                ? "STAFF"
                                : "SUPER_ADMIN"}
                            </ActionButton>

                            <ActionButton
                              danger
                              onClick={() => deleteStaffUser(u)}
                            >
                              Delete
                            </ActionButton>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SubPanel>
              </div>
            </Panel>
          </div>
        )}

        <UserHistoryModal
          open={userModalOpen}
          loading={userModalBusy}
          saving={userModalSaving}
          user={selectedUser}
          targetBalance={targetBalance}
          adjustReason={adjustReason}
          onChangeTargetBalance={setTargetBalance}
          onChangeAdjustReason={setAdjustReason}
          onSave={saveUserBalanceOverride}
          onClose={() => {
            if (userModalSaving) return;
            setUserModalOpen(false);
            setSelectedUser(null);
            setTargetBalance("");
            setAdjustReason("Manual correction");
          }}
        />

        <CodeUsesModal
          open={codeUsesOpen}
          code={selectedCode}
          items={selectedCodeUses}
          loading={codeUsesLoading}
          onClose={() => {
            setCodeUsesOpen(false);
            setSelectedCode(null);
            setSelectedCodeUses([]);
          }}
        />

        {tab === "shoutoutSettings" && rules && messageRules && (
          <div className="admGridSettings">
            <div className="admSectionStack">
              <Panel
                title="Shout-out settings"
                sub="Controls for shout-out availability, message limits, moderation responses, and TV rotation."
              >
                <div className="admSectionStack">
                  <SubPanel
                    title="Availability and limits"
                    sub="Core controls for whether shout-outs are live and how much each guest can submit during a session."
                  >
                    <div className="admGrid2">
                      <div className="admFieldStack">
                        <Toggle
                          label="Enable shout-outs"
                          checked={Boolean(messageRules.enabled)}
                          onChange={(v) => patchMessageRules({ enabled: v })}
                        />
                        <div className="admFieldHelp">
                          Master switch for the shout-out system. Turn this off
                          to block all new shout-out submissions.
                        </div>
                      </div>

                      <div className="admFieldStack">
                        <Field
                          label="Max active shout-outs per user"
                          value={messageRules.maxPendingPerIdentity || 3}
                          onChange={(v) =>
                            patchMessageRules({
                              maxPendingPerIdentity: Math.max(
                                1,
                                Number(v) || 3,
                              ),
                            })
                          }
                        />
                        <div className="admFieldHelp">
                          Maximum number of pending, approved, or active
                          shout-outs one guest can have in the current session.
                        </div>
                      </div>

                      <div className="admFieldStack">
                        <Field
                          label="Max from-name characters"
                          value={messageRules.maxFromNameChars || 24}
                          onChange={(v) =>
                            patchMessageRules({
                              maxFromNameChars: Math.max(1, Number(v) || 24),
                            })
                          }
                        />
                        <div className="admFieldHelp">
                          Maximum length for the sender name shown on the public
                          shout-out card.
                        </div>
                      </div>

                      <div className="admFieldStack">
                        <Field
                          label="Max message characters"
                          value={messageRules.maxMessageChars || 80}
                          onChange={(v) =>
                            patchMessageRules({
                              maxMessageChars: Math.max(1, Number(v) || 80),
                            })
                          }
                        />
                        <div className="admFieldHelp">
                          Maximum length for the shout-out message body before
                          automatic validation blocks submission.
                        </div>
                      </div>
                    </div>
                  </SubPanel>

                  <SubPanel
                    title="Moderation response"
                    sub="Customer-facing copy used when the automatic filter blocks a shout-out."
                  >
                    <div className="admFieldStack">
                      <TextField
                        label="Blocked shout-out message"
                        value={messageRules.filterBlockMessage || ""}
                        onChange={(v) =>
                          patchMessageRules({ filterBlockMessage: v })
                        }
                      />
                      <div className="admFieldHelp">
                        This message is shown to the customer when automatic
                        moderation blocks a shout-out before staff review.
                      </div>
                    </div>
                  </SubPanel>

                  <SubPanel
                    title="TV rotation"
                    sub="Controls how long approved shout-outs stay on the TV before the next slide appears."
                  >
                    <div className="admFieldStack">
                      <Field
                        label="Slide rotation seconds"
                        value={effectiveShoutoutSlideSeconds}
                        onChange={(v) =>
                          patchRules({
                            shoutoutSlideSeconds: Math.max(
                              1,
                              Math.min(120, Number(v) || 10),
                            ),
                          })
                        }
                      />
                      <div className="admFieldHelp">
                        10 seconds is a strong default. It gives families enough
                        time to read birthday and congratulations messages
                        without making the TV feel slow.
                      </div>
                    </div>
                  </SubPanel>

                  <SubPanel
                    title="Live runtime notes"
                    sub="Current assumptions from the live shout-out flow."
                  >
                    <div className="admFieldStack">
                      <div className="admSubCopy">
                        Shout-outs enabled:{" "}
                        <b>{messageRules.enabled ? "Yes" : "No"}</b>
                      </div>
                      <div className="admSubCopy">
                        Max pending per user:{" "}
                        <b>{Number(messageRules.maxPendingPerIdentity || 3)}</b>
                      </div>
                      <div className="admSubCopy">
                        From-name limit:{" "}
                        <b>
                          {Number(messageRules.maxFromNameChars || 24)}{" "}
                          characters
                        </b>
                      </div>
                      <div className="admSubCopy">
                        Message limit:{" "}
                        <b>
                          {Number(messageRules.maxMessageChars || 80)}{" "}
                          characters
                        </b>
                      </div>
                      <div className="admSubCopy">
                        Rotation speed:{" "}
                        <b>{effectiveShoutoutSlideSeconds} seconds</b>
                      </div>
                      <div className="admSubCopy">
                        Weighted rotation: <b>Enabled in live shout-out feed</b>
                      </div>
                      <div className="admSubCopy">
                        Placeholder storage: <b>Browser-local for now</b>
                      </div>
                    </div>
                  </SubPanel>

                  {shoutoutSettingsMsg ? (
                    <div className="admNotice">{shoutoutSettingsMsg}</div>
                  ) : null}
                  <div className="admActionRow">
                    <ActionButton onClick={saveShoutoutSettings}>
                      {savingRules ? "Saving..." : "Save shout-out settings"}
                    </ActionButton>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Shout out products"
                sub="Reference only: current live product catalog and rotation weights."
              >
                <div className="admRows">
                  {liveProducts.map((p: any) => (
                    <div key={p.id} className="admSubPanel">
                      <div className="admSplitActions">
                        <div className="admTextWrap">
                          <div style={{ fontWeight: 1000 }}>{p.title}</div>
                          <div className="admMuted" style={{ marginTop: 4 }}>
                            {p.description}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", minWidth: 110 }}>
                          <div style={{ fontWeight: 1000 }}>
                            {p.creditsCost} credits
                          </div>
                          <div className="admMuted">
                            {Math.round(p.durationSec / 60)} min
                          </div>
                        </div>
                      </div>
                      <div className="admActionRow" style={{ marginTop: 10 }}>
                        <Pill>{p.hasImage ? "Photo tier" : "Text only"}</Pill>
                        <Pill>Weight {p.weight}</Pill>
                        <Pill variant={p.enabled ? "live" : "warn"}>
                          {p.enabled ? "Live" : "Coming soon"}
                        </Pill>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel
              title="TV placeholder shout-outs"
              sub="Browser-local fallback content for the TV page until shared persistence is added."
            >
              <div className="admSectionStack">
                <div className="admSubPanel">
                  <div className="admSubCopy">
                    These fallback placeholders are stored in browser storage
                    for now. They will appear on the TV page only in the same
                    browser profile until shared backend persistence is added.
                  </div>
                </div>
                <div className="admRows">
                  {placeholders.map((p, idx) => (
                    <div key={p.id} className="admSubPanel">
                      <div
                        className="admSubTitleText"
                        style={{ marginBottom: 10 }}
                      >
                        Placeholder {idx + 1}
                      </div>
                      <Label>Header</Label>
                      <Input
                        value={p.title}
                        onChange={(e) =>
                          updatePlaceholder(idx, { title: e.target.value })
                        }
                      />
                      <Label style={{ marginTop: 10 }}>Product Label</Label>
                      <Input
                        value={p.productTitle || ""}
                        onChange={(e) =>
                          updatePlaceholder(idx, {
                            productTitle: e.target.value,
                          })
                        }
                      />
                      <Label style={{ marginTop: 10 }}>Photo</Label>

                      {p.imageUrl ? (
                        <div
                          style={{
                            marginBottom: 10,
                            borderRadius: 14,
                            overflow: "hidden",
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <img
                            src={p.imageUrl}
                            alt={`Placeholder ${idx + 1}`}
                            style={{
                              display: "block",
                              width: "100%",
                              maxHeight: 240,
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className="admFieldHelp"
                          style={{ marginBottom: 10 }}
                        >
                          No photo uploaded yet.
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/heic,image/heif"
                        className="admFileInput"
                        disabled={placeholderUploadBusyId === p.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            void uploadPlaceholderPhoto(idx, file);
                          }
                          e.currentTarget.value = "";
                        }}
                      />

                      <div className="admFieldHelp" style={{ marginTop: 8 }}>
                        Upload uses the same image validation flow as public
                        photo shout-outs.
                      </div>

                      {p.imageUrl ? (
                        <div className="admActionRow" style={{ marginTop: 10 }}>
                          <ActionButton
                            alt
                            onClick={() =>
                              updatePlaceholder(idx, {
                                imageUrl: null,
                                imagePath: null,
                              })
                            }
                          >
                            Remove photo
                          </ActionButton>
                        </div>
                      ) : null}
                      <Label style={{ marginTop: 10 }}>Message</Label>
                      <Textarea
                        rows={4}
                        value={p.body}
                        onChange={(e) =>
                          updatePlaceholder(idx, { body: e.target.value })
                        }
                      />
                      <Label style={{ marginTop: 10 }}>From</Label>
                      <Input
                        value={p.fromName}
                        onChange={(e) =>
                          updatePlaceholder(idx, { fromName: e.target.value })
                        }
                      />
                      <Label style={{ marginTop: 10 }}>Accent</Label>
                      <select
                        value={p.accent || "cyan"}
                        onChange={(e) =>
                          updatePlaceholder(idx, {
                            accent: e.target.value as "gold" | "cyan" | "pink",
                          })
                        }
                        className="admSelect"
                      >
                        <option value="cyan">Cyan</option>
                        <option value="gold">Gold</option>
                        <option value="pink">Pink</option>
                      </select>
                    </div>
                  ))}
                </div>
                <div className="admActionRow">
                  <ActionButton onClick={savePlaceholderSettings}>
                    Save placeholder settings
                  </ActionButton>
                  <ActionButton alt onClick={resetPlaceholderSettings}>
                    Reset defaults
                  </ActionButton>
                </div>
              </div>
            </Panel>
          </div>
        )}
        {editOpen ? (
          <div className="admOverlay">
            <div className="admModalCard" style={{ width: "min(680px, 96vw)" }}>
              <div
                className="admPanelTitle"
                style={{ fontSize: 18, marginBottom: 14 }}
              >
                Edit shout-out
              </div>
              <Label>From</Label>
              <Input
                value={editFromName}
                onChange={(e) => setEditFromName(e.target.value)}
                maxLength={40}
              />
              <Label style={{ marginTop: 12 }}>Message</Label>
              <Textarea
                rows={5}
                value={editMessageText}
                onChange={(e) => setEditMessageText(e.target.value)}
                maxLength={160}
              />
              <div className="admFieldHelp" style={{ marginTop: 8 }}>
                {editMessageText.length} characters
              </div>
              <div className="admActionRow" style={{ marginTop: 16 }}>
                <ActionButton onClick={saveEditedMessage}>
                  {editBusy ? "Saving..." : "Save changes"}
                </ActionButton>
                <ActionButton
                  alt
                  onClick={() => {
                    if (editBusy) return;
                    setEditOpen(false);
                    setEditMessageId("");
                    setEditFromName("");
                    setEditMessageText("");
                  }}
                >
                  Cancel
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DashboardHeroStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="admMetricCard" style={{ minHeight: 96, padding: 10 }}>
      <div className="admMetricLabel">{label}</div>
      <div className="admMetricValue">{value}</div>
      {sub ? <div className="admMetricSub">{sub}</div> : null}
    </div>
  );
}

function DashboardMiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "live" | "warn";
}) {
  return (
    <div
      className="admSubPanel"
      style={{
        padding: "10px 10px 9px",
        background:
          tone === "warn"
            ? "linear-gradient(135deg, rgba(109,61,146,0.28), rgba(23,15,40,0.95))"
            : tone === "live"
              ? "linear-gradient(135deg, rgba(33,107,162,0.24), rgba(11,16,32,0.95))"
              : undefined,
      }}
    >
      <div className="admMetricLabel">{label}</div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 1000,
          marginTop: 8,
          color: "#f7fbff",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DashboardMoneyRow({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="admSubPanel"
      style={{
        padding: "10px 12px",
        background: highlight
          ? "linear-gradient(135deg, rgba(96,42,130,0.38), rgba(14,17,34,0.98))"
          : "linear-gradient(180deg, rgba(17,27,53,0.9), rgba(11,15,28,0.94))",
      }}
    >
      <div className="admSplitActions">
        <div className="admTextWrap">
          <div className="admMetricLabel">{label}</div>
          {sub ? (
            <div className="admMetricSub" style={{ marginTop: 6 }}>
              {sub}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 24, fontWeight: 1000, color: "#f8fbff" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function DashboardActivityRow({
  label,
  title,
  meta,
  accent,
}: {
  label: string;
  title: string;
  meta?: string;
  accent?: "boost" | "message";
}) {
  return (
    <div
      className="admRow"
      style={{
        marginBottom: 8,
        paddingTop: 10,
        paddingBottom: 10,
        borderColor:
          accent === "boost"
            ? "rgba(166, 84, 203, 0.42)"
            : accent === "message"
              ? "rgba(70, 120, 193, 0.42)"
              : undefined,
      }}
    >
      <div
        className="admActionRow"
        style={{ gap: 10, alignItems: "flex-start", flexWrap: "nowrap" }}
      >
        <Pill
          variant={
            accent === "boost"
              ? "warn"
              : accent === "message"
                ? "live"
                : undefined
          }
        >
          {label}
        </Pill>
        <div className="admTextWrap" style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>{title}</div>
          {meta ? (
            <div className="admFieldHelp" style={{ marginTop: 4 }}>
              {meta}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UserHistoryModal({
  open,
  loading,
  saving,
  user,
  targetBalance,
  adjustReason,
  onChangeTargetBalance,
  onChangeAdjustReason,
  onSave,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  saving: boolean;
  user: UserHistoryDetail | null;
  targetBalance: string;
  adjustReason: string;
  onChangeTargetBalance: (next: string) => void;
  onChangeAdjustReason: (next: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="admOverlay">
      <div className="admModalCard admUserModal">
        <div className="admSplitActions" style={{ marginBottom: 14 }}>
          <div>
            <div className="admPanelTitle" style={{ fontSize: 18 }}>
              User point history
            </div>
            <div className="admPanelSub">
              Compact ledger history with admin balance override.
            </div>
          </div>
          <ActionButton alt onClick={onClose}>
            Close
          </ActionButton>
        </div>

        {loading ? (
          <EmptyState>Loading user history…</EmptyState>
        ) : !user ? (
          <EmptyState>No user details returned.</EmptyState>
        ) : (
          <div className="admSectionStack">
            <div className="admSubPanel">
              <div className="admSplitActions">
                <div className="admTextWrap">
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: 1000, fontSize: 18 }}>
                      {userLabel(user.label, user.emailHash)}
                    </div>
                    {user.verified ? (
                      <Pill variant="live">Verified</Pill>
                    ) : (
                      <Pill>Unverified</Pill>
                    )}
                  </div>
                  <div
                    className="admFieldHelp admMono"
                    style={{ marginTop: 6 }}
                  >
                    {user.emailHash}
                  </div>
                  <div className="admFieldHelp" style={{ marginTop: 6 }}>
                    Last activity{" "}
                    {user.lastActivityAt
                      ? new Date(user.lastActivityAt).toLocaleString()
                      : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 120 }}>
                  <div className="admFieldHelp">Current balance</div>
                  <div style={{ fontWeight: 1000, fontSize: 24 }}>
                    {user.points}
                  </div>
                </div>
              </div>
            </div>

            <div className="admGrid2 admUserModalGrid">
              <SubPanel
                title="Override balance"
                sub="Set an exact balance. The system records only the computed delta as a ledger entry."
              >
                <div className="admFieldStack">
                  <Field
                    label="Set balance to"
                    value={targetBalance}
                    onChange={(v) => onChangeTargetBalance(String(v))}
                  />
                  <TextField
                    label="Reason"
                    value={adjustReason}
                    onChange={onChangeAdjustReason}
                  />
                  <div className="admActionRow">
                    <ActionButton onClick={onSave}>
                      {saving ? "Saving..." : "Apply balance override"}
                    </ActionButton>
                  </div>
                </div>
              </SubPanel>

              <SubPanel
                title="Recent transaction history"
                sub={`Showing ${user.entries.length} most recent ledger rows.`}
              >
                <div className="admUserLedgerList">
                  {user.entries.length === 0 ? (
                    <EmptyState>No ledger history returned yet.</EmptyState>
                  ) : (
                    user.entries.map((entry) => (
                      <div key={entry.id} className="admUserLedgerRow">
                        <div className="admTextWrap" style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ fontWeight: 900 }}>
                              {entry.reason}
                            </div>
                            <Pill variant={reasonTone(entry.reason) as any}>
                              {entry.delta > 0
                                ? `+${entry.delta}`
                                : entry.delta}
                            </Pill>
                          </div>
                          <div
                            className="admFieldHelp"
                            style={{ marginTop: 6 }}
                          >
                            {new Date(entry.createdAt).toLocaleString()}
                          </div>
                          {entry.expiresAt ? (
                            <div className="admFieldHelp">
                              Expires{" "}
                              {new Date(entry.expiresAt).toLocaleString()}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SubPanel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeUsesModal({
  open,
  code,
  items,
  loading,
  onClose,
}: {
  open: boolean;
  code: RedemptionCode | null;
  items: RedemptionCodeUseItem[];
  loading: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="admOverlay">
      <div className="admModalCard">
        <div className="admSplitActions" style={{ marginBottom: 14 }}>
          <div>
            <div className="admPanelTitle" style={{ fontSize: 18 }}>
              Code uses {code ? `• ${code.code}` : ""}
            </div>
            <div className="admPanelSub">
              Showing the best available usage history from the credit ledger.
            </div>
          </div>
          <ActionButton alt onClick={onClose}>
            Close
          </ActionButton>
        </div>
        {loading ? (
          <EmptyState>Loading uses…</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>No recorded uses found for this code.</EmptyState>
        ) : (
          <div className="admRows">
            {items.map((item, idx) => (
              <div
                key={item.id || `${item.emailHash}-${item.usedAt}-${idx}`}
                className="admRow"
              >
                <div>
                  <div style={{ fontWeight: 900 }}>{item.label}</div>
                  <div className="admMuted">
                    {new Date(item.usedAt).toLocaleString()}
                  </div>
                  <div
                    className="admFieldHelp admMono"
                    style={{ marginTop: 4 }}
                  >
                    {item.emailHash}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{item.reason}</div>
                  <div className="admFieldHelp">
                    {item.delta > 0 ? `+${item.delta}` : item.delta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QueueRow({
  q,
  index,
  onPlayed,
  onReject,
}: {
  q: RequestItem;
  index?: number;
  onPlayed: () => void;
  onReject: () => void;
}) {
  const typeLabel = requestTypeLabel(q);
  return (
    <div className="admRowCard">
      <div className="admTextWrap" style={{ flex: 1 }}>
        <div className="admActionRow" style={{ gap: 6 }}>
          <div style={{ fontWeight: 1000, fontSize: 18 }}>
            {index ? `${index}. ` : ""}
            {q.title}
          </div>
          <div
            className={`admPill ${typeLabel === "BOOST" ? "admRequestType--boost" : "admRequestType--request"}`}
          >
            {typeLabel}
          </div>
        </div>
        <div className="admMuted" style={{ marginTop: 6, lineHeight: 1.35 }}>
          {q.artist} • {requestMetaLine(q)}
        </div>
        <div className="admFieldHelp" style={{ marginTop: 6 }}>
          Score {q.score} • 👍 {Number(q.upvotes || 0)} • 👎{" "}
          {Number(q.downvotes || 0)}
        </div>
      </div>
      <div className="admActionRow" style={{ alignSelf: "center" }}>
        <ActionButton onClick={onPlayed}>Played</ActionButton>
        <ActionButton danger onClick={onReject}>
          Reject
        </ActionButton>
      </div>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`admTab ${active ? "is-active" : ""}`}>
      {children}
    </button>
  );
}

function Panel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className="admPanel">
      <div className="admPanelHead">
        <div className="admPanelTitle">{title}</div>
        {sub ? <div className="admPanelSub">{sub}</div> : null}
      </div>
      <div className="admPanelBody">{children}</div>
    </div>
  );
}

function SubPanel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className="admSubPanel">
      <div className="admSubTitleRow">
        <div>
          <div className="admSubTitleText">{title}</div>
          {sub ? (
            <div className="admSubCopy" style={{ marginTop: 4 }}>
              {sub}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="admMetricCard">
      <div className="admMetricLabel">{label}</div>
      <div className="admMetricValue">{value}</div>
      {sub ? <div className="admMetricSub">{sub}</div> : null}
    </div>
  );
}

function ActionButton({
  alt,
  danger,
  disabled,
  children,
  onClick,
}: {
  alt?: boolean;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={danger ? "admBtnDanger" : alt ? "admBtnGhost" : "admBtn"}
    >
      {children}
    </button>
  );
}

function Pill({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: "live" | "warn" | "danger";
}) {
  return (
    <div
      className={`admPill ${variant === "live" ? "admPill--live" : variant === "warn" ? "admPill--warn" : variant === "danger" ? "admPill--danger" : ""}`}
    >
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="admSubPanel">
      <div className="admSubCopy">{children}</div>
    </div>
  );
}

function Label({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="admLabel" style={{ marginBottom: 6, ...style }}>
      {children}
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="admInput" />;
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="admTextarea" />;
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: any;
  onChange: (next: number) => void;
}) {
  return (
    <label className="admField">
      <span className="admLabel">{label}</span>
      <input
        type="number"
        value={String(value ?? 0)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="admInput"
      />
    </label>
  );
}

function MoneyField({
  label,
  centsValue,
  onChangeCents,
}: {
  label: string;
  centsValue: number;
  onChangeCents: (cents: number) => void;
}) {
  return (
    <label className="admField">
      <span className="admLabel">{label}</span>
      <input
        value={centsToDollars(centsValue)}
        onChange={(e) => onChangeCents(dollarsToCents(e.target.value))}
        className="admInput"
        inputMode="decimal"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="admField">
      <span className="admLabel">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="admInput"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="admRow" style={{ marginBottom: 0, cursor: "pointer" }}>
      <div style={{ fontWeight: 900 }}>{label}</div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18 }}
      />
    </label>
  );
}
