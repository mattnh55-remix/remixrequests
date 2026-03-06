-- AlterTable
ALTER TABLE "Ruleset" ADD COLUMN     "maxActiveRequestsPerUser" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "msgTooManyActiveRequests" TEXT NOT NULL DEFAULT 'You already have songs waiting in the queue.';
