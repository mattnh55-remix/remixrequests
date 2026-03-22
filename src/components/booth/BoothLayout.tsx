"use client";

import { useEffect, useMemo, useState } from "react";
import EnginePanel from "./EnginePanel";
import NowPlayingCard from "./NowPlayingCard";
import OnDeckCard from "./OnDeckCard";
import QueueList from "./QueueList";
import RequestPanel from "./RequestPanel";
import ShoutoutPanel from "./ShoutoutPanel";
import { normalizeQueue, queueSummary, safeJson } from "./booth-utils";
import type {
  BoothDataState,
  BoothMode,
  RequestItem,
  RuntimePreview,
  ShoutoutItem,
} from "./types";

async function postJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return { ok: res.ok, data: await safeJson(res) };
}

export default function BoothLayout({ location }: { location: string }) {
  const [mode, setMode] = useState<BoothMode>("performance");
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
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("rr-booth-mode");
    if (stored === "performance" || stored === "visual") {
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("rr-booth-mode", mode);
  }, [mode]);

  async function load() {
    const [queueRes, requestRes, shoutRes] = await Promise.all([
      fetch(`/api/booth/queue/${location}`, { cache: "no-store" }),
      fetch(`/api/admin/queue/${location}`, { cache: "no-store" }),
      fetch(`/api/admin/shoutouts/${location}`, { cache: "no-store" }),
    ]);

    const queuePayload = queueRes.ok ? await safeJson(queueRes) : null;
    const requestPayload = requestRes.ok ? await safeJson(requestRes) : null;
    const shoutPayload = shoutRes.ok ? await safeJson(shoutRes) : null;

    const queue = normalizeQueue(queuePayload);
    const playNowRequests: RequestItem[] = Array.isArray(requestPayload?.playNow)
      ? requestPayload.playNow
      : [];
    const upNextRequests: RequestItem[] = Array.isArray(requestPayload?.upNext)
      ? requestPayload.upNext
      : [];
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
      runtimePreview = {
        action: "NO_ACTION",
        reason: "NO_PLAYABLE_QUEUE_ITEM",
      };
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
      errors: [],
    }));
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, 3000);

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

  async function runQueueAction(endpoint: string, queueItemId: string, action: string) {
    setBusyKey(`${queueItemId}:${action}`);
    try {
      await postJson(endpoint, { queueItemId });
      await load();
    } finally {
      setBusyKey(null);
    }
  }

  async function runRequestAction(endpoint: string, requestId: string, action: string) {
    setBusyKey(`${requestId}:${action}`);
    try {
      await postJson(endpoint, { requestId });
      await load();
    } finally {
      setBusyKey(null);
    }
  }

  async function runMaterialize() {
    setBusyKey("runtime:materialize");
    try {
      await postJson(`/api/booth/runtime/materialize-next/${location}`, {});
      await load();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className={`rrBooth rrBooth--gunmetal ${mode === "performance" ? "rrBooth--compact" : ""}`}>
      <div className="rrBooth__topbar">
        <div className="rrBrandBlock">
          <div className="rrEyebrow">REMIXREQUESTS • LIVE BOOTH</div>
          <div className="rrTitle">PERFORMANCE CONSOLE</div>
          <div className="rrSub">
            Gunmetal booth surface for now playing, on deck, queue flow, runtime insertions,
            requests, and shoutouts.
          </div>
        </div>

        <div className="rrTopRight">
          <div className="modeToggle">
            <button
              type="button"
              className={`gunmetalBtn ${mode === "visual" ? "gunmetalBtn--olive" : "gunmetalBtn--neutral"}`}
              onClick={() => setMode("visual")}
            >
              Visual Mode
            </button>
            <button
              type="button"
              className={`gunmetalBtn ${mode === "performance" ? "gunmetalBtn--primary" : "gunmetalBtn--neutral"}`}
              onClick={() => setMode("performance")}
            >
              Performance Mode
            </button>
          </div>

          <div className="statBoxes">
            <div className="statBox">
              <span>Queue</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="statBox">
              <span>Songs</span>
              <strong>{summary.songs}</strong>
            </div>
            <div className="statBox">
              <span>Interstitials</span>
              <strong>{summary.interstitials}</strong>
            </div>
            <div className="statBox">
              <span>Updated</span>
              <strong>
                {state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : "—"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="rrBooth__grid">
        <section className="boothPanel boothPanel--primary boothPanel--queue">
          <div className="panelHead">
            <div>
              <div className="panelTitle">Playback / Queue</div>
              <div className="panelSub">Primary operator lane for now playing, on deck, and live order.</div>
            </div>
            <div className="panelMetaBadge">{state.loading ? "Refreshing" : "Live"}</div>
          </div>

          <NowPlayingCard
            item={nowPlaying}
            mode={mode}
            busyKey={busyKey}
            onPause={(id) => runQueueAction("/api/booth/queue/hold", id, "pause")}
            onSkip={(id) => runQueueAction("/api/booth/queue/skip", id, "skip")}
            onDone={(id) => runQueueAction("/api/booth/queue/mark-played", id, "done")}
          />

          <OnDeckCard
            item={onDeck}
            mode={mode}
            busyKey={busyKey}
            onLoad={(id) => runQueueAction("/api/booth/queue/mark-loaded", id, "load")}
            onPlay={(id) => runQueueAction("/api/booth/queue/mark-playing", id, "play")}
            onPause={(id) => runQueueAction("/api/booth/queue/hold", id, "pause")}
            onSkip={(id) => runQueueAction("/api/booth/queue/skip", id, "skip")}
          />

          <QueueList
            items={state.queue.filter((item) => item.status !== "PLAYING" && item.id !== onDeck?.id)}
            mode={mode}
            busyKey={busyKey}
            onLoad={(id) => runQueueAction("/api/booth/queue/mark-loaded", id, "load")}
            onPlay={(id) => runQueueAction("/api/booth/queue/mark-playing", id, "play")}
            onPause={(id) => runQueueAction("/api/booth/queue/hold", id, "pause")}
            onSkip={(id) => runQueueAction("/api/booth/queue/skip", id, "skip")}
            onDone={(id) => runQueueAction("/api/booth/queue/mark-played", id, "done")}
          />
        </section>

        <section className="boothSideStack">
          <EnginePanel
            preview={state.runtimePreview}
            mode={mode}
            busy={busyKey === "runtime:materialize"}
            onMaterialize={runMaterialize}
          />

          <RequestPanel
            playNow={state.playNowRequests}
            upNext={state.upNextRequests}
            mode={mode}
            busyKey={busyKey}
            onRemove={(id) => runRequestAction("/api/admin/queue/reject", id, "remove")}
            onDone={(id) => runRequestAction("/api/admin/queue/played", id, "done")}
          />

          <ShoutoutPanel
            pending={state.pendingShoutouts}
            approved={state.approvedShoutouts}
            mode={mode}
          />
        </section>
      </div>

      <style jsx global>{`
        :root {
          --rr-bg-0: #050c14;
          --rr-bg-1: #0b1620;
          --rr-bg-2: #111d29;
          --rr-bg-3: #172636;
          --rr-ink-0: #f5f8ff;
          --rr-ink-1: #d5e0ec;
          --rr-ink-2: #93a7bb;
          --rr-line: rgba(164, 186, 207, 0.18);
          --rr-line-strong: rgba(164, 186, 207, 0.34);
          --rr-shadow: 0 24px 60px rgba(0, 0, 0, 0.38);
          --rr-cyan: #53d6ec;
          --rr-pink: #e372ff;
          --rr-gold: #f4c76b;
          --rr-red: #ff6d76;
          --rr-olive: #8bcf8a;
        }

        .rrBooth {
          min-height: 100vh;
          padding: 12px;
          background:
            radial-gradient(circle at 8% 10%, rgba(83, 214, 236, 0.14), transparent 22%),
            radial-gradient(circle at 86% 16%, rgba(227, 114, 255, 0.1), transparent 24%),
            linear-gradient(180deg, #07111a 0%, #081018 28%, #050b11 100%);
          color: var(--rr-ink-0);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .rrBooth--compact {
          --lane-gap: 10px;
          --panel-pad: 12px;
          --row-pad-y: 10px;
          --row-pad-x: 12px;
          --thumb-size: 52px;
          --hero-thumb: 92px;
        }

        .rrBooth:not(.rrBooth--compact) {
          --lane-gap: 14px;
          --panel-pad: 14px;
          --row-pad-y: 12px;
          --row-pad-x: 14px;
          --thumb-size: 60px;
          --hero-thumb: 108px;
        }

        .rrBooth__topbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          margin-bottom: 12px;
          padding: 16px 18px;
          border: 1px solid rgba(135, 163, 187, 0.18);
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), var(--rr-shadow);
          backdrop-filter: blur(18px);
        }

        .rrBrandBlock { min-width: 0; }
        .rrEyebrow {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--rr-ink-2);
          font-weight: 800;
        }
        .rrTitle {
          margin-top: 6px;
          font-size: clamp(28px, 4vw, 40px);
          line-height: 0.98;
          letter-spacing: -0.03em;
          font-weight: 1000;
        }
        .rrSub {
          margin-top: 8px;
          max-width: 760px;
          color: var(--rr-ink-2);
          font-size: 13px;
        }

        .rrTopRight {
          display: grid;
          gap: 10px;
          justify-items: end;
        }

        .modeToggle,
        .statBoxes {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .statBox {
          min-width: 102px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid var(--rr-line);
          background: rgba(255, 255, 255, 0.04);
        }
        .statBox span {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: var(--rr-ink-2);
          margin-bottom: 4px;
          font-weight: 800;
        }
        .statBox strong {
          display: block;
          font-size: 16px;
          line-height: 1.1;
          font-weight: 900;
        }

        .rrBooth__grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(360px, 0.92fr);
          gap: 12px;
          align-items: start;
        }

        .boothSideStack {
          display: grid;
          gap: 12px;
        }

        .boothPanel {
          border-radius: 22px;
          border: 1px solid var(--rr-line);
          background: linear-gradient(180deg, rgba(18, 28, 39, 0.92), rgba(10, 17, 25, 0.94));
          box-shadow: var(--rr-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          overflow: hidden;
        }

        .boothPanel--primary {
          padding: var(--panel-pad);
        }

        .boothPanel:not(.boothPanel--primary) {
          padding: var(--panel-pad);
        }

        .panelHead,
        .boothPanelHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .panelTitle,
        .boothPanelTitle {
          font-size: 18px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .panelSub,
        .boothPanelSub {
          margin-top: 4px;
          color: var(--rr-ink-2);
          font-size: 12px;
        }

        .panelMetaBadge {
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(83, 214, 236, 0.12);
          color: var(--rr-cyan);
          border: 1px solid rgba(83, 214, 236, 0.22);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .boothQueueList,
        .boothRequestList,
        .boothShoutoutList {
          display: grid;
          gap: 10px;
        }

        .boothSubsectionTitle {
          margin: 0 0 8px;
          color: var(--rr-ink-2);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .boothHeroCard,
        .boothLaneCard,
        .boothEngineCard,
        .boothRequestSection {
          border: 1px solid var(--rr-line);
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.018));
          padding: 12px;
        }

        .boothHeroCard {
          margin-bottom: 12px;
        }

        .boothHeroCard--now {
          background:
            radial-gradient(circle at 88% 18%, rgba(83, 214, 236, 0.1), transparent 22%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
        }

        .boothHeroCard--deck {
          background:
            radial-gradient(circle at 92% 18%, rgba(244, 199, 107, 0.08), transparent 20%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02));
        }

        .boothHeroHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .boothHeroLabel {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: var(--rr-ink-2);
          font-weight: 900;
        }

        .boothHeroKicker {
          margin-top: 3px;
          font-size: 12px;
          color: var(--rr-ink-1);
          font-weight: 700;
        }

        .boothHeroMain {
          display: grid;
          grid-template-columns: var(--hero-thumb) minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }

        .boothDeckMini {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }

        .boothHeroArt,
        .boothQueueArt,
        .boothMiniArt {
          width: var(--thumb-size);
          height: var(--thumb-size);
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: linear-gradient(180deg, rgba(60, 79, 97, 0.8), rgba(26, 39, 50, 0.88));
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .boothHeroArt--poster {
          width: var(--hero-thumb);
          height: var(--hero-thumb);
          border-radius: 18px;
        }

        .boothHeroArt--small {
          width: 64px;
          height: 64px;
        }

        .boothQueueArt {
          width: 52px;
          height: 52px;
          border-radius: 12px;
        }

        .boothHeroArt--system,
        .boothQueueArt--system,
        .boothMiniArt--system {
          background: linear-gradient(180deg, rgba(115, 66, 135, 0.55), rgba(59, 31, 74, 0.9));
        }

        .boothHeroArtImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .boothHeroArtFallback {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.04em;
          color: white;
        }

        .boothHeroInfo,
        .boothDeckInfo,
        .boothQueueMain,
        .boothRequestMain,
        .boothShoutoutMain {
          min-width: 0;
        }

        .boothHeroTitleLine,
        .boothDeckTitleLine,
        .boothQueueTitleLine,
        .boothRequestTitleLine,
        .boothShoutoutTop {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .boothHeroTitle,
        .boothDeckTitle,
        .boothQueueTitle,
        .boothRequestTitle {
          min-width: 0;
          font-weight: 900;
          letter-spacing: -0.02em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .boothHeroTitle { font-size: clamp(22px, 3vw, 30px); }
        .boothDeckTitle { font-size: 19px; }
        .boothQueueTitle,
        .boothRequestTitle { font-size: 15px; }

        .boothHeroMeta,
        .boothDeckMeta,
        .boothQueueMeta,
        .boothRequestMeta,
        .boothShoutoutMeta {
          margin-top: 6px;
          color: var(--rr-ink-2);
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .boothHeroReadouts {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }

        .boothReadout {
          border-radius: 14px;
          padding: 10px 12px;
          border: 1px solid var(--rr-line);
          background: rgba(255, 255, 255, 0.03);
          min-width: 0;
        }
        .boothReadout span {
          display: block;
          font-size: 10px;
          color: var(--rr-ink-2);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .boothReadout strong {
          display: block;
          font-size: 14px;
          font-weight: 900;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .boothProgress {
          margin-top: 12px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .boothProgressFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--rr-cyan), #6df5ff);
          box-shadow: 0 0 18px rgba(83, 214, 236, 0.34);
        }

        .boothProgressMeta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 6px;
          font-size: 11px;
          color: var(--rr-ink-2);
          font-weight: 700;
        }

        .boothActionBar,
        .boothRequestActions,
        .boothEngineActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .boothActionBar--compact {
          gap: 6px;
        }

        .gunmetalBtn,
        .boothActionBtn {
          appearance: none;
          border: 1px solid var(--rr-line-strong);
          background: linear-gradient(180deg, rgba(39, 53, 67, 0.96), rgba(23, 33, 43, 0.96));
          color: var(--rr-ink-0);
          padding: 9px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
        }

        .gunmetalBtn:hover,
        .boothActionBtn:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.24);
        }

        .gunmetalBtn:disabled,
        .boothActionBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .gunmetalBtn--neutral { background: linear-gradient(180deg, rgba(53, 67, 79, 0.9), rgba(28, 38, 47, 0.9)); }
        .gunmetalBtn--primary,
        .boothActionBtn--play,
        .boothActionBtn--done {
          border-color: rgba(83, 214, 236, 0.32);
          background: linear-gradient(180deg, rgba(17, 86, 98, 0.92), rgba(12, 57, 68, 0.92));
        }
        .gunmetalBtn--olive,
        .boothActionBtn--load {
          border-color: rgba(139, 207, 138, 0.3);
          background: linear-gradient(180deg, rgba(56, 95, 54, 0.92), rgba(35, 60, 34, 0.92));
        }
        .gunmetalBtn--remove,
        .boothActionBtn--skip,
        .boothActionBtn--remove {
          border-color: rgba(255, 109, 118, 0.34);
          background: linear-gradient(180deg, rgba(110, 41, 50, 0.92), rgba(70, 24, 31, 0.92));
        }
        .boothActionBtn--pause {
          border-color: rgba(244, 199, 107, 0.34);
          background: linear-gradient(180deg, rgba(108, 81, 30, 0.92), rgba(72, 53, 18, 0.92));
        }

        .boothBadge {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.06);
          color: var(--rr-ink-0);
          font-size: 10px;
          line-height: 1;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 900;
        }
        .boothBadge--cyan { color: var(--rr-cyan); border-color: rgba(83, 214, 236, 0.24); background: rgba(83, 214, 236, 0.1); }
        .boothBadge--pink { color: var(--rr-pink); border-color: rgba(227, 114, 255, 0.24); background: rgba(227, 114, 255, 0.1); }
        .boothBadge--gold { color: var(--rr-gold); border-color: rgba(244, 199, 107, 0.24); background: rgba(244, 199, 107, 0.1); }
        .boothBadge--warn { color: var(--rr-red); border-color: rgba(255, 109, 118, 0.24); background: rgba(255, 109, 118, 0.1); }
        .boothBadge--muted { color: var(--rr-ink-2); }

        .boothQueueSectionHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 14px 0 8px;
        }
        .boothQueueSectionTitle {
          font-size: 11px;
          color: var(--rr-ink-2);
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-weight: 900;
        }
        .boothQueueSectionCount {
          color: var(--rr-ink-2);
          font-size: 11px;
          font-weight: 700;
        }

        .boothQueueRow,
        .boothRequestRow,
        .boothShoutoutRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: var(--row-pad-y) var(--row-pad-x);
          border-radius: 16px;
          border: 1px solid var(--rr-line);
          background: rgba(255, 255, 255, 0.028);
        }

        .boothQueueRowLeft,
        .boothRequestRowLeft {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .boothQueueIndex,
        .boothRequestIndex {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 900;
          color: var(--rr-ink-1);
          border: 1px solid var(--rr-line);
          background: rgba(255, 255, 255, 0.04);
        }

        .boothQueueRow--system {
          background: rgba(133, 72, 164, 0.08);
        }

        .boothQueueAux {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .boothMiniMeta {
          font-size: 11px;
          color: var(--rr-ink-2);
        }

        .boothRequestSection + .boothRequestSection {
          margin-top: 10px;
        }

        .boothRequestRow {
          grid-template-columns: 40px minmax(0, 1fr) auto;
          align-items: center;
        }

        .boothRequestActions {
          margin-top: 0;
          justify-content: flex-end;
        }

        .boothEngineCard {
          display: grid;
          gap: 12px;
        }

        .boothEngineLabel {
          font-size: 11px;
          color: var(--rr-ink-2);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 900;
        }

        .boothEngineAction {
          font-size: 28px;
          line-height: 1;
          letter-spacing: -0.03em;
          font-weight: 1000;
        }

        .boothEngineList {
          display: grid;
          gap: 8px;
        }

        .boothEngineRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid var(--rr-line);
          background: rgba(255, 255, 255, 0.028);
        }
        .boothEngineRow span {
          color: var(--rr-ink-2);
          font-size: 12px;
        }
        .boothEngineRow strong {
          text-align: right;
          font-size: 12px;
          color: var(--rr-ink-0);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .boothShoutoutSplit {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .boothShoutoutRow {
          grid-template-columns: minmax(0, 1fr);
          align-items: start;
        }

        .boothShoutoutBadges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-end;
        }

        .boothShoutoutText {
          margin-top: 8px;
          color: var(--rr-ink-1);
          font-size: 13px;
          line-height: 1.4;
        }

        .boothEmptyState {
          padding: 18px 16px;
          border-radius: 16px;
          border: 1px dashed rgba(147, 167, 187, 0.22);
          background: rgba(255, 255, 255, 0.022);
          color: var(--rr-ink-2);
          text-align: center;
          font-size: 13px;
          font-weight: 700;
        }

        .boothEmptyState--hero {
          padding: 28px 16px;
        }

        @media (max-width: 1180px) {
          .rrBooth__grid {
            grid-template-columns: 1fr;
          }

          .boothShoutoutSplit {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .rrBooth__topbar {
            grid-template-columns: 1fr;
          }

          .rrTopRight {
            justify-items: start;
          }

          .modeToggle,
          .statBoxes {
            justify-content: flex-start;
          }

          .boothHeroMain,
          .boothDeckMini,
          .boothQueueRow,
          .boothRequestRow {
            grid-template-columns: 1fr;
          }

          .boothHeroReadouts {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .boothQueueRow,
          .boothRequestRow {
            gap: 10px;
          }

          .boothRequestActions,
          .boothActionBar,
          .boothEngineActions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
