-- CreateTable
CREATE TABLE "PendingCheckout" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "PendingCheckout_referenceId_key" ON "PendingCheckout"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingCheckout_paymentId_key" ON "PendingCheckout"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedPayment_paymentId_key" ON "ProcessedPayment"("paymentId");
