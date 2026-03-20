import { prisma } from "@/lib/prisma";
import { getInterstitialAssets } from "./get-interstitial-assets";
import { getSessionPlaybackProfile } from "./get-session-playback-profile";
import { computeNextPlaybackAction } from "./compute-next-playback-action";

export async function computeNextPlaybackActionDb(locationId: string) {
  const [queueItems, session, assets, profile] = await Promise.all([
    prisma.queueItem.findMany({
      where: { locationId },
      orderBy: [{ position: "asc" }],
      include: { request: true },
    }),
    prisma.session.findFirst({
      where: { locationId, endedAt: null },
      orderBy: { startedAt: "desc" },
    }),
    getInterstitialAssets(locationId),
    getSessionPlaybackProfile(locationId),
  ]);

  return computeNextPlaybackAction({
    queueItems,
    interstitialAssets: assets,
    sessionProfile: profile,
    sessionId: session?.id ?? null,
    now: new Date(),
  });
}