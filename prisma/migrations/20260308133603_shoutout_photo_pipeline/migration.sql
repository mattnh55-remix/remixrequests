-- AlterTable
ALTER TABLE "ScreenMessage" ADD COLUMN     "imageModerationReason" TEXT,
ADD COLUMN     "imageModerationStatus" TEXT,
ADD COLUMN     "imageOriginalMime" TEXT,
ADD COLUMN     "imageOriginalPath" TEXT,
ADD COLUMN     "imagePreviewPath" TEXT,
ADD COLUMN     "imageSizeBytes" INTEGER,
ADD COLUMN     "imageUploadedAt" TIMESTAMP(3),
ADD COLUMN     "usageRightsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usageRightsAcceptedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ScreenMessage_locationId_sessionId_idx" ON "ScreenMessage"("locationId", "sessionId");

-- CreateIndex
CREATE INDEX "ScreenMessage_status_idx" ON "ScreenMessage"("status");

-- CreateIndex
CREATE INDEX "ScreenMessage_imageModerationStatus_idx" ON "ScreenMessage"("imageModerationStatus");
