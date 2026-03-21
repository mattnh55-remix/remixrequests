export function normalizeDurationSec(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;

  const rounded = Math.round(num);
  if (rounded <= 0) return null;
  if (rounded > 60 * 60 * 6) return null;

  return rounded;
}

export function computeExpectedEndAt(
  playingAt: Date | null | undefined,
  durationSec: number | null | undefined
): Date | null {
  if (!playingAt || !durationSec || durationSec <= 0) return null;
  return new Date(playingAt.getTime() + durationSec * 1000);
}

export function getRuntimeProgress(input: {
  now?: Date;
  playingAt?: Date | null;
  durationSec?: number | null;
  expectedEndAt?: Date | null;
}) {
  const now = input.now ?? new Date();
  const playingAt = input.playingAt ?? null;
  const durationSec = input.durationSec ?? null;
  const expectedEndAt = input.expectedEndAt ?? null;

  if (!playingAt || !durationSec || durationSec <= 0) {
    return {
      startedAt: playingAt ? playingAt.toISOString() : null,
      durationSec: durationSec ?? null,
      expectedEndAt: expectedEndAt ? expectedEndAt.toISOString() : null,
      elapsedSec: null,
      remainingSec: null,
      progressPercent: 0,
      isEndingSoon: false,
    };
  }

  const elapsedSec = Math.max(0, Math.floor((now.getTime() - playingAt.getTime()) / 1000));
  const remainingSec = Math.max(0, durationSec - elapsedSec);
  const progressPercent = Math.max(0, Math.min(100, (elapsedSec / durationSec) * 100));

  return {
    startedAt: playingAt.toISOString(),
    durationSec,
    expectedEndAt: (expectedEndAt ?? computeExpectedEndAt(playingAt, durationSec))?.toISOString() ?? null,
    elapsedSec,
    remainingSec,
    progressPercent,
    isEndingSoon: remainingSec <= 20,
  };
}
