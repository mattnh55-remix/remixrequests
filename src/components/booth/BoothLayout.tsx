"use client";

import { useEffect, useMemo, useState } from "react";
import EnginePanel from "./EnginePanel";
import NowPlayingCard from "./NowPlayingCard";
import OnDeckCard from "./OnDeckCard";
import QueueList from "./QueueList";
import RequestPanel from "./RequestPanel";
import ShoutoutPanel from "./ShoutoutPanel";
import { normalizeQueue, queueSummary, safeJson } from "./booth-utils";
import type { BoothDataState, BoothMode, RequestItem, RuntimePreview, ShoutoutItem } from "./types";

async function postJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await safeJson(res) };
}

export default function BoothLayout({ location }: { location: string }) {
  const [mode, setMode] = useState<BoothMode>("visual");
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
    const playNowRequests: RequestItem[] = Array.isArray(requestPayload?.playNow) ? requestPayload.playNow : [];
    const upNextRequests: RequestItem[] = Array.isArray(requestPayload?.upNext) ? requestPayload.upNext : [];
    const pendingShoutouts: ShoutoutItem[] = Array.isArray(shoutPayload?.pending) ? shoutPayload.pending : [];
    const approvedShoutouts: ShoutoutItem[] = Array.isArray(shoutPayload?.approved) ? shoutPayload.approved : [];

    let runtimePreview: RuntimePreview | null = null;
    if (queue.length > 0) {
      const target = queue.find((item) => item.status === "LOADED") || queue.find((item) => item.status === "QUEUED") || null;
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

  const nowPlaying = useMemo(() => state.queue.find((item) => item.status === "PLAYING") || null, [state.queue]);
  const onDeck = useMemo(() => state.queue.find((item) => item.status === "LOADED") || state.queue.find((item) => item.status === "QUEUED") || null, [state.queue]);
  const summary = useMemo(() => queueSummary(state.queue), [state.queue]);

  async function queueAction(endpoint: string, queueItemId: string) {
    await postJson(endpoint, { queueItemId });
    await load();
  }

  return (
    <div className={`rrBooth ${mode === "performance" ? "rrBooth--compact" : ""}`}>
      <div className="rrBooth__topbar">
        <div>
          <div className="rrEyebrow">REMIXREQUESTS • LIVE BOOTH</div>
          <div className="rrTitle">REMIXREQUESTS</div>
          <div className="rrSub">Real-time operator surface. Queue, engine, requests, and shoutouts in one view.</div>
        </div>
        <div className="rrTopRight">
          <div className="modeToggle">
            <button className={`gunmetalBtn ${mode === "visual" ? "gunmetalBtn--olive" : "gunmetalBtn--neutral"}`} onClick={() => setMode("visual")}>VISUAL MODE</button>
            <button className={`gunmetalBtn ${mode === "performance" ? "gunmetalBtn--primary" : "gunmetalBtn--neutral"}`} onClick={() => setMode("performance")}>PERFORMANCE MODE</button>
          </div>
          <div className="statBoxes">
            <div className="statBox"><span>QUEUE</span><strong>{summary.total}</strong></div>
            <div className="statBox"><span>SONGS</span><strong>{summary.songs}</strong></div>
            <div className="statBox"><span>INTERSTITIALS</span><strong>{summary.interstitials}</strong></div>
            <div className="statBox"><span>UPDATED</span><strong>{state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : "—"}</strong></div>
          </div>
        </div>
      </div>

      <div className="rrBooth__grid">
        <section className="boothPanel boothPanel--primary">
          <div className="panelHead">
            <div>
              <div className="panelTitle">Booth / Queue</div>
              <div className="panelSub">Now Playing, On Deck, and the live play order.</div>
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

        <EnginePanel preview={state.runtimePreview} mode={mode} onMaterialize={() => postJson(`/api/booth/runtime/materialize-next/${location}`, {})} />
        <RequestPanel playNow={state.playNowRequests} upNext={state.upNextRequests} mode={mode} onRemove={(id) => postJson("/api/admin/queue/reject", { requestId: id })} onDone={(id) => postJson("/api/admin/queue/played", { requestId: id })} />
        <ShoutoutPanel pending={state.pendingShoutouts} approved={state.approvedShoutouts} mode={mode} />
      </div>

      <style jsx>{`
        .rrBooth {
          min-height: 100vh;
          padding: 10px 12px 16px;
          background:
            radial-gradient(circle at 12% 15%, rgba(0, 177, 204, 0.22), transparent 22%),
            radial-gradient(circle at 68% 22%, rgba(165, 40, 190, 0.20), transparent 24%),
            linear-gradient(90deg, #051628 0%, #07142c 52%, #140622 100%);
          color: #f3f6ff;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        .rrBooth--compact { --pad: 10px; --row-h: 44px; }
        .rrBooth__topbar {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: center;
          padding: 14px 16px;
          border-radius: 24px;
          border: 1px solid rgba(76, 196, 222, 0.24);
          background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(255,255,255,0.02), 0 0 48px rgba(31, 186, 226, 0.10);
          margin-bottom: 12px;
        }
        .rrEyebrow { font-size: 11px; font-weight: 900; letter-spacing: 2px; opacity: 0.8; }
        .rrTitle { font-size: 34px; font-weight: 1000; line-height: 1; margin: 6px 0; }
        .rrSub { color: rgba(235,241,255,0.8); font-size: 14px; }
        .rrTopRight { display: grid; gap: 10px; justify-items: end; }
        .modeToggle, .statBoxes { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .statBox {
          min-width: 130px; padding: 10px 14px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
        }
        .statBox span { display:block; font-size:11px; font-weight:900; letter-spacing:1.5px; opacity:0.75; margin-bottom:6px; }
        .statBox strong { font-size: 18px; font-weight: 1000; }
        .rrBooth__grid { display: grid; grid-template-columns: 2fr 1fr 1.35fr 0.9fr; gap: 12px; align-items: start; }
        .boothPanel {
          border-radius: 24px; border: 1px solid rgba(161, 85, 255, 0.16);
          background: linear-gradient(180deg, rgba(18,23,43,0.88), rgba(8,14,28,0.86));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.02), 0 14px 34px rgba(0,0,0,0.26);
          padding: 12px;
          min-height: 660px;
        }
        .boothPanel--compact { padding: 10px; }
        .boothPanel--primary { display: grid; gap: 10px; }
        .panelHead { display:flex; justify-content:space-between; gap: 8px; align-items:flex-start; padding-bottom: 10px; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom: 8px; }
        .panelTitle { font-size: 16px; font-weight: 1000; letter-spacing: 0.4px; text-transform: uppercase; }
        .panelSub { font-size: 13px; color: rgba(235,241,255,0.78); margin-top: 3px; }
        .heroCard { border-radius: 22px; border: 1px solid rgba(0, 217, 255, 0.18); background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)); padding: 12px; }
        .heroCard--live { box-shadow: 0 0 26px rgba(0,231,255,0.12); }
        .heroCard--deck { box-shadow: 0 0 24px rgba(213,70,255,0.10); }
        .heroCardHeader, .engineBoxHeader { display:flex; justify-content:space-between; gap:8px; align-items:flex-start; margin-bottom: 10px; }
        .heroCardTitle { font-size: 12px; text-transform: uppercase; letter-spacing: 1.8px; font-weight: 1000; opacity: 0.92; }
        .heroCardSub { font-size: 13px; color: rgba(235,241,255,0.74); margin-top: 3px; }
        .heroEmpty, .emptyBox, .insertBlockBody { border:1px dashed rgba(255,255,255,0.12); border-radius: 16px; padding: 18px; color: rgba(235,241,255,0.74); }
        .heroMain { display:grid; grid-template-columns: 96px 1fr; gap: 14px; align-items: start; }
        .heroArtwork, .deckArt, .queueMedia img { width: 100%; height: 100%; object-fit: cover; display:block; border-radius: 12px; }
        .heroArtworkWrap { width: 96px; height: 96px; }
        .heroArtwork--placeholder, .deckArt--placeholder, .queueMediaPlaceholder {
          width: 100%; height:100%; border-radius: 12px;
          background: linear-gradient(135deg, rgba(70,216,255,0.35), rgba(205,78,255,0.30));
          border:1px solid rgba(255,255,255,0.16);
        }
        .heroInfo { display:grid; gap: 8px; }
        .heroTitleRow { display:flex; gap: 8px; align-items:center; flex-wrap: wrap; }
        .heroTitle { font-size: 22px; font-weight: 1000; line-height: 1.1; }
        .heroArtist { font-size: 14px; color: rgba(235,241,255,0.82); }
        .heroStats { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; }
        .heroStats--compact { grid-template-columns: repeat(4, minmax(0,1fr)); }
        .heroStat { border:1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px 10px; background: rgba(255,255,255,0.03); }
        .heroStat span { display:block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; opacity: 0.7; margin-bottom: 4px; }
        .heroStat strong { font-size: 13px; font-weight: 900; }
        .progressWrap { display:grid; gap:6px; }
        .progressBar { height: 12px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
        .progressFill { height:100%; background: linear-gradient(90deg, #00deff, #da49ff); box-shadow: 0 0 16px rgba(0,231,255,0.35); }
        .progressMeta { display:flex; justify-content: space-between; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
        .deckLine { display:grid; grid-template-columns: 64px 1fr auto; gap: 12px; align-items:center; }
        .deckArt { width:64px; height:64px; }
        .deckTitle { font-size: 17px; font-weight: 900; }
        .deckArtist { margin-top: 4px; color: rgba(235,241,255,0.78); }
        .statusPill {
          display:inline-flex; align-items:center; padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 1000; letter-spacing: 1px; text-transform: uppercase;
          border:1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.05);
        }
        .statusPill--playing { border-color: rgba(0, 224, 255, 0.38); box-shadow: 0 0 14px rgba(0,224,255,0.18); }
        .statusPill--loaded { border-color: rgba(0, 224, 255, 0.38); box-shadow: 0 0 14px rgba(0,224,255,0.18); }
        .statusPill--held { border-color: rgba(255,204,0,0.38); }
        .statusPill--skip { border-color: rgba(255,90,90,0.4); }
        .statusPill--queued { border-color: rgba(255,255,255,0.22); }
        .statusPill--muted { opacity: 0.75; }
        .statusPill--magenta { border-color: rgba(218,73,255,0.45); box-shadow: 0 0 16px rgba(218,73,255,0.14); }
        .gunmetalBtn {
          appearance:none; border:none; cursor:pointer; min-height: 28px; padding: 0 12px; border-radius: 6px;
          font-size: 11px; font-weight: 1000; letter-spacing: 1px; text-transform: uppercase; color: #eef3ff;
          background: linear-gradient(180deg, #475166 0%, #2b3140 52%, #232a37 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .gunmetalBtn:hover { filter: brightness(1.08); }
        .gunmetalBtn--compact { min-height: 26px; padding: 0 10px; }
        .gunmetalBtn--primary { background: linear-gradient(180deg, #3f7dd6, #2451a0); }
        .gunmetalBtn--olive { background: linear-gradient(180deg, #7b8a58, #5f6c44); }
        .gunmetalBtn--magenta { background: linear-gradient(180deg, #6c3b84, #41234f); }
        .gunmetalBtn--load, .gunmetalBtn--play { background: linear-gradient(180deg, #3971bf, #214f93); }
        .gunmetalBtn--pause { background: linear-gradient(180deg, #7b7d58, #606238); }
        .gunmetalBtn--skip, .gunmetalBtn--remove { background: linear-gradient(180deg, #855050, #6a3232); }
        .gunmetalBtn--done { background: linear-gradient(180deg, #5d6c50, #3f4a38); }
        .gunmetalBtn--wide { width: 100%; margin-top: 10px; height: 36px; }
        .boothActionRail { display:flex; gap: 6px; flex-wrap: wrap; }
        .boothActionRail--compact .gunmetalBtn { min-height: 26px; padding: 0 10px; }
        .queueListShell { display:grid; gap: 8px; }
        .queueListHeader { display:flex; justify-content:space-between; align-items:center; gap:8px; }
        .queueListTitle, .listSectionTitle, .insertBlockTitle, .engineLabel { font-size: 12px; font-weight: 1000; letter-spacing: 1.8px; text-transform: uppercase; }
        .queueListSub, .queueListHelp { color: rgba(235,241,255,0.78); font-size: 13px; }
        .queueToolbar { display:flex; gap: 8px; }
        .queueListScroller, .requestListScroller { display:grid; gap: 8px; max-height: 420px; overflow:auto; padding-right: 2px; }
        .queueRow, .requestRow {
          display:grid; align-items:center; gap: 10px; border-radius: 14px; border:1px solid rgba(255,255,255,0.1);
          background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)); padding: 9px 10px;
        }
        .queueRow { grid-template-columns: 28px 42px minmax(0,1fr) 56px auto; }
        .queueRow--compact, .requestRow--compact { padding: 7px 8px; }
        .queueRow--locked { border-color: rgba(216,72,255,0.24); }
        .queueIndex, .requestIndex { font-size: 26px; font-weight: 1000; line-height: 1; opacity: 0.9; }
        .queueMedia { width: 42px; height: 42px; }
        .queueText, .requestText { min-width: 0; }
        .queueTitleLine, .requestTitleLine { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .queueTitle, .requestTitleLine strong { font-size: 15px; }
        .queueMeta, .requestMeta { margin-top: 3px; color: rgba(235,241,255,0.72); font-size: 13px; }
        .queueDuration { font-size: 13px; font-weight: 900; text-align: right; opacity: 0.85; }
        .requestChips { display:flex; gap:8px; flex-wrap:wrap; margin-bottom: 10px; }
        .requestRow { grid-template-columns: 28px minmax(0,1fr) auto; }
        .engineBox, .insertBlock { border:1px solid rgba(255,255,255,0.1); border-radius: 18px; background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)); padding: 12px; margin-bottom: 10px; }
        .engineAction { font-size: 20px; line-height: 1.05; font-weight: 1000; margin: 6px 0 10px; }
        .engineGrid { display:grid; gap: 8px; }
        .engineRow { display:flex; justify-content:space-between; gap: 10px; border-top:1px solid rgba(255,255,255,0.08); padding-top: 8px; font-size: 13px; }
        .engineRow span { color: rgba(235,241,255,0.72); }
        @media (max-width: 1500px) {
          .rrBooth__grid { grid-template-columns: 1.7fr 1fr 1.2fr 0.9fr; }
        }
        @media (max-width: 1200px) {
          .rrBooth__grid { grid-template-columns: 1fr 1fr; }
          .rrBooth__topbar { grid-template-columns: 1fr; }
          .rrTopRight { justify-items: start; }
        }
        @media (max-width: 780px) {
          .rrBooth__grid { grid-template-columns: 1fr; }
          .heroMain, .deckLine { grid-template-columns: 1fr; }
          .heroStats, .queueRow, .requestRow { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
