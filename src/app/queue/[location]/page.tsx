"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnimatedBalance } from "../../../../components/ui/neon/useAnimatedBalance";
import PublicTheme from "../../../components/ui/public/PublicTheme";

type QueueItem = {
  id?: string;
  requestId?: string;
  songId?: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
  score?: number;
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
        <div className="rrArtFallback">REMIX</div>
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
  if (logoUrl) {
    return (
      <div className="rrBrandLogo">
        <img src={logoUrl} alt="Venue logo" />
      </div>
    );
  }

  return <div className="rrBrandBadge">REMIX</div>;
}

function QueueRow({
  item,
  rank,
  emphasis,
  laneLabel,
}: {
  item: QueueItem;
  rank: number;
  emphasis?: boolean;
  laneLabel?: string;
}) {
  const sourceType = String(item.sourceType || "").toUpperCase();
  const isInterstitial = sourceType.includes("INTERSTITIAL");
  const isBoosted = Boolean(item.boosted || item.priority === "BOOSTED");
  const score = Number(item.score || 0);

  return (
    <div className={`rrQueueRow ${emphasis ? "rrQueueRow--emphasis" : ""}`}>
      <div className="rrQueueRank">{rank}</div>

      <TinyArt src={getArtwork(item)} alt={getTitle(item)} />

      <div className="rrQueueCopy">
        <div className="rrQueueTagRow">
          {laneLabel ? <span className="rrStatusPill rrStatusPill--live">{laneLabel}</span> : null}
          {isInterstitial ? <span className="rrTag rrTag--interstitial">Auto Insert</span> : null}
          {isBoosted ? <span className="rrTag rrTag--boost">Boosted</span> : null}
          {item.requestId ? <span className="rrTag rrTag--request">Request</span> : null}
          {item.requestedByMe ? <span className="rrStatusPill rrStatusPill--live">Yours</span> : null}
        </div>

        <div className="rrQueueTitle">{getTitle(item)}</div>
        <div className="rrQueueMeta">{getArtist(item)}</div>
      </div>

      <div className="rrQueueRight">
        <span className="rrMetaPill rrQueueScore">Score {score}</span>
        {isBoosted ? <div className="rrQueueNote">priority</div> : null}
      </div>
    </div>
  );
}

export default function QueuePage({ params }: { params: { location: string } }) {
  const location = decodeURIComponent(params.location);
  const [rulesData, setRulesData] = useState<SessionRes | null>(null);
  const [queueData, setQueueData] = useState<QueueRes>({ playNow: [], upNext: [] });
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [sessionCountdown, setSessionCountdown] = useState("Session live");
  const [identityId, setIdentityId] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    try {
      setIdentityId((localStorage.getItem("rr_identityId") || "").trim());
    } catch {}
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    softPollMs: 2600,
    intervalMs: 650,
    storageKey: `rr_lastBalance:${location}:${identityId || "anon"}`,
  });

  useEffect(() => {
    const readIdentity = () => {
      try {
        const next = (localStorage.getItem("rr_identityId") || "").trim();
        setIdentityId(next);
      } catch {}
    };
    readIdentity();
    window.addEventListener("storage", readIdentity);
    return () => window.removeEventListener("storage", readIdentity);
  }, []);

  useEffect(() => {
    async function load() {
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
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    void load();
  }, [location, refreshTick]);

  useEffect(() => {
    const id = window.setInterval(() => setRefreshTick((n) => n + 1), 8000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = () => {
      setSessionCountdown(getCountdownLabel(rulesData?.session?.endsAt));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [rulesData?.session?.endsAt]);

  const playNow = useMemo(() => queueData.playNow || [], [queueData.playNow]);
  const upNext = useMemo(() => queueData.upNext || [], [queueData.upNext]);
  const venueName = String(rulesData?.location?.name || "Remix Skate & Event Center");
  const votingOn = Boolean(rulesData?.rules?.enableVoting);
  const upvoteCost = Number(rulesData?.rules?.costUpvote ?? 1);
  const downvoteCost = Number(rulesData?.rules?.costDownvote ?? 1);
  const displayedBalance = identityId ? Number(bal.balance ?? 0) : 0;
  const logoUrl = rulesData?.rules?.logoUrl || null;
  const totalVisible = playNow.length + upNext.length;

  const goToRequests = () => {
    window.location.href = `/request/${encodeURIComponent(location)}`;
  };

  return (
    <PublicTheme>
      <div className="rrPublicTopbar">
        <div className="rrBrandLockup">
          <BrandLogo logoUrl={logoUrl} />

          <div className="rrHero">
            <div className="rrEyebrow">RemixRequests • Live Queue</div>
            <h1 className="rrTitle">Queue & Voting</h1>
            <div className="rrTitleSub">
              {venueName} • Live order updates every few seconds so guests can track what is moving up.
            </div>
            <div className="rrHeroInlineRow">
              <span className="rrStatusPill rrStatusPill--live">{sessionCountdown}</span>
              <span className="rrMetaPill">{playNow.length} play now</span>
              <span className="rrMetaPill">{upNext.length} coming up</span>
            </div>
          </div>
        </div>

        <div className="rrHudCard">
          <div className="rrHudLabel">Your Points</div>
          <div className="rrHudValue">{displayedBalance}</div>
          <button className="rrBtn" style={{ width: "100%" }} onClick={goToRequests}>
            Back to Requests
          </button>
        </div>
      </div>

      <div className="rrSectionIntro">
        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Current Session</div>
              <div className="rrPanelSub">Built to feel like the booth UI, but tuned for customers on mobile.</div>
            </div>
            <span className={`rrStatusPill ${votingOn ? "rrStatusPill--live" : "rrStatusPill--warn"}`}>
              {votingOn ? "Voting Live" : "Voting Paused"}
            </span>
          </div>
          <div className="rrPanelBody">
            <div className="rrChipRow" style={{ marginBottom: 0 }}>
              <span className="rrMetaPill">Upvote {upvoteCost}pt</span>
              <span className="rrMetaPill">Downvote {downvoteCost}pt</span>
              <span className="rrMetaPill">Auto refresh 8s</span>
              <span className="rrMetaPill">Live order</span>
            </div>
          </div>
        </div>

        <div className="rrNoticeCard">
          <div className="rrNoticeTitle">How to use this board</div>
          <div className="rrNoticeText">
            Watch the play now lane for boosted songs near the front, then jump back to Requests when you want to spend points on votes or submit another track.
          </div>
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
          <div className="rrPanelBody" style={{ display: "grid", gap: 8 }}>
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
          <div className="rrPanelBody" style={{ display: "grid", gap: 8 }}>
            {loading ? (
              <div className="rrEmpty">Loading queue…</div>
            ) : upNext.length ? (
              upNext.map((item, idx) => (
                <QueueRow key={String(item.id || item.requestId || idx)} item={item} rank={idx + 1} />
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
          <button className="rrBtnGhost" onClick={goToRequests}>
            Get Points
          </button>
        </div>
      </div>
    </PublicTheme>
  );
}