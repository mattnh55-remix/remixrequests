// src/app/request/[location]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// import AnimatedBalanceCounter from "../../../../components/ui/neon/AnimatedBalanceCounter"; // Unused in this snippet but kept for your imports
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
  priceCents?: number; // NEW: for "$X.XX • BUY"
  highlight?: boolean;
  badge?: string;
  cta?: string;
  href?: string;
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

  async function redeem(codeInput?: string) {
    const code = String(codeInput ?? redeemCode ?? "").trim();
    if (!code) { sfx.playError(); setMsg("Enter a redemption code."); return; }
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
  const [buyReason, setBuyReason] = useState<"none" | "out" | "notEnough" | "boost">("none");
  const [sessionCountdown, setSessionCountdown] = useState<string>("");

  const sfx = useNeonSfx();

  useEffect(() => {
    try {
      const e = email.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        localStorage.setItem("rr_email", e);
      }
    } catch { /* ignore */ }
  }, [email]);

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${location}`, { cache: "no-store" });
      const data = await res.json();
      setRules(data);
    } catch { /* silent */ }
  }

  async function refreshQueuePreview() {
    try {
      const res = await fetch(`/api/public/queue/${location}`, { cache: "no-store" });
      const data = await res.json();
      setQueuePreview({
        playNow: Array.isArray(data?.playNow) ? data.playNow : [],
        upNext: Array.isArray(data?.upNext) ? data.upNext : [],
      });
    } catch { /* silent */ }
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
    } catch { /* ignore */ }
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

  async function submit(songId: string, action: "play_next" | "play_now") {
    if (!verified && !identityId) {
      sfx.playError();
      setMsg("Please verify to unlock points.");
      setShowVerify(true);
      return;
    }

    const costRequest = rules?.rules?.costRequest ?? 1;
    const costPlayNow = rules?.rules?.costPlayNow ?? 5;
    const required = action === "play_now" ? costPlayNow : costRequest;

    if (typeof bal.balance === "number" && bal.balance < required) {
      sfx.playError();
      setMsg(required === costPlayNow ? "Not enough points for request" : "Not enough points to request.");
      openBuy(required === costPlayNow ? "boost" : "notEnough");
      return;
    }

    setMsg("");
    const res = await fetch(`/api/public/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ location, email, songId, action })
    });
    const data = await res.json();

    if (!data.ok) {
      sfx.playError();
      setMsg(data.error || "Something went wrong.");
      return;
    }

    sfx.playSuccess();
    setMsg(action === "play_now" ? "✅ Play Now request added!" : "✅ Request added!");

    const nextBalance = data?.balance ?? data?.credits?.balance ?? data?.session?.balance ?? null;
    if (typeof nextBalance === "number") {
      bal.applyBalance(nextBalance);
    } else {
      bal.refreshOnce();
    }
  }

  const trending = useMemo(() => {
    const hot = songs.filter(s => (s.tags || []).some(t => ["TikTok", "DISCO", "Pop Hits"].includes(t)));
    return (hot.length ? hot : songs).slice(0, 10);
  }, [songs]);

  const trendingIds = useMemo(() => new Set(trending.map(t => t.id)), [trending]);
  const locationName = rules?.location?.name || location;
  const costRequest = rules?.rules?.costRequest ?? 1;
  const costPlayNow = rules?.rules?.costPlayNow ?? 5;

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
  const raw = rules?.rules?.creditPacks ?? rules?.rules?.packs ?? rules?.packs ?? null;

  // Global Rules pricing (cents)
  const priceQuick = Number(rules?.rules?.packQuickPriceCents ?? 1000);
  const priceParty = Number(rules?.rules?.packPartyPriceCents ?? 2500);
  const priceAllNight = Number(rules?.rules?.packAllNightPriceCents ?? 5000);

  function normalizePriceCents(p: any, idx: number): number {
    // Prefer explicit values if present in pack config
    const direct =
      p?.priceCents ??
      p?.amountCents ??
      p?.cents ??
      (typeof p?.price === "number" ? Math.round(p.price * 100) : null) ??
      (typeof p?.amount === "number" ? Math.round(p.amount * 100) : null);

    if (typeof direct === "number" && Number.isFinite(direct) && direct >= 0) return Math.floor(direct);

    // Otherwise infer by id/name or fallback by index
    const id = String(p?.id ?? "").toLowerCase();
    const title = String(p?.title ?? p?.name ?? "").toLowerCase();

    const key = `${id} ${title}`;
    if (key.includes("quick") || key.includes("boost") || key.includes("10")) return priceQuick;
    if (key.includes("party") || key.includes("25")) return priceParty;
    if (key.includes("all") || key.includes("night") || key.includes("50")) return priceAllNight;

    // index fallback (matches your default ordering)
    if (idx === 0) return priceQuick;
    if (idx === 1) return priceParty;
    return priceAllNight;
  }

  if (Array.isArray(raw) && raw.length) {
    return raw.map((p: any, idx: number) => ({
      id: String(p.id ?? idx),
      title: String(p.title ?? p.name ?? "Points"),
      subtitle: String(p.subtitle ?? p.desc ?? "Instant points"),
      creditsLabel: String(p.creditsLabel ?? (p.credits ? `${p.credits} credits` : "Points")),
      highlight: Boolean(p.highlight ?? p.featured ?? idx === 1),
      badge: String(p.badge ?? (idx === 1 ? "Most Popular" : "")) || undefined,
      cta: String(p.cta ?? "Choose"),
      href: String(p.href ?? p.url ?? buyUrl ?? "") || undefined,

      // NEW: used for "$X.XX • BUY"
      priceCents: normalizePriceCents(p, idx),
    }));
  }

  return [
    {
      id: "quick",
      title: "Quick Boost",
      subtitle: "Perfect for 1–2 songs",
      creditsLabel: "10 credits",
      badge: "Fast",
      cta: "Get Points",
      href: buyUrl ?? undefined,
      priceCents: priceQuick,
    },
    {
      id: "party",
      title: "Party Pack",
      subtitle: "Best for groups",
      creditsLabel: "25 credits",
      highlight: true,
      badge: "Most Popular",
      cta: "Get Points",
      href: buyUrl ?? undefined,
      priceCents: priceParty,
    },
    {
      id: "allnight",
      title: "All Night",
      subtitle: "Skate like a legend",
      creditsLabel: "50 credits",
      badge: "Best Value",
      cta: "Get Points",
      href: buyUrl ?? undefined,
      priceCents: priceAllNight,
    },
  ];
}, [rules, buyUrl]);

  let creditsLabel = "Use Points!";
  if (verified || identityId) {
    if (bal.balance === null) creditsLabel = "Points: …";
    else creditsLabel = `Points: ${bal.balance}`;
  }

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
            <div
              className={`neonPanel rrPointsPanel ${(verified || identityId) && typeof bal.balance === "number" && bal.balance <= 2 ? "rrPointsLow" : ""}`}
              style={{
                padding: "10px 12px",
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.18)",
                minWidth: 104,
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 900, letterSpacing: 0.8, textAlign: "center", width: "100%" }}>
                  <span className="rrPointsDesktop">POINTS</span>
                  <span className="rrPointsMobile">PTS</span>
                </div>
              </div>

              <div key={bal.pulseKey} style={{ fontSize: 22, fontWeight: 1000, lineHeight: 1.1, animation: "rrPop 420ms ease-out" }}>
                {(!verified && !identityId) ? 5 : (typeof bal.balance === "number" ? bal.balance : "—")}
              </div>

              {(!verified && !identityId) ? (
                <button
                  className="neonBtn neonBtnPrimary neonPulse"
                  style={{ marginTop: 6, padding: "8px 10px", borderRadius: 14, fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); sfx.playTap(); setShowVerify(true); }}
                >USE</button>
              ) : (
                <button
                  className="neonBtn neonBtnPrimary"
                  style={{ marginTop: 6, padding: "8px 10px", borderRadius: 14, fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); sfx.playTap(); setBuyReason("boost"); setShowBuy(true); }}
                >ADD POINTS</button>
              )}
            </div>
          </div>
        </div>

        <style jsx global>{`
          @keyframes rrPop {
            0% { transform: scale(0.92); filter: brightness(0.9); }
            60% { transform: scale(1.06); filter: brightness(1.12); }
            100% { transform: scale(1); filter: brightness(1); }
          }
        `}</style>

        {msg ? <div className="neonToast" style={{ textAlign: "center", padding: "10px 14px" }}>
  {msg}
</div> : null}

        <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
          {(() => {
            const hasActive = (queuePreview?.upNext?.length || 0) > 0 || (queuePreview?.playNow?.length || 0) > 0;
            if (!hasActive) return null;
            const next = (queuePreview.upNext?.[0] || queuePreview.playNow?.[0] || null) as any;
            return (
              <button
                className="neonBtn neonBtnPrimary"
                style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6, textAlign: "center", alignItems: "center", padding: "14px 16px", borderRadius: 16 }}
                onClick={() => { sfx.playTap(); window.location.href = `/queue/${location}`; }}
              >
                <div style={{ fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center",  justifyContent: "center", gap: 8 }}>
                  <span>View the Queue</span>
                  <span style={{ fontSize: 16 }}>➡️</span>
                </div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  Coming up: <b>{next?.title || next?.song?.title || "—"}</b> by <b>{next?.artist || next?.song?.artist || "—"}</b>
                </div>
                <div style={{ fontSize: 12, opacity: 0.72 }}>Upvote or Downvote songs in the queue!</div>
              </button>
            );
          })()}
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
          onChange={e => setSearch(e.target.value)}
          placeholder="Search songs or artists…"
          className="neonInput neonSearchInput"
          style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.2 }}
        /></div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingLeft: 6, paddingRight: 6, paddingBottom: 6 }}>
          <button onClick={() => { sfx.playTap(); setTag(""); }} className="neonBtn" style={chip2(tag === "")}>All</button>
          {RAILS.map(r => (
            <button key={r} onClick={() => { sfx.playTap(); setTag(r); }} className="neonBtn" style={chip2(tag === r)}>{r}</button>
          ))}
        </div>

        {trending.length ? (
          <div className="neonPanel" style={{ padding: 10, marginBottom: 12 }}>
            <div style={{ padding: "10px 12px 0", fontWeight: 1000, letterSpacing: 0.4 }}>Trending at Remix</div>
            <div className="neonRail" style={{
    maskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
    WebkitMaskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)"
  }}
>
              {trending.map((s) => (
                <button
                  key={s.id}
                  className="neonChip"
                 onClick={(e) => {
  const el = e.currentTarget;
  el.classList.add("requestPulse");

  setTimeout(() => el.classList.remove("requestPulse"), 350);

  sfx.playTap();
  submit(s.id, "play_next");
}}
                  style={{ textAlign: "left" }}
                >
                  <div className="neonArt"><Artwork src={s.artworkUrl} alt={s.title} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{s.artist} • 1pt</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="neonPanel" style={{ padding: 12 }}>
          <div className="neonGrid">
            {songs.map((s) => {
              const hot = trendingIds.has(s.id);
              const canAffordNext = typeof bal.balance !== "number" ? true : bal.balance >= costRequest;
              const canAffordNow = typeof bal.balance !== "number" ? true : bal.balance >= costPlayNow;

              return (
                <div key={s.id} className="neonTile" onClick={() => {
                  sfx.playTap();
                  if (!email) { setMsg("Missing email."); return; }
                  if (!verified && !identityId) { setShowVerify(true); return; }
                  if ((verified || identityId) && typeof bal.balance === "number" && !canAffordNext) { openBuy("out"); return; }
                  submit(s.id, "play_next");
                }}>
                  <div className="neonTileTop"><Artwork src={s.artworkUrl} alt={s.title} /></div>
                  <div className="neonTileBody">
                    <div className="neonTileTitle">{s.title}</div>
                    <div className="neonTileMeta">{s.artist}</div>
                    <div className="neonBadgeRow">
                      {hot && <span className="neonBadge neonBadgeHot">HOT</span>}
                      {s.explicit && <span className="neonBadge">E</span>}
                      <span className="neonBadge">{costRequest}pt</span>
                    </div>
                    <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                      <button className="neonBtn" onClick={(e) => { e.stopPropagation(); sfx.playTap(); submit(s.id, "play_next"); }}>Request!</button>
                      <button className="neonBtn neonBtnPrimary" onClick={(e) => { e.stopPropagation(); sfx.playTap(); submit(s.id, "play_now"); }}>BOOST</button>
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
            } catch { /* ignore */ }
            setMsg("✅ Verified!");
            sfx.playSuccess();
            bal.refreshOnce();
          }}
          onClose={() => setShowVerify(false)}
          sfx={sfx}
        />

        <CreditHud
          verified={verified || !!identityId}
          balance={bal.balance}
          creditsLabel={creditsLabel}
          sessionCountdown={sessionCountdown}
          onVerify={() => setShowVerify(true)}
          onBuy={() => openBuy(bal.balance === 0 ? "out" : "none")}
          onTap={() => sfx.playTap()}
        />

        <BuyCreditsDrawer
          open={showBuy}
          onClose={() => { setShowBuy(false); setBuyReason("none"); }}
          sfx={sfx}
          verified={verified || !!identityId}
          balance={bal.balance}
          reason={buyReason}
          buyUrl={buyUrl}
          packs={uiPacks}
          redeemBusy={redeemBusy}
          onRedeem={(code: string) => redeem(code)}
          
        />
      </div>
    </div>
  );
}

// Helper components & logic below (VerifyModal, CreditHud, etc.)

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
      const res = await fetch(`/api/public/auth/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, email, phone, emailOptIn, smsOptIn })
      });
      const data = await res.json();
      if (data.ok) setStep("code");
      else setMsg(data.error || "Error");
    } catch { setMsg("Error"); }
    finally { setBusy(false); }
  }

  async function confirmCode() {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/auth/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, email, code, emailOptIn, smsOptIn })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem("rr_identityId", data.identityId);
        onVerified({ balance: data.balance });
      } else setMsg(data.error || "Invalid code");
    } catch { setMsg("Error"); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.8)" }}>
      <div className="neonPanel" style={{ padding: 20, width: 320 }}>
        <h3 style={{ marginTop: 0 }}>Verify</h3>

        <div style={{ display: "grid", gap: 10 }}>
          <input className="neonInput" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <input className="neonInput" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" />

          {/* Opt-ins */}
          <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
              <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} style={{ marginTop: 3 }} />
              <span>Yes — email deals & updates <span style={{ color: "var(--muted)" }}>(required for credits)</span></span>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
              <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} style={{ marginTop: 3 }} />
              <span>Yes — text deals & updates <span style={{ color: "var(--muted)" }}>(recommended)</span></span>
            </label>
          </div>

          <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
            We’ll text a one-time code. Standard rates may apply.
          </div>

          {/* Redeem Code Section - Moved to Bottom & Full Width */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 14 }}>Have a redemption code?</div>
            {!showRedeem ? (
              <button 
                className="neonBtn" 
                style={{ width: "100%", opacity: 0.8 }} 
                onClick={() => { sfx?.playTap?.(); setShowRedeem(true); }}
              >
                Redeem Code
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="neonInput"
                  placeholder="Code"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="neonBtn neonBtnPrimary"
                  disabled={!!redeemBusy}
                  onClick={() => onRedeem?.(redeemCode)}
                >
                  {redeemBusy ? "..." : "Apply"}
                </button>
              </div>
            )}
          </div>

          {step === "code" && (
            <input className="neonInput" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter 6-digit Code" style={{ border: "1px solid var(--primary)" }} />
          )}

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <button className="neonBtn neonBtnPrimary" onClick={step === "collect" ? sendCode : confirmCode} style={{ width: "100%" }}>
              {busy ? "..." : "Submit"}
            </button>
            <button className="neonBtn" onClick={onClose} style={{ width: "100%", opacity: 0.6 }}>Close</button>
          </div>

          {msg && <p style={{ color: "#ff4444", fontSize: 12, textAlign: "center", margin: 0 }}>{msg}</p>}
        </div>
      </div>
    </div>
  );
}

function CreditHud({ verified, balance, creditsLabel, sessionCountdown, onVerify, onBuy, onTap }: any) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        background: "rgba(0,0,0,0.9)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>{creditsLabel}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{sessionCountdown}</div>
        </div>
        <button
          className="neonBtn neonBtnPrimary"
          onClick={!verified ? onVerify : onBuy}
          style={{ whiteSpace: "nowrap" }}
        >
          {!verified ? "CLAIM" : "ADD POINTS"}
        </button>
      </div>
    </div>
  );
}

function BuyCreditsDrawer({ open, onClose, sfx, packs, buyUrl, onRedeem, redeemBusy }: any) {
  const [redeemCode, setRedeemCode] = useState("");
  const [showRedeem, setShowRedeem] = useState(false);
  const gradBtn: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, rgba(0,240,255,0.85), rgba(180,0,255,0.85), rgba(0,240,255,0.85))",
  backgroundSize: "200% 200%",
  animation: "rrGradientShift 2.4s ease infinite",
  border: "1px solid rgba(255,255,255,0.18)",
};

if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end" }}>
      <div className="neonPanel" style={{ width: "100%", padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <h3 style={{ marginTop: 0 }}>Get Points</h3>

        {/* Packs list unchanged... */}
        {packs.map((p: any) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0", gap: 12 }}>
            <div style={{ display: "grid" }}>
              <span style={{ fontWeight: 800 }}>{p.title}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.creditsLabel}</span>
            </div>
            <button className="neonBtn neonBtnGradient" onClick={() => { if (p.href || buyUrl) window.location.href = p.href || buyUrl; }}>
              Buy
            </button>
          </div>
        ))}

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Redeem Code</div>

          <div style={{ perspective: 1000 }}>
            <div
              style={{
                position: "relative",
                height: 48,
                transformStyle: "preserve-3d",
                transition: "transform 0.4s cubic-bezier(.2,.8,.2,1)",
                transform: showRedeem ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front Side */}
              <div style={{
                position: "absolute", inset: 0, backfaceVisibility: "hidden", 
                transform: "translateZ(1px)", // Fixes haziness
                display: "flex", alignItems: "center"
              }}>
                <button className="neonBtn neonBtnPrimary" style={{ width: "100%", height: "100%" }} onClick={() => setShowRedeem(true)}>
                  Redeem Code
                </button>
              </div>

              {/* Back Side */}
              <div style={{
                position: "absolute", inset: 0, backfaceVisibility: "hidden",
                transform: "rotateY(180deg) translateZ(1px)", // Fixes haziness
                display: "flex", gap: 8, alignItems: "center"
              }}>
                <input
                  className="neonInput"
                  placeholder="Code"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  style={{ flex: 1, height: "100%" }}
                />
                <button
                  className="neonBtn neonBtnPrimary"
                  disabled={!!redeemBusy}
                  onClick={() => { onRedeem?.(redeemCode); setRedeemCode(""); }}
                  style={{ whiteSpace: "nowrap", height: "100%" }}
                >
                  {redeemBusy ? "..." : "Apply"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button className="neonBtn" onClick={onClose} style={{ width: "100%", marginTop: 16, opacity: 0.5 }}>
          Close
        </button>
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
  const unlockedRef = useRef(false);

  useEffect(() => {
    const unlock = () => {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) ctxRef.current = new Ctx();
      unlockedRef.current = true;
    };
    window.addEventListener("pointerdown", unlock, { once: true });
  }, []);

  const play = (freq: number) => {
    if (muted || !ctxRef.current) return;
    const osc = ctxRef.current.createOscillator();
    const g = ctxRef.current.createGain();
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(ctxRef.current.destination);
    osc.start();
    osc.stop(ctxRef.current.currentTime + 0.1);
  };

  return {
    muted, setMuted,
    playTap: () => play(800),
    playSuccess: () => play(1000),
    playError: () => play(200)
  };
}