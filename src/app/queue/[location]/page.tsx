// src/app/queue/[location]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type QueueItem = {
  id?: string; // requestId
  requestId?: string;
  songId?: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
  score?: number;
  // allow unknown extra fields without breaking
  [key: string]: any;
};

function getRequestId(x: QueueItem) {
  return (x.requestId || x.id || "").toString();
}

function getSongId(x: QueueItem) {
  return (x.songId || x.song?.id || "").toString();
}

function getTitle(x: QueueItem) {
  return (x.title || x.song?.title || "").toString();
}

function getArtist(x: QueueItem) {
  return (x.artist || x.song?.artist || "").toString();
}

function getArtwork(x: QueueItem) {
  return (x.artworkUrl || x.song?.artworkUrl || "").toString();
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

  const [rules, setRules] = useState<{ costUpvote?: number; costDownvote?: number; enableVoting?: boolean } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  // bootstrap identity + email
  useEffect(() => {
    try {
      const lsIdentity = (localStorage.getItem("rr_identityId") || "").trim();
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();
      const lsEmail = (localStorage.getItem("rr_email") || "").trim();

      if (lsLocation && lsLocation !== location) {
        // location mismatch: don't auto-trust old identity
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

  async function refreshBalanceAndRules() {
    try {
      // your request page uses /api/public/balance and /api/public/rules/[location]
      // if either fails, we still want queue/voting to function.
      const [bRes, rRes] = await Promise.all([
        fetch(`/api/public/balance?location=${encodeURIComponent(location)}&email=${encodeURIComponent(email)}`, { cache: "no-store" }).catch(() => null),
        fetch(`/api/public/rules/${encodeURIComponent(location)}`, { cache: "no-store" }).catch(() => null),
      ]);

      if (bRes && bRes.ok) {
        const b = await bRes.json();
        if (typeof b?.balance === "number") setBalance(b.balance);
      }

      if (rRes && rRes.ok) {
        const r = await rRes.json();
        // support both {rules:{...}} and {...}
        const rr = r?.rules || r;
        setRules({
          enableVoting: !!rr?.enableVoting,
          costUpvote: Number(rr?.costUpvote ?? 1),
          costDownvote: Number(rr?.costDownvote ?? 1),
        });
      }
    } catch {
      // ignore
    }
  }

  async function tickQueue() {
    setLoading(true);
    setMsg("");
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
    tickQueue();
    const t = setInterval(tickQueue, 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useEffect(() => {
    if (email) refreshBalanceAndRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, location]);

  const votingEnabled = rules?.enableVoting !== false;

  const canVote = useMemo(() => {
    return !!email && (verified || !!identityId);
  }, [email, verified, identityId]);

  async function vote(requestId: string, dir: "up" | "down") {
    setMsg("");

    if (!email) {
      setMsg("Enter your email to vote.");
      return;
    }
    if (!verified && !identityId) {
      setMsg("Please verify to unlock voting.");
      return;
    }
    if (!votingEnabled) {
      setMsg("Voting is disabled right now.");
      return;
    }

    try {
      const res = await fetch(`/api/public/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location,
          requestId,
          vote: dir,
          email,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setMsg(data?.error || "Vote failed.");
        // refresh balance anyway (could have changed)
        refreshBalanceAndRules();
        return;
      }

      // success: refresh queue + balance
      await Promise.all([tickQueue(), refreshBalanceAndRules()]);
    } catch {
      setMsg("Vote failed.");
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1 }}>QUEUE & VOTING</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Tap 👍 or 👎 to vote • Live updates
          </div>
        </div>

        <div className="neonPanel" style={{ padding: 12, minWidth: 220, textAlign: "right" }}>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, letterSpacing: 1 }}>POINTS</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{typeof balance === "number" ? balance : "—"}</div>
          <button className="neonBtn neonBtnPrimary" style={{ marginTop: 8 }} onClick={() => refreshBalanceAndRules()}>
            Refresh
          </button>
        </div>
      </div>

      {/* finish setup */}
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
              style={{ flex: 1 }}
            />
            <button
              className="neonBtn neonBtnPrimary"
              onClick={() => {
                const e = email.trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
                  setMsg("Please enter a valid email.");
                  return;
                }
                try {
                  localStorage.setItem("rr_email", e);
                } catch {}
                setMsg("✅ Email saved.");
                refreshBalanceAndRules();
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
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      flex: "0 0 auto",
                    }}
                  >
                    {art ? <img src={art} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
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
            {votingEnabled ? `Upvote costs ${rules?.costUpvote ?? 1} • Downvote costs ${rules?.costDownvote ?? 1}` : "Voting disabled"}
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
                  style={{ padding: 12, display: "flex", gap: 12, alignItems: "center", border: "1px solid rgba(255,255,255,0.10)" }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      flex: "0 0 auto",
                    }}
                  >
                    {art ? <img src={art} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
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
                      disabled={!canVote || !votingEnabled || !requestId}
                      onClick={() => vote(requestId, "down")}
                      title="Downvote"
                      style={{ paddingInline: 12 }}
                    >
                      👎
                    </button>
                    <button
                      className="neonBtn neonBtnPrimary"
                      disabled={!canVote || !votingEnabled || !requestId}
                      onClick={() => vote(requestId, "up")}
                      title="Upvote"
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
      </div>

      <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 12 }}>
        Tip: Add <code>/queue/{location}</code> as a QR code on the tables so guests can vote from their phones.
      </div>
    </div>
  );
}