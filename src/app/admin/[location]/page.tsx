// src/app/admin/[location]/page.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SHOUTOUT_PRODUCTS } from "@/lib/shoutoutProducts";

type TabKey = "dashboard" | "requestSettings" | "top10" | "users" | "shoutoutSettings";

type RequestItem = {
  id: string;
  title: string;
  artist: string;
  score: number;
  createdAt?: string;
  type?: string;
  requestedByLabel?: string;
  boosted?: boolean;
  upvotes?: number;
  downvotes?: number;
  redemptionCode?: string | null;
};

type MessageItem = {
  id: string;
  fromName: string;
  messageText: string;
  tier: string;
  creditsCost?: number;
  status?: string;
  moderationNotes?: string | null;
  autoTextModerationReason?: string | null;
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
  top10Enabled?: boolean;
  top10Timezone?: string;
  top10AdultCutoffHour?: number;
  top10AdultCutoffMinute?: number;
  shoutoutSlideSeconds?: number;
};

type SessionUser = {
  emailHash: string;
  label: string;
  verified: boolean;
  points: number;
  redemptionCode?: string | null;
};

type Top10Bucket = "GENERAL" | "ADULT";

type Top10Item = {
  id: string;
  title: string;
  artist: string;
  score: number;
  requestCount?: number;
  upvotes?: number;
  downvotes?: number;
  artworkUrl?: string | null;
  lastActivityAt?: string;
};

type Top10Response = {
  ok?: boolean;
  sessionId?: string;
  bucket?: Top10Bucket;
  boardTitle?: string;
  updatedAt?: string;
  items?: Top10Item[];
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

type RedemptionCodeUseItem = {
  id: string;
  usedAt: string;
  emailHash: string;
  label: string;
  reason: string;
  delta: number;
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
      productTitle: String(p?.productTitle || DEFAULT_PLACEHOLDERS[i]?.productTitle || "Remix Shout Out"),
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

function rulesCostsFromRules(rules: RulesState | null) {
  return {
    costRequest: Number(rules?.costRequest ?? 1),
    costPlayNow: Number(rules?.costPlayNow ?? 5),
    costUpvote: Number(rules?.costUpvote ?? 1),
    costDownvote: Number(rules?.costDownvote ?? 1),
  };
}

function requestTypeLabel(q: RequestItem) {
  if (q.type === "PLAY_NOW" || q.boosted) return "BOOST";
  return "REQUEST";
}

function requestMetaLine(q: RequestItem) {
  const who = q.requestedByLabel || "Skater";
  const parts = [`Requested by ${who}`];
  if (q.redemptionCode) parts.push(`Code: ${q.redemptionCode}`);
  return parts.join(" • ");
}

function QueueRow({ q, index, onPlayed, onReject }: { q: RequestItem; index?: number; onPlayed: () => void; onReject: () => void }) {
  const typeLabel = requestTypeLabel(q);
  return (
    <div style={queueRowStyle}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 1000, fontSize: 18 }}>{index ? `${index}. ` : ""}{q.title}</div>
          <div style={requestPillStyle}>{typeLabel}</div>
        </div>
        <div style={{ marginTop: 6, opacity: 0.86, lineHeight: 1.35 }}>{q.artist} • {requestMetaLine(q)}</div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.72 }}>Score {q.score} • 👍 {Number(q.upvotes || 0)} • 👎 {Number(q.downvotes || 0)}</div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignSelf: "center" }}>
        <ActionButton onClick={onPlayed}>Played</ActionButton>
        <ActionButton alt onClick={onReject}>Reject</ActionButton>
      </div>
    </div>
  );
}

