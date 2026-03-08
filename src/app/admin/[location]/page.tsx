"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SHOUTOUT_PRODUCTS } from "@/lib/shoutoutProducts";

type TabKey = "dashboard" | "requestSettings" | "top10" | "users" | "shoutoutSettings";

type RequestItem = {
  id: string;
  title: string;
  artist: string;
  score: number;
};

type MessageItem = {
  id: string;
  fromName: string;
  messageText: string;
  tier: string;
  creditsCost?: number;
  status?: string;
  moderationNotes?: string | null;
  createdAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  displayDurationSec?: number;
  imageOriginalPath?: string | null;
  imagePreviewPath?: string | null;
  imageModerationStatus?: string | null;
  signedImageUrl?: string | null;
};

type PlaceholderMessage = {
  id: string;
  title: string;
  body: string;
  fromName: string;
  imageUrl?: string | null;
  accent?: "gold" | "cyan" | "pink";
  productTitle?: string;
};

type RulesState = {
  costRequest: number;
  costUpvote: number;
  costDownvote: number;
  costPlayNow: number;
  enableVoting: boolean;
  enforceArtistCooldown?: boolean;
  enforceSongCooldown?: boolean;
  artistCooldownMinutes?: number;
  songCooldownMinutes?: number;
  maxRequestsPerSession?: number;
  maxVotesPerSession?: number;
  minSecondsBetweenActions?: number;
  maxArtistInQueue?: number;
  maxActiveRequestsPerUser?: number;
  msgExplicit?: string;
  msgTooManyActiveRequests?: string;
  msgAlreadyRequested?: string;
  msgArtistCooldown?: string;
  msgSongCooldown?: string;
  msgArtistAlreadyQueued?: string;
  msgNoCredits?: string;
  logoUrl?: string;
  packTier1PriceCents?: number;
  packTier2PriceCents?: number;
  packTier3PriceCents?: number;
  packTier4PriceCents?: number;
};

type SessionUser = {
  emailHash: string;
  label: string;
  verified: boolean;
  points: number;
  redemptionCode?: string | null;
};

type Top10Item = {
  id: string;
  title: string;
  artist: string;
  score: number;
};

type RedemptionCode = {
  id: string;
  code: string;
  points: number;
  uses: number;
  maxUses: number;
  expiresAt: string;
  disabledAt?: string | null;
};

type AdminShoutoutsResponse = {
  ok?: boolean;
  pending?: MessageItem[];
  approved?: MessageItem[];
  active?: MessageItem[];
  rejected?: MessageItem[];
  blockedCount?: number;
};

const DEFAULT_PLACEHOLDERS: PlaceholderMessage[] = [
  {
    id: "msg1",
    title: "REMIX SHOUT OUTS!",
    body: "Happy Birthday Taylor and Hunter!",
    fromName: "-$name",
    imageUrl: null,
    accent: "cyan",
    productTitle: "Basic Text Shout Out",
  },
  {
    id: "msg2",
    title: "REMIX SHOUT OUTS!",
    body: "Congrats to our birthday crew tonight. Thanks for celebrating at Remix!",
    fromName: "-$name",
    imageUrl: null,
    accent: "gold",
    productTitle: "Remix Roller Text Shout Out",
  },
  {
    id: "msg3",
    title: "REMIX SHOUT OUTS!",
    body: "Welcome to Remix! Scan the code, request your song, and send a shout out.",
    fromName: "-$name",
    imageUrl: null,
    accent: "pink",
    productTitle: "VIP Text Shout Out",
  },
];

function placeholderKey(location: string) {
  return `rr_tv_placeholders:${location}`;
}

function logoKey(location: string) {
  return `rr_admin_logoUrl:${location}`;
}

function loadSavedPlaceholders(location: string): PlaceholderMessage[] {
  try {
    const raw = localStorage.getItem(placeholderKey(location));
    if (!raw) return DEFAULT_PLACEHOLDERS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_PLACEHOLDERS;

    return parsed.map((p: any, i: number) => ({
      id: p?.id || `msg${i + 1}`,
      title: String(p?.title || DEFAULT_PLACEHOLDERS[i]?.title || "REMIX SHOUT OUTS!"),
      body: String(p?.body || DEFAULT_PLACEHOLDERS[i]?.body || ""),
      fromName: String(p?.fromName || DEFAULT_PLACEHOLDERS[i]?.fromName || "-$name"),
      imageUrl: p?.imageUrl || null,
      accent: (p?.accent || DEFAULT_PLACEHOLDERS[i]?.accent || "cyan") as "gold" | "cyan" | "pink",
      productTitle: String(
        p?.productTitle || DEFAULT_PLACEHOLDERS[i]?.productTitle || "Remix Shout Out"
      ),
    }));
  } catch {
    return DEFAULT_PLACEHOLDERS;
  }
}

