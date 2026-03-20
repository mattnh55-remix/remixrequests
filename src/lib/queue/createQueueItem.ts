import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function createQueueItemForApprovedRequest(requestId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        locationId: true,
        sessionId: true,
        status: true,
      },
    });

    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "APPROVED") {
      throw new Error("Only approved requests can be queued");
    }

    const lastQueuedItem = await tx.queueItem.findFirst({
      where: {
        locationId: request.locationId,
        sessionId: request.sessionId,
        status: {
          in: ["QUEUED", "LOADED", "PLAYING", "HELD"],
        },
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });

    const nextPosition = (lastQueuedItem?.position ?? 0) + 1;

    const queueItem = await tx.queueItem.upsert({
      where: {
        requestId: request.id,
      },
      update: {},
      create: {
        requestId: request.id,
        locationId: request.locationId,
        sessionId: request.sessionId,
        status: "QUEUED",
        position: nextPosition,
        sourceType: "REQUEST",
      },
    });

    await tx.playbackEvent.create({
      data: {
        locationId: request.locationId,
        queueItemId: queueItem.id,
        type: "QUEUED",
        metadata: {
          requestId: request.id,
          sessionId: request.sessionId,
          position: queueItem.position,
        },
      },
    });

    return queueItem;
  });
}
