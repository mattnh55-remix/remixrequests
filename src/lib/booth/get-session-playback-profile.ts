import { prisma } from "@/lib/prisma";

export async function getSessionPlaybackProfile(locationId: string) {
  const session = await prisma.session.findFirst({
    where: { locationId, endedAt: null },
    orderBy: { startedAt: "desc" },
    select: { profile: true },
  });

  return session?.profile ?? "GENERAL";
}