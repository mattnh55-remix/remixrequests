// src/app/queue/[location]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnimatedBalance } from "../../../../components/ui/neon/useAnimatedBalance";

type QueueItem = {
  id?: string;
  requestId?: string;
  songId?: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
  score?: number;
  song?: { id?: string; title?: string; artist?: string; artworkUrl?: string };
  [key: string]: any;
};

type SessionRes = {
  location?: { slug?: string; name?: string };
  session?: { id?: string; endsAt?: string };
  rules?: {
    enableVoting?: boolean;
    costUpvote?: number;
    costDownvote?: number;
    logoUrl?: string | null;
  };
  rulesObj?: any;
  [key: string]: any;
};

function getRequestId(x: QueueItem) { return String(x.requestId || x.id || ""); }
function getTitle(x: QueueItem) { return String(x.title || x.song?.title || ""); }
function getArtist(x: QueueItem) { return String(x.artist || x.song?.artist || ""); }
function getArtwork(x: QueueItem) { return String(x.artworkUrl || x.song?.artworkUrl || ""); }

function AlbumArt({ src, alt }: { src?: string; alt?: string }) {
  const [bad, setBad] = useState(false);
  const real = (src || "").trim();
  if (!real || bad) {
    return (
      <div style={{ width: "100%", height: "100%", borderRadius: 12, background: "linear-gradient(135deg, rgba(0,255,200,0.10), rgba(255,0,180,0.10))", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ fontWeight: 900, letterSpacing: 2, opacity: 0.8, fontSize: 12, textTransform: "uppercase" }}>Remix</div>
      </div>
    );
  }
  return <img src={real} alt={alt || ""} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 12 }} />;
}

function useNeonSfx() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("neonMuted") === "1";
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
        if (ctxRef.current?.state === "suspended") await ctxRef.current.resume();
      } catch {}
    };
    const onFirst = () => unlock();
    window.addEventListener("pointerdown", onFirst, { once: true });
    return () => window.removeEventListener("pointerdown", onFirst);
  }, []);

  function beep(freq: number, dur = 0.06, gain = 0.06) {
    if (muted) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch {}
  }

  return {
    muted,
    setMuted: (v: boolean) => {
      setMuted(v);
      try { window.localStorage.setItem("neonMuted", v ? "1" : "0"); } catch {}
    },
    playTap: () => beep(520, 0.05, 0.05),
    playSuccess: () => { beep(740, 0.05, 0.05); setTimeout(() => beep(980, 0.06, 0.05), 55); },
    playError: () => { beep(220, 0.08, 0.06); setTimeout(() => beep(180, 0.08, 0.06), 70); },
  };
}


function CountUpNumber({ value, pulseKey }: { value: number; pulseKey?: number }) {
  const [display, setDisplay] = useState<number>(Number.isFinite(value) ? value : 0);
  const prevRef = useRef<number>(Number.isFinite(value) ? value : 0);

  useEffect(() => {
    const next = Number.isFinite(value) ? value : 0;
    const start = prevRef.current;
    if (start === next) {
      setDisplay(next);
      return;
    }

    const duration = 420;
    const startedAt = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = start + (next - start) * eased;
      setDisplay(next >= start ? Math.floor(current) : Math.ceil(current));
      if (t < 1) raf = window.requestAnimationFrame(step);
      else {
        setDisplay(next);
        prevRef.current = next;
      }
    };

    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [value, pulseKey]);

  return (
    <div key={pulseKey} className="rrCornerHudNumber" style={{ animation: "rrPop 420ms ease-out" }}>
      {display}
    </div>
  );
}

