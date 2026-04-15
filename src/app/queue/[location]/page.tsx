// src/app/queue/[location]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnimatedBalance } from "../../../../components/ui/neon/useAnimatedBalance";
import PublicTheme from "../../../components/ui/public/PublicTheme";
import PublicBottomCommandBar from "@/components/public/PublicBottomCommandBar";

const REMIX_LOGO_URL =
  "https://skateremix.com/wp-content/uploads/2026/03/Remix_Globe_Logo_350px.png";

type QueueItem = {
  id?: string;
  requestId?: string;
  songId?: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
  score?: number;
  upvotes?: number;
  downvotes?: number;
  requestedByMe?: boolean;
  sourceType?: string;
  boosted?: boolean;
  priority?: string;
  song?: {
    id?: string;
    title?: string;
    artist?: string;
    artworkUrl?: string;
  };
  [key: string]: any;
};

type QueueRes = {
  playNow?: QueueItem[];
  upNext?: QueueItem[];
};

type SessionRes = {
  ok?: boolean;
  location?: { slug?: string; name?: string };
  session?: { id?: string | null; startedAt?: string | null; endsAt?: string | null; active?: boolean };
  balance?: number;
  rules?: {
    enableVoting?: boolean;
    costUpvote?: number;
    costDownvote?: number;
    logoUrl?: string | null;
    defaultAlbumArtUrl?: string | null;
  };
};
type BalanceRes = {
  ok?: boolean;
  balance?: number;
  sessionActive?: boolean;
  sessionStartedAt?: string | null;
  sessionExpiresAt?: string | null;
  error?: string;
};

function getRequestId(item: QueueItem) {
  return String(item.requestId || item.id || "");
}

function getTitle(item: QueueItem) {
  return String(item.title || item.song?.title || "Untitled");
}

function getArtist(item: QueueItem) {
  return String(item.artist || item.song?.artist || "Unknown artist");
}

function getArtwork(item: QueueItem) {
  return String(item.artworkUrl || item.song?.artworkUrl || "");
}

function getCountdownLabel(endsAtIso?: string | null, active?: boolean) {
  if (!active || !endsAtIso) return "Verify to Vote!";
  const endsAt = new Date(endsAtIso).getTime();
  const diff = endsAt - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return "Session expired";
  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `Session ends in ${h}h ${m}m` : `Session ends in ${m}m`;
}

function TinyArt({ src, alt, defaultSrc }: { src?: string; alt?: string; defaultSrc?: string }) {
  const [bad, setBad] = useState(false);
  const real = (src || "").trim();
  const fallback = (defaultSrc || "").trim();

  const finalSrc = !bad && real ? real : (fallback || "");

  if (!finalSrc) {
    return (
      <div className="rrArt">
        <div className="rrArtFallback">RMX</div>
      </div>
    );
  }

  return (
    <div className="rrArt">
      <img
        src={finalSrc}
        alt={alt || ""}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBad(true)}
      />
    </div>
  );
}

function BrandLogo({ logoUrl }: { logoUrl?: string | null }) {
  const src = (logoUrl || REMIX_LOGO_URL || "").trim();

  if (src) {
    return (
      <div className="rrBrandLogo">
        <img src={src} alt="Remix logo" />
      </div>
    );
  }

  return <div className="rrBrandBadge">REMIX</div>;
}

function useGunmetalSfx() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("rr_gunmetal_muted") === "1";
  });
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const unlock = async () => {
      try {
        if (!ctxRef.current) {
          // @ts-ignore
          const Ctx = window.AudioContext || window.webkitAudioContext;
          ctxRef.current = new Ctx();
        }
        if (ctxRef.current?.state === "suspended") {
          await ctxRef.current.resume();
        }
      } catch {}
    };

    const onFirst = () => {
      void unlock();
    };

    window.addEventListener("pointerdown", onFirst, { once: true });
    return () => window.removeEventListener("pointerdown", onFirst);
  }, []);

  function beep(freq: number, dur = 0.06, gain = 0.04) {
    if (muted) return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    try {
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {}
  }

  return {
    muted,
    setMuted: (next: boolean) => {
      setMuted(next);
      try {
        window.localStorage.setItem("rr_gunmetal_muted", next ? "1" : "0");
      } catch {}
    },
    playTap: () => beep(520, 0.04, 0.03),
    playSuccess: () => {
      beep(720, 0.05, 0.035);
      window.setTimeout(() => beep(940, 0.05, 0.035), 50);
    },
    playError: () => {
      beep(240, 0.08, 0.04);
      window.setTimeout(() => beep(180, 0.08, 0.04), 70);
    },
  };
}

function QueueRow({
  item,
  rank,
  emphasis,
  laneLabel,
  enableVoting,
  canVote,
  costUpvote,
  costDownvote,
  busyVoteId,
  onVote,
  defaultAlbumArtUrl,
}: {
  item: QueueItem;
  rank: number;
  emphasis?: boolean;
  laneLabel?: string;
  enableVoting: boolean;
  canVote: boolean;
  costUpvote: number;
  costDownvote: number;
  busyVoteId: string;
  onVote: (requestId: string, dir: "up" | "down") => void;
  defaultAlbumArtUrl?: string;
}) {
  const sourceType = String(item.sourceType || "").toUpperCase();
  const isInterstitial = sourceType.includes("INTERSTITIAL");
  const isBoosted = Boolean(item.boosted || item.priority === "BOOSTED");
  const requestId = getRequestId(item);
  const score = Number(item.score || 0);
  const upvotes = Number(item.upvotes || 0);
  const downvotes = Number(item.downvotes || 0);
  const disableVote = !requestId || !enableVoting || busyVoteId === requestId || isInterstitial;

  return (
    <div className={`rrQueueRow ${emphasis ? "rrQueueRow--emphasis" : ""}`}>
      <div className="rrQueueRank">{rank}</div>

      <TinyArt
  src={getArtwork(item)}
  alt={getTitle(item)}
  defaultSrc={defaultAlbumArtUrl || ""}
/>

      <div className="rrQueueCopy">
        <div className="rrQueueTopline">
          <div className="rrQueueTitle">{getTitle(item)}</div>
          <div className="rrQueueMetaInline">• {getArtist(item)}</div>
        </div>

        <div className="rrQueueTagRow">
          {laneLabel ? <span className="rrStatusPill rrStatusPill--live">{laneLabel}</span> : null}
          {isInterstitial ? <span className="rrTag rrTag--interstitial">Auto Insert</span> : null}
          {isBoosted ? <span className="rrTag rrTag--boost">Boosted</span> : null}
          {item.requestId ? <span className="rrTag rrTag--request">Request</span> : null}
          {!canVote && !isInterstitial ? <span className="rrMetaPill">verify to vote</span> : null}
        </div>
      </div>

      <div className="rrQueueRight">
        <span className="rrMetaPill rrScorePill">S {score}</span>
        {!isInterstitial ? (
          <div className="rrVoteRail">
            <button
              className="rrVoteBtn rrVoteBtnGhost"
              disabled={disableVote}
              onClick={() => onVote(requestId, "down")}
              title={enableVoting ? `Downvote (-${costDownvote} pt)` : "Voting disabled"}
              aria-label={`Downvote ${getTitle(item)}`}
            >
              <span>👎</span>
              <span className="rrVoteCount">{downvotes}</span>
            </button>
            <button
              className="rrVoteBtn rrVoteBtnPrimary"
              disabled={disableVote}
              onClick={() => onVote(requestId, "up")}
              title={enableVoting ? `Upvote (-${costUpvote} pt)` : "Voting disabled"}
              aria-label={`Upvote ${getTitle(item)}`}
            >
              <span>👍</span>
              <span className="rrVoteCount">{upvotes}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function QueuePage({ params }: { params: { location: string } }) {
  const location = decodeURIComponent(params.location);
  
  // State Hooks
  const [rulesData, setRulesData] = useState<SessionRes | null>(null);
  const [queueData, setQueueData] = useState<QueueRes>({ playNow: [], upNext: [] });
  const [loading, setLoading] = useState(true);
  const [sessionCountdown, setSessionCountdown] = useState("Verify to Vote!");
  const [identityId, setIdentityId] = useState("");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [msg, setMsg] = useState("");
  const [busyVoteId, setBusyVoteId] = useState("");
  
  // Added these since they were being called in your snippet
  const [buyReason, setBuyReason] = useState("boost");
  const [showBuy, setShowBuy] = useState(false);

  const mountedRef = useRef(true);
  const sfx = useGunmetalSfx();

  // Helper Functions
  function resetToClaimState() {
    try {
      localStorage.removeItem("rr_identityId");
      localStorage.removeItem("rr_location");
    } catch {}
    setIdentityId("");
    setVerified(false);
  }

  function clearExpiredIdentity() {
    resetToClaimState();
  }

  // Effects
  useEffect(() => {
    mountedRef.current = true;
    try {
      const nextIdentityId = (localStorage.getItem("rr_identityId") || "").trim();
      const nextLocation = (localStorage.getItem("rr_location") || "").trim();
      const nextEmail = (localStorage.getItem("rr_email") || "").trim();

      if (nextLocation && nextLocation !== location) {
        clearExpiredIdentity();
      } else if (nextIdentityId) {
        setIdentityId(nextIdentityId);
      }
      if (nextEmail) setEmail(nextEmail);
    } catch {}

    return () => { mountedRef.current = false; };
  }, [location]);

  // Balance & Data Fetching
  async function fetchBalanceNumber(nextIdentityId?: string): Promise<number> {
    const id = (nextIdentityId ?? identityId ?? "").trim();
    if (!id) return 0;

    const res = await fetch(
      `/api/public/balance?location=${encodeURIComponent(location)}&identityId=${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as BalanceRes;
    
    if (!data.ok) throw new Error(data.error || "Balance fetch failed");

    if (!data.sessionActive) {
      resetToClaimState();
      return 5; 
    }

    setVerified(true);
    return Number(data.balance ?? 0);
  }

  const bal = useAnimatedBalance(() => fetchBalanceNumber(), {
    enabled: Boolean(identityId),
    softPollMs: 2200,
    intervalMs: 650,
    storageKey: `rr_lastBalance:${location}:${identityId || "anon"}`,
  });

  async function loadQueueAndSession(showLoader = false) {
    if (showLoader) setLoading(true);
    try {
      const sessionUrl = identityId
        ? `/api/public/session/${location}?identityId=${encodeURIComponent(identityId)}`
        : `/api/public/session/${location}`;

      const [sessionRes, queueRes] = await Promise.all([
        fetch(sessionUrl, { cache: "no-store" }),
        fetch(`/api/public/queue/${location}`, { cache: "no-store" }),
      ]);

      const sessionJson = (await sessionRes.json()) as SessionRes;
      const queueJson = (await queueRes.json()) as QueueRes;

      if (!mountedRef.current) return;

      const sessionActive = Boolean(sessionJson?.session?.active);
      if (identityId && !sessionActive) {
        resetToClaimState();
      } else {
        setVerified(sessionActive);
      }

      setRulesData(sessionJson);
      setQueueData({
        playNow: Array.isArray(queueJson?.playNow) ? queueJson.playNow : [],
        upNext: Array.isArray(queueJson?.upNext) ? queueJson.upNext : [],
      });
    } catch {
      if (mountedRef.current) setMsg("Could not load queue.");
    } finally {
      if (mountedRef.current && showLoader) setLoading(false);
    }
  }

  // Polling & Memoized Data
  useEffect(() => {
    void loadQueueAndSession(true);
    const queueId = window.setInterval(() => void loadQueueAndSession(), 4500);
    return () => window.clearInterval(queueId);
  }, [location, identityId]);

  const mergedQueue = useMemo(() => {
    return [
      ...(queueData.playNow || []).map((item) => ({ ...item, __lane: "playNow" })),
      ...(queueData.upNext || []).map((item) => ({ ...item, __lane: "upNext" })),
    ];
  }, [queueData]);

  // Logic Constants
  const votingOn = Boolean(rulesData?.rules?.enableVoting);
  const upvoteCost = Number(rulesData?.rules?.costUpvote ?? 1);
  const downvoteCost = Number(rulesData?.rules?.costDownvote ?? 1);
  const displayedBalance = verified ? Number(bal.balance ?? 0) : 5;
  const canVote = Boolean(email.trim()) && verified;

  // Navigation Handlers
  const goToVerify = () => {
    sfx.playTap();
    window.location.href = `/request/${encodeURIComponent(location)}?verify=1`;
  };

  const goToBuy = (reason: string) => {
    sfx.playTap();
    setBuyReason(reason); // Correct use of the logic from your snippet
    window.location.href = `/request/${encodeURIComponent(location)}?buy=1&reason=${encodeURIComponent(reason)}`;
  };

  const handlePointsAction = () => {
    if (!verified || !identityId) {
      goToVerify();
      return;
    }

    goToBuy("boost");
  };

  async function doVote(requestId: string, dir: "up" | "down") {
    // ... (Your voting logic from before remains the same)
  }

  return (
    <PublicTheme>
       {/* ... JSX code ... */}
<PublicBottomCommandBar
  location={location}
  activeView="queue"
  points={displayedBalance}
  onPointsClick={handlePointsAction}
/>
    </PublicTheme>
  );
}