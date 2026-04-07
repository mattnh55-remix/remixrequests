"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QueueList from "./QueueList";
import RequestPanel from "./RequestPanel";
import ShoutoutPanel from "./ShoutoutPanel";
import SearchAddPanel from "./SearchAddPanel";
import InterstitialPad from "./InterstitialPad";
import BoothInterstitialRuntime from "./BoothInterstitialRuntime";
import SessionTimerPanel from "./SessionTimerPanel";
import BoothNotesPanel from "./BoothNotesPanel";
import InterstitialPromptModal from "./InterstitialPromptModal";
import { queueSummary, normalizeQueue, safeJson } from "./booth-utils";
import type {
  ActiveInterstitialPlayback,
  BoothDataState,
  BoothMode,
  BoothSessionClock,
  DueInterstitialPromptOption,
  InterstitialPadItem,
  RequestItem,
  RuntimePreview,
  ShoutoutItem,
} from "./types";

type PostJsonResult = {
  ok: boolean;
  data: any;
};

type MaterializeResult = {
  ok?: boolean;
  materialized?: boolean;
  assetFileUrl?: string | null;
  assetName?: string | null;
  bridgePlaybackFilename?: string | null;
  reason?: string;
};

const DEFAULT_LOCAL_BRIDGE_BASE_URL = "http://127.0.0.1:8787";
const BRIDGE_BASE_URL_STORAGE_KEY = "rr.bridgeBaseUrl";
const SESSION_CYCLE_MINUTES = 120;
const BOOTH_ALERTS_STORAGE_KEY = "rr.booth.alerts.enabled";
const REGULAR_REQUEST_ALERT_SRC = "/sounds/req-regular.mp3";
const BOOSTED_REQUEST_ALERT_SRC = "/sounds/req-boosted.mp3";
const SHOUTOUT_ALERT_SRC = "/sounds/shoutout.mp3";
const ALERT_COOLDOWN_MS = 1200;


async function postJson(url: string, body: Record<string, unknown>): Promise<PostJsonResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return { ok: res.ok, data: await safeJson(res) };
}

function getBridgeBaseUrl() {
  if (typeof window === "undefined") {
    return DEFAULT_LOCAL_BRIDGE_BASE_URL;
  }

  const override = window.localStorage.getItem(BRIDGE_BASE_URL_STORAGE_KEY)?.trim();
  if (override) {
    return override.replace(/\/+$/, "");
  }

  return DEFAULT_LOCAL_BRIDGE_BASE_URL;
}

function toBridgeFilename(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const withoutQuery = value.split("?")[0].split("#")[0];
  const normalized = withoutQuery.replace(/\\/g, "/");
  const lastSegment = normalized.split("/").filter(Boolean).pop() || "";

  if (!lastSegment) return null;

  try {
    return decodeURIComponent(lastSegment).trim() || null;
  } catch {
    return lastSegment.trim() || null;
  }
}

async function triggerLocalBridgePlay(rawFilename: unknown) {
  const filename = toBridgeFilename(rawFilename);

  if (!filename) {
    console.error("Bridge playback skipped: invalid filename", { rawFilename });
    return { ok: false, reason: "INVALID_FILENAME" as const };
  }

  const bridgeBaseUrl = getBridgeBaseUrl();
  const bridgeUrl = `${bridgeBaseUrl}/play`;

  try {
    const res = await fetch(bridgeUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename }),
    });

    const payload = await safeJson(res);

    if (!res.ok) {
      console.error("Bridge playback failed", {
        bridgeUrl,
        filename,
        status: res.status,
        payload,
      });

      return { ok: false, reason: "BRIDGE_HTTP_ERROR" as const, status: res.status, payload };
    }

    return { ok: true, payload };
  } catch (error) {
    console.error("Bridge playback request threw", {
      bridgeUrl,
      filename,
      error,
    });

    return { ok: false, reason: "BRIDGE_FETCH_ERROR" as const, error };
  }
}

async function triggerLocalBridgeStop() {
  const bridgeBaseUrl = getBridgeBaseUrl();
  const bridgeUrl = `${bridgeBaseUrl}/stop`;

  try {
    const res = await fetch(bridgeUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const payload = await safeJson(res);

    if (!res.ok) {
      console.error("Bridge stop failed", {
        bridgeUrl,
        status: res.status,
        payload,
      });

      return {
        ok: false,
        reason: "BRIDGE_STOP_HTTP_ERROR" as const,
        status: res.status,
        payload,
      };
    }

    return { ok: true, payload };
  } catch (error) {
    console.error("Bridge stop request threw", {
      bridgeUrl,
      error,
    });

    return {
      ok: false,
      reason: "BRIDGE_STOP_FETCH_ERROR" as const,
      error,
    };
  }
}

function getSessionStorageKey(location: string) {
  return `rr.booth.sessionClock:${location}`;
}

function getSessionTimerStateStorageKey(location: string) {
  return `rr.booth.sessionTimerState:${location}`;
}

function createNewSessionClock(): BoothSessionClock {
  const startedAtIso = new Date().toISOString();
  return {
    sessionId: `session-${startedAtIso}`,
    startedAtIso,
    cycleMinutes: SESSION_CYCLE_MINUTES,
  };
}

function loadSessionClock(location: string): BoothSessionClock {
  if (typeof window === "undefined") {
    return createNewSessionClock();
  }

  try {
    const raw = window.localStorage.getItem(getSessionStorageKey(location));
    if (!raw) {
      const created = createNewSessionClock();
      window.localStorage.setItem(getSessionStorageKey(location), JSON.stringify(created));
      return created;
    }

    const parsed = JSON.parse(raw) as Partial<BoothSessionClock>;
    if (!parsed.sessionId || !parsed.startedAtIso) {
      const created = createNewSessionClock();
      window.localStorage.setItem(getSessionStorageKey(location), JSON.stringify(created));
      return created;
    }

    return {
      sessionId: parsed.sessionId,
      startedAtIso: parsed.startedAtIso,
      cycleMinutes: parsed.cycleMinutes || SESSION_CYCLE_MINUTES,
    };
  } catch {
    const created = createNewSessionClock();
    try {
      window.localStorage.setItem(getSessionStorageKey(location), JSON.stringify(created));
    } catch {}
    return created;
  }
}

type PersistedSessionTimerState = {
  sessionPaused: boolean;
  pausedElapsedMs: number;
  pauseStartedAtMs: number | null;
};

function loadSessionTimerState(location: string): PersistedSessionTimerState {
  if (typeof window === "undefined") {
    return {
      sessionPaused: false,
      pausedElapsedMs: 0,
      pauseStartedAtMs: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(getSessionTimerStateStorageKey(location));
    if (!raw) {
      return {
        sessionPaused: false,
        pausedElapsedMs: 0,
        pauseStartedAtMs: null,
      };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedSessionTimerState>;

    return {
      sessionPaused: Boolean(parsed.sessionPaused),
      pausedElapsedMs: Math.max(0, Number(parsed.pausedElapsedMs ?? 0)),
      pauseStartedAtMs:
        parsed.pauseStartedAtMs == null ? null : Number(parsed.pauseStartedAtMs),
    };
  } catch {
    return {
      sessionPaused: false,
      pausedElapsedMs: 0,
      pauseStartedAtMs: null,
    };
  }
}

function saveSessionTimerState(
  location: string,
  timerState: PersistedSessionTimerState
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getSessionTimerStateStorageKey(location),
      JSON.stringify(timerState)
    );
  } catch {}
}

function saveSessionClock(location: string, clock: BoothSessionClock) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getSessionStorageKey(location), JSON.stringify(clock));
  } catch {}
}

function getAssetFilename(asset: InterstitialPadItem | DueInterstitialPromptOption) {
  if ("filePath" in asset || "fileUrl" in asset) {
    return String(
      (asset as InterstitialPadItem).filePath ??
        (asset as InterstitialPadItem).fileUrl ??
        ""
    ).trim();
  }
  return "";
}

function areBoothAlertsEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(BOOTH_ALERTS_STORAGE_KEY) === "true";
}

function requestLooksBoosted(item: RequestItem) {
  const candidate = item as Record<string, unknown>;

  if (candidate.isBoosted === true) return true;
  if (candidate.boosted === true) return true;
  if (candidate.priorityLane === "PLAY_NOW") return true;
  if (candidate.lane === "PLAY_NOW") return true;
  if (candidate.sourceType === "BOOSTED_REQUEST") return true;
  if (candidate.requestType === "BOOSTED") return true;
  if (candidate.kind === "BOOSTED") return true;

  const boostCount = Number(candidate.boostCount ?? 0);
  if (Number.isFinite(boostCount) && boostCount > 0) return true;

  const boostAmount = Number(candidate.boostAmount ?? 0);
  if (Number.isFinite(boostAmount) && boostAmount > 0) return true;

  const cost = Number(candidate.costPoints ?? candidate.pointsCost ?? 0);
  if (Number.isFinite(cost) && cost >= 5) return true;

  return false;
}

function getRequestAlertKind(item: RequestItem): "regular" | "boosted" {
  return requestLooksBoosted(item) ? "boosted" : "regular";
}

export default function BoothLayout({ location }: { location: string }) {
  const mode: BoothMode = "performance";

  const [state, setState] = useState<BoothDataState>({
    queue: [],
    runtimePreview: null,
    playNowRequests: [],
    upNextRequests: [],
    pendingShoutouts: [],
    approvedShoutouts: [],
    loading: true,
    lastUpdated: null,
    errors: [],
  });

  useEffect(() => {
  async function loadMe() {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const data = await res.json();

      if (data?.ok && data?.user) {
        setStaffName(data.user.username || "");
        setStaffRole(data.user.role || "");
      }
    } catch {}
  }

  loadMe();
}, []);

  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [sessionClock, setSessionClock] = useState<BoothSessionClock>(() =>
    createNewSessionClock()
  );
  const [tick, setTick] = useState(0);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [pausedElapsedMs, setPausedElapsedMs] = useState(0);
  const [pauseStartedAtMs, setPauseStartedAtMs] = useState<number | null>(null);
  const [promptResolving, setPromptResolving] = useState(false);
  const [playingInterstitial, setPlayingInterstitial] =
    useState<ActiveInterstitialPlayback | null>(null);

  const regularRequestAlertRef = useRef<HTMLAudioElement | null>(null);
  const boostedRequestAlertRef = useRef<HTMLAudioElement | null>(null);
  const shoutoutAlertRef = useRef<HTMLAudioElement | null>(null);
  const previousIncomingIdsRef = useRef<string[]>([]);
  const previousPendingShoutoutIdsRef = useRef<string[]>([]);
  const lastAlertAtRef = useRef(0);

  async function logout() {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/signin";
}

  function playBoothAlert(kind: "regular" | "boosted" | "shoutout") {
    if (!areBoothAlertsEnabled()) return;

    const now = Date.now();
    if (now - lastAlertAtRef.current < ALERT_COOLDOWN_MS) return;
    lastAlertAtRef.current = now;

    const audio =
      kind === "boosted"
        ? boostedRequestAlertRef.current
        : kind === "shoutout"
          ? shoutoutAlertRef.current
          : regularRequestAlertRef.current;

    if (!audio) return;

    try {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    } catch {}
  }

useEffect(() => {
  const clock = loadSessionClock(location);
  const timerState = loadSessionTimerState(location);

  setSessionClock(clock);
  setSessionPaused(timerState.sessionPaused);
  setPausedElapsedMs(timerState.pausedElapsedMs);
  setPauseStartedAtMs(timerState.pauseStartedAtMs);
}, [location]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    regularRequestAlertRef.current = new Audio(REGULAR_REQUEST_ALERT_SRC);
    regularRequestAlertRef.current.preload = "auto";

    boostedRequestAlertRef.current = new Audio(BOOSTED_REQUEST_ALERT_SRC);
    boostedRequestAlertRef.current.preload = "auto";

    shoutoutAlertRef.current = new Audio(SHOUTOUT_ALERT_SRC);
    shoutoutAlertRef.current.preload = "auto";
  }, []);

  const [promptState, setPromptState] = useState<{
    open: boolean;
    scheduleId: string | null;
    category: string | null;
    promptTitle: string | null;
    promptBody: string | null;
    assets: any[];
  }>({
    open: false,
    scheduleId: null,
    category: null,
    promptTitle: null,
    promptBody: null,
    assets: [],
  });

  const startedAtMs = new Date(sessionClock.startedAtIso).getTime();
  const effectiveNowMs = sessionPaused && pauseStartedAtMs ? pauseStartedAtMs : Date.now();
  const elapsedMs = Math.max(0, effectiveNowMs - startedAtMs - pausedElapsedMs);
  const elapsedMin = Math.floor(elapsedMs / 60000);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!playingInterstitial) return;

    const timeout = window.setTimeout(() => {
      setPlayingInterstitial((prev) => {
        if (!prev) return null;
        if (new Date(prev.endsAtIso).getTime() <= Date.now()) {
          return null;
        }
        return prev;
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [playingInterstitial, tick]);

  const [warningLevel, setWarningLevel] = useState<
    "normal" | "warn5" | "warn2" | "hot1"
  >("normal");

  const [latchedWarning, setLatchedWarning] = useState<
    "normal" | "warn5" | "warn2" | "hot1"
  >("normal");

  const [promptLatched, setPromptLatched] = useState(false);
  const [cycleSuppressed, setCycleSuppressed] = useState(false);

  async function load() {
    const [queueRes, requestRes, shoutRes] = await Promise.all([
      fetch(`/api/booth/queue/${location}`, { cache: "no-store" }),
      fetch(`/api/admin/queue/${location}`, { cache: "no-store" }),
      fetch(`/api/admin/shoutouts/${location}`, { cache: "no-store" }),
    ]);

    const queuePayload = queueRes.ok ? await safeJson(queueRes) : null;
    const requestPayload = requestRes.ok ? await safeJson(requestRes) : null;
    const shoutPayload = shoutRes.ok ? await safeJson(shoutRes) : null;

    const playNowRequests: RequestItem[] = Array.isArray(requestPayload?.playNow)
      ? requestPayload.playNow
      : [];
    const upNextRequests: RequestItem[] = Array.isArray(requestPayload?.upNext)
      ? requestPayload.upNext
      : [];

    const queue = normalizeQueue(queuePayload);

    const pendingShoutouts: ShoutoutItem[] = Array.isArray(shoutPayload?.pending)
      ? shoutPayload.pending
      : [];
    const approvedShoutouts: ShoutoutItem[] = Array.isArray(shoutPayload?.approved)
      ? shoutPayload.approved
      : [];

    const runtimePreview: RuntimePreview | null = {
      mode: "idle",
      action: "QUEUE_MANUAL_ORDER",
      reason: "DJ_CONTROLLED_PENDING_QUEUE",
    };

    setState((prev) => ({
      ...prev,
      queue: queue as any,
      runtimePreview,
      playNowRequests,
      upNextRequests,
      pendingShoutouts,
      approvedShoutouts,
      loading: false,
      lastUpdated: new Date().toISOString(),
    }));
  }

useEffect(() => {
  saveSessionTimerState(location, {
    sessionPaused,
    pausedElapsedMs,
    pauseStartedAtMs,
  });
}, [location, sessionPaused, pausedElapsedMs, pauseStartedAtMs]);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, 3000);
    return () => window.clearInterval(id);
  }, [location]);

  const summary = useMemo(
    () =>
      queueSummary(
        state.queue.map((item: any) => ({
          ...item,
          sourceType: item.sourceType || "REQUEST",
        }))
      ),
    [state.queue]
  );

  const incomingApprovalRequests = useMemo(
    () => [...state.playNowRequests, ...state.upNextRequests],
    [state.playNowRequests, state.upNextRequests]
  );

  useEffect(() => {
    const currentIds = incomingApprovalRequests.map((item, index) => {
      const candidate = item as Record<string, unknown>;
      return String(candidate.requestId ?? candidate.id ?? `${index}:${candidate.title ?? "request"}`);
    });

    const previousIds = previousIncomingIdsRef.current;

    if (!previousIds.length) {
      previousIncomingIdsRef.current = currentIds;
      return;
    }

    const newIndexes: number[] = [];

    currentIds.forEach((id, index) => {
      if (!previousIds.includes(id)) {
        newIndexes.push(index);
      }
    });

    if (newIndexes.length > 0) {
      const newestItem = incomingApprovalRequests[newIndexes[newIndexes.length - 1]];
      const alertKind = newestItem ? getRequestAlertKind(newestItem) : "regular";
      playBoothAlert(alertKind);
    }

    previousIncomingIdsRef.current = currentIds;
  }, [incomingApprovalRequests]);

  useEffect(() => {
    const currentIds = state.pendingShoutouts.map((item, index) => {
      const candidate = item as Record<string, unknown>;
      return String(candidate.messageId ?? candidate.id ?? `${index}:${candidate.fromName ?? "shoutout"}`);
    });

    const previousIds = previousPendingShoutoutIdsRef.current;

    if (!previousIds.length) {
      previousPendingShoutoutIdsRef.current = currentIds;
      return;
    }

    const hasNewShoutout = currentIds.some((id) => !previousIds.includes(id));

    if (hasNewShoutout) {
      playBoothAlert("shoutout");
    }

    previousPendingShoutoutIdsRef.current = currentIds;
  }, [state.pendingShoutouts]);

  useEffect(() => {
    const remaining = sessionClock.cycleMinutes - elapsedMin;

    let level: "normal" | "warn5" | "warn2" | "hot1" = "normal";

    if (!cycleSuppressed) {
      if (remaining <= 1) level = "hot1";
      else if (remaining <= 2) level = "warn2";
      else if (remaining <= 5) level = "warn5";
    }

    setWarningLevel(level);
  }, [elapsedMin, sessionClock.cycleMinutes, cycleSuppressed]);

  async function materializeRuntimeAndMaybePlay() {
    const result = await postJson(`/api/booth/runtime/materialize-next/${location}`, {});
    const payload = (result.data ?? {}) as MaterializeResult;

    if (!result.ok) {
      console.error("Runtime materialization request failed", payload);
      return payload;
    }

    const playbackFilename = payload.bridgePlaybackFilename || payload.assetFileUrl || null;

    if (payload.materialized && playbackFilename) {
      await triggerLocalBridgePlay(playbackFilename);
    }

    return payload;
  }

  async function markRequestPlayed(requestId: string) {
    const actionResult = await postJson(`/api/admin/queue/played`, { requestId });
    if (!actionResult.ok) {
      console.error("Request played failed", { requestId, response: actionResult.data });
      await load();
      return actionResult.data;
    }

    await materializeRuntimeAndMaybePlay();
    await load();
    return actionResult.data;
  }

  async function acceptRequest(requestId: string) {
    const actionResult = await postJson(`/api/admin/queue/accept`, { requestId });
    if (!actionResult.ok) {
      console.error("Request accept failed", { requestId, response: actionResult.data });
      await load();
      return actionResult.data;
    }

    await load();
    return actionResult.data;
  }

  async function rejectRequest(requestId: string, reason: string) {
    const actionResult = await postJson(`/api/admin/queue/reject`, { requestId, reason });
    if (!actionResult.ok) {
      console.error("Request reject failed", { requestId, response: actionResult.data });
      await load();
      return actionResult.data;
    }

    await load();
    return actionResult.data;
  }

  async function handlePlayInterstitialAsset(
    asset: InterstitialPadItem | DueInterstitialPromptOption,
    categoryOverride?: string
  ) {
    const filename = getAssetFilename(asset);

    if (!filename) {
      throw new Error(`No bridge filename found for "${asset.name}".`);
    }

    const result: any = await triggerLocalBridgePlay(filename);

    if (result?.ok === false) {
      throw new Error(`Could not play "${asset.name}".`);
    }

    const durationMs = Math.max(1000, Number(asset.durationSec ?? 8) * 1000);
    const now = new Date();
    const ends = new Date(now.getTime() + durationMs);

    setPlayingInterstitial({
      assetId: "assetId" in asset ? asset.assetId : asset.id,
      assetName: asset.name,
      category:
        categoryOverride ||
        ("category" in asset
          ? String(categoryOverride || (asset as any).category || "MANUAL_ONLY")
          : "MANUAL_ONLY"),
      startedAtIso: now.toISOString(),
      endsAtIso: ends.toISOString(),
    });
  }

    function toggleSessionPause() {
    if (!sessionPaused) {
      setSessionPaused(true);
      setPauseStartedAtMs(Date.now());
      return;
    }

    if (pauseStartedAtMs) {
      setPausedElapsedMs((prev) => prev + (Date.now() - pauseStartedAtMs));
    }

    setSessionPaused(false);
    setPauseStartedAtMs(null);
  }

  function resetSessionClock() {
    const next = createNewSessionClock();
    setSessionClock(next);
    saveSessionClock(location, next);
        setSessionPaused(false);
    setPausedElapsedMs(0);
    setPauseStartedAtMs(null);

saveSessionTimerState(location, {
  sessionPaused: false,
  pausedElapsedMs: 0,
  pauseStartedAtMs: null,
});

    setCycleSuppressed(false);
    setPromptLatched(false);
    setLatchedWarning("normal");

    setPromptState({
      open: false,
      scheduleId: null,
      category: null,
      promptTitle: null,
      promptBody: null,
      assets: [],
    });
  }

  const handlePromptOpen = (payload: any) => {
    if (promptResolving || promptState.open) return;

    setLatchedWarning(warningLevel);
    setPromptLatched(true);

    setPromptState({
      open: true,
      scheduleId: payload?.scheduleId ?? null,
      category: payload?.category ?? null,
      promptTitle: payload?.promptTitle ?? null,
      promptBody: payload?.promptBody ?? null,
      assets: payload?.eligibleAssets ?? [],
    });
  };

  const handlePromptResolved = () => {
    setPromptLatched(false);
    setCycleSuppressed(true);
    setLatchedWarning("normal");

    setPromptState({
      open: false,
      scheduleId: null,
      category: null,
      promptTitle: null,
      promptBody: null,
      assets: [],
    });
  };

  return (
    <div className="rrBooth rrBooth--compact">
      <div className="rrBooth__topbar">
        <div className="rrTopbarLeft">
<div className="rrTopbarLeft">
  <div className="rrEyebrow">REMIXREQUESTS • LIVE BOOTH</div>

  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
    <div className="rrTitle">REMIX REQUESTS & SHOUTOUTS</div>

    <div style={{
      fontSize: 12,
      fontWeight: 800,
      opacity: 0.85,
      padding: "4px 8px",
      borderRadius: 6,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)"
    }}>
      {staffName || "Staff"} ({staffRole || "..."})
    </div>

    <button
      onClick={logout}
      style={{
        marginLeft: 8,
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 900,
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.15)",
        background: "linear-gradient(180deg,#bb6776,#813944)",
        color: "#fff",
        cursor: "pointer"
      }}
    >
      Logout
    </button>
  </div></div>

  <div className="rrSub">
            Audience Interaction Panel
          </div>
        </div>

        <div className="rrTopbarCenter">
          <SessionTimerPanel
            startedAtIso={sessionClock.startedAtIso}
            cycleMinutes={sessionClock.cycleMinutes}
            onReset={resetSessionClock}
            warningLevel={promptLatched ? latchedWarning : warningLevel}
            promptLatched={promptLatched}
            elapsedMsOverride={elapsedMs}
            isPaused={sessionPaused}
            onPauseToggle={toggleSessionPause}
          />
        </div>

        <div className="rrTopbarRight">
          <div className="statBoxes">
           

            <Link
              href={`/admin/${location}`}
              className="statBox statBox--link"
              aria-label="Admin settings"
            >
              <span>SETTINGS</span>
              <strong>⚙</strong>
            </Link>
          </div>
        </div>
      </div>

      <div className="rrBooth__grid">
        <section className="boothPanel boothPanel--primary rrQueueStage">
          <div className="panelHead panelHead--tight">
            <div>
              <div className="panelTitle">Request Queue</div>
              <div className="panelSub">Songs requestsed by guests and staff appear below!</div>
            </div>
            <div className="panelHeadBadge">
              <span className="statusPill statusPill--playing">LIVE</span>
            </div>
          </div>

          <div className="rrQueueStage__search">
            <SearchAddPanel location={location} onAdded={load} />
          </div>

          <div className="rrQueueStage__content">
            <div className="rrQueueStage__stack">
              <div className="rrQueueStage__queueShell">
                <QueueList
                  location={location}
                  items={state.queue as any}
                  mode={mode}
                  onPlayed={markRequestPlayed}
                  onReject={rejectRequest}
                  onReordered={load}
                />
              </div>

              <div className="rrRequestPanelWrap">
                <RequestPanel
                  playNow={state.playNowRequests}
                  upNext={state.upNextRequests}
                  mode={mode}
                  onAccept={acceptRequest}
                  onReject={rejectRequest}
                />
              </div>
            </div>

<BoothInterstitialRuntime
  location={location}
  sessionStartedAt={sessionClock.startedAtIso}
  pausedElapsedMs={pausedElapsedMs}
  isPaused={sessionPaused}
  onPromptOpen={handlePromptOpen}
  onPromptResolved={handlePromptResolved}
/>

            {promptState.open ? (
              <div className="rrQueueStage__modalOverlay">
                <InterstitialPromptModal
                  open={promptState.open}
                  category={promptState.category}
                  promptTitle={promptState.promptTitle}
                  promptBody={promptState.promptBody}
                  assets={promptState.assets}
                  busy={promptResolving}
                  onPlay={async (asset) => {
                    try {
                      setPromptResolving(true);

                      await handlePlayInterstitialAsset(
                        {
                          id: asset.id,
                          name: asset.title,
                          category: asset.category,
                          durationSec: null,
                          fileUrl: asset.playFilename,
                          previewGifUrl: asset.previewUrl,
                          iconLabel: null,
                          notes: asset.body,
                          active: true,
                        },
                        asset.category
                      );

                      await postJson(`/api/booth/interstitial-event`, {
                        location,
                        scheduleId: promptState.scheduleId,
                        assetId: asset.id,
                        category: asset.category,
                        status: "PLAYED",
                        playedAt: new Date().toISOString(),
                        sessionStartedAt: sessionClock.startedAtIso,
                      });

                      handlePromptResolved();
                    } finally {
                      setPromptResolving(false);
                    }
                  }}
                  onSkip={async (reason) => {
                    try {
                      setPromptResolving(true);

                      const result = await postJson(`/api/booth/interstitial-event`, {
                        location,
                        scheduleId: promptState.scheduleId,
                        category: promptState.category,
                        reason,
                        status: "SKIPPED",
                        playedAt: new Date().toISOString(),
                        sessionStartedAt: sessionClock.startedAtIso,
                      });

                      if (!result.ok) {
                        throw new Error(
                          result?.data?.error || JSON.stringify(result?.data) || "Skip failed"
                        );
                      }

                      handlePromptResolved();
                    } finally {
                      setPromptResolving(false);
                    }
                  }}
                />
              </div>
            ) : null}
          </div>
        </section>
        <div className="boothStack">
          <InterstitialPad
            location={location}
            activeAssetId={playingInterstitial?.assetId ?? null}
            activePlayback={playingInterstitial}
            optionHistoryMap={{}}
            onPlayAsset={async (asset) => {
              await handlePlayInterstitialAsset(
                asset,
                "category" in asset ? asset.category : "MANUAL_ONLY"
              );
            }}
            onStopPlayback={async () => {
              const result = await triggerLocalBridgeStop();
              setPlayingInterstitial(null);
              return result;
            }}
          />
        </div>

        <div className="boothStack boothStack--right">
          <ShoutoutPanel
            pending={state.pendingShoutouts}
            approved={state.approvedShoutouts}
            mode={mode}
            onRefresh={load}
            onApprove={async (messageId) => {
              const result = await postJson("/api/admin/shoutouts/approve", { messageId });
              await load();
              return result.data;
            }}
            onReject={async (messageId, note) => {
              const result = await postJson("/api/admin/shoutouts/reject", {
                messageId,
                note: note?.trim() || "Rejected from booth",
              });
              await load();
              return result.data;
            }}
            onEdit={async ({ messageId, messageText, fromName }) => {
              const result = await postJson("/api/admin/shoutouts/edit", {
                messageId,
                messageText,
                fromName,
              });
              await load();
              return result.data;
            }}
          />

          <BoothNotesPanel storageKey={`rr.booth.notes:${location}`} />
        </div>
      </div>

      <style jsx global>{`
        .rrSessionHero {
          display: grid;
          gap: 6px;
          padding: 10px 14px;
          border-radius: 6px;
          border: 1px solid rgba(77, 107, 143, 0.35);
          background: linear-gradient(180deg, rgba(25, 32, 48, 0.95), rgba(10, 14, 24, 0.95));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(0, 0, 0, 0.4),
            0 10px 24px rgba(0, 0, 0, 0.25);
        }

        .rrSessionHero__eyebrow {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.6px;
          opacity: 0.7;
        }

        .rrSessionHero__main {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .rrSessionHero__time {
          font-size: 26px;
          font-weight: 1000;
          letter-spacing: -0.5px;
        }

        .rrSessionHero__reset {
          appearance: none;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, #3d7ec0 0%, #245694 52%, #1c4479 100%);
          color: #f1f5fb;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 1000;
          cursor: pointer;
        }

        .rrSessionHero__sub {
          font-size: 11px;
          color: rgba(220, 230, 245, 0.7);
        }

        .rrSessionHero__bar {
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .rrSessionHero__barFill {
          height: 100%;
          background: linear-gradient(90deg, #4a93df, #2ec1ea);
          box-shadow: 0 0 10px rgba(46, 193, 234, 0.5);
        }

        .rrBooth {
          min-height: 100vh;
          padding: 6px 8px 10px;
          background:
            radial-gradient(circle at 10% 12%, rgba(0, 180, 214, 0.16), transparent 20%),
            radial-gradient(circle at 72% 18%, rgba(164, 50, 186, 0.14), transparent 22%),
            linear-gradient(90deg, #07111c 0%, #0a1625 52%, #120c1d 100%);
          color: #f2f5fb;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .rrBooth--compact {
          --panel-radius: 6px;
          --card-radius: 5px;
          --soft-radius: 4px;
          --row-gap: 5px;
          --inset-border: rgba(255, 255, 255, 0.1);
        }

        .rrBooth__topbar {
          display: grid;
          grid-template-columns: minmax(320px, 1.2fr) minmax(360px, 0.9fr) minmax(420px, 1fr);
          gap: 12px;
          align-items: stretch;
          margin-bottom: 8px;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(84, 118, 160, 0.28);
          background: linear-gradient(180deg, rgba(20, 27, 42, 0.96), rgba(9, 14, 24, 0.96));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(0, 0, 0, 0.34),
            0 12px 28px rgba(0, 0, 0, 0.24);
        }

        .rrTopbarLeft,
        .rrTopbarCenter,
        .rrTopbarRight {
          min-width: 0;
        }

        .rrTopbarCenter {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rrTopbarCenter .boothPanel,
        .rrTopbarCenter > div {
          width: 100%;
          max-width: 470px;
        }

        .rrTopbarCenter .rrSessionHero,
        .rrTopbarCenter [class*="Session"],
        .rrTopbarCenter > * {
          min-width: 0;
        }

        .rrTopbarRight {
          display: flex;
          align-items: stretch;
          justify-content: flex-end;
        }

        .rrEyebrow {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2.2px;
          opacity: 0.72;
        }

        .rrTitle {
          margin-top: 2px;
          font-size: 28px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.8px;
        }

        .rrSub {
          margin-top: 4px;
          color: rgba(235, 241, 255, 0.74);
          font-size: 12px;
          line-height: 1.42;
          max-width: 720px;
        }

        .statBoxes {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .statBox {
          min-width: 104px;
          padding: 10px 12px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
            linear-gradient(180deg, rgba(19, 24, 37, 0.92), rgba(11, 16, 27, 0.92));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(0, 0, 0, 0.28);
        }

        .statBox span {
          display: block;
          margin-bottom: 5px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.8px;
          opacity: 0.7;
        }

        .statBox strong {
          font-size: 13px;
          font-weight: 1000;
        }

        .statBox--link {
          text-decoration: none;
          color: inherit;
          display: block;
        }

        .statBox--button {
          appearance: none;
          cursor: pointer;
          text-align: left;
          color: inherit;
        }

        .statBox--enabled {
          border-color: rgba(46, 193, 234, 0.38);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(0, 0, 0, 0.28),
            0 0 0 1px rgba(46, 193, 234, 0.16),
            0 0 14px rgba(46, 193, 234, 0.12);
        }

        .rrBooth__grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr) minmax(360px, 1fr);
          gap: 10px;
          align-items: start;
        }

        .boothPanel,
        .boothPanel--compact,
        .boothPanel--primary {
          min-width: 0;
          border-radius: 6px;
          border: 1px solid rgba(77, 107, 143, 0.28);
          background: linear-gradient(180deg, rgba(21, 27, 41, 0.95), rgba(8, 13, 23, 0.94));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(0, 0, 0, 0.35),
            0 12px 26px rgba(0, 0, 0, 0.24);
          padding: 10px;
        }

        .boothStack {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .panelHead,
        .boothPanelHeader {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .panelTitle,
        .boothPanelTitle {
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .panelSub,
        .boothPanelSub {
          margin-top: 2px;
          color: rgba(235, 241, 255, 0.72);
          font-size: 12px;
          line-height: 1.35;
        }

        .panelHeadBadge {
          display: flex;
          align-items: center;
        }

        .statusPill {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: #f2f5fb;
          white-space: nowrap;
        }

        .statusPill--playing {
          border-color: rgba(46, 193, 234, 0.36);
          box-shadow: 0 0 12px rgba(46, 193, 234, 0.14);
        }

        .rrQueueStage {
          position: relative;
          overflow: hidden;
        }

        .rrQueueStage__search {
          margin-bottom: 8px;
        }

        .rrQueueStage__content {
          position: relative;
          min-height: 520px;
        }

        .rrQueueStage__modalOverlay {
          position: absolute;
          inset: 0;
          z-index: 40;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
        }

        .rrQueueStage__stack {
          display: grid;
          gap: 6px;
        }

        .rrRequestPanelWrap {
          position: relative;
          isolation: isolate;
        }

        .rrQueueStage__queueShell {
          min-height: 240px;
        }

        .rrBoothNotes {
          display: grid;
          gap: 8px;
        }

        .rrBoothNotes__textarea {
          min-height: 130px;
          padding-top: 10px;
          resize: vertical;
        }

        .rrBoothNotes__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .rrBoothNotes__saved {
          font-size: 11px;
          color: rgba(214, 226, 244, 0.72);
        }

        .gunmetalInput {
          width: 100%;
          min-height: 34px;
          padding: 0 11px;
          border-radius: 4px;
          border: 1px solid rgba(123, 156, 196, 0.32);
          background: linear-gradient(180deg, rgba(8, 16, 30, 0.94), rgba(7, 13, 24, 0.98));
          color: #f4f7fd;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 0 0 1px rgba(12, 26, 48, 0.34);
        }

        .gunmetalBtn {
          appearance: none;
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: pointer;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.4px;
          color: #f1f5fb;
          background: linear-gradient(180deg, #4a5467 0%, #2d3441 52%, #232935 100%);
        }

        .gunmetalBtn--primary {
          background: linear-gradient(180deg, #3d7ec0 0%, #245694 52%, #1c4479 100%);
        }

        .gunmetalBtn:hover:not(:disabled) {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }

        .gunmetalBtn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
          transform: none;
        }

        .gunmetalBtn--mini {
          min-height: 28px;
          padding: 0 9px;
          font-size: 10px;
          letter-spacing: 0.35px;
        }

        .gunmetalBtn--neutral,
        .gunmetalBtn--ghost {
          background: linear-gradient(180deg, #556177 0%, #343e4d 52%, #2a313d 100%);
        }

        .gunmetalBtn--remove,
        .gunmetalBtn--skip {
          background: linear-gradient(180deg, #bb6776 0%, #9b4755 52%, #813944 100%);
        }

        .gunmetalBtn--approve,
        .gunmetalBtn--play {
          background: linear-gradient(180deg, #3d7ec0 0%, #245694 52%, #1c4479 100%);
        }

        .boothPanelBody {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .boothSplit {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          min-width: 0;
        }

        .requestSection,
        .shoutoutSection {
          min-width: 0;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.012));
        }

        .listSectionTitle {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(238, 244, 255, 0.94);
        }

        .boothRequestActions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-start;
        }

        .shoutoutListScroller {
          display: grid;
          gap: 8px;
        }

        .shoutoutRow {
          display: grid;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.015));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }

        .shoutoutRow--moderation {
          border-color: rgba(255, 188, 74, 0.18);
          box-shadow: inset 2px 0 0 rgba(255, 188, 74, 0.82), inset 0 1px 0 rgba(255,255,255,0.03);
        }

        .shoutoutTop,
        .shoutoutIdentity {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
        }

        .shoutoutIdentity strong {
          font-size: 16px;
          line-height: 1.1;
          color: #fbfdff;
        }

        .shoutoutBadges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-end;
        }

        .shoutoutText {
          font-size: 14px;
          line-height: 1.45;
          color: rgba(242, 246, 255, 0.95);
          white-space: pre-wrap;
        }

        .shoutoutMetaRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .shoutoutMeta {
          font-size: 11px;
          font-weight: 800;
          color: rgba(207, 220, 240, 0.76);
        }

        .shoutoutMeta--warn {
          color: #ffd38b;
        }

        .shoutoutThumbButton {
          appearance: none;
          padding: 0;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          overflow: hidden;
          background: rgba(7, 13, 24, 0.9);
          cursor: pointer;
          width: min(100%, 220px);
          justify-self: start;
        }

        .shoutoutThumbImage {
          display: block;
          width: 100%;
          height: auto;
          max-height: 180px;
          object-fit: cover;
        }

        .shoutoutThumbLabel {
          display: block;
          padding: 7px 9px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: rgba(225, 235, 248, 0.86);
          background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
        }

        .shoutoutEditCard {
          display: grid;
          gap: 10px;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid rgba(104, 146, 196, 0.18);
          background: rgba(8, 16, 30, 0.52);
        }

        .shoutoutEditGrid {
          display: grid;
          gap: 10px;
        }

        .shoutoutField {
          display: grid;
          gap: 6px;
        }

        .shoutoutFieldLabel {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(223, 233, 248, 0.76);
        }

        .shoutoutEditInput {
          min-height: 36px;
        }

        .shoutoutEditTextarea {
          min-height: 96px;
          padding: 10px 11px;
          resize: vertical;
        }

        .rrBoothLightbox,
        .rrBoothRejectModal {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(3, 7, 14, 0.78);
          backdrop-filter: blur(8px);
        }

        .rrBoothLightboxInner,
        .rrBoothRejectModalCard {
          width: min(100%, 760px);
          display: grid;
          gap: 12px;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid rgba(104, 146, 196, 0.28);
          background: linear-gradient(180deg, rgba(16, 24, 38, 0.98), rgba(8, 13, 23, 0.98));
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.42);
        }

        .rrBoothLightboxClose {
          justify-self: end;
          appearance: none;
          border: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(180deg, #556177 0%, #343e4d 52%, #2a313d 100%);
          color: #f1f5fb;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 1000;
          cursor: pointer;
        }

        .rrBoothLightboxMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          color: rgba(223, 233, 248, 0.84);
          font-size: 12px;
        }

        .rrBoothLightboxImage {
          display: block;
          width: 100%;
          max-height: 72vh;
          object-fit: contain;
          border-radius: 8px;
          background: rgba(0,0,0,0.28);
        }

        .rrBoothLightboxCaption,
        .rrBoothRejectModalSub {
          font-size: 13px;
          line-height: 1.45;
          color: rgba(228, 236, 248, 0.82);
        }

        .rrBoothRejectModalTitle {
          font-size: 18px;
          font-weight: 1000;
          color: #f6f9ff;
        }

        .queueListShell {
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.015);
          overflow: hidden;
        }

        .queueListHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .queueListTitle {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .queueListSub,
        .queueListHelp {
          font-size: 12px;
          color: rgba(223, 233, 248, 0.72);
        }

        .queueListScroller {
          display: grid;
          gap: 0;
        }

        .emptyBox {
          padding: 14px 12px;
          font-size: 13px;
          color: rgba(224, 235, 248, 0.82);
        }

        .queueRow {
          display: grid;
          grid-template-columns: 20px 54px minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 10px;
          padding: 12px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0));
        }

        .queueRow:first-child {
          border-top: 0;
        }

        .queueRow--request {
          box-shadow: inset 3px 0 0 rgba(255, 116, 116, 0.9);
        }

        .queueRow--boosted {
          box-shadow: inset 3px 0 0 rgba(255, 171, 52, 0.95);
        }

        .queueDrag {
          width: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(185, 204, 228, 0.62);
          font-size: 16px;
          line-height: 1;
          cursor: grab;
          user-select: none;
        }

        .queueText {
          min-width: 0;
        }

        .queueTitleLine {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .queueNumber {
          font-size: 14px;
          font-weight: 1000;
          color: #f7fbff;
        }

        .queueTitle {
          font-size: 18px;
          font-weight: 1000;
          color: #fbfdff;
          font-style: italic;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .queueMeta {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(223, 233, 248, 0.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .queueMetaStrong {
          color: #f5f9ff;
        }

        .queueMetaMinor {
          color: rgba(183, 203, 229, 0.72);
        }

        .queueActions {
          display: flex;
          justify-content: flex-end;
        }

        .boothActionRail {
          display: inline-flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .statusPill--boost {
          border-color: rgba(255, 184, 66, 0.28);
          background: rgba(255, 184, 66, 0.12);
          color: #ffd98a;
        }

        .statusPill--alert,
        .statusPill--red {
          border-color: rgba(255, 118, 118, 0.28);
          background: rgba(255, 118, 118, 0.12);
          color: #ffb6b6;
        }

        .queueActionBtn {
          appearance: none;
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: pointer;
          min-height: 28px;
          padding: 0 13px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 0.2px;
          color: #f1f5fb;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .queueActionBtn--play {
          background: linear-gradient(180deg, #4a93df 0%, #2f6eb5 52%, #275a95 100%);
        }

        .queueActionBtn--reject {
          background: linear-gradient(180deg, #bb6776 0%, #9b4755 52%, #813944 100%);
        }

        @media (min-width: 1100px) {
          .boothSplit {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }
        }

        @media (max-width: 1480px) {
          .rrBooth__topbar {
            grid-template-columns: 1fr;
          }

          .rrTopbarRight {
            justify-content: flex-start;
          }

          .rrBooth__grid {
            grid-template-columns: 1.7fr 1fr 1fr;
          }
        }

        @media (max-width: 1200px) {
          .rrBooth__grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .queueRow {
            grid-template-columns: 20px 54px minmax(0, 1fr);
            align-items: start;
          }

          .queueActions,
          .queueVoteRail {
            grid-column: 2 / span 2;
          }
        }

        @media (max-width: 760px) {
          .rrTitle {
            font-size: 24px;
          }

          .queueRow {
            grid-template-columns: 1fr;
          }

          .queueDrag,
          .queueArtworkWrap {
            display: none;
          }

          .queueActions,
          .queueVoteRail {
            grid-column: auto;
          }

          .queueActions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
