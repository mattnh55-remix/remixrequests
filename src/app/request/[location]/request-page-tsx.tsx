"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const RAILS = ["All Ages","Adult Night","TikTok","DISCO","80s","90s","2000s","Boy Bands","Pop Hits","Mom’s Hits","Dad Rock"];

type Song = { id: string; title: string; artist: string; artworkUrl?: string; explicit: boolean; tags: string[] };

export default function RequestPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string>("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [rules, setRules] = useState<any>(null);
  const [msg, setMsg] = useState<string>("");

  const [verified, setVerified] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [showVerify, setShowVerify] = useState(false);

  const sfx = useNeonSfx();

  // Session endpoint returns rules/session but NOT credits balance.
  async function refreshSession() {
    try {
      const res = await fetch(`/api/public/session/${location}`, { cache: "no-store" });
      const data = await res.json();
      setRules(data);
    } catch {
      // silent fail
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

  useEffect(() => { refreshSession(); }, [location]);
  useEffect(() => { loadSongs(); }, [search, tag]);

  // live session/rules refresh (UI-only)
  useEffect(() => {
    const id = setInterval(() => {
      refreshSession();
    }, 12000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  async function submit(songId: string, action: "play_next" | "play_now") {
    if (!verified) {
      sfx.playError();
      setMsg("Please verify to unlock credits.");
      setShowVerify(true);
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

    // If request endpoint returns updated balance, use it (UI-only).
    const nextBalance =
      data?.balance ??
      data?.credits?.balance ??
      data?.session?.balance ??
      null;

    if (typeof nextBalance === "number") setBalance(nextBalance);
  }

  // UI-only “Trending” derivation (no DB/schema changes):
  const trending = useMemo(() => {
    const hot = songs.filter(s => (s.tags || []).some(t => ["TikTok","DISCO","Pop Hits"].includes(t)));
    return (hot.length ? hot : songs).slice(0, 10);
  }, [songs]);

  const trendingIds = useMemo(() => new Set(trending.map(t => t.id)), [trending]);

  const locationName = rules?.location?.name || location;
  const costRequest = rules?.rules?.costRequest ?? 1;
  const costPlayNow = rules?.rules?.costPlayNow ?? 5;

  return (
    <div className="neonRoot">
      <div className="neonWrap">
        {/* HEADER */}
        <div className="neonHeader">
          <div>
            <div className="neonTitle">Request a Song</div>
            <div className="neonSub">
              {locationName} • Tap a song to request • Big neon rink energy
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
            <button
              className="neonBtn"
              onClick={() => { sfx.playTap(); sfx.setMuted(!sfx.muted); }}
              title={sfx.muted ? "Sound off" : "Sound on"}
            >
              {sfx.muted ? "🔇 Sound Off" : "🔊 Sound On"}
            </button>

            {balance !== null ? (
              <div
                className="neonPanel"
                style={{
                  padding: "10px 12px",
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.18)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 900, letterSpacing: 0.8 }}>CREDITS</div>
                <div style={{ fontSize: 18, fontWeight: 1000 }}>{balance}</div>
              </div>
            ) : null}

            {!verified ? (
              <button className="neonBtn neonBtnPrimary" onClick={() => { sfx.playTap(); setShowVerify(true); }}>
                Verify • Unlock Credits
              </button>
            ) : (
              <button className="neonBtn" onClick={() => { sfx.playTap(); setMsg("✅ You’re verified. Tap a song to request!"); }}>
                Verified ✓
              </button>
            )}
          </div>
        </div>

        {/* MESSAGE */}
        {msg ? (
          <div className="neonPanel" style={{ padding: 12, marginBottom: 12, background: "rgba(0,0,0,0.22)" }}>
            {msg}
          </div>
        ) : null}

        {/* TOP CONTROLS */}
        <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email (for credits & rules)"
            className="neonInput"
            autoComplete="email"
            onFocus={() => sfx.playTap()}
          />

          <input
            id="songSearch"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title or artist…"
            className="neonInput"
            onFocus={() => sfx.playTap()}
          />

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
            <button onClick={() => { sfx.playTap(); setTag(""); }} className="neonBtn" style={chip2(tag === "")}>All</button>
            {RAILS.map(r => (
              <button key={r} onClick={() => { sfx.playTap(); setTag(r); }} className="neonBtn" style={chip2(tag === r)}>{r}</button>
            ))}
          </div>
        </div>

        {/* TRENDING RAIL */}
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
              Play Next costs {costRequest} • Play Now costs {costPlayNow}
            </div>
          </div>

          <div className="neonGrid">
            {songs.map((s) => {
              const hot = trendingIds.has(s.id);
              return (
                <div key={s.id} className="neonTile" data-hot={hot ? "true" : "false"}>
                  <div className="neonTileTop">
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
                      <span className="neonBadge">{costRequest} credit</span>
                    </div>

                    <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                      <button
                        disabled={!email || !verified}
                        onClick={() => { sfx.playTap(); submit(s.id, "play_next"); }}
                        className="neonBtn"
                        style={{ opacity: (!email || !verified) ? 0.55 : 1 }}
                      >
                        Play Next • {costRequest} credit
                      </button>

                      <button
                        disabled={!email || !verified}
                        onClick={() => { sfx.playTap(); submit(s.id, "play_now"); }}
                        className="neonBtn neonBtnPrimary"
                        style={{ opacity: (!email || !verified) ? 0.55 : 1 }}
                      >
                        Play Now • {costPlayNow} credits
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky bottom CTA */}
        <div
          style={{
            position: "sticky",
            bottom: 10,
            zIndex: 20,
            marginTop: 14,
            display: "grid",
            gap: 10,
          }}
        >
          {!verified ? (
            <button className="neonBtn neonBtnPrimary" onClick={() => { sfx.playTap(); setShowVerify(true); }} style={{ width: "100%" }}>
              Verify • Unlock Credits
            </button>
          ) : (
            <button
              className="neonBtn neonBtnPrimary"
              style={{ width: "100%" }}
              onClick={() => { sfx.playTap(); document.getElementById("songSearch")?.focus(); }}
            >
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
            setVerified(true);
            setShowVerify(false);
            if (info?.balance !== undefined) setBalance(info.balance ?? null);
            setMsg("✅ Verified! Welcome credits unlocked.");
            sfx.playSuccess();
            refreshSession();
          }}
          onClose={() => setShowVerify(false)}
          sfx={sfx}
        />
      </div>
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

/* -------------------------
   Verify Modal (unchanged logic)
------------------------- */

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
    if (!emailOptIn) {
      sfx.playError();
      setMsg("Email opt-in is required to receive the 5 welcome credits.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/public/auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, email: email.trim(), phone: phone.trim(), emailOptIn, smsOptIn }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Could not send code.");
      sfx.playSuccess();
      setStep("code");
      setMsg("Code sent! Check your texts.");
    } catch (e: any) {
      sfx.playError();
      setMsg(e?.message || "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setMsg("");
    if (!code.trim()) {
      sfx.playError();
      setMsg("Enter the 6-digit code.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/public/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, email: email.trim(), code: code.trim(), emailOptIn, smsOptIn }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Verification failed.");
      onVerified({ balance: data.balance });
      setMsg("");
    } catch (e: any) {
      sfx.playError();
      setMsg(e?.message || "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={modalOverlay} onMouseDown={() => sfx.playTap()}>
      <div className="neonPanel" style={modalCard}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 1000 }}>Verify to unlock credits</div>
            <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
              Get 5 welcome credits when you confirm your number + opt in.
            </div>
          </div>
          <button onClick={() => { sfx.playTap(); onClose?.(); }} className="neonBtn" style={modalX} aria-label="Close" disabled={busy} title="Close">
            ✕
          </button>
        </div>

        <div style={{ height: 14 }} />

        {step === "collect" ? (
          <>
            <label style={fieldWrap}>
              <span style={label}>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="neonInput" autoComplete="email" />
            </label>

            <label style={fieldWrap}>
              <span style={label}>Mobile number</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(603) 555-1212" className="neonInput" autoComplete="tel" />
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                We’ll text a one-time code. Standard messaging rates may apply.
              </div>
            </label>

            <label style={checkRow}>
              <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} disabled={busy} />
              <span style={{ opacity: 0.9 }}>Yes — email me deals & updates (required for welcome credits)</span>
            </label>

            <label style={checkRow}>
              <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} disabled={busy} />
              <span style={{ opacity: 0.9 }}>Yes — text me deals & updates (recommended)</span>
            </label>

            {msg ? <div style={modalMsg}>{msg}</div> : null}

            <button onClick={() => { sfx.playTap(); void sendCode(); }} className="neonBtn neonBtnPrimary" style={{ width: "100%", marginTop: 8 }} disabled={busy}>
              {busy ? "Sending..." : "Send code"}
            </button>
          </>
        ) : (
          <>
            <label style={fieldWrap}>
              <span style={label}>Enter code</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="neonInput" inputMode="numeric" autoComplete="one-time-code" />
            </label>

            {msg ? <div style={modalMsg}>{msg}</div> : null}

            <button onClick={() => { sfx.playTap(); void verifyCode(); }} className="neonBtn neonBtnPrimary" style={{ width: "100%", marginTop: 8 }} disabled={busy}>
              {busy ? "Verifying..." : "Verify & unlock"}
            </button>

            <button onClick={() => { sfx.playTap(); setStep("collect"); setCode(""); setMsg(""); }} className="neonBtn" style={{ width: "100%", marginTop: 10 }} disabled={busy}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const modalOverlay: any = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 };
const modalCard: any = { width: "100%", maxWidth: 520, borderRadius: 22, padding: 16, background: "rgba(0,0,0,0.18)" };
const modalX: any = { padding: "10px 12px", borderRadius: 14, fontWeight: 1000 };
const fieldWrap: any = { display: "grid", gap: 6, marginBottom: 12 };
const label: any = { color: "var(--muted)", fontSize: 13, fontWeight: 900 };
const checkRow: any = { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 };
const modalMsg: any = { marginTop: 8, marginBottom: 6, padding: 12, borderRadius: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" };

/* -------------------------
   WebAudio SFX (no files needed)
------------------------- */

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

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("neonMuted", muted ? "1" : "0");
    }
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

  function click() {
    // short, snappy tap
    beep(1200, 35, "square", 0.06);
    beep(800, 25, "square", 0.04);
  }

  function success() {
    // tiny “reward” chord
    beep(523.25, 90, "sine", 0.08); // C5
    setTimeout(() => beep(659.25, 110, "sine", 0.08), 55); // E5
    setTimeout(() => beep(783.99, 130, "sine", 0.08), 110); // G5
  }

  function error() {
    // low buzz / thud
    beep(140, 140, "sawtooth", 0.10);
    setTimeout(() => beep(90, 120, "sawtooth", 0.10), 80);
  }

  return {
    muted,
    setMuted,
    playTap: click,
    playSuccess: success,
    playError: error,
  };
}