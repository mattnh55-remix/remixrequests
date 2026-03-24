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

function QueueRow({ item, rank, emphasis }: { item: QueueItem; rank: number; emphasis?: boolean }) {
  const sourceType = String(item.sourceType || "").toUpperCase();
  const isInterstitial = sourceType.includes("INTERSTITIAL");
  const isBoosted = Boolean(item.boosted || item.priority === "BOOSTED");
  const score = Number(item.score || 0);

  return (
    <div
      className="rrQueueRow"
      style={{
        display: "grid",
        gridTemplateColumns: "34px 56px minmax(0,1fr) auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 14px",
        borderRadius: 18,
        border: "1px solid rgba(125, 156, 206, 0.14)",
        background: emphasis
          ? "linear-gradient(90deg, rgba(33,47,70,0.92), rgba(22,30,45,0.96), rgba(67,28,59,0.92))"
          : "linear-gradient(180deg, rgba(21,29,43,0.88), rgba(10,16,27,0.94))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "1px solid rgba(125,156,206,0.18)",
          display: "grid",
          placeItems: "center",
          color: "var(--rr-text-soft)",
          fontWeight: 1000,
          fontSize: 13,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        {rank}
      </div>

      <TinyArt src={getArtwork(item)} alt={getTitle(item)} />

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 4 }}>
          {isInterstitial ? <span className="rrTag rrTagRed">INTERSTITIAL</span> : null}
          {isBoosted ? <span className="rrTag rrTagRed">BOOSTED</span> : null}
          {item.requestId ? <span className="rrTag">REQUEST</span> : null}
          {item.requestedByMe ? <span className="rrTag rrTagBlue">YOURS</span> : null}
        </div>
        <div
          style={{
            fontWeight: 1000,
            fontSize: 20,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {getTitle(item)}
        </div>
        <div
          style={{
            marginTop: 4,
            color: "var(--rr-text-soft)",
            fontSize: 13,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {getArtist(item)}
        </div>
      </div>

      <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
        <span className="rrMetaPill">Score {score}</span>
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

  return (
    <PublicTheme>
      <div style={{ display: "grid", gap: 16 }}>
        <div className="rrPublicTopbar">
          <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
            <div className="rrBrandBadge">REMIX</div>
            <div className="rrHero" style={{ textAlign: "left", paddingTop: 0 }}>
              <div className="rrEyebrow">Live Queue & Voting</div>
              <h1 className="rrTitle" style={{ fontSize: "clamp(34px, 6vw, 64px)" }}>
                Queue & Voting
              </h1>
              <div className="rrTitleSub">
                {venueName} • Tap to vote • {sessionCountdown}
              </div>
            </div>
          </div>

          <div className="rrHudCard">
            <div className="rrHudLabel">Points</div>
            <div className="rrHudValue">{displayedBalance}</div>
            <button
              className="rrBtn"
              style={{ width: "100%" }}
              onClick={() => {
                window.location.href = `/request/${encodeURIComponent(location)}`;
              }}
            >
              Back to Requests
            </button>
          </div>
        </div>

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Current Session</div>
              <div className="rrPanelSub">Voting uses your live points balance.</div>
            </div>
            <span className="rrStatusPill">{sessionCountdown}</span>
          </div>
          <div className="rrPanelBody">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="rrMetaPill">Upvote {upvoteCost}pt</span>
              <span className="rrMetaPill">Downvote {downvoteCost}pt</span>
              <span className="rrMetaPill">{votingOn ? "Voting On" : "Voting Off"}</span>
              {!identityId ? <span className="rrTag rrTagBlue">Verify on Requests to unlock points</span> : null}
            </div>
          </div>
        </div>

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Play Now Lane</div>
              <div className="rrPanelSub">Highest priority requests.</div>
            </div>
            <span className="rrStatusPill">{playNow.length} item{playNow.length === 1 ? "" : "s"}</span>
          </div>
          <div className="rrPanelBody" style={{ display: "grid", gap: 10 }}>
            {loading ? (
              <div className="rrEmptyState">Loading queue…</div>
            ) : playNow.length ? (
              playNow.map((item, idx) => (
                <QueueRow key={String(item.id || item.requestId || idx)} item={item} rank={idx + 1} emphasis />
              ))
            ) : (
              <div className="rrEmptyState">No boosted requests right now.</div>
            )}
          </div>
        </div>

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Coming Up</div>
              <div className="rrPanelSub">The next songs in live order.</div>
            </div>
            <span className="rrStatusPill">{upNext.length} item{upNext.length === 1 ? "" : "s"}</span>
          </div>
          <div className="rrPanelBody" style={{ display: "grid", gap: 10 }}>
            {loading ? (
              <div className="rrEmptyState">Loading queue…</div>
            ) : upNext.length ? (
              upNext.map((item, idx) => (
                <QueueRow key={String(item.id || item.requestId || idx)} item={item} rank={idx + 1} />
              ))
            ) : (
              <div className="rrEmptyState">Nothing queued yet.</div>
            )}
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            bottom: 12,
            zIndex: 15,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 10,
          }}
        >
          <button
            className="rrBtn"
            onClick={() => {
              window.location.href = `/request/${encodeURIComponent(location)}`;
            }}
          >
            Back to Requests
          </button>
          <button
            className="rrBtnGhost"
            onClick={() => {
              window.location.href = `/request/${encodeURIComponent(location)}`;
            }}
          >
            Get Points
          </button>
        </div>
      </div>
    </PublicTheme>
  );
}
