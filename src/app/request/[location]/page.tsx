// src/app/request/[location]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedBalanceCounter from "../../../../components/ui/neon/AnimatedBalanceCounter";
import { useAnimatedBalance } from "../../../../components/ui/neon/useAnimatedBalance";

const RAILS = [
  "All Ages", "Adult Night", "TikTok", "DISCO", "80s", "90s", "2000s", "Boy Bands", "Pop Hits", "Mom’s Hits", "Dad Rock"
];

type Song = { id: string; title: string; artist: string; artworkUrl?: string; explicit: boolean; tags: string[] };

type UiPack = {
  id: string;
  title: string;
  subtitle: string;
  creditsLabel: string;
  priceCents?: number;
  packageKey?: "5_10" | "10_25" | "15_35" | "20_50";
  highlight?: boolean;
  badge?: string;
  cta?: string;
  href?: string;
};

type FlyAnim = {
  key: number;
  src?: string;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
};

const BUY_URL_BY_LOCATION: Record<string, string> = {
  // remixrequests: "https://your-checkout-link",
};

type BalanceRes = { ok: boolean; balance?: number; error?: string };

export default function RequestPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string>("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [rules, setRules] = useState<any>(null);
  const [msg, setMsg] = useState<string>("");
  const [queuePreview, setQueuePreview] = useState<{ playNow: any[]; upNext: any[] }>({ playNow: [], upNext: [] });

  const [verified, setVerified] = useState(false);
  const [identityId, setIdentityId] = useState<string>("");
  const [showVerify, setShowVerify] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [buyReason, setBuyReason] = useState<"none" | "out" | "notEnough" | "boost">("none");
  const [sessionCountdown, setSessionCountdown] = useState<string>("");

  const [successTileId, setSuccessTileId] = useState<string | null>(null);
  const [queuePulseOn, setQueuePulseOn] = useState(false);
  const [flyAnim, setFlyAnim] = useState<FlyAnim | null>(null);

  const queueTargetRef = useRef<HTMLDivElement | null>(null);
  const queueButtonRef = useRef<HTMLButtonElement | null>(null);
  const flyTimerRef = useRef<number | null>(null);
  const tileSuccessTimerRef = useRef<number | null>(null);
  const queuePulseTimerRef = useRef<number | null>(null);
  const flyKeyRef = useRef(0);

  const sfx = useNeonSfx();

  useEffect(() => {
    return () => {
      if (flyTimerRef.current != null) window.clearTimeout(flyTimerRef.current);
      if (tileSuccessTimerRef.current != null) window.clearTimeout(tileSuccessTimerRef.current);
      if (queuePulseTimerRef.current != null) window.clearTimeout(queuePulseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const e = email.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        localStorage.setItem("rr_email", e);
      }
    } catch {}
  }, [email]);

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${location}`, { cache: "no-store" });
      const data = await res.json();
      setRules(data);
    } catch {}
  }

  async function refreshQueuePreview() {
    try {
      const res = await fetch(`/api/public/queue/${location}`, { cache: "no-store" });
      const data = await res.json();
      setQueuePreview({
        playNow: Array.isArray(data?.playNow) ? data.playNow : [],
        upNext: Array.isArray(data?.upNext) ? data.upNext : [],
      });
    } catch {}
  }

  async function loadSongs() {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (tag) qs.set("tag", tag);
    const res = await fetch(`/api/public/songs/${location}?${qs.toString()}`);
    const data = await res.json();
    setSongs(data.items || []);
  }

  async function fetchBalanceNumber(nextIdentityId?: string): Promise<number> {
    const id = (nextIdentityId ?? identityId ?? "").trim();
    if (!id) throw new Error("Missing identityId");

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
    if (!identityId) return;
    const t = window.setTimeout(() => {
      bal.refreshOnce();
    }, 900);
    return () => window.clearTimeout(t);
  }, [identityId, location]);

  useEffect(() => { refreshSession(); }, [location]);
  useEffect(() => { loadSongs(); }, [search, tag]);

  useEffect(() => {
    const id = setInterval(() => refreshSession(), 12000);
    return () => clearInterval(id);
  }, [location]);

  useEffect(() => {
    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();
      const lsEmail = (localStorage.getItem("rr_email") || "").trim();
      if (lsIdentity) {
        setIdentityId(lsIdentity);
        setVerified(true);
        if (lsEmail) setEmail(lsEmail);
        bal.refreshOnce();
      }
      if (location && lsLocation !== location) {
        localStorage.setItem("rr_location", String(location));
      }
    } catch {}
  }, [location]);

  useEffect(() => {
    const tick = () => {
      const endsAt = rules?.session?.endsAt;
      if (!endsAt) {
        setSessionCountdown("");
        return;
      }
      const endMs = new Date(endsAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, endMs - now);
      if (diff <= 0) {
        setSessionCountdown("Session ended");
        return;
      }
      const totalMin = Math.floor(diff / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      if (h <= 0 && m <= 2) setSessionCountdown("Ending soon");
      else if (h <= 0) setSessionCountdown(`Ends in ${m}m`);
      else setSessionCountdown(`Ends in ${h}h ${m}m`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [rules?.session?.endsAt]);

  useEffect(() => {
    refreshQueuePreview();
    const id = window.setInterval(refreshQueuePreview, 12000);
    return () => window.clearInterval(id);
  }, [location]);

  function openBuy(reason: typeof buyReason) {
    setBuyReason(reason);
    setShowBuy(true);
    sfx.playTap();
  }

  function handleCornerHudAction() {
    sfx.playTap();
    if (!verified && !identityId) {
      setShowVerify(true);
      return;
    }
    openBuy("boost");
  }

  async function redeem(codeInput?: string) {
    const code = String(codeInput ?? redeemCode ?? "").trim();
    if (!code) {
      sfx.playError();
      setMsg("Enter a redemption code.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      sfx.playError();
      setMsg("Enter a valid email first.");
      return;
    }
    if (!verified && !identityId) {
      sfx.playError();
      setMsg("Please verify to redeem a code.");
      setShowVerify(true);
      return;
    }

    setRedeemBusy(true);
    try {
      const res = await fetch(`/api/public/redeem/${location}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!data.ok) {
        sfx.playError();
        setMsg(data.error || "Could not redeem code.");
        return;
      }

      sfx.playSuccess();
      setMsg(`✅ Redeemed +${data.pointsAdded ?? ""} points!`);
      setRedeemCode("");
      const nextBalance = data?.balance ?? null;
      if (typeof nextBalance === "number") bal.applyBalance(nextBalance);
      else bal.refreshOnce();
    } catch {
      sfx.playError();
      setMsg("Could not redeem code.");
    } finally {
      setRedeemBusy(false);
    }
  }

  async function startCheckout(packageKey: "5_10" | "10_25" | "15_35" | "20_50") {
    if (!identityId) {
      sfx.playError();
      setMsg("Please verify before buying points.");
      setShowVerify(true);
      return;
    }

    try {
      const res = await fetch("/api/square/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, identityId, packageKey }),
      });

      const data = await res.json();

      if (!data?.ok || !data?.checkoutUrl) {
        sfx.playError();
        setMsg(data?.error || "Could not start checkout.");
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      sfx.playError();
      setMsg("Could not start checkout.");
    }
  }

  function triggerSuccessVisuals(song: Song, sourceEl?: HTMLElement | null) {
    setSuccessTileId(song.id);
    if (tileSuccessTimerRef.current != null) window.clearTimeout(tileSuccessTimerRef.current);
    tileSuccessTimerRef.current = window.setTimeout(() => setSuccessTileId(null), 650);

    setQueuePulseOn(true);
    if (queuePulseTimerRef.current != null) window.clearTimeout(queuePulseTimerRef.current);
    queuePulseTimerRef.current = window.setTimeout(() => setQueuePulseOn(false), 800);

    if (!sourceEl) return;

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetEl = queueButtonRef.current || queueTargetRef.current;
    const targetRect = targetEl?.getBoundingClientRect();

    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth - 84;
    const endY = targetRect ? targetRect.top + targetRect.height / 2 : 150;

    flyKeyRef.current += 1;
    setFlyAnim({
      key: flyKeyRef.current,
      src: song.artworkUrl,
      startX,
      startY,
      deltaX: endX - startX,
      deltaY: endY - startY,
    });

    if (flyTimerRef.current != null) window.clearTimeout(flyTimerRef.current);
    flyTimerRef.current = window.setTimeout(() => setFlyAnim(null), 900);
  }

  async function submit(song: Song, action: "play_next" | "play_now", sourceEl?: HTMLElement | null) {
    if (!verified && !identityId) {
      sfx.playError();
      setMsg("Please verify to unlock points.");
      setShowVerify(true);
      return false;
    }

    const costRequest = rules?.rules?.costRequest ?? 1;
    const costPlayNow = rules?.rules?.costPlayNow ?? 5;
    const required = action === "play_now" ? costPlayNow : costRequest;

    if (typeof bal.balance === "number" && bal.balance < required) {
      sfx.playError();
      setMsg(required === costPlayNow ? "Not enough points for request" : "Not enough points to request.");
      openBuy(required === costPlayNow ? "boost" : "notEnough");
      return false;
    }

    setMsg("");
    const res = await fetch(`/api/public/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ location, email, songId: song.id, action }),
    });

    const data = await res.json();

    if (!data.ok) {
      sfx.playError();
      setMsg(data.error || "Something went wrong.");
      return false;
    }

    sfx.playSuccess();
    setMsg(action === "play_now" ? "✅ Play Now request added!" : "✅ Request added!");

    const nextBalance = data?.balance ?? data?.credits?.balance ?? data?.session?.balance ?? null;
    if (typeof nextBalance === "number") bal.applyBalance(nextBalance);
    else bal.refreshOnce();

    triggerSuccessVisuals(song, sourceEl);
    window.setTimeout(() => refreshQueuePreview(), 120);

    return true;
  }

  const trending = useMemo(() => {
    const hot = songs.filter((s) => (s.tags || []).some((t) => ["TikTok", "DISCO", "Pop Hits"].includes(t)));
    return (hot.length ? hot : songs).slice(0, 10);
  }, [songs]);

  const trendingIds = useMemo(() => new Set(trending.map((t) => t.id)), [trending]);
  const locationName = rules?.location?.name || location;
  const costRequest = rules?.rules?.costRequest ?? 1;

  const buyUrl = useMemo(() => {
    const qp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const fromQuery = qp?.get("buy");
    if (fromQuery) return fromQuery;
    const fromMap = BUY_URL_BY_LOCATION[location];
    if (fromMap) return fromMap;
    const fromEnv = process.env.NEXT_PUBLIC_REMIXREQUESTS_BUY_URL;
    if (fromEnv) return fromEnv;
    return rules?.location?.buyUrl ?? rules?.rules?.buyUrl ?? rules?.checkoutUrl ?? rules?.purchaseUrl ?? null;
  }, [location, rules]);

  const uiPacks: UiPack[] = useMemo(() => {
    const priceTier1 = Number(rules?.rules?.packTier1PriceCents ?? 500);
    const priceTier2 = Number(rules?.rules?.packTier2PriceCents ?? 1000);
    const priceTier3 = Number(rules?.rules?.packTier3PriceCents ?? 1500);
    const priceTier4 = Number(rules?.rules?.packTier4PriceCents ?? 2000);

    return [
      { id: "tier1", title: "Quick Boost", subtitle: "Perfect for 1–2 songs", creditsLabel: "10 credits", badge: "Fast", cta: "Get Points", href: buyUrl ?? undefined, priceCents: priceTier1, packageKey: "5_10" },
      { id: "tier2", title: "Party Pack", subtitle: "Best for groups", creditsLabel: "25 credits", highlight: true, badge: "Most Popular", cta: "Get Points", href: buyUrl ?? undefined, priceCents: priceTier2, packageKey: "10_25" },
      { id: "tier3", title: "Bonus Pack", subtitle: "More songs, more fun", creditsLabel: "35 credits", badge: "Hot Deal", cta: "Get Points", href: buyUrl ?? undefined, priceCents: priceTier3, packageKey: "15_35" },
      { id: "tier4", title: "All Night", subtitle: "Skate like a legend", creditsLabel: "50 credits", badge: "Best Value", cta: "Get Points", href: buyUrl ?? undefined, priceCents: priceTier4, packageKey: "20_50" },
    ];
  }, [rules, buyUrl]);

  let creditsLabel = "Use Points!";
  if (verified || identityId) creditsLabel = bal.balance === null ? "Points: …" : `Points: ${bal.balance}`;

  const hasActiveQueue = (queuePreview?.upNext?.length || 0) > 0 || (queuePreview?.playNow?.length || 0) > 0;
  const nextQueueItem = (queuePreview.upNext?.[0] || queuePreview.playNow?.[0] || null) as any;
  const hudBalance = !verified && !identityId ? 5 : typeof bal.balance === "number" ? bal.balance : 0;

  return (
    <div className="neonRoot">
      <div className="rrWall" />
      <div className="neonWrap" style={{ paddingBottom: 96 }}>
        <div className="neonHeader neonHeader3">
          <div className="neonHeaderLeft">
            {rules?.rules?.logoUrl ? (
              <img className="neonLogo" src={rules.rules.logoUrl} alt={`${locationName} logo`} />
            ) : (
              <div className="neonLogoFallback">REMIX</div>
            )}
          </div>

          <div className="neonHeaderCenter">
            <div className="neonTitle">REQUEST A SONG</div>
            <div className="neonSub">
              {locationName} • Tap a song to request
              {sessionCountdown ? ` • ${sessionCountdown}` : ""}
            </div>
          </div>

          <div className="neonHeaderRight">
            <div className={`rrCornerHud ${(verified || identityId) && typeof bal.balance === "number" && bal.balance <= 2 ? "rrCornerHudLow" : ""}`}>
              <div className="rrCornerHudLabel">
                <span className="rrPointsDesktop">POINTS</span>
                <span className="rrPointsMobile">PTS</span>
              </div>
              <div className="rrCornerHudValue">
                <div key={bal.pulseKey} className="rrCornerHudNumber" style={{ animation: "rrPop 420ms ease-out" }}>
                  {hudBalance}
                </div>
              </div>
              <button className={`neonBtn neonBtnPrimary rrCornerHudBtn ${!verified && !identityId ? "neonPulse" : ""}`} onClick={handleCornerHudAction}>
                {!verified && !identityId ? "USE" : "ADD POINTS"}
              </button>
            </div>
          </div>
        </div>

        {msg ? <div className="neonToast" style={{ textAlign: "center", padding: "10px 14px" }}>{msg}</div> : null}

        <div ref={queueTargetRef} style={{ display: "grid", gap: 12, marginBottom: 12 }}>
          {hasActiveQueue ? (
            <button
              ref={queueButtonRef}
              className={`neonBtn neonBtnPrimary ${queuePulseOn ? "rrQueuePulse" : ""}`}
              style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6, textAlign: "center", alignItems: "center", padding: "14px 16px", borderRadius: 16 }}
              onClick={() => { sfx.playTap(); window.location.href = `/queue/${location}`; }}
            >
              <div style={{ fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span>View the Queue</span>
                <span style={{ fontSize: 16 }}>➡️</span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Coming up: <b>{nextQueueItem?.title || nextQueueItem?.song?.title || "—"}</b> by <b>{nextQueueItem?.artist || nextQueueItem?.song?.artist || "—"}</b>
              </div>
              <div style={{ fontSize: 12, opacity: 0.72 }}>Upvote or Downvote songs in the queue!</div>
            </button>
          ) : null}
        </div>

        {(verified || identityId) && !email ? (
          <div className="neonPanel" style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.3, marginBottom: 6 }}>Finish setup</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>Enter your email to unlock requests.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" className="neonInput" style={{ flex: 1 }} />
              <button className="neonBtn neonBtnPrimary" onClick={() => { sfx.playTap(); if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { localStorage.setItem("rr_email", email.trim()); setMsg("✅ Email saved."); } else { sfx.playError(); setMsg("Invalid email."); } }}>Save</button>
            </div>
          </div>
        ) : null}

        <div style={{ marginBottom: 5 }}>
          <input
            id="songSearch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs or artists…"
            className="neonInput neonSearchInput"
            style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.2 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingLeft: 6, paddingRight: 6, paddingBottom: 6 }}>
          <button onClick={() => { sfx.playTap(); setTag(""); }} className="neonBtn" style={chip2(tag === "")}>All</button>
          {RAILS.map((r) => (
            <button key={r} onClick={() => { sfx.playTap(); setTag(r); }} className="neonBtn" style={chip2(tag === r)}>{r}</button>
          ))}
        </div>

        {trending.length ? (
          <div className="neonPanel" style={{ padding: 10, marginBottom: 12 }}>
            <div style={{ padding: "10px 12px 0", fontWeight: 1000, letterSpacing: 0.4 }}>Trending at Remix</div>
            <div className="neonRail" style={{ maskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)" }}>
              {trending.map((s) => (
                <DelayedTapButton key={s.id} holdMs={450} sfx={sfx} onConfirm={(buttonEl?: HTMLElement | null) => submit(s, "play_next", buttonEl)} style={{ textAlign: "left" }}>
                  <div className="neonArt"><Artwork src={s.artworkUrl} alt={s.title} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{s.artist} • 1pt</div>
                  </div>
                </DelayedTapButton>
              ))}
            </div>
          </div>
        ) : null}

        <div className="neonPanel" style={{ padding: 12 }}>
          <div className="neonGrid">
            {songs.map((s) => {
              const hot = trendingIds.has(s.id);
              return (
                <div key={s.id} className={`neonTile ${successTileId === s.id ? "rrRequestTilePulse" : ""}`}>
                  <div className="neonTileTop rrArtworkStatic"><Artwork src={s.artworkUrl} alt={s.title} /></div>
                  <div className="neonTileBody">
                    <div className="neonTileTitle">{s.title}</div>
                    <div className="neonTileMeta">{s.artist}</div>
                    <div className="neonBadgeRow">
                      {hot && <span className="neonBadge neonBadgeHot">HOT</span>}
                      {s.explicit && <span className="neonBadge">E</span>}
                      <span className="neonBadge">{costRequest}pt</span>
                    </div>
                    <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                      <HoldToConfirmButton idleLabel="REQUEST!" successLabel="✓ REQUEST ADDED" holdMs={1800} onConfirm={(buttonEl?: HTMLElement | null) => submit(s, "play_next", buttonEl)} sfx={sfx} />
                      <HoldToConfirmButton className="neonBtnPrimary" idleLabel="BOOST" successLabel="✓ BOOST ADDED" holdMs={1800} onConfirm={(buttonEl?: HTMLElement | null) => submit(s, "play_now", buttonEl)} sfx={sfx} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <VerifyModal
          open={showVerify}
          location={location}
          email={email}
          setEmail={setEmail}
          onRedeem={(code: string) => redeem(code)}
          redeemBusy={redeemBusy}
          onVerified={() => {
            setVerified(true);
            setShowVerify(false);
            try {
              const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
              if (lsIdentity) setIdentityId(lsIdentity);
            } catch {}
            setMsg("✅ Verified!");
            sfx.playSuccess();
            bal.refreshOnce();
          }}
          onClose={() => setShowVerify(false)}
          sfx={sfx}
        />

        <CreditHud verified={verified || !!identityId} creditsLabel={creditsLabel} sessionCountdown={sessionCountdown} onVerify={() => setShowVerify(true)} onBuy={() => openBuy(bal.balance === 0 ? "out" : "none")} />

        <BuyCreditsDrawer
          open={showBuy}
          onClose={() => { setShowBuy(false); setBuyReason("none"); }}
          packs={uiPacks}
          buyUrl={buyUrl}
          redeemBusy={redeemBusy}
          onRedeem={(code: string) => redeem(code)}
          onBuy={(packageKey: "5_10" | "10_25" | "15_35" | "20_50") => startCheckout(packageKey)}
        />
      </div>

      {flyAnim ? (
        <div key={flyAnim.key} className="rrFlyCard" style={{ left: flyAnim.startX, top: flyAnim.startY, ["--rr-fly-x" as any]: `${Math.round(flyAnim.deltaX)}px`, ["--rr-fly-y" as any]: `${Math.round(flyAnim.deltaY)}px` }}>
          <div className="rrFlyCardInner">
            <Artwork src={flyAnim.src} alt="Requested song artwork" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HoldToConfirmButton({ className = "", idleLabel, successLabel, holdMs = 1800, onConfirm, disabled, sfx }: any) {
  const fillRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const lockedRef = useRef(false);

  const [holding, setHolding] = useState(false);
  const [success, setSuccess] = useState(false);

  function setLabel(text: string) { if (labelRef.current) labelRef.current.textContent = text; }
  function setFill(p: number) { if (fillRef.current) fillRef.current.style.height = `${Math.max(0, Math.min(100, p * 100))}%`; }

  function hardReset() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    lockedRef.current = false;
    setHolding(false);
    setSuccess(false);
    setFill(0);
    setLabel(idleLabel);
  }

  async function completeHold() {
    lockedRef.current = true;
    setHolding(false);
    setLabel("REQUESTING...");

    let ok = false;
    try { ok = Boolean(await Promise.resolve(onConfirm?.(buttonRef.current))); } catch { ok = false; }
    if (!ok) return hardReset();

    setSuccess(true);
    setLabel(successLabel);
    window.setTimeout(() => hardReset(), 700);
  }

  function tick(ts: number) {
    if (startRef.current == null) startRef.current = ts;
    const elapsed = ts - startRef.current;
    const p = Math.min(elapsed / holdMs, 1);
    setFill(p);
    if (p < 0.35) setLabel("HOLD TO CONFIRM");
    else if (p < 0.8) setLabel("KEEP HOLDING...");
    else setLabel("ALMOST THERE...");
    if (p >= 1) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      void completeHold();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function startHold(e: any) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || lockedRef.current) return;
    sfx?.playTap?.();
    setHolding(true);
    startRef.current = null;
    setFill(0);
    setLabel("HOLD TO CONFIRM");
    rafRef.current = requestAnimationFrame(tick);
  }

  function cancelHold(e?: any) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (lockedRef.current) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setHolding(false);
    setFill(0);
    setLabel(idleLabel);
  }

  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <button ref={buttonRef} type="button" className={`neonBtn rrHoldLiquidBtn ${className} ${holding ? "rrHolding" : ""} ${success ? "rrSuccess" : ""}`} disabled={disabled} onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold} onContextMenu={(e) => e.preventDefault()} style={{ width: "100%" }}>
      <div ref={fillRef} className="rrHoldLiquidFill"><div className="rrHoldLiquidSurface" /></div>
      <span ref={labelRef}>{idleLabel}</span>
    </button>
  );
}

function DelayedTapButton({ children, className = "", holdMs = 450, onConfirm, sfx, style }: any) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const [holding, setHolding] = useState(false);

  function setFill(p: number) { if (fillRef.current) fillRef.current.style.width = `${Math.max(0, Math.min(100, p * 100))}%`; }
  function reset() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    doneRef.current = false;
    setHolding(false);
    setFill(0);
  }

  async function complete() {
    doneRef.current = true;
    setHolding(false);
    try { await Promise.resolve(onConfirm?.(buttonRef.current)); }
    finally { window.setTimeout(() => reset(), 120); }
  }

  function tick(ts: number) {
    if (startRef.current == null) startRef.current = ts;
    const elapsed = ts - startRef.current;
    const p = Math.min(elapsed / holdMs, 1);
    setFill(p);
    if (p >= 1) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      void complete();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function startHold(e: any) {
    e.preventDefault();
    e.stopPropagation();
    if (doneRef.current) return;
    sfx?.playTap?.();
    setHolding(true);
    startRef.current = null;
    setFill(0);
    rafRef.current = requestAnimationFrame(tick);
  }

  function cancelHold(e?: any) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (doneRef.current) return;
    reset();
  }

  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <button ref={buttonRef} type="button" className={`neonChip rrDelayedTapBtn ${className} ${holding ? "rrDelayedTapHolding" : ""}`} onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold} onContextMenu={(e) => e.preventDefault()} style={style}>
      <div ref={fillRef} className="rrDelayedTapFill" />
      {children}
    </button>
  );
}

function VerifyModal({ open, location, email, setEmail, onRedeem, redeemBusy, onVerified, onClose, sfx }: any) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"collect" | "code">("collect");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [redeemCode, setRedeemCode] = useState("");
  const [showRedeem, setShowRedeem] = useState(false);
  if (!open) return null;

  async function sendCode() {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/auth/start`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ location, email, phone, emailOptIn, smsOptIn }) });
      const data = await res.json();
      if (data.ok) setStep("code"); else setMsg(data.error || "Error");
    } catch { setMsg("Error"); }
    finally { setBusy(false); }
  }

  async function confirmCode() {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/auth/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ location, email, code, emailOptIn, smsOptIn }) });
      const data = await res.json();
      if (data.ok) { localStorage.setItem("rr_identityId", data.identityId); onVerified({ balance: data.balance }); }
      else setMsg(data.error || "Invalid code");
    } catch { setMsg("Error"); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.8)" }}>
      <div className="neonPanel" style={{ padding: 20, width: 320 }}>
        <h3 style={{ marginTop: 0, marginBottom: 15 }}>Verify</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <input className="neonInput" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input className="neonInput" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "rgba(255,255,255,0.9)" }}><input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} style={{ marginTop: 3 }} /><span>Yes — email deals & updates <span style={{ color: "var(--muted)" }}>(required for credits)</span></span></label>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "rgba(255,255,255,0.9)" }}><input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} style={{ marginTop: 3 }} /><span>Yes — text deals & updates <span style={{ color: "var(--muted)" }}>(recommended)</span></span></label>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 14 }}>Have a redemption code?</div>
            <div style={{ perspective: 1000 }}>
              <div style={{ position: "relative", height: 48, transformStyle: "preserve-3d", transition: "transform 0.6s cubic-bezier(.2,.8,.2,1)", transform: showRedeem ? "rotateY(180deg)" : "rotateY(0deg)", willChange: "transform" }}>
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "translateZ(0.1px)", display: "flex", alignItems: "center", WebkitFontSmoothing: "subpixel-antialiased" }}>
                  <button className="neonBtn" style={{ width: "100%", height: "100%", opacity: 0.8 }} onClick={() => { sfx?.playTap?.(); setShowRedeem(true); }}>Redeem Code</button>
                </div>
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.1px)", display: "flex", gap: 8, alignItems: "center", WebkitFontSmoothing: "subpixel-antialiased" }}>
                  <input className="neonInput" placeholder="Code" value={redeemCode} onChange={(e) => setRedeemCode(e.target.value)} style={{ flex: 1, height: "100%" }} />
                  <button className="neonBtn neonBtnPrimary" disabled={!!redeemBusy} onClick={() => { sfx?.playTap?.(); onRedeem?.(redeemCode); }} style={{ height: "100%" }}>{redeemBusy ? "..." : "Apply"}</button>
                </div>
              </div>
            </div>
            {showRedeem && <div style={{ textAlign: "center", marginTop: 8 }}><button onClick={() => setShowRedeem(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>cancel code</button></div>}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", marginTop: 5 }}>We’ll text a one-time code. Standard rates may apply.</div>
          {step === "code" && <input className="neonInput" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter 6-digit Code" style={{ border: "1px solid cyan", marginTop: 5 }} />}
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <button className="neonBtn neonBtnPrimary" onClick={step === "collect" ? sendCode : confirmCode} style={{ width: "100%", height: 48 }}>{busy ? "..." : "Submit"}</button>
            <button className="neonBtn" onClick={onClose} style={{ width: "100%", opacity: 0.6 }}>Close</button>
          </div>
          {msg && <p style={{ color: "#ff4444", fontSize: 12, textAlign: "center", margin: 0 }}>{msg}</p>}
        </div>
      </div>
    </div>
  );
}

function CreditHud({ verified, creditsLabel, sessionCountdown, onVerify, onBuy }: any) {
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "rgba(0,0,0,0.9)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>{creditsLabel}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{sessionCountdown}</div>
        </div>
        <button className="neonBtn neonBtnPrimary" onClick={!verified ? onVerify : onBuy} style={{ whiteSpace: "nowrap" }}>
          {!verified ? "CLAIM" : "ADD POINTS"}
        </button>
      </div>
    </div>
  );
}

