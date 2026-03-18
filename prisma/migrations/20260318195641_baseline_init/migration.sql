-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('NEXT', 'PLAY_NOW');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('APPROVED', 'REJECTED', 'PLAYED');

-- CreateEnum
CREATE TYPE "Top10Bucket" AS ENUM ('GENERAL', 'ADULT');

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "trackId" TEXT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "artistKey" TEXT NOT NULL,
    "artworkUrl" TEXT,
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "type" "RequestType" NOT NULL DEFAULT 'NEXT',
    "status" "RequestStatus" NOT NULL DEFAULT 'APPROVED',
    "top10Bucket" "Top10Bucket",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Top10Entry" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "bucket" "Top10Bucket" NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "artworkUrl" TEXT,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Top10Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayHistory" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "artistKey" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruleset" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "costRequest" INTEGER NOT NULL DEFAULT 1,
    "costUpvote" INTEGER NOT NULL DEFAULT 1,
    "costDownvote" INTEGER NOT NULL DEFAULT 1,
    "costPlayNow" INTEGER NOT NULL DEFAULT 5,
    "packTier1PriceCents" INTEGER NOT NULL DEFAULT 500,
    "packTier2PriceCents" INTEGER NOT NULL DEFAULT 1000,
    "packTier3PriceCents" INTEGER NOT NULL DEFAULT 1500,
    "packTier4PriceCents" INTEGER NOT NULL DEFAULT 2000,
    "logoUrl" TEXT,
    "maxRequestsPerSession" INTEGER NOT NULL DEFAULT 1,
    "maxVotesPerSession" INTEGER NOT NULL DEFAULT 3,
    "minSecondsBetweenActions" INTEGER NOT NULL DEFAULT 10,
    "enforceArtistCooldown" BOOLEAN NOT NULL DEFAULT true,
    "enforceSongCooldown" BOOLEAN NOT NULL DEFAULT true,
    "artistCooldownMinutes" INTEGER NOT NULL DEFAULT 15,
    "songCooldownMinutes" INTEGER NOT NULL DEFAULT 120,
    "maxActiveRequestsPerUser" INTEGER NOT NULL DEFAULT 2,
    "msgTooManyActiveRequests" TEXT NOT NULL DEFAULT 'You already have songs waiting in the queue.',
    "enableVoting" BOOLEAN NOT NULL DEFAULT true,
    "msgExplicit" TEXT NOT NULL DEFAULT 'Sorry — this song isn’t available here.',
    "msgAlreadyRequested" TEXT NOT NULL DEFAULT 'You’ve already made a request this session.',
    "msgArtistCooldown" TEXT NOT NULL DEFAULT 'Sorry — this artist has played in the last 15 minutes.',
    "msgSongCooldown" TEXT NOT NULL DEFAULT 'Sorry — this song has already been played in the last 2 hours.',
    "msgNoCredits" TEXT NOT NULL DEFAULT 'Not enough credits.',
    "maxArtistInQueue" INTEGER NOT NULL DEFAULT 0,
    "msgArtistAlreadyQueued" TEXT NOT NULL DEFAULT 'Sorry, $artist is already queued up on the request list!',
    "top10Enabled" BOOLEAN NOT NULL DEFAULT true,
    "top10Timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "top10AdultCutoffHour" INTEGER NOT NULL DEFAULT 21,
    "top10AdultCutoffMinute" INTEGER NOT NULL DEFAULT 0,
    "shoutoutSlideSeconds" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ruleset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "phoneE164" TEXT,
    "phoneHash" TEXT,
    "deviceId" TEXT,
    "smsVerifiedAt" TIMESTAMP(3),
    "emailOptInAt" TIMESTAMP(3),
    "smsOptInAt" TIMESTAMP(3),
    "mailchimpStatus" TEXT,
    "mailchimpError" TEXT,
    "welcomeGrantedSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 6,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "deviceId" TEXT,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingCheckout" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "packageKey" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "paymentId" TEXT,

    CONSTRAINT "PendingCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedPayment" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionCode" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "redeemWindowMinutes" INTEGER NOT NULL DEFAULT 120,
    "disabledAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedemptionCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionCodeUse" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "RedemptionCodeUse_pkey" PRIMARY KEY ("id")
);

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
    "imageOriginalPath" TEXT,
    "imagePreviewPath" TEXT,
    "imageOriginalMime" TEXT,
    "imageSizeBytes" INTEGER,
    "imageModerationStatus" TEXT,
    "imageModerationReason" TEXT,
    "imageUploadedAt" TIMESTAMP(3),
    "usageRightsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "usageRightsAcceptedAt" TIMESTAMP(3),
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
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");

-- CreateIndex
CREATE INDEX "Song_locationId_idx" ON "Song"("locationId");

-- CreateIndex
CREATE INDEX "Song_artistKey_idx" ON "Song"("artistKey");

-- CreateIndex
CREATE INDEX "Song_locationId_trackId_idx" ON "Song"("locationId", "trackId");

-- CreateIndex
CREATE INDEX "Session_locationId_endsAt_idx" ON "Session"("locationId", "endsAt");

