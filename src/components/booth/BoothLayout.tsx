"use client";

import { useEffect, useMemo, useState } from "react";
import EnginePanel from "./EnginePanel";
import NowPlayingCard from "./NowPlayingCard";
import OnDeckCard from "./OnDeckCard";
import QueueList from "./QueueList";
import ShoutoutPanel from "./ShoutoutPanel";
import SearchAddPanel from "./SearchAddPanel";
import {
  enrichQueueWithRequests,
  isInterstitial,
  normalizeQueue,
  queueSummary,
  safeJson,
} from "./booth-utils";
import type {
  BoothDataState,
  BoothMode,
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
  }

  if (options?.materializeAfter && !itemIsInterstitial) {
    await materializeRuntimeAndMaybePlay();
  }

  await load();
  return actionResult.data;
}

  return (
    <div className="rrBooth rrBooth--compact">
      <div className="rrBooth__topbar">
        <div>
          <div className="rrEyebrow">REMIXREQUESTS • LIVE BOOTH</div>
          <div className="rrTitle">PERFORMANCE CONSOLE</div>
          <div className="rrSub">
            Gunmetal booth surface for now playing, on deck, unified queue flow, runtime insertions,
            and shoutouts.
          </div>
        </div>

        <div className="rrTopRight">
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
          </div>
        </div>
      </div>

      <div className="rrBooth__grid">
        <section className="boothPanel boothPanel--primary">
          <div className="panelHead panelHead--tight">
            <div>
              <div className="panelTitle">Playback / Queue</div>
              <div className="panelSub">
                Primary operator lane for now playing, on deck, and live order.
              </div>
            </div>
            <div className="panelHeadBadge">
              <span className="statusPill statusPill--playing">LIVE</span>
            </div>
          </div>

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
        </section>

        <div className="boothStack">
          <SearchAddPanel location={location} onAdded={load} />
<EnginePanel
  preview={state.runtimePreview}
  mode={mode}
  onMaterialize={async () => {
    const result = await postJson(`/api/booth/runtime/materialize-next/${location}`, {});
    await load();
    return result.data;
  }}
/>
        </div>

        <ShoutoutPanel
          pending={state.pendingShoutouts}
          approved={state.approvedShoutouts}
          mode={mode}
        />
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
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 4px;
          border: 1px solid rgba(84, 122, 162, 0.32);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)),
            linear-gradient(90deg, rgba(24,36,52,0.9), rgba(9,18,31,0.86));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.35),
            0 10px 24px rgba(0,0,0,0.28);
          margin-bottom: 8px;
        }
        .rrEyebrow {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2.2px;
          opacity: 0.72;
        }
        .rrTitle {
          margin: 6px 0 5px;
          font-size: 30px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -1px;
        }
        .rrSub {
          color: rgba(235, 241, 255, 0.7);
          font-size: 12px;
          line-height: 1.4;
        }
        .rrTopRight {
          display: grid;
          gap: 5px;
          justify-items: end;
        }
        .statBoxes {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .statBox {
          min-width: 112px;
          padding: 10px 12px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.1);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015)),
            linear-gradient(180deg, rgba(19,24,37,0.92), rgba(11,16,27,0.92));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.28);
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
        .rrBooth__grid {
          display: grid;
          grid-template-columns: minmax(0, 1.85fr) minmax(340px, 0.98fr) minmax(280px, 0.62fr);
          gap: 5px;
          align-items: start;
        }
        .boothStack {
          display: grid;
          gap: 5px;
          align-content: start;
        }
        .boothPanel {
          min-width: 0;
          border-radius: 5px;
          border: 1px solid rgba(77, 107, 143, 0.28);
          background:
            linear-gradient(180deg, rgba(21,27,41,0.95), rgba(8,13,23,0.94));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            inset 0 -1px 0 rgba(0,0,0,0.35),
            0 12px 26px rgba(0,0,0,0.24);
          padding: 7px;
        }
        .boothPanel--primary {
          display: grid;
          gap: 5px;
        }
        .panelHead,
        .boothPanelHeader {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: flex-start;
          margin-bottom: 4px;
        }
        .panelHead--tight,
        .boothPanelHeader {
          margin-bottom: 4px;
        }
        .panelTitle,
        .boothPanelTitle {
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.4px;
        }
        .panelSub,
        .boothPanelSub {
          margin-top: 2px;
          color: rgba(235,241,255,0.72);
          font-size: 12px;
          line-height: 1.35;
        }
        .heroCard {
          border-radius: 3px;
          border: 1px solid rgba(255,255,255,0.085);
          background:
            linear-gradient(90deg, rgba(255,255,255,0.028), rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.02)),
            linear-gradient(180deg, rgba(28,36,53,0.96), rgba(10,17,29,0.96));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.32);
          padding: 7px;
        }
        .heroCardHeader {
          display: flex;
          justify-content: space-between;
          gap: 5px;
          align-items: flex-start;
          margin-bottom: 5px;
        }
        .heroCardTitle {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.7px;
          font-weight: 1000;
          opacity: 0.9;
        }
        .heroCardSub {
          font-size: 12px;
          color: rgba(235,241,255,0.72);
          margin-top: 2px;
        }
        .heroEmpty,
        .emptyBox,
        .insertBlockBody {
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 3px;
          padding: 12px;
          color: rgba(235,241,255,0.7);
          background: rgba(255,255,255,0.015);
        }
        .heroMain {
          display: grid;
          grid-template-columns: 68px minmax(0, 1fr);
          gap: 5px;
          align-items: start;
        }
        .heroArtwork,
        .deckArt,
        .queueMedia img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 3px;
        }
        .heroArtworkWrap {
          width: 68px;
          height: 68px;
        }
        .heroArtwork--placeholder,
        .deckArt--placeholder,
        .queueMediaPlaceholder {
          width: 100%;
          height: 100%;
          border-radius: 3px;
          background: linear-gradient(135deg, rgba(59,139,177,0.34), rgba(111,56,126,0.3));
          border: 1px solid rgba(255,255,255,0.12);
        }
        .heroInfo {
          display: grid;
          gap: 5px;
          min-width: 0;
        }
        .heroTitleRow {
          display: flex;
          gap: 5px;
          align-items: center;
          flex-wrap: wrap;
        }
        .heroTitle {
          font-size: 18px;
          font-weight: 1000;
          line-height: 1.05;
          letter-spacing: -0.4px;
        }
        .heroArtist {
          font-size: 12px;
          line-height: 1.35;
          color: rgba(235,241,255,0.78);
        }
        .heroTelemetry {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 3px;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
        }
        .heroTelemetryCell {
          padding: 6px 8px 7px;
          border-right: 1px solid rgba(255,255,255,0.08);
          min-width: 0;
        }
        .heroTelemetryCell:last-child {
          border-right: none;
        }
        .heroTelemetryCell span {
          display: block;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1.6px;
          opacity: 0.68;
          margin-bottom: 4px;
        }
        .heroTelemetryCell strong {
          display: block;
          font-size: 12px;
          font-weight: 1000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .progressWrap {
          display: grid;
          gap: 5px;
        }
        .progressBar {
          height: 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.45);
          overflow: hidden;
        }
        .progressFill {
          height: 100%;
          background: linear-gradient(90deg, #2790c8 0%, #36d2ff 52%, #53e3ff 100%);
          box-shadow: 0 0 16px rgba(43, 208, 255, 0.4);
        }
        .progressMeta {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.3px;
          text-transform: uppercase;
          color: rgba(235,241,255,0.76);
        }
        .deckLine {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
        }
        .deckArt {
          width: 44px;
          height: 44px;
        }
        .deckTitle {
          font-size: 13px;
          font-weight: 1000;
          line-height: 1.05;
        }
        .deckArtist {
          margin-top: 0;
          color: rgba(235,241,255,0.76);
          font-size: 12px;
        }
        .statusPill {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 0.9px;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
          color: #f2f5fb;
          white-space: nowrap;
        }
        .statusPill--playing,
        .statusPill--cyan {
          border-color: rgba(46, 193, 234, 0.36);
          box-shadow: 0 0 12px rgba(46,193,234,0.14);
        }
        .statusPill--loaded,
        .statusPill--pink {
          border-color: rgba(212, 104, 255, 0.28);
          box-shadow: 0 0 12px rgba(212,104,255,0.1);
        }
        .statusPill--held,
        .statusPill--gold,
        .statusPill--warn {
          border-color: rgba(230, 170, 52, 0.34);
        }
        .statusPill--skip {
          border-color: rgba(219, 95, 95, 0.36);
        }
        .statusPill--queued,
        .statusPill--default,
        .statusPill--muted {
          border-color: rgba(255,255,255,0.16);
          opacity: 0.88;
        }
        .statusPill--alert {
          border-color: rgba(255,92,92,0.62);
          background: linear-gradient(180deg, rgba(128,24,24,0.78), rgba(68,9,9,0.88));
          box-shadow: 0 0 14px rgba(255,70,70,0.2);
        }
        .statusPill--boost {
          border-color: rgba(255,92,92,0.72);
          background: linear-gradient(180deg, rgba(164,18,18,0.82), rgba(86,8,8,0.92));
          box-shadow: 0 0 16px rgba(255,60,60,0.26);
        }
        .queueMetaMinor {
          opacity: 0.7;
        }

        .queueRow--interstitial {
          position: relative;
          border-color: rgba(255, 191, 89, 0.24);
          background:
            linear-gradient(90deg, rgba(255, 185, 68, 0.13) 0%, rgba(255, 185, 68, 0.05) 14%, rgba(255,255,255,0.02) 14.1%, rgba(255,255,255,0.015) 100%),
            linear-gradient(180deg, rgba(44, 38, 29, 0.96), rgba(18, 19, 26, 0.96));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.04),
            inset 0 -1px 0 rgba(0,0,0,0.32),
            0 0 0 1px rgba(255,185,68,0.04);
        }
        .queueRow--interstitial::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          border-radius: 5px 0 0 5px;
          background: linear-gradient(180deg, rgba(255, 210, 122, 0.95), rgba(216, 132, 38, 0.95));
          box-shadow: 0 0 10px rgba(255, 187, 77, 0.32);
        }
        .queueIndex--interstitial {
          border-color: rgba(255, 214, 139, 0.18);
          background: linear-gradient(180deg, rgba(78, 62, 28, 0.52), rgba(39, 28, 13, 0.55));
          color: #ffe2ad;
        }
        .queueText--interstitial {
          display: grid;
          gap: 3px;
        }
        .queueTitleLine--interstitial {
          gap: 6px;
          align-items: center;
        }
        .interstitialEyebrow {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          border-radius: 999px;
          border: 1px solid rgba(255, 214, 139, 0.22);
          background: rgba(255, 194, 94, 0.08);
          color: rgba(255, 224, 168, 0.86);
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1.45px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .queueTitle--interstitial {
          font-style: italic;
          letter-spacing: 0.1px;
          color: #fff4de;
          text-shadow: 0 1px 0 rgba(0,0,0,0.28);
        }
        .queueMeta--interstitial {
          color: rgba(255, 233, 196, 0.74);
        }
        .interstitialContext {
          color: rgba(255, 241, 214, 0.94);
        }
        .queueMetaStrong {
          color: rgba(255,255,255,0.9);
        }
        .queueRow--request {
          border-color: rgba(255,92,92,0.18);
        }
        .queueRow--boosted {
          border-color: rgba(255,92,92,0.28);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,92,92,0.06);
        }
        .gunmetalBtn {
          appearance: none;
          border: 1px solid rgba(255,255,255,0.12);
          cursor: pointer;
          min-height: 24px;
          padding: 0 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 0.4px;
          color: #f1f5fb;
          text-transform: none;
          background: linear-gradient(180deg, #4a5467 0%, #2d3441 52%, #232935 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -1px 0 rgba(0,0,0,0.46),
            0 1px 2px rgba(0,0,0,0.32);
        }
        .gunmetalInput {
          width: 100%;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 4px;
          border: 1px solid rgba(123, 156, 196, 0.32);
          background: linear-gradient(180deg, rgba(8, 16, 30, 0.94), rgba(7, 13, 24, 0.98));
          color: #f4f7fd;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(12, 26, 48, 0.34);
        }
        .gunmetalInput:focus {
          border-color: rgba(111, 167, 255, 0.54);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(71, 118, 210, 0.46), 0 0 14px rgba(71, 118, 210, 0.16);
        }
        .gunmetalBtn:hover {
          filter: brightness(1.06);
        }
        .gunmetalBtn:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }
        .gunmetalBtn--primary,
        .gunmetalBtn--load,
        .gunmetalBtn--play {
          background: linear-gradient(180deg, #3d7ec0 0%, #245694 52%, #1c4479 100%);
        }
        .gunmetalBtn--pause,
        .gunmetalBtn--hold {
          background: linear-gradient(180deg, #8a6a1d 0%, #735515 52%, #5a430f 100%);
        }
        .gunmetalBtn--skip,
        .gunmetalBtn--remove {
          background: linear-gradient(180deg, #8d4450 0%, #713341 52%, #5b2834 100%);
        }
        .gunmetalBtn--done {
          background: linear-gradient(180deg, #1d8095 0%, #166779 52%, #105766 100%);
        }
        .gunmetalBtn--neutral {
          background: linear-gradient(180deg, #4a5467 0%, #303847 52%, #252c38 100%);
        }
        .gunmetalBtn--wide {
          width: 100%;
        }
        .boothActionRail {
          display: flex;
          gap: 3px;
          flex-wrap: wrap;
        }
        .queueListShell {
          display: grid;
          gap: 5px;
        }
        .queueListHeader {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 5px;
        }
        .queueListTitle,
        .listSectionTitle,
        .insertBlockTitle,
        .engineLabel {
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1.7px;
          text-transform: uppercase;
        }
        .queueListSub,
        .queueListHelp {
          color: rgba(235,241,255,0.7);
          font-size: 12px;
          line-height: 1.35;
        }
        .queueListScroller,
        .requestListScroller,
        .shoutoutListScroller {
          display: grid;
          gap: 5px;
          max-height: 540px;
          overflow: auto;
          padding-right: 1px;
        }
        .queueRow,
        .requestRow,
        .shoutoutRow {
          display: grid;
          align-items: center;
          gap: 5px;
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.085);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)),
            linear-gradient(180deg, rgba(25,31,44,0.92), rgba(14,19,31,0.92));
          padding: 5px 7px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.25);
        }
        .queueRow {
          grid-template-columns: 22px minmax(0, 1fr) auto;
        }
        .requestRow {
          grid-template-columns: 24px minmax(0, 1fr) auto;
        }
        .queueIndex,
        .requestIndex {
          font-size: 13px;
          font-weight: 1000;
          line-height: 1;
          color: rgba(235,241,255,0.92);
          width: 22px;
          height: 22px;
          border-radius: 4px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
        }
        .queueText,
        .requestText {
          min-width: 0;
        }
        .queueTitleLine,
        .requestTitleLine {
          display: flex;
          gap: 5px;
          align-items: center;
          flex-wrap: wrap;
          min-width: 0;
        }
        .queueTitle,
        .requestTitleLine strong,
        .requestTitle {
          font-size: 13px;
          font-weight: 1000;
          line-height: 1.05;
        }
        .queueMeta,
        .requestMeta,
        .shoutoutMeta {
          margin-top: 1px;
          color: rgba(235,241,255,0.66);
          font-size: 11px;
          line-height: 1.3;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .requestActions,
        .queueActions,
        .boothRequestActions {
          display: flex;
          gap: 3px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .engineBox,
        .insertBlock,
        .requestSection,
        .shoutoutSection {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 5px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)),
            linear-gradient(180deg, rgba(18,24,38,0.94), rgba(10,15,26,0.94));
          padding: 7px;
        }
        .engineAction {
          font-size: 16px;
          line-height: 1;
          font-weight: 1000;
          margin: 6px 0 8px;
        }
        .engineGrid {
          display: grid;
          gap: 0;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 3px;
          overflow: hidden;
        }
        .engineRow {
          display: grid;
          grid-template-columns: 120px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          padding: 7px 8px;
          border-top: 1px solid rgba(255,255,255,0.07);
          font-size: 12px;
        }
        .engineRow:first-child {
          border-top: none;
        }
        .engineRow span {
          color: rgba(235,241,255,0.64);
          text-transform: uppercase;
          letter-spacing: 0.9px;
          font-weight: 800;
        }
        .engineRow strong {
          text-align: right;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .shoutoutRow {
          align-items: start;
          gap: 5px;
        }
        .shoutoutTop {
          display: flex;
          justify-content: space-between;
          gap: 5px;
          align-items: flex-start;
        }
        .shoutoutBadges {
          display: flex;
          gap: 3px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .shoutoutText {
          font-size: 12px;
          line-height: 1.35;
          color: rgba(243,246,255,0.9);
        }
        .boothSplit {
          display: grid;
          gap: 5px;
        }
        .heroCard--live {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.32), 0 0 0 1px rgba(40,170,212,0.12);
        }
        .heroCard--deck {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.32), 0 0 0 1px rgba(203,152,51,0.10);
        }
        .heroInfoTop {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          align-items: start;
        }
        .heroActions,
        .deckActions {
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
        }
        .heroActions--topRight .boothActionRail,
        .deckActions .boothActionRail {
          justify-content: flex-end;
        }
        .deckLine--single {
          grid-template-columns: 44px minmax(0, 1fr) auto;
        }
        .deckText--single {
          min-width: 0;
        }
        .deckSingleLine {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
        }
        .deckSingleLine > * {
          flex: 0 0 auto;
        }
        .deckTitle {
          flex: 0 1 auto;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .deckArtist--inline,
        .deckRequestor {
          flex: 0 1 auto;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .deckDivider {
          opacity: 0.55;
        }
        .queueRow--dense {
          grid-template-columns: 22px minmax(0, 1fr) auto;
        }
        .gunmetalBtn--mini {
          min-height: 24px;
          padding: 0 8px;
          font-size: 10px;
        }
        .gunmetalBtn--wide {
          width: 100%;
          min-height: 28px;
        }
        .searchAddPanel {
          margin-top: 6px;
        }
        .searchAddInput {
          width: 100%;
        }
        .searchAddHint {
          margin-top: 8px;
          padding: 7px 10px;
          border: 1px solid rgba(120, 180, 255, 0.16);
          border-radius: 4px;
          background: linear-gradient(180deg, rgba(16, 36, 64, 0.42), rgba(8, 18, 34, 0.48));
          color: rgba(220, 232, 255, 0.76);
          font-size: 10px;
          line-height: 1.35;
          font-weight: 700;
        }
        .searchAddState,
        .searchAddError {
          margin-top: 8px;
          padding: 9px 10px;
          border-radius: 4px;
          font-size: 11px;
          line-height: 1.35;
        }
        .searchAddState {
          border: 1px solid rgba(120, 180, 255, 0.14);
          background: rgba(10, 19, 33, 0.62);
          color: rgba(220, 232, 255, 0.78);
        }
        .searchAddError {
          border: 1px solid rgba(255, 120, 120, 0.18);
          background: rgba(60, 16, 22, 0.45);
          color: #ffb0b0;
        }
        .searchAddResults {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          max-height: 360px;
          overflow-y: auto;
          padding-right: 1px;
        }
        .searchAddResult {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
          padding: 7px 8px;
          border-radius: 5px;
          border: 1px solid rgba(120, 180, 255, 0.12);
          background:
            linear-gradient(180deg, rgba(20, 30, 52, 0.88), rgba(10, 16, 30, 0.96));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.03),
            0 0 0 1px rgba(20, 34, 60, 0.28);
        }
        .searchAddResult--active {
          border-color: rgba(115, 174, 255, 0.42);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 0 0 1px rgba(70, 120, 220, 0.4),
            0 0 14px rgba(70, 120, 220, 0.14);
          background:
            linear-gradient(180deg, rgba(28, 43, 76, 0.9), rgba(12, 20, 38, 1));
        }
        .searchAddMain {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          min-width: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }
        .searchAddMeta {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .searchAddTitle {
          color: #f7f8fc;
          font-size: 12px;
          font-weight: 1000;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .searchAddArtist {
          margin-top: 2px;
          color: rgba(210, 222, 244, 0.72);
          font-size: 11px;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .searchAddHotkey {
          flex: 0 0 auto;
          padding: 3px 7px;
          border-radius: 999px;
          border: 1px solid rgba(255, 210, 120, 0.32);
          background: rgba(110, 82, 18, 0.32);
          color: #ffd97b;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 0.1em;
        }
        .searchAddActions {
          display: flex;
          gap: 5px;
          align-items: center;
        }
        .searchAddMiniBtn {
          min-width: 52px;
          min-height: 22px;
          padding-inline: 8px;
          font-size: 10px;
        }
        @media (max-width: 1480px) {
          .rrBooth__grid {
            grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.96fr) minmax(270px, 0.62fr);
          }
        }
        @media (max-width: 1280px) {
          .rrBooth__grid {
            grid-template-columns: 1fr;
          }
          .rrBooth__topbar {
            grid-template-columns: 1fr;
          }
          .rrTopRight {
            justify-items: start;
          }
          .statBoxes {
            justify-content: flex-start;
          }
        }
        @media (max-width: 1100px) {
          .searchAddResult {
            grid-template-columns: 1fr;
          }
          .searchAddActions {
            justify-content: flex-start;
            flex-wrap: wrap;
          }
        }
        @media (max-width: 760px) {
          .heroMain,
          .deckLine,
          .requestRow,
          .engineRow {
            grid-template-columns: 1fr;
          }
          .queueRow {
            grid-template-columns: 1fr;
          }
          .heroInfoTop {
            grid-template-columns: 1fr;
          }
          .heroTelemetry {
            grid-template-columns: 1fr 1fr;
          }
          .heroTelemetryCell {
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .heroTelemetryCell:nth-last-child(-n+2) {
            border-bottom: none;
          }
          .engineRow strong {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}