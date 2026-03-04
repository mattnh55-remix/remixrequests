// src/app/request/[location]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedBalanceCounter from "../../../../components/ui/neon/AnimatedBalanceCounter";
import { useAnimatedBalance } from "../../../../components/ui/neon/useAnimatedBalance";

const RAILS = [
  "All Ages","Adult Night","TikTok","DISCO","80s","90s","2000s","Boy Bands","Pop Hits","Mom’s Hits","Dad Rock"
];

type Song = { id: string; title: string; artist: string; artworkUrl?: string; explicit: boolean; tags: string[] };

type UiPack = {
  id: string;
  title: string;
  subtitle: string;
  creditsLabel: string;
  highlight?: boolean;
  badge?: string;
  cta?: string;
  href?: string;
};

// ✅ UI-ONLY per-location purchase links (no schema/API changes)
// Add links here as you enable Square/checkout per rink.
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

  const [verified, setVerified] = useState(false);

  // ✅ NEW: identityId is the durable “verified session” key
  const [identityId, setIdentityId] = useState<string>("");

  const [showVerify, setShowVerify] = useState(false);

  const [showBuy, setShowBuy] = useState(false);
  const [buyReason, setBuyReason] = useState<"none" | "out" | "notEnough" | "boost">("none");

  const [sessionCountdown, setSessionCountdown] = useState<string>("");

  const sfx = useNeonSfx();
// Persist email so verified users don't "lose" ability to tap after reload/Square return
useEffect(() => {
  try {
    const e = email.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      localStorage.setItem("rr_email", e);
    }
  } catch {
    // ignore
  }
}, [email]);

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${location}`, { cache: "no-store" });
      const data = await res.json();
      setRules(data);
    } catch {
      // silent
    }
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

    if (!data.ok) {
      throw new Error(data.error || "Balance fetch failed");
    }

    return Number(data.balance ?? 0);
  }

  const bal = useAnimatedBalance(() => fetchBalanceNumber(), {
    enabled: Boolean(identityId),
    softPollMs: 2600,
    intervalMs: 650,
    // keep last-known balance per location + identity so +X feels correct
    storageKey: `rr_lastBalance:${location}:${identityId || "anon"}`,
  });
  // 🔥 TouchTunes-style nudge after checkout return
  // Gives a second pulse in case webhook credits land slightly delayed
  useEffect(() => {
    if (!identityId) return;

    const t = window.setTimeout(() => {
      bal.refreshOnce();
    }, 900);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityId, location]);


  useEffect(() => { refreshSession(); }, [location]);
  useEffect(() => { loadSongs(); }, [search, tag]);

  useEffect(() => {
    const id = setInterval(() => refreshSession(), 12000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // ✅ NEW: bootstrap verified state from localStorage so Square return does NOT re-verify
  useEffect(() => {
    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();
    const lsEmail = (localStorage.getItem("rr_email") || "").trim();
      if (lsIdentity) {
        setIdentityId(lsIdentity);
        setVerified(true);
        if (lsEmail) setEmail(lsEmail);

	// Kick an immediate refresh once identity is known.
	// The hook will soft-poll for ~2–3 seconds to tolerate webhook lag.
	bal.refreshOnce();
      }

      // keep location aligned
      if (location && lsLocation !== location) {
        localStorage.setItem("rr_location", String(location));
      }
    } catch {
      // ignore localStorage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // ✅ Session countdown (UI-only) from rules.session.endsAt
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

  function openBuy(reason: typeof buyReason) {
    setBuyReason(reason);
    setShowBuy(true);
    sfx.playTap();
  }

  async function submit(songId: string, action: "play_next" | "play_now") {
    // ✅ IMPORTANT CHANGE:
    // If we have an identityId from localStorage, do not force reverify.
    // verified state is still used for UI, but identityId is the durable truth.
    if (!verified && !identityId) {
      sfx.playError();
      setMsg("Please verify to unlock points.");
      setShowVerify(true);
      return;
    }

    const costRequest = rules?.rules?.costRequest ?? 1;
    const costPlayNow = rules?.rules?.costPlayNow ?? 5;
    const required = action === "play_now" ? costPlayNow : costRequest;

    // UI-only: if balance is known, intercept insufficient and open drawer.
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

    // If endpoint returns balance, capture it (no backend change required).
    const nextBalance =
      data?.balance ??
      data?.credits?.balance ??
      data?.session?.balance ??
      null;

    if (typeof nextBalance === "number") {
      bal.applyBalance(nextBalance);
    } else {
      // If server didn’t return balance, do a safe refresh
      bal.refreshOnce();
    }
  }

  const trending = useMemo(() => {
    const hot = songs.filter(s => (s.tags || []).some(t => ["TikTok","DISCO","Pop Hits"].includes(t)));
    return (hot.length ? hot : songs).slice(0, 10);
  }, [songs]);

  const trendingIds = useMemo(() => new Set(trending.map(t => t.id)), [trending]);

  const locationName = rules?.location?.name || location;
  const costRequest = rules?.rules?.costRequest ?? 1;
  const costPlayNow = rules?.rules?.costPlayNow ?? 5;

  // ✅ UI-ONLY buy URL discovery
  // Priority:
  // 1) ?buy= param (quick testing)
  // 2) per-location map (BUY_URL_BY_LOCATION)
  // 3) NEXT_PUBLIC_REMIXREQUESTS_BUY_URL env
  // 4) any future fields the backend might add
  const buyUrl = useMemo(() => {
    const qp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const fromQuery = qp?.get("buy");
    if (fromQuery) return fromQuery;

    const fromMap = BUY_URL_BY_LOCATION[location];
    if (fromMap) return fromMap;

    const fromEnv = process.env.NEXT_PUBLIC_REMIXREQUESTS_BUY_URL;
    if (fromEnv) return fromEnv;

    return (
      rules?.location?.buyUrl ??
      rules?.rules?.buyUrl ??
      rules?.checkoutUrl ??
      rules?.purchaseUrl ??
      null
    );
  }, [location, rules]);

  // Packs: still UI fallback (no price claims)
  const uiPacks: UiPack[] = useMemo(() => {
    const raw =
      rules?.rules?.creditPacks ??
      rules?.rules?.packs ??
      rules?.packs ??
      null;

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
      }));
    }

    return [
      { id: "quick", title: "Quick Boost", subtitle: "Perfect for 1–2 songs", creditsLabel: "10 credits", badge: "Fast", cta: "Get Points", href: buyUrl ?? undefined },
      { id: "party", title: "Party Pack", subtitle: "Best for groups", creditsLabel: "25 credits", highlight: true, badge: "Most Popular", cta: "Get Points", href: buyUrl ?? undefined },
      { id: "allnight", title: "All Night", subtitle: "Skate like a legend", creditsLabel: "50 credits", badge: "Best Value", cta: "Get Points", href: buyUrl ?? undefined },
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
        {/* HEADER */}
        <div className="neonHeader neonHeader3">
          {/* Left: Logo */}
          <div className="neonHeaderLeft">
            {rules?.rules?.logoUrl ? (
              <img className="neonLogo" src={rules.rules.logoUrl} alt={`${locationName} logo`} />
            ) : (
              <div className="neonLogoFallback">REMIX</div>
            )}
          </div>

          {/* Center: Title */}
          <div className="neonHeaderCenter">
            <div className="neonTitle">REQUEST A SONG</div>
            <div className="neonSub">
              {locationName} • Tap a song to request
              {sessionCountdown ? ` • ${sessionCountdown}` : ""}
            </div>
          </div>

          {/* Right: Sound + Credits/Claim/Buy */}
          <div className="neonHeaderRight">
  
            <div
className={`neonPanel rrPointsPanel ${
  (verified || identityId) && typeof bal.balance === "number" && bal.balance <= 2 ? "rrPointsLow" : ""
}`}
              style={{
                padding: "10px 12px",
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.18)",
                minWidth: 104,
                textAlign: "center",
              }}
              title="Points"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div
  style={{
    fontSize: 11,
    color: "var(--muted)",
    fontWeight: 900,
    letterSpacing: 0.8,
    textAlign: "center",
    width: "100%",
  }}
>
  <span className="rrPointsDesktop">POINTS</span>
  <span className="rrPointsMobile">PTS</span>
</div>

                {/* keep refresh available (verified users) without changing backend behavior */}
                {(verified || identityId) ? (
                  <button
                    className="neonBtn"
                    style={{ padding: "6px 8px", borderRadius: 12, fontSize: 12, lineHeight: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      sfx.playTap();
                      bal.refreshOnce();
                    }}
                    title="Refresh balance"
                  >
                    ↻
                  </button>
                ) : null}
              </div>

              <div
                key={bal.pulseKey}
                style={{
                  fontSize: 22,
                  fontWeight: 1000,
                  lineHeight: 1.1,
                  animation: "rrPop 420ms ease-out",
                }}
              >
                {(!verified && !identityId) ? 5 : (typeof bal.balance === "number" ? bal.balance : "—")}
              </div>

              {(!verified && !identityId) ? (
                <button
                  className="neonBtn neonBtnPrimary neonPulse"
                  style={{ marginTop: 6, padding: "8px 10px", borderRadius: 14, fontSize: 12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    sfx.playTap();
                    setShowVerify(true);
                  }}
                  title="Claim your Points"
                >
                  USE
                </button>
              ) : (
                <button
                  className="neonBtn neonBtnPrimary"
                  style={{ marginTop: 6, padding: "8px 10px", borderRadius: 14, fontSize: 12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    sfx.playTap();
                    setBuyReason("boost");
                    setShowBuy(true);
                  }}
                  title="Buy more Points"
                >
                  ADD POINTS
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ✅ balance pop animation (global) */}
        <style jsx global>{`
          @keyframes rrPop {
            0% { transform: scale(0.92); filter: brightness(0.9); }
            60% { transform: scale(1.06); filter: brightness(1.12); }
            100% { transform: scale(1); filter: brightness(1); }
          }
        `}</style>

   {msg ? (
  <div className="neonToast">
    <AnimatedBalanceCounter
      balance={bal.balance}
      pulseKey={bal.pulseKey}
      showDeltaBanner={bal.showDeltaBanner}
      delta={bal.delta}
      onRefresh={bal.refreshOnce}
      isRefreshing={bal.isRefreshing}
    />
    {msg}
  </div>
) : null}

        {/* TOP CONTROLS */}
        <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
{(verified || identityId) && !email ? (
  <div className="neonPanel" style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
    <div style={{ fontWeight: 900, letterSpacing: 0.3, marginBottom: 6 }}>
      Finish setup
    </div>
    <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>
      Enter your email to unlock song requests on this device.
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@domain.com"
        className="neonInput"
        autoComplete="email"
        onFocus={() => sfx.playTap()}
        style={{ flex: 1 }}
      />
      <button
        className="neonBtn neonBtnPrimary"
        onClick={() => {
          sfx.playTap();
          const e = email.trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
            sfx.playError();
            setMsg("Please enter a valid email.");
            return;
          }
          try { localStorage.setItem("rr_email", e); } catch {}
          sfx.playSuccess();
          setMsg("✅ Email saved. You can request songs now.");
        }}
        style={{ whiteSpace: "nowrap" }}
      >
        Save
      </button>
    </div>
  </div>
) : null}

<input
  id="songSearch"
  value={search}
  onChange={e => setSearch(e.target.value)}
  placeholder="Search songs or artists…"
  className="neonInput neonSearchInput"
  onFocus={() => sfx.playTap()}
  style={{
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: 0.2,
  }}
/>

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
            <button onClick={() => { sfx.playTap(); setTag(""); }} className="neonBtn" style={chip2(tag === "")}>All</button>
            {RAILS.map(r => (
              <button key={r} onClick={() => { sfx.playTap(); setTag(r); }} className="neonBtn" style={chip2(tag === r)}>{r}</button>
            ))}
          </div>
        </div>

        {/* TRENDING */}
        {trending.length ? (
          <div className="neonPanel" style={{ padding: 10, marginBottom: 12 }}>
            <div style={{ padding: "10px 12px 0", fontWeight: 1000, letterSpacing: 0.4 }}>
              Trending at Remix
            </div>
            <div className="neonRail">
              {trending.map((s) => (
                <button
                  key={s.id}
                  className="neonChip"
                  onClick={() => { sfx.playTap(); submit(s.id, "play_now"); }}
                  style={{ textAlign: "left" }}
                  title="Tap to Play Now"
                >
                  <div className="neonArt" style={{ overflow: "hidden" }}>
                    <Artwork src={s.artworkUrl} alt={s.title} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 14,
                        lineHeight: 1.15,
                        color: "#ffffff",
                        textShadow: "0 0 6px rgba(255,255,255,0.4)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        letterSpacing: 0.2
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: 12,
                        marginTop: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {s.artist} • Play Now
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* GRID */}
        <div className="neonPanel" style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "2px 4px 10px" }}>
            <div style={{ fontWeight: 1000, letterSpacing: 0.4 }}>Pick a Song</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              Request costs {costRequest} • Boosts cost {costPlayNow}
            </div>
          </div>

          <div className="neonGrid">
            {songs.map((s) => {
              const hot = trendingIds.has(s.id);
              const canAffordNext = typeof bal.balance !== "number" ? true : bal.balance >= costRequest;
              const canAffordNow  = typeof bal.balance !== "number" ? true : bal.balance >= costPlayNow;

              return (
<div
  key={s.id}
  className="neonTile"
  data-hot={hot ? "true" : "false"}
  role="button"
  tabIndex={0}
  title="Tap to Request!"
  onClick={() => {
    sfx.playTap();

    if (!email) {
      setMsg("Missing fields.");
      return;
    }
    if (!verified && !identityId) {
      setMsg("Please verify to unlock points.");
      setShowVerify(true);
      return;
    }

    if ((verified || identityId) && typeof bal.balance === "number" && !canAffordNext) {
      setMsg("You’re out of points for Play Next.");
      openBuy("out");
      return;
    }

    submit(s.id, "play_next");
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      (e.currentTarget as HTMLDivElement).click();
    }
  }}
>                  <div className="neonTileTop">
                    <div className="neonTilePulse" />
                    <Artwork src={s.artworkUrl} alt={s.title} />
                  </div>

                  <div className="neonTileBody">
                    <div style={{ minWidth: 0 }}>
                      <div className="neonTileTitle" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.title}
                      </div>
                      <div className="neonTileMeta" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.artist}
                      </div>
                      <div className="neonTileMeta" style={{ opacity: 0.7 }}>
                        {(s.tags || []).slice(0, 3).join(" • ")}
                      </div>
                    </div>

                    <div className="neonBadgeRow">
                      {hot ? <span className="neonBadge neonBadgeHot">HOT</span> : null}
                      {s.explicit ? <span className="neonBadge" style={{ borderColor: "rgba(255,204,0,0.35)" }}>EXPLICIT</span> : null}
                      <span className="neonBadge">{costRequest} point</span>
                    </div>

                    <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                      <button
                        disabled={!email || (!verified && !identityId)}
                        onClick={(e) => {
  			    e.stopPropagation();
                          sfx.playTap();
                          if ((verified || identityId) && typeof bal.balance === "number" && !canAffordNext) {
                            setMsg("You’re out of points for Play Next.");
                            openBuy("out");
                            return;
                          }
                          submit(s.id, "play_next");
                        }}
 className="neonBtn"
style={{ opacity: (!email || (!verified && !identityId)) ? 0.55 : 1 }}
>
  <>
    <span className="rrLabelDesktop">
      Request! · {costRequest} Point
    </span>
    <span className="rrLabelMobile">
      Request! · {costRequest} Pt
    </span>
  </>
</button>
                      <button
                        disabled={!email || (!verified && !identityId)}
			onClick={(e) => {
  			e.stopPropagation();
  			sfx.playTap();
                          sfx.playTap();
                          if ((verified || identityId) && typeof bal.balance === "number" && !canAffordNow) {
                            setMsg("Boost needs more points.");
                            openBuy("boost");
                            return;
                          }
                          submit(s.id, "play_now");
                        }}
                        className="neonBtn neonBtnPrimary"
                        style={{ opacity: (!email || (!verified && !identityId)) ? 0.55 : 1, position: "relative", overflow: "hidden" }}
                      >
                        <span
                          aria-hidden
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.10) 35%, rgba(255,255,255,0) 70%)",
                            transform: "translateX(-120%)",
                            animation: "neonShimmer 2.8s ease-in-out infinite",
                            pointerEvents: "none",
                          }}
                        />
<span style={{ position: "relative" }}>
  <>
    <span className="rrLabelDesktop">
      BOOST to Top · {costPlayNow} Points
    </span>
    <span className="rrLabelMobile">
      BOOST · {costPlayNow} Pts
    </span>
  </>
</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ position: "sticky", bottom: 10, zIndex: 10, marginTop: 14, display: "grid", gap: 10 }}>
          {(!verified && !identityId) ? (
            <button className="neonBtn neonBtnPrimary" onClick={() => { sfx.playTap(); setShowVerify(true); }} style={{ width: "100%" }}>
              CLAIM
            </button>
          ) : (
            <button className="neonBtn neonBtnPrimary" style={{ width: "100%" }} onClick={() => { sfx.playTap(); document.getElementById("songSearch")?.focus(); }}>
              Search & Play Now
            </button>
          )}
        </div>

        <VerifyModal
          open={showVerify}
          location={location}
          email={email}
          setEmail={setEmail}
          onVerified={(info) => {
            // ✅ persist verified UX
            setVerified(true);
            setShowVerify(false);

            // pull identityId from LS (VerifyModal already writes it)
            try {
              const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
              if (lsIdentity) setIdentityId(lsIdentity);
            } catch {}

if (info?.balance !== undefined) {
  const nb = info.balance ?? null;
  bal.applyBalance(nb);
}

            setMsg("✅ Verified! Welcome Points Unlocked.");
            sfx.playSuccess();
            refreshSession();

            // ✅ always fetch a fresh balance after verification
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
  onVerify={() => { sfx.playTap(); setShowVerify(true); }}
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
        />
      </div>

      <style>{`
        @keyframes neonShimmer {
          0% { transform: translateX(-120%); opacity: 0.0; }
          15% { opacity: 1.0; }
          55% { transform: translateX(120%); opacity: 0.7; }
          100% { transform: translateX(120%); opacity: 0.0; }
        }
      `}</style>
    </div>
  );
}

const chip2 = (active: boolean) => ({
  padding: "10px 12px",
  borderRadius: 999,
  border: active ? "1px solid rgba(0,247,255,0.30)" : "1px solid rgba(255,255,255,0.14)",
  background: active ? "linear-gradient(90deg, rgba(0,247,255,0.16), rgba(255,57,212,0.12))" : "rgba(0,0,0,0.18)",
  boxShadow: active ? "var(--glowA)" : "none",
  whiteSpace: "nowrap" as const,
  fontWeight: 900,
  fontSize: 13,
});

function Artwork({ src, alt }: { src?: string; alt: string }) {
  const [bad, setBad] = useState(false);

  if (!src || bad) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          opacity: 0.75,
          fontWeight: 900,
          letterSpacing: 0.6,
          color: "rgba(255,255,255,0.75)",
          textTransform: "uppercase",
        }}
      >
        Remix
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBad(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}

/* ---------- Credit HUD (UI-only) ---------- */

function CreditHud({
  verified,
  balance,
  creditsLabel,
  sessionCountdown,
  onVerify,
  onBuy,
  onTap,
}: {
  verified: boolean;
  balance: number | null;
  creditsLabel: string;
  sessionCountdown: string;
  onVerify: () => void;
  onBuy: () => void;
  onTap: () => void;
}) {
  const isKnown = typeof balance === "number";
  const isLow = isKnown && balance <= 2;
  const isZero = isKnown && balance === 0;

  const primaryLabel = !verified ? "CLAIM" : "Get Points";
  const secondary = !verified
    ? "Welcome points + faster boosts"
    : isKnown
      ? (isZero ? "Out of points — power up now" : isLow ? "Low points — keep the vibe going" : "Boost songs to jump the line")
      : "Tap to view Point Packs";

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        padding: "10px 10px 12px",
        background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 18%, rgba(0,0,0,0.82) 100%)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        className="neonPanel"
        style={{
          padding: 12,
          borderRadius: 18,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          alignItems: "center",
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
        }}
        onClick={() => {
          onTap();
          if (!verified) onVerify();
          else onBuy();
        }}
        role="button"
        tabIndex={0}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            {/* creditsLabel already updates; keep it */}
            <div style={{ fontWeight: 1000, letterSpacing: 0.4, whiteSpace: "nowrap" }}>
              {creditsLabel}
            </div>

            {sessionCountdown ? (
              <span className="neonBadge" style={{ borderColor: "rgba(255,255,255,0.14)", opacity: 0.9 }}>
                {sessionCountdown}
              </span>
            ) : null}

            {verified && isKnown ? (
              <span
                className="neonBadge"
                style={{
                  borderColor: isZero ? "rgba(255,57,212,0.55)" : isLow ? "rgba(0,247,255,0.45)" : "rgba(255,255,255,0.18)",
                  background: isZero
                    ? "linear-gradient(90deg, rgba(255,57,212,0.18), rgba(0,247,255,0.08))"
                    : isLow
                      ? "linear-gradient(90deg, rgba(0,247,255,0.16), rgba(255,57,212,0.08))"
                      : "rgba(0,0,0,0.14)",
                }}
              >
                {isZero ? "POWER UP" : isLow ? "LOW" : "READY"}
              </span>
            ) : null}
          </div>

          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {secondary}
          </div>
        </div>

        <button
          className="neonBtn neonBtnPrimary"
          style={{ padding: "12px 14px", borderRadius: 16, whiteSpace: "nowrap" }}
          onClick={(e) => {
            e.stopPropagation();
            onTap();
            if (!verified) onVerify();
            else onBuy();
          }}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}

/* ---------- Buy Credits Drawer (UI-only) ---------- */

function BuyCreditsDrawer({
  open,
  onClose,
  sfx,
  verified,
  balance,
  reason,
  buyUrl,
  packs,
}: {
  open: boolean;
  onClose: () => void;
  sfx: ReturnType<typeof useNeonSfx>;
  verified: boolean;
  balance: number | null;
  reason: "none" | "out" | "notEnough" | "boost";
  buyUrl: string | null;
  packs: UiPack[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const headline =
    !verified ? "Start Using Points Now!" :
    reason === "boost" ? "Boost needs points!" :
    reason === "out" ? "You’re out of points!" :
    reason === "notEnough" ? "Not enough points!" :
    "Power up your session!";

  const sub =
    !verified ? "Fast SMS verification — unlock welcome points instantly." :
    typeof balance === "number"
      ? `Current balance: ${balance} points`
      : "Choose a points pack — Use instantly! (Valid for today's session only)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", alignItems: "end" }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(6px)" }}
        onClick={() => { sfx.playTap(); onClose(); }}
      />

      <div
        className="neonPanel"
        style={{
          position: "relative",
          margin: 10,
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.92))",
          boxShadow: "0 24px 80px rgba(0,0,0,0.65)",
        }}
      >
        <div style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 1000, letterSpacing: 0.4, fontSize: 16 }}>{headline}</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {sub}
            </div>
          </div>

          <button className="neonBtn" onClick={() => { sfx.playTap(); onClose(); }} style={{ borderRadius: 14, padding: "10px 12px" }} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
          <div style={{ padding: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontWeight: 1000, letterSpacing: 0.35 }}>Pick a points pack</div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>Instant unlock • Fun boosts!</div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {packs.map((p) => {
                const isFeatured = !!p.highlight;
                const target = p.href || buyUrl;

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: 12,
                      borderRadius: 18,
                      border: isFeatured ? "1px solid rgba(0,247,255,0.30)" : "1px solid rgba(255,255,255,0.12)",
                      background: isFeatured
                        ? "linear-gradient(90deg, rgba(0,247,255,0.14), rgba(255,57,212,0.10))"
                        : "rgba(0,0,0,0.18)",
                      boxShadow: isFeatured ? "var(--glowA)" : "none",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontWeight: 1000 }}>{p.title}</div>
                        {p.badge ? (
                          <span className="neonBadge" style={{ borderColor: isFeatured ? "rgba(0,247,255,0.30)" : "rgba(255,57,212,0.25)", background: isFeatured ? "rgba(0,247,255,0.08)" : "rgba(255,57,212,0.08)" }}>
                            {p.badge}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.subtitle}
                      </div>
                      <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className="neonBadge" style={{ borderColor: "rgba(255,255,255,0.14)" }}>{p.creditsLabel}</span>
                        <span className="neonBadge" style={{ borderColor: "rgba(255,255,255,0.14)", opacity: 0.85 }}>
                          DJ sees BOOSTED ribbon on TV
                        </span>
                      </div>
                    </div>

                    <button
                      className={isFeatured ? "neonBtn neonBtnPrimary" : "neonBtn"}
                      style={{ borderRadius: 16, padding: "12px 14px", whiteSpace: "nowrap" }}
                      onClick={() => {
                        sfx.playTap();
                        if (target) window.location.href = target;
                        else sfx.playError();
                      }}
                    >
                      {p.cta || "Choose"}
                    </button>
                  </div>
                );
              })}
            </div>

            {!buyUrl ? (
              <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, lineHeight: 1.35 }}>
                Checkout isn’t connected for this rink yet. (When you’re ready, set
                <span style={{ fontWeight: 900 }}> NEXT_PUBLIC_REMIXREQUESTS_BUY_URL </span>
                or add a link to <span style={{ fontWeight: 900 }}>BUY_URL_BY_LOCATION</span>.)
              </div>
            ) : (
              <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, lineHeight: 1.35 }}>
                Tip: <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 900 }}>Boost</span> is the “VIP power-up” — fastest way to hear your song sooner.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Verify Modal (logic preserved) ---------- */

function VerifyModal({
  open,
  location,
  email,
  setEmail,
  onVerified,
  onClose,
  sfx,
}: {
  open: boolean;
  location: string;
  email: string;
  setEmail: (v: string) => void;
  onVerified: (info?: { balance?: number }) => void;
  onClose?: () => void;
  sfx: ReturnType<typeof useNeonSfx>;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"collect" | "code">("collect");

  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  if (!open) return null;

  async function sendCode() {
    setMsg("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      sfx.playError();
      setMsg("Please enter a valid email.");
      return;
    }
    if (!phone.trim()) {
      sfx.playError();
      setMsg("Please enter your mobile number.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/public/auth/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, email, phone, emailOptIn, smsOptIn })
      });
      const data = await res.json();
      if (!data.ok) {
        sfx.playError();
        setMsg(data.error || "Could not send code.");
        return;
      }
      sfx.playSuccess();
      setStep("code");
      setMsg("Code sent! Check your texts.");
    } catch {
      sfx.playError();
      setMsg("Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    setMsg("");
    if (!code.trim()) {
      sfx.playError();
      setMsg("Please enter the code.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/public/auth/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, email, code })
      });
      const data = await res.json();

      if (!data.ok) {
        sfx.playError();
        setMsg(data.error || "Invalid code.");
        return;
      }

if (typeof window !== "undefined" && data?.identityId) {
  localStorage.setItem("rr_identityId", String(data.identityId));
  localStorage.setItem("rr_location", String(location));
  if (email?.trim()) localStorage.setItem("rr_email", email.trim());
}

      sfx.playSuccess();
      onVerified?.({ balance: data?.balance ?? data?.credits?.balance ?? null });

    } catch {
      sfx.playError();
      setMsg("Could not verify code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.66)", backdropFilter: "blur(6px)" }} onClick={() => { sfx.playTap(); onClose?.(); }} />

      <div
        className="neonPanel"
        style={{
          position: "relative",
          width: "min(560px, calc(100% - 22px))",
          margin: "8vh auto 0",
          padding: 14,
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.92))",
          boxShadow: "0 24px 80px rgba(0,0,0,0.65)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 1000, letterSpacing: 0.4, fontSize: 16 }}>Unlock your points</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 4 }}>
              Verify once → request + boost faster all session.
            </div>
          </div>

          <button className="neonBtn" onClick={() => { sfx.playTap(); onClose?.(); }} style={{ borderRadius: 14, padding: "10px 12px" }}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="neonBadge" style={{ borderColor: step === "collect" ? "rgba(0,247,255,0.35)" : "rgba(255,255,255,0.14)" }}>1) Phone</span>
            <span className="neonBadge" style={{ borderColor: step === "code" ? "rgba(0,247,255,0.35)" : "rgba(255,255,255,0.14)" }}>2) Code</span>
            <span className="neonBadge" style={{ borderColor: "rgba(255,57,212,0.25)" }}>3) Points</span>
          </div>

          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="neonInput" autoComplete="email" onFocus={() => sfx.playTap()} disabled={busy} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile number" className="neonInput" inputMode="tel" onFocus={() => sfx.playTap()} disabled={busy || step === "code"} />

          {step === "code" ? (
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Verification code" className="neonInput" inputMode="numeric" onFocus={() => sfx.playTap()} disabled={busy} />
          ) : null}

          <label style={rowToggle}>
            <input type="checkbox" checked={emailOptIn} onChange={e => setEmailOptIn(e.target.checked)} disabled={busy} />
            <span>Yes, send me email perks & coupons</span>
          </label>

          <label style={rowToggle}>
            <input type="checkbox" checked={smsOptIn} onChange={e => setSmsOptIn(e.target.checked)} disabled={busy} />
            <span>Yes, give me points & send me SMS updates</span>
          </label>

          {msg ? <div style={miniNote}>{msg}</div> : null}

          {step === "collect" ? (
            <button className="neonBtn neonBtnPrimary" onClick={() => { sfx.playTap(); sendCode(); }} disabled={busy}>
              {busy ? "Sending…" : "Send Code"}
            </button>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <button className="neonBtn neonBtnPrimary" onClick={() => { sfx.playTap(); confirmCode(); }} disabled={busy}>
                {busy ? "Verifying…" : "Confirm Code"}
              </button>

              <button className="neonBtn" onClick={() => { sfx.playTap(); setStep("collect"); setCode(""); setMsg(""); }} disabled={busy}>
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
);
}
/*------WHERE MY TRUE END IS--------*/

const rowToggle = { display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: "rgba(255,255,255,0.78)", padding: "6px 2px" } as const;
const miniNote  = { display: "grid", gap: 8, marginBottom: 6, padding: 12, borderRadius: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" } as const;

/* ---------- WebAudio SFX (assumed existing, kept local here) ---------- */

function useNeonSfx() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("neonMuted") === "1";
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const unlock = async () => {
      try {
        if (!ctxRef.current) {
          // @ts-ignore
          const Ctx = window.AudioContext || window.webkitAudioContext;
          ctxRef.current = new Ctx();
        }
        if (ctxRef.current?.state === "suspended") await ctxRef.current.resume();
        unlockedRef.current = true;
      } catch {}
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("neonMuted", muted ? "1" : "0");
  }, [muted]);

  function ctx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    // @ts-ignore
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    return ctxRef.current;
  }

  function beep(freq: number, ms: number, type: OscillatorType, gain: number) {
    if (muted) return;
    const c = ctx();
    if (!c || !unlockedRef.current) return;

    const o = c.createOscillator();
    const g = c.createGain();

    o.type = type;
    o.frequency.value = freq;

    const t0 = c.currentTime;
    const t1 = t0 + ms / 1000;

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t1);

    o.connect(g);
    g.connect(c.destination);

    o.start(t0);
    o.stop(t1 + 0.02);
  }

  function click() { beep(1200, 35, "square", 0.06); beep(800, 25, "square", 0.04); }
  function success() { beep(523.25, 90, "sine", 0.08); setTimeout(() => beep(659.25, 110, "sine", 0.08), 55); setTimeout(() => beep(783.99, 130, "sine", 0.08), 110); }
  function error() { beep(140, 140, "sawtooth", 0.10); setTimeout(() => beep(90, 120, "sawtooth", 0.10), 80); }

  return { muted, setMuted, playTap: click, playSuccess: success, playError: error };
}