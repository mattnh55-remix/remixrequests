-- CreateTable
CREATE TABLE "ScreenMessage" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "identityId" TEXT,
    "emailHash" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "creditsCost" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "displayDurationSec" INTEGER NOT NULL,
    "sortWeight" INTEGER,
    "moderationNotes" TEXT,
    "autoTextModerationResult" TEXT,
    "autoTextModerationReason" TEXT,
    "autoModeratedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "refundLedgerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreenMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageRuleset" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "costBasic" INTEGER NOT NULL,
    "costFeatured" INTEGER NOT NULL,
    "maxMessageChars" INTEGER NOT NULL,
    "maxFromNameChars" INTEGER NOT NULL,
    "displayDurationBasicSec" INTEGER NOT NULL,
    "displayDurationFeaturedSec" INTEGER NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL,
    "autoRefundRejected" BOOLEAN NOT NULL,
    "maxPendingPerIdentity" INTEGER NOT NULL,
    "filterBlockMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageRuleset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageRuleset_locationId_key" ON "MessageRuleset"("locationId");
