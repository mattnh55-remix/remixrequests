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

  useEffect(() => {
    const stored = window.localStorage.getItem("rr-booth-mode");
    if (stored === "performance" || stored === "visual") setMode(stored);
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

  async function queueAction(endpoint: string, queueItemId: string) {
    await postJson(endpoint, { queueItemId });
    await load();
  }

  async function requestAction(
    endpoint: string,
    requestId: string,
    bodyKey: string = "requestId"
  ) {
    await postJson(endpoint, { [bodyKey]: requestId });
    await load();
  }

  return (
    <div className={`rrBooth ${mode === "performance" ? "rrBooth--compact" : ""}`}>
      <div className="rrBooth__topbar">
        <div>
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
              className={`gunmetalBtn ${mode === "visual" ? "gunmetalBtn--neutralActive" : "gunmetalBtn--neutral"}`}
              onClick={() => setMode("visual")}
              type="button"
            >
              Visual Mode
            </button>
            <button
              className={`gunmetalBtn ${mode === "performance" ? "gunmetalBtn--primary" : "gunmetalBtn--neutral"}`}
              onClick={() => setMode("performance")}
              type="button"
            >
              Performance Mode
            </button>
          </div>

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
              <div className="panelSub">Primary operator lane for now playing, on deck, and live order.</div>
            </div>
            <div className="panelHeadBadge">
              <span className="statusPill statusPill--playing">LIVE</span>
            </div>
          </div>

          <NowPlayingCard
            item={nowPlaying}
            mode={mode}
            onPause={(id) => queueAction("/api/booth/queue/hold", id)}
            onSkip={(id) => queueAction("/api/booth/queue/skip", id)}
            onDone={(id) => queueAction("/api/booth/queue/mark-played", id)}
          />

          <OnDeckCard
            item={onDeck}
            mode={mode}
            onLoad={(id) => queueAction("/api/booth/queue/mark-loaded", id)}
            onPlay={(id) => queueAction("/api/booth/queue/mark-playing", id)}
            onPause={(id) => queueAction("/api/booth/queue/hold", id)}
            onSkip={(id) => queueAction("/api/booth/queue/skip", id)}
          />

          <QueueList
            items={state.queue.filter((item) => item.status !== "PLAYING" && item.id !== onDeck?.id)}
            mode={mode}
            onLoad={(id) => queueAction("/api/booth/queue/mark-loaded", id)}
            onPlay={(id) => queueAction("/api/booth/queue/mark-playing", id)}
            onPause={(id) => queueAction("/api/booth/queue/hold", id)}
            onSkip={(id) => queueAction("/api/booth/queue/skip", id)}
          />
        </section>

        <div className="boothStack">
          <EnginePanel
            preview={state.runtimePreview}
            mode={mode}
            onMaterialize={async () => {
              await postJson(`/api/booth/runtime/materialize-next/${location}`, {});
              await load();
            }}
          />

          <RequestPanel
            playNow={state.playNowRequests}
            upNext={state.upNextRequests}
            mode={mode}
            onRemove={(id) => requestAction("/api/admin/queue/reject", id)}
            onDone={(id) => requestAction("/api/admin/queue/played", id)}
          />
        </div>

        <ShoutoutPanel pending={state.pendingShoutouts} approved={state.approvedShoutouts} mode={mode} />
      </div>

      <style jsx global>{`
        .rrBooth {
          min-height: 100vh;
          padding: 8px 10px 12px;
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
          --row-gap: 6px;
          --inset-border: rgba(255,255,255,0.1);
        }
        .rrBooth__topbar {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 14px;
          align-items: center;
          padding: 12px 14px;
          border-radius: 7px;
          border: 1px solid rgba(84, 122, 162, 0.32);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)),
            linear-gradient(90deg, rgba(24,36,52,0.9), rgba(9,18,31,0.86));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.35),
            0 10px 24px rgba(0,0,0,0.28);
          margin-bottom: 10px;
        }
        .rrEyebrow {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2.2px;
          opacity: 0.72;
        }
        .rrTitle {
          margin: 6px 0 5px;
          font-size: 32px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -1px;
        }
        .rrSub {
          color: rgba(235, 241, 255, 0.7);
          font-size: 13px;
        }
        .rrTopRight {
          display: grid;
          gap: 8px;
          justify-items: end;
        }
        .modeToggle,
        .statBoxes {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .statBox {
          min-width: 112px;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015)),
            linear-gradient(180deg, rgba(19,24,37,0.92), rgba(11,16,27,0.92));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.28);
        }
        .statBox span {
          display: block;
          margin-bottom: 5px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.8px;
          opacity: 0.7;
        }
        .statBox strong {
          font-size: 16px;
          font-weight: 1000;
        }
        .rrBooth__grid {
          display: grid;
          grid-template-columns: minmax(0, 1.68fr) minmax(350px, 0.95fr) minmax(290px, 0.62fr);
          gap: 10px;
          align-items: start;
        }
        .boothStack {
          display: grid;
          gap: 10px;
          align-content: start;
        }
        .boothPanel {
          min-width: 0;
          border-radius: 6px;
          border: 1px solid rgba(77, 107, 143, 0.3);
          background:
            linear-gradient(180deg, rgba(21,27,41,0.95), rgba(8,13,23,0.94));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            inset 0 -1px 0 rgba(0,0,0,0.35),
            0 12px 26px rgba(0,0,0,0.24);
          padding: 9px;
        }
        .boothPanel--primary {
          display: grid;
          gap: 8px;
        }
        .panelHead,
        .boothPanelHeader {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 6px;
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
        }
        .heroCard {
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.09);
          background:
            linear-gradient(90deg, rgba(255,255,255,0.028), rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.02)),
            linear-gradient(180deg, rgba(28,36,53,0.96), rgba(10,17,29,0.96));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.32);
          padding: 9px;
        }
        .heroCardHeader {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: flex-start;
          margin-bottom: 7px;
        }
        .heroCardTitle {
          font-size: 11px;
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
          border-radius: 4px;
          padding: 14px;
          color: rgba(235,241,255,0.7);
          background: rgba(255,255,255,0.015);
        }
        .heroMain {
          display: grid;
          grid-template-columns: 80px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
        }
        .heroArtwork,
        .deckArt,
        .queueMedia img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 4px;
        }
        .heroArtworkWrap {
          width: 80px;
          height: 80px;
        }
        .heroArtwork--placeholder,
        .deckArt--placeholder,
        .queueMediaPlaceholder {
          width: 100%;
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(135deg, rgba(59,139,177,0.34), rgba(111,56,126,0.3));
          border: 1px solid rgba(255,255,255,0.12);
        }
        .heroInfo {
          display: grid;
          gap: 6px;
          min-width: 0;
        }
        .heroTitleRow {
          display: flex;
          gap: 7px;
          align-items: center;
          flex-wrap: wrap;
        }
        .heroTitle {
          font-size: 20px;
          font-weight: 1000;
          line-height: 1.05;
          letter-spacing: -0.4px;
        }
        .heroArtist {
          font-size: 13px;
          color: rgba(235,241,255,0.78);
        }
        .heroTelemetry {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
        }
        .heroTelemetryCell {
          padding: 7px 10px 8px;
          border-right: 1px solid rgba(255,255,255,0.08);
          min-width: 0;
        }
        .heroTelemetryCell:last-child {
          border-right: none;
        }
        .heroTelemetryCell span {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.6px;
          opacity: 0.68;
          margin-bottom: 4px;
        }
        .heroTelemetryCell strong {
          display: block;
          font-size: 13px;
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
          height: 14px;
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
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.3px;
          text-transform: uppercase;
          color: rgba(235,241,255,0.76);
        }
        .deckLine {
          display: grid;
          grid-template-columns: 54px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
        }
        .deckArt {
          width: 54px;
          height: 54px;
        }
        .deckTitle {
          font-size: 16px;
          font-weight: 1000;
          line-height: 1.05;
        }
        .deckArtist {
          margin-top: 3px;
          color: rgba(235,241,255,0.76);
          font-size: 12px;
        }
        .statusPill {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1.2px;
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
        .gunmetalBtn {
          appearance: none;
          border: 1px solid rgba(255,255,255,0.12);
          cursor: pointer;
          min-height: 32px;
          padding: 0 11px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.8px;
          color: #f1f5fb;
          text-transform: none;
          background: linear-gradient(180deg, #4a5467 0%, #2d3441 52%, #232935 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -1px 0 rgba(0,0,0,0.46),
            0 1px 2px rgba(0,0,0,0.32);
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
        .gunmetalBtn--neutralActive {
          background: linear-gradient(180deg, #626b7d 0%, #404958 52%, #313745 100%);
        }
        .gunmetalBtn--wide {
          width: 100%;
        }
        .boothActionRail {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .queueListShell {
          display: grid;
          gap: 6px;
        }
        .queueListHeader {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 8px;
        }
        .queueListTitle,
        .listSectionTitle,
        .insertBlockTitle,
        .engineLabel {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.7px;
          text-transform: uppercase;
        }
        .queueListSub,
        .queueListHelp {
          color: rgba(235,241,255,0.7);
          font-size: 12px;
        }
        .queueListScroller,
        .requestListScroller,
        .shoutoutListScroller {
          display: grid;
          gap: 6px;
          max-height: 460px;
          overflow: auto;
          padding-right: 1px;
        }
        .queueRow,
        .requestRow,
        .shoutoutRow {
          display: grid;
          align-items: center;
          gap: 8px;
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.085);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)),
            linear-gradient(180deg, rgba(25,31,44,0.92), rgba(14,19,31,0.92));
          padding: 7px 8px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.25);
        }
        .queueRow {
          grid-template-columns: 26px 38px minmax(0, 1fr) auto;
        }
        .requestRow {
          grid-template-columns: 24px minmax(0, 1fr) auto;
        }
        .queueIndex,
        .requestIndex {
          font-size: 15px;
          font-weight: 1000;
          line-height: 1;
          color: rgba(235,241,255,0.92);
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
        }
        .queueMedia {
          width: 38px;
          height: 38px;
        }
        .queueText,
        .requestText {
          min-width: 0;
        }
        .queueTitleLine,
        .requestTitleLine {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
          min-width: 0;
        }
        .queueTitle,
        .requestTitleLine strong,
        .requestTitle {
          font-size: 14px;
          font-weight: 1000;
          line-height: 1.05;
        }
        .queueMeta,
        .requestMeta,
        .shoutoutMeta {
          margin-top: 2px;
          color: rgba(235,241,255,0.66);
          font-size: 12px;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .requestActions,
        .queueActions,
        .boothRequestActions {
          display: flex;
          gap: 4px;
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
          padding: 8px;
        }
        .engineAction {
          font-size: 17px;
          line-height: 1;
          font-weight: 1000;
          margin: 6px 0 8px;
        }
        .engineGrid {
          display: grid;
          gap: 0;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          overflow: hidden;
        }
        .engineRow {
          display: grid;
          grid-template-columns: 120px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          padding: 8px 10px;
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
          gap: 6px;
        }
        .shoutoutTop {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          align-items: flex-start;
        }
        .shoutoutBadges {
          display: flex;
          gap: 4px;
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
          gap: 8px;
        }
        @media (max-width: 1480px) {
          .rrBooth__grid {
            grid-template-columns: minmax(0, 1.55fr) minmax(330px, 0.95fr) minmax(280px, 0.62fr);
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
          .modeToggle,
          .statBoxes {
            justify-content: flex-start;
          }
        }
        @media (max-width: 760px) {
          .heroMain,
          .deckLine,
          .queueRow,
          .requestRow,
          .engineRow {
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
