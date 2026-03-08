
// src/app/admin/[location]/page.tsx

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

type TabKey = "dashboard" | "rules" | "top10" | "users" | "shoutoutSettings";

type QueueItem = {
  id: string;
  title: string;
  artist: string;
  score: number;
  createdAt: string;
  type: string;
  requestedByLabel?: string;
  boosted?: boolean;
  upvotes?: number;
  downvotes?: number;
  redemptionCode?: string | null;
};

type SessionUser = {
  emailHash: string;
  label: string;
  verified: boolean;
  points: number;
  redemptionCode?: string | null;
};

type ShoutoutItem = {
  id: string;
  fromName: string;
  messageText: string;
  tier: "BASIC" | "FEATURED" | string;
  creditsCost: number;
  status: string;
  moderationNotes?: string | null;
  createdAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  displayDurationSec?: number;
};

type ShoutoutsResponse = {
  ok?: boolean;
  pending?: ShoutoutItem[];
  approved?: ShoutoutItem[];
  active?: ShoutoutItem[];
  rejected?: ShoutoutItem[];
  blockedCount?: number;
};

function centsToDollars(cents: any): string {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "0.00";
  return (Math.max(0, Math.round(n)) / 100).toFixed(2);
}

function dollarsToCents(dollars: any): number {
  const n = Number(dollars);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

export default function AdminPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState<TabKey>("dashboard");

  const [rules, setRules] = useState<any>(null);
  const [queue, setQueue] = useState<{ playNow: QueueItem[]; upNext: QueueItem[] } | null>(null);

  const [codes, setCodes] = useState<any[]>([]);
  const [codeNew, setCodeNew] = useState("");
  const [codePoints, setCodePoints] = useState<number>(10);
  const [codeMaxUses, setCodeMaxUses] = useState<number>(1);
  const [codesMsg, setCodesMsg] = useState("");

  const [users, setUsers] = useState<SessionUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const USERS_PAGE_SIZE = 10;

  const [top10, setTop10] = useState<QueueItem[]>([]);
  const [top10UpdatedAt, setTop10UpdatedAt] = useState<string>("");

  const [shoutouts, setShoutouts] = useState<ShoutoutsResponse>({
    pending: [],
    approved: [],
    active: [],
    rejected: [],
    blockedCount: 0,
  });

  const [cachedLogoUrl, setCachedLogoUrl] = useState<string>("");

  const prevQueueIdsRef = useRef<Set<string>>(new Set());
  const hasBootedRef = useRef(false);

  const rulesCosts = useMemo(() => {
    const costRequest = Number(rules?.costRequest ?? 1);
    const costPlayNow = Number(rules?.costPlayNow ?? 5);
    const costUpvote = Number(rules?.costUpvote ?? 1);
    const costDownvote = Number(rules?.costDownvote ?? 1);
    return { costRequest, costPlayNow, costUpvote, costDownvote };
  }, [rules]);

  const usersTotalPages = Math.max(1, Math.ceil(users.length / USERS_PAGE_SIZE));
  const usersSlice = users.slice((usersPage - 1) * USERS_PAGE_SIZE, usersPage * USERS_PAGE_SIZE);

  const pendingMessages = shoutouts.pending || [];
  const approvedMessages = shoutouts.approved || [];
  const activeMessages = shoutouts.active || [];
  const rejectedMessages = shoutouts.rejected || [];

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

  function playNewRequestChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      o1.start(now);
      o2.start(now);
      o1.stop(now + 0.25);
      o2.stop(now + 0.25);

      setTimeout(() => ctx.close().catch(() => {}), 400);
    } catch {}
  }

  async function login(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setMsg("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    if (!res.ok) {
      setMsg("Wrong PIN.");
      return;
    }

    setAuthed(true);
  }

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
    if (!code) return setCodesMsg("Enter a code.");
    if (!codePoints || codePoints <= 0) return setCodesMsg("Points must be > 0.");
    if (!codeMaxUses || codeMaxUses < 1) return setCodesMsg("Max uses must be >= 1.");

    const r = await fetch(`/api/admin/redemption-codes/${location}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, points: codePoints, maxUses: codeMaxUses, source: "manual" }),
    });

    const d: any = await safeJson(r);
    if (!r.ok || !d.ok) {
      setCodesMsg(
        d?.error ||
          (d?._nonJson ? `Create code failed (non-JSON, ${r.status}).` : `Create code failed (${r.status}).`)
      );
      return;
    }

    setCodesMsg("✅ Code created.");
    setCodeNew("");
    await loadCodes();
  }

  async function disableCode(id: string) {
    setCodesMsg("");
    await fetch(`/api/admin/redemption-codes/disable`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
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
      body: form,
    });

    const d: any = await safeJson(r);
    if (!r.ok || !d.ok) {
      setCodesMsg(d.error || "Import failed.");
      return;
    }

    setCodesMsg(`✅ Imported ${d.created} • Skipped ${d.skipped}`);
    await loadCodes();
  }

  async function loadShoutouts() {
    try {
      const r = await fetch(`/api/admin/shoutouts/${location}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as ShoutoutsResponse;
      setShoutouts({
        pending: d.pending || [],
        approved: d.approved || [],
        active: d.active || [],
        rejected: d.rejected || [],
        blockedCount: d.blockedCount || 0,
      });
    } catch {}
  }

  async function loadAll() {
    const r1 = await fetch(`/api/admin/rules/get/${location}`, { cache: "no-store" });

    if (r1.status === 401) {
      setAuthed(false);
      return;
    }

    const d1: any = await safeJson(r1);

    if (!r1.ok || !d1?.rules) {
      setMsg(
        d1?.error ||
          (d1?._nonJson ? `Rules API returned non-JSON (status ${r1.status}).` : `Rules API failed (${r1.status}).`)
      );
      return;
    }

    setRules(d1.rules);
    cacheLogo(d1?.rules?.logoUrl);

    const r2 = await fetch(`/api/admin/queue/${location}`, { cache: "no-store" });
    const d2 = await safeJson(r2);
    const nextQueue = { playNow: d2.playNow || [], upNext: d2.upNext || [] };
    setQueue(nextQueue);

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

    try {
      const r3 = await fetch(`/api/admin/session-users/${location}`, { cache: "no-store" });
      if (r3.ok) {
        const d3 = await r3.json();
        setUsers(d3.users || []);
      }
    } catch {}

    try {
      const r4 = await fetch(`/api/admin/top10/${location}`, { cache: "no-store" });
      if (r4.ok) {
        const d4 = await r4.json();
        setTop10(d4.items || []);
        setTop10UpdatedAt(d4.updatedAt || "");
      }
    } catch {}

    await Promise.all([loadCodes(), loadShoutouts()]);
  }

  async function saveRules() {
    setMsg("");
    const res = await fetch(`/api/admin/rules/set/${location}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rules),
    });

    const data = await safeJson(res);
    if (!data.ok) setMsg("Failed to save request settings.");
    else setMsg("✅ Request settings saved.");

    await loadAll();
  }

  async function markPlayed(requestId: string) {
    await fetch(`/api/admin/queue/played`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    await loadAll();
  }

  async function rejectRequest(requestId: string) {
    const reason = prompt("Reject reason?", "Rejected");
    if (!reason) return;
    await fetch(`/api/admin/queue/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId, reason }),
    });
    await loadAll();
  }

  async function approveShoutout(messageId: string) {
    setMsg("");
    const r = await fetch(`/api/admin/shoutouts/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    const d = await safeJson(r);
    if (!r.ok || !d.ok) setMsg(d?.error || "Could not approve message.");
    else setMsg("✅ Message approved.");
    await loadAll();
  }

  async function rejectShoutout(messageId: string) {
    const note = prompt("Reject reason?", "Rejected");
    if (!note) return;
    setMsg("");
    const r = await fetch(`/api/admin/shoutouts/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId, note }),
    });
    const d = await safeJson(r);
    if (!r.ok || !d.ok) setMsg(d?.error || "Could not reject message.");
    else setMsg(d?.refunded ? "✅ Message rejected and points refunded." : "✅ Message rejected.");
    await loadAll();
  }

  async function importFile(file: File) {
    setMsg("");
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`/api/admin/songs/import/${location}`, {
      method: "POST",
      body: form,
    });

    const data = await safeJson(res);
    if (!data.ok) setMsg(data.error || "Import failed.");
    else setMsg(`✅ Imported ${data.created} songs.`);
  }

  useEffect(() => {
    loadCachedLogo();
    fetch(`/api/admin/rules/get/${location}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.rules?.logoUrl) cacheLogo(d.rules.logoUrl);
      })
      .catch(() => {});
  }, [location]);

  useEffect(() => {
    if (!authed) return;
    loadAll();
    const id = setInterval(loadAll, 3000);
    return () => clearInterval(id);
  }, [authed]);

  if (!authed) {
    const logoUrl = cachedLogoUrl;

    return (
      <div style={loginWrap}>
        <style>{`
          @keyframes rrAdminCardIn {
            0% { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(2px); }
            100% { opacity: 1; transform: translateY(0px) scale(1); filter: blur(0px); }
          }
          @keyframes rrAdminLogoIn {
            0% { opacity: 0; transform: scale(0.92); filter: blur(6px); }
            55% { opacity: 1; transform: scale(1.02); filter: blur(0px); }
            100% { opacity: 1; transform: scale(1); filter: blur(0px); }
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
                boxShadow:
                  "0 0 0 1px rgba(90,90,255,0.10), 0 0 22px rgba(90,90,255,0.10), 0 0 70px rgba(122,60,255,0.10)",
                animation: "rrAdminLogoIn 700ms cubic-bezier(0.2, 0.9, 0.2, 1) both",
              }}
            />
          ) : null}

          <h1 style={{ margin: 0 }}>Admin • {location}</h1>
          <p style={{ opacity: 0.8, marginTop: 6 }}>Enter PIN to manage requests, users, and shout-outs.</p>

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

  return (
    <div style={{ padding: 14, maxWidth: 1500, margin: "0 auto" }}>
      <div style={heroWrap}>
        <div style={heroBrand}>
          {cachedLogoUrl ? (
            <div style={heroLogoWrap}>
              <img src={cachedLogoUrl} alt="Admin Logo" style={heroLogoImg} />
            </div>
          ) : (
            <div style={heroLogoFallback}>REMIX</div>
          )}

          <div>
            <div style={heroTitle}>ADMIN DASHBOARD</div>
            <div style={heroSubtitle}>{location}</div>
          </div>
        </div>

        <div style={tabsWrap}>
          <button onClick={() => setTab("dashboard")} style={tab === "dashboard" ? tabBtnOn : tabBtn}>Dashboard</button>
          <button onClick={() => setTab("rules")} style={tab === "rules" ? tabBtnOn : tabBtn}>Request Settings</button>
          <button onClick={() => setTab("top10")} style={tab === "top10" ? tabBtnOn : tabBtn}>Top 10</button>
          <button onClick={() => setTab("users")} style={tab === "users" ? tabBtnOn : tabBtn}>Users and Points</button>
          <button onClick={() => setTab("shoutoutSettings")} style={tab === "shoutoutSettings" ? tabBtnOn : tabBtn}>Shoutout Settings</button>
        </div>
      </div>

      {msg ? <div style={note}>{msg}</div> : null}

      {tab === "dashboard" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <div style={h2}>PENDING REQUESTS</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Request <b>{rulesCosts.costRequest}</b> • BOOST <b>{rulesCosts.costPlayNow}</b> • Upvote <b>{rulesCosts.costUpvote}</b> • Downvote <b>{rulesCosts.costDownvote}</b>
              </div>
            </div>

            <div style={{ height: 10 }} />

            <div style={laneHdr}>BOOSTED (<i>PAID</i> TO PLAY NEXT)</div>
            {(queue?.playNow || []).map((q) => (
              <QueueRow key={q.id} q={q} onPlayed={() => markPlayed(q.id)} onReject={() => rejectRequest(q.id)} />
            ))}
            {(queue?.playNow?.length || 0) === 0 ? <div style={{ opacity: 0.7 }}>No Play Now requests.</div> : null}

            <div style={{ height: 16 }} />

            <div style={laneHdr}>UP NEXT</div>
            {(queue?.upNext || []).slice(0, 30).map((q, i) => (
              <QueueRow key={q.id} q={q} index={i + 1} onPlayed={() => markPlayed(q.id)} onReject={() => rejectRequest(q.id)} />
            ))}
            {(queue?.upNext?.length || 0) === 0 ? <div style={{ opacity: 0.7 }}>No queued requests yet.</div> : null}
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <div style={h2}>PENDING MESSAGES</div>
              <div style={{ fontSize: 12, opacity: 0.72 }}>
                Pending <b>{pendingMessages.length}</b> • Approved <b>{approvedMessages.length}</b> • Rejected <b>{rejectedMessages.length}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <MiniStat label="Pending" value={pendingMessages.length} />
              <MiniStat label="Live-ready" value={approvedMessages.length + activeMessages.length} />
              <MiniStat label="Blocked by filter" value={Number(shoutouts.blockedCount || 0)} />
            </div>

            {pendingMessages.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No pending messages right now.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {pendingMessages.map((m) => (
                  <MessageRow
                    key={m.id}
                    m={m}
                    onApprove={() => approveShoutout(m.id)}
                    onReject={() => rejectShoutout(m.id)}
                  />
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1c1c2f" }}>
              <div style={laneHdr}>APPROVED / ACTIVE SNAPSHOT</div>
              {(approvedMessages.length + activeMessages.length) === 0 ? (
                <div style={{ opacity: 0.7 }}>No approved shout-outs yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {[...activeMessages, ...approvedMessages].slice(0, 6).map((m) => (
                    <div key={m.id} style={miniMessageRow}>
                      <div>
                        <div style={{ fontWeight: 900 }}>
                          {m.fromName || "Guest"}
                          <span style={m.tier === "FEATURED" ? badgeBoost : badgeReq}>
                            {m.tier === "FEATURED" ? "FEATURED" : "BASIC"}
                          </span>
                        </div>
                        <div style={{ opacity: 0.8 }}>{m.messageText}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "rules" ? (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
          <div style={card}>
            <div style={h2}>REQUEST SETTINGS</div>
            {!rules ? (
              <div style={{ opacity: 0.7 }}>Loading rules…</div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  <Field label="Request cost (Points)" value={rules.costRequest} onChange={(v) => setRules({ ...rules, costRequest: v })} />
                  <Field label="Upvote cost (Points)" value={rules.costUpvote} onChange={(v) => setRules({ ...rules, costUpvote: v })} />
                  <Field label="Downvote cost (Points)" value={rules.costDownvote} onChange={(v) => setRules({ ...rules, costDownvote: v })} />
                  <Field label="BOOST cost (Points)" value={rules.costPlayNow} onChange={(v) => setRules({ ...rules, costPlayNow: v })} />

                  <MoneyField
                    label="Tier 1 Price ($) — 10 credits"
                    centsValue={rules.packTier1PriceCents ?? 500}
                    onChangeCents={(c) => setRules({ ...rules, packTier1PriceCents: c })}
                  />
                  <MoneyField
                    label="Tier 2 Price ($) — 25 credits"
                    centsValue={rules.packTier2PriceCents ?? 1000}
                    onChangeCents={(c) => setRules({ ...rules, packTier2PriceCents: c })}
                  />
                  <MoneyField
                    label="Tier 3 Price ($) — 35 credits"
                    centsValue={rules.packTier3PriceCents ?? 1500}
                    onChangeCents={(c) => setRules({ ...rules, packTier3PriceCents: c })}
                  />
                  <MoneyField
                    label="Tier 4 Price ($) — 50 credits"
                    centsValue={rules.packTier4PriceCents ?? 2000}
                    onChangeCents={(c) => setRules({ ...rules, packTier4PriceCents: c })}
                  />

                  <Field label="Max requests per user per session" value={rules.maxRequestsPerSession} onChange={(v) => setRules({ ...rules, maxRequestsPerSession: v })} />
                  <Field label="Max votes per user per session" value={rules.maxVotesPerSession} onChange={(v) => setRules({ ...rules, maxVotesPerSession: v })} />
                  <Field label="Min seconds between actions" value={rules.minSecondsBetweenActions} onChange={(v) => setRules({ ...rules, minSecondsBetweenActions: v })} />
                  <Field label="Max songs by same artist in queue (0 = unlimited)" value={rules.maxArtistInQueue ?? 0} onChange={(v) => setRules({ ...rules, maxArtistInQueue: v })} />
                  <Field label="Max active songs per user in queue (0 = unlimited)" value={rules.maxActiveRequestsPerUser ?? 2} onChange={(v) => setRules({ ...rules, maxActiveRequestsPerUser: v })} />

                  <Toggle label="Enable voting" checked={rules.enableVoting} onChange={(c) => setRules({ ...rules, enableVoting: c })} />
                  <Toggle label="Enforce artist cooldown" checked={rules.enforceArtistCooldown} onChange={(c) => setRules({ ...rules, enforceArtistCooldown: c })} />
                  <Toggle label="Enforce song cooldown" checked={rules.enforceSongCooldown} onChange={(c) => setRules({ ...rules, enforceSongCooldown: c })} />

                  <Field label="Artist cooldown minutes" value={rules.artistCooldownMinutes} onChange={(v) => setRules({ ...rules, artistCooldownMinutes: v })} />
                  <Field label="Song cooldown minutes" value={rules.songCooldownMinutes} onChange={(v) => setRules({ ...rules, songCooldownMinutes: v })} />

                  <Text label="Logo URL (square or rectangle)" value={rules.logoUrl} onChange={(v) => setRules({ ...rules, logoUrl: v })} />
                  {rules.logoUrl ? (
                    <div style={{ marginTop: 6 }}>
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
                          padding: 8,
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <div style={{ borderTop: "1px solid #1c1c2a", paddingTop: 12, marginTop: 12, display: "grid", gap: 10 }}>
                  <Text label="Explicit message" value={rules.msgExplicit} onChange={(t) => setRules({ ...rules, msgExplicit: t })} />
                  <Text label="Too many active requests message" value={rules.msgTooManyActiveRequests || ""} onChange={(t) => setRules({ ...rules, msgTooManyActiveRequests: t })} />
                  <Text label="Already requested message" value={rules.msgAlreadyRequested} onChange={(t) => setRules({ ...rules, msgAlreadyRequested: t })} />
                  <Text label="Artist cooldown message" value={rules.msgArtistCooldown} onChange={(t) => setRules({ ...rules, msgArtistCooldown: t })} />
                  <Text label="Song cooldown message" value={rules.msgSongCooldown} onChange={(t) => setRules({ ...rules, msgSongCooldown: t })} />
                  <Text label="Artist already queued message" value={rules.msgArtistAlreadyQueued || ""} onChange={(t) => setRules({ ...rules, msgArtistAlreadyQueued: t })} />
                  <Text label="Not enough points message" value={rules.msgNoCredits} onChange={(t) => setRules({ ...rules, msgNoCredits: t })} />
                </div>

                <button onClick={saveRules} style={btn}>Save request settings</button>
              </>
            )}
          </div>

          <div style={{ display: "grid", gap: 16 }}>
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

            <div style={card}>
              <div style={h2}>REQUESTS SUMMARY</div>
              <div style={summaryGrid}>
                <MiniStat label="Boosted" value={queue?.playNow?.length || 0} />
                <MiniStat label="Up next" value={queue?.upNext?.length || 0} />
                <MiniStat label="Voting" value={rules?.enableVoting ? "On" : "Off"} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "users" ? (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 16 }}>
          <div style={card}>
            <div style={h2}>ACTIVE SESSION USERS</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: -4 }}>
              Verified users + points balance. Auto-refreshing.
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
                      {u.redemptionCode ? <span style={{ marginLeft: 8 }}>Code: <b>{u.redemptionCode}</b></span> : null}
                    </div>
                  </div>
                </div>
              ))
            )}

            {usersTotalPages > 1 ? (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <button style={smallBtnAlt} onClick={() => setUsersPage((p) => Math.max(1, p - 1))} disabled={usersPage === 1}>
                  Prev
                </button>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Page {usersPage} / {usersTotalPages}
                </div>
                <button style={smallBtnAlt} onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))} disabled={usersPage === usersTotalPages}>
                  Next
                </button>
              </div>
            ) : null}
          </div>

          <div style={card}>
            <div style={h2}>REDEMPTION CODES</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: -6 }}>
              Codes expire with the current session automatically.
            </div>

            <div style={{ height: 12 }} />

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

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button onClick={createCode} style={btn}>Create code</button>
              <label style={{ ...smallBtnAlt, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                Import codes
                <input
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importCodesFile(f);
                  }}
                />
              </label>
            </div>

            {codesMsg ? <div style={note}>{codesMsg}</div> : null}

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
                            Points <b>{c.points}</b> • Uses <b>{c.uses}</b>/{c.maxUses} • Expires <b>{new Date(c.expiresAt).toLocaleString()}</b>
                          </div>
                        </div>

                        {!disabled ? (
                          <button onClick={() => disableCode(c.id)} style={smallBtnAlt}>Disable</button>
                        ) : (
                          <button disabled style={{ ...smallBtnAlt, opacity: 0.5, cursor: "not-allowed" }}>Disabled</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

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

      {tab === "shoutoutSettings" ? (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={card}>
            <div style={h2}>SHOUTOUTS CONTROL CENTER</div>
            <div style={{ display: "grid", gap: 12 }}>
              <MiniInfo title="Current products">
                Basic text shout-out and Featured text shout-out are live through the shared points wallet.
              </MiniInfo>
              <MiniInfo title="Current moderation flow">
                Explicit text is blocked before staff sees it. Staff approves or rejects the remaining pending messages.
              </MiniInfo>
              <MiniInfo title="V2 settings target">
                Duration on screen, weighted rotation, image shout-outs, image moderation, and placement priority.
              </MiniInfo>
            </div>
          </div>

          <div style={card}>
            <div style={h2}>MESSAGE OPERATIONS SNAPSHOT</div>
            <div style={summaryGrid}>
              <MiniStat label="Pending" value={pendingMessages.length} />
              <MiniStat label="Approved" value={approvedMessages.length} />
              <MiniStat label="Active" value={activeMessages.length} />
              <MiniStat label="Rejected" value={rejectedMessages.length} />
              <MiniStat label="Blocked" value={Number(shoutouts.blockedCount || 0)} />
            </div>

            <div style={{ marginTop: 16, padding: 14, borderRadius: 18, border: "1px solid #1c1c2f", background: "rgba(10,10,20,0.6)" }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Next recommended build</div>
              <div style={{ opacity: 0.8, lineHeight: 1.5 }}>
                Add a dedicated admin shoutout rules API so this tab can save:
                featured duration, basic duration, daily max messages, pending cap per user, auto-expire timing, and message enable/disable.
              </div>
            </div>
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
  onReject,
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

        <div style={{ fontSize: 12, opacity: 0.68 }}>
          Score <b>{q.score}</b>
          {q.upvotes != null ? <> • 👍 {q.upvotes}</> : null}
          {q.downvotes != null ? <> • 👎 {q.downvotes}</> : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onPlayed} style={smallBtn}>Played</button>
        <button onClick={onReject} style={smallBtnAlt}>Reject</button>
      </div>
    </div>
  );
}

function MessageRow({
  m,
  onApprove,
  onReject,
}: {
  m: ShoutoutItem;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isFeatured = m.tier === "FEATURED";

  return (
    <div style={messageRowStyle}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 1000, fontSize: 16 }}>{m.fromName || "Guest"}</div>
          <span style={isFeatured ? badgeBoost : badgeReq}>{isFeatured ? "FEATURED" : "BASIC"}</span>
          <span style={miniPill}>Points {m.creditsCost ?? 0}</span>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.45, opacity: 0.95 }}>{m.messageText}</div>

        <div style={{ fontSize: 12, opacity: 0.66 }}>
          Submitted {m.createdAt ? new Date(m.createdAt).toLocaleString() : "just now"}
          {m.displayDurationSec ? <> • Duration target {m.displayDurationSec}s</> : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={onApprove} style={smallBtn}>Approve</button>
        <button onClick={onReject} style={smallBtnAlt}>Reject</button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: any;
  onChange: (next: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <input
        type="number"
        value={String(value ?? 0)}
        onChange={(e) => onChange(Number(e.target.value))}
        style={input}
      />
    </label>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <input
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label style={{ ...row, marginBottom: 0, cursor: "pointer" }}>
      <div style={{ fontWeight: 800 }}>{label}</div>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 20, height: 20 }}
      />
    </label>
  );
}

function MoneyField({
  label,
  centsValue,
  onChangeCents,
}: {
  label: string;
  centsValue: number;
  onChangeCents: (cents: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <input
        value={centsToDollars(centsValue)}
        onChange={(e) => onChangeCents(dollarsToCents(e.target.value))}
        style={input}
        inputMode="decimal"
      />
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: any }) {
  return (
    <div style={miniStat}>
      <div style={{ fontSize: 12, opacity: 0.72, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontWeight: 1000, fontSize: 24 }}>{String(value)}</div>
    </div>
  );
}

function MiniInfo({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 14, borderRadius: 18, border: "1px solid #1c1c2f", background: "rgba(10,10,20,0.62)" }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
      <div style={{ opacity: 0.82, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

const bodyBg = {
  background:
    "radial-gradient(circle at 14% 14%, rgba(0,255,255,0.05), transparent 24%), radial-gradient(circle at 84% 18%, rgba(167,79,255,0.08), transparent 24%), #04060d",
  color: "white",
};

if (typeof document !== "undefined") {
  document.body.style.background = (bodyBg as any).background;
  document.body.style.color = "white";
}

const input: any = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #333",
  background: "#0c0c16",
  color: "white",
  outline: "none",
};

const btn: any = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid #4a4aff",
  background: "rgba(22,22,70,0.75)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const smallBtn: any = {
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid #4a4aff",
  background: "rgba(22,22,70,0.75)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const smallBtnAlt: any = {
  padding: "9px 12px",
  borderRadius: 12,
  border: "1px solid #333",
  background: "#0c0c16",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const note: any = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#121228",
  border: "1px solid #1c1c2f",
};

const card: any = {
  borderRadius: 22,
  border: "1px solid #222",
  background: "rgba(0,0,0,0.35)",
  padding: 16,
  boxShadow: "0 0 0 1px rgba(255,255,255,0.02), inset 0 0 30px rgba(255,255,255,0.01)",
};

const h2: any = {
  fontSize: 18,
  fontWeight: 1000,
  letterSpacing: 1,
  fontStyle: "italic",
  opacity: 0.96,
  marginBottom: 10,
};

const laneHdr: any = {
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: 1,
  opacity: 0.85,
  marginBottom: 10,
};

const row: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 16,
  border: "1px solid #1c1c2f",
  background: "rgba(10,10,20,0.75)",
  marginBottom: 10,
};

const badgeReq: any = {
  marginLeft: 10,
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid #2b2b55",
  background: "rgba(21,21,58,0.6)",
  fontSize: 12,
  fontWeight: 900,
};

const badgeBoost: any = {
  marginLeft: 10,
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid #7a3cff",
  background: "rgba(66,20,120,0.6)",
  fontSize: 12,
  fontWeight: 900,
};

const chipOn: any = {
  marginLeft: 10,
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid #19ffb6",
  background: "rgba(0,255,180,0.07)",
  fontSize: 11,
  fontWeight: 900,
};

const chipOff: any = {
  marginLeft: 10,
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid #444",
  background: "rgba(255,255,255,0.04)",
  fontSize: 11,
  fontWeight: 900,
};

const userRow: any = {
  padding: 12,
  borderRadius: 16,
  border: "1px solid #1c1c2f",
  background: "rgba(10,10,20,0.62)",
  marginBottom: 10,
};

const tabBtn: any = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid #222",
  background: "rgba(0,0,0,0.35)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const tabBtnOn: any = {
  ...tabBtn,
  border: "1px solid #4a4aff",
  background: "rgba(22,22,70,0.75)",
  boxShadow: "0 0 20px rgba(74,74,255,0.12)",
};

const loginWrap: any = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  ...bodyBg,
};

const loginCard: any = {
  maxWidth: 560,
  width: "100%",
  borderRadius: 26,
  border: "1px solid rgba(90,90,255,0.35)",
  background: "rgba(0,0,0,0.42)",
  padding: 18,
  textAlign: "center",
  animation: "rrAdminCardIn 500ms ease both",
};

const heroWrap: any = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "stretch",
  border: "1px solid #161625",
  background: "rgba(0,0,0,0.35)",
  borderRadius: 24,
  overflow: "hidden",
};

