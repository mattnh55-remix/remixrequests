// src/app/queue/[location]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedBalanceCounter from "../../../../components/ui/neon/AnimatedBalanceCounter";
import { useAnimatedBalance } from "../../../../components/ui/neon/useAnimatedBalance";

type QueueItem = {
  id?: string;        // request id (some payloads)
  requestId?: string; // request id (other payloads)
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
  // some builds nest rules under rules.rules
  rulesObj?: any;
  [key: string]: any;
};

function getRequestId(x: QueueItem) {
  return String(x.requestId || x.id || "");
}
function getTitle(x: QueueItem) {
  return String(x.title || x.song?.title || "");
}
function getArtist(x: QueueItem) {
  return String(x.artist || x.song?.artist || "");
}
function getArtwork(x: QueueItem) {
  return String(x.artworkUrl || x.song?.artworkUrl || "");
}

/* ---------- Album art with safe fallback ---------- */
function AlbumArt({ src, alt }: { src?: string; alt?: string }) {
  const [bad, setBad] = useState(false);
  const real = (src || "").trim();

  if (!real || bad) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 12,
          background: "linear-gradient(135deg, rgba(0,255,200,0.10), rgba(255,0,180,0.10))",
          display: "grid",
          placeItems: "center",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div
          style={{
            fontWeight: 900,
            letterSpacing: 2,
            opacity: 0.8,
            fontSize: 12,
            textTransform: "uppercase",
          }}
        >
          Remix
        </div>
      </div>
    );
  }

  return (
    <img
      src={real}
      alt={alt || ""}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBad(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 12 }}
    />
  );
}