function savePlaceholders(location: string, items: PlaceholderMessage[]) {
  localStorage.setItem(placeholderKey(location), JSON.stringify(items));
}

function safeProduct(tier?: string) {
  return tier ? (SHOUTOUT_PRODUCTS as any)[tier] : null;
}

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

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return { ok: false, _raw: "", _nonJson: true };
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, _raw: text.slice(0, 500), _nonJson: true };
  }
}

function playChime() {
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

export default function AdminPage({ params }: { params: { location: string } }) {
  const location = params.location;

  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [msg, setMsg] = useState("");
  const [cachedLogoUrl, setCachedLogoUrl] = useState("");

  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [pendingMessages, setPendingMessages] = useState<MessageItem[]>([]);
  const [approvedMessages, setApprovedMessages] = useState<MessageItem[]>([]);
  const [activeMessages, setActiveMessages] = useState<MessageItem[]>([]);
  const [rejectedMessages, setRejectedMessages] = useState<MessageItem[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);

  const [rules, setRules] = useState<RulesState | null>(null);
  const [placeholders, setPlaceholders] = useState<PlaceholderMessage[]>(DEFAULT_PLACEHOLDERS);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [top10, setTop10] = useState<Top10Item[]>([]);
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [codesMsg, setCodesMsg] = useState("");
  const [codeNew, setCodeNew] = useState("");
  const [codePoints, setCodePoints] = useState<number>(10);
  const [codeMaxUses, setCodeMaxUses] = useState<number>(1);

  const prevRequestIdsRef = useRef<Set<string>>(new Set());
  const prevMessageIdsRef = useRef<Set<string>>(new Set());
  const hasBootedRef = useRef(false);

  const liveProducts = useMemo(() => Object.values(SHOUTOUT_PRODUCTS), []);
  const logoUrl = rules?.logoUrl || cachedLogoUrl || "/logo.png";

  function cacheLogo(url?: string | null) {
    if (!url) return;
    try {
      localStorage.setItem(logoKey(location), url);
      setCachedLogoUrl(url);
    } catch {}
  }

  function loadCachedLogo() {
    try {
      const v = localStorage.getItem(logoKey(location));
      if (v) setCachedLogoUrl(v);
    } catch {}
  }

  function maybePlayChime(nextRequestItems: RequestItem[], nextPendingMessages: MessageItem[]) {
    const requestIds = new Set(nextRequestItems.map((r) => r.id));
    const messageIds = new Set(nextPendingMessages.map((m) => m.id));

    if (hasBootedRef.current) {
      let foundNew = false;

      for (const id of requestIds) {
        if (!prevRequestIdsRef.current.has(id)) {
          foundNew = true;
          break;
        }
      }

      if (!foundNew) {
        for (const id of messageIds) {
          if (!prevMessageIdsRef.current.has(id)) {
            foundNew = true;
            break;
          }
        }
      }

      if (foundNew) playChime();
    } else {
      hasBootedRef.current = true;
    }

    prevRequestIdsRef.current = requestIds;
    prevMessageIdsRef.current = messageIds;
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

  async function loadRequests() {
    try {
      const res = await fetch(`/api/admin/queue/${location}`, { cache: "no-store" });
      const data = await res.json();
      const nextPending = data.pending || data.upNext || [];
      setPendingRequests(nextPending);
      return nextPending as RequestItem[];
    } catch {
      return [] as RequestItem[];
    }
  }

  async function loadMessages() {
    try {
      const res = await fetch(`/api/admin/shoutouts/${location}`, { cache: "no-store" });
      const data = (await res.json()) as AdminShoutoutsResponse;
      const nextPending = data.pending || [];
      setPendingMessages(nextPending);
      setApprovedMessages(data.approved || []);
      setActiveMessages(data.active || []);
      setRejectedMessages(data.rejected || []);
      setBlockedCount(Number(data.blockedCount || 0));
      return nextPending as MessageItem[];
    } catch {
      return [] as MessageItem[];
    }
  }

  async function loadRules() {
    try {
      const res = await fetch(`/api/admin/rules/get/${location}`, { cache: "no-store" });

      if (res.status === 401) {
        setAuthed(false);
        return null;
      }

      const data: any = await safeJson(res);
      if (data?.rules) {
        setRules(data.rules);
        cacheLogo(data.rules.logoUrl);
        return data.rules as RulesState;
      }
    } catch {}
    return null;
  }

  async function saveRules() {
    if (!rules) return;
    const res = await fetch(`/api/admin/rules/set/${location}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rules),
    });
    const data: any = await safeJson(res);
    if (data?.ok) {
      if (rules.logoUrl) cacheLogo(rules.logoUrl);
      setMsg("✅ Request settings saved.");
    } else {
      setMsg("Could not save request settings.");
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch(`/api/admin/session-users/${location}`, { cache: "no-store" });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
  }

  async function loadTop10() {
    try {
      const res = await fetch(`/api/admin/top10/${location}`, { cache: "no-store" });
      const data = await res.json();
      setTop10(data.items || []);
    } catch {}
  }

  async function loadCodes() {
    try {
      const res = await fetch(`/api/admin/redemption-codes/${location}`, { cache: "no-store" });
      const data = await res.json();
      setCodes(data.items || []);
    } catch {}
  }

  async function createCode() {
    setCodesMsg("");
    const code = codeNew.trim().toUpperCase();
    if (!code) return setCodesMsg("Enter a code.");
    const res = await fetch(`/api/admin/redemption-codes/${location}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        points: codePoints,
        maxUses: codeMaxUses,
        source: "manual",
      }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) return setCodesMsg(data?.error || "Could not create code.");
    setCodeNew("");
    setCodesMsg("✅ Code created.");
    await loadCodes();
  }

  async function disableCode(id: string) {
    await fetch(`/api/admin/redemption-codes/disable`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadCodes();
    setCodesMsg("✅ Code disabled.");
  }

  async function approveMessage(messageId: string) {
    await fetch(`/api/admin/shoutouts/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    setMsg("✅ Message approved.");
    playChime();
    await loadAll();
  }

  async function rejectMessage(messageId: string) {
    await fetch(`/api/admin/shoutouts/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId, note: "Rejected from dashboard" }),
    });
    setMsg("✅ Message rejected.");
    await loadAll();
  }

  async function importSongs(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/songs/import/${location}`, {
      method: "POST",
      body: form,
    });
    const data: any = await safeJson(res);
    setMsg(data?.ok ? `✅ Imported ${data.created} songs.` : data?.error || "Import failed.");
  }

  function updatePlaceholder(index: number, patch: Partial<PlaceholderMessage>) {
    setPlaceholders((curr) => curr.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function savePlaceholderSettings() {
    savePlaceholders(location, placeholders);
    setMsg("✅ Placeholder shout-outs saved for this browser.");
  }

  function resetPlaceholderSettings() {
    setPlaceholders(DEFAULT_PLACEHOLDERS);
    savePlaceholders(location, DEFAULT_PLACEHOLDERS);
    setMsg("✅ Placeholder shout-outs reset.");
  }

 async function loadAll() {
  await loadRules();
  if (!authed) return;

  const nextRequests = await loadRequests();
  const nextPendingMessages = await loadMessages();

  await Promise.all([
    loadUsers(),
    loadTop10(),
    loadCodes(),
  ]);

  maybePlayChime(nextRequests, nextPendingMessages);
}

  useEffect(() => {
    loadCachedLogo();
    fetch(`/api/admin/rules/get/${location}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.rules?.logoUrl) cacheLogo(d.rules.logoUrl);
        if (d?.rules) {
          setRules(d.rules);
          setAuthed(true);
        }
      })
      .catch(() => {});
  }, [location]);

  useEffect(() => {
    setPlaceholders(loadSavedPlaceholders(location));
  }, [location]);

  useEffect(() => {
    if (!authed) return;
    loadAll();
    const id = setInterval(loadAll, 3000);
    return () => clearInterval(id);
  }, [authed, location]);

  if (!authed) {
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
                width: 320,
                height: 320,
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
          <p style={{ opacity: 0.8, marginTop: 6 }}>
            Enter PIN to manage requests, users, and shout-outs.
          </p>

          <form onSubmit={login} style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              style={inputStyle}
              inputMode="numeric"
              autoFocus
            />
            <button type="submit" style={primaryBtn}>Login</button>
          </form>

          {msg ? <div style={noteStyle}>{msg}</div> : null}

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
            Tip: type your 4-digit PIN and press <b>Enter</b>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1440, margin: "0 auto", color: "#fff" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          alignItems: "center",
          marginBottom: 20,
          border: "1px solid #1f2340",
          borderRadius: 24,
          padding: 16,
          background: "rgba(10,10,22,0.88)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src={logoUrl}
            alt="Admin Logo"
            style={{ height: 56, width: 56, objectFit: "contain", borderRadius: 12 }}
          />
          <div>
            <div style={{ fontSize: 22, fontWeight: 1000, fontStyle: "italic" }}>ADMIN DASHBOARD</div>
            <div style={{ opacity: 0.75 }}>{location}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>Dashboard</TabButton>
          <TabButton active={tab === "requestSettings"} onClick={() => setTab("requestSettings")}>Request Settings</TabButton>
          <TabButton active={tab === "top10"} onClick={() => setTab("top10")}>Top 10</TabButton>
          <TabButton active={tab === "users"} onClick={() => setTab("users")}>Users and Points</TabButton>
          <TabButton active={tab === "shoutoutSettings"} onClick={() => setTab("shoutoutSettings")}>Shoutout Settings</TabButton>
        </div>
      </div>

      {msg ? <div style={noteStyle}>{msg}</div> : null}

      {tab === "dashboard" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Panel title="PENDING REQUESTS">
            {pendingRequests.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No queued requests yet.</div>
            ) : (
              pendingRequests.map((r) => (
                <div key={r.id} style={rowStyle}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{r.title}</div>
                    <div style={{ opacity: 0.75 }}>{r.artist}</div>
                  </div>
                  <div style={{ opacity: 0.8 }}>Score {r.score}</div>
                </div>
              ))
            )}
          </Panel>

          <Panel title="PENDING MESSAGES">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <Pill>Pending {pendingMessages.length}</Pill>
              <Pill>Approved {approvedMessages.length}</Pill>
              <Pill>Active {activeMessages.length}</Pill>
              <Pill>Rejected {rejectedMessages.length}</Pill>
              <Pill>Blocked {blockedCount}</Pill>
            </div>

            {pendingMessages.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No pending messages right now.</div>
            ) : (
              pendingMessages.map((m) => {
                const product = safeProduct(m.tier);
                return (
                  <div key={m.id} style={rowCardStyle}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ fontWeight: 900 }}>{m.fromName}</div>
                        <Pill>{product?.title || m.tier}</Pill>
                        {m.creditsCost != null ? <Pill>{m.creditsCost} pts</Pill> : null}
                      </div>

                      <div style={{ marginTop: 8, opacity: 0.94 }}>{m.messageText}</div>

                      {m.signedImageUrl ? (
                        <div
                          style={{
                            marginTop: 10,
                            width: 140,
                            height: 140,
                            borderRadius: 16,
                            overflow: "hidden",
                            border: "1px solid #2a3157",
                            background: "#0b0d18",
                          }}
                        >
                          <img
                            src={m.signedImageUrl}
                            alt="Shout-out preview"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </div>
                      ) : null}

                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                        Submitted {m.createdAt ? new Date(m.createdAt).toLocaleString() : "just now"}
                        {m.displayDurationSec ? <> • Window {Math.round(m.displayDurationSec / 60)} min</> : null}
                        {product?.hasPhoto ? <> • Photo tier</> : null}
                        {m.imageModerationStatus ? <> • Image: {m.imageModerationStatus}</> : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "flex-start" }}>
                      <ActionButton onClick={() => approveMessage(m.id)}>Approve</ActionButton>
                      <ActionButton alt onClick={() => rejectMessage(m.id)}>Reject</ActionButton>
                    </div>
                  </div>
                );
              })
            )}
          </Panel>
        </div>
      )}

      {tab === "requestSettings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 24 }}>
          <Panel title="REQUEST SETTINGS">
            {!rules ? (
              <div style={{ opacity: 0.75 }}>Loading request settings…</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <Field label="Request cost" value={rules.costRequest} onChange={(v) => setRules({ ...rules, costRequest: v })} />
                <Field label="Upvote cost" value={rules.costUpvote} onChange={(v) => setRules({ ...rules, costUpvote: v })} />
                <Field label="Downvote cost" value={rules.costDownvote} onChange={(v) => setRules({ ...rules, costDownvote: v })} />
                <Field label="Play Now / Boost cost" value={rules.costPlayNow} onChange={(v) => setRules({ ...rules, costPlayNow: v })} />

                <MoneyField label="10 credit package ($)" centsValue={rules.packTier1PriceCents || 500} onChangeCents={(c) => setRules({ ...rules, packTier1PriceCents: c })} />
                <MoneyField label="25 credit package ($)" centsValue={rules.packTier2PriceCents || 1000} onChangeCents={(c) => setRules({ ...rules, packTier2PriceCents: c })} />
                <MoneyField label="35 credit package ($)" centsValue={rules.packTier3PriceCents || 1500} onChangeCents={(c) => setRules({ ...rules, packTier3PriceCents: c })} />
                <MoneyField label="50 credit package ($)" centsValue={rules.packTier4PriceCents || 2000} onChangeCents={(c) => setRules({ ...rules, packTier4PriceCents: c })} />

                <Toggle label="Enable voting" checked={Boolean(rules.enableVoting)} onChange={(v) => setRules({ ...rules, enableVoting: v })} />
                <Toggle label="Enforce artist cooldown" checked={Boolean(rules.enforceArtistCooldown)} onChange={(v) => setRules({ ...rules, enforceArtistCooldown: v })} />
                <Toggle label="Enforce song cooldown" checked={Boolean(rules.enforceSongCooldown)} onChange={(v) => setRules({ ...rules, enforceSongCooldown: v })} />

                <Field label="Artist cooldown minutes" value={rules.artistCooldownMinutes || 0} onChange={(v) => setRules({ ...rules, artistCooldownMinutes: v })} />
                <Field label="Song cooldown minutes" value={rules.songCooldownMinutes || 0} onChange={(v) => setRules({ ...rules, songCooldownMinutes: v })} />
                <Field label="Max requests per session" value={rules.maxRequestsPerSession || 0} onChange={(v) => setRules({ ...rules, maxRequestsPerSession: v })} />
                <Field label="Max votes per session" value={rules.maxVotesPerSession || 0} onChange={(v) => setRules({ ...rules, maxVotesPerSession: v })} />
                <Field label="Min seconds between actions" value={rules.minSecondsBetweenActions || 0} onChange={(v) => setRules({ ...rules, minSecondsBetweenActions: v })} />
                <Field label="Max same artist in queue" value={rules.maxArtistInQueue || 0} onChange={(v) => setRules({ ...rules, maxArtistInQueue: v })} />
                <Field label="Max active requests per user" value={rules.maxActiveRequestsPerUser || 0} onChange={(v) => setRules({ ...rules, maxActiveRequestsPerUser: v })} />

                <TextField label="Logo URL" value={rules.logoUrl || ""} onChange={(v) => setRules({ ...rules, logoUrl: v })} />
                <TextField label="Explicit message" value={rules.msgExplicit || ""} onChange={(v) => setRules({ ...rules, msgExplicit: v })} />
                <TextField label="Too many active requests message" value={rules.msgTooManyActiveRequests || ""} onChange={(v) => setRules({ ...rules, msgTooManyActiveRequests: v })} />
                <TextField label="Already requested message" value={rules.msgAlreadyRequested || ""} onChange={(v) => setRules({ ...rules, msgAlreadyRequested: v })} />
                <TextField label="Artist cooldown message" value={rules.msgArtistCooldown || ""} onChange={(v) => setRules({ ...rules, msgArtistCooldown: v })} />
                <TextField label="Song cooldown message" value={rules.msgSongCooldown || ""} onChange={(v) => setRules({ ...rules, msgSongCooldown: v })} />
                <TextField label="Artist already queued message" value={rules.msgArtistAlreadyQueued || ""} onChange={(v) => setRules({ ...rules, msgArtistAlreadyQueued: v })} />
                <TextField label="Not enough credits message" value={rules.msgNoCredits || ""} onChange={(v) => setRules({ ...rules, msgNoCredits: v })} />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  <ActionButton onClick={saveRules}>Save request settings</ActionButton>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="IMPORT SONGS">
            <div style={{ opacity: 0.8, marginBottom: 12 }}>
              Upload CSV or XLSX song list files here.
            </div>
            <input
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importSongs(f);
              }}
              style={{ color: "#fff" }}
            />
          </Panel>
        </div>
      )}

      {tab === "top10" && (
        <Panel title="TOP 10">
          {top10.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No Top 10 data returned yet.</div>
          ) : (
            top10.map((item, i) => (
              <div key={item.id} style={rowStyle}>
                <div>
                  <div style={{ fontWeight: 900 }}>{i + 1}. {item.title}</div>
                  <div style={{ opacity: 0.75 }}>{item.artist}</div>
                </div>
                <div style={{ opacity: 0.8 }}>Score {item.score}</div>
              </div>
            ))
          )}
        </Panel>
      )}

      {tab === "users" && (
        <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 24 }}>
          <Panel title="ACTIVE SESSION USERS">
            {users.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No active users returned yet.</div>
            ) : (
              users.map((u) => (
                <div key={u.emailHash} style={rowStyle}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{u.label}</div>
                    <div style={{ opacity: 0.75 }}>
                      {u.verified ? "Verified" : "Unverified"}
                      {u.redemptionCode ? <> • Code {u.redemptionCode}</> : null}
                    </div>
                  </div>
                  <div style={{ opacity: 0.8 }}>Points {u.points}</div>
                </div>
              ))
            )}
          </Panel>

          <Panel title="REDEMPTION CODES">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.6fr", gap: 10 }}>
              <Input value={codeNew} onChange={(e) => setCodeNew(e.target.value.toUpperCase())} placeholder="CODE2026" />
              <input type="number" value={String(codePoints)} onChange={(e) => setCodePoints(Number(e.target.value))} style={inputStyle} />
              <input type="number" value={String(codeMaxUses)} onChange={(e) => setCodeMaxUses(Number(e.target.value))} style={inputStyle} />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <ActionButton onClick={createCode}>Create code</ActionButton>
            </div>

            {codesMsg ? <div style={{ marginTop: 12, opacity: 0.85 }}>{codesMsg}</div> : null}

            <div style={{ marginTop: 16 }}>
              {codes.length === 0 ? (
                <div style={{ opacity: 0.75 }}>No codes yet.</div>
              ) : (
                codes.map((c) => (
                  <div key={c.id} style={rowStyle}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{c.code}</div>
                      <div style={{ opacity: 0.75 }}>
                        {c.points} pts • {c.uses}/{c.maxUses} uses
                      </div>
                    </div>
                    {!c.disabledAt ? (
                      <ActionButton alt onClick={() => disableCode(c.id)}>Disable</ActionButton>
                    ) : (
                      <Pill>Disabled</Pill>
                    )}
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      )}

      {tab === "shoutoutSettings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 24 }}>
          <Panel title="SHOUT OUT PRODUCTS">
            <div style={{ display: "grid", gap: 12 }}>
              {liveProducts.map((p: any) => (
                <div key={p.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 1000 }}>{p.title}</div>
                      <div style={{ opacity: 0.78, marginTop: 4 }}>{p.description}</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 110 }}>
                      <div style={{ fontWeight: 1000 }}>{p.creditsCost} credits</div>
                      <div style={{ opacity: 0.7 }}>{Math.round(p.durationSec / 60)} min</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>{p.hasPhoto ? "Photo tier" : "Text only"}</Pill>
                    <Pill>Weight {p.weight}</Pill>
                    <Pill>{p.enabled ? "Live" : "Coming soon"}</Pill>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="TV PLACEHOLDER SHOUT OUTS">
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 14,
                border: "1px solid #2b3157",
                background: "rgba(23,24,48,0.68)",
                fontSize: 13,
                lineHeight: 1.45,
                opacity: 0.9,
              }}
            >
              These fallback placeholders are stored in browser storage for now. They will appear on the TV page only in the same browser profile until shared backend persistence is added.
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {placeholders.map((p, idx) => (
                <div key={p.id} style={cardStyle}>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>Placeholder {idx + 1}</div>

                  <Label>Header</Label>
                  <Input value={p.title} onChange={(e) => updatePlaceholder(idx, { title: e.target.value })} />

                  <Label style={{ marginTop: 10 }}>Product Label</Label>
                  <Input value={p.productTitle || ""} onChange={(e) => updatePlaceholder(idx, { productTitle: e.target.value })} />

                  <Label style={{ marginTop: 10 }}>Message</Label>
                  <Textarea rows={4} value={p.body} onChange={(e) => updatePlaceholder(idx, { body: e.target.value })} />

                  <Label style={{ marginTop: 10 }}>From</Label>
                  <Input value={p.fromName} onChange={(e) => updatePlaceholder(idx, { fromName: e.target.value })} />

                  <Label style={{ marginTop: 10 }}>Accent</Label>
                  <select
                    value={p.accent || "cyan"}
                    onChange={(e) => updatePlaceholder(idx, { accent: e.target.value as "gold" | "cyan" | "pink" })}
                    style={inputStyle}
                  >
                    <option value="cyan">Cyan</option>
                    <option value="gold">Gold</option>
                    <option value="pink">Pink</option>
                  </select>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <ActionButton onClick={savePlaceholderSettings}>Save placeholder settings</ActionButton>
              <ActionButton alt onClick={resetPlaceholderSettings}>Reset defaults</ActionButton>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 14,
        border: active ? "1px solid #4f61ff" : "1px solid #232845",
        background: active ? "rgba(37,41,92,0.92)" : "rgba(10,10,22,0.6)",
        color: "#fff",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #1f2340",
        borderRadius: 24,
        padding: 18,
        background: "rgba(8,8,20,0.88)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 1000, fontStyle: "italic", marginBottom: 14 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ActionButton({
  alt,
  children,
  onClick,
}: {
  alt?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 12px",
        borderRadius: 12,
        border: alt ? "1px solid #34395e" : "1px solid #4f61ff",
        background: alt ? "rgba(10,10,22,0.72)" : "rgba(37,41,92,0.92)",
        color: "#fff",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "4px 9px",
        borderRadius: 999,
        border: "1px solid #2f3561",
        background: "rgba(18,20,40,0.8)",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </div>
  );
}

function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <div style={{ fontSize: 12, opacity: 0.82, marginBottom: 6, ...style }}>{children}</div>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={inputStyle} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, resize: "vertical" }} />;
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
      <span style={{ fontSize: 12, opacity: 0.82 }}>{label}</span>
      <input
        type="number"
        value={String(value ?? 0)}
        onChange={(e) => onChange(Number(e.target.value))}
        style={inputStyle}
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
      <span style={{ fontSize: 12, opacity: 0.82 }}>{label}</span>
      <input
        value={centsToDollars(centsValue)}
        onChange={(e) => onChangeCents(dollarsToCents(e.target.value))}
        style={inputStyle}
        inputMode="decimal"
      />
    </label>
  );
}