const heroBrand: any = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  padding: 14,
  borderRight: "1px solid #10101a",
  minHeight: 92,
};

const heroLogoWrap: any = {
  width: 78,
  height: 78,
  borderRadius: 0,
  overflow: "hidden",
  border: "1px solid #1d1d30",
  background: "#090b12",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const heroLogoImg: any = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
};

const heroLogoFallback: any = {
  width: 78,
  height: 78,
  display: "grid",
  placeItems: "center",
  border: "1px solid #1d1d30",
  background: "#090b12",
  fontWeight: 1000,
};

const heroTitle: any = {
  fontSize: 28,
  fontWeight: 1000,
  fontStyle: "italic",
  letterSpacing: 0.6,
};

const heroSubtitle: any = {
  opacity: 0.72,
  marginTop: 6,
};

const tabsWrap: any = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
  padding: 14,
};

const messageRowStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  padding: 14,
  borderRadius: 18,
  border: "1px solid #1c1c2f",
  background: "rgba(10,10,20,0.78)",
};

const miniMessageRow: any = {
  padding: 10,
  borderRadius: 14,
  border: "1px solid #1c1c2f",
  background: "rgba(10,10,20,0.55)",
};

const miniStat: any = {
  padding: 12,
  borderRadius: 16,
  border: "1px solid #1c1c2f",
  background: "rgba(10,10,20,0.62)",
  minWidth: 120,
};

const miniPill: any = {
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid #2b2b55",
  background: "rgba(21,21,58,0.6)",
  fontSize: 11,
  fontWeight: 900,
};

const summaryGrid: any = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
