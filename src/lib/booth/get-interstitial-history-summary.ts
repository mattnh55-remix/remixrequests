import { prisma } from "@/lib/prisma";

export async function getInterstitialHistorySummary(args: {
  locationId: string;
  sessionId?: string | null;
  assetId?: string;
  category?: string;
}) {
  const { locationId, sessionId, assetId, category } = args;

  const whereBase = {
    locationId,
    ...(sessionId ? { sessionId } : {}),
    ...(assetId ? { assetId } : {}),
    ...(category ? { category: category as any } : {}),
  };

  const [latestPlayed, latestAny, sessionPlayCount] = await Promise.all([
    prisma.interstitialEvent.findFirst({
      where: {
        ...whereBase,
        status: "PLAYED",
      },
      orderBy: { playedAt: "desc" },
    }),
    prisma.interstitialEvent.findFirst({
      where: whereBase,
      orderBy: { plannedAt: "desc" },
    }),
    prisma.interstitialEvent.count({
      where: {
        ...whereBase,
        status: "PLAYED",
      },
    }),
  ]);

  return {
    latestPlayed,
    latestAny,
    sessionPlayCount,
  };
}
