import { prisma } from "./db";

export const GUEST_SESSION_HOURS = 4;

export type GuestIdentitySession = {
  id: string;
  emailHash: string;
  smsVerifiedAt: Date | null;
  emailOptInAt: Date | null;
  sessionStartedAt: Date | null;
  sessionExpiresAt: Date | null;
};

function clampBalance(value: number) {
  return value < 0 ? 0 : value;
}

export function buildGuestSessionTimes(from = new Date(), hours = GUEST_SESSION_HOURS) {
  const startedAt = new Date(from);
  const expiresAt = new Date(startedAt.getTime() + hours * 60 * 60 * 1000);
  return { startedAt, expiresAt };
}

export function isGuestSessionActive(
  identity:
    | Pick<GuestIdentitySession, "smsVerifiedAt" | "sessionExpiresAt">
    | null
    | undefined,
  now = new Date()
) {
  return Boolean(identity?.smsVerifiedAt && identity?.sessionExpiresAt && identity.sessionExpiresAt > now);
}

export async function getOrCreateCurrentSession(locationId: string, sessionHours: number) {
  const now = new Date();

  const latest = await prisma.session.findFirst({
    where: { locationId },
    orderBy: { startedAt: "desc" },
  });

  if (latest && latest.endsAt > now) return latest;

  const endsAt = new Date(now.getTime() + sessionHours * 60 * 60 * 1000);
  return prisma.session.create({
    data: { locationId, startedAt: now, endsAt },
  });
}

export async function getGuestIdentityByEmailHash(locationId: string, emailHash: string) {
  return prisma.identity.findUnique({
    where: { locationId_emailHash: { locationId, emailHash } },
    select: {
      id: true,
      emailHash: true,
      smsVerifiedAt: true,
      emailOptInAt: true,
      sessionStartedAt: true,
      sessionExpiresAt: true,
    },
  });
}

export async function getGuestIdentityById(locationId: string, identityId: string) {
  return prisma.identity.findFirst({
    where: { id: identityId, locationId },
    select: {
      id: true,
      emailHash: true,
      smsVerifiedAt: true,
      emailOptInAt: true,
      sessionStartedAt: true,
      sessionExpiresAt: true,
    },
  });
}

export async function getCreditBalance(locationId: string, emailHash: string, now = new Date()) {
  const agg = await prisma.creditLedger.aggregate({
    where: {
      locationId,
      emailHash,
      expiresAt: { gt: now },
    },
    _sum: { delta: true },
  });

  return clampBalance(Number(agg._sum.delta ?? 0));
}

export async function getIdentitySpendableState(locationId: string, identityId: string, now = new Date()) {
  const identity = await getGuestIdentityById(locationId, identityId);
  if (!identity) return null;

  const sessionActive = isGuestSessionActive(identity, now);
  const balance = sessionActive
    ? await getCreditBalance(locationId, identity.emailHash, now)
    : 0;

  return {
    identity,
    sessionActive,
    sessionStartedAt: identity.sessionStartedAt,
    sessionExpiresAt: identity.sessionExpiresAt,
    balance,
  };
}

export async function getEmailHashSpendableState(locationId: string, emailHash: string, now = new Date()) {
  const identity = await getGuestIdentityByEmailHash(locationId, emailHash);
  if (!identity) return null;

  const sessionActive = isGuestSessionActive(identity, now);
  const balance = sessionActive
    ? await getCreditBalance(locationId, emailHash, now)
    : 0;

  return {
    identity,
    sessionActive,
    sessionStartedAt: identity.sessionStartedAt,
    sessionExpiresAt: identity.sessionExpiresAt,
    balance,
  };
}

export async function secondsSinceLastAction(locationId: string, emailHash: string) {
  const last = await prisma.creditLedger.findFirst({
    where: { locationId, emailHash },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return Number.POSITIVE_INFINITY;
  return (Date.now() - last.createdAt.getTime()) / 1000;
}
