"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  isInterstitial,
  normalizeQueue,
  queueSummary,
  safeJson,
} from "./booth-utils";
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

  const [sessionClock, setSessionClock] = useState<BoothSessionClock>(() =>
    createNewSessionClock()
  );
  const [tick, setTick] = useState(0);
  const [promptResolving, setPromptResolving] = useState(false);
  const [playingInterstitial, setPlayingInterstitial] =
    useState<ActiveInterstitialPlayback | null>(null);

  useEffect(() => {
    const clock = loadSessionClock(location);
    setSessionClock(clock);
  }, [location]);

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

    const pendingDecisionQueue = [...playNowRequests, ...upNextRequests];

    let runtimePreview: RuntimePreview | null = null;

    if (pendingDecisionQueue.length > 0) {
      const target = pendingDecisionQueue[0];
      runtimePreview = {
        action: "PLAY_QUEUE_ITEM",
        reason: "DJ_DECISION_QUEUE",
        targetQueueItemId: target?.id ?? null,
        targetTitle: target?.title ?? null,
        targetArtist: target?.artist ?? null,
        clusterId: null,
      };
    } else if (queue.length > 0) {
      const target =
        queue.find((item) => item.status === "LOADED") ||
        queue.find((item) => item.status === "QUEUED") ||
        null;

      runtimePreview = {
        action: target ? "PLAY_QUEUE_ITEM" : "NO_ACTION",
        reason: target ? "DIRECT_PLAY" : "NO_PLAYABLE_QUEUE_ITEM",
        targetQueueItemId: target?.id ?? null,
        targetTitle: target?.title ?? null,
        targetArtist: target?.artist ?? null,
        clusterId: target?.clusterId ?? null,
      };
    } else {
      runtimePreview = { action: "NO_ACTION", reason: "NO_PLAYABLE_QUEUE_ITEM" };
    }

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
    void load();
    const id = window.setInterval(load, 3000);
    return () => window.clearInterval(id);
  }, [location]);

  const summary = useMemo(
    () =>
      queueSummary(
        state.queue.map((item: any) => ({
          ...item,
          sourceType: "REQUEST",
        }))
      ),
    [state.queue]
  );

  useEffect(() => {
    const started = new Date(sessionClock.startedAtIso).getTime();
    const elapsedMin = Math.floor((Date.now() - started) / 60000);
    const remaining = sessionClock.cycleMinutes - elapsedMin;

    let level: "normal" | "warn5" | "warn2" | "hot1" = "normal";

    if (!cycleSuppressed) {
      if (remaining <= 1) level = "hot1";
      else if (remaining <= 2) level = "warn2";
      else if (remaining <= 5) level = "warn5";
    }

    setWarningLevel(level);
  }, [tick, sessionClock, cycleSuppressed]);

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

  function resetSessionClock() {
    const next = createNewSessionClock();
    setSessionClock(next);
    saveSessionClock(location, next);

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
          <div className="rrEyebrow">REMIXREQUESTS • LIVE BOOTH</div>
          <div className="rrTitle">PERFORMANCE CONSOLE</div>
          <div className="rrSub">
            Gunmetal booth surface for live request decisions, runtime insertions, scheduled
            interstitial prompts, and shoutouts.
          </div>
        </div>

        <div className="rrTopbarCenter">
          <SessionTimerPanel
            startedAtIso={sessionClock.startedAtIso}
            cycleMinutes={sessionClock.cycleMinutes}
            onReset={resetSessionClock}
            warningLevel={promptLatched ? latchedWarning : warningLevel}
            promptLatched={promptLatched}
          />
        </div>

        <div className="rrTopbarRight">
          <div className="statBoxes">
            <div className="statBox">
              <span>QUEUE</span>
              <strong>{summary.total}</strong>
            </div>

            <div className="statBox">
              <span>SONGS</span>
              <strong>{summary.songs}</strong>
            </div>

            <div className="statBox">
              <span>INTERSTITIALS</span>
              <strong>{summary.interstitials}</strong>
            </div>

            <div className="statBox">
              <span>UPDATED</span>
              <strong>
                {state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : "—"}
              </strong>
            </div>

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
              <div className="panelSub">Pending request approval above, live on-deck queue below.</div>
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
              <div className="rrRequestPanelWrap">
                <RequestPanel
                  playNow={state.playNowRequests}
                  upNext={state.upNextRequests}
                  mode={mode}
                  onAccept={acceptRequest}
                  onReject={rejectRequest}
                />

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
                        throw new Error("Skip failed");
                      }

                      handlePromptResolved();
                    } finally {
                      setPromptResolving(false);
                    }
                  }}
                />
              </div>

              <div className="rrQueueStage__queueShell">
                <QueueList
                  items={state.queue as any}
                  mode={mode}
                  onPlayed={markRequestPlayed}
                  onReject={rejectRequest}
                />
              </div>
            </div>

            <BoothInterstitialRuntime
              location={location}
              sessionStartedAt={sessionClock.startedAtIso}
              onPromptOpen={handlePromptOpen}
              onPromptResolved={handlePromptResolved}
            />
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
        /* =========================
           SESSION TIMER (RESTORED HERO)
           ========================= */

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

        .rrQueueStage__stack {
          display: grid;
          gap: 6px;
        }

        .rrRequestPanelWrap {
          position: relative;
          isolation: isolate;
          animation: rrPromptWrapSettle 220ms ease-out;
        }

        .rrRequestPanelWrap::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 8px;
          pointer-events: none;
          opacity: ${0};
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
          grid-template-columns: 24px minmax(0, 1fr) auto;
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
          font-size: 22px;
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

        @keyframes rrPromptWrapSettle {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(0);
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

        @media (max-width: 760px) {
          .rrTitle {
            font-size: 24px;
          }

          .queueRow {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .queueDrag {
            display: none;
          }

          .queueActions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
