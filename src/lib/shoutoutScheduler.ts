
import { getLegacyProductAlias, getShoutoutProduct } from "@/lib/shoutoutProducts";

export type SchedulerMessage = {
  id: string;
  tier?: string | null;
  approvedAt?: Date | string | null;
  createdAt?: Date | string | null;
  displayDurationSec?: number | null;
};

function toMs(value?: Date | string | null): number | null {
  if (!value) return null;
  const d = new Date(value).getTime();
  return Number.isFinite(d) ? d : null;
}

export function isMessageEligibleNow(msg: SchedulerMessage, nowMs = Date.now()) {
  const startMs = toMs(msg.approvedAt) ?? toMs(msg.createdAt);
  const durationMs = Math.max(0, Number(msg.displayDurationSec || 0)) * 1000;
  if (!startMs || durationMs <= 0) return false;
  return nowMs >= startMs && nowMs < startMs + durationMs;
}

export function getMessageWeight(msg: SchedulerMessage): number {
  const key = getLegacyProductAlias(msg.tier) ?? null;
  return Math.max(1, getShoutoutProduct(key)?.weight || 1);
}

export function buildSmoothWeightedOrder<T extends SchedulerMessage>(items: T[]): T[] {
  if (!items.length) return [];

  const stable = [...items].sort((a, b) => {
    const aApproved = toMs(a.approvedAt) ?? 0;
    const bApproved = toMs(b.approvedAt) ?? 0;
    if (aApproved !== bApproved) return aApproved - bApproved;

    const aCreated = toMs(a.createdAt) ?? 0;
    const bCreated = toMs(b.createdAt) ?? 0;
    if (aCreated !== bCreated) return aCreated - bCreated;

    return String(a.id).localeCompare(String(b.id));
  });

  const state = stable.map((item) => ({ item, weight: getMessageWeight(item), current: 0 }));
  const totalWeight = state.reduce((sum, s) => sum + s.weight, 0);
  const out: T[] = [];

  for (let i = 0; i < totalWeight; i++) {
    let pick = state[0];
    for (const s of state) {
      s.current += s.weight;
      if (s.current > pick.current) pick = s;
    }
    pick.current -= totalWeight;
    out.push(pick.item);
  }

  return out;
}

export function pickCurrentScheduledMessage<T extends SchedulerMessage>(
  items: T[],
  nowMs = Date.now(),
  slotSeconds = 10
): T | null {
  const eligible = items.filter((item) => isMessageEligibleNow(item, nowMs));
  if (!eligible.length) return null;

  const order = buildSmoothWeightedOrder(eligible);
  if (!order.length) return null;

  const slot = Math.floor(nowMs / (Math.max(1, slotSeconds) * 1000));
  return order[slot % order.length] || null;
}
