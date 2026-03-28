"use client";

import { useMemo, useState } from "react";

export type BoothInterstitialAsset = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  previewUrl: string | null;
  playFilename: string | null;
  lastPlayedAt: string | null;
  cooldownMinutes: number;
  cooldownRemainingMinutes: number;
};

type Props = {
  open: boolean;
  category: string | null;
  promptTitle: string | null;
  promptBody: string | null;
  assets: BoothInterstitialAsset[];
  busy?: boolean;
  onPlay: (asset: BoothInterstitialAsset) => Promise<void> | void;
  onSkip: (reason: string) => Promise<void> | void;
  onClose?: () => void;
};

function formatLastPlayed(value: string | null): string {
  if (!value) return "Last played: never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Last played: unknown";

  return `Last played: ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function categoryLabel(value: string | null): string {
  switch (value) {
    case "ANNOUNCEMENTS":
      return "Announcements";
    case "SONG_INTROS":
      return "Song Intros";
    case "GAMES_DANCES":
      return "Games & Dances";
    case "REMIX_PROMOS":
      return "Remix & Promos";
    default:
      return value ?? "Interstitial";
  }
}

export default function InterstitialPromptModal({
  open,
  category,
  promptTitle,
  promptBody,
  assets,
  busy = false,
  onPlay,
  onSkip,
}: Props) {
  const [skipReason, setSkipReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmitSkip = useMemo(() => skipReason.trim().length > 0, [skipReason]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.07),transparent_55%)] animate-pulse" />

      <div className="relative z-[121] w-[min(1280px,94vw)] rounded-[28px] border border-white/10 bg-[#12161d]/95 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <div className="border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="mb-2 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Interstitial Due
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {promptTitle || categoryLabel(category)}
              </h2>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
                {categoryLabel(category)}
              </p>
              {promptBody ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
                  {promptBody}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              Choose an asset or skip with a reason.
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_340px] sm:px-8 sm:py-7">
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              Selectable GIF tiles
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setError(null);
                    try {
                      await onPlay(asset);
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Failed to play asset."
                      );
                    }
                  }}
                  className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] text-left transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-black/30">
                    {asset.previewUrl ? (
                      <img
                        src={asset.previewUrl}
                        alt={asset.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase tracking-[0.18em] text-white/35">
                        No Preview
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-bold text-white">
                        {asset.title}
                      </h3>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                        Play
                      </span>
                    </div>

                    {asset.body ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/68">
                        {asset.body}
                      </p>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-white/45">
                        {formatLastPlayed(asset.lastPlayedAt)}
                      </div>

                      <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                        {asset.playFilename || "No file"}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              Skip Prompt
            </div>

            <h3 className="mt-3 text-xl font-black tracking-tight text-white">
              Skip with reason
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/68">
              Skipping requires a reason and will create a SKIPPED event for admin
              review later.
            </p>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                Reason
              </span>
              <textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="Example: crowd moment, no clean transition, asset doesn't fit current energy..."
                className="min-h-[140px] w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-cyan-300/35"
                disabled={busy}
              />
            </label>

            <button
              type="button"
              disabled={busy || !canSubmitSkip}
              onClick={async () => {
                setError(null);
                try {
                  await onSkip(skipReason.trim());
                  setSkipReason("");
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Failed to skip prompt."
                  );
                }
              }}
              className="mt-4 w-full rounded-2xl border border-amber-300/22 bg-amber-300/12 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-amber-100 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Working..." : "Skip Interstitial"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}