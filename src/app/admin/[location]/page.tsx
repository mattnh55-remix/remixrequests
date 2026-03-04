"use client";

import { useEffect, useMemo, useRef, useState } from "react";

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return { ok: false, _raw: "", _nonJson: true };
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, _raw: text.slice(0, 500), _nonJson: true };
  }
}

type QueueItem = {
  id: string;
  title: string;
  artist: string;
  score: number;
  createdAt: string;
  type: string;

  // (Backend-enhanced fields; UI tolerates missing)
  requestedByLabel?: string; // e.g. "Skater A1B2" or "Verified Skater A1B2"
  boosted?: boolean;         // true if PLAY_NOW
  upvotes?: number;
  downvotes?: number;
  redemptionCode?: string | null;
};

type SessionUser = {
  emailHash: string;
  label: string;       // "Skater A1B2" or masked phone
  verified: boolean;
  points: number;
  redemptionCode?: string | null;
};

export default function AdminPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState<"requests" | "rules" | "top10">("requests");

  const [rules, setRules] = useState<any>(null);
  const [queue, setQueue] = useState<{ playNow: QueueItem[]; upNext: QueueItem[] } | null>(null);
// Redemption codes
const [codes, setCodes] = useState<any[]>([]);
const [codeNew, setCodeNew] = useState("");
const [codePoints, setCodePoints] = useState<number>(10);
const [codeMaxUses, setCodeMaxUses] = useState<number>(1);
const [codesMsg, setCodesMsg] = useState("");

  // right rail
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const USERS_PAGE_SIZE = 10;

  // top10
  const [top10, setTop10] = useState<QueueItem[]>([]);
  const [top10UpdatedAt, setTop10UpdatedAt] = useState<string>("");

  // login logo cache (because rules fetch is authed)
  const [cachedLogoUrl, setCachedLogoUrl] = useState<string>("");

  // new request sound detection
  const prevQueueIdsRef = useRef<Set<string>>(new Set());
  const hasBootedRef = useRef(false);

  // ---------- helpers ----------
  const rulesCosts = useMemo(() => {
    const costRequest = Number(rules?.costRequest ?? 1);
    const costPlayNow = Number(rules?.costPlayNow ?? 5);
    const costUpvote = Number(rules?.costUpvote ?? 1);
    const costDownvote = Number(rules?.costDownvote ?? 1);
    return { costRequest, costPlayNow, costUpvote, costDownvote };
  }, [rules]);

  function lsKeyLogo(slug: string) {
    return `rr_admin_logoUrl:${slug}`;
  }

  function loadCachedLogo() {
    try {
      const v = localStorage.getItem(lsKeyLogo(location));
      if (v) setCachedLogoUrl(v);
    } catch {}
  }

  function cacheLogo(url?: string | null) {
    if (!url) return;
    try {
      localStorage.setItem(lsKeyLogo(location), url);
      setCachedLogoUrl(url);
    } catch {}
  }

  // ---------- sound ----------
  function playNewRequestChime() {
    // Tiny neon-ish “ding” without requiring an audio asset.
    try {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new AudioCtx();
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();

      o1.type = "sine";
      o2.type = "triangle";

      o1.frequency.value = 880;
      o2.frequency.value = 1320;

      g.gain.value = 0.0001;

      o1.connect(g);
      o2.connect(g);
      g.connect(ctx.destination);

      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.20, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      o1.start(now);
      o2.start(now);
      o1.stop(now + 0.25);
      o2.stop(now + 0.25);

      setTimeout(() => ctx.close().catch(() => {}), 400);
    } catch {
      // ignore
    }
  }

  // ---------- auth ----------
  async function login(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setMsg("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin })
    });

    if (!res.ok) {
      setMsg("Wrong PIN.");
      return;
    }

    setAuthed(true);
  }
  //----------- load codes ----