function BuyCreditsDrawer({ open, onClose, packs, buyUrl, onRedeem, redeemBusy, onBuy }: any) {
  const [redeemCode, setRedeemCode] = useState("");
  const [showRedeem, setShowRedeem] = useState(false);
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end" }}>
      <div className="neonPanel" style={{ width: "100%", padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <h3 style={{ marginTop: 0 }}>Get Points</h3>
        {packs.map((p: any) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0", gap: 12 }}>
            <div style={{ display: "grid" }}><span style={{ fontWeight: 800 }}>{p.title}</span><span style={{ fontSize: 12, color: "var(--muted)" }}>{p.creditsLabel}</span></div>
            <button className="neonBtn neonBtnPrimary" onClick={() => { if (p.packageKey) return onBuy?.(p.packageKey); if (p.href || buyUrl) window.location.href = p.href || buyUrl; }}>{`BUY • $${((p.priceCents ?? 0) / 100).toFixed(2)}`}</button>
          </div>
        ))}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ perspective: 1000 }}>
            <div style={{ position: "relative", height: 48, transformStyle: "preserve-3d", transition: "transform 0.4s cubic-bezier(.2,.8,.2,1)", transform: showRedeem ? "rotateY(180deg)" : "rotateY(0deg)" }}>
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "translateZ(1px)", display: "flex", alignItems: "center" }}>
                <button className="neonBtn neonBtnPrimary" style={{ width: "100%", height: "100%" }} onClick={() => setShowRedeem(true)}>Redeem Code</button>
              </div>
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(1px)", display: "flex", gap: 8, alignItems: "center" }}>
                <input className="neonInput" placeholder="Code" value={redeemCode} onChange={(e) => setRedeemCode(e.target.value)} style={{ flex: 1, height: "100%" }} />
                <button className="neonBtn neonBtnPrimary" disabled={!!redeemBusy} onClick={() => { onRedeem?.(redeemCode); setRedeemCode(""); }} style={{ whiteSpace: "nowrap", height: "100%" }}>{redeemBusy ? "..." : "Apply"}</button>
              </div>
            </div>
          </div>
        </div>
        <button className="neonBtn" onClick={onClose} style={{ width: "100%", marginTop: 16, opacity: 0.5 }}>Close</button>
      </div>
    </div>
  );
}

function Artwork({ src, alt }: { src?: string; alt: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div style={{ width: "100%", height: "100%", background: "#333", display: "grid", placeItems: "center" }}>REMIX</div>;
  return <img src={src} alt={alt} onError={() => setBad(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
}

const chip2 = (active: boolean) => ({
  padding: "10px 12px",
  borderRadius: 999,
  border: active ? "1px solid cyan" : "1px solid #333",
  background: active ? "rgba(0,255,255,0.1)" : "transparent",
  whiteSpace: "nowrap" as const,
});

function useNeonSfx() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlock = () => {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) ctxRef.current = new Ctx();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const play = (freq: number) => {
    if (muted || !ctxRef.current) return;
    const osc = ctxRef.current.createOscillator();
    const g = ctxRef.current.createGain();
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctxRef.current.currentTime);
    g.gain.exponentialRampToValueAtTime(0.05, ctxRef.current.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctxRef.current.currentTime + 0.10);
    osc.connect(g);
    g.connect(ctxRef.current.destination);
    osc.start();
    osc.stop(ctxRef.current.currentTime + 0.11);
  };

  return {
    muted, setMuted,
    playTap: () => play(800),
    playSuccess: () => play(1000),
    playError: () => play(200),
  };
}
