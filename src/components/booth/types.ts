export type QueueLikeItem = {
  id: string;
  requestId?: string | null;
  title?: string | null;
  artist?: string | null;
  status?: string | null;
  sourceType?: string | null;
  type?: string | null;
  clusterId?: string | null;
  position?: number | null;
  sortOrder?: number | null;
  durationSec?: number | null;
  runtimeMs?: number | null;
  progressPct?: number | null;
  progressPercent?: number | null;
  elapsedMs?: number | null;
  startedAt?: string | null;
  createdAt?: string | null;
  requestedByLabel?: string | null;
  boosted?: boolean | null;
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
};

export type RequestItem = {
  id: string;
  title?: string;
  artist?: string;
  score?: number;
  type?: string;
  boosted?: boolean;
  requestedByLabel?: string;
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
  pendingRequests: RequestItem[];
  pendingShoutouts: ShoutoutItem[];
  approvedShoutouts: ShoutoutItem[];
  loading: boolean;
  lastUpdated: string | null;
  errors: string[];
};
