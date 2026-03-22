"use client";

import { useEffect, useMemo, useState } from "react";
import EnginePanel from "./EnginePanel";
import NowPlayingCard from "./NowPlayingCard";
import OnDeckCard from "./OnDeckCard";
import PanelShell from "./PanelShell";
import QueueList from "./QueueList";
import RequestPanel from "./RequestPanel";
import ShoutoutPanel from "./ShoutoutPanel";
import { fetchFirstJson, isInterstitial, normalizeQueue } from "./booth-utils";
import type { BoothDataState, RequestItem, RuntimePreview, ShoutoutItem } from "./types";

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

  async function load() {
    const errors: string[] = [];

    const [queueRes, previewRes, requestsRes, shoutoutsRes] = await Promise.all([
      fetchFirstJson([
        `/api/booth/queue/${location}`,
        `/api/booth/runtime/${location}`,
        `/api/admin/queue/${location}`,
      ]),
      fetchFirstJson([
        `/api/booth/runtime/next-action/${location}`,
        `/api/booth/runtime/preview/${location}`,
        `/api/booth/next-action/${location}`,
      ]),
      fetchFirstJson([
        `/api/admin/queue/${location}`,
        `/api/requests/${location}`,
      ]),
      fetchFirstJson([
        `/api/admin/shoutouts/${location}`,
        `/api/shoutouts/${location}`,
      ]),
    ]);

    if (!queueRes.ok) errors.push("Queue feed unavailable");
    if (!previewRes.ok) errors.push("Engine preview unavailable");
    if (!requestsRes.ok) errors.push("Requests feed unavailable");
    if (!shoutoutsRes.ok) errors.push("Shoutouts feed unavailable");

    const queue = normalizeQueue(queueRes.data);

    const requestsPayload = requestsRes.data || {};
    const shoutoutsPayload = shoutoutsRes.data || {};

    const pendingRequests: RequestItem[] = Array.isArray(requestsPayload.pending || requestsPayload.upNext)
      ? (requestsPayload.pending || requestsPayload.upNext).map((item: any) => ({
          id: String(item.id),
          title: item.title ?? "Untitled",
          artist: item.artist ?? "Unknown artist",
          score: Number(item.score ?? 0),
          type: item.type ?? null,
          boosted: Boolean(item.boosted),
          requestedByLabel: item.requestedByLabel ?? null,
        }))
      : [];

    const pendingShoutouts: ShoutoutItem[] = Array.isArray(shoutoutsPayload.pending)
      ? shoutoutsPayload.pending.map((item: any) => ({
          id: String(item.id),
          fromName: item.fromName ?? "Guest",
          messageText: item.messageText ?? "",
          tier: item.tier ?? "",
          status: item.status ?? "PENDING",
          createdAt: item.createdAt ?? null,
        }))
      : [];

    const approvedShoutouts: ShoutoutItem[] = Array.isArray(shoutoutsPayload.approved)
      ? shoutoutsPayload.approved.map((item: any) => ({
          id: String(item.id),
          fromName: item.fromName ?? "Guest",
          messageText: item.messageText ?? "",
          tier: item.tier ?? "",
          status: item.status ?? "APPROVED",
          createdAt: item.createdAt ?? null,
        }))
      : [];

    const runtimePreview: RuntimePreview | null =
      previewRes.data?.preview ||
      previewRes.data?.nextAction ||
      previewRes.data?.action ||
      previewRes.data ||
      null;

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

  const nowPlaying = useMemo(
    () => state.queue.find((item) => String(item.status).toUpperCase() === "PLAYING") || null,
    [state.queue]
  );

  const loadedItem = useMemo(
    () => state.queue.find((item) => String(item.status).toUpperCase() === "LOADED") || null,
    [state.queue]
  );

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

  return (
    <div className="neonRoot">
      <div className="rrWall" />
      <div className="neonWrap boothWrap">
        <header className="boothTopbar">
          <div>
            <div className="boothEyebrow">REMIXREQUESTS • LIVE BOOTH</div>
            <h1 className="boothPageTitle">{location}</h1>
            <div className="boothPageSub">
              Real-time operator surface. Queue, engine, requests, and shoutouts in one view.
            </div>
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
              <span className="boothStatValue boothStatValue--small">
                {state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : "—"}
              </span>
            </div>
          </div>
        </header>

        {state.errors.length > 0 ? (
          <div className="boothNotice">Partial data mode: {state.errors.join(" • ")}</div>
        ) : null}

        <div className="boothGrid">
          <div className="boothColumn boothColumn--wide">
            <PanelShell
              title="BOOTH / QUEUE ENGINE"
              subtitle="Highest-priority control lane. Now Playing, On Deck, and live queue."
            >
              <div className="boothHeroStack">
                <NowPlayingCard item={nowPlaying} />
                <OnDeckCard item={onDeck} />
              </div>

              <div className="boothSubsectionTitle">LIVE QUEUE</div>
              <QueueList
                items={state.queue}
                location={location}
                onQueueCommitted={(nextQueue) => {
                  setState((prev) => ({
                    ...prev,
                    queue: nextQueue,
                    lastUpdated: new Date().toISOString(),
                  }));
                  void load();
                }}
              />
            </PanelShell>
          </div>

          <div className="boothColumn">
            <EnginePanel runtimePreview={state.runtimePreview} queue={state.queue} />
          </div>

          <div className="boothColumn">
            <RequestPanel pendingRequests={state.pendingRequests} />
          </div>

          <div className="boothColumn">
            <ShoutoutPanel
              pendingShoutouts={state.pendingShoutouts}
              approvedShoutouts={state.approvedShoutouts}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .boothWrap {
          --boothBorder: rgba(255, 255, 255, 0.12);
          --boothBg: rgba(7, 10, 24, 0.72);
        }

        .boothTopbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 14px;
          padding: 16px 18px;
          border: 1px solid var(--boothBorder);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
          box-shadow: var(--shadow), var(--glowA);
          backdrop-filter: blur(14px);
        }

        .boothEyebrow {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.6px;
          color: var(--muted);
          margin-bottom: 6px;
        }

        .boothPageTitle {
          margin: 0;
          font-size: 30px;
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
          width: min(100%, 520px);
        }

        .boothStat {
          padding: 12px;
          border-radius: 18px;
          border: 1px solid var(--boothBorder);
          background: rgba(255,255,255,0.05);
          display: grid;
          gap: 6px;
        }

        .boothStatLabel {
          font-size: 11px;
          font-weight: 900;
          color: var(--muted);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .boothStatValue {
          font-size: 22px;
          font-weight: 1000;
          line-height: 1;
        }

        .boothStatValue--small {
          font-size: 13px;
          font-weight: 800;
        }

        .boothNotice {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 18px;
          border: 1px solid rgba(255, 204, 0, 0.28);
          background: rgba(255, 204, 0, 0.08);
          color: rgba(255,255,255,0.92);
          font-size: 13px;
          font-weight: 800;
        }

        .boothGrid {
          display: grid;
          grid-template-columns: 1.55fr 1fr 1fr 1fr;
          gap: 12px;
          align-items: start;
        }

        .boothColumn {
          min-width: 0;
        }

        .boothColumn--wide {
          min-width: 0;
        }

        .boothHeroStack {
          display: grid;
          gap: 12px;
        }

        .boothSubsectionTitle {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.5px;
          color: var(--muted);
          text-transform: uppercase;
          margin-top: 2px;
        }

        .boothQueueManager {
          display: grid;
          gap: 12px;
        }

        .boothQueueToolbar {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          padding: 12px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
        }

        .boothQueueToolbarTitle {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.3px;
          text-transform: uppercase;
          color: var(--muted);
        }

        .boothQueueToolbarSub {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(255,255,255,0.84);
        }

        .boothQueueToolbarRight {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .boothQueueToolbarPill {
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0,247,255,0.24);
          background: rgba(0,247,255,0.08);
          font-size: 11px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .boothToolbarBtn {
          appearance: none;
          border: 1px solid rgba(255,57,212,0.28);
          background: linear-gradient(180deg, rgba(255,57,212,0.18), rgba(255,57,212,0.08));
          color: white;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 1000;
          cursor: pointer;
          box-shadow: var(--glowB);
        }

        .boothToolbarBtn:disabled {
          cursor: default;
          opacity: 0.65;
          box-shadow: none;
        }

        .boothToolbarBtn--ghost {
          border-color: rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.05);
          box-shadow: none;
        }

        .boothToolbarBtn--muted {
          border-color: rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          box-shadow: none;
        }

        .boothQueueFeedback {
          padding: 10px 12px;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 800;
        }

        .boothQueueFeedback--error {
          border: 1px solid rgba(255,120,120,0.24);
          background: rgba(255,120,120,0.08);
        }

        .boothQueueFeedback--success {
          border: 1px solid rgba(0,247,255,0.24);
          background: rgba(0,247,255,0.08);
        }

        .boothQueueList {
          display: grid;
          gap: 10px;
        }

        .boothQueueRow,
        .boothRequestRow,
        .boothShoutoutRow,
        .boothEngineCard {
          border: 1px solid var(--boothBorder);
          border-radius: 18px;
          background: rgba(255,255,255,0.04);
        }

        .boothQueueRow {
          padding: 12px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
        }

        .boothQueueRow--system {
          border-color: rgba(255,57,212,0.28);
          background: linear-gradient(180deg, rgba(255,57,212,0.08), rgba(255,255,255,0.03));
        }

        .boothQueueRow--compact {
          padding: 10px;
        }

        .boothQueueRow--canDrag {
          cursor: grab;
        }

        .boothQueueRow--canDrag:hover {
          border-color: rgba(0,247,255,0.28);
          box-shadow: var(--glowA);
          transform: translateY(-1px);
        }

        .boothQueueRow--dropTarget {
          border-color: rgba(255,57,212,0.32);
          box-shadow: var(--glowB);
        }

        .boothQueueRow--dragging {
          opacity: 0.55;
          transform: scale(0.99);
        }

        .boothQueueRowLeft {
          min-width: 0;
          flex: 1;
          display: grid;
          grid-template-columns: 34px 42px 1fr;
          gap: 10px;
          align-items: center;
        }

        .boothQueueIndex,
        .boothRequestIndex {
          font-weight: 1000;
          font-size: 18px;
          color: rgba(255,255,255,0.88);
          text-align: center;
        }

        .boothQueueArt {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.14);
          background: radial-gradient(circle at 30% 25%, rgba(0,247,255,0.22), transparent 55%),
                      radial-gradient(circle at 75% 80%, rgba(255,57,212,0.18), transparent 62%),
                      rgba(255,255,255,0.07);
        }

        .boothQueueArt--system {
          background: radial-gradient(circle at 30% 25%, rgba(255,57,212,0.26), transparent 55%),
                      radial-gradient(circle at 75% 80%, rgba(255,204,0,0.16), transparent 62%),
                      rgba(255,255,255,0.07);
        }

        .boothQueueMain,
        .boothRequestMain {
          min-width: 0;
        }

        .boothQueueTitle,
        .boothRequestTitle {
          font-size: 14px;
          font-weight: 1000;
          line-height: 1.1;
          word-break: break-word;
        }

        .boothQueueTitleLine,
        .boothRequestTitleLine {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .boothQueueMeta,
        .boothRequestMeta,
        .boothShoutoutMeta {
          margin-top: 6px;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.35;
        }

        .boothDragHandleWrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .boothDragHandle {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.74);
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .boothEmptyState {
          padding: 14px;
          border-radius: 16px;
          border: 1px dashed rgba(255,255,255,0.14);
          color: var(--muted);
          font-size: 13px;
        }

        @media (max-width: 1440px) {
          .boothGrid {
            grid-template-columns: 1.35fr 1fr 1fr;
          }

          .boothColumn:last-child {
            grid-column: span 3;
          }
        }

        @media (max-width: 1120px) {
          .boothGrid {
            grid-template-columns: 1fr 1fr;
          }

          .boothColumn,
          .boothColumn:last-child {
            grid-column: auto;
          }

          .boothTopbar {
            flex-direction: column;
          }

          .boothTopbarStats {
            width: 100%;
          }

          .boothQueueToolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .boothQueueToolbarRight {
            justify-content: flex-start;
          }
        }

        @media (max-width: 720px) {
          .boothGrid {
            grid-template-columns: 1fr;
          }

          .boothTopbarStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
