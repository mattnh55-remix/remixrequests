import { prisma } from "@/lib/prisma";

export async function getInterstitialSchedules(locationId: string) {
  return prisma.interstitialSchedule.findMany({
    where: { locationId, active: true },
    orderBy: [{ startMinute: "asc" }, { sortOrder: "asc" }, { category: "asc" }],
  });
}
