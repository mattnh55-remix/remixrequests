// src/lib/queue.ts

import { prisma } from "./db";

export async function getQueue(locationId: string, sessionId: string) {
  const requests = await prisma.request.findMany({
    where: { locationId, sessionId, status: "APPROVED" },
    include: { song: true, votes: true },
    orderBy: { createdAt: "asc" }
  });

  const scored = requests.map(r => {
    const score = r.votes.reduce((a, v) => a + v.value, 0);
    return { ...r, score };
  });

  const playNow = scored
    .filter(r => r.type === "PLAY_NOW")
    .sort((a, b) => (b.createdAt.getTime() - a.createdAt.getTime()));

  const main = scored
    .filter(r => r.type === "NEXT")
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  return { playNow, main };
}
