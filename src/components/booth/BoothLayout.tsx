"use client";

import { useEffect, useMemo, useState } from "react";
import EnginePanel from "./EnginePanel";
import NowPlayingCard from "./NowPlayingCard";
import OnDeckCard from "./OnDeckCard";
import QueueList from "./QueueList";
import RequestPanel from "./RequestPanel";
import ShoutoutPanel from "./ShoutoutPanel";
import type { BoothNotice, QueueLikeItem, RequestItem, RuntimePreview, ShoutoutItem } from "./types";
import { deriveEngineState, fetchJson, isInterstitial, normalizeQueue, normalizeRequests, normalizeShoutouts } from "./booth-utils";

type Props = { location: string };

type State = {
  queue: QueueLikeItem[];
  playNow: RequestItem[];
  upNext: RequestItem[];
  pendingShoutouts: ShoutoutItem[];
  approvedShoutouts: ShoutoutItem[];
  preview: RuntimePreview | null;
  updatedAt: string | null;
  loading: boolean;
};

const initialState: State = {
  queue: [],
  playNow: [],
  upNext: [],
  pendingShoutouts: [],
  approvedShoutouts: [],
  preview: null,
  updatedAt: null,
  loading: true,
};

export default function BoothLayout({ location }: Props) {
  const [state, setState] = useState<State>(initialState);
  const [notice, setNotice] = useState<BoothNotice | null>(null);
  const [compactMode, setCompactMode] = useState(false);

  async function load() {
    const [queueData, requestData, shoutoutData] = await Promise.all([
      fetchJson(`/api/booth/queue/${location}`),
      fetchJson(`/api/admin/queue/${location}`),
      fetchJson(`/api/admin/shoutouts/${location}`),
    ]);

    const queue = normalizeQueue(queueData);
    const requests = normalizeRequests(requestData);
    const shoutouts = normalizeShoutouts(shoutoutData);

    setState({
      queue,
      playNow: requests.playNow,
      upNext: requests.upNext,
      pendingShoutouts: shoutouts.pending,
      approvedShoutouts: shoutouts.approved,
      preview: deriveEngineState(queue),
      updatedAt: new Date().toISOString(),
      loading: false,
    });
  }

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("boothCompactMode") : null;
    setCompactMode(stored === "1");
  }, []);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        await load();
      } catch (error: any) {
        if (mounted) setNotice({ kind: "error", text: error?.message || "Unable to load booth data." });
      }
    }
    void run();
    const id = window.setInterval(run, 3000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [location]);

  function updateMode(next: boolean) {
    setCompactMode(next);
    if (typeof window !== "undefined") window.localStorage.setItem("boothCompactMode", next ? "1" : "0");
  }

  const nowPlaying = useMemo(() => state.queue.find((item) => String(item.status || "").toUpperCase() === "PLAYING") || null, [state.queue]);
  const onDeck = useMemo(() => state.queue.find((item) => {
    const s = String(item.status || "").toUpperCase();
    return s === "LOADED" || s === "QUEUED";
  }) || null, [state.queue]);

  async function doQueueAction(action: "load" | "play" | "pause" | "skip" | "done", itemId: string) {
    const path = action === "load"
      ? "/api/booth/queue/mark-loaded"
      : action === "play"
      ? "/api/booth/queue/mark-playing"
      : action === "pause"
      ? "/api/booth/queue/hold"
      : action === "skip"
      ? "/api/booth/queue/skip"
      : "/api/booth/queue/mark-played";

    try {
      await fetchJson(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ queueItemId: itemId }),
      });
      setNotice({ kind: "success", text: `Action complete: ${action}.` });
      await load();
    } catch (error: any) {
      setNotice({ kind: "error", text: error?.message || `Failed to ${action}.` });
    }
  }

  async function saveReorder(orderedQueuedItemIds: string[]) {
    try {
      await fetchJson("/api/booth/queue/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, orderedQueuedItemIds }),
      });
      setNotice({ kind: "success", text: "Queue order saved." });
      await load();
    } catch (error: any) {
      setNotice({ kind: "error", text: error?.message || "Unable to save queue order." });
    }
  }

  async function materializeNext() {
    try {
      const res = await fetchJson(`/api/booth/runtime/materialize-next/${location}`, { method: "POST" });
      setNotice({ kind: "info", text: res?.materialized ? "System insert materialized." : `Engine response: ${res?.reason || "no action"}.` });
      await load();
    } catch (error: any) {
      setNotice({ kind: "error", text: error?.message || "Materializer failed." });
    }
  }

  async function rejectRequest(requestId: string) {
    try {
      await fetchJson("/api/admin/queue/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      setNotice({ kind: "success", text: "Request removed." });
      await load();
    } catch (error: any) {
      setNotice({ kind: "error", text: error?.message || "Unable to remove request." });
    }
  }

  async function markRequestDone(requestId: string) {
    try {
      await fetchJson("/api/admin/queue/played", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      setNotice({ kind: "success", text: "Request marked done." });
      await load();
    } catch (error: any) {
      setNotice({ kind: "error", text: error?.message || "Unable to mark request done." });
    }
  }

  async function approveShoutout(id: string) {
    try {
      await fetchJson("/api/admin/shoutouts/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId: id }),
      });
      setNotice({ kind: "success", text: "Shoutout approved." });
      await load();
    } catch (error: any) {
      setNotice({ kind: "error", text: error?.message || "Unable to approve shoutout." });
    }
  }

  async function rejectShoutout(id: string) {
    try {
      await fetchJson("/api/admin/shoutouts/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId: id }),
      });
      setNotice({ kind: "success", text: "Shoutout rejected." });
      await load();
    } catch (error: any) {
      setNotice({ kind: "error", text: error?.message || "Unable to reject shoutout." });
    }
  }

  const queueCount = state.queue.length;
  const songCount = state.queue.filter((item) => !isInterstitial(item)).length;
  const interstitialCount = state.queue.filter((item) => isInterstitial(item)).length;

  return (
    <div className={`neonRoot boothRoot ${compactMode ? "boothRoot--compact" : ""}`}>
      <div className="rrWall" />
      <div className="boothCanvas">
        <header className="boothHeader gunmetalHeader">
          <div>
            <div className="kicker">REMIXREQUESTS · LIVE BOOTH</div>
            <h1>REMIXREQUESTS</h1>
            <p>Real-time operator surface. Queue, engine, requests, and shoutouts in one view.</p>
          </div>
          <div className="topControls">
            <div className="modeToggle">
              <button type="button" className={`gunBtn ${!compactMode ? "gunBtn--primary" : "gunBtn--secondary"}`} onClick={() => updateMode(false)}>Visual Mode</button>
              <button type="button" className={`gunBtn ${compactMode ? "gunBtn--primary" : "gunBtn--secondary"}`} onClick={() => updateMode(true)}>Performance Mode</button>
            </div>
            <div className="statGrid">
              <div className="statCard"><span>Queue</span><strong>{queueCount}</strong></div>
              <div className="statCard"><span>Songs</span><strong>{songCount}</strong></div>
              <div className="statCard"><span>Interstitials</span><strong>{interstitialCount}</strong></div>
              <div className="statCard"><span>Updated</span><strong>{state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString() : "—"}</strong></div>
            </div>
          </div>
        </header>

        {notice ? <div className={`noticeBar noticeBar--${notice.kind}`}>{notice.text}</div> : null}

        <div className="mainGrid">
          <section className="columnPanel columnPanel--booth">
            <div className="panelHead">
              <div>
                <h3>Booth / Queue</h3>
                <p>Now Playing, On Deck, and the live play order.</p>
              </div>
            </div>
            <NowPlayingCard item={nowPlaying} compactMode={compactMode} onAction={doQueueAction} />
            <OnDeckCard item={onDeck} compactMode={compactMode} onAction={doQueueAction} />
            <QueueList items={state.queue.filter((item) => !["PLAYING", "LOADED"].includes(String(item.status || "").toUpperCase()))} compactMode={compactMode} onAction={doQueueAction} onSaveReorder={saveReorder} />
          </section>

          <EnginePanel preview={state.preview} onMaterialize={materializeNext} />
          <RequestPanel playNow={state.playNow} upNext={state.upNext} onRemove={rejectRequest} onDone={markRequestDone} />
          <ShoutoutPanel pending={state.pendingShoutouts} approved={state.approvedShoutouts} onApprove={approveShoutout} onReject={rejectShoutout} />
        </div>
      </div>

      <style jsx>{`
        .boothCanvas {
          width: 100%;
          padding: 10px 16px 16px;
          position: relative;
          z-index: 1;
        }
        .gunmetalHeader, .columnPanel, .panelSection, .gunmetalBox, .queueRow, .statCard, .emptyMini, .emptySlot {
          background: linear-gradient(180deg, rgba(44,50,62,0.94), rgba(18,22,31,0.92));
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 32px rgba(0,0,0,0.26), 0 0 24px rgba(0,247,255,0.08), 0 0 22px rgba(255,57,212,0.07);
        }
        .boothHeader {
          display:flex; justify-content:space-between; gap:16px; align-items:flex-start; border-radius:28px; padding:14px 18px; margin-bottom:12px;
        }
        .kicker { font-size:11px; letter-spacing:2px; font-weight:900; color:#b9c2d1; }
        .boothHeader h1 { margin:4px 0 6px; font-size:34px; line-height:1; font-weight:1000; letter-spacing:.3px; }
        .boothHeader p { margin:0; color:#c7ceda; font-size:14px; }
        .topControls { display:grid; gap:10px; min-width:720px; }
        .modeToggle { display:flex; justify-content:flex-end; gap:8px; }
        .statGrid { display:grid; grid-template-columns:repeat(4, minmax(110px,1fr)); gap:8px; }
        .statCard { border-radius:18px; padding:12px 14px; display:grid; gap:6px; }
        .statCard span { color:#b8c1d0; text-transform:uppercase; font-size:11px; font-weight:900; letter-spacing:1px; }
        .statCard strong { font-size:18px; }
        .noticeBar { margin-bottom:10px; border-radius:16px; padding:10px 14px; font-size:13px; font-weight:800; }
        .noticeBar--success { background:rgba(37,170,90,0.18); border:1px solid rgba(37,170,90,0.34); }
        .noticeBar--error { background:rgba(200,70,70,0.18); border:1px solid rgba(200,70,70,0.34); }
        .noticeBar--info { background:rgba(73,132,210,0.18); border:1px solid rgba(73,132,210,0.34); }
        .mainGrid { display:grid; grid-template-columns: 1.6fr 1fr 1.2fr 0.8fr; gap:12px; align-items:start; }
        .columnPanel { border-radius:24px; padding:14px; min-width:0; min-height:720px; }
        .columnPanel--booth { min-height:760px; }
        .panelHead { display:flex; justify-content:space-between; gap:8px; align-items:flex-start; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08); }
        .panelHead h3 { margin:0; font-size:16px; font-weight:1000; letter-spacing:.5px; text-transform:uppercase; }
        .panelHead p { margin:3px 0 0; color:#c3cad6; font-size:13px; }
        .headTag, .rowPill, .dragToken, .systemLock { display:inline-flex; align-items:center; justify-content:center; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:1000; text-transform:uppercase; letter-spacing:.8px; border:1px solid rgba(255,255,255,0.14); }
        .headTag { background:rgba(0,0,0,0.24); color:#d9e0ec; }
        .rowPill--live, .rowPill--cyan { box-shadow:0 0 16px rgba(0,247,255,0.26); border-color:rgba(0,247,255,0.38); }
        .rowPill--pink, .rowPill--armed { box-shadow:0 0 16px rgba(255,57,212,0.26); border-color:rgba(255,57,212,0.38); }
        .rowPill--queued { border-color:rgba(255,206,88,0.4); }
        .rowPill--system { border-color:rgba(255,57,212,0.34); }
        .panelSection, .gunmetalBox { border-radius:20px; padding:12px; }
        .panelSection { margin-bottom:10px; }
        .sectionTop { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
        .sectionLabel { color:#b8c1d0; text-transform:uppercase; font-size:12px; letter-spacing:1.6px; font-weight:1000; }
        .sectionSub { color:#cdd4df; font-size:12px; margin-top:2px; }
        .emptySlot { border-radius:16px; border:1px dashed rgba(255,255,255,0.16); min-height:88px; display:flex; align-items:center; justify-content:center; color:#c6ced9; margin-top:10px; }
        .heroLine { display:grid; grid-template-columns:100px 1fr; gap:14px; margin-top:10px; }
        .heroArt, .deckArt, .queueArt { object-fit:cover; display:block; }
        .heroArtWrap { align-self:start; }
        .heroArt { width:100px; height:100px; border-radius:18px; border:1px solid rgba(255,255,255,0.12); background: radial-gradient(circle at 30% 30%, rgba(0,247,255,.22), transparent 55%), radial-gradient(circle at 75% 75%, rgba(255,57,212,.18), transparent 60%), rgba(255,255,255,.06); }
        .deckArt { width:64px; height:64px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background: radial-gradient(circle at 30% 30%, rgba(0,247,255,.22), transparent 55%), radial-gradient(circle at 75% 75%, rgba(255,57,212,.18), transparent 60%), rgba(255,255,255,.06); }
        .queueArt { width:42px; height:42px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background: radial-gradient(circle at 30% 30%, rgba(0,247,255,.22), transparent 55%), radial-gradient(circle at 75% 75%, rgba(255,57,212,.18), transparent 60%), rgba(255,255,255,.06); }
        .heroTitleRow { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .heroTitle { font-size:20px; font-weight:1000; line-height:1.05; }
        .heroArtist, .deckArtist, .queueMeta, .requestMeta { color:#d0d6e2; font-size:13px; }
        .metricStrip { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:10px; }
        .metricBox { padding:10px; border-radius:14px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); display:grid; gap:4px; }
        .metricBox span { color:#9faabe; font-size:11px; text-transform:uppercase; letter-spacing:1px; }
        .metricBox strong { font-size:15px; }
        .progressLabelRow { display:flex; justify-content:space-between; gap:12px; color:#b9c2d0; margin-top:10px; font-size:11px; text-transform:uppercase; letter-spacing:1px; font-weight:900; }
        .gunProgress { height:10px; border-radius:999px; background:#131821; border:1px solid rgba(255,255,255,0.08); overflow:hidden; margin-top:5px; }
        .gunProgressFill { height:100%; background:linear-gradient(90deg, rgba(58,147,227,0.95), rgba(0,247,255,0.9)); box-shadow:0 0 14px rgba(0,247,255,0.25); }
        .deckLine { display:flex; gap:12px; align-items:center; margin:10px 0 12px; }
        .deckTitle { font-size:18px; font-weight:1000; }
        .queueBlock { margin-top:8px; }
        .queueModeCopy { margin-top:8px; color:#d4dae6; font-size:13px; }
        .queueModeCopy--small { color:#9ea8bb; margin-top:2px; }
        .reorderBar { display:flex; gap:8px; margin:10px 0 10px; }
        .queueListRows, .requestList { display:grid; gap:10px; }
        .queueLinearWrap { display:grid; grid-template-columns:1fr 34px; gap:6px; align-items:stretch; }
        .nudgeBtn { width:34px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:linear-gradient(180deg,#4a505c,#262c36); color:white; font-weight:1000; }
        .queueRow { border-radius:14px; padding:8px 10px; display:flex; justify-content:space-between; gap:10px; align-items:center; }
        .queueRowLeft { display:grid; grid-template-columns:28px 42px 1fr; gap:10px; align-items:center; min-width:0; }
        .queueIndex { font-size:26px; font-weight:1000; color:#f0f4fb; text-align:center; }
        .queueText { min-width:0; }
        .queueTitleLine { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .queueTitle { font-size:18px; }
        .dragToken { background:rgba(0,247,255,0.12); border-color:rgba(0,247,255,0.26); color:#e4fbff; }
        .systemLock { color:#b2bac8; }
        .requestTabRow { display:flex; gap:8px; margin-bottom:10px; }
        .requestRow { display:flex; justify-content:space-between; gap:10px; align-items:center; }
        .requestTitleLine { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .requestIndex { width:28px; text-align:center; font-size:30px; font-weight:1000; line-height:1; }
        .requestRowActions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .shoutRow { display:grid; gap:8px; }
        .shoutTop { display:flex; justify-content:space-between; gap:10px; color:#bcc5d3; font-size:12px; }
        .shoutText { color:#eef2f7; font-size:13px; }
        .emptyMini { border-radius:16px; padding:14px; color:#ccd5e2; border:1px dashed rgba(255,255,255,0.14); }
        .sectionLabel--spaced { margin-top:12px; }
        .engineBox, .systemListBox { display:grid; gap:10px; margin-bottom:10px; }
        .engineTopRow { display:flex; justify-content:space-between; gap:8px; align-items:center; }
        .engineTitle { font-size:22px; font-weight:1000; line-height:1.05; }
        .engineGrid { display:grid; grid-template-columns:90px 1fr; gap:8px 10px; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px; }
        .engineKey { color:#afbacd; font-size:12px; }
        .engineVal { font-size:14px; font-weight:700; }
        .gunBtn { height:34px; padding:0 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.18); background:linear-gradient(180deg,#5e6673,#2b313c); color:#f4f7fb; font-size:12px; font-weight:1000; letter-spacing:.7px; text-transform:uppercase; box-shadow: inset 0 1px 0 rgba(255,255,255,0.10); }
        .gunBtn:hover:not(:disabled) { filter:brightness(1.08); }
        .gunBtn:disabled { opacity:.45; cursor:not-allowed; }
        .gunBtn--load, .gunBtn--primary { background:linear-gradient(180deg,#4675b8,#214f90); }
        .gunBtn--play { background:linear-gradient(180deg,#6a6f78,#42474f); }
        .gunBtn--pause, .gunBtn--secondary { background:linear-gradient(180deg,#7d8768,#4c573f); }
        .gunBtn--skip, .gunBtn--danger { background:linear-gradient(180deg,#a45858,#6e2d2d); }
        .gunBtn--done { background:linear-gradient(180deg,#647784,#3e4c56); }
        .gunBtn--magenta { background:linear-gradient(180deg,#8b4a90,#6e2f78); }
        .gunBtn--wide { width:100%; }
        .boothBtnGroup { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
        .boothRoot--compact .mainGrid { grid-template-columns: 1.75fr 0.95fr 1.1fr 0.8fr; }
        .boothRoot--compact .columnPanel { padding:12px; }
        .boothRoot--compact .panelSection, .boothRoot--compact .gunmetalBox, .boothRoot--compact .queueRow { border-radius:14px; }
        .boothRoot--compact .heroLine { grid-template-columns:80px 1fr; gap:10px; }
        .boothRoot--compact .heroArt { width:80px; height:80px; border-radius:14px; }
        .boothRoot--compact .heroTitle { font-size:18px; }
        .boothRoot--compact .metricStrip { grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
        .boothRoot--compact .metricBox { padding:8px; }
        .boothRoot--compact .queueRow { padding:6px 8px; }
        .boothRoot--compact .queueTitle { font-size:15px; }
        .boothRoot--compact .queueMeta, .boothRoot--compact .requestMeta { font-size:12px; }
        .boothRoot--compact .gunBtn { height:30px; padding:0 10px; font-size:11px; border-radius:6px; }
        .boothRoot--compact .requestIndex { font-size:24px; width:22px; }
        .boothRoot--compact .panelHead p, .boothRoot--compact .sectionSub, .boothRoot--compact .queueModeCopy { font-size:12px; }
        @media (max-width: 1500px) { .mainGrid { grid-template-columns:1.5fr 1fr 1.1fr; } .columnPanel:last-child { grid-column: span 3; min-height:unset; } .topControls { min-width:0; } }
        @media (max-width: 1100px) { .boothHeader { flex-direction:column; } .mainGrid { grid-template-columns:1fr; } .columnPanel:last-child { grid-column:auto; } .statGrid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      `}</style>
    </div>
  );
}
