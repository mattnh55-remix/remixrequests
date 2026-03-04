-- CreateTable
CREATE TABLE "RedemptionCode" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "disabledAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedemptionCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionCodeUse" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedemptionCodeUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RedemptionCode_locationId_sessionId_idx" ON "RedemptionCode"("locationId", "sessionId");

-- CreateIndex
CREATE INDEX "RedemptionCode_expiresAt_idx" ON "RedemptionCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionCode_locationId_code_key" ON "RedemptionCode"("locationId", "code");

-- CreateIndex
CREATE INDEX "RedemptionCodeUse_locationId_sessionId_idx" ON "RedemptionCodeUse"("locationId", "sessionId");

-- CreateIndex
CREATE INDEX "RedemptionCodeUse_emailHash_idx" ON "RedemptionCodeUse"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionCodeUse_codeId_emailHash_key" ON "RedemptionCodeUse"("codeId", "emailHash");

-- AddForeignKey
ALTER TABLE "RedemptionCodeUse" ADD CONSTRAINT "RedemptionCodeUse_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "RedemptionCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
