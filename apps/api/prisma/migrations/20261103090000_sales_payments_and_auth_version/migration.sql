ALTER TABLE "User"
ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CustomerPayment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "note" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    CONSTRAINT "CustomerPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "saleId" TEXT,
    "amount" DECIMAL(12,3) NOT NULL,
    CONSTRAINT "CustomerPaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerPayment_customerId_receivedAt_idx"
ON "CustomerPayment"("customerId", "receivedAt");

CREATE INDEX "CustomerPaymentAllocation_saleId_idx"
ON "CustomerPaymentAllocation"("saleId");

ALTER TABLE "CustomerPayment"
ADD CONSTRAINT "CustomerPayment_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerPayment"
ADD CONSTRAINT "CustomerPayment_recordedById_fkey"
FOREIGN KEY ("recordedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomerPaymentAllocation"
ADD CONSTRAINT "CustomerPaymentAllocation_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "CustomerPayment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerPaymentAllocation"
ADD CONSTRAINT "CustomerPaymentAllocation_saleId_fkey"
FOREIGN KEY ("saleId") REFERENCES "Sale"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