/* ---------- WebAudio SFX (same approach as request page) ---------- */
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
        if (ctxRef.current?.state === "suspended") {
          await ctxRef.current.resume();
        }
        unlockedRef.current = true;
      } catch {
        // ignore
      }
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
    } catch {
      // ignore
    }
  }

  return {
    muted,
    setMuted: (v: boolean) => {
      setMuted(v);
      try {
        window.localStorage.setItem("neonMuted", v ? "1" : "0");
      } catch {}
    },
    playTap: () => beep(520, 0.05, 0.05),
    playSuccess: () => {
      beep(740, 0.05, 0.05);
      setTimeout(() => beep(980, 0.06, 0.05), 55);
    },
    playError: () => {
      beep(220, 0.08, 0.06);
      setTimeout(() => beep(180, 0.08, 0.06), 70);
    },
  };
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

  if (h > 0) return `Ends in ${h}h ${m}m`;
  return `Ends in ${m}m`;
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

  // animated points (same system as request page)
  const bal = useAnimatedBalance(async () => {
    const id = (identityId || "").trim();
    if (!id) throw new Error("Missing identityId");
    const res = await fetch(
      `/api/public/balance?location=${encodeURIComponent(location)}&identityId=${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "Balance error");
    return Number(data.balance || 0);
  });

  // bootstrap identity + email
  useEffect(() => {
    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();
      const lsEmail = (localStorage.getItem("rr_email") || "").trim();

      if (lsLocation && lsLocation !== location) {
        setIdentityId(null);
        setVerified(false);
      } else {
        if (lsIdentity) {
          setIdentityId(lsIdentity);
          setVerified(true);
        }
      }
      if (lsEmail) setEmail(lsEmail);
    } catch {
      // ignore
    }
  }, [location]);

  // persist email
  useEffect(() => {
    try {
      const e = email.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) localStorage.setItem("rr_email", e);
    } catch {
      // ignore
    }
  }, [email]);

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${encodeURIComponent(location)}`, { cache: "no-store" });
      const data = await res.json();
      setSessionInfo(data);

      // try to align with request page structure
      const endsAt = data?.session?.endsAt;
      setSessionCountdown(formatCountdown(endsAt || null));
    } catch {
      // silent
    }
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
    const t2 = setInterval(() => {
      const endsAt = sessionInfo?.session?.endsAt;
      setSessionCountdown(formatCountdown(endsAt || null));
    }, 15000);
    return () => {
      clearInterval(t);
      clearInterval(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useEffect(() => {
    // when identity arrives, load balance once
    if (identityId) bal.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityId]);

  const locationName = sessionInfo?.location?.name || "Remix Skate & Event Center";

  const rules = sessionInfo?.rules || sessionInfo?.rulesObj || sessionInfo?.rules?.rules || sessionInfo?.rules?.rulesObj || sessionInfo?.rules;
  const enableVoting = rules?.enableVoting !== false;
  const costUpvote = Number(rules?.costUpvote ?? 1);
  const costDownvote = Number(rules?.costDownvote ?? 1);

  const canVote = useMemo(() => !!email && (verified || !!identityId), [email, verified, identityId]);

  async function doVote(requestId: string, dir: "up" | "down") {
    setMsg("");

    if (!email) {
      sfx.playError();
      setMsg("Enter your email to vote.");
      return;
    }
    if (!verified && !identityId) {
      sfx.playError();
      setMsg("Please verify to unlock voting.");
      return;
    }
    if (!enableVoting) {
      sfx.playError();
      setMsg("Voting is disabled right now.");
      return;
    }

    sfx.playTap();

    try {
      const res = await fetch(`/api/public/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, requestId, vote: dir, email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        sfx.playError();
        setMsg(data?.error || "Vote failed.");
        // balance may have changed
        bal.refresh();
        return;
      }

      sfx.playSuccess();
      await Promise.all([tickQueue(), bal.refresh()]);
    } catch {
      sfx.playError();
      setMsg("Vote failed.");
    }
  }

  return (
    <div className="neonRoot">
      {/* Matches request page wallpaper layer */}
      <div className="rrWall" />

      <div className="neonWrap" style={{ paddingBottom: 40 }}>
        {/* HEADER (mirrors request page) */}
        <div className="neonHeader neonHeader3">
          <div className="neonHeaderLeft">
            {rules?.logoUrl ? (
              <img className="neonLogo" src={rules.logoUrl} alt={`${locationName} logo`} />
            ) : (
              <div className="neonLogoFallback">REMIX</div>
            )}
          </div>

          <div className="neonHeaderCenter">
            <div className="neonTitle">QUEUE &amp; VOTING</div>
            <div className="neonSub">
              {locationName} • Tap 👎 or 👍 to vote • {sessionCountdown || "Live updates"}
            </div>
          </div>

          <div className="neonHeaderRight">
            <div className="neonHud">
              <div className="neonHudLabel">POINTS</div>
              <div className="neonHudValue">
                <AnimatedBalanceCounter value={typeof bal.balance === "number" ? bal.balance : 0} />
              </div>
              <button className="neonHudBtn" onClick={() => bal.refresh()}>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Finish setup (same concept as request page) */}
        {(verified || identityId) && !email ? (
          <div className="neonPanel" style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", marginBottom: 14 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.3, marginBottom: 6 }}>Finish setup</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>
              Enter your email to unlock voting on this device.
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
                  try {
                    localStorage.setItem("rr_email", e);
                  } catch {}
                  sfx.playSuccess();
                  setMsg("✅ Email saved.");
                }}
                style={{ whiteSpace: "nowrap" }}
              >
                Save
              </button>
            </div>
          </div>
        ) : null}

        {msg ? (
          <div className="neonPanel" style={{ padding: 10, marginBottom: 12 }}>
            {msg}
          </div>
        ) : null}

        {/* NOW PLAYING */}
        <div className="neonPanel" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>Now Playing</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{loading ? "Loading…" : ""}</div>
          </div>

          {playNow.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {playNow.map((x, idx) => {
                const title = getTitle(x) || "—";
                const artist = getArtist(x) || "";
                const art = getArtwork(x);
                return (
                  <div key={`${getRequestId(x) || idx}`} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 54, height: 54, borderRadius: 12, overflow: "hidden", flex: "0 0 auto" }}>
                      <AlbumArt src={art} alt={title} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                      <div style={{ color: "var(--muted)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {artist}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Nothing playing right now.</div>
          )}
        </div>

        {/* UP NEXT */}
        <div className="neonPanel" style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>Up Next</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              {enableVoting ? `Upvote costs ${costUpvote} • Downvote costs ${costDownvote}` : "Voting disabled"}
            </div>
          </div>

          {upNext.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {upNext.map((x, idx) => {
                const requestId = getRequestId(x);
                const title = getTitle(x) || "—";
                const artist = getArtist(x) || "";
                const art = getArtwork(x);
                const score = typeof x.score === "number" ? x.score : undefined;

                return (
                  <div
                    key={`${requestId || idx}`}
                    className="neonPanel"
                    style={{
                      padding: 12,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "linear-gradient(135deg, rgba(0,255,200,0.05), rgba(255,0,180,0.05))",
                    }}
                  >
                    <div style={{ width: 54, height: 54, borderRadius: 12, overflow: "hidden", flex: "0 0 auto" }}>
                      <AlbumArt src={art} alt={title} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                        {typeof score === "number" ? (
                          <div style={{ fontSize: 12, color: "var(--muted)", flex: "0 0 auto" }}>Score {score}</div>
                        ) : null}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {artist}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        className="neonBtn"
                        disabled={!canVote || !enableVoting || !requestId}
                        onClick={() => doVote(requestId, "down")}
                        title={`Downvote (-${costDownvote})`}
                        style={{ paddingInline: 12 }}
                      >
                        👎
                      </button>
                      <button
                        className="neonBtn neonBtnPrimary"
                        disabled={!canVote || !enableVoting || !requestId}
                        onClick={() => doVote(requestId, "up")}
                        title={`Upvote (-${costUpvote})`}
                        style={{ paddingInline: 12 }}
                      >
                        👍
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>No pending requests yet.</div>
          )}

          <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>
            Tip: Add <code>/queue/{location}</code> as a QR code on the tables so guests can vote from their phones.
          </div>
        </div>
      </div>
    </div>
  );
}
