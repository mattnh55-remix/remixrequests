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

-- AddForeignKey
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
