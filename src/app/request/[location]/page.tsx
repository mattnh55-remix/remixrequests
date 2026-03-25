"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useAnimatedBalance } from "../../../../components/ui/neon/useAnimatedBalance";
import PublicTheme from "../../../components/ui/public/PublicTheme";

const REMIX_LOGO_URL =
  "https://skateremix.com/wp-content/uploads/2026/03/Remix_Globe_Logo_350px.png";

const RAILS = [
  "All Ages",
  "Adult Night",
  "TikTok",
  "DISCO",
  "80s",
  "90s",
  "2000s",
  "Boy Bands",
  "Pop Hits",
  "Mom’s Hits",
  "Dad Rock",
] as const;

type Song = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  explicit?: boolean;
  tags?: string[];
};

type QueuePreviewItem = {
  id?: string;
  requestId?: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
  score?: number;
  requestedByMe?: boolean;
  song?: {
    title?: string;
    artist?: string;
    artworkUrl?: string;
  };
  request?: {
    title?: string;
    artist?: string;
    artworkUrl?: string;
  };
};

type SessionRes = {
  ok?: boolean;
  location?: { slug?: string; name?: string };
  session?: { id?: string; endsAt?: string };
  rules?: {
    logoUrl?: string | null;
    buyUrl?: string | null;
    costRequest?: number;
    costPlayNow?: number;
    packTier1PriceCents?: number | null;
    packTier2PriceCents?: number | null;
    packTier3PriceCents?: number | null;
    packTier4PriceCents?: number | null;
  };
};

type PackageKey = "5_10" | "10_25" | "15_35" | "20_50";

type UiPack = {
  id: string;
  title: string;
  subtitle: string;
  creditsLabel: string;
  priceCents?: number;
  packageKey?: PackageKey;
  highlight?: boolean;
  badge?: string;
};

type BalanceRes = {
  ok: boolean;
  balance?: number;
  error?: string;
};

type FlyAnim = {
  key: number;
  src?: string;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
};

const BUY_URL_BY_LOCATION: Record<string, string> = {};

function formatCountdown(endsAt?: string | null) {
  if (!endsAt) return "Session live";
  const endMs = new Date(endsAt).getTime();
  if (!Number.isFinite(endMs)) return "Session live";
  const diff = Math.max(0, endMs - Date.now());
  if (diff <= 0) return "Ending soon";

  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (h <= 0 && m <= 2) return "Ending soon";
  return h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`;
}

function getQueueTitle(item: QueuePreviewItem) {
  return String(item.title || item.song?.title || item.request?.title || "Untitled");
}

function getQueueArtist(item: QueuePreviewItem) {
  return String(item.artist || item.song?.artist || item.request?.artist || "Unknown artist");
}

function getQueueArtwork(item: QueuePreviewItem) {
  return String(item.artworkUrl || item.song?.artworkUrl || item.request?.artworkUrl || "");
}

function AlbumArt({ src, alt }: { src?: string; alt?: string }) {
  const [bad, setBad] = useState(false);
  const real = (src || "").trim();

  if (!real || bad) {
    return (
      <div className="rrRequestArt rrRequestArt--lg">
        <div className="rrArtFallback">RMX</div>
      </div>
    );
  }

  return (
    <div className="rrRequestArt rrRequestArt--lg">
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

function TinyArt({ src, alt }: { src?: string; alt?: string }) {
  const [bad, setBad] = useState(false);
  const real = (src || "").trim();

  if (!real || bad) {
    return (
      <div className="rrArt">
        <div className="rrArtFallback">RMX</div>
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
  const src = (logoUrl || REMIX_LOGO_URL || "").trim();

  if (src) {
    return (
      <div className="rrBrandLogo">
        <img src={src} alt="Remix logo" />
      </div>
    );
  }

  return <div className="rrBrandBadge">REMIX</div>;
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
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {}
  }

  return {
    muted,
    setMuted: (next: boolean) => {
      setMuted(next);
      try {
        window.localStorage.setItem("rr_public_muted", next ? "1" : "0");
      } catch {}
    },
    playTap: () => beep(510, 0.05, 0.04),
    playSuccess: () => {
      beep(720, 0.05, 0.05);
      window.setTimeout(() => beep(980, 0.06, 0.05), 60);
    },
    playError: () => {
      beep(220, 0.08, 0.06);
      window.setTimeout(() => beep(180, 0.08, 0.06), 70);
    },
  };
}

function HoldButton({
  idleLabel,
  busyLabel,
  successLabel,
  onConfirm,
  disabled,
  className,
}: {
  idleLabel: string;
  busyLabel: string;
  successLabel: string;
  onConfirm: (el?: HTMLButtonElement | null) => Promise<boolean> | boolean;
  disabled?: boolean;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const lockedRef = useRef(false);

  const [holding, setHolding] = useState(false);
  const [label, setLabel] = useState(idleLabel);

  function setFill(p: number) {
    if (fillRef.current) {
      fillRef.current.style.width = `${Math.max(0, Math.min(100, p * 100))}%`;
    }
  }

  function hardReset() {
    lockedRef.current = false;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setHolding(false);
    setFill(0);
    setLabel(idleLabel);
  }

  async function completeHold() {
    lockedRef.current = true;
    setHolding(false);
    setLabel(busyLabel);

    let ok = false;
    try {
      ok = Boolean(await Promise.resolve(onConfirm(buttonRef.current)));
    } catch {
      ok = false;
    }

    if (!ok) {
      hardReset();
      return;
    }

    setLabel(successLabel);
    window.setTimeout(() => hardReset(), 700);
  }

  function tick(ts: number) {
    if (startRef.current == null) startRef.current = ts;
    const elapsed = ts - startRef.current;
    const p = Math.min(elapsed / 650, 1);
    setFill(p);

    if (p < 0.32) setLabel("HOLD TO CONFIRM");
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

function startHold(e: PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || lockedRef.current) return;
    setHolding(true);
    startRef.current = null;
    setFill(0);
    setLabel("HOLD TO CONFIRM");
    rafRef.current = requestAnimationFrame(tick);
  }

function cancelHold(e?: PointerEvent<HTMLButtonElement>) {
    e?.preventDefault();
    e?.stopPropagation();
    if (lockedRef.current) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setHolding(false);
    setFill(0);
    setLabel(idleLabel);
  }

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      className={className || "rrBtnGhost"}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={fillRef}
        style={{
          position: "absolute",
          inset: 0,
          width: 0,
          background:
            "linear-gradient(90deg, rgba(21,146,162,0.35), rgba(157,47,125,0.35))",
          transition: holding ? "none" : "width 0.14s ease",
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
    </button>
  );
}

function VerifyDrawer({
  open,
  location,
  email,
  setEmail,
  redeemBusy,
  onRedeem,
  onVerified,
  onClose,
}: {
  open: boolean;
  location: string;
  email: string;
  setEmail: (value: string) => void;
  redeemBusy: boolean;
  onRedeem: (code: string) => void;
  onVerified: (payload: { identityId?: string; email?: string }) => void;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"collect" | "code">("collect");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [redeemCode, setRedeemCode] = useState("");

  useEffect(() => {
    if (!open) {
      setPhone("");
      setCode("");
      setStep("collect");
      setMsg("");
      setRedeemCode("");
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
          emailOptIn,
          smsOptIn,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setMsg(data.error || "Could not send code.");
        return;
      }

      setStep("code");
      setMsg("Code sent.");
    } catch {
      setMsg("Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
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
        setMsg(data.error || "Code verification failed.");
        return;
      }

      const nextIdentityId = String(data.identityId || data.identity?.id || "").trim();
      const nextEmail = String(data.email || email || "").trim();

      try {
        if (nextIdentityId) localStorage.setItem("rr_identityId", nextIdentityId);
        if (location) localStorage.setItem("rr_location", String(location));
        if (nextEmail) localStorage.setItem("rr_email", nextEmail);
      } catch {}

      onVerified({ identityId: nextIdentityId, email: nextEmail });
      onClose();
    } catch {
      setMsg("Code verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rrOverlay">
      <div className="rrDrawer">
        <div className="rrDrawerHead">
          <div>
            <div className="rrDrawerTitle">Claim your points</div>
            <div className="rrDrawerSub">
              Verify once to unlock your intro points and start requesting.
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
                <label className="rrHelper">
                  <input
                    type="checkbox"
                    checked={emailOptIn}
                    onChange={(e) => setEmailOptIn(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  Email me updates and bonus offers
                </label>
                <label className="rrHelper">
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={(e) => setSmsOptIn(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  Text me verification and promo updates
                </label>
                <button className="rrBtn" disabled={busy} onClick={sendCode}>
                  {busy ? "Sending..." : "Send verification code"}
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
                <button className="rrBtn" disabled={busy} onClick={confirmCode}>
                  {busy ? "Verifying..." : "Verify & continue"}
                </button>
                <button className="rrBtnGhost" disabled={busy} onClick={() => setStep("collect")}>
                  Back
                </button>
              </>
            )}

            <div className="rrDivider" />

            <div className="rrStack">
              <div className="rrDrawerTitle rrDrawerTitle--small">Redeem code</div>
              <input
                className="rrInput"
                placeholder="Enter redemption code"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
              />
              <button
                className="rrBtnGhost"
                disabled={redeemBusy}
                onClick={() => onRedeem(redeemCode)}
              >
                {redeemBusy ? "Redeeming..." : "Redeem code"}
              </button>
            </div>

            {msg ? <div className="rrHelper">{msg}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function BuyDrawer({
  open,
  onClose,
  packs,
  redeemCode,
  setRedeemCode,
  redeemBusy,
  onRedeem,
  onBuy,
  buyReason,
}: {
  open: boolean;
  onClose: () => void;
  packs: UiPack[];
  redeemCode: string;
  setRedeemCode: (value: string) => void;
  redeemBusy: boolean;
  onRedeem: (code: string) => void;
  onBuy: (key: PackageKey) => void;
  buyReason: "none" | "out" | "notEnough" | "boost";
}) {
  if (!open) return null;

  const title =
    buyReason === "boost"
      ? "Get more points"
      : buyReason === "notEnough"
        ? "Not enough points"
        : buyReason === "out"
          ? "You’re out of points"
          : "Get points";

  return (
    <div className="rrOverlay">
      <div className="rrDrawer">
        <div className="rrDrawerHead">
          <div>
            <div className="rrDrawerTitle">{title}</div>
            <div className="rrDrawerSub">
              Buy a pack or redeem a code to keep the party moving.
            </div>
          </div>
          <button className="rrBtnGhost rrCloseBtn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="rrDrawerBody">
          <div className="rrPackList">
            {packs.map((pack) => (
              <div key={pack.id} className="rrPackRow">
                <div className="rrPackCopy">
                  <div className="rrPackTitle">
                    {pack.title}
                    {pack.badge ? <span className="rrTag rrTag--boost">{pack.badge}</span> : null}
                  </div>
                  <div className="rrPackMeta">
                    {pack.creditsLabel} • {pack.subtitle}
                  </div>
                </div>

                <button
                  className={pack.highlight ? "rrBtn" : "rrBtnGhost"}
                  onClick={() => pack.packageKey && onBuy(pack.packageKey)}
                >
                  Buy • ${(Number(pack.priceCents || 0) / 100).toFixed(2)}
                </button>
              </div>
            ))}
          </div>

          <div className="rrDivider" />

          <div className="rrStack">
            <div className="rrPackTitle">Redeem code</div>
            <div className="rrTwoCol">
              <input
                className="rrInput"
                placeholder="Promo or redemption code"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
              />
              <button
                className="rrBtnGhost"
                disabled={redeemBusy}
                onClick={() => onRedeem(redeemCode)}
              >
                {redeemBusy ? "Redeeming..." : "Redeem"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestPage({ params }: { params: { location: string } }) {
  const location = decodeURIComponent(params.location);

  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [rules, setRules] = useState<SessionRes | null>(null);
  const [msg, setMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);

  const [queuePreview, setQueuePreview] = useState<{
    playNow: QueuePreviewItem[];
    upNext: QueuePreviewItem[];
  }>({ playNow: [], upNext: [] });

  const [verified, setVerified] = useState(false);
  const [identityId, setIdentityId] = useState("");
  const [showVerify, setShowVerify] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [buyReason, setBuyReason] = useState<"none" | "out" | "notEnough" | "boost">("none");
  const [sessionCountdown, setSessionCountdown] = useState("Session live");
  const [successTileId, setSuccessTileId] = useState<string | null>(null);
  const [queuePulseOn, setQueuePulseOn] = useState(false);
  const [flyAnim, setFlyAnim] = useState<FlyAnim | null>(null);

  const queueTargetRef = useRef<HTMLButtonElement | null>(null);
  const flyTimerRef = useRef<number | null>(null);
  const tileSuccessTimerRef = useRef<number | null>(null);
  const queuePulseTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const flyKeyRef = useRef(0);
  const prevUserRequestIdsRef = useRef<Set<string>>(new Set());

  const sfx = usePublicSfx();

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
    return () => {
      if (flyTimerRef.current != null) window.clearTimeout(flyTimerRef.current);
      if (tileSuccessTimerRef.current != null) window.clearTimeout(tileSuccessTimerRef.current);
      if (queuePulseTimerRef.current != null) window.clearTimeout(queuePulseTimerRef.current);
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!msg) {
      setToastOpen(false);
      if (toastTimerRef.current != null) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      return;
    }

    setToastOpen(true);
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastOpen(false);
      window.setTimeout(() => setMsg(""), 220);
    }, 3400);

    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    };
  }, [msg]);

  useEffect(() => {
    try {
      const e = email.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        localStorage.setItem("rr_email", e);
      }
    } catch {}
  }, [email]);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const verify = sp.get("verify");
      const buy = sp.get("buy");
      const reason = sp.get("reason");

      if (verify === "1") setShowVerify(true);
      if (buy === "1") {
        if (
          reason === "out" ||
          reason === "notEnough" ||
          reason === "boost"
        ) {
          setBuyReason(reason);
        } else {
          setBuyReason("none");
        }
        setShowBuy(true);
      }
    } catch {}
  }, []);

  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${location}`, { cache: "no-store" });
      const data = (await res.json()) as SessionRes;
      setRules(data);
      setSessionCountdown(formatCountdown(data?.session?.endsAt || null));
    } catch {}
  }

  async function refreshQueuePreview() {
    try {
      const res = await fetch(`/api/public/queue/${location}`, { cache: "no-store" });
      const data = await res.json();

      const playNow = Array.isArray(data?.playNow) ? data.playNow : [];
      const upNext = Array.isArray(data?.upNext) ? data.upNext : [];
      const currentIds = new Set<string>();

      for (const q of [...playNow, ...upNext]) {
        if (q?.requestedByMe && q?.id) currentIds.add(String(q.id));
      }

      if (prevUserRequestIdsRef.current.size > 0) {
        for (const id of prevUserRequestIdsRef.current) {
          if (!currentIds.has(id)) {
            setMsg("Your request couldn't be played. Points have been returned.");
            break;
          }
        }
      }

      prevUserRequestIdsRef.current = currentIds;
      setQueuePreview({ playNow, upNext });
    } catch {}
  }

  async function loadSongs() {
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (tag) qs.set("tag", tag);

      const res = await fetch(`/api/public/songs/${location}?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setSongs(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setSongs([]);
    }
  }

  useEffect(() => {
    void refreshSession();
  }, [location]);

  useEffect(() => {
    void loadSongs();
  }, [location, search, tag]);

  useEffect(() => {
    const id = window.setInterval(() => void refreshSession(), 12000);
    return () => window.clearInterval(id);
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
      }

      if (location && lsLocation !== location) {
        localStorage.setItem("rr_location", String(location));
      }
    } catch {}
  }, [location]);

  useEffect(() => {
    if (!identityId) return;
    const t = window.setTimeout(() => {
      bal.refreshOnce();
    }, 900);
    return () => window.clearTimeout(t);
  }, [identityId, location]);

  useEffect(() => {
    setSessionCountdown(formatCountdown(rules?.session?.endsAt || null));
    const id = window.setInterval(() => {
      setSessionCountdown(formatCountdown(rules?.session?.endsAt || null));
    }, 15000);
    return () => window.clearInterval(id);
  }, [rules?.session?.endsAt]);

  useEffect(() => {
    void refreshQueuePreview();
    const id = window.setInterval(() => void refreshQueuePreview(), 12000);
    return () => window.clearInterval(id);
  }, [location]);

  function dismissToast() {
    setToastOpen(false);
    if (toastTimerRef.current != null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    window.setTimeout(() => setMsg(""), 220);
  }

  function openBuy(reason: typeof buyReason) {
    setBuyReason(reason);
    setShowBuy(true);
    sfx.playTap();
  }

  function handlePointsAction() {
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
      setMsg(`Redeemed +${data.pointsAdded ?? ""} points.`);
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

  async function startCheckout(packageKey: PackageKey) {
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

    if (tileSuccessTimerRef.current != null) {
      window.clearTimeout(tileSuccessTimerRef.current);
    }
    tileSuccessTimerRef.current = window.setTimeout(() => setSuccessTileId(null), 650);

    setQueuePulseOn(true);
    if (queuePulseTimerRef.current != null) {
      window.clearTimeout(queuePulseTimerRef.current);
    }
    queuePulseTimerRef.current = window.setTimeout(() => setQueuePulseOn(false), 800);

    if (!sourceEl || !queueTargetRef.current) return;

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = queueTargetRef.current.getBoundingClientRect();

    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

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

  async function submit(
    song: Song,
    action: "play_next" | "play_now",
    sourceEl?: HTMLElement | null
  ) {
    if (!verified && !identityId) {
      sfx.playError();
      setMsg("Please verify to unlock points.");
      setShowVerify(true);
      return false;
    }

    const costRequest = Number(rules?.rules?.costRequest ?? 1);
    const costPlayNow = Number(rules?.rules?.costPlayNow ?? 5);
    const required = action === "play_now" ? costPlayNow : costRequest;

    if (typeof bal.balance === "number" && bal.balance < required) {
      sfx.playError();
      setMsg(action === "play_now" ? "Not enough points for boost." : "Not enough points.");
      openBuy(action === "play_now" ? "boost" : "notEnough");
      return false;
    }

    try {
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
      triggerSuccessVisuals(song, sourceEl);

      if (typeof data?.balance === "number") bal.applyBalance(data.balance);
      else if (typeof data?.credits?.balance === "number") bal.applyBalance(data.credits.balance);
      else bal.refreshOnce();

      await refreshQueuePreview();
      setMsg(action === "play_now" ? "Boost sent to the booth." : "Request added to the queue.");
      return true;
    } catch {
      sfx.playError();
      setMsg("Something went wrong.");
      return false;
    }
  }

  const locationName = rules?.location?.name || "Remix Skate & Event Center";
  const logoUrl = rules?.rules?.logoUrl || REMIX_LOGO_URL;
  const balanceValue = !verified && !identityId ? 5 : Number(bal.balance || 0);
  const requestCost = Number(rules?.rules?.costRequest ?? 1);
  const playNowCost = Number(rules?.rules?.costPlayNow ?? 5);

  const trending = useMemo(() => songs.slice(0, 8), [songs]);

  const buyUrl = useMemo(() => {
    const fromMap = BUY_URL_BY_LOCATION[location];
    if (fromMap) return fromMap;
    return rules?.rules?.buyUrl ?? process.env.NEXT_PUBLIC_REMIXREQUESTS_BUY_URL ?? null;
  }, [location, rules]);

  const packs: UiPack[] = useMemo(() => {
    const p1 = Number(rules?.rules?.packTier1PriceCents ?? 500);
    const p2 = Number(rules?.rules?.packTier2PriceCents ?? 1000);
    const p3 = Number(rules?.rules?.packTier3PriceCents ?? 1500);
    const p4 = Number(rules?.rules?.packTier4PriceCents ?? 2000);

    return [
      {
        id: "p1",
        title: "Quick Boost",
        subtitle: "Best for one request run",
        creditsLabel: "10 points",
        priceCents: p1,
        packageKey: "5_10",
      },
      {
        id: "p2",
        title: "Party Pack",
        subtitle: "Great for a family visit",
        creditsLabel: "25 points",
        priceCents: p2,
        packageKey: "10_25",
      },
      {
        id: "p3",
        title: "Bonus Pack",
        subtitle: "More requests, more voting",
        creditsLabel: "35 points",
        priceCents: p3,
        packageKey: "15_35",
        highlight: true,
        badge: "Popular",
      },
      {
        id: "p4",
        title: "All Night",
        subtitle: "Heavy queue control",
        creditsLabel: "50 points",
        priceCents: p4,
        packageKey: "20_50",
        badge: "Best Value",
      },
    ];
  }, [rules]);

  const queuePreviewItems = [...queuePreview.playNow, ...queuePreview.upNext].slice(0, 3);

  return (
    <PublicTheme>
      <div className="rrHeroGrid">
        <div className="rrLogoCard">
          <BrandLogo logoUrl={logoUrl} />
        </div>

        <div className="rrHeroCard">
          <h1 className="rrTitle">Request a Song</h1>
          <div className="rrTitleSub">
            Search tracks, send requests, and push favorites toward the booth.
          </div>
        </div>

        <div className="rrPointsCard">
          <div className="rrPointsStack">
            <div className="rrHudLabel">Points</div>
            <div className="rrHudValue">{balanceValue}</div>
            <div className="rrPointsActions">
              <button className="rrBtn" style={{ width: "100%" }} onClick={handlePointsAction}>
                {verified || identityId ? "Add Points" : "Claim Points"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rrNoticeCard">
        <div className="rrNoticeHeadRow">
          <div>
            <div className="rrNoticeTitle">Tonight at {locationName}</div>
            <div className="rrNoticeText">
              {sessionCountdown}. Requests cost {requestCost} point. Boosts cost {playNowCost} points.
            </div>
          </div>
          <span className="rrStatusPill rrStatusPill--live">{sessionCountdown}</span>
        </div>

        <div className="rrNoticeActions" style={{ marginTop: 8 }}>
          <button
            ref={queueTargetRef}
            className="rrBtn"
            onClick={() => {
              sfx.playTap();
              window.location.href = `/queue/${encodeURIComponent(location)}`;
            }}
          >
            View Queue
          </button>

          {!verified && !identityId ? (
            <button
              className="rrBtnGhost"
              onClick={() => {
                sfx.playTap();
                setShowVerify(true);
              }}
            >
              Verify Device
            </button>
          ) : (
            <button className="rrBtnGhost" onClick={() => openBuy("boost")}>
              Buy / Redeem
            </button>
          )}
        </div>
      </div>

      {queuePreviewItems.length ? (
        <div className={`rrPanel ${queuePulseOn ? "rrPanel--pulse" : ""}`}>
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Coming Up</div>
              <div className="rrPanelSub">Quick preview from the live queue.</div>
            </div>
            <span className="rrStatusPill">{queuePreviewItems.length} items</span>
          </div>

          <div className="rrPanelBody rrPanelBodyGrid">
            {queuePreviewItems.map((item, index) => (
              <div key={String(item.id || index)} className="rrQueueRow">
                <div className="rrQueueRank">{index + 1}</div>
                <TinyArt src={getQueueArtwork(item)} alt={getQueueTitle(item)} />
                <div className="rrQueueCopy">
                  <div className="rrQueueTopline">
                    <div className="rrQueueTitle">{getQueueTitle(item)}</div>
                    <div className="rrQueueMetaInline">• {getQueueArtist(item)}</div>
                  </div>
                  <div className="rrQueueTagRow">
                    {index === 0 ? (
                      <span className="rrTag rrTag--boost">Play Now</span>
                    ) : (
                      <span className="rrTag rrTag--request">Up Next</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rrPanel">
        <div className="rrPanelHead">
          <div>
            <div className="rrPanelTitle">Search & Browse</div>
            <div className="rrPanelSub">
              Use tags to narrow the catalog, then hold to request or boost.
            </div>
          </div>
          <span className="rrStatusPill rrStatusPill--live">Live</span>
        </div>

        <div className="rrPanelBody">
          <input
            className="rrInput"
            placeholder="Search songs or artists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => sfx.playTap()}
          />

          <div className="rrRequestChipRow">
            <button
              className={`rrRequestChip ${tag === "" ? "is-active" : ""}`}
              onClick={() => {
                sfx.playTap();
                setTag("");
              }}
            >
              All
            </button>

            {RAILS.map((rail) => (
              <button
                key={rail}
                className={`rrRequestChip ${tag === rail ? "is-active" : ""}`}
                onClick={() => {
                  sfx.playTap();
                  setTag(rail);
                }}
              >
                {rail}
              </button>
            ))}
          </div>
        </div>
      </div>

      {trending.length ? (
        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Trending at Remix</div>
              <div className="rrPanelSub">Fast picks for tonight’s crowd.</div>
            </div>
          </div>

          <div className="rrPanelBody">
            <div className="rrTrendingRail">
              {trending.map((song) => (
                <div key={song.id} className="rrTrendingCard">
                  <TinyArt src={song.artworkUrl} alt={song.title} />
                  <div className="rrTrendingCopy">
                    <div className="rrTrendingTitle">{song.title}</div>
                    <div className="rrTrendingMeta">
                      {song.artist} • {requestCost}pt
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rrPanel">
        <div className="rrPanelHead">
          <div>
            <div className="rrPanelTitle">Song List</div>
            <div className="rrPanelSub">
              {songs.length ? `${songs.length} available` : "No songs found right now."}
            </div>
          </div>
        </div>

        <div className="rrPanelBody rrPanelBodyGrid">
          {songs.length ? (
            songs.map((song) => {
              const isSuccess = successTileId === song.id;
              const isHot = trending.some((x) => x.id === song.id);

              return (
                <div
                  key={song.id}
                  className={`rrSongRow ${isSuccess ? "rrSongRow--success" : ""}`}
                >
                  <AlbumArt src={song.artworkUrl} alt={song.title} />

                  <div className="rrSongCopy">
                    <div className="rrSongTitle">{song.title}</div>
                    <div className="rrSongMeta">{song.artist}</div>

                    <div className="rrSongMetaRow">
                      {isHot ? <span className="rrTag rrTag--boost">Hot</span> : null}
                      <span className="rrMetaPill">{requestCost}pt</span>
                      <span className="rrMetaPill">{playNowCost}pt boost</span>
                      {song.explicit ? <span className="rrMetaPill">Explicit</span> : null}
                    </div>
                  </div>

                  <div className="rrSongActions">
                    <HoldButton
                      idleLabel="REQUEST"
                      busyLabel="REQUESTING..."
                      successLabel="ADDED!"
                      onConfirm={(el) => submit(song, "play_next", el)}
                    />
                    <HoldButton
                      idleLabel="BOOST"
                      busyLabel="BOOSTING..."
                      successLabel="SENT!"
                      onConfirm={(el) => submit(song, "play_now", el)}
                      className="rrBtn"
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rrEmpty">No songs matched that search.</div>
          )}
        </div>
      </div>

      <div className="rrFooterBar">
        <div className="rrFooterInner">
          <button
            className="rrBtn rrFooterCta"
            onClick={() => {
              sfx.playTap();
              window.location.href = `/queue/${encodeURIComponent(location)}`;
            }}
          >
            View Queue & Voting
          </button>

          <button className="rrBtnGhost" onClick={() => openBuy("boost")}>
            Get Points
          </button>
        </div>
      </div>

      {toastOpen && msg ? (
        <div className="rrToast">
          <div className="rrToastInner">
            <div className="rrToastText">{msg}</div>
            <button className="rrBtnGhost" onClick={dismissToast}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      <VerifyDrawer
        open={showVerify}
        location={location}
        email={email}
        setEmail={setEmail}
        redeemBusy={redeemBusy}
        onRedeem={redeem}
        onClose={() => setShowVerify(false)}
        onVerified={({ identityId: nextIdentityId, email: nextEmail }) => {
          const cleanId = String(nextIdentityId || "").trim();
          const cleanEmail = String(nextEmail || email || "").trim();

          if (cleanId) {
            setIdentityId(cleanId);
            setVerified(true);
            void bal.refreshOnce();
          }

          if (cleanEmail) setEmail(cleanEmail);
          setMsg("Verification complete. Your points are ready.");
        }}
      />

      <BuyDrawer
        open={showBuy}
        onClose={() => setShowBuy(false)}
        packs={packs}
        redeemCode={redeemCode}
        setRedeemCode={setRedeemCode}
        redeemBusy={redeemBusy}
        onRedeem={redeem}
        onBuy={startCheckout}
        buyReason={buyReason}
      />

      {flyAnim ? (
        <div
          style={{
            position: "fixed",
            left: flyAnim.startX,
            top: flyAnim.startY,
            width: 34,
            height: 34,
            marginLeft: -17,
            marginTop: -17,
            borderRadius: 12,
            overflow: "hidden",
            zIndex: 80,
            pointerEvents: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(135deg, rgba(46, 56, 74, 0.9), rgba(21, 28, 42, 0.96))",
            animation: `rrFlyAnim-${flyAnim.key} 900ms ease forwards`,
          }}
        >
          {flyAnim.src ? (
            <img
              src={flyAnim.src}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div
              className="rrArtFallback"
              style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}
            >
              RMX
            </div>
          )}

          <style jsx>{`
            @keyframes rrFlyAnim-${flyAnim.key} {
              0% {
                transform: translate(0px, 0px) scale(1);
                opacity: 1;
              }
              100% {
                transform: translate(${flyAnim.deltaX}px, ${flyAnim.deltaY}px) scale(0.52);
                opacity: 0.15;
              }
            }
          `}</style>
        </div>
      ) : null}


    </PublicTheme>
  );
}