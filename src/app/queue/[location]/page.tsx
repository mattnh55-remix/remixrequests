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

function logoKey(location: string) {
  return `rr_admin_logoUrl:${location}`;
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
  return (
    <div className="rrBrandLogo" style={{ width: 54, height: 54 }}>
      {logoUrl ? (
        <img src={logoUrl} alt="Venue logo" />
      ) : (
        <div className="rrArtFallback" style={{ fontSize: 11 }}>REMIX</div>
      )}
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
        gridTemplateColumns: "36px 34px minmax(0,1fr) auto",
        gap: 8,
        padding: "8px",
        borderRadius: 14,
        background: emphasis
          ? "linear-gradient(90deg, rgba(28,41,62,0.96), rgba(15,23,37,0.98), rgba(62,28,56,0.94))"
          : "linear-gradient(180deg, rgba(17,26,40,0.92), rgba(8,14,24,0.98))",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          border: "1px solid rgba(125,156,206,0.14)",
          display: "grid",
          placeItems: "center",
          color: "#dbe5fb",
          fontWeight: 1000,
          fontSize: 14,
          background: "rgba(255,255,255,0.03)",
          flexShrink: 0,
        }}
      >
        {rank}
      </div>

      <TinyArt src={getArtwork(item)} alt={getTitle(item)} />

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", marginBottom: 4 }}>
          {isInterstitial ? <span className="rrTag rrTag--interstitial">Insert</span> : null}
          {isBoosted ? <span className="rrTag rrTag--boost">Boosted</span> : null}
          {item.requestId ? <span className="rrTag rrTag--request">Request</span> : null}
          {item.requestedByMe ? <span className="rrTag rrStatusPill--live rrTag">Yours</span> : null}
        </div>

        <div
          className="rrQueueTitle"
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: 14,
            lineHeight: 1.02,
          }}
        >
          {getTitle(item)}
        </div>
        <div
          className="rrQueueMeta"
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: 11,
          }}
        >
          {getArtist(item)}
        </div>
      </div>

      <span className="rrMetaPill" style={{ alignSelf: "center" }}>
        Score {score}
      </span>
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
  const [logoUrl, setLogoUrl] = useState<string>("");

  useEffect(() => {
    mountedRef.current = true;
    try {
      setIdentityId((localStorage.getItem("rr_identityId") || "").trim());
    } catch {}
    return () => {
      mountedRef.current = false;
    };
  }, []);

useEffect(() => {
  try {
    const v = localStorage.getItem(logoKey(location));
    if (v) setLogoUrl(v);
  } catch {}
}, [location]);

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

  const goToRequests = () => {
    window.location.href = `/request/${encodeURIComponent(location)}`;
  };

  return (
    <PublicTheme shellClassName="rrQueueShellV2">
      <style jsx global>{`
        .rrQueueShellV2 {
          width: min(560px, calc(100vw - 10px)) !important;
          padding-top: 10px !important;
          padding-bottom: 88px !important;
        }
        @media (max-width: 520px) {
          .rrQueueShellV2 {
            width: calc(100vw - 8px) !important;
            padding-top: 8px !important;
          }
        }
      `}</style>

      <div style={{ display: "grid", gap: 12 }}>
        <div className="rrPublicTopbar" style={{ gap: 10, alignItems: "start" }}>
          <div className="rrBrandLockup" style={{ alignItems: "start", gap: 10 }}>
            {logoUrl ? (
  <img
    src={logoUrl}
    alt="Logo"
    className="rrBrandLogo"
  />
) : (
  <div className="rrBrandBadge">REMIX</div>
)}

            <div className="rrHero" style={{ paddingTop: 0 }}>
              <div className="rrEyebrow">Live Queue & Voting</div>
              <h1 className="rrTitle" style={{ fontSize: "clamp(18px, 8.2vw, 30px)", lineHeight: 0.92 }}>
                Queue & Voting
              </h1>
              <div className="rrTitleSub" style={{ marginTop: 6 }}>
                {venueName} • Tap to vote • {sessionCountdown}
              </div>
            </div>
          </div>

          <div className="rrHudCard" style={{ minWidth: 112, padding: 10, borderRadius: 16 }}>
            <div className="rrHudLabel">Points</div>
            <div className="rrHudValue" style={{ fontSize: 22, marginBottom: 8 }}>
              {displayedBalance}
            </div>
            <button className="rrBtn" style={{ width: "100%", minHeight: 36, fontSize: 12 }} onClick={goToRequests}>
              Back to Requests
            </button>
          </div>
        </div>

        <div className="rrPanel" style={{ borderRadius: 18 }}>
          <div className="rrPanelHead" style={{ padding: "12px 14px 9px" }}>
            <div>
              <div className="rrPanelTitle">Current Session</div>
              <div className="rrPanelSub">Voting uses your live points balance.</div>
            </div>
            <span className="rrStatusPill rrStatusPill--live">{sessionCountdown}</span>
          </div>
          <div className="rrPanelBody" style={{ padding: "10px 14px 12px" }}>
            <div className="rrChipRow" style={{ marginBottom: 0, gap: 6 }}>
              <span className="rrMetaPill">Upvote {upvoteCost}pt</span>
              <span className="rrMetaPill">Downvote {downvoteCost}pt</span>
              <span className={`rrMetaPill ${votingOn ? "" : "rrStatusPill--warn"}`}>{votingOn ? "Voting On" : "Voting Off"}</span>
            </div>
          </div>
        </div>

        <div className="rrPanel" style={{ borderRadius: 18 }}>
          <div className="rrPanelHead" style={{ padding: "12px 14px 9px" }}>
            <div>
              <div className="rrPanelTitle">Play Now Lane</div>
              <div className="rrPanelSub">Highest priority requests.</div>
            </div>
            <span className="rrStatusPill">{playNow.length} items</span>
          </div>
          <div className="rrPanelBody" style={{ padding: "10px 14px 12px", display: "grid", gap: 8 }}>
            {loading ? (
              <div className="rrEmpty" style={{ padding: 12 }}>Loading queue…</div>
            ) : playNow.length ? (
              playNow.map((item, idx) => (
                <QueueRow key={String(item.id || item.requestId || idx)} item={item} rank={idx + 1} emphasis />
              ))
            ) : (
              <div className="rrEmpty" style={{ padding: 12 }}>No boosted requests right now.</div>
            )}
          </div>
        </div>

        <div className="rrPanel" style={{ borderRadius: 18 }}>
          <div className="rrPanelHead" style={{ padding: "12px 14px 9px" }}>
            <div>
              <div className="rrPanelTitle">Coming Up</div>
              <div className="rrPanelSub">The next songs in live order.</div>
            </div>
            <span className="rrStatusPill">{upNext.length} items</span>
          </div>
          <div className="rrPanelBody" style={{ padding: "10px 14px 12px", display: "grid", gap: 8 }}>
            {loading ? (
              <div className="rrEmpty" style={{ padding: 12 }}>Loading queue…</div>
            ) : upNext.length ? (
              upNext.map((item, idx) => (
                <QueueRow key={String(item.id || item.requestId || idx)} item={item} rank={idx + 1} />
              ))
            ) : (
              <div className="rrEmpty" style={{ padding: 12 }}>Nothing queued yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="rrFooterBar">
        <div className="rrFooterInner" style={{ width: "min(560px, calc(100vw - 10px))" }}>
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
