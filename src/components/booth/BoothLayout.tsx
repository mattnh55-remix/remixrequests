"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import EnginePanel from "./EnginePanel";
import NowPlayingCard from "./NowPlayingCard";
import OnDeckCard from "./OnDeckCard";
import QueueList from "./QueueList";
import ShoutoutPanel from "./ShoutoutPanel";
import SearchAddPanel from "./SearchAddPanel";
import InterstitialPad from "./InterstitialPad";
import BoothInterstitialRuntime from "./BoothInterstitialRuntime";
import SessionTimerPanel from "./SessionTimerPanel";
import BoothNotesPanel from "./BoothNotesPanel";
import {
  enrichQueueWithRequests,
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
    return String((asset as InterstitialPadItem).filePath ?? (asset as InterstitialPadItem).fileUrl ?? "").trim();
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
    createNewSessionClock(),
  );
  const [tick, setTick] = useState(0);
  const [playingInterstitial, setPlayingInterstitial] = useState<ActiveInterstitialPlayback | null>(null);

  useEffect(() => {
    const clock = loadSessionClock(location);
    setSessionClock(clock);
  }, [location]);

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

    const queue = enrichQueueWithRequests(
      normalizeQueue(queuePayload),
      [...playNowRequests, ...upNextRequests]
    );

    const pendingShoutouts: ShoutoutItem[] = Array.isArray(shoutPayload?.pending)
      ? shoutPayload.pending
      : [];
    const approvedShoutouts: ShoutoutItem[] = Array.isArray(shoutPayload?.approved)
      ? shoutPayload.approved
      : [];

    let runtimePreview: RuntimePreview | null = null;

    if (queue.length > 0) {
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
      queue,
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

  const nowPlaying = useMemo(
    () => state.queue.find((item) => item.status === "PLAYING") || null,
    [state.queue]
  );

  const onDeck = useMemo(
    () =>
      state.queue.find((item) => item.status === "LOADED") ||
      state.queue.find((item) => item.status === "QUEUED") ||
      null,
    [state.queue]
  );

  const summary = useMemo(() => queueSummary(state.queue), [state.queue]);

  function getQueueItem(queueItemId: string) {
    return state.queue.find((item) => item.id === queueItemId) ?? null;
  }

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

  async function queueAction(
    endpoint: string,
    queueItemId: string,
    options?: { materializeAfter?: boolean }
  ) {
    const queueItem = getQueueItem(queueItemId);
    const itemIsInterstitial = isInterstitial(queueItem);

    const actionResult = await postJson(endpoint, { queueItemId });

    if (!actionResult.ok) {
      console.error("Queue action failed", {
        endpoint,
        queueItemId,
        response: actionResult.data,
      });
      await load();
      return actionResult.data;
    }

    if (endpoint === "/api/booth/queue/mark-playing" && itemIsInterstitial) {
      const playbackFilename = actionResult.data?.bridgePlaybackFilename ?? null;

      if (playbackFilename) {
        await triggerLocalBridgePlay(playbackFilename);
      } else {
        console.error("Interstitial play was marked PLAYING but no filename was returned.", {
          queueItemId,
          response: actionResult.data,
        });
      }
    }

    if (
      itemIsInterstitial &&
      (endpoint === "/api/booth/queue/hold" ||
        endpoint === "/api/booth/queue/skip" ||
        endpoint === "/api/booth/queue/mark-played")
    ) {
      await triggerLocalBridgeStop();
      setPlayingInterstitial(null);
    }

    if (options?.materializeAfter && !itemIsInterstitial) {
      await materializeRuntimeAndMaybePlay();
    }

    await load();
    return actionResult.data;
  }

  async function handlePlayInterstitialAsset(
    asset: InterstitialPadItem | DueInterstitialPromptOption,
    categoryOverride?: string,
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
      category: categoryOverride || "category" in asset ? String(categoryOverride || (asset as any).category || "MANUAL_ONLY") : "MANUAL_ONLY",
      startedAtIso: now.toISOString(),
      endsAtIso: ends.toISOString(),
    });

  }


  function resetSessionClock() {
    const next = createNewSessionClock();
    setSessionClock(next);
    saveSessionClock(location, next);
  }

  return (
    <div className="rrBooth rrBooth--compact">
      <div className="rrBooth__topbar">
        <div className="rrTopbarLeft">
          <div className="rrEyebrow">REMIXREQUESTS • LIVE BOOTH</div>
          <div className="rrTitle">PERFORMANCE CONSOLE</div>
          <div className="rrSub">
            Gunmetal booth surface for now playing, on deck, unified queue flow, runtime insertions,
            scheduled interstitial prompts, and shoutouts.
          </div>
        </div>

        <div className="rrTopbarCenter">
          <SessionTimerPanel
            startedAtIso={sessionClock.startedAtIso}
            cycleMinutes={sessionClock.cycleMinutes}
            onReset={resetSessionClock}
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
                {state.lastUpdated
                  ? new Date(state.lastUpdated).toLocaleTimeString()
                  : "—"}
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
              <div className="panelTitle">Playback / Queue</div>
              <div className="panelSub">
                Primary operator lane for now playing, on deck, live order, and timed DJ prompts.
              </div>
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
              <NowPlayingCard
                item={nowPlaying}
                mode={mode}
                onPause={(id) => queueAction("/api/booth/queue/hold", id)}
                onSkip={(id) =>
                  queueAction("/api/booth/queue/skip", id, {
                    materializeAfter: true,
                  })
                }
                onDone={(id) =>
                  queueAction("/api/booth/queue/mark-played", id, {
                    materializeAfter: true,
                  })
                }
              />

              <OnDeckCard
                item={onDeck}
                mode={mode}
                onLoad={(id) => queueAction("/api/booth/queue/mark-loaded", id)}
                onPlay={(id) => queueAction("/api/booth/queue/mark-playing", id)}
                onPause={(id) => queueAction("/api/booth/queue/hold", id)}
                onSkip={(id) =>
                  queueAction("/api/booth/queue/skip", id, {
                    materializeAfter: true,
                  })
                }
              />

              <div className="rrQueueStage__queueShell">
                <QueueList
                  items={state.queue.filter(
                    (item) =>
                      item.status !== "PLAYING" && item.id !== onDeck?.id && item.status !== "PLAYED"
                  )}
                  mode={mode}
                  onLoad={(id) => queueAction("/api/booth/queue/mark-loaded", id)}
                  onPlay={(id) => queueAction("/api/booth/queue/mark-playing", id)}
                  onPause={(id) => queueAction("/api/booth/queue/hold", id)}
                  onSkip={(id) =>
                    queueAction("/api/booth/queue/skip", id, {
                      materializeAfter: true,
                    })
                  }
                />
              </div>
            </div>

            <BoothInterstitialRuntime
              location={location}
              sessionStartedAt={sessionClock.startedAtIso}
            />
          </div>

        </section>

        <div className="boothStack">
          <EnginePanel
            preview={state.runtimePreview}
            mode={mode}
            onMaterialize={async () => {
              const result = await postJson(`/api/booth/runtime/materialize-next/${location}`, {});
              await load();
              return result.data;
            }}
          />

          <InterstitialPad
            location={location}
            activeAssetId={playingInterstitial?.assetId ?? null}
            activePlayback={playingInterstitial}
            optionHistoryMap={{}}
            onPlayAsset={async (asset) => {
              await handlePlayInterstitialAsset(asset, "category" in asset ? asset.category : "MANUAL_ONLY");
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
          --inset-border: rgba(255,255,255,0.1);
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
          background:
            linear-gradient(180deg, rgba(20, 27, 42, 0.96), rgba(9, 14, 24, 0.96));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            inset 0 -1px 0 rgba(0,0,0,0.34),
            0 12px 28px rgba(0,0,0,0.24);
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

        .rrSessionHero {
          width: 100%;
          max-width: 460px;
          border-radius: 10px;
          border: 1px solid rgba(92, 170, 255, 0.26);
          background:
            radial-gradient(circle at 50% 0%, rgba(53, 110, 196, 0.20), transparent 46%),
            linear-gradient(180deg, rgba(15, 25, 43, 0.98), rgba(10, 15, 25, 0.98));
          padding: 12px 14px 13px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 12px 26px rgba(0,0,0,0.2);
        }

        .rrSessionHero__eyebrow {
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 2px;
          color: rgba(173, 214, 255, 0.78);
          text-transform: uppercase;
          text-align: center;
        }

        .rrSessionHero__main {
          margin-top: 3px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }

        .rrSessionHero__time {
          font-size: 30px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -1px;
          color: #f8fbff;
        }

        .rrSessionHero__reset {
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: linear-gradient(180deg, rgba(52, 62, 82, 0.96), rgba(24, 30, 42, 0.98));
          color: #f1f5fb;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.6px;
          cursor: pointer;
        }

        .rrSessionHero__sub {
          margin-top: 5px;
          font-size: 11px;
          color: rgba(216, 228, 247, 0.74);
          text-align: center;
        }

        .rrSessionHero__bar {
          margin-top: 8px;
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.08);
        }

        .rrSessionHero__barFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, rgba(73, 186, 255, 0.92), rgba(142, 232, 255, 0.92));
          box-shadow: 0 0 16px rgba(67, 185, 255, 0.32);
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

        .boothStack--right > .boothPanel,
        .boothStack--right > .boothPanel--compact {
          min-height: 0;
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

        .rrQueueStage__queueShell {
          min-height: 240px;
        }

        .rrPromptApiHint {
          margin-top: 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 196, 76, 0.2);
          background: rgba(255, 196, 76, 0.05);
          padding: 8px 10px;
          font-size: 11px;
          color: rgba(255, 232, 180, 0.92);
        }

        .rrInterstitialPromptModal {
          position: absolute;
          left: 10px;
          right: 10px;
          top: 96px;
          z-index: 20;
          pointer-events: auto;
          animation: rrPromptDissolve 240ms ease-out;
        }

        .rrInterstitialPromptModal__pulse {
          position: absolute;
          inset: -10px;
          border-radius: 18px;
          background: radial-gradient(circle at center, rgba(73, 174, 255, 0.12), transparent 66%);
          filter: blur(20px);
          animation: rrPromptBreath 1.4s ease-in-out infinite;
        }

        .rrInterstitialPromptModal__card {
          position: relative;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid rgba(107, 187, 255, 0.28);
          background:
            linear-gradient(180deg, rgba(13, 23, 39, 0.96), rgba(8, 13, 23, 0.98)),
            radial-gradient(circle at top, rgba(79, 176, 255, 0.10), transparent 42%);
          padding: 14px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 24px 44px rgba(3, 8, 16, 0.54);
        }

        .rrInterstitialPromptModal__head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .rrInterstitialPromptModal__eyebrow {
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(173, 214, 255, 0.82);
        }

        .rrInterstitialPromptModal__title {
          margin-top: 4px;
          font-size: 24px;
          line-height: 1;
          font-weight: 1000;
          color: #f7fbff;
        }

        .rrInterstitialPromptModal__sub {
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.4;
          color: rgba(225, 236, 250, 0.76);
          max-width: 720px;
        }

        .rrInterstitialPromptModal__meta {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
        }

        .rrPromptChip {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(241, 246, 255, 0.88);
        }

        .rrPromptChip--gold {
          border-color: rgba(255, 214, 117, 0.36);
          color: #ffeab0;
        }

        .rrInterstitialPromptModal__grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .rrPromptTile {
          appearance: none;
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background:
            linear-gradient(180deg, rgba(26, 35, 49, 0.98), rgba(10, 15, 25, 0.98));
          padding: 0;
          color: inherit;
          cursor: pointer;
          text-align: left;
          transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
        }

        .rrPromptTile:hover {
          transform: translateY(-1px);
          border-color: rgba(94, 190, 255, 0.26);
          box-shadow: 0 12px 24px rgba(0,0,0,0.2);
        }

        .rrPromptTile--active {
          border-color: rgba(255, 214, 117, 0.4);
        }

        .rrPromptTile__media {
          position: relative;
          height: 118px;
          overflow: hidden;
          background:
            linear-gradient(135deg, rgba(64, 140, 202, 0.94), rgba(116, 214, 255, 0.78));
        }

        .rrPromptTile__gif {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .rrPromptTile__fallback {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          padding: 10px;
          text-align: center;
          font-size: 16px;
          line-height: 1.02;
          font-weight: 1000;
          color: #fff3a6;
          text-transform: uppercase;
        }

        .rrPromptTile__shine {
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 10%, rgba(255,255,255,0.08) 50%, transparent 90%);
          mix-blend-mode: screen;
        }

        .rrPromptTile__body {
          display: grid;
          gap: 5px;
          padding: 10px 11px 12px;
        }

        .rrPromptTile__topline {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
        }

        .rrPromptTile__label,
        .rrPromptTile__duration {
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1px;
          color: rgba(218, 230, 248, 0.74);
          text-transform: uppercase;
        }

        .rrPromptTile__title {
          font-size: 15px;
          line-height: 1.04;
          font-weight: 1000;
          color: #f8fbff;
        }

        .rrPromptTile__last {
          font-size: 11px;
          color: rgba(209, 222, 242, 0.74);
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
          background: linear-gradient(
            180deg,
            rgba(8, 16, 30, 0.94),
            rgba(7, 13, 24, 0.98)
          );
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

        .gunmetalBtn--mini {
          min-height: 28px;
        }

        .boothMiniBtn {
          appearance: none;
          border: 1px solid rgba(255,255,255,0.14);
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.4px;
          color: #f2f6fb;
          background: linear-gradient(180deg, rgba(58,66,82,0.96), rgba(24, 29, 39, 0.98));
        }

        .boothMiniBtn--danger {
          border-color: rgba(255, 127, 145, 0.2);
        }


        .heroCard {
          border-radius: 6px;
          border: 1px solid rgba(88, 119, 158, 0.28);
          background:
            linear-gradient(180deg, rgba(24, 31, 47, 0.92), rgba(11, 16, 27, 0.94));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.04),
            inset 0 -1px 0 rgba(0,0,0,0.3);
          overflow: hidden;
        }

        .heroCardHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
        }

        .heroCardTitle {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #f5f8fd;
        }

        .heroCardSub {
          margin-top: 2px;
          font-size: 12px;
          color: rgba(223, 233, 248, 0.72);
        }

        .heroMain {
          padding: 10px 12px;
        }

        .heroMain--console {
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr);
          gap: 12px;
          align-items: stretch;
        }

        .heroArtworkWrap {
          width: 84px;
        }

        .heroArtwork,
        .heroArtwork--placeholder {
          display: block;
          width: 84px;
          height: 84px;
          border-radius: 4px;
          object-fit: cover;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.1);
        }

        .heroArtwork--placeholder {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015)),
            linear-gradient(180deg, rgba(20,26,39,0.96), rgba(11,16,27,0.96));
        }

        .heroInfo {
          min-width: 0;
          display: grid;
          gap: 8px;
        }

        .heroInfoTop {
          display: flex;
          gap: 10px;
          justify-content: space-between;
          align-items: flex-start;
        }

        .heroInfoCopy {
          min-width: 0;
          flex: 1;
        }

        .heroTitleRow {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }

        .heroTitle {
          font-size: 18px;
          line-height: 1.05;
          font-weight: 1000;
          letter-spacing: -0.3px;
          color: #fbfdff;
        }

        .heroArtist {
          margin-top: 4px;
          font-size: 13px;
          color: rgba(225, 236, 250, 0.78);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .heroActions {
          display: flex;
          align-items: center;
        }

        .heroActions--topRight {
          justify-content: flex-end;
        }

        .heroTelemetry {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
        }

        .heroTelemetryCell {
          padding: 8px 10px;
          border-right: 1px solid rgba(255,255,255,0.07);
        }

        .heroTelemetryCell:last-child {
          border-right: 0;
        }

        .heroTelemetryCell span {
          display: block;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: rgba(198, 212, 233, 0.62);
          margin-bottom: 4px;
        }

        .heroTelemetryCell strong {
          font-size: 12px;
          font-weight: 1000;
          color: #f4f8ff;
        }

        .progressWrap {
          display: grid;
          gap: 5px;
        }

        .progressBar {
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.05);
        }

        .progressFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, rgba(70,174,255,0.95), rgba(139,232,255,0.95));
          box-shadow: 0 0 16px rgba(64, 184, 255, 0.3);
        }

        .progressMeta {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(198, 212, 233, 0.72);
        }

        .heroEmpty {
          padding: 14px 12px;
          font-size: 13px;
          color: rgba(224, 235, 248, 0.82);
        }

        .deckLine {
          display: grid;
          grid-template-columns: 56px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 10px 12px;
        }

        .deckArt,
        .deckArt--placeholder {
          width: 56px;
          height: 56px;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
        }

        .deckArt img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .deckText,
        .deckText--single {
          min-width: 0;
        }

        .deckSingleLine {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .deckTitle {
          font-size: 16px;
          font-weight: 1000;
          color: #fbfdff;
        }

        .deckDivider,
        .deckArtist,
        .deckRequestor {
          font-size: 13px;
          color: rgba(223, 233, 248, 0.76);
        }

        .deckActions {
          display: flex;
          justify-content: flex-end;
        }

        .queueListShell {
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.015);
          overflow: hidden;
        }

        .queueListHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
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
          grid-template-columns: 34px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
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

        .queueRow--interstitial {
          box-shadow: inset 3px 0 0 rgba(83, 191, 255, 0.92);
        }

        .queueIndex {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          font-size: 14px;
          font-weight: 1000;
          color: #f7fbff;
        }

        .queueText {
          min-width: 0;
        }

        .queueTitleLine,
        .queueTitleLine--interstitial {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .queueTitle,
        .queueTitle--interstitial {
          font-size: 15px;
          font-weight: 1000;
          color: #fbfdff;
          font-style: italic;
        }

        .queueMeta,
        .queueMeta--interstitial {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(223, 233, 248, 0.72);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .queueMetaStrong {
          color: #f5f9ff;
        }

        .queueMetaMinor,
        .interstitialContext {
          color: rgba(183, 203, 229, 0.72);
        }

        .interstitialEyebrow {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255, 190, 71, 0.24);
          background: rgba(255, 190, 71, 0.12);
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #ffd98b;
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

        .statusPill--gold {
          border-color: rgba(255, 198, 90, 0.24);
          background: rgba(255, 198, 90, 0.10);
          color: #ffd88a;
        }

        .statusPill--pink {
          border-color: rgba(238, 121, 255, 0.24);
          background: rgba(238, 121, 255, 0.10);
          color: #f0b2ff;
        }

        .statusPill--cyan {
          border-color: rgba(89, 203, 255, 0.28);
          background: rgba(89, 203, 255, 0.10);
          color: #aee9ff;
        }

        .gunmetalBtn--load,
        .gunmetalBtn--play,
        .gunmetalBtn--primary {
          background: linear-gradient(180deg, #4a93df 0%, #2f6eb5 52%, #275a95 100%);
        }

        .gunmetalBtn--pause,
        .gunmetalBtn--hold,
        .gunmetalBtn--neutral {
          background: linear-gradient(180deg, #c59a35 0%, #9f7821 52%, #7f5e17 100%);
        }

        .gunmetalBtn--skip,
        .gunmetalBtn--done,
        .gunmetalBtn--remove {
          background: linear-gradient(180deg, #bb6776 0%, #9b4755 52%, #813944 100%);
        }

        @keyframes rrPromptDissolve {
          0% { opacity: 0; transform: translateY(-8px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes rrPromptBreath {
          0%, 100% { opacity: 0.66; transform: scale(0.985); }
          50% { opacity: 1; transform: scale(1.015); }
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

          .rrInterstitialPromptModal__grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1200px) {
          .rrBooth__grid {
            grid-template-columns: 1fr;
          }

          .rrInterstitialPromptModal {
            position: relative;
            inset: auto;
            margin-top: 8px;
          }

          .rrInterstitialPromptModal__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .rrTitle {
            font-size: 24px;
          }

          .rrSessionHero__time {
            font-size: 24px;
          }

          .rrInterstitialPromptModal__head {
            flex-direction: column;
          }

          .rrInterstitialPromptModal__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}