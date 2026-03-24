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
  if (logoUrl) {
    return (
      <div className="rrBrandLogo">
        <img src={logoUrl} alt="Venue logo" />
      </div>
    );
  }

  return <div className="rrBrandBadge">REMIX</div>;
}

function QueueRow({ item, rank, emphasis }: { item: QueueItem; rank: number; emphasis?: boolean }) {
  const sourceType = String(item.sourceType || "").toUpperCase();
  const isInterstitial = sourceType.includes("INTERSTITIAL");
  const isBoosted = Boolean(item.boosted || item.priority === "BOOSTED");
  const score = Number(item.score || 0);

  return (
    <div className={`rrQueueRow${emphasis ? " rrQueueRow--emphasis" : ""}`}>
      <div className="rrQueueRank">{rank}</div>
      <TinyArt src={getArtwork(item)} alt={getTitle(item)} />

      <div className="rrQueueCopy">
        <div className="rrQueueTagRow">
          {isInterstitial ? <span className="rrTag rrTag--interstitial">Insert</span> : null}
          {isBoosted ? <span className="rrTag rrTag--boost">Boosted</span> : null}
          {item.requestId ? <span className="rrTag rrTag--request">Request</span> : null}
          {item.requestedByMe ? <span className="rrTag rrStatusPill--live">Yours</span> : null}
        </div>

        <div className="rrQueueTitle">{getTitle(item)}</div>
        <div className="rrQueueMeta">{getArtist(item)}</div>
      </div>

      <span className="rrMetaPill rrQueueScore">Score {score}</span>
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

        if (sessionJson?.rules?.logoUrl) {
          setLogoUrl(sessionJson.rules.logoUrl);
          try {
            localStorage.setItem(logoKey(location), sessionJson.rules.logoUrl);
          } catch {}
        }
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
      <div style={{ display: "grid", gap: 12 }}>
        <div className="rrPublicTopbar rrTopbarCompact">
          <div className="rrBrandLockup rrBrandLockupCompact">
            <BrandLogo logoUrl={logoUrl || rulesData?.rules?.logoUrl || null} />

            <div className="rrHero">
              <div className="rrEyebrow">Live Queue & Voting</div>
              <h1 className="rrTitle">Queue & Voting</h1>
              <div className="rrTitleSub">{venueName} • Tap to vote • {sessionCountdown}</div>
            </div>
          </div>

          <div className="rrHudCard rrHudCardCompact">
            <div className="rrHudLabel">Points</div>
            <div className="rrHudValue rrHudValueCompact">{displayedBalance}</div>
            <button className="rrBtn rrBtnFull" onClick={goToRequests}>
              Back to Requests
            </button>
          </div>
        </div>

        <div className="rrPanel rrSectionCompact rrSectionTight">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Current Session</div>
              <div className="rrPanelSub">Voting uses your live points balance.</div>
            </div>
            <span className="rrStatusPill rrStatusPill--live">{sessionCountdown}</span>
          </div>
          <div className="rrPanelBody">
            <div className="rrChipRow" style={{ marginBottom: 0, gap: 6 }}>
              <span className="rrMetaPill">Upvote {upvoteCost}pt</span>
              <span className="rrMetaPill">Downvote {downvoteCost}pt</span>
              <span className={`rrMetaPill ${votingOn ? "" : "rrStatusPill--warn"}`}>
                {votingOn ? "Voting On" : "Voting Off"}
              </span>
            </div>
          </div>
        </div>

        <div className="rrPanel rrSectionCompact rrSectionTight">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Play Now Lane</div>
              <div className="rrPanelSub">Highest priority requests.</div>
            </div>
            <span className="rrStatusPill">{playNow.length} items</span>
          </div>
          <div className="rrPanelBody" style={{ display: "grid", gap: 8 }}>
            {loading ? (
              <div className="rrEmpty">Loading queue…</div>
            ) : playNow.length ? (
              playNow.map((item, idx) => (
                <QueueRow key={String(item.id || item.requestId || idx)} item={item} rank={idx + 1} emphasis />
              ))
            ) : (
              <div className="rrEmpty">No boosted requests right now.</div>
            )}
          </div>
        </div>

        <div className="rrPanel rrSectionCompact rrSectionTight">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Coming Up</div>
              <div className="rrPanelSub">The next songs in live order.</div>
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
