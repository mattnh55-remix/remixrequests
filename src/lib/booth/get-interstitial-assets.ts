import { prisma } from "@/lib/prisma";

export async function getInterstitialAssets(locationId: string) {
  return prisma.interstitialAsset.findMany({
    where: { locationId, active: true },
    orderBy: [{ priority: "desc" }, { randomWeight: "desc" }],
  });
}