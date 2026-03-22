export type BoothMode = "visual" | "performance";

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
  elapsedSec?: number | null;
  remainingSec?: number | null;
  progressPercent?: number | null;
  isEndingSoon?: boolean | null;
  startedAt?: string | null;
  createdAt?: string | null;
  requestedByLabel?: string | null;
  boosted?: boolean | null;
  artworkUrl?: string | null;
};

export type RuntimePreview = {
  action?: string;
  reason?: string;
  targetQueueItemId?: string | null;
  targetTitle?: string | null;
  targetArtist?: string | null;
  interstitialAssetId?: string | null;
  interstitialTitle?: string | null;
  clusterId?: string | null;
  materialized?: boolean;
};

export type RequestItem = {
  id: string;
  title?: string;
  artist?: string;
  score?: number;
  type?: string;
  boosted?: boolean;
  requestedByLabel?: string;
  verified?: boolean;
};

export type ShoutoutItem = {
  id: string;
  fromName?: string;
  messageText?: string;
  tier?: string;
  status?: string;
  createdAt?: string;
};

export type BoothNotice = {
  kind: "success" | "error" | "info";
  text: string;
} | null;

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
