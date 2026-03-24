"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnimatedBalance } from "../../../../components/ui/neon/useAnimatedBalance";
import PublicGunmetalTheme from "../../../components/ui/public/PublicGunmetalTheme";

type QueueItem = {
  id?: string;
  requestId?: string;
  songId?: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
  score?: number;
  requestedByMe?: boolean;
  song?: {
    id?: string;
    title?: string;
    artist?: string;
    artworkUrl?: string;
  };
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
};

function getRequestId(x: QueueItem) {
  return String(x.requestId || x.id || "");
}
function getTitle(x: QueueItem) {
  return String(x.title || x.song?.title || "Untitled");
}
function getArtist(x: QueueItem) {
  return String(x.artist || x.song?.artist || "Unknown artist");
}
function getArtwork(x: QueueItem) {
  return String(x.artworkUrl || x.song?.artworkUrl || "");
}

function formatCountdown(endsAtIso?: string | null) {
  if (!endsAtIso) return "";
  const endsAt = new Date(endsAtIso);
  const diffMs = endsAt.getTime() - Date.now();
  if (!Number.isFinite(diffMs)) return "";
  if (diffMs <= 0) return "Ending soon";
  const total = Math.floor(diffMs / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`;
}

function TinyArt({ src, alt }: { src?: string; alt?: string }) {
  const [bad, setBad] = useState(false);
  const real = (src || "").trim();

  if (!real || bad) {
    return (
      <div className="rrArt">
        <div className="rrArtFallback">Remix</div>
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

function usePublicSfx() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("rr_public_muted") === "1";
  });
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const unlock = async () => {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        if (!ctxRef.current) ctxRef.current = new Ctx();
        if (ctxRef.current?.state === "suspended") await ctxRef.current.resume();
      } catch {}
    };
    const onFirst = () => void unlock();
    window.addEventListener("pointerdown", onFirst, { once: true });
    return () => window.removeEventListener("pointerdown", onFirst);
  }, []);

  function beep(freq: number, dur = 0.06, gain = 0.05) {
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
    playTap: () => beep(510, 0.05, 0.04),
    playSuccess: () => {
      beep(720, 0.05, 0.05);
      window.setTimeout(() => beep(980, 0.06, 0.05), 60);
    },
    playError: () => {
      beep(220, 0.08, 0.06);
      window.setTimeout(() => beep(180, 0.08, 0.06), 70);
    },
    muted,
    setMuted: (next: boolean) => {
      setMuted(next);
      try {
        window.localStorage.setItem("rr_public_muted", next ? "1" : "0");
      } catch {}
    },
  };
}

function VerifyPrompt({
  open,
  location,
  email,
  setEmail,
  onClose,
}: {
  open: boolean;
  location: string;
  email: string;
  setEmail: (value: string) => void;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"collect" | "code">("collect");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open) {
      setPhone("");
      setCode("");
      setStep("collect");
      setMsg("");
    }
  }, [open]);

  if (!open) return null;

  async function sendCode() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/public/auth/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location,
          email,
          phone,
          emailOptIn: true,
          smsOptIn: true,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg(data.error || "Could not send code.");
        return;
      }
      setStep("code");
    } catch {
      setMsg("Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/public/auth/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location,
          email,
          phone,
          code,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg(data.error || "Verification failed.");
        return;
      }

      const nextIdentityId = String(data.identityId || data.identity?.id || "").trim();
      const nextEmail = String(data.email || email || "").trim();

      try {
        if (nextIdentityId) localStorage.setItem("rr_identityId", nextIdentityId);
        if (location) localStorage.setItem("rr_location", String(location));
        if (nextEmail) localStorage.setItem("rr_email", nextEmail);
      } catch {}

      window.location.reload();
    } catch {
      setMsg("Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rrOverlay">
      <div className="rrDrawer">
        <div className="rrDrawerHead">
          <div>
            <div className="rrDrawerTitle">Verify to vote</div>
            <div className="rrDrawerSub">
              Claim points once, then use them to upvote or downvote the live queue.
            </div>
          </div>
          <button className="rrBtnGhost rrCloseBtn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="rrDrawerBody">
          <div className="rrStack">
            {step === "collect" ? (
              <>
                <input
                  className="rrInput"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  className="rrInput"
                  placeholder="Mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <button className="rrBtn" disabled={busy} onClick={sendCode}>
                  {busy ? "Sending..." : "Send code"}
                </button>
              </>
            ) : (
              <>
                <input
                  className="rrInput"
                  placeholder="Enter verification code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <button className="rrBtn" disabled={busy} onClick={verify}>
                  {busy ? "Verifying..." : "Verify & continue"}
                </button>
                <button className="rrBtnGhost" disabled={busy} onClick={() => setStep("collect")}>
                  Back
                </button>
              </>
            )}

            {msg ? <div className="rrHelper">{msg}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
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
  const [showVerify, setShowVerify] = useState(false);

  const sfx = usePublicSfx();

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
      const res = await fetch(`/api/public/session/${encodeURIComponent(location)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as SessionRes;
      setSessionInfo(data);
      setSessionCountdown(formatCountdown(data?.session?.endsAt || null));
    } catch {}
  }

  async function tickQueue() {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/queue/${encodeURIComponent(location)}`, {
        cache: "no-store",
      });
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
    void refreshSession();
    void tickQueue();
    const t = window.setInterval(() => void tickQueue(), 2500);
    const t2 = window.setInterval(() => {
      setSessionCountdown(formatCountdown(sessionInfo?.session?.endsAt || null));
    }, 15000);
    return () => {
      window.clearInterval(t);
      window.clearInterval(t2);
    };
  }, [location, sessionInfo?.session?.endsAt]);

  useEffect(() => {
    if (identityId) void bal.refreshOnce();
  }, [identityId]);

  async function vote(requestId: string, direction: "up" | "down") {
    if (!verified || !identityId) {
      sfx.playError();
      setShowVerify(true);
      return;
    }

    const endpoint = direction === "up" ? "/api/public/vote/upvote" : "/api/public/vote/downvote";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location,
          email,
          requestId,
        }),
      });

      const data = await res.json();
      if (!data?.ok) {
        sfx.playError();
        setMsg(data?.error || "Vote failed.");
        return;
      }

      sfx.playSuccess();

      if (typeof data?.balance === "number") bal.applyBalance(data.balance);
      else if (typeof data?.credits?.balance === "number") bal.applyBalance(data.credits.balance);
      else bal.refreshOnce();

      setMsg(direction === "up" ? "Upvote added." : "Downvote added.");
      await tickQueue();
    } catch {
      sfx.playError();
      setMsg("Vote failed.");
    }
  }

  const locationName = sessionInfo?.location?.name || "Remix Skate & Event Center";
  const rules = sessionInfo?.rules;
  const enableVoting = rules?.enableVoting !== false;
  const costUpvote = Number(rules?.costUpvote ?? 1);
  const costDownvote = Number(rules?.costDownvote ?? 1);
  const hudBalance = !verified && !identityId ? 5 : typeof bal.balance === "number" ? bal.balance : 0;

  return (
    <div className="rrPublicPage">
      <PublicGunmetalTheme />

      <div className="rrPublicShell">
        <div className="rrPublicTopbar">
          <div className="rrBrandBadge">REMIX</div>

          <div className="rrHero">
            <div className="rrEyebrow">Live Queue & Voting</div>
            <h1 className="rrTitle">Queue & Voting</h1>
            <div className="rrTitleSub">
              {locationName} • Tap to vote • {sessionCountdown || "Session live"}
            </div>
          </div>

          <div className="rrHudCard">
            <div className="rrHudLabel">Points</div>
            <div className="rrHudValue">{hudBalance}</div>
            <button
              className="rrBtn"
              onClick={() => {
                sfx.playTap();
                window.location.href = `/request/${location}`;
              }}
            >
              Back to Requests
            </button>
          </div>
        </div>

        <div className="rrPanel" style={{ marginBottom: 14 }}>
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Current session</div>
              <div className="rrPanelSub">
                Voting uses your live points balance.
              </div>
            </div>
            <div className="rrStatusPill rrStatusPill--live">{sessionCountdown || "Live"}</div>
          </div>
          <div className="rrPanelBody">
            <div className="rrChipRow" style={{ marginBottom: 0 }}>
              <span className="rrMetaPill">Upvote {costUpvote}pt</span>
              <span className="rrMetaPill">Downvote {costDownvote}pt</span>
              {enableVoting ? (
                <span className="rrStatusPill rrStatusPill--live">Voting On</span>
              ) : (
                <span className="rrStatusPill rrStatusPill--warn">Voting Off</span>
              )}
            </div>
          </div>
        </div>

        <div className="rrPanel" style={{ marginBottom: 14 }}>
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Play Now Lane</div>
              <div className="rrPanelSub">Highest priority requests.</div>
            </div>
          </div>
          <div className="rrPanelBody">
            <div className="rrQueueSection">
              {playNow.length === 0 ? (
                <div className="rrEmpty">No boosted requests right now.</div>
              ) : (
                playNow.map((item) => (
                  <div key={getRequestId(item)} className="rrQueueRow">
                    <TinyArt src={getArtwork(item)} alt={getTitle(item)} />
                    <div style={{ minWidth: 0 }}>
                      <div className="rrQueueTitle">{getTitle(item)}</div>
                      <div className="rrQueueMeta">
                        {getArtist(item)} • Score {Number(item.score || 0)}
                      </div>
                      <div className="rrChipRow" style={{ marginTop: 8, marginBottom: 0 }}>
                        <span className="rrTag rrTag--boost">Boosted</span>
                        <span className="rrTag rrTag--request">Request</span>
                      </div>
                    </div>
                    {enableVoting ? (
                      <div className="rrQueueActions">
                        <button
                          className="rrIconBtn"
                          onClick={() => vote(getRequestId(item), "down")}
                          aria-label="Downvote"
                        >
                          👎
                        </button>
                        <button
                          className="rrIconBtn"
                          onClick={() => vote(getRequestId(item), "up")}
                          aria-label="Upvote"
                        >
                          👍
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Coming Up</div>
              <div className="rrPanelSub">The next songs in live order.</div>
            </div>
            <div className="rrMetaPill">{loading ? "Refreshing..." : `${upNext.length} items`}</div>
          </div>
          <div className="rrPanelBody">
            <div className="rrQueueSection">
              {upNext.length === 0 ? (
                <div className="rrEmpty">Nothing queued yet.</div>
              ) : (
                upNext.map((item) => (
                  <div key={getRequestId(item)} className="rrQueueRow">
                    <TinyArt src={getArtwork(item)} alt={getTitle(item)} />
                    <div style={{ minWidth: 0 }}>
                      <div className="rrQueueTitle">{getTitle(item)}</div>
                      <div className="rrQueueMeta">
                        {getArtist(item)} • Score {Number(item.score || 0)}
                      </div>
                      <div className="rrChipRow" style={{ marginTop: 8, marginBottom: 0 }}>
                        <span className="rrTag rrTag--queued">Queued</span>
                        {item.requestedByMe ? (
                          <span className="rrTag rrTag--interstitial">Mine</span>
                        ) : null}
                      </div>
                    </div>
                    {enableVoting ? (
                      <div className="rrQueueActions">
                        <button
                          className="rrIconBtn"
                          onClick={() => vote(getRequestId(item), "down")}
                          aria-label="Downvote"
                        >
                          👎
                        </button>
                        <button
                          className="rrIconBtn"
                          onClick={() => vote(getRequestId(item), "up")}
                          aria-label="Upvote"
                        >
                          👍
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rrFooterBar">
        <div className="rrFooterInner">
          <button className="rrBtn rrFooterCta" onClick={() => (window.location.href = `/request/${location}`)}>
            Back to Requests
          </button>
          <button
            className="rrBtnGhost"
            onClick={() => {
              if (!verified || !identityId) {
                setShowVerify(true);
                return;
              }
              window.location.href = `/request/${location}?buy=1&reason=boost`;
            }}
          >
            Get Points
          </button>
        </div>
      </div>

      {msg ? (
        <div className="rrToast">
          <div className="rrToastRow">
            <div className="rrToastText">{msg}</div>
            <button className="rrBtnGhost" onClick={() => setMsg("")}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      <VerifyPrompt
        open={showVerify}
        location={location}
        email={email}
        setEmail={setEmail}
        onClose={() => setShowVerify(false)}
      />
    </div>
  );
}