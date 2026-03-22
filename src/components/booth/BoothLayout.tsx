"use client";

import { useEffect, useMemo, useState } from "react";
import EnginePanel from "./EnginePanel";
import NowPlayingCard from "./NowPlayingCard";
import OnDeckCard from "./OnDeckCard";
import PanelShell from "./PanelShell";
import QueueList from "./QueueList";
import RequestPanel from "./RequestPanel";
import ShoutoutPanel from "./ShoutoutPanel";
import {
  deriveRuntimePreview,
  fetchFirstJson,
  isInterstitial,
  normalizeQueue,
  normalizeRequests,
  normalizeShoutouts,
  performQueueAction,
} from "./booth-utils";
import type { BoothActionName, BoothDataState, QueueLikeItem } from "./types";

export default function BoothLayout({ location }: { location: string }) {
  const [state, setState] = useState<BoothDataState>({
    queue: [],
    runtimePreview: null,
    pendingRequests: [],
    pendingShoutouts: [],
    approvedShoutouts: [],
    loading: true,
    lastUpdated: null,
    errors: [],
  });
  const [heroBusy, setHeroBusy] = useState<Record<string, BoothActionName | null>>({});
  const [actionFlash, setActionFlash] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function load() {
    const errors: string[] = [];

    const [queueRes, requestsRes, shoutoutsRes] = await Promise.all([
      fetchFirstJson([`/api/booth/queue/${location}`]),
      fetchFirstJson([`/api/admin/queue/${location}`]),
      fetchFirstJson([`/api/admin/shoutouts/${location}`]),
    ]);

    if (!queueRes.ok) errors.push("Queue feed unavailable");
    if (!requestsRes.ok) errors.push("Requests feed unavailable");
    if (!shoutoutsRes.ok) errors.push("Shoutouts feed unavailable");

    const queue = normalizeQueue(queueRes.data);
    const pendingRequests = normalizeRequests(requestsRes.data);
    const { pendingShoutouts, approvedShoutouts } = normalizeShoutouts(shoutoutsRes.data);
    const runtimePreview = deriveRuntimePreview(queue);

    setState({
      queue,
      runtimePreview,
      pendingRequests,
      pendingShoutouts,
      approvedShoutouts,
      loading: false,
      lastUpdated: new Date().toISOString(),
      errors,
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function guardedLoad() {
      if (cancelled) return;
      await load();
    }

    void guardedLoad();
    const id = window.setInterval(guardedLoad, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [location]);

  useEffect(() => {
    if (!actionFlash) return;
    const id = window.setTimeout(() => setActionFlash(null), 2600);
    return () => window.clearTimeout(id);
  }, [actionFlash]);

  const nowPlaying = useMemo(() => state.queue.find((item) => String(item.status).toUpperCase() === "PLAYING") || null, [state.queue]);
  const loadedItem = useMemo(() => state.queue.find((item) => String(item.status).toUpperCase() === "LOADED") || null, [state.queue]);
  const queuedItems = useMemo(
    () =>
      state.queue.filter((item) => {
        const status = String(item.status || "").toUpperCase();
        return status !== "PLAYING" && status !== "LOADED" && status !== "PLAYED";
      }),
    [state.queue]
  );

  const onDeck = loadedItem || queuedItems[0] || null;
  const queueCount = state.queue.length;
  const interstitialCount = state.queue.filter(isInterstitial).length;
  const songCount = state.queue.filter((item) => !isInterstitial(item)).length;

  async function handleHeroAction(item: QueueLikeItem, action: BoothActionName) {
    setHeroBusy((prev) => ({ ...prev, [item.id]: action }));
    const result = await performQueueAction(location, item, action);
    setHeroBusy((prev) => ({ ...prev, [item.id]: null }));
    setActionFlash({ tone: result.ok ? "success" : "error", message: result.message });
    if (result.ok) {
      await load();
    }
  }

  return (
    <div className="neonRoot">
      <div className="rrWall" />
      <div className="neonWrap boothWrap">
        <header className="boothTopbar">
          <div>
            <div className="boothEyebrow">REMIXREQUESTS • LIVE BOOTH</div>
            <h1 className="boothPageTitle">{location}</h1>
            <div className="boothPageSub">Real-time operator surface. Queue, engine, requests, and shoutouts in one view.</div>
          </div>

          <div className="boothTopbarStats">
            <div className="boothStat">
              <span className="boothStatLabel">Queue</span>
              <span className="boothStatValue">{queueCount}</span>
            </div>
            <div className="boothStat">
              <span className="boothStatLabel">Songs</span>
              <span className="boothStatValue">{songCount}</span>
            </div>
            <div className="boothStat">
              <span className="boothStatLabel">Interstitials</span>
              <span className="boothStatValue">{interstitialCount}</span>
            </div>
            <div className="boothStat">
              <span className="boothStatLabel">Updated</span>
              <span className="boothStatValue boothStatValue--small">{state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : "—"}</span>
            </div>
          </div>
        </header>

        {state.errors.length > 0 ? <div className="boothNotice">Partial data mode: {state.errors.join(" • ")}</div> : null}
        {actionFlash ? (
          <div className={`boothNotice ${actionFlash.tone === "success" ? "boothNotice--success" : "boothNotice--error"}`}>{actionFlash.message}</div>
        ) : null}

        <div className="boothGrid">
          <div className="boothColumn boothColumn--wide">
            <PanelShell title="BOOTH / QUEUE ENGINE" subtitle="Highest-priority control lane. Now Playing, On Deck, and live queue.">
              <div className="boothHeroStack">
                <NowPlayingCard item={nowPlaying} busyAction={nowPlaying ? heroBusy[nowPlaying.id] ?? null : null} onAction={handleHeroAction} />
                <OnDeckCard item={onDeck} busyAction={onDeck ? heroBusy[onDeck.id] ?? null : null} onAction={handleHeroAction} />
              </div>

              <div className="boothSubsectionTitle">LIVE QUEUE</div>
              <QueueList
                items={state.queue}
                location={location}
                onQueueCommitted={(nextQueue) => {
                  setState((prev) => ({ ...prev, queue: nextQueue, lastUpdated: new Date().toISOString() }));
                  void load();
                }}
                onActionComplete={(result, nextQueue) => {
                  setActionFlash({ tone: result.ok ? "success" : "error", message: result.message });
                  if (result.ok && nextQueue) {
                    setState((prev) => ({ ...prev, queue: nextQueue, lastUpdated: new Date().toISOString() }));
                    void load();
                  }
                }}
              />
            </PanelShell>
          </div>

          <div className="boothColumn">
            <EnginePanel
              location={location}
              runtimePreview={state.runtimePreview}
              queue={state.queue}
              onMaterialized={(result) => {
                setActionFlash({ tone: result.ok ? "success" : "error", message: result.message });
                if (result.ok) void load();
              }}
            />
          </div>

          <div className="boothColumn">
            <RequestPanel
              requests={state.pendingRequests}
              onActionComplete={(result) => {
                setActionFlash({ tone: result.ok ? "success" : "error", message: result.message });
                if (result.ok) void load();
              }}
            />
          </div>

          <div className="boothColumn">
            <ShoutoutPanel
              pendingShoutouts={state.pendingShoutouts}
              approvedShoutouts={state.approvedShoutouts}
              onActionComplete={(result) => {
                setActionFlash({ tone: result.ok ? "success" : "error", message: result.message });
                if (result.ok) void load();
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .boothWrap {
          --boothBorder: rgba(255, 255, 255, 0.12);
          --boothSurface: rgba(8, 12, 30, 0.7);
          --boothSurfaceStrong: rgba(13, 18, 40, 0.88);
          --boothSurfaceSoft: rgba(255, 255, 255, 0.045);
        }

        .boothTopbar {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          margin-bottom: 16px;
          padding: 18px 20px;
          border: 1px solid var(--boothBorder);
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(0, 247, 255, 0.12), transparent 28%),
            radial-gradient(circle at top right, rgba(255, 57, 212, 0.14), transparent 28%),
            linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
          box-shadow: var(--shadow), var(--glowA), inset 0 1px 0 rgba(255,255,255,0.04);
          backdrop-filter: blur(16px);
        }

        .boothEyebrow {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.8px;
          color: var(--muted);
          margin-bottom: 6px;
        }

        .boothPageTitle {
          margin: 0;
          font-size: 32px;
          line-height: 1;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .boothPageSub {
          margin-top: 8px;
          color: var(--muted);
          max-width: 720px;
          font-size: 13px;
        }

        .boothTopbarStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(92px, 1fr));
          gap: 10px;
          width: min(100%, 500px);
        }

        .boothStat {
          padding: 13px;
          border-radius: 18px;
          border: 1px solid var(--boothBorder);
          background: rgba(255,255,255,0.045);
          display: grid;
          gap: 6px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .boothStatLabel {
          font-size: 10px;
          font-weight: 1000;
          color: var(--muted);
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .boothStatValue {
          font-size: 24px;
          font-weight: 1000;
          line-height: 1;
        }

        .boothStatValue--small {
          font-size: 13px;
          font-weight: 800;
        }

        .boothNotice {
          margin-bottom: 12px;
          padding: 12px 14px;
          border-radius: 18px;
          border: 1px solid rgba(255, 204, 0, 0.24);
          background: rgba(255, 204, 0, 0.08);
          color: rgba(255,255,255,0.94);
          font-size: 13px;
          font-weight: 800;
        }

        .boothNotice--success {
          border-color: rgba(0,247,255,0.28);
          background: rgba(0,247,255,0.09);
        }

        .boothNotice--error {
          border-color: rgba(255,120,120,0.28);
          background: rgba(255,120,120,0.08);
        }

        .boothGrid {
          display: grid;
          grid-template-columns: 1.65fr 1fr 1fr 1fr;
          gap: 14px;
          align-items: start;
        }

        .boothColumn { min-width: 0; }

        :global(.boothPanel) {
          min-height: 760px;
          padding: 16px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top left, rgba(0, 247, 255, 0.08), transparent 28%),
            radial-gradient(circle at top right, rgba(255, 57, 212, 0.1), transparent 28%),
            var(--boothSurface);
          backdrop-filter: blur(14px);
          box-shadow: var(--shadow), inset 0 1px 0 rgba(255,255,255,0.04);
          border: 1px solid var(--boothBorder);
        }

        :global(.boothPanelHeader) {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        :global(.boothPanelTitle) {
          font-size: 15px;
          font-weight: 1000;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        :global(.boothPanelSub) {
          margin-top: 4px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.4;
        }

        :global(.boothPanelBody) {
          display: grid;
          gap: 14px;
        }

        .boothHeroStack {
          display: grid;
          gap: 12px;
        }

        :global(.boothHeroCard) {
          border: 1px solid var(--boothBorder);
          border-radius: 22px;
          padding: 14px;
          background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
          display: grid;
          gap: 12px;
        }

        :global(.boothHeroCard--now.is-live) {
          box-shadow: var(--glowA), inset 0 1px 0 rgba(255,255,255,0.04);
        }

        :global(.boothHeroCard--deck) {
          box-shadow: var(--glowB), inset 0 1px 0 rgba(255,255,255,0.03);
        }

        :global(.boothHeroHeader) {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        :global(.boothHeroLabel),
        :global(.boothSubsectionTitle),
        :global(.boothRequestSectionTitle) {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.5px;
          color: var(--muted);
          text-transform: uppercase;
        }

        :global(.boothHeroKicker) {
          margin-top: 4px;
          font-size: 12px;
          color: var(--muted);
        }

        :global(.boothHeroMain) {
          display: grid;
          grid-template-columns: 84px 1fr;
          gap: 14px;
          align-items: center;
        }

        :global(.boothHeroMain--large) {
          grid-template-columns: 112px 1fr;
          align-items: stretch;
        }

        :global(.boothHeroArt),
        :global(.boothQueueArt) {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.14);
          background: radial-gradient(circle at 30% 25%, rgba(0,247,255,0.28), transparent 55%), radial-gradient(circle at 75% 80%, rgba(255,57,212,0.22), transparent 62%), rgba(255,255,255,0.07);
        }

        :global(.boothHeroArt) {
          width: 84px;
          height: 84px;
          border-radius: 18px;
          box-shadow: var(--glowA);
        }

        :global(.boothHeroArt--poster) {
          width: 112px;
          height: 112px;
          border-radius: 22px;
        }

        :global(.boothHeroArt--small) {
          width: 68px;
          height: 68px;
          border-radius: 16px;
        }

        :global(.boothHeroArt--system),
        :global(.boothQueueArt--system) {
          background: radial-gradient(circle at 30% 25%, rgba(255,57,212,0.32), transparent 55%), radial-gradient(circle at 75% 80%, rgba(255,204,0,0.18), transparent 62%), rgba(255,255,255,0.07);
          box-shadow: var(--glowB);
        }

        :global(.boothHeroArtImg),
        :global(.boothQueueArtImg) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        :global(.boothHeroArtFallback),
        :global(.boothQueueArtFallback) {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          font-size: 28px;
          font-weight: 1000;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.92);
        }

        :global(.boothQueueArtFallback) { font-size: 14px; }

        :global(.boothHeroTitleLine),
        :global(.boothDeckTitleLine),
        :global(.boothQueueTitleLine),
        :global(.boothRequestTitleLine) {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        :global(.boothHeroTitle) {
          font-size: 25px;
          font-weight: 1000;
          line-height: 1.04;
        }

        :global(.boothDeckTitle) {
          font-size: 18px;
          font-weight: 1000;
        }

        :global(.boothHeroMeta),
        :global(.boothDeckMeta),
        :global(.boothQueueMeta),
        :global(.boothRequestMeta),
        :global(.boothShoutoutMeta) {
          margin-top: 6px;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.4;
        }

        :global(.boothHeroMeta--big) { font-size: 13px; }

        :global(.boothHeroReadouts) {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        :global(.boothReadout) {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          padding: 9px 10px;
          display: grid;
          gap: 4px;
        }

        :global(.boothReadout span) {
          font-size: 10px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 900;
        }

        :global(.boothReadout strong) {
          font-size: 13px;
          font-weight: 900;
        }

        :global(.boothProgress) {
          width: 100%;
          height: 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          margin-top: 12px;
        }

        :global(.boothProgress--hero) { height: 14px; }

        :global(.boothProgressFill) {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(0,247,255,0.95), rgba(255,57,212,0.88));
          box-shadow: var(--glowA), var(--glowB);
        }

        :global(.boothProgressMeta) {
          margin-top: 7px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 900;
        }

        :global(.boothQueueList),
        :global(.boothRequestList),
        :global(.boothShoutoutList) {
          display: grid;
          gap: 10px;
        }

        :global(.boothQueueRow),
        :global(.boothRequestRow),
        :global(.boothShoutoutRow),
        :global(.boothEngineCard) {
          border: 1px solid var(--boothBorder);
          border-radius: 18px;
          background: rgba(255,255,255,0.04);
        }

        :global(.boothQueueRow) {
          padding: 12px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
        }

        :global(.boothQueueRow--system) {
          border-color: rgba(255,57,212,0.28);
          background: linear-gradient(180deg, rgba(255,57,212,0.09), rgba(255,255,255,0.03));
        }

        :global(.boothQueueRow--canDrag:hover) {
          transform: translateY(-1px);
          border-color: rgba(0,247,255,0.28);
          box-shadow: var(--glowA);
        }

        :global(.boothQueueRow--dropTarget) {
          border-color: rgba(0,247,255,0.34);
          box-shadow: var(--glowA);
        }

        :global(.boothQueueRow--dragging) { opacity: 0.55; }

        :global(.boothQueueRowLeft) {
          min-width: 0;
          flex: 1;
          display: grid;
          grid-template-columns: 36px 46px 1fr;
          gap: 10px;
          align-items: center;
        }

        :global(.boothQueueIndex),
        :global(.boothRequestIndex) {
          font-weight: 1000;
          font-size: 19px;
          color: rgba(255,255,255,0.9);
          text-align: center;
        }

        :global(.boothQueueArt) {
          width: 46px;
          height: 46px;
          border-radius: 12px;
        }

        :global(.boothQueueMain),
        :global(.boothRequestMain) { min-width: 0; }

        :global(.boothQueueTitle),
        :global(.boothRequestTitle) {
          font-size: 14px;
          font-weight: 1000;
          line-height: 1.12;
          word-break: break-word;
        }

        :global(.boothQueueRowRight) { flex: 0 0 auto; }

        :global(.boothActionBar),
        :global(.boothInlineActions) {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        :global(.boothActionBar--compact) { margin-top: 8px; }

        :global(.boothActionBtn),
        :global(.boothToolbarBtn) {
          appearance: none;
          border: 1px solid rgba(255,255,255,0.14);
          background: linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          color: rgba(255,255,255,0.95);
          border-radius: 12px;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          cursor: pointer;
          transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease, opacity 0.14s ease;
        }

        :global(.boothActionBtn:hover:not(:disabled)),
        :global(.boothToolbarBtn:hover:not(:disabled)) {
          transform: translateY(-1px);
          box-shadow: var(--glowA);
        }

        :global(.boothActionBtn:disabled),
        :global(.boothToolbarBtn:disabled) {
          opacity: 0.55;
          cursor: not-allowed;
        }

        :global(.boothActionBtn--play) { border-color: rgba(0,247,255,0.28); box-shadow: var(--glowA); }
        :global(.boothActionBtn--load) { border-color: rgba(255,57,212,0.24); box-shadow: var(--glowB); }
        :global(.boothActionBtn--hold) { border-color: rgba(255,204,0,0.28); }
        :global(.boothActionBtn--skip) { border-color: rgba(255,120,120,0.28); }
        :global(.boothActionBtn--played) { border-color: rgba(140,255,170,0.22); }
        :global(.boothToolbarBtn--primary) { border-color: rgba(255,57,212,0.28); box-shadow: var(--glowB); }

        :global(.boothEngineCard) { padding: 14px; }
        :global(.boothEngineCard--hero) { box-shadow: var(--glowB); }

        :global(.boothEngineHeader) {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        :global(.boothEngineLabel) {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 6px;
        }

        :global(.boothEngineAction) {
          font-size: 24px;
          font-weight: 1000;
          line-height: 1.06;
          text-transform: uppercase;
        }

        :global(.boothEngineList) {
          display: grid;
          gap: 8px;
          margin-top: 14px;
        }

        :global(.boothEngineRow) {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          font-size: 12px;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 8px;
        }

        :global(.boothEngineRow span) { color: var(--muted); }

        :global(.boothEngineExplain) {
          margin-top: 12px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.9);
          font-size: 12px;
          line-height: 1.45;
        }

        :global(.boothEngineActions) { margin-top: 12px; }

        :global(.boothMiniStats) {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        :global(.boothRequestSectionTitle) { margin-top: 2px; }

        :global(.boothRequestRow) {
          padding: 12px;
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 10px;
          align-items: flex-start;
        }

        :global(.boothRequestRow--actionable) {
          background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025));
        }

        :global(.boothShoutoutSplit) { display: grid; gap: 14px; }

        :global(.boothShoutoutRow) { padding: 12px; }
        :global(.boothShoutoutRow--pending) { background: linear-gradient(180deg, rgba(255,204,0,0.06), rgba(255,255,255,0.03)); }

        :global(.boothShoutoutTop) {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 8px;
        }

        :global(.boothShoutoutText) {
          font-size: 13px;
          line-height: 1.45;
          color: rgba(255,255,255,0.94);
        }

        :global(.boothBadge) {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.18);
          font-size: 10px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          white-space: nowrap;
        }

        :global(.boothBadge--default) { border-color: rgba(255,255,255,0.14); }
        :global(.boothBadge--cyan) { border-color: rgba(0,247,255,0.32); box-shadow: var(--glowA); }
        :global(.boothBadge--pink) { border-color: rgba(255,57,212,0.32); box-shadow: var(--glowB); }
        :global(.boothBadge--gold) { border-color: rgba(255,204,0,0.35); }
        :global(.boothBadge--warn) { border-color: rgba(255,120,120,0.35); }
        :global(.boothBadge--muted) { opacity: 0.74; }

        :global(.boothEmptyState) {
          padding: 14px;
          border-radius: 16px;
          border: 1px dashed rgba(255,255,255,0.14);
          color: var(--muted);
          font-size: 13px;
          background: rgba(255,255,255,0.025);
        }

        :global(.boothEmptyState--hero) { min-height: 90px; display: grid; place-items: center; }

        :global(.boothDragHandleWrap) {
          display: grid;
          justify-items: end;
          gap: 6px;
        }

        :global(.boothDragHandle) {
          font-size: 18px;
          line-height: 1;
          color: rgba(255,255,255,0.6);
          user-select: none;
        }

        @media (max-width: 1440px) {
          .boothGrid { grid-template-columns: 1.4fr 1fr 1fr; }
          .boothColumn:last-child { grid-column: span 3; }
          :global(.boothPanel) { min-height: 0; }
        }

        @media (max-width: 1120px) {
          .boothGrid { grid-template-columns: 1fr 1fr; }
          .boothColumn:last-child { grid-column: auto; }
          .boothTopbar { flex-direction: column; }
          .boothTopbarStats { width: 100%; }
          :global(.boothHeroReadouts) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 720px) {
          .boothGrid { grid-template-columns: 1fr; }
          .boothTopbarStats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          :global(.boothHeroMain), :global(.boothHeroMain--large) { grid-template-columns: 72px 1fr; }
          :global(.boothHeroArt), :global(.boothHeroArt--poster) { width: 72px; height: 72px; }
          :global(.boothHeroTitle) { font-size: 20px; }
          :global(.boothEngineAction) { font-size: 20px; }
        }
      `}</style>
    </div>
  );
}