async function loadCodes() {
  try {
    const r = await fetch(`/api/admin/redemption-codes/${location}`, { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    setCodes(d.items || []);
  } catch {}
}

async function createCode() {
  setCodesMsg("");
  const code = codeNew.trim().toUpperCase();
  if (!code) { setCodesMsg("Enter a code."); return; }
  if (!codePoints || codePoints <= 0) { setCodesMsg("Points must be > 0."); return; }
  if (!codeMaxUses || codeMaxUses < 1) { setCodesMsg("Max uses must be >= 1."); return; }

  const r = await fetch(`/api/admin/redemption-codes/${location}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, points: codePoints, maxUses: codeMaxUses, source: "manual" })
  });

const d: any = await safeJson(r);
if (!r.ok || !d.ok) {
  console.error("CREATE CODE FAIL:", { status: r.status, d });
  setCodesMsg(d?.error || (d?._nonJson ? `Create code failed (non-JSON, ${r.status}).` : `Create code failed (${r.status}).`));
  return;
}

  setCodesMsg("✅ Code created.");
  setCodeNew("");
  await loadCodes();
}

async function disableCode(id: string) {
  setCodesMsg("");
  const r = await fetch(`/api/admin/redemption-codes/disable`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id })
  });
  
  setCodesMsg("✅ Code disabled.");
  await loadCodes();
}

async function importCodesFile(file: File) {
  setCodesMsg("");
  const form = new FormData();
  form.append("file", file);

  const r = await fetch(`/api/admin/redemption-codes/import/${location}`, {
    method: "POST",
    body: form
  });

  const d: any = await safeJson(r);
  if (!r.ok || !d.ok) {
    setCodesMsg(d.error || "Import failed.");
    return;
  }

  setCodesMsg(`✅ Imported ${d.created} • Skipped ${d.skipped}`);
  await loadCodes();
}

  // ---------- data ----------
  async function loadAll() {
    // Rules
const r1 = await fetch(`/api/admin/rules/get/${location}`, { cache: "no-store" });

if (r1.status === 401) {
  setAuthed(false);
  return;
}

const d1: any = await safeJson(r1);

if (!r1.ok || !d1?.rules) {
  console.error("RULES API FAIL:", { status: r1.status, d1 });
  setMsg(d1?.error || (d1?._nonJson ? `Rules API returned non-JSON (status ${r1.status}).` : `Rules API failed (${r1.status}).`));
  return;
}

setRules(d1.rules);
cacheLogo(d1?.rules?.logoUrl);

    // Queue
    const r2 = await fetch(`/api/admin/queue/${location}`, { cache: "no-store" });
    const d2 = await r2.json();
    const nextQueue = { playNow: d2.playNow || [], upNext: d2.upNext || [] };
    setQueue(nextQueue);

    // New request detection (only after initial boot)
    const currentIds = new Set<string>();
    for (const q of [...nextQueue.playNow, ...nextQueue.upNext]) currentIds.add(q.id);

    if (hasBootedRef.current) {
      let foundNew = false;
      for (const id of currentIds) {
        if (!prevQueueIdsRef.current.has(id)) {
          foundNew = true;
          break;
        }
      }
      if (foundNew) playNewRequestChime();
    } else {
      hasBootedRef.current = true;
    }
    prevQueueIdsRef.current = currentIds;

    // Session users (best-effort; UI tolerates missing route)
    try {
      const r3 = await fetch(`/api/admin/session-users/${location}`, { cache: "no-store" });
      if (r3.ok) {
        const d3 = await r3.json();
        setUsers(d3.users || []);
      }
    } catch {}

    // Top 10 (best-effort)
    try {
      const r4 = await fetch(`/api/admin/top10/${location}`, { cache: "no-store" });
      if (r4.ok) {
        const d4 = await r4.json();
        setTop10(d4.items || []);
        setTop10UpdatedAt(d4.updatedAt || "");
      }
    } catch {}
    await loadCodes();
  }

useEffect(() => {
  loadCachedLogo();

  // Try to prefetch rules to get logo even before login
  fetch(`/api/admin/rules/get/${location}`, { cache: "no-store" })
    .then(r => {
      if (!r.ok) return null;
      return r.json();
    })
    .then(d => {
      if (d?.rules?.logoUrl) {
        cacheLogo(d.rules.logoUrl);
      }
    })
    .catch(() => {});

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  useEffect(() => {
    if (!authed) return;
    loadAll();
    const id = setInterval(loadAll, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function saveRules() {
    setMsg("");

    const res = await fetch(`/api/admin/rules/set/${location}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rules)
    });

    const data = await res.json();
    if (!data.ok) setMsg("Failed to save rules.");
    else setMsg("✅ Rules saved.");

    await loadAll();
  }

  async function markPlayed(requestId: string) {
    await fetch(`/api/admin/queue/played`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId })
    });
    await loadAll();
  }

  async function reject(requestId: string) {
    const reason = prompt("Reject reason?", "Rejected");
    if (!reason) return;
    await fetch(`/api/admin/queue/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId, reason })
    });
    await loadAll();
  }

  async function importFile(file: File) {
    setMsg("");
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`/api/admin/songs/import/${location}`, {
      method: "POST",
      body: form
    });

    const data = await res.json();
    if (!data.ok) setMsg(data.error || "Import failed.");
    else setMsg(`✅ Imported ${data.created} songs.`);
  }

  // ---------- LOGIN VIEW ----------
  if (!authed) {
    const logoUrl = cachedLogoUrl;

    return (
      <div style={loginWrap}>
<style>{`
  @keyframes rrAdminCardIn {
    0%   { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(2px); }
    100% { opacity: 1; transform: translateY(0px)  scale(1);     filter: blur(0px); }
  }

  @keyframes rrAdminLogoIn {
    0%   { opacity: 0; transform: scale(0.92); filter: blur(6px); }
    55%  { opacity: 1; transform: scale(1.02); filter: blur(0px); }
    100% { opacity: 1; transform: scale(1);    filter: blur(0px); }
  }
`}</style>
        <div style={loginCard}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Admin Logo"
style={{
  width: 350,
  height: 350,
  objectFit: "contain",
  borderRadius: 22,
  marginBottom: 18,

  // logo glow + appear animation
  boxShadow:
    "0 0 0 1px rgba(90,90,255,0.10), 0 0 22px rgba(90,90,255,0.10), 0 0 70px rgba(122,60,255,0.10)",
  animation: "rrAdminLogoIn 700ms cubic-bezier(0.2, 0.9, 0.2, 1) both",
}}            />
          ) : null}

          <h1 style={{ margin: 0 }}>Admin • {location}</h1>
          <p style={{ opacity: 0.8, marginTop: 6 }}>Enter PIN to manage queue, rules, and songs.</p>

          {/* ENTER-to-submit */}
          <form onSubmit={login} style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              style={input}
              inputMode="numeric"
              autoFocus
            />
            <button type="submit" style={btn}>Login</button>
          </form>

          {msg && <div style={note}>{msg}</div>}

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
            Tip: type your 4-digit PIN and press <b>Enter</b>.
          </div>
        </div>
      </div>
    );
  }

  // ---------- MAIN ----------
  const usersTotalPages = Math.max(1, Math.ceil(users.length / USERS_PAGE_SIZE));
  const usersSlice = users.slice((usersPage - 1) * USERS_PAGE_SIZE, usersPage * USERS_PAGE_SIZE);

  return (
    <div style={{ padding: 18, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin • {location}</h1>
          <p style={{ opacity: 0.75, marginTop: 6 }}>Queue + Rules + Song Import</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={() => setTab("requests")} style={tab === "requests" ? tabBtnOn : tabBtn}>Requests</button>
          <button onClick={() => setTab("rules")} style={tab === "rules" ? tabBtnOn : tabBtn}>Global Rules</button>
          <button onClick={() => setTab("top10")} style={tab === "top10" ? tabBtnOn : tabBtn}>Top 10</button>
        </div>
      </div>

      {msg && <div style={note}>{msg}</div>}

      {/* REQUESTS TAB */}
      {tab === "requests" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 16, marginTop: 14 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <div style={h2}>PENDING REQUESTS</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Request! <b>{rulesCosts.costRequest}</b> • BOOST <b>{rulesCosts.costPlayNow}</b> • Upvote <b>{rulesCosts.costUpvote}</b> • Downvote <b>{rulesCosts.costDownvote}</b>
              </div>
            </div>

            <div style={{ height: 10 }} />

            <div style={laneHdr}>PLAY NOW LANE</div>
            {(queue?.playNow || []).map((q) => (
              <QueueRow key={q.id} q={q} onPlayed={() => markPlayed(q.id)} onReject={() => reject(q.id)} />
            ))}
            {(queue?.playNow?.length || 0) === 0 ? <div style={{ opacity: 0.7 }}>No Play Now requests.</div> : null}

            <div style={{ height: 16 }} />

            <div style={laneHdr}>UP NEXT</div>
            {(queue?.upNext || []).slice(0, 30).map((q, i) => (
              <QueueRow key={q.id} q={q} index={i + 1} onPlayed={() => markPlayed(q.id)} onReject={() => reject(q.id)} />
            ))}
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={card}>
              <div style={h2}>ACTIVE SESSION USERS</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: -4 }}>
                Verified users + Points balance. (Auto-refresh)
              </div>

              <div style={{ height: 10 }} />

              {usersSlice.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No active users returned yet.</div>
              ) : (
                usersSlice.map((u) => (
                  <div key={u.emailHash} style={userRow}>
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 900 }}>
                        {u.label}
                        {u.verified ? <span style={chipOn}>VERIFIED</span> : <span style={chipOff}>UNVERIFIED</span>}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Points: <b>{u.points}</b>
                        {u.redemptionCode ? <span style={{ marginLeft: 8, opacity: 0.95 }}>Code: <b>{u.redemptionCode}</b></span> : null}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {usersTotalPages > 1 ? (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  <button
                    style={smallBtnAlt}
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                    disabled={usersPage === 1}
                  >
                    Prev
                  </button>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Page {usersPage} / {usersTotalPages}
                  </div>
                  <button
                    style={smallBtnAlt}
                    onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                    disabled={usersPage === usersTotalPages}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>

            <div style={card}>
              <div style={h2}>IMPORT SONGS (CSV/XLSX)</div>
              <p style={{ opacity: 0.75, marginTop: 6 }}>
                Columns: <code>title,artist,explicit,tags,artworkUrl</code>
              </p>
              <input
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importFile(f);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* RULES TAB */}
      {tab === "rules" ? (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <div style={card}>
            <div style={h2}>GLOBAL RULES</div>
            {!rules ? (
              <div style={{ opacity: 0.7 }}>Loading rules…</div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  <Field label="Request! cost (Points)" value={rules.costRequest} onChange={(v) => setRules({ ...rules, costRequest: v })} />
                  <Field label="Upvote cost (Points)" value={rules.costUpvote} onChange={(v) => setRules({ ...rules, costUpvote: v })} />
                  <Field label="Downvote cost (Points)" value={rules.costDownvote} onChange={(v) => setRules({ ...rules, costDownvote: v })} />
                  <Field label="BOOST cost (Points)" value={rules.costPlayNow} onChange={(v) => setRules({ ...rules, costPlayNow: v })} />

                  <Field label="Max requests per user per session" value={rules.maxRequestsPerSession} onChange={(v) => setRules({ ...rules, maxRequestsPerSession: v })} />
                  <Field label="Max votes per user per session" value={rules.maxVotesPerSession} onChange={(v) => setRules({ ...rules, maxVotesPerSession: v })} />
                  <Field label="Min seconds between actions" value={rules.minSecondsBetweenActions} onChange={(v) => setRules({ ...rules, minSecondsBetweenActions: v })} />

                  <Toggle label="Enforce artist cooldown" checked={rules.enforceArtistCooldown} onChange={(c) => setRules({ ...rules, enforceArtistCooldown: c })} />
                  <Toggle label="Enforce song cooldown" checked={rules.enforceSongCooldown} onChange={(c) => setRules({ ...rules, enforceSongCooldown: c })} />
                  <Field label="Artist cooldown minutes" value={rules.artistCooldownMinutes} onChange={(v) => setRules({ ...rules, artistCooldownMinutes: v })} />
                  <Field label="Song cooldown minutes" value={rules.songCooldownMinutes} onChange={(v) => setRules({ ...rules, songCooldownMinutes: v })} />

                  <Toggle label="Enable voting" checked={rules.enableVoting} onChange={(c) => setRules({ ...rules, enableVoting: c })} />

                  <Text label="Logo URL (square or rectangle)" value={rules.logoUrl} onChange={(v) => setRules({ ...rules, logoUrl: v })} />
                  {rules.logoUrl ? (
                    <div style={{ marginTop: 6, opacity: 0.9 }}>
                      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Preview</div>
                      <img
                        src={rules.logoUrl}
                        alt="Logo preview"
                        style={{
                          height: 46,
                          width: "auto",
                          maxWidth: "100%",
                          objectFit: "contain",
                          borderRadius: 12,
                          border: "1px solid #2b2b55",
                          background: "#0b0b10",
                          padding: 8
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <div style={{ borderTop: "1px solid #1c1c2a", paddingTop: 12, marginTop: 12, display: "grid", gap: 10 }}>
                  <Text label="Explicit message" value={rules.msgExplicit} onChange={(t) => setRules({ ...rules, msgExplicit: t })} />
                  <Text label="Already requested message" value={rules.msgAlreadyRequested} onChange={(t) => setRules({ ...rules, msgAlreadyRequested: t })} />
                  <Text label="Artist cooldown message" value={rules.msgArtistCooldown} onChange={(t) => setRules({ ...rules, msgArtistCooldown: t })} />
                  <Text label="Song cooldown message" value={rules.msgSongCooldown} onChange={(t) => setRules({ ...rules, msgSongCooldown: t })} />
                  {/* Still maps to msgNoCredits in DB, but label is Points */}
                  <Text label="Not enough points message" value={rules.msgNoCredits} onChange={(t) => setRules({ ...rules, msgNoCredits: t })} />
                </div>

                <button onClick={saveRules} style={btn}>Save rules</button>
              </>
            )}
          </div>
          <div style={card}>
  <div style={h2}>REDEMPTION CODES</div>
  <div style={{ fontSize: 12, opacity: 0.75, marginTop: -6 }}>
    Codes expire with the current session automatically.
  </div>

  <div style={{ height: 12 }} />

  {/* Create */}
  <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.6fr", gap: 10 }}>
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.85 }}>Code</span>
      <input
        value={codeNew}
        onChange={(e) => setCodeNew(e.target.value.toUpperCase())}
        placeholder="BDAY2026"
        style={input}
      />
    </label>

    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.85 }}>Points</span>
      <input
        type="number"
        value={String(codePoints)}
        onChange={(e) => setCodePoints(Number(e.target.value))}
        style={input}
      />
    </label>

    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.85 }}>Max uses</span>
      <input
        type="number"
        value={String(codeMaxUses)}
        onChange={(e) => setCodeMaxUses(Number(e.target.value))}
        style={input}
      />
    </label>
  </div>

  <button onClick={createCode} style={btn}>Create code</button>

  {/* Import */}
  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1c1c2a" }}>
    <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>Import XLSX/CSV</div>
    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
      Columns: <code>code,points,maxUses</code> (maxUses optional)
    </div>

    <div style={{ marginTop: 10 }}>
      <input
        type="file"
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importCodesFile(f);
        }}
      />
    </div>
  </div>

  {codesMsg ? <div style={note}>{codesMsg}</div> : null}

  {/* List */}
  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1c1c2a" }}>
    <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>Current session codes</div>

    {codes.length === 0 ? (
      <div style={{ opacity: 0.7, marginTop: 10 }}>No codes yet.</div>
    ) : (
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {codes.map((c) => {
          const disabled = !!c.disabledAt;
          return (
            <div key={c.id} style={row}>
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 900 }}>
                  {c.code}
                  {disabled ? <span style={{ marginLeft: 10, opacity: 0.7 }}>DISABLED</span> : null}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Points <b>{c.points}</b> • Uses <b>{c.uses}</b>/{c.maxUses} • Expires{" "}
                  <b>{new Date(c.expiresAt).toLocaleString()}</b>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {!disabled ? (
                  <button onClick={() => disableCode(c.id)} style={smallBtnAlt}>Disable</button>
                ) : (
                  <button disabled style={{ ...smallBtnAlt, opacity: 0.5, cursor: "not-allowed" }}>Disabled</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>
        </div>
      ) : null}

      {/* TOP10 TAB */}
      {tab === "top10" ? (
        <div style={{ marginTop: 14 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <div style={h2}>CURRENT TOP 10</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {top10UpdatedAt ? `Updated: ${top10UpdatedAt}` : "Auto-refreshing"}
              </div>
            </div>

            {top10.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No Top 10 returned yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {top10.map((q, i) => (
                  <div key={q.id} style={row}>
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 900 }}>
                        {i + 1}. {q.title}
                        <span style={q.boosted || q.type === "PLAY_NOW" ? badgeBoost : badgeReq}>
                          {q.boosted || q.type === "PLAY_NOW" ? "BOOST" : "REQUEST"}
                        </span>
                      </div>
                      <div style={{ opacity: 0.75 }}>
                        {q.artist}
                        {q.requestedByLabel ? <> • {q.requestedByLabel}</> : null}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>
                        Score <b>{q.score}</b>
                        {q.upvotes != null ? <> • 👍 {q.upvotes}</> : null}
                        {q.downvotes != null ? <> • 👎 {q.downvotes}</> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 16, opacity: 0.7 }}>
        <small>Auto-refreshes every 3 seconds.</small>
      </div>
    </div>
  );
}

function QueueRow({
  q,
  index,
  onPlayed,
  onReject
}: {
  q: QueueItem;
  index?: number;
  onPlayed: () => void;
  onReject: () => void;
}) {
  const boosted = q.boosted || q.type === "PLAY_NOW";
  const requestedBy = q.requestedByLabel || "—";

  return (
    <div style={row}>
      <div style={{ display: "grid", gap: 3 }}>
        <div style={{ fontWeight: 900 }}>
          {index ? `${index}. ` : ""}
          {q.title}
          <span style={boosted ? badgeBoost : badgeReq}>{boosted ? "BOOST" : "REQUEST"}</span>
        </div>

        <div style={{ opacity: 0.75 }}>
          {q.artist} • <span style={{ opacity: 0.9 }}>Requested by</span> {requestedBy}
          {q.redemptionCode ? (
            <span style={{ marginLeft: 8, opacity: 0.9 }}>
              • Code: <b>{q.redemptionCode}</b>
            </span>
          ) : null}
        </div>

        <div style={{ fontSize: 12, opacity: 0.65 }}>
          Score <b>{q.score}</b>
          {q.upvotes != null ? <> • 👍 {q.upvotes}</> : null}
          {q.downvotes != null ? <> • 👎 {q.downvotes}</> : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onPlayed} style={smallBtn}>Played</button>
        <button onClick={onReject} style={smallBtnAlt}>Reject</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <input value={String(value ?? "")} onChange={(e) => onChange(Number(e.target.value))} style={input} />
    </label>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} style={input} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ opacity: 0.9 }}>{label}</span>
    </label>
  );
}

// ---------- styles ----------
const input: any = { padding: 12, borderRadius: 12, border: "1px solid #333", background: "#0b0b10", color: "white" };
const btn: any = { padding: 12, borderRadius: 14, border: "1px solid #2b2b55", background: "#15153a", color: "white", fontWeight: 900, cursor: "pointer", marginTop: 12 };
const smallBtn: any = { padding: "10px 12px", borderRadius: 12, border: "1px solid #2b2b55", background: "#15153a", color: "white", fontWeight: 900, cursor: "pointer" };
const smallBtnAlt: any = { padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#0c0c16", color: "white", fontWeight: 900, cursor: "pointer" };
const note: any = { marginTop: 12, padding: 12, borderRadius: 12, background: "#121228", border: "1px solid #1c1c2f" };

const card: any = { borderRadius: 22, border: "1px solid #222", background: "rgba(0,0,0,0.35)", padding: 16 };
const h2: any = { fontSize: 18, fontWeight: 900, letterSpacing: 1, opacity: 0.92, marginBottom: 10 };

const laneHdr: any = { fontSize: 14, fontWeight: 900, letterSpacing: 1, opacity: 0.85, marginBottom: 10 };
const row: any = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 12, borderRadius: 16, border: "1px solid #1c1c2f", background: "rgba(10,10,20,0.75)", marginBottom: 10 };

const badgeReq: any = { marginLeft: 10, padding: "4px 10px", borderRadius: 999, border: "1px solid #2b2b55", background: "rgba(21,21,58,0.6)", fontSize: 12, fontWeight: 900 };
const badgeBoost: any = { marginLeft: 10, padding: "4px 10px", borderRadius: 999, border: "1px solid #7a3cff", background: "rgba(66,20,120,0.6)", fontSize: 12, fontWeight: 900 };

const chipOn: any = { marginLeft: 10, padding: "3px 8px", borderRadius: 999, border: "1px solid #19ffb6", background: "rgba(0,255,180,0.07)", fontSize: 11, fontWeight: 900 };
const chipOff: any = { marginLeft: 10, padding: "3px 8px", borderRadius: 999, border: "1px solid #444", background: "rgba(255,255,255,0.04)", fontSize: 11, fontWeight: 900 };

const userRow: any = { padding: 12, borderRadius: 16, border: "1px solid #1c1c2f", background: "rgba(10,10,20,0.62)", marginBottom: 10 };

const tabBtn: any = { padding: "10px 12px", borderRadius: 14, border: "1px solid #222", background: "rgba(0,0,0,0.35)", color: "white", fontWeight: 900, cursor: "pointer" };
const tabBtnOn: any = { ...tabBtn, border: "1px solid #4a4aff", background: "rgba(22,22,70,0.75)" };

const loginWrap: any = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 };
const loginCard: any = {
  maxWidth: 560,
  width: "100%",
  borderRadius: 26,
  border: "1px solid rgba(90,90,255,0.35)",
  background: "rgba(0,0,0,0.42)",
  padding: 18,
  textAlign: "center",

  // subtle neon glow
  boxShadow:
    "0 0 0 1px rgba(90,90,255,0.12), 0 0 24px rgba(90,90,255,0.10), 0 0 60px rgba(122,60,255,0.08)",

  // appear animation
  animation: "rrAdminCardIn 520ms ease-out both",
};