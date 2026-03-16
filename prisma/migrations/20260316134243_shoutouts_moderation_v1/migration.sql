/*
  Warnings:

  - A unique constraint covering the columns `[refundLedgerId]` on the table `ScreenMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ScreenMessage_refundLedgerId_key" ON "ScreenMessage"("refundLedgerId");

-- CreateIndex
CREATE INDEX "ScreenMessage_locationId_sessionId_status_createdAt_idx" ON "ScreenMessage"("locationId", "sessionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ScreenMessage_locationId_sessionId_approvedAt_idx" ON "ScreenMessage"("locationId", "sessionId", "approvedAt");

-- CreateIndex
CREATE INDEX "Session_locationId_endsAt_idx" ON "Session"("locationId", "endsAt");
