"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnimatedBalance } from "../../../../components/ui/neon/useAnimatedBalance";
import PublicTheme from "../../../components/ui/public/PublicTheme";

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
  session?: { id?: string; endsAt?: string };
  rules?: {
    enableVoting?: boolean;
    costUpvote?: number;
    costDownvote?: number;
    logoUrl?: string | null;
  };
};

type BalanceRes = {
  ok?: boolean;
  balance?: number;
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

function getCountdownLabel(endsAtIso?: string | null) {
  if (!endsAtIso) return "Session live";
  const endsAt = new Date(endsAtIso).getTime();
  const diff = endsAt - Date.now();
  if (!Number.isFinite(diff)) return "Session live";
  if (diff <= 0) return "Ending soon";

  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`;
}

function TinyArt({ src, alt }: { src?: string; alt?: string }) {
  const [bad, setBad] = useState(false);
  const real = (src || "").trim();

  if (!real || bad) {
    return (
      <div className="rrArt">
        <div className="rrArtFallback">RMX</div>
      </div>
    );
  }

  return (
    <div className="rrArt">
      <img
        src={real}
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

      <TinyArt src={getArtwork(item)} alt={getTitle(item)} />

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
  const [rulesData, setRulesData] = useState<SessionRes | null>(null);
  const [queueData, setQueueData] = useState<QueueRes>({ playNow: [], upNext: [] });
  const [loading, setLoading] = useState(true);
  const [sessionCountdown, setSessionCountdown] = useState("Session live");
  const [identityId, setIdentityId] = useState("");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [msg, setMsg] = useState("");
  const [busyVoteId, setBusyVoteId] = useState("");
  const mountedRef = useRef(true);
  const sfx = useGunmetalSfx();

  useEffect(() => {
    mountedRef.current = true;
    try {
      const nextIdentityId = (localStorage.getItem("rr_identityId") || "").trim();
      const nextLocation = (localStorage.getItem("rr_location") || "").trim();
      const nextEmail = (localStorage.getItem("rr_email") || "").trim();

      if (nextLocation && nextLocation !== location) {
        setIdentityId("");
        setVerified(false);
      } else if (nextIdentityId) {
        setIdentityId(nextIdentityId);
        setVerified(true);
      }

      if (nextEmail) setEmail(nextEmail);
    } catch {}

    return () => {
      mountedRef.current = false;
    };
  }, [location]);

  useEffect(() => {
    const readIdentity = () => {
      try {
        const nextIdentity = (localStorage.getItem("rr_identityId") || "").trim();
        const nextEmail = (localStorage.getItem("rr_email") || "").trim();
        setIdentityId(nextIdentity);
        setVerified(Boolean(nextIdentity));
        if (nextEmail) setEmail(nextEmail);
      } catch {}
    };

    readIdentity();
    window.addEventListener("storage", readIdentity);
    return () => window.removeEventListener("storage", readIdentity);
  }, []);

  useEffect(() => {
    try {
      const trimmed = email.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        localStorage.setItem("rr_email", trimmed);
      }
    } catch {}
  }, [email]);

  async function fetchBalanceNumber(nextIdentityId?: string): Promise<number> {
    const id = (nextIdentityId ?? identityId ?? "").trim();
    if (!id) return 0;

    const res = await fetch(
      `/api/public/balance?location=${encodeURIComponent(location)}&identityId=${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as BalanceRes;
    if (!data.ok) throw new Error(data.error || "Balance fetch failed");
    return Number(data.balance ?? 0);
  }

  const bal = useAnimatedBalance(() => fetchBalanceNumber(), {
    enabled: Boolean(identityId),
    softPollMs: 2200,
    intervalMs: 650,
    storageKey: `rr_lastBalance:${location}:${identityId || "anon"}`,
  });

  async function loadQueueAndSession() {
    setLoading(true);
    try {
      const [sessionRes, queueRes] = await Promise.all([
        fetch(`/api/public/session/${location}`, { cache: "no-store" }),
        fetch(`/api/public/queue/${location}`, { cache: "no-store" }),
      ]);

      const sessionJson = (await sessionRes.json()) as SessionRes;
      const queueJson = (await queueRes.json()) as QueueRes;

      if (!mountedRef.current) return;

      setRulesData(sessionJson);
      setQueueData({
        playNow: Array.isArray(queueJson?.playNow) ? queueJson.playNow : [],
        upNext: Array.isArray(queueJson?.upNext) ? queueJson.upNext : [],
      });
    } catch {
      if (!mountedRef.current) return;
      setRulesData(null);
      setQueueData({ playNow: [], upNext: [] });
      setMsg("Could not load queue.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueueAndSession();
  }, [location]);

  useEffect(() => {
    const queueId = window.setInterval(() => {
      void loadQueueAndSession();
    }, 4500);
    return () => window.clearInterval(queueId);
  }, [location]);

  useEffect(() => {
    const tick = () => {
      setSessionCountdown(getCountdownLabel(rulesData?.session?.endsAt));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [rulesData?.session?.endsAt]);

  useEffect(() => {
    if (identityId) {
      void bal.refreshOnce();
    }
  }, [identityId]);

  const playNow = useMemo(() => queueData.playNow || [], [queueData.playNow]);
  const upNext = useMemo(() => queueData.upNext || [], [queueData.upNext]);
  const venueName = String(rulesData?.location?.name || "Remix Skate & Event Center");
  const votingOn = Boolean(rulesData?.rules?.enableVoting);
  const upvoteCost = Number(rulesData?.rules?.costUpvote ?? 1);
  const downvoteCost = Number(rulesData?.rules?.costDownvote ?? 1);
  const displayedBalance = identityId ? Number(bal.balance ?? 0) : 5;
  const logoUrl = rulesData?.rules?.logoUrl || REMIX_LOGO_URL;
  const canVote = Boolean(email.trim()) && (verified || Boolean(identityId));

  const goToRequests = () => {
    sfx.playTap();
    window.location.href = `/request/${encodeURIComponent(location)}`;
  };

  const goToVerify = () => {
    sfx.playTap();
    window.location.href = `/request/${encodeURIComponent(location)}?verify=1`;
  };

  const goToBuy = (reason: string) => {
    sfx.playTap();
    window.location.href = `/request/${encodeURIComponent(location)}?buy=1&reason=${encodeURIComponent(reason)}`;
  };

  const saveEmail = () => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      sfx.playError();
      setMsg("Please enter a valid email.");
      return;
    }

    try {
      localStorage.setItem("rr_email", trimmed);
    } catch {}
    sfx.playSuccess();
    setMsg("Email saved. Voting is ready on this device once verified.");
  };

  async function doVote(requestId: string, dir: "up" | "down") {
    const needed = dir === "up" ? upvoteCost : downvoteCost;
    setMsg("");

    if (!email.trim()) {
      sfx.playError();
      setMsg("Enter your email to unlock voting.");
      return;
    }

    if (!verified && !identityId) {
      sfx.playError();
      goToVerify();
      return;
    }

    if (!votingOn) {
      sfx.playError();
      setMsg("Voting is disabled right now.");
      return;
    }

    if ((bal.balance ?? 0) < needed) {
      sfx.playError();
      goToBuy("notEnough");
      return;
    }

    sfx.playTap();
    setBusyVoteId(requestId);

    try {
      const res = await fetch(`/api/public/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, requestId, vote: dir, email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        sfx.playError();
        setMsg(data?.error || "Vote failed.");
        await bal.refreshOnce();
        return;
      }

      sfx.playSuccess();
      await Promise.all([loadQueueAndSession(), bal.refreshOnce()]);
    } catch {
      sfx.playError();
      setMsg("Vote failed.");
    } finally {
      if (mountedRef.current) setBusyVoteId("");
    }
  }

  return (
    <PublicTheme>
      <div className="rrHeroGrid">
        <div className="rrLogoCard">
          <BrandLogo logoUrl={logoUrl} />
        </div>

        <div className="rrHeroCard">
          <div className="rrHeroKicker">RemixRequests • Live Queue</div>
          <div className="rrHeroLabel">Remix Playlist</div>
          <h1 className="rrTitle">Queue & Voting</h1>
          <div className="rrTitleSub">
            {venueName} • Live order updates every few seconds so guests can track what is moving and spend points right here.
          </div>
          <div className="rrHeroInlineRow">
            <span className="rrStatusPill rrStatusPill--live">{sessionCountdown}</span>
            <span className="rrMetaPill">{playNow.length} play now</span>
            <span className="rrMetaPill">{upNext.length} coming up</span>
          </div>
        </div>

        <div className="rrPointsCard">
          <div className="rrHudLabel">Points</div>
          <div className="rrHudValue">{displayedBalance}</div>
          <div className="rrPointsActions">
            <button className="rrBtn" style={{ width: "100%" }} onClick={() => goToBuy("boost")}>
              {identityId ? "Add Points" : "Use Points"}
            </button>
            <button
              className="rrBtnGhost rrMuteBtn"
              style={{ width: "100%" }}
              onClick={() => sfx.setMuted(!sfx.muted)}
            >
              {sfx.muted ? "Sound Off" : "Sound On"}
            </button>
          </div>
        </div>
      </div>

      {(verified || identityId) && !email.trim() ? (
        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Finish Setup</div>
              <div className="rrPanelSub">Enter your email to unlock voting on this device.</div>
            </div>
            <span className="rrStatusPill rrStatusPill--warn">Email Needed</span>
          </div>
          <div className="rrPanelBody">
            <div className="rrInlineForm">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="rrInput"
                autoComplete="email"
                onFocus={() => sfx.playTap()}
              />
              <button className="rrBtn" onClick={saveEmail}>
                Save Email
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {msg ? <div className="rrMessage">{msg}</div> : null}

      {!canVote ? (
        <div className="rrNoticeCard">
          <div className="rrNoticeTitle">Voting Access</div>
          <div className="rrNoticeText">
            Save your email, then verify or buy points from Requests to unlock voting on this device.
          </div>
          <div className="rrNoticeActions">
            <button className="rrBtnGhost" onClick={goToVerify}>Verify Device</button>
            <button className="rrBtn" onClick={() => goToBuy("vote")}>Get Points</button>
          </div>
        </div>
      ) : null}

      <div className="rrNoticeCard">
        <div className="rrNoticeTitle">How to use this board</div>
        <div className="rrNoticeText">
          Tap thumbs up or thumbs down beside songs in the live queue. Boosted songs and the play now lane stay closest to the front.
        </div>
      </div>

      <div className="rrSectionStack">
        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Play Now Lane</div>
              <div className="rrPanelSub">Highest-priority requests and anything pushed toward the front.</div>
            </div>
            <span className="rrStatusPill rrStatusPill--live">{playNow.length} items</span>
          </div>
          <div className="rrPanelBody rrPanelBodyGrid">
            {loading ? (
              <div className="rrEmpty">Loading queue…</div>
            ) : playNow.length ? (
              playNow.map((item, idx) => (
                <QueueRow
                  key={String(item.id || item.requestId || idx)}
                  item={item}
                  rank={idx + 1}
                  emphasis
                  laneLabel={idx === 0 ? "live lane" : undefined}
                  enableVoting={votingOn}
                  canVote={canVote}
                  costUpvote={upvoteCost}
                  costDownvote={downvoteCost}
                  busyVoteId={busyVoteId}
                  onVote={doVote}
                />
              ))
            ) : (
              <div className="rrEmpty">No boosted requests right now.</div>
            )}
          </div>
        </div>

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Coming Up</div>
              <div className="rrPanelSub">Next in live order after the play now lane.</div>
            </div>
            <span className="rrStatusPill">{upNext.length} items</span>
          </div>
          <div className="rrPanelBody rrPanelBodyGrid">
            {loading ? (
              <div className="rrEmpty">Loading queue…</div>
            ) : upNext.length ? (
              upNext.map((item, idx) => (
                <QueueRow
                  key={String(item.id || item.requestId || idx)}
                  item={item}
                  rank={idx + 1}
                  enableVoting={votingOn}
                  canVote={canVote}
                  costUpvote={upvoteCost}
                  costDownvote={downvoteCost}
                  busyVoteId={busyVoteId}
                  onVote={doVote}
                />
              ))
            ) : (
              <div className="rrEmpty">Nothing queued yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="rrFooterBar">
        <div className="rrFooterInner">
          <button className="rrBtn rrFooterCta" onClick={goToRequests}>
            Back to Requests
          </button>
          <button className="rrBtnGhost" onClick={() => goToBuy("vote")}>
            Get Points
          </button>
        </div>
      </div>
    </PublicTheme>
  );
}
