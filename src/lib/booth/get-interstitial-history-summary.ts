import { prisma } from "@/lib/prisma";

export async function getInterstitialHistorySummary(args: {
  locationId: string;
  sessionId?: string | null;
  assetId?: string;
}) {
  const { locationId, sessionId, assetId } = args;

  const whereBase = {
    locationId,
    ...(sessionId ? { sessionId } : {}),
    ...(assetId ? { assetId } : {}),
  };

  const [latestPlayed, sessionPlayCount] = await Promise.all([
    prisma.interstitialEvent.findFirst({
      where: {
        ...whereBase,
        status: "PLAYED",
      },
      orderBy: { playedAt: "desc" },
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
    sessionPlayCount,
  };
}