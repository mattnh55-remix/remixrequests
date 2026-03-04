import { prisma } from "./db";

export async function getOrCreateCurrentSession(locationId: string, sessionHours: number) {
  const now = new Date();

  const latest = await prisma.session.findFirst({
    where: { locationId },
    orderBy: { startedAt: "desc" }
  });

  if (latest && latest.endsAt > now) return latest;

  const endsAt = new Date(now.getTime() + sessionHours * 60 * 60 * 1000);
  return prisma.session.create({
    data: { locationId, startedAt: now, endsAt }
  });
}

export async function getCreditBalance(locationId: string, emailHash: string) {
  const now = new Date();
  const rows = await prisma.creditLedger.findMany({
    where: {
      locationId,
      emailHash,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
  return rows.reduce((a, r) => a + r.delta, 0);
}

export async function secondsSinceLastAction(locationId: string, emailHash: string) {
  const last = await prisma.creditLedger.findFirst({
    where: { locationId, emailHash },
    orderBy: { createdAt: "desc" }
  });
  if (!last) return Number.POSITIVE_INFINITY;
  return (Date.now() - last.createdAt.getTime()) / 1000;
}
