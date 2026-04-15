// src/app/request/[location]/page.tsx

"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useAnimatedBalance } from "../../../../components/ui/neon/useAnimatedBalance";
import PublicTheme from "../../../components/ui/public/PublicTheme";
import PublicBottomCommandBar from "@/components/public/PublicBottomCommandBar";
import confetti from "canvas-confetti";

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
  featureBoost?: number;
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
    defaultAlbumArtUrl?: string | null;
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
  priceCents: number;
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

function resolveArtworkSrc(primary?: string | null, fallback?: string | null) {
  const first = String(primary ?? "").trim();
  if (first) return first;

  const second = String(fallback ?? "").trim();
  if (second) return second;

  return "";
}

function parseWriteInSearchInput(input: string) {
  const cleaned = String(input || "").trim().replace(/^["']+|["']+$/g, "");
  if (!cleaned) {
    return { requestedTitle: "", requestedArtist: "" };
  }

  const dashIndex = cleaned.lastIndexOf(" - ");
  if (dashIndex > 0) {
    return {
      requestedTitle: cleaned.slice(0, dashIndex).trim(),
      requestedArtist: cleaned.slice(dashIndex + 3).trim(),
    };
  }

  const byMatch = cleaned.match(/^(.*)\s+by\s+(.*)$/i);
  if (byMatch) {
    return {
      requestedTitle: String(byMatch[1] || "").trim(),
      requestedArtist: String(byMatch[2] || "").trim(),
    };
  }

  return {
    requestedTitle: cleaned,
    requestedArtist: "",
  };
}

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

function AlbumArt({
  src,
  fallbackSrc,
  alt,
}: {
  src?: string;
  fallbackSrc?: string | null;
  alt?: string;
}) {
  const [badPrimary, setBadPrimary] = useState(false);
  const [badFallback, setBadFallback] = useState(false);

  const primarySrc = String(src || "").trim();
  const backupSrc = String(fallbackSrc || "").trim();
  const real =
    !badPrimary && primarySrc
      ? primarySrc
      : !badFallback && backupSrc && backupSrc !== primarySrc
        ? backupSrc
        : "";

  if (!real) {
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
        onError={() => {
          if (real === primarySrc) setBadPrimary(true);
          else setBadFallback(true);
        }}
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

  useEffect(() => {
    if (!holding && !lockedRef.current) {
      setLabel(idleLabel);
    }
  }, [idleLabel, holding]);

  // 👉 Detect mobile (simple + reliable)
  const isMobile =
    typeof window !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // 👉 Mobile faster, desktop unchanged
  const HOLD_MS = isMobile ? 420 : 650;

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
    const p = Math.min(elapsed / HOLD_MS, 1);
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

        // ✅ CRITICAL: fixes iOS long-press conflict
        touchAction: "manipulation",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
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

      <span
        style={{
          position: "relative",
          zIndex: 1,
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
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
  onVerified: (payload: {
    identityId?: string;
    email?: string;
    balance?: number;
    note?: string;
    welcomeGranted?: boolean;
  }) => void;
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
      const res = await fetch("/api/public/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          email,
          phone,
          code,
          emailOptIn,
          smsOptIn,
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

      onVerified({
        identityId: nextIdentityId,
        email: nextEmail,
        balance: typeof data.balance === "number" ? data.balance : undefined,
        note: data.note,
        welcomeGranted: Boolean(data.welcomeGranted),
      });
            onClose();
    } catch {
      setMsg("Code verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rrOverlay rrOverlay--mobile">
      <div className="rrDrawer rrDrawer--mobile">
        <div className="rrDrawerHead">
          <div>
            <div className="rrDrawerTitle">Get Your Song in the Queue</div>
            <div className="rrDrawerSub">
              Quick sign-in unlocks song requests, boosts, voting, and bonus point promos.
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

                <label className="rrCheckRow">
                  <input
                    type="checkbox"
                    checked={emailOptIn}
                    onChange={(e) => setEmailOptIn(e.target.checked)}
                  />
                  <span>Email me bonus offers, points, and event updates</span>
                </label>

                <label className="rrCheckRow">
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={(e) => setSmsOptIn(e.target.checked)}
                  />
                  <span>Text me verification codes and occasional promos</span>
                </label>

                <button className="rrBtn" disabled={busy} onClick={sendCode}>
                  {busy ? "Sending code..." : "Start Requesting Songs"}
                </button>

                <div className="rrHelper">
                  This only takes a few seconds, then you’re ready to request.
                </div>
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
                  {busy ? "Verifying..." : "Verify & Continue"}
                </button>

                <button className="rrBtnGhost" disabled={busy} onClick={() => setStep("collect")}>
                  Back
                </button>
              </>
            )}

            <div className="rrDivider" />

            <div className="rrStack">
              <div className="rrDrawerTitle rrDrawerTitle--small">Have a promo or point code?</div>

              <div className="rrInlineForm">
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
                  {redeemBusy ? "Redeeming..." : "Redeem"}
                </button>
              </div>
            </div>

            {msg ? <div className="rrVerifyMsg">{msg}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function BuyCreditsDrawer({
  open,
  busy,
  packs,
  redeemCode,
  setRedeemCode,
  redeemBusy,
  onClose,
  onBuy,
  onRedeem,
}: {
  open: boolean;
  busy: boolean;
  packs: {
    id?: string;
    title: string;
    subtitle?: string;
    creditsLabel: string;
    badge?: string;
    highlight?: boolean;
    cta?: string;
    priceCents: number;
    packageKey?: string;
    href?: string;
  }[];
  redeemCode: string;
  setRedeemCode: (v: string) => void;
  redeemBusy: boolean;
  onClose: () => void;
  onBuy: (packageKey?: string, href?: string) => void;
  onRedeem: () => void;
}) {
  const [showRedeem, setShowRedeem] = useState(false);

  if (!open) return null;

  return (
    <div className="rrOverlay" onClick={onClose}>
      <div className="rrDrawer rrDrawer--buy" onClick={(e) => e.stopPropagation()}>
        <div className="rrDrawerHead rrDrawerHead--buy">
          <div>
            <div className="rrDrawerTitle">Take Over the Playlist</div>
            <div className="rrDrawerSub">
              Boost your songs to the front, outvote the crowd, and keep the floor moving your way.
            </div>
          </div>
          <button className="rrBtnGhost rrCloseBtn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="rrDrawerBody">
          <div className="rrBuyLead">
            <div className="rrBuyLeadTitle">Most songs are being boosted right now.</div>
            <div className="rrBuyLeadText">
              Regular requests wait in line. Boosts get noticed first.
            </div>
          </div>

          <div className="rrBuyPackGrid">
            {packs.map((p) => {
              const pointsNum = Number(String(p.creditsLabel).replace(/\D/g, "")) || 0;
              const approxRequests = pointsNum;

              return (
                <div
                  key={`${p.packageKey || p.href || p.title}`}
                  className={`rrBuyPackCard ${p.highlight ? "rrBuyPackCard--featured" : ""}`}
                >
                  <div className="rrBuyPackTop">
                    <div className="rrBuyPackTitleRow">
                      <div className="rrBuyPackTitle">{p.title}</div>
                      {p.badge ? (
                        <span className={`rrMetaPill ${p.highlight ? "rrBuyPackBadge--featured" : ""}`}>
                          {p.badge}
                        </span>
                      ) : null}
                    </div>

                    {p.subtitle ? <div className="rrBuyPackSubtitle">{p.subtitle}</div> : null}
                  </div>

                  <div className="rrBuyPackValueRow">
                    <div className="rrBuyPackPoints">{p.creditsLabel}</div>
                    <div className="rrBuyPackUsage">About {approxRequests} requests</div>
                  </div>

                  <div className="rrBuyPackPrice">${(p.priceCents / 100).toFixed(2)}</div>

                  <button
                    className={`rrBtn ${p.highlight ? "rrBtn--featuredPack" : ""}`}
                    disabled={busy}
                    onClick={() => onBuy(p.packageKey, p.href)}
                  >
                    {busy ? "Opening..." : `Get ${p.creditsLabel}`}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="rrDivider" />

          <div className="rrStack">
            {!showRedeem ? (
              <button className="rrBtnGhost" onClick={() => setShowRedeem(true)}>
                Have a Code?
              </button>
            ) : (
              <>
                <div className="rrDrawerTitle rrDrawerTitle--small">Redeem Code</div>
                <div className="rrInlineForm">
                  <input
                    className="rrInput"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    placeholder="Enter redeem code"
                  />
                  <button className="rrBtnGhost" disabled={redeemBusy} onClick={onRedeem}>
                    {redeemBusy ? "Checking..." : "Redeem"}
                  </button>
                </div>
              </>
            )}
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
  const [sessionActive, setSessionActive] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [buyReason, setBuyReason] = useState<"none" | "out" | "notEnough" | "boost">("none");
  const [sessionCountdown, setSessionCountdown] = useState("Session live");
  const [successTileId, setSuccessTileId] = useState<string | null>(null);
  const [queuePulseOn, setQueuePulseOn] = useState(false);
  const [flyAnim, setFlyAnim] = useState<FlyAnim | null>(null);
  const [buyBusy, setBuyBusy] = useState(false);
  const [writeInBusy, setWriteInBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | {
    type: "request" | "boost" | "write-in";
    song?: Song;
    sourceEl?: HTMLElement | null;
  }>(null);
  const [pendingActionToast, setPendingActionToast] = useState(false);
  const [rewardFlash, setRewardFlash] = useState<null | {
    key: number;
    eyebrow?: string;
    title: string;
    subtitle?: string;
  }>(null);

  const queueTargetRef = useRef<HTMLButtonElement | null>(null);
  const flyTimerRef = useRef<number | null>(null);
  const tileSuccessTimerRef = useRef<number | null>(null);
  const queuePulseTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const rewardFlashTimerRef = useRef<number | null>(null);
  const flyKeyRef = useRef(0);
  const prevUserRequestIdsRef = useRef<Set<string>>(new Set());

  const sfx = usePublicSfx();

  function resetToClaimState(clearStorage = false) {
    const previousIdentityId = identityId;

    setSessionActive(false);
    setVerified(false);
    setIdentityId("");
    setShowBuy(false);

    try {
      if (previousIdentityId) {
        localStorage.removeItem(`rr_lastBalance:${location}:${previousIdentityId}`);
      }
    } catch {}

    if (clearStorage) {
      try {
        localStorage.removeItem("rr_identityId");
      } catch {}
    }
  }

  async function fetchBalanceNumber(nextIdentityId?: string): Promise<number> {
    const id = (nextIdentityId ?? identityId ?? "").trim();
    if (!id) throw new Error("Missing identityId");

    const res = await fetch(
      `/api/public/balance?location=${encodeURIComponent(location)}&identityId=${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as BalanceRes;

    if (!res.ok || !data.ok) {
      if (res.status === 404 || res.status === 401 || res.status === 403) {
        resetToClaimState(true);
      }
      throw new Error(data.error || "Balance fetch failed");
    }

    setSessionActive(true);
    setVerified(true);
    return Number(data.balance ?? 0);
  }

  const bal = useAnimatedBalance(() => fetchBalanceNumber(), {
    enabled: Boolean(identityId && sessionActive),
    softPollMs: 2600,
    intervalMs: 650,
    storageKey: `rr_lastBalance:${location}:${identityId || "anon"}`,
  });

  async function refreshIdentityState(nextIdentityId?: string) {
    const id = (nextIdentityId ?? identityId ?? "").trim();
    if (!id) {
      resetToClaimState(false);
      return;
    }

    try {
      const nextBalance = await fetchBalanceNumber(id);
      setIdentityId(id);
      bal.applyBalance(nextBalance);
    } catch {
      // fetchBalanceNumber handles expired-state cleanup
    }
  }

  useEffect(() => {
    return () => {
      if (flyTimerRef.current != null) window.clearTimeout(flyTimerRef.current);
      if (tileSuccessTimerRef.current != null) window.clearTimeout(tileSuccessTimerRef.current);
      if (queuePulseTimerRef.current != null) window.clearTimeout(queuePulseTimerRef.current);
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
      if (rewardFlashTimerRef.current != null) window.clearTimeout(rewardFlashTimerRef.current);
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

    if (toastTimerRef.current != null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    if (pendingActionToast) {
      return;
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastOpen(false);
      window.setTimeout(() => setMsg(""), 220);
    }, 3400);

    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    };
  }, [msg, pendingActionToast]);

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
        if (reason === "out" || reason === "notEnough" || reason === "boost") {
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

    const nextEndsAt = String(data?.session?.endsAt || "").trim();
    const nextEndsAtMs = nextEndsAt ? new Date(nextEndsAt).getTime() : NaN;
    const sessionExpired = Number.isFinite(nextEndsAtMs) && nextEndsAtMs <= Date.now();

    setSessionCountdown(formatCountdown(nextEndsAt || null));

    if (sessionExpired && identityId) {
      resetToClaimState(true);
      setPendingAction(null);
      setPendingActionToast(false);
      setShowBuy(false);
      setRedeemCode("");
      setMsg("Your session expired. Claim your 5 points to begin again.");
      setShowVerify(true);
    }
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

      if (lsLocation && lsLocation !== location) {
        localStorage.setItem("rr_location", String(location));
        localStorage.removeItem("rr_identityId");
        resetToClaimState(true);

        if (lsEmail) setEmail(lsEmail);
        return;
      }

      if (lsEmail) setEmail(lsEmail);

      if (!lsLocation && location) {
        localStorage.setItem("rr_location", String(location));
      }

      if (lsIdentity) {
        setIdentityId(lsIdentity);
        void refreshIdentityState(lsIdentity);
      } else {
        resetToClaimState(false);
      }
    } catch {
      resetToClaimState(false);
    }
  }, [location]);

  useEffect(() => {
    if (!identityId || !sessionActive) return;
    const t = window.setTimeout(() => {
      bal.refreshOnce();
    }, 900);
    return () => window.clearTimeout(t);
  }, [identityId, location, sessionActive]);

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

  function fireRewardConfetti() {
    confetti({
      particleCount: 40,
      spread: 62,
      startVelocity: 30,
      ticks: 100,
      gravity: 0.95,
      scalar: 0.92,
      origin: { x: 0.5, y: 0.58 },
      colors: ["#6ee7f9", "#d946ef", "#ffffff", "#9d4edd"],
    });

    window.setTimeout(() => {
      confetti({
        particleCount: 26,
        angle: 60,
        spread: 50,
        startVelocity: 24,
        ticks: 90,
        gravity: 1,
        scalar: 0.82,
        origin: { x: 0.34, y: 0.6 },
        colors: ["#6ee7f9", "#ffffff", "#d946ef"],
      });

      confetti({
        particleCount: 26,
        angle: 120,
        spread: 50,
        startVelocity: 24,
        ticks: 90,
        gravity: 1,
        scalar: 0.82,
        origin: { x: 0.66, y: 0.6 },
        colors: ["#6ee7f9", "#ffffff", "#d946ef"],
      });
    }, 110);
  }

function fireButtonConfetti(sourceEl?: HTMLElement | null) {
  const rect = sourceEl?.getBoundingClientRect?.();

  const originX = rect
    ? (rect.left + rect.width / 2) / window.innerWidth
    : 0.5;

  const originY = rect
    ? (rect.top + rect.height / 2) / window.innerHeight
    : 0.6;

  confetti({
    particleCount: 14,
    spread: 36,
    startVelocity: 18,
    ticks: 55,
    gravity: 1.05,
    scalar: 0.62,
    origin: { x: originX, y: originY },
    colors: ["#6ee7f9", "#d946ef", "#ffffff"],
  });
}

  function showRewardFlash(title: string, subtitle?: string, eyebrow = "REWARD UNLOCKED") {
    setRewardFlash({
      key: Date.now(),
      eyebrow,
      title,
      subtitle,
    });

    if (rewardFlashTimerRef.current != null) {
      window.clearTimeout(rewardFlashTimerRef.current);
    }

    rewardFlashTimerRef.current = window.setTimeout(() => {
      setRewardFlash(null);
    }, 1850);
  }

  function openBuy(reason: typeof buyReason) {
    if (!sessionActive || !verified || !identityId) {
      setBuyReason(reason);
      setShowVerify(true);
      sfx.playTap();
      return;
    }

    setBuyReason(reason);
    setShowBuy(true);
    sfx.playTap();
  }

  function handlePointsAction() {
    sfx.playTap();
    if (!sessionActive || !verified || !identityId) {
      setBuyReason("boost");
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

    if (!sessionActive || !verified || !identityId) {
      sfx.playTap();
      setMsg("Claim your points to redeem a code.");
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
        const lower = String(data.error || "").toLowerCase();
        if (lower.includes("expired") || lower.includes("verify")) {
          resetToClaimState(true);
          setMsg("Your session expired. Claim your points to continue.");
          setShowVerify(true);
          return;
        }

        sfx.playError();
        setMsg(data.error || "Could not redeem code.");
        return;
      }

      const pointsAdded = Number(data.pointsAdded ?? 0);

      sfx.playSuccess();
      fireRewardConfetti();
      setRedeemCode("");
      setShowVerify(false);
      setShowBuy(false);

      showRewardFlash(
        pointsAdded > 0 ? `+${pointsAdded} POINTS` : "POINTS ADDED",
        "Code redeemed successfully",
        "BONUS HIT"
      );

      setMsg(
        pointsAdded > 0
          ? `Redeemed +${pointsAdded} points.`
          : "Code redeemed successfully."
      );

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

  async function startCheckout(packageKey?: string, href?: string) {
    try {
      const lsLocation = (localStorage.getItem("rr_location") || "").trim();
      if (lsLocation && lsLocation !== location) {
        localStorage.removeItem("rr_identityId");
        resetToClaimState(false);
        setShowVerify(true);
        setMsg("Please verify again for this location.");
        return;
      }
    } catch {}

    if (!sessionActive || !identityId) {
      setShowVerify(true);
      return;
    }

    if (!packageKey) {
      if (href) {
        window.location.href = href;
        return;
      }
      setMsg("Missing package.");
      return;
    }

    try {
      setBuyBusy(true);
      setMsg("");

      const res = await fetch("/api/square/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location,
          identityId,
          packageKey,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok || !data?.checkoutUrl) {
        const lower = String(data?.error || "").toLowerCase();
        if (lower.includes("expired") || lower.includes("verify")) {
          resetToClaimState(true);
          setMsg("Your session expired. Claim your points to continue.");
          setShowVerify(true);
          setBuyBusy(false);
          return;
        }

        setMsg(
          data?.error
            ? `Checkout error: ${data.error}`
            : `Could not open checkout. Status ${res.status}`
        );
        setBuyBusy(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setMsg("Could not open checkout.");
      setBuyBusy(false);
    }
  }

  function triggerSuccessVisuals(song: Song, sourceEl?: HTMLElement | null) {
    setSuccessTileId(song.id);
    fireButtonConfetti(sourceEl);

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
      src: resolveArtworkSrc(song.artworkUrl, rules?.rules?.defaultAlbumArtUrl),
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
    if (!sessionActive || !verified || !identityId) {
      sfx.playTap();
      setPendingAction({
        type: action === "play_now" ? "boost" : "request",
        song,
        sourceEl,
      });
      setMsg("Claim your points to request songs.");
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
        const lower = String(data.error || "").toLowerCase();
        if (lower.includes("expired") || lower.includes("verify")) {
          resetToClaimState(true);
          setMsg("Your session expired. Claim your points to continue.");
          setShowVerify(true);
          return false;
        }

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
      setMsg(action === "play_now" ? "Boost sent to the playlist!" : "Request added to the playlist!");
      return true;
    } catch {
      sfx.playError();
      setMsg("Something went wrong.");
      return false;
    }
  }


   async function submitWriteIn(sourceEl?: HTMLElement | null) {
    const requestedTitle = writeInSearch.requestedTitle.trim();
    const requestedArtist = writeInSearch.requestedArtist.trim();

    if (!requestedTitle) {
      sfx.playError();
      setMsg("Enter a song title first.");
      return false;
    }

    if (!sessionActive || !verified || !identityId) {
      sfx.playTap();
      setPendingAction({
        type: "write-in",
        sourceEl,
      });
      setMsg("Claim your points to request songs.");
      setShowVerify(true);
      return false;
    }

    const costRequest = Number(rules?.rules?.costRequest ?? 1);

    if (typeof bal.balance === "number" && bal.balance < costRequest) {
      sfx.playError();
      setMsg("Not enough points.");
      openBuy("notEnough");
      return false;
    }

    setWriteInBusy(true);

    try {
      const res = await fetch(`/api/public/write-ins/${encodeURIComponent(location)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestedTitle,
          requestedArtist,
          identityId,
          requestedByLabel: email?.trim() || null,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        const lower = String(data.error || "").toLowerCase();
        if (lower.includes("expired") || lower.includes("verify")) {
          resetToClaimState(true);
          setMsg("Your session expired. Claim your points to continue.");
          setShowVerify(true);
          return false;
        }

        sfx.playError();
        setMsg(data.error || "Could not submit write-in request.");
        return false;
      }

      sfx.playSuccess();
      triggerSuccessVisuals(
        {
          id: `write-in-${Date.now()}`,
          title: requestedTitle,
          artist: requestedArtist,
          artworkUrl: undefined,
        },
        sourceEl
      );

      // Current write-in route returns ok / writeInId / status / message,
      // not a balance payload, so just refresh the balance after success.
      bal.refreshOnce();

      await refreshQueuePreview();

      setMsg(
        data.message ||
          (requestedArtist
            ? `Write-in request added: ${requestedTitle} - ${requestedArtist}`
            : `Write-in request added: ${requestedTitle}`)
      );

      return true;
    } catch {
      sfx.playError();
      setMsg("Could not submit write-in request.");
      return false;
    } finally {
      setWriteInBusy(false);
    }
  }

  const logoUrl = rules?.rules?.logoUrl || REMIX_LOGO_URL;
  const balanceValue = sessionActive && verified && identityId ? Number(bal.balance || 0) : 5;
  const requestCost = Number(rules?.rules?.costRequest ?? 1);
  const playNowCost = Number(rules?.rules?.costPlayNow ?? 5);

  const featuredSongs = useMemo(
  () => songs.filter((song: any) => Number(song.featureBoost || 0) > 0).slice(0, 8),
  [songs]
);
  const defaultAlbumArtUrl = rules?.rules?.defaultAlbumArtUrl || "";
  const writeInSearch = useMemo(() => parseWriteInSearchInput(search), [search]);

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

  return (
    <PublicTheme>
      <div className="rrHeroGrid">
        <div className="rrLogoCard">
          <BrandLogo logoUrl={logoUrl} />
        </div>

        <div className="rrHeroCard">
          <h1 className="rrTitle">Request a Song</h1>
          <div className="rrTitleSub">
            Requests cost {requestCost} point. Boosts cost {playNowCost} points.
            <br />
            Upvote and Downvote your favorites!
          </div>
        </div>

        <div className="rrPointsCard">
          <div className="rrPointsStack">
            <div className="rrHudLabel">Points</div>
            <div className="rrHudValue">{balanceValue}</div>
            <div className="rrPointsActions">
              <button className="rrBtn" style={{ width: "100%" }} onClick={handlePointsAction}>
                {sessionActive && verified && identityId ? "Add Points" : "Claim Points"}
              </button>
            </div>
          </div>
        </div>
      </div>

  <div className="rrNoticeCard">
    <div className="rrNoticeActions rrNoticeActions--full" style={{ marginTop: 0 }}>
      <button
        ref={queueTargetRef}
        className={`rrBtn rrBtn--full ${queuePulseOn ? "rrBtn--pulse" : ""}`}
        onClick={() => {
          sfx.playTap();
          window.location.href = `/queue/${encodeURIComponent(location)}`;
        }}
      >
        View Queue
      </button>
    </div>
  </div>

  <div className="rrPanel">
    <div className="rrPanelHead rrPanelHead--centered">
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

      <div className="rrRequestChipScrollerWrap">
        <div className="rrRequestChipScroller">
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
        <div className="rrRequestChipHint" aria-hidden="true">
          ›
        </div>
      </div>

      {search.trim() && songs.length === 0 ? (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 900 }}>Can’t find your song?</div>
          <HoldButton
            idleLabel={
              search.trim()
                ? `REQUEST "${search.trim()}" • ${requestCost}pt`
                : "ENTER A SONG TO REQUEST"
            }
            busyLabel="SENDING..."
            successLabel="ADDED!"
            disabled={writeInBusy || !search.trim()}
            onConfirm={(el) => submitWriteIn(el)}
          />

          {search.trim() ? (
            <div
              className="rrHelper"
              style={{
                marginTop: 10,
                textAlign: "left",
                lineHeight: 1.35,
                whiteSpace: "normal",
                overflow: "visible",
                textOverflow: "unset",
                wordBreak: "break-word",
              }}
            >
              {`Request "${search.trim()}" as a write-in • ${requestCost}pt`}
              {writeInSearch.requestedArtist ? (
                <>
                  <br />
                  <span>
                    Tip: for a cleaner match, try{" "}
                    <b>
                      {writeInSearch.requestedTitle} - {writeInSearch.requestedArtist}
                    </b>
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  </div>
      {featuredSongs.length ? (
        <div className="rrPanel">
          <div className="rrPanelHead">
            <div>
<div className="rrPanelTitle">Trending Now at Remix!</div>
<div className="rrPanelSub">Here's what's hot and new at the Rink!</div>
            </div>
          </div>

          <div className="rrPanelBody">
            <div className="rrTrendingRail">
              {featuredSongs.map((song) => {
                const isSuccess = successTileId === song.id;
                const isHot = true;

                return (
                  <div key={song.id} className={`rrSongTile ${isSuccess ? "rrSongTile--success" : ""}`}>
                    <AlbumArt src={song.artworkUrl} fallbackSrc={defaultAlbumArtUrl} alt={song.title} />

                    <div className="rrSongTileCopy">
                      <div className="rrSongTileTitle">{song.title}</div>
                      <div className="rrSongTileMeta">{song.artist}</div>

                      <div className="rrSongMetaRow">
                        {isHot ? <span className="rrTag rrTag--boost">Hot</span> : null}
                        <span className="rrMetaPill">{requestCost}pt</span>
                        <span className="rrMetaPill">{playNowCost}pt boost</span>
                        {song.explicit ? <span className="rrMetaPill">Explicit</span> : null}
                      </div>
                    </div>

                    <div className="rrSongTileActions">
                      <HoldButton
                        idleLabel={`REQUEST! - ${requestCost}pt`}
                        busyLabel="REQUESTING..."
                        successLabel="ADDED!"
                        onConfirm={(el) => submit(song, "play_next", el)}
                      />
                      <HoldButton
                        idleLabel={`BOOST! - ${playNowCost}pts`}
                        busyLabel="BOOSTING..."
                        successLabel="SENT!"
                        onConfirm={(el) => submit(song, "play_now", el)}
                        className="rrBtn"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rrPanel">
        <div className="rrPanelHead rrPanelHead--centered">
          <div>
            <div className="rrPanelTitle">Song List</div>
            <div className="rrPanelSub">
              {songs.length ? `${songs.length} available` : "No songs found right now."}
            </div>
          </div>
        </div>

        <div className="rrSongTileGrid">
          {songs.length ? (
            songs.map((song) => {
              const isSuccess = successTileId === song.id;
const isHot = featuredSongs.some((x) => x.id === song.id);
              return (
                <div key={song.id} className={`rrSongTile ${isSuccess ? "rrSongTile--success" : ""}`}>
                  <AlbumArt src={song.artworkUrl} fallbackSrc={defaultAlbumArtUrl} alt={song.title} />

                  <div className="rrSongTileCopy">
                    <div className="rrSongTileTitle">{song.title}</div>
                    <div className="rrSongTileMeta">{song.artist}</div>

                    <div className="rrSongMetaRow">
                      {isHot ? <span className="rrTag rrTag--boost">Hot</span> : null}
                      <span className="rrMetaPill">{requestCost}pt</span>
                      <span className="rrMetaPill">{playNowCost}pt boost</span>
                      {song.explicit ? <span className="rrMetaPill">Explicit</span> : null}
                    </div>
                  </div>

                  <div className="rrSongTileActions">
                    <HoldButton
                      idleLabel={`REQUEST! - ${requestCost}pt`}
                      busyLabel="REQUESTING..."
                      successLabel="ADDED!"
                      onConfirm={(el) => submit(song, "play_next", el)}
                    />
                    <HoldButton
                      idleLabel={`BOOST! - ${playNowCost}pts`}
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
            <div className="rrEmpty" style={{ display: "grid", gap: 14 }}>
              <div>No songs matched that search.</div>

              {search.trim() ? (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    width: "min(100%, 560px)",
                    margin: "0 auto",
                    textAlign: "left",
                    padding: 16,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>Can’t find your song?</div>
                  <div className="rrPanelSub" style={{ marginTop: 0 }}>
                    Send a write-in request for the DJ to review.
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.88)",
                      wordBreak: "break-word",
                    }}
                  >
<div
  style={{
    fontSize: 14,
    color: "rgba(255,255,255,0.88)",
    wordBreak: "break-word",
  }}
>
  {`Request "${search.trim()}" as a write-in • ${requestCost}pt`}
  {writeInSearch.requestedArtist ? (
    <>
      <br />
      <span>
        Tip: for a cleaner match, try{" "}
        <b>
          {writeInSearch.requestedTitle} - {writeInSearch.requestedArtist}
        </b>
      </span>
    </>
  ) : null}
</div>

                  </div>
<HoldButton
  idleLabel="SEND WRITE-IN REQUEST"
  busyLabel="SENDING..."
  successLabel="ADDED!"
  className="rrBtn"
  disabled={writeInBusy || !writeInSearch.requestedTitle}
  onConfirm={(el) => submitWriteIn(el)}
/>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

{toastOpen && msg ? (
  <div className="rrToastWrap">
    <div className="rrToastCard">
      <div className="rrToastText">{msg}</div>
      <button className="rrToastClose" onClick={dismissToast}>
        Close
      </button>
    </div>
  </div>
) : null}

      {rewardFlash ? (
        <div
          key={rewardFlash.key}
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 120,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            style={{
              position: "relative",
              minWidth: 260,
              maxWidth: "min(92vw, 380px)",
              borderRadius: 28,
              padding: "22px 24px 20px",
              textAlign: "center",
              color: "#fff",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.16)",
              background:
                "radial-gradient(circle at top, rgba(110,231,249,0.22), rgba(18,24,36,0.98) 42%), linear-gradient(145deg, rgba(34,41,58,0.98), rgba(11,16,26,0.98))",
              boxShadow:
                "0 22px 70px rgba(0,0,0,0.48), 0 0 34px rgba(110,231,249,0.14), inset 0 1px 0 rgba(255,255,255,0.08)",
              animation: "rrRewardPop 1850ms cubic-bezier(.16,.84,.24,1) forwards",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(115deg, transparent 16%, rgba(255,255,255,0.18) 29%, transparent 44%)",
                transform: "translateX(-120%)",
                animation: "rrRewardSheen 900ms ease 130ms forwards",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "10px",
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
            <div
              style={{
                position: "relative",
                zIndex: 1,
                fontSize: 11,
                letterSpacing: "0.26em",
                opacity: 0.72,
                fontWeight: 900,
              }}
            >
              {rewardFlash.eyebrow || "REWARD UNLOCKED"}
            </div>
            <div
              style={{
                position: "relative",
                zIndex: 1,
                fontSize: 36,
                fontWeight: 1000,
                lineHeight: 0.96,
                marginTop: 10,
                textShadow: "0 0 24px rgba(110,231,249,0.18)",
              }}
            >
              {rewardFlash.title}
            </div>
            {rewardFlash.subtitle ? (
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  marginTop: 10,
                  fontSize: 14,
                  opacity: 0.9,
                }}
              >
                {rewardFlash.subtitle}
              </div>
            ) : null}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                margin: "14px auto 0",
                width: 74,
                height: 4,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, rgba(110,231,249,0.0), rgba(110,231,249,0.92), rgba(217,70,239,0.92), rgba(217,70,239,0.0))",
                boxShadow: "0 0 22px rgba(110,231,249,0.28)",
              }}
            />
          </div>

          <style jsx>{`
            @keyframes rrRewardPop {
              0% {
                transform: scale(0.8) translateY(20px);
                opacity: 0;
                filter: blur(6px);
              }
              12% {
                transform: scale(1.04) translateY(0);
                opacity: 1;
                filter: blur(0);
              }
              82% {
                transform: scale(1) translateY(0);
                opacity: 1;
              }
              100% {
                transform: scale(0.97) translateY(-10px);
                opacity: 0;
              }
            }

            @keyframes rrRewardSheen {
              0% {
                transform: translateX(-120%);
              }
              100% {
                transform: translateX(120%);
              }
            }
          `}</style>
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
        onVerified={({
          identityId: nextIdentityId,
          email: nextEmail,
          balance: verifiedBalance,
          note,
          welcomeGranted,
        }) => {
                    const cleanId = String(nextIdentityId || "").trim();
          const cleanEmail = String(nextEmail || email || "").trim();

          if (cleanId) {
            setIdentityId(cleanId);
            setSessionActive(true);
            setVerified(true);

            if (typeof verifiedBalance === "number") {
              bal.applyBalance(verifiedBalance);
            } else {
              void refreshIdentityState(cleanId);
            }
          }

          if (cleanEmail) setEmail(cleanEmail);

          setShowBuy(false);
          setBuyReason("none");

          const shouldCelebrate =
            Boolean(welcomeGranted) || Number(verifiedBalance ?? 0) > 0;

          if (pendingAction) {
            const action = pendingAction;

            setPendingAction(null);

            if (shouldCelebrate) {
              sfx.playSuccess();
              fireRewardConfetti();

              showRewardFlash(
                typeof verifiedBalance === "number" && verifiedBalance > 0
                  ? `+${verifiedBalance} POINTS`
                  : "POINTS ADDED",
                note || "Your welcome points are ready!",
                "BONUS HIT"
              );
            }

            setPendingActionToast(true);
            setMsg(
              shouldCelebrate
                ? note || "Points added! Completing your request..."
                : "Completing your request..."
            );

            window.setTimeout(() => {
              setPendingActionToast(false);

              if (action.type === "request" && action.song) {
                void submit(action.song, "play_next", action.sourceEl);
                return;
              }

              if (action.type === "boost" && action.song) {
                void submit(action.song, "play_now", action.sourceEl);
                return;
              }

              if (action.type === "write-in") {
                void submitWriteIn(action.sourceEl);
                return;
              }

              setMsg(note || "Your welcome points are ready!");
            }, shouldCelebrate ? 900 : 150);
          } else {
            if (welcomeGranted || Number(verifiedBalance ?? 0) > 0) {
              sfx.playSuccess();
              fireRewardConfetti();

              showRewardFlash(
                typeof verifiedBalance === "number" && verifiedBalance > 0
                  ? `+${verifiedBalance} POINTS`
                  : "POINTS ADDED",
                note || "Your welcome points are ready!",
                "BONUS HIT"
              );
            }

            setMsg(note || "Your welcome points are ready!");
          }
        }}
      />

      <BuyCreditsDrawer
        open={showBuy}
        busy={buyBusy}
        packs={packs}
        redeemCode={redeemCode}
        setRedeemCode={setRedeemCode}
        redeemBusy={redeemBusy}
        onClose={() => setShowBuy(false)}
        onBuy={(packageKey, href) => startCheckout(packageKey, href)}
        onRedeem={() => redeem()}
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
<PublicBottomCommandBar
  location={location}
  activeView="request"
  points={balanceValue}
/>
    </PublicTheme>
  );
}