function formatCountdown(endsAtIso?: string | null) {
  if (!endsAtIso) return "";
  const endsAt = new Date(endsAtIso);
  const diffMs = endsAt.getTime() - Date.now();
  if (!Number.isFinite(diffMs)) return "";
  if (diffMs <= 0) return "Ends soon";
  const total = Math.floor(diffMs / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`;
}

export default function QueuePage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [email, setEmail] = useState("");
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [playNow, setPlayNow] = useState<QueueItem[]>([]);
  const [upNext, setUpNext] = useState<QueueItem[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionRes | null>(null);
  const [sessionCountdown, setSessionCountdown] = useState("");

  const sfx = useNeonSfx();

  const bal = useAnimatedBalance(async () => {
    const id = (identityId || "").trim();
    if (!id) throw new Error("Missing identityId");
    const res = await fetch(`/api/public/balance?location=${encodeURIComponent(location)}&identityId=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "Balance error");
    return Number(data.balance || 0);
  });

  useEffect(() => {
    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();
      const lsEmail = (localStorage.getItem("rr_email") || "").trim();
      if (lsLocation && lsLocation !== location) {
        setIdentityId(null);
        setVerified(false);
      } else if (lsIdentity) {
        setIdentityId(lsIdentity);
        setVerified(true);
      }
      if (lsEmail) setEmail(lsEmail);
    } catch {}
  }, [location]);

  useEffect(() => {
    try {
      const e = email.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) localStorage.setItem("rr_email", e);
    } catch {}
  }, [email]);

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${encodeURIComponent(location)}`, { cache: "no-store" });
      const data = await res.json();
      setSessionInfo(data);
      setSessionCountdown(formatCountdown(data?.session?.endsAt || null));
    } catch {}
  }

  async function tickQueue() {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/queue/${encodeURIComponent(location)}`, { cache: "no-store" });
      const data = await res.json();
      setPlayNow(Array.isArray(data?.playNow) ? data.playNow : []);
      setUpNext(Array.isArray(data?.upNext) ? data.upNext : []);
      setLoading(false);
    } catch {
      setLoading(false);
      setMsg("Could not load queue.");
    }
  }

  useEffect(() => {
    refreshSession();
    tickQueue();
    const t = setInterval(tickQueue, 2500);
    const t2 = setInterval(() => setSessionCountdown(formatCountdown(sessionInfo?.session?.endsAt || null)), 15000);
    return () => { clearInterval(t); clearInterval(t2); };
  }, [location, sessionInfo?.session?.endsAt]);

  useEffect(() => { if (identityId) bal.refreshOnce(); }, [identityId]);

  const locationName = sessionInfo?.location?.name || "Remix Skate & Event Center";
  const rules = sessionInfo?.rules;
  const enableVoting = rules?.enableVoting !== false;
  const costUpvote = Number(rules?.costUpvote ?? 1);
  const costDownvote = Number(rules?.costDownvote ?? 1);
  const canVote = useMemo(() => !!email && (verified || !!identityId), [email, verified, identityId]);
  const hudBalance = !verified && !identityId ? 5 : typeof bal.balance === "number" ? bal.balance : 0;

  function handleCornerHudAction() {
    sfx.playTap();
    if (!verified && !identityId) {
      window.location.href = `/request/${location}?verify=1`;
      return;
    }
    window.location.href = `/request/${location}?buy=1&reason=boost`;
  }

  async function doVote(requestId: string, dir: "up" | "down") {
    const needed = dir === "up" ? costUpvote : costDownvote;
    setMsg("");

    if (!email) {
      sfx.playError();
      setMsg("Enter your email to vote.");
      return;
    }
    if (!verified && !identityId) {
      sfx.playError();
      window.location.href = `/request/${location}?verify=1`;
      return;
    }
    if (!enableVoting) {
      sfx.playError();
      setMsg("Voting is disabled right now.");
      return;
    }
    if ((bal.balance ?? 0) < needed) {
      sfx.playError();
      window.location.href = `/request/${location}?buy=1&reason=notEnough`;
      return;
    }

    sfx.playTap();
    try {
      const res = await fetch(`/api/public/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ location, requestId, vote: dir, email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        sfx.playError();
        setMsg(data?.error || "Vote failed.");
        bal.refreshOnce();
        return;
      }
      sfx.playSuccess();
      await Promise.all([tickQueue(), bal.refreshOnce()]);
    } catch {
      sfx.playError();
      setMsg("Vote failed.");
    }
  }

  return (
    <div className="neonRoot">
      <div className="rrWall" />
      <div className="neonWrap" style={{ paddingBottom: 40 }}>
        <div className="neonHeader neonHeader3">
          <div className="neonHeaderLeft">
            {rules?.logoUrl ? <img className="neonLogo" src={rules.logoUrl} alt={`${locationName} logo`} /> : <div className="neonLogoFallback">REMIX</div>}
          </div>

          <div className="neonHeaderCenter">
            <div className="neonTitle">QUEUE &amp; VOTING</div>
            <div className="neonSub">{locationName} • Tap 👎 or 👍 to vote • {sessionCountdown || "Live updates"}</div>
          </div>

          <div className="neonHeaderRight">
            <div className={`rrCornerHud ${(verified || identityId) && typeof bal.balance === "number" && bal.balance <= 2 ? "rrCornerHudLow" : ""}`}>
              <div className="rrCornerHudLabel">
                <span className="rrPointsDesktop">POINTS</span>
                <span className="rrPointsMobile">PTS</span>
              </div>
              <div className="rrCornerHudValue">
                <CountUpNumber value={hudBalance} pulseKey={bal.pulseKey} />
              </div>
              <button className={`neonBtn neonBtnPrimary rrCornerHudBtn ${!verified && !identityId ? "neonPulse" : ""}`} onClick={handleCornerHudAction}>
                {!verified && !identityId ? "USE" : "ADD POINTS"}
              </button>
            </div>
          </div>
        </div>

        {(verified || identityId) && !email ? (
          <div className="neonPanel" style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", marginBottom: 14 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.3, marginBottom: 6 }}>Finish setup</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>Enter your email to unlock voting on this device.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" className="neonInput" autoComplete="email" onFocus={() => sfx.playTap()} style={{ flex: 1 }} />
              <button className="neonBtn neonBtnPrimary" onClick={() => { sfx.playTap(); const e = email.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { sfx.playError(); setMsg("Please enter a valid email."); return; } try { localStorage.setItem("rr_email", e); } catch {} sfx.playSuccess(); setMsg("✅ Email saved."); }} style={{ whiteSpace: "nowrap" }}>Save</button>
            </div>
          </div>
        ) : null}

        {msg ? <div className="neonPanel" style={{ padding: 10, marginBottom: 12 }}>{msg}</div> : null}

        <div className="neonPanel" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.3, fontSize: 16 }}>Boosted</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{loading ? "Loading…" : ""}</div>
          </div>
          {playNow.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {playNow.map((x, idx) => {
                const title = getTitle(x) || "—";
                const artist = getArtist(x) || "";
                const art = getArtwork(x);
                return (
                  <div key={`${getRequestId(x) || idx}`} className="neonPanel" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center", border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(135deg, rgba(0,255,200,0.06), rgba(255,0,180,0.06))" }}>
                    <div style={{ width: 54, height: 54, borderRadius: 12, overflow: "hidden", flex: "0 0 auto" }}><AlbumArt src={art} alt={title} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                      <div style={{ color: "var(--muted)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artist}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ color: "var(--muted)", fontSize: 13 }}>Nothing playing right now.</div>}
        </div>

        <div className="neonPanel" style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.3, fontSize: 16 }}>Up Next</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{enableVoting ? `Upvote costs ${costUpvote} • Downvote costs ${costDownvote}` : "Voting disabled"}</div>
          </div>
          {upNext.length ? (
            <div style={{ display: "grid", gap: 12 }}>
              {upNext.map((x, idx) => {
                const requestId = getRequestId(x);
                const title = getTitle(x) || "—";
                const artist = getArtist(x) || "";
                const art = getArtwork(x);
                const score = typeof x.score === "number" ? x.score : 0;
                return (
                  <div key={`${requestId || idx}`} className="neonPanel" style={{ padding: 12, display: "grid", gridTemplateColumns: "54px minmax(0, 1fr) auto", gap: 12, alignItems: "center", border: "1px solid rgba(255,255,255,0.12)", background: "linear-gradient(135deg, rgba(0,255,200,0.05), rgba(255,0,180,0.05))" }}>
                    <div style={{ width: 54, height: 54, borderRadius: 12, overflow: "hidden" }}><AlbumArt src={art} alt={title} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                      <div style={{ color: "var(--muted)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 3 }}>{artist}</div>
                    </div>
                    <div style={{ display: "grid", gap: 8, justifyItems: "center", minWidth: 76 }}>
                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800, letterSpacing: 0.2, textAlign: "center" }}>Score <span style={{ color: "var(--text)", fontSize: 15, fontWeight: 1000 }}>{score}</span></div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button className="neonBtn" disabled={!canVote || !enableVoting || !requestId} onClick={() => doVote(requestId, "down")} title={`Downvote (-${costDownvote})`} style={{ width: 40, minWidth: 40, height: 40, padding: 0, display: "grid", placeItems: "center" }}>👎</button>
                        <button className="neonBtn neonBtnPrimary" disabled={!canVote || !enableVoting || !requestId} onClick={() => doVote(requestId, "up")} title={`Upvote (-${costUpvote})`} style={{ width: 40, minWidth: 40, height: 40, padding: 0, display: "grid", placeItems: "center" }}>👍</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ color: "var(--muted)", fontSize: 13 }}>No pending requests yet.</div>}
          <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>Tip: Add <code>/queue/{location}</code> as a QR code on the tables so guests can vote from their phones.</div>
        </div>
      </div>
    </div>
  );
}
