// src/app/api/admin/user-history/[location]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

type RecentUserFilter = "qualifying" | "redeem" | "purchase" | "both";

function normalizeFilter(raw: string | null): RecentUserFilter {
  if (raw === "redeem" || raw === "purchase" || raw === "both") return raw;
  return "qualifying";
}

function isRedeemReason(reason?: string | null) {
  return String(reason || "").toLowerCase().startsWith("redeem:");
}

function isPurchaseReason(reason?: string | null) {
  const r = String(reason || "").toLowerCase();
  return (
    r.includes("purchase") ||
    r.includes("payment") ||
    r.includes("checkout") ||
    r.includes("square") ||
    r.includes("pack")
  );
}

function matchesFilter(filter: RecentUserFilter, flags: { redeemed: boolean; purchased: boolean }) {
  if (filter === "redeem") return flags.redeemed;
  if (filter === "purchase") return flags.purchased;
  if (filter === "both") return flags.redeemed && flags.purchased;
  return flags.redeemed || flags.purchased;
}

function labelFor(emailHash: string, phoneE164?: string | null) {
  if (phoneE164) {
    const suffix = phoneE164.slice(-4);
    return `User • ${suffix}`;
  }
  return `User ${emailHash.slice(0, 8)}`;
}

async function resolveLocationId(slug: string) {
  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true },
  });
  return location?.id || null;
}

function buildQualifyingWhere(locationId: string) {
  return {
    locationId,
    OR: [
      { reason: { startsWith: "redeem:" } },
      { reason: { contains: "purchase", mode: "insensitive" as const } },
      { reason: { contains: "payment", mode: "insensitive" as const } },
      { reason: { contains: "checkout", mode: "insensitive" as const } },
      { reason: { contains: "square", mode: "insensitive" as const } },
      { reason: { contains: "pack", mode: "insensitive" as const } },
    ],
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { location: string } }
) {
  try {
    const locationId = await resolveLocationId(params.location);
    if (!locationId) {
      return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 50)));
    const filter = normalizeFilter(url.searchParams.get("filter"));

    const grouped = await prisma.creditLedger.groupBy({
      by: ["emailHash"],
      where: buildQualifyingWhere(locationId),
      _max: { createdAt: true },
    });

    const sorted = [...grouped].sort((a, b) => {
      const aTime = a._max.createdAt ? new Date(a._max.createdAt).getTime() : 0;
      const bTime = b._max.createdAt ? new Date(b._max.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const allQualifyingRows = await prisma.creditLedger.findMany({
      where: {
        locationId,
        emailHash: { in: sorted.map((row) => row.emailHash) },
      },
      select: {
        emailHash: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const qualifyingMap = new Map<string, { redeemedCount: number; purchaseCount: number; lastActivityAt?: string }>();
    for (const row of allQualifyingRows) {
      const current = qualifyingMap.get(row.emailHash) || { redeemedCount: 0, purchaseCount: 0, lastActivityAt: undefined };
      const redeemed = isRedeemReason(row.reason);
      const purchased = isPurchaseReason(row.reason);
      if (redeemed) current.redeemedCount += 1;
      if (purchased) current.purchaseCount += 1;
      if (!current.lastActivityAt) current.lastActivityAt = row.createdAt.toISOString();
      qualifyingMap.set(row.emailHash, current);
    }

    const filteredHashes = sorted
      .map((row) => row.emailHash)
      .filter((emailHash) => {
        const stats = qualifyingMap.get(emailHash) || { redeemedCount: 0, purchaseCount: 0 };
        return matchesFilter(filter, {
          redeemed: stats.redeemedCount > 0,
          purchased: stats.purchaseCount > 0,
        });
      });

    const total = filteredHashes.length;
    const start = (page - 1) * pageSize;
    const pageHashes = filteredHashes.slice(start, start + pageSize);

    if (pageHashes.length === 0) {
      return NextResponse.json({ ok: true, items: [], total, page, pageSize });
    }

    const [identities, balanceRows] = await Promise.all([
      prisma.identity.findMany({
        where: { locationId, emailHash: { in: pageHashes } },
        select: { emailHash: true, phoneE164: true, smsVerifiedAt: true },
      }),
      prisma.creditLedger.groupBy({
        by: ["emailHash"],
        where: { locationId, emailHash: { in: pageHashes } },
        _sum: { delta: true },
      }),
    ]);

    const identityMap = new Map(identities.map((item) => [item.emailHash, item]));
    const balanceMap = new Map(balanceRows.map((item) => [item.emailHash, Number(item._sum.delta || 0)]));

    const items = pageHashes.map((emailHash) => {
      const identity = identityMap.get(emailHash);
      const stats = qualifyingMap.get(emailHash) || { redeemedCount: 0, purchaseCount: 0, lastActivityAt: undefined };
      return {
        emailHash,
        label: labelFor(emailHash, identity?.phoneE164),
        verified: Boolean(identity?.smsVerifiedAt),
        points: Number(balanceMap.get(emailHash) || 0),
        lastActivityAt: stats.lastActivityAt,
        redeemedCount: stats.redeemedCount,
        purchaseCount: stats.purchaseCount,
        redeemedRecently: stats.redeemedCount > 0,
        purchasedRecently: stats.purchaseCount > 0,
      };
    });

    return NextResponse.json({ ok: true, items, total, page, pageSize });
  } catch (error) {
    console.error("user-history list failed", error);
    return NextResponse.json({ ok: false, error: "Could not load recent user history." }, { status: 500 });
  }
}