export default function AdminPage({ params }: { params: { location: string } }) {
  const location = params.location;
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [msg, setMsg] = useState("");
  const [rulesDirty, setRulesDirty] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [requestSettingsMsg, setRequestSettingsMsg] = useState("");
  const [top10SettingsMsg, setTop10SettingsMsg] = useState("");
  const [shoutoutSettingsMsg, setShoutoutSettingsMsg] = useState("");
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
  const [top10BucketView, setTop10BucketView] = useState<Top10Bucket | "AUTO">("AUTO");
  const [top10ActiveBucket, setTop10ActiveBucket] = useState<Top10Bucket | "">("");
  const [top10BoardTitle, setTop10BoardTitle] = useState("Top 10");
  const [top10UpdatedAt, setTop10UpdatedAt] = useState("");
  const [top10SessionId, setTop10SessionId] = useState("");
  const [top10Busy, setTop10Busy] = useState(false);
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [codesMsg, setCodesMsg] = useState("");
  const [codeNew, setCodeNew] = useState("");
  const [codePoints, setCodePoints] = useState<number>(10);
  const [codeMaxUses, setCodeMaxUses] = useState<number>(1);
  const [importingCodes, setImportingCodes] = useState(false);
  const [codeUsesOpen, setCodeUsesOpen] = useState(false);
  const [codeUsesLoading, setCodeUsesLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<RedemptionCode | null>(null);
  const [selectedCodeUses, setSelectedCodeUses] = useState<RedemptionCodeUseItem[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editMessageId, setEditMessageId] = useState("");
  const [editFromName, setEditFromName] = useState("");
  const [editMessageText, setEditMessageText] = useState("");
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
      for (const id of requestIds) if (!prevRequestIdsRef.current.has(id)) { foundNew = true; break; }
      if (!foundNew) for (const id of messageIds) if (!prevMessageIdsRef.current.has(id)) { foundNew = true; break; }
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
    if (!res.ok) return setMsg("Wrong PIN.");
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

  async function loadRules(force = false) {
    if (rulesDirty && !force) return rules;
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

  async function saveRules(successMessage = "✅ Request settings saved.") {
    if (!rules || savingRules) return false;
    setSavingRules(true);
    try {
      const res = await fetch(`/api/admin/rules/set/${location}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rules),
      });
      const data: any = await safeJson(res);
      if (data?.ok) {
        const nextRules = (data.rules || rules) as RulesState;
        setRules(nextRules);
        setRulesDirty(false);
        if (nextRules.logoUrl) cacheLogo(nextRules.logoUrl);
        setRequestSettingsMsg(successMessage);
        return true;
      }
      setRequestSettingsMsg(String(data?.error || "Could not save settings."));
      return false;
    } catch {
      setRequestSettingsMsg("Could not save settings.");
      return false;
    } finally {
      setSavingRules(false);
    }
  }

  function patchRules(patch: Partial<RulesState>) {
    setRules((curr) => (curr ? { ...curr, ...patch } : curr));
    setRulesDirty(true);
    setRequestSettingsMsg("");
    setTop10SettingsMsg("");
    setShoutoutSettingsMsg("");
  }

  async function loadUsers() {
    try {
      const res = await fetch(`/api/admin/session-users/${location}`, { cache: "no-store" });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
  }

  async function loadTop10(bucketOverride?: Top10Bucket | "AUTO") {
    try {
      const bucket = bucketOverride ?? top10BucketView;
      const query = bucket && bucket !== "AUTO" ? `?bucket=${bucket}` : "";
      const res = await fetch(`/api/admin/top10/${location}${query}`, { cache: "no-store" });
      const data = (await res.json()) as Top10Response;
      setTop10(Array.isArray(data.items) ? data.items : []);
      setTop10ActiveBucket((data.bucket as Top10Bucket) || "");
      setTop10BoardTitle(data.boardTitle || "Top 10");
      setTop10UpdatedAt(data.updatedAt || "");
      setTop10SessionId(data.sessionId || "");
    } catch {}
  }

  async function resetTop10(resetMode: "current" | "all" | "bucket", bucket?: Top10Bucket) {
    setTop10Busy(true);
    try {
      const res = await fetch(`/api/admin/top10/reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, resetMode, bucket }),
      });
      const data: any = await safeJson(res);
      if (!data?.ok) return setMsg(data?.error || "Could not reset Top 10 board.");
      setMsg(`✅ Top 10 reset complete. Removed ${Number(data.deletedCount || 0)} row(s).`);
      await loadTop10();
    } finally {
      setTop10Busy(false);
    }
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
      body: JSON.stringify({ code, points: codePoints, maxUses: codeMaxUses, source: "manual" }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) return setCodesMsg(data?.error || "Could not create code.");
    setCodeNew("");
    setCodesMsg("✅ Code created.");
    await loadCodes();
  }

  async function importCodes(file: File) {
    setCodesMsg("");
    setImportingCodes(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/admin/redemption-codes/import/${location}`, { method: "POST", body: form });
      const data: any = await safeJson(res);
      if (!data?.ok) return setCodesMsg(data?.error || "Could not import codes.");
      setCodesMsg(`✅ Imported ${Number(data.created || 0)} codes.${Number(data.skipped || 0) ? ` Skipped ${Number(data.skipped || 0)}.` : ""}`);
      await loadCodes();
    } finally {
      setImportingCodes(false);
    }
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

  async function deleteCode(id: string, code: string) {
    const ok = window.confirm(`Delete code ${code}? This removes it from the list permanently.`);
    if (!ok) return;
    const res = await fetch(`/api/admin/redemption-codes/delete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) return setCodesMsg(data?.error || "Could not delete code.");
    setCodesMsg("✅ Code deleted.");
    if (selectedCode?.id === id) {
      setCodeUsesOpen(false);
      setSelectedCode(null);
      setSelectedCodeUses([]);
    }
    await loadCodes();
  }

  async function showCodeUses(codeItem: RedemptionCode) {
    setSelectedCode(codeItem);
    setCodeUsesOpen(true);
    setCodeUsesLoading(true);
    setSelectedCodeUses([]);
    const res = await fetch(`/api/admin/redemption-codes/uses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: codeItem.id }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) {
      setCodesMsg(data?.error || "Could not load code uses.");
      setCodeUsesLoading(false);
      return;
    }
    setSelectedCodeUses(Array.isArray(data.items) ? data.items : []);
    setCodeUsesLoading(false);
  }

  async function approveMessage(messageId: string) {
    const res = await fetch(`/api/admin/shoutouts/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) return setMsg(data?.error || "Could not approve message.");
    setMsg("✅ Message approved.");
    playChime();
    await loadAll();
  }

  function editMessage(messageId: string, currentFromName: string, currentMessageText: string) {
    setEditMessageId(messageId);
    setEditFromName(currentFromName || "");
    setEditMessageText(currentMessageText || "");
    setEditOpen(true);
  }

  async function saveEditedMessage() {
    const nextFromName = String(editFromName || "").trim();
    const nextMessage = String(editMessageText || "").trim();
    if (!editMessageId) return setMsg("Missing message ID.");
    if (!nextFromName || !nextMessage) return setMsg("Name and shout-out text are required.");
    setEditBusy(true);
    try {
      const res = await fetch(`/api/admin/shoutouts/edit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId: editMessageId, fromName: nextFromName, messageText: nextMessage }),
      });
      const data: any = await safeJson(res);
      if (!data?.ok) return setMsg(data?.error || "Could not edit message.");
      setEditOpen(false);
      setEditMessageId("");
      setEditFromName("");
      setEditMessageText("");
      setMsg("✅ Message updated.");
      await loadAll();
    } finally {
      setEditBusy(false);
    }
  }

  async function rejectMessage(messageId: string) {
    const note = prompt("Reject reason?", "Rejected from dashboard") || "Rejected from dashboard";
    const res = await fetch(`/api/admin/shoutouts/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId, note }),
    });
    const data: any = await safeJson(res);
    if (!data?.ok) return setMsg(data?.error || "Could not reject message.");
    setMsg(data?.refunded ? "✅ Message rejected and credits refunded." : "✅ Message rejected.");
    await loadAll();
  }

  async function markPlayed(requestId: string) {
    await fetch(`/api/admin/queue/played`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId }) });
    await loadAll();
  }

  async function rejectRequest(requestId: string) {
    const reason = prompt("Reject reason?", "Rejected");
    if (!reason) return;
    await fetch(`/api/admin/queue/reject`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId, reason }) });
    await loadAll();
  }

  async function importSongs(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/songs/import/${location}`, { method: "POST", body: form });
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

  async function saveTop10Settings() {
    setTop10SettingsMsg("");
    const ok = await saveRules("✅ Top 10 settings saved.");
    if (ok) {
      setTop10SettingsMsg("✅ Top 10 settings saved.");
      await loadTop10();
    } else {
      setTop10SettingsMsg("Could not save Top 10 settings.");
    }
  }

  async function saveShoutoutSettings() {
    setShoutoutSettingsMsg("");
    const ok = await saveRules("✅ Shout-out settings saved.");
    setShoutoutSettingsMsg(ok ? "✅ Shout-out settings saved." : "Could not save shout-out settings.");
  }

  const effectiveTop10CutoffHour = Number(rules?.top10AdultCutoffHour ?? 21);
  const effectiveTop10CutoffMinute = Number(rules?.top10AdultCutoffMinute ?? 0);
  const effectiveTop10Timezone = rules?.top10Timezone || "America/New_York";
  const effectiveShoutoutSlideSeconds = Math.max(1, Number(rules?.shoutoutSlideSeconds ?? 10));

  async function loadAll() {
    const isEditingRulesTab = tab === "requestSettings" || tab === "top10" || tab === "shoutoutSettings";
    if (!isEditingRulesTab || !rulesDirty) await loadRules();
    if (!authed) return;
    const nextRequests = await loadRequests();
    const nextPendingMessages = await loadMessages();
    await Promise.all([loadUsers(), loadTop10(), loadCodes()]);
    maybePlayChime(nextRequests, nextPendingMessages);
  }

  useEffect(() => { loadCachedLogo(); setAuthed(false); setRules(null); }, [location]);
  useEffect(() => { setPlaceholders(loadSavedPlaceholders(location)); }, [location]);

  useEffect(() => {
    if (!authed) return;
    void loadAll();
    const id = setInterval(() => { void loadAll(); }, tab === "requestSettings" || tab === "top10" || tab === "shoutoutSettings" ? 6000 : 3000);
    return () => clearInterval(id);
  }, [authed, location, top10BucketView, tab, rulesDirty]);

  if (!authed) {
    return (
      <div style={loginWrap}>
        <div style={loginCard}>
          {logoUrl ? <img src={logoUrl} alt="Admin Logo" style={{ width: 320, height: 320, objectFit: "contain", borderRadius: 22, marginBottom: 18 }} /> : null}
          <h1 style={{ margin: 0 }}>Admin • {location}</h1>
          <p style={{ opacity: 0.8, marginTop: 6 }}>Enter PIN to manage requests, users, and shout-outs.</p>
          <form onSubmit={login} style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" style={inputStyle} inputMode="numeric" autoFocus />
            <button type="submit" style={primaryBtn}>Login</button>
          </form>
          {msg ? <div style={noteStyle}>{msg}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1440, margin: "0 auto", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", marginBottom: 20, border: "1px solid #1f2340", borderRadius: 24, padding: 16, background: "rgba(10,10,22,0.88)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={logoUrl} alt="Admin Logo" style={{ height: 56, width: 56, objectFit: "contain", borderRadius: 12 }} />
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
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>{(() => { const c = rulesCostsFromRules(rules); return <>Request <b>{c.costRequest}</b> • BOOST <b>{c.costPlayNow}</b> • Upvote <b>{c.costUpvote}</b> • Downvote <b>{c.costDownvote}</b></>; })()}</div>
            <div style={{ fontWeight: 1000, fontStyle: "italic", marginBottom: 8 }}>BOOSTED (<i>PAID</i> TO PLAY NEXT)</div>
            {pendingRequests.filter((q) => q.boosted || q.type === "PLAY_NOW").length === 0 ? <div style={{ opacity: 0.7, marginBottom: 14 }}>No Play Now requests.</div> : pendingRequests.filter((q) => q.boosted || q.type === "PLAY_NOW").map((q) => <QueueRow key={q.id} q={q} onPlayed={() => markPlayed(q.id)} onReject={() => rejectRequest(q.id)} />)}
            <div style={{ height: 10 }} />
            <div style={{ fontWeight: 1000, fontStyle: "italic", marginBottom: 8 }}>UP NEXT</div>
            {pendingRequests.filter((q) => !(q.boosted || q.type === "PLAY_NOW")).length === 0 ? <div style={{ opacity: 0.7 }}>No queued requests yet.</div> : pendingRequests.filter((q) => !(q.boosted || q.type === "PLAY_NOW")).map((q, i) => <QueueRow key={q.id} q={q} index={i + 1} onPlayed={() => markPlayed(q.id)} onReject={() => rejectRequest(q.id)} />)}
          </Panel>

          <Panel title="PENDING MESSAGES">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <Pill>Pending {pendingMessages.length}</Pill>
              <Pill>Approved {approvedMessages.length}</Pill>
              <Pill>Active {activeMessages.length}</Pill>
              <Pill>Rejected {rejectedMessages.length}</Pill>
              <Pill>Blocked {blockedCount}</Pill>
            </div>
            {pendingMessages.length === 0 ? <div style={{ opacity: 0.75 }}>No pending messages right now.</div> : pendingMessages.map((m) => {
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
                    {m.autoTextModerationReason ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>Auto filter: {m.autoTextModerationReason}</div> : null}
                    {m.signedImageUrl ? <div style={{ marginTop: 10, width: 140, height: 140, borderRadius: 16, overflow: "hidden", border: "1px solid #2a3157", background: "#0b0d18" }}><img src={m.signedImageUrl} alt="Shout-out preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div> : null}
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Submitted {m.createdAt ? new Date(m.createdAt).toLocaleString() : "just now"}{m.displayDurationSec ? <> • Window {Math.round(m.displayDurationSec / 60)} min</> : null}{product?.hasPhoto ? <> • Photo tier</> : null}{m.imageModerationStatus ? <> • Image: {m.imageModerationStatus}</> : null}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "flex-start" }}>
                    <ActionButton onClick={() => approveMessage(m.id)}>Approve</ActionButton>
                    <ActionButton onClick={() => editMessage(m.id, m.fromName, m.messageText)}>Edit</ActionButton>
                    <ActionButton alt onClick={() => rejectMessage(m.id)}>Reject</ActionButton>
                  </div>
                </div>
              );
            })}
          </Panel>
        </div>
      )}

      {tab === "requestSettings" && rules && (
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 24 }}>
          <Panel title="REQUEST SETTINGS">
            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Request cost" value={rules.costRequest} onChange={(v) => patchRules({ costRequest: v })} />
              <Field label="Upvote cost" value={rules.costUpvote} onChange={(v) => patchRules({ costUpvote: v })} />
              <Field label="Downvote cost" value={rules.costDownvote} onChange={(v) => patchRules({ costDownvote: v })} />
              <Field label="Play Now / Boost cost" value={rules.costPlayNow} onChange={(v) => patchRules({ costPlayNow: v })} />
              <MoneyField label="10 credit package ($)" centsValue={rules.packTier1PriceCents || 500} onChangeCents={(c) => patchRules({ packTier1PriceCents: c })} />
              <MoneyField label="25 credit package ($)" centsValue={rules.packTier2PriceCents || 1000} onChangeCents={(c) => patchRules({ packTier2PriceCents: c })} />
              <MoneyField label="35 credit package ($)" centsValue={rules.packTier3PriceCents || 1500} onChangeCents={(c) => patchRules({ packTier3PriceCents: c })} />
              <MoneyField label="50 credit package ($)" centsValue={rules.packTier4PriceCents || 2000} onChangeCents={(c) => patchRules({ packTier4PriceCents: c })} />
              <Toggle label="Enable voting" checked={Boolean(rules.enableVoting)} onChange={(v) => patchRules({ enableVoting: v })} />
              <Toggle label="Enforce artist cooldown" checked={Boolean(rules.enforceArtistCooldown)} onChange={(v) => patchRules({ enforceArtistCooldown: v })} />
              <Toggle label="Enforce song cooldown" checked={Boolean(rules.enforceSongCooldown)} onChange={(v) => patchRules({ enforceSongCooldown: v })} />
              <Field label="Artist cooldown minutes" value={rules.artistCooldownMinutes || 0} onChange={(v) => patchRules({ artistCooldownMinutes: v })} />
              <Field label="Song cooldown minutes" value={rules.songCooldownMinutes || 0} onChange={(v) => patchRules({ songCooldownMinutes: v })} />
              <Field label="Max requests per session" value={rules.maxRequestsPerSession || 0} onChange={(v) => patchRules({ maxRequestsPerSession: v })} />
              <Field label="Max votes per session" value={rules.maxVotesPerSession || 0} onChange={(v) => patchRules({ maxVotesPerSession: v })} />
              <Field label="Min seconds between actions" value={rules.minSecondsBetweenActions || 0} onChange={(v) => patchRules({ minSecondsBetweenActions: v })} />
              <Field label="Max same artist in queue" value={rules.maxArtistInQueue || 0} onChange={(v) => patchRules({ maxArtistInQueue: v })} />
              <Field label="Max active requests per user" value={rules.maxActiveRequestsPerUser || 0} onChange={(v) => patchRules({ maxActiveRequestsPerUser: v })} />
              <TextField label="Logo URL" value={rules.logoUrl || ""} onChange={(v) => patchRules({ logoUrl: v })} />
              <TextField label="Explicit message" value={rules.msgExplicit || ""} onChange={(v) => patchRules({ msgExplicit: v })} />
              <TextField label="Too many active requests message" value={rules.msgTooManyActiveRequests || ""} onChange={(v) => patchRules({ msgTooManyActiveRequests: v })} />
              <TextField label="Already requested message" value={rules.msgAlreadyRequested || ""} onChange={(v) => patchRules({ msgAlreadyRequested: v })} />
              <TextField label="Artist cooldown message" value={rules.msgArtistCooldown || ""} onChange={(v) => patchRules({ msgArtistCooldown: v })} />
              <TextField label="Song cooldown message" value={rules.msgSongCooldown || ""} onChange={(v) => patchRules({ msgSongCooldown: v })} />
              <TextField label="Artist already queued message" value={rules.msgArtistAlreadyQueued || ""} onChange={(v) => patchRules({ msgArtistAlreadyQueued: v })} />
              <TextField label="Not enough credits message" value={rules.msgNoCredits || ""} onChange={(v) => patchRules({ msgNoCredits: v })} />
              {requestSettingsMsg ? <div style={{ ...noteStyle, marginBottom: 8 }}>{requestSettingsMsg}</div> : null}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}><ActionButton onClick={() => void saveRules()}>{savingRules ? "Saving..." : "Save request settings"}</ActionButton></div>
            </div>
          </Panel>
          <Panel title="IMPORT SONGS">
            <div style={{ opacity: 0.8, marginBottom: 12 }}>Upload CSV or XLSX song list files here.</div>
            <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) importSongs(f); }} style={{ color: "#fff" }} />
          </Panel>
        </div>
      )}

      {tab === "top10" && rules && (
        <div style={{ display: "grid", gridTemplateColumns: "0.92fr 1.08fr", gap: 24 }}>
          <Panel title="TOP 10 SETTINGS">
            <div style={{ display: "grid", gap: 12 }}>
              <Toggle label="Enable Top 10 board" checked={Boolean(rules.top10Enabled ?? true)} onChange={(v) => patchRules({ top10Enabled: v })} />
              <TextField label="Top 10 timezone" value={rules.top10Timezone || "America/New_York"} onChange={(v) => patchRules({ top10Timezone: v })} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Adult cutoff hour (24h)" value={rules.top10AdultCutoffHour ?? 21} onChange={(v) => patchRules({ top10AdultCutoffHour: v })} />
                <Field label="Adult cutoff minute" value={rules.top10AdultCutoffMinute ?? 0} onChange={(v) => patchRules({ top10AdultCutoffMinute: v })} />
              </div>
              <div style={{ padding: 14, borderRadius: 16, border: "1px solid #252b4b", background: "rgba(17,18,34,0.9)", lineHeight: 1.5 }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>ACTIVE BOARD RULES</div>
                <div style={{ opacity: 0.82 }}>Timezone: <b>{effectiveTop10Timezone}</b></div>
                <div style={{ opacity: 0.82 }}>Adult cutoff: <b>{String(effectiveTop10CutoffHour).padStart(2, "0")}:{String(effectiveTop10CutoffMinute).padStart(2, "0")}</b></div>
                <div style={{ opacity: 0.82 }}>Preview mode: <b>{top10BucketView === "AUTO" ? "Auto bucket" : top10BucketView}</b></div>
                <div style={{ opacity: 0.82 }}>Active board from API: <b>{top10ActiveBucket || "—"}</b></div>
              </div>
              {top10SettingsMsg ? <div style={{ ...noteStyle, marginBottom: 8 }}>{top10SettingsMsg}</div> : null}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <ActionButton onClick={saveTop10Settings}>Save Top 10 settings</ActionButton>
                <ActionButton alt onClick={() => loadTop10()}>Refresh board preview</ActionButton>
              </div>
            </div>
          </Panel>
          <Panel title="LIVE TOP 10 BOARD">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <ActionButton alt onClick={() => setTop10BucketView("AUTO")}>Auto</ActionButton>
              <ActionButton alt onClick={() => setTop10BucketView("GENERAL")}>General</ActionButton>
              <ActionButton alt onClick={() => setTop10BucketView("ADULT")}>Adult</ActionButton>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <Pill>{top10BoardTitle}</Pill>
              {top10ActiveBucket ? <Pill>Bucket {top10ActiveBucket}</Pill> : null}
              {top10SessionId ? <Pill>Session {top10SessionId.slice(-6)}</Pill> : null}
              {top10UpdatedAt ? <Pill>Updated {new Date(top10UpdatedAt).toLocaleTimeString()}</Pill> : null}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <ActionButton alt onClick={() => resetTop10("current")}>{top10Busy ? "Working..." : "Reset current bucket"}</ActionButton>
              <ActionButton alt onClick={() => resetTop10("bucket", "GENERAL")}>Reset General</ActionButton>
              <ActionButton alt onClick={() => resetTop10("bucket", "ADULT")}>Reset Adult</ActionButton>
              <ActionButton alt onClick={() => resetTop10("all")}>Reset All</ActionButton>
            </div>
            {top10.length === 0 ? <div style={{ opacity: 0.75 }}>No Top 10 data returned yet.</div> : <div style={{ display: "grid", gap: 10 }}>{top10.map((item, i) => <div key={item.id} style={rowStyle}><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 900 }}>{i + 1}. {item.title}</div><div style={{ opacity: 0.75, marginTop: 2 }}>{item.artist}</div><div style={{ opacity: 0.62, fontSize: 12, marginTop: 6 }}>Requests {Number(item.requestCount || 0)} • 👍 {Number(item.upvotes || 0)} • 👎 {Number(item.downvotes || 0)}{item.lastActivityAt ? ` • Active ${new Date(item.lastActivityAt).toLocaleString()}` : ""}</div></div><div style={{ textAlign: "right", minWidth: 90 }}><div style={{ fontSize: 12, opacity: 0.62 }}>Score</div><div style={{ fontWeight: 1000, fontSize: 22 }}>{item.score}</div></div></div>)}</div>}
          </Panel>
        </div>
      )}

      {tab === "users" && (
        <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 24 }}>
          <Panel title="ACTIVE SESSION USERS">
            {users.length === 0 ? <div style={{ opacity: 0.75 }}>No active users returned yet.</div> : users.map((u) => <div key={u.emailHash} style={rowStyle}><div><div style={{ fontWeight: 900 }}>{u.label}</div><div style={{ opacity: 0.75 }}>{u.verified ? "Verified" : "Unverified"}{u.redemptionCode ? <> • Code {u.redemptionCode}</> : null}</div></div><div style={{ opacity: 0.8 }}>Points {u.points}</div></div>)}
          </Panel>
          <Panel title="REDEMPTION CODES">
            <div style={{ display: "grid", gap: 18 }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 10, fontWeight: 900 }}>CREATE SINGLE CODE</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.6fr", gap: 10 }}>
                  <Input value={codeNew} onChange={(e) => setCodeNew(e.target.value.toUpperCase())} placeholder="CODE2026" />
                  <input type="number" value={String(codePoints)} onChange={(e) => setCodePoints(Number(e.target.value))} style={inputStyle} />
                  <input type="number" value={String(codeMaxUses)} onChange={(e) => setCodeMaxUses(Number(e.target.value))} style={inputStyle} />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}><ActionButton onClick={createCode}>Create code</ActionButton></div>
              </div>
              <div style={{ height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(120,130,255,0.38), rgba(255,255,255,0.04))" }} />
              <div>
                <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 10, fontWeight: 900 }}>IMPORT CODES FROM XLSX OR CSV</div>
                <div style={{ padding: 14, borderRadius: 16, border: "1px solid #252b4b", background: "rgba(17,18,34,0.9)" }}>
                  <div style={{ opacity: 0.78, marginBottom: 10, lineHeight: 1.45 }}>Expected columns: <b>code</b>, <b>points</b>, optional <b>maxUses</b>, optional <b>redeemWindowMinutes</b>, optional <b>expiresAt</b>.</div>
                  <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void importCodes(f); e.currentTarget.value = ""; } }} style={{ color: "#fff" }} disabled={importingCodes} />
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>{importingCodes ? "Importing..." : "Upload a spreadsheet to bulk-create redemption codes."}</div>
                </div>
              </div>
            </div>
            {codesMsg ? <div style={{ marginTop: 12, opacity: 0.85 }}>{codesMsg}</div> : null}
            <div style={{ marginTop: 16 }}>{codes.length === 0 ? <div style={{ opacity: 0.75 }}>No codes yet.</div> : codes.map((c) => <div key={c.id} style={rowStyle}><div><div style={{ fontWeight: 900 }}>{c.code}</div><div style={{ opacity: 0.75 }}>{c.points} pts • {c.uses}/{c.maxUses} uses</div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}><ActionButton onClick={() => showCodeUses(c)}>Show uses</ActionButton>{!c.disabledAt ? <ActionButton alt onClick={() => disableCode(c.id)}>Disable</ActionButton> : <Pill>Disabled</Pill>}<ActionButton alt onClick={() => deleteCode(c.id, c.code)}>Delete</ActionButton></div></div>)}</div>
          </Panel>
        </div>
      )}

      <CodeUsesModal open={codeUsesOpen} code={selectedCode} items={selectedCodeUses} loading={codeUsesLoading} onClose={() => { setCodeUsesOpen(false); setSelectedCode(null); setSelectedCodeUses([]); }} />

      {tab === "shoutoutSettings" && rules && (
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 24 }}>
          <div style={{ display: "grid", gap: 24 }}>
            <Panel title="TV ROTATION">
              <div style={{ display: "grid", gap: 12 }}>
                <Field label="Slide rotation seconds" value={effectiveShoutoutSlideSeconds} onChange={(v) => patchRules({ shoutoutSlideSeconds: Math.max(1, Math.min(120, Number(v) || 10)) })} />
                <div style={{ padding: 14, borderRadius: 16, border: "1px solid #252b4b", background: "rgba(17,18,34,0.9)", lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>TV BEHAVIOR</div>
                  <div style={{ opacity: 0.82 }}>Rotation speed: <b>{effectiveShoutoutSlideSeconds} seconds</b></div>
                  <div style={{ opacity: 0.82 }}>Weighted rotation: <b>Enabled in live shout-out feed</b></div>
                  <div style={{ opacity: 0.82 }}>Placeholder storage: <b>Browser-local for now</b></div>
                </div>
                <div style={{ padding: 14, borderRadius: 16, border: "1px solid #252b4b", background: "rgba(17,18,34,0.9)", lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>ADMIN RECOMMENDATION</div>
                  <div style={{ opacity: 0.82 }}>10 seconds is a strong default. It gives families enough time to read birthday and congratulations messages without making the TV feel slow.</div>
                </div>
                {shoutoutSettingsMsg ? <div style={{ ...noteStyle, marginBottom: 8 }}>{shoutoutSettingsMsg}</div> : null}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><ActionButton onClick={saveShoutoutSettings}>{savingRules ? "Saving..." : "Save shout-out settings"}</ActionButton></div>
              </div>
            </Panel>
            <Panel title="SHOUT OUT PRODUCTS">
              <div style={{ display: "grid", gap: 12 }}>{liveProducts.map((p: any) => <div key={p.id} style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={{ fontWeight: 1000 }}>{p.title}</div><div style={{ opacity: 0.78, marginTop: 4 }}>{p.description}</div></div><div style={{ textAlign: "right", minWidth: 110 }}><div style={{ fontWeight: 1000 }}>{p.creditsCost} credits</div><div style={{ opacity: 0.7 }}>{Math.round(p.durationSec / 60)} min</div></div></div><div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}><Pill>{p.hasPhoto ? "Photo tier" : "Text only"}</Pill><Pill>Weight {p.weight}</Pill><Pill>{p.enabled ? "Live" : "Coming soon"}</Pill></div></div>)}</div>
            </Panel>
          </div>
          <Panel title="TV PLACEHOLDER SHOUT OUTS">
            <div style={{ marginBottom: 12, padding: 12, borderRadius: 14, border: "1px solid #2b3157", background: "rgba(23,24,48,0.68)", fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>These fallback placeholders are stored in browser storage for now. They will appear on the TV page only in the same browser profile until shared backend persistence is added.</div>
            <div style={{ display: "grid", gap: 14 }}>{placeholders.map((p, idx) => <div key={p.id} style={cardStyle}><div style={{ fontWeight: 900, marginBottom: 10 }}>Placeholder {idx + 1}</div><Label>Header</Label><Input value={p.title} onChange={(e) => updatePlaceholder(idx, { title: e.target.value })} /><Label style={{ marginTop: 10 }}>Product Label</Label><Input value={p.productTitle || ""} onChange={(e) => updatePlaceholder(idx, { productTitle: e.target.value })} /><Label style={{ marginTop: 10 }}>Message</Label><Textarea rows={4} value={p.body} onChange={(e) => updatePlaceholder(idx, { body: e.target.value })} /><Label style={{ marginTop: 10 }}>From</Label><Input value={p.fromName} onChange={(e) => updatePlaceholder(idx, { fromName: e.target.value })} /><Label style={{ marginTop: 10 }}>Accent</Label><select value={p.accent || "cyan"} onChange={(e) => updatePlaceholder(idx, { accent: e.target.value as "gold" | "cyan" | "pink" })} style={inputStyle}><option value="cyan">Cyan</option><option value="gold">Gold</option><option value="pink">Pink</option></select></div>)}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}><ActionButton onClick={savePlaceholderSettings}>Save placeholder settings</ActionButton><ActionButton alt onClick={resetPlaceholderSettings}>Reset defaults</ActionButton></div>
          </Panel>
        </div>
      )}

      {editOpen ? <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 9999 }}><div style={{ width: "min(680px, 96vw)", borderRadius: 24, border: "1px solid #2b3157", background: "rgba(9,10,20,0.98)", boxShadow: "0 20px 80px rgba(0,0,0,0.45)", padding: 18 }}><div style={{ fontSize: 22, fontWeight: 1000, fontStyle: "italic", marginBottom: 14 }}>EDIT SHOUT-OUT</div><Label>From</Label><Input value={editFromName} onChange={(e) => setEditFromName(e.target.value)} maxLength={40} /><Label style={{ marginTop: 12 }}>Message</Label><Textarea rows={5} value={editMessageText} onChange={(e) => setEditMessageText(e.target.value)} maxLength={160} /><div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>{editMessageText.length} characters</div><div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}><ActionButton onClick={saveEditedMessage}>{editBusy ? "Saving..." : "Save changes"}</ActionButton><ActionButton alt onClick={() => { if (editBusy) return; setEditOpen(false); setEditMessageId(""); setEditFromName(""); setEditMessageText(""); }}>Cancel</ActionButton></div></div></div> : null}
    </div>
  );
}

function CodeUsesModal({ open, code, items, loading, onClose }: { open: boolean; code: RedemptionCode | null; items: RedemptionCodeUseItem[]; loading: boolean; onClose: () => void; }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ width: "min(920px, 100%)", maxHeight: "84vh", overflow: "auto", border: "1px solid #1f2340", borderRadius: 24, padding: 18, background: "rgba(8,8,20,0.97)", color: "#fff", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}><div><div style={{ fontSize: 20, fontWeight: 1000, fontStyle: "italic" }}>CODE USES {code ? `• ${code.code}` : ""}</div><div style={{ opacity: 0.72, marginTop: 4, fontSize: 13 }}>Showing the best available usage history from the credit ledger.</div></div><ActionButton alt onClick={onClose}>Close</ActionButton></div>
        {loading ? <div style={{ opacity: 0.75 }}>Loading uses…</div> : items.length === 0 ? <div style={{ opacity: 0.75 }}>No recorded uses found for this code.</div> : <div style={{ display: "grid", gap: 10 }}>{items.map((item, idx) => <div key={item.id || `${item.emailHash}-${item.usedAt}-${idx}`} style={rowStyle}><div><div style={{ fontWeight: 900 }}>{item.label}</div><div style={{ opacity: 0.75 }}>{new Date(item.usedAt).toLocaleString()}</div><div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>{item.emailHash}</div></div><div style={{ textAlign: "right", opacity: 0.82 }}><div>{item.reason}</div><div style={{ fontSize: 12, opacity: 0.72 }}>{item.delta > 0 ? `+${item.delta}` : item.delta}</div></div></div>)}</div>}
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void; }) {
  return <button onClick={onClick} style={{ padding: "10px 14px", borderRadius: 14, border: active ? "1px solid #4f61ff" : "1px solid #232845", background: active ? "rgba(37,41,92,0.92)" : "rgba(10,10,22,0.6)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>{children}</button>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ border: "1px solid #1f2340", borderRadius: 24, padding: 18, background: "rgba(8,8,20,0.88)" }}><div style={{ fontSize: 18, fontWeight: 1000, fontStyle: "italic", marginBottom: 14 }}>{title}</div>{children}</div>;
}

function ActionButton({ alt, children, onClick }: { alt?: boolean; children: React.ReactNode; onClick: () => void; }) {
  return <button type="button" onClick={onClick} style={{ padding: "9px 12px", borderRadius: 12, border: alt ? "1px solid #34395e" : "1px solid #4f61ff", background: alt ? "rgba(10,10,22,0.72)" : "rgba(37,41,92,0.92)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>{children}</button>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "4px 9px", borderRadius: 999, border: "1px solid #2f3561", background: "rgba(18,20,40,0.8)", fontSize: 12, fontWeight: 800 }}>{children}</div>;
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 12, opacity: 0.82, marginBottom: 6, ...style }}>{children}</div>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={inputStyle} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, resize: "vertical" }} />;
}

function Field({ label, value, onChange }: { label: string; value: any; onChange: (next: number) => void; }) {
  return <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, opacity: 0.82 }}>{label}</span><input type="number" value={String(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} style={inputStyle} /></label>;
}

function MoneyField({ label, centsValue, onChangeCents }: { label: string; centsValue: number; onChangeCents: (cents: number) => void; }) {
  return <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, opacity: 0.82 }}>{label}</span><input value={centsToDollars(centsValue)} onChange={(e) => onChangeCents(dollarsToCents(e.target.value))} style={inputStyle} inputMode="decimal" /></label>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void; }) {
  return <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, opacity: 0.82 }}>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void; }) {
  return <label style={{ ...rowStyle, marginBottom: 0, cursor: "pointer" }}><div style={{ fontWeight: 900 }}>{label}</div><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18 }} /></label>;
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #323862", background: "#0d1020", color: "#fff", outline: "none" };
const primaryBtn: React.CSSProperties = { padding: "12px 16px", borderRadius: 14, border: "1px solid #4f61ff", background: "rgba(37,41,92,0.92)", color: "#fff", fontWeight: 900, cursor: "pointer" };
const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 12, borderRadius: 16, border: "1px solid #252b4b", background: "rgba(17,18,34,0.9)", marginBottom: 10 };
const rowCardStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", padding: 12, borderRadius: 16, border: "1px solid #252b4b", background: "rgba(17,18,34,0.9)", marginBottom: 10 };
const cardStyle: React.CSSProperties = { padding: 14, borderRadius: 18, border: "1px solid #252b4b", background: "rgba(17,18,34,0.9)" };
const noteStyle: React.CSSProperties = { marginBottom: 16, border: "1px solid #26305c", background: "rgba(24,24,60,0.7)", borderRadius: 16, padding: 14, fontWeight: 700 };
const loginWrap: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, background: "#04060d", color: "#fff" };
const loginCard: React.CSSProperties = { maxWidth: 560, width: "100%", borderRadius: 26, border: "1px solid rgba(90,90,255,0.35)", background: "rgba(0,0,0,0.42)", padding: 18, textAlign: "center" };
const queueRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", padding: 14, borderRadius: 18, border: "1px solid #252b4b", background: "rgba(17,18,34,0.9)", marginBottom: 10 };
const requestPillStyle: React.CSSProperties = { padding: "4px 10px", borderRadius: 999, border: "1px solid #4f61ff", background: "rgba(37,41,92,0.92)", color: "#fff", fontSize: 12, fontWeight: 900, lineHeight: 1 };
