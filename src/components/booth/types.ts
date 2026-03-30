export type QueueLikeItem = {
  id: string;
  requestId?: string | null;
  title?: string | null;
  artist?: string | null;
  status?: string | null;
  sourceType?: string | null;
  itemType?: string | null;
  type?: string | null;
  clusterId?: string | null;
  position?: number | null;
  sortOrder?: number | null;
  durationSec?: number | null;
  runtimeMs?: number | null;
  progressPct?: number | null;
  progressPercent?: number | null;
  elapsedMs?: number | null;
  elapsedSec?: number | null;
  remainingSec?: number | null;
  isEndingSoon?: boolean | null;
  startedAt?: string | null;
  expectedEndAt?: string | null;
  createdAt?: string | null;
  requestedByLabel?: string | null;
  boosted?: boolean | null;
  artworkUrl?: string | null;
  verified?: boolean | null;
  upvotes?: number | null;
  downvotes?: number | null;
  score?: number | null;
  redemptionCode?: string | null;
  requestType?: string | null;
  requestSource?: "CUSTOMER" | "DJ" | null;
  isRequest?: boolean | null;
};

export type RuntimePreview = {
  mode?: "materializer" | "derived" | "idle";
  action?: string;
  reason?: string;
  targetQueueItemId?: string | null;
  targetTitle?: string | null;
  targetArtist?: string | null;
  interstitialAssetId?: string | null;
  interstitialTitle?: string | null;
  clusterId?: string | null;
  materialized?: boolean;
  queueItemId?: string | null;
  assetId?: string | null;
  insertedQueueItemId?: string | null;
  insertedPosition?: number | null;
};

export type RequestItem = {
  id: string;
  title?: string;
  artist?: string;
  score?: number;
  type?: string;
  boosted?: boolean;
  requestedByLabel?: string;
  sortBucket?: "PLAY_NOW" | "UP_NEXT";
  verified?: boolean;
  upvotes?: number;
  downvotes?: number;
  redemptionCode?: string | null;
  createdAt?: string | null;
};

export type ShoutoutItem = {
  id: string;
  fromName?: string;
  messageText?: string;
  tier?: string;
  status?: string;
  createdAt?: string;
};

export type BoothDataState = {
  queue: QueueLikeItem[];
  runtimePreview: RuntimePreview | null;
  playNowRequests: RequestItem[];
  upNextRequests: RequestItem[];
  pendingShoutouts: ShoutoutItem[];
  approvedShoutouts: ShoutoutItem[];
  loading: boolean;
  lastUpdated: string | null;
  errors: string[];
};

export type ReorderState = {
  dirty: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  activeDragId: string | null;
};

export type BoothActionName =
  | "load"
  | "play"
  | "pause"
  | "skip"
  | "done"
  | "remove";

export type BoothActionResult = {
  ok: boolean;
  action: BoothActionName;
  message: string;
  url?: string | null;
};

export type RequestActionName = "reject" | "played";
export type BoothMode = "visual" | "performance";

export type RequestActionResult = {
  ok: boolean;
  action: RequestActionName;
  message: string;
  url?: string | null;
};

export type ShoutoutActionName = "approve" | "reject";

export type ShoutoutActionResult = {
  ok: boolean;
  action: ShoutoutActionName;
  message: string;
  url?: string | null;
};

export type InterstitialPadItem = {
  id: string;
  name: string;
  category: string;
  durationSec?: number | null;
  filePath?: string | null;
  fileUrl?: string | null;
  previewGifUrl?: string | null;
  iconLabel?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type DueInterstitialPromptOption = {
  assetId: string;
  name: string;
  previewGifUrl: string | null;
  iconLabel: string | null;
  durationSec: number | null;
  lastPlayedText: string;
};

export type DueInterstitialPrompt = {
  eventId?: string | null;
  scheduleId: string;
  category: string;
  title: string;
  body: string | null;
  startMinute: number;
  endMinute: number;
  promptMinute?: number;
  required?: boolean;
  options: DueInterstitialPromptOption[];
};

export type BoothSessionClock = {
  sessionId: string;
  startedAtIso: string;
  cycleMinutes: number;
};

export type ActiveInterstitialPlayback = {
  assetId: string;
  assetName: string;
  category: string;
  startedAtIso: string;
  endsAtIso: string;
};