-- CreateIndex
CREATE INDEX "Request_locationId_sessionId_idx" ON "Request"("locationId", "sessionId");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE INDEX "Request_sessionId_top10Bucket_idx" ON "Request"("sessionId", "top10Bucket");

-- CreateIndex
CREATE INDEX "Vote_requestId_emailHash_idx" ON "Vote"("requestId", "emailHash");

-- CreateIndex
CREATE INDEX "Vote_sessionId_emailHash_idx" ON "Vote"("sessionId", "emailHash");

-- CreateIndex
CREATE INDEX "Top10Entry_locationId_sessionId_bucket_score_idx" ON "Top10Entry"("locationId", "sessionId", "bucket", "score");

-- CreateIndex
CREATE INDEX "Top10Entry_locationId_sessionId_bucket_lastActivityAt_idx" ON "Top10Entry"("locationId", "sessionId", "bucket", "lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "Top10Entry_locationId_sessionId_bucket_songId_key" ON "Top10Entry"("locationId", "sessionId", "bucket", "songId");

-- CreateIndex
CREATE INDEX "CreditLedger_locationId_emailHash_idx" ON "CreditLedger"("locationId", "emailHash");

-- CreateIndex
CREATE INDEX "PlayHistory_locationId_playedAt_idx" ON "PlayHistory"("locationId", "playedAt");

-- CreateIndex
CREATE INDEX "PlayHistory_locationId_artistKey_playedAt_idx" ON "PlayHistory"("locationId", "artistKey", "playedAt");

-- CreateIndex
CREATE INDEX "PlayHistory_locationId_songId_playedAt_idx" ON "PlayHistory"("locationId", "songId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ruleset_locationId_key" ON "Ruleset"("locationId");

-- CreateIndex
CREATE INDEX "Identity_locationId_phoneHash_idx" ON "Identity"("locationId", "phoneHash");

-- CreateIndex
CREATE INDEX "Identity_locationId_deviceId_idx" ON "Identity"("locationId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_locationId_emailHash_key" ON "Identity"("locationId", "emailHash");

-- CreateIndex
CREATE INDEX "OtpCode_locationId_phoneHash_idx" ON "OtpCode"("locationId", "phoneHash");

-- CreateIndex
CREATE INDEX "OtpCode_locationId_emailHash_idx" ON "OtpCode"("locationId", "emailHash");

-- CreateIndex
CREATE INDEX "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PendingCheckout_referenceId_key" ON "PendingCheckout"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingCheckout_paymentId_key" ON "PendingCheckout"("paymentId");

-- CreateIndex
CREATE INDEX "PendingCheckout_identityId_idx" ON "PendingCheckout"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedPayment_paymentId_key" ON "ProcessedPayment"("paymentId");

-- CreateIndex
CREATE INDEX "RedemptionCode_locationId_idx" ON "RedemptionCode"("locationId");

-- CreateIndex
CREATE INDEX "RedemptionCode_expiresAt_idx" ON "RedemptionCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionCode_locationId_code_key" ON "RedemptionCode"("locationId", "code");

-- CreateIndex
CREATE INDEX "RedemptionCodeUse_locationId_idx" ON "RedemptionCodeUse"("locationId");

-- CreateIndex
CREATE INDEX "RedemptionCodeUse_emailHash_idx" ON "RedemptionCodeUse"("emailHash");

-- CreateIndex
CREATE INDEX "RedemptionCodeUse_expiresAt_idx" ON "RedemptionCodeUse"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionCodeUse_codeId_emailHash_key" ON "RedemptionCodeUse"("codeId", "emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenMessage_refundLedgerId_key" ON "ScreenMessage"("refundLedgerId");

-- CreateIndex
CREATE INDEX "ScreenMessage_locationId_sessionId_idx" ON "ScreenMessage"("locationId", "sessionId");

-- CreateIndex
CREATE INDEX "ScreenMessage_locationId_sessionId_status_createdAt_idx" ON "ScreenMessage"("locationId", "sessionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ScreenMessage_locationId_sessionId_approvedAt_idx" ON "ScreenMessage"("locationId", "sessionId", "approvedAt");

-- CreateIndex
CREATE INDEX "ScreenMessage_status_idx" ON "ScreenMessage"("status");

-- CreateIndex
CREATE INDEX "ScreenMessage_imageModerationStatus_idx" ON "ScreenMessage"("imageModerationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MessageRuleset_locationId_key" ON "MessageRuleset"("locationId");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Top10Entry" ADD CONSTRAINT "Top10Entry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Top10Entry" ADD CONSTRAINT "Top10Entry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Top10Entry" ADD CONSTRAINT "Top10Entry_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayHistory" ADD CONSTRAINT "PlayHistory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayHistory" ADD CONSTRAINT "PlayHistory_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruleset" ADD CONSTRAINT "Ruleset_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingCheckout" ADD CONSTRAINT "PendingCheckout_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionCodeUse" ADD CONSTRAINT "RedemptionCodeUse_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "RedemptionCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