function TextField({
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
      <span style={{ fontSize: 12, opacity: 0.82 }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
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
    <label style={{ ...rowStyle, marginBottom: 0, cursor: "pointer" }}>
      <div style={{ fontWeight: 900 }}>{label}</div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18 }}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #323862",
  background: "#0d1020",
  color: "#fff",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid #4f61ff",
  background: "rgba(37,41,92,0.92)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 16,
  border: "1px solid #252b4b",
  background: "rgba(17,18,34,0.9)",
  marginBottom: 10,
};

const rowCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  padding: 12,
  borderRadius: 16,
  border: "1px solid #252b4b",
  background: "rgba(17,18,34,0.9)",
  marginBottom: 10,
};

const cardStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 18,
  border: "1px solid #252b4b",
  background: "rgba(17,18,34,0.9)",
};

const noteStyle: React.CSSProperties = {
  marginBottom: 16,
  border: "1px solid #26305c",
  background: "rgba(24,24,60,0.7)",
  borderRadius: 16,
  padding: 14,
  fontWeight: 700,
};

const loginWrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  background:
    "radial-gradient(circle at 14% 14%, rgba(0,255,255,0.05), transparent 24%), radial-gradient(circle at 84% 18%, rgba(167,79,255,0.08), transparent 24%), #04060d",
  color: "#fff",
};

const loginCard: React.CSSProperties = {
  maxWidth: 560,
  width: "100%",
  borderRadius: 26,
  border: "1px solid rgba(90,90,255,0.35)",
  background: "rgba(0,0,0,0.42)",
  padding: 18,
  textAlign: "center",
  animation: "rrAdminCardIn 500ms ease both",
};
