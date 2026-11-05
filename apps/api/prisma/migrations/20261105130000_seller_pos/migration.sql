ALTER TYPE "MovementType" ADD VALUE 'SALE_RETURN_IN';

CREATE TYPE "SaleApprovalStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');
CREATE TYPE "SalesReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
CREATE TYPE "CashLedgerEntryType" AS ENUM ('SALE', 'CUSTOMER_PAYMENT', 'REFUND');

ALTER TABLE "Sale"
  ADD COLUMN "approvalStatus" "SaleApprovalStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "cashSessionId" TEXT;

ALTER TABLE "CustomerPayment"
  ADD COLUMN "cashSessionId" TEXT;

ALTER TABLE "InventoryMovement"
  ADD COLUMN "salesReturnLineId" TEXT;

CREATE TABLE "CashSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "openingFloat" DECIMAL(12,3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "closedById" TEXT,
  "closingCash" DECIMAL(12,3),
  "expectedCash" DECIMAL(12,3),
  "variance" DECIMAL(12,3),
  CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashLedgerEntry" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "type" "CashLedgerEntryType" NOT NULL,
  "amount" DECIMAL(12,3) NOT NULL,
  "reason" TEXT,
  "createdById" TEXT NOT NULL,
  "saleId" TEXT,
  "customerPaymentId" TEXT,
  "salesReturnId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesReturn" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "status" "SalesReturnStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "rejectedById" TEXT,
  "verifiedById" TEXT,
  "reviewNote" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "cashRefundAmount" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "cashSessionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesReturnLine" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "saleLineId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "restockedQuantity" INTEGER,
  CONSTRAINT "SalesReturnLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryMovement_salesReturnLineId_key" ON "InventoryMovement"("salesReturnLineId");
CREATE INDEX "Sale_approvalStatus_createdAt_idx" ON "Sale"("approvalStatus", "createdAt");
CREATE INDEX "CashSession_userId_openedAt_idx" ON "CashSession"("userId", "openedAt");
CREATE INDEX "CashSession_closedAt_openedAt_idx" ON "CashSession"("closedAt", "openedAt");
CREATE UNIQUE INDEX "CashSession_one_open_per_user_idx" ON "CashSession"("userId") WHERE "closedAt" IS NULL;
CREATE INDEX "CashLedgerEntry_sessionId_createdAt_idx" ON "CashLedgerEntry"("sessionId", "createdAt");
CREATE UNIQUE INDEX "CashLedgerEntry_saleId_key" ON "CashLedgerEntry"("saleId");
CREATE UNIQUE INDEX "CashLedgerEntry_customerPaymentId_key" ON "CashLedgerEntry"("customerPaymentId");
CREATE UNIQUE INDEX "CashLedgerEntry_salesReturnId_key" ON "CashLedgerEntry"("salesReturnId");
CREATE UNIQUE INDEX "SalesReturn_code_key" ON "SalesReturn"("code");
CREATE INDEX "SalesReturn_status_createdAt_idx" ON "SalesReturn"("status", "createdAt");
CREATE INDEX "SalesReturn_saleId_createdAt_idx" ON "SalesReturn"("saleId", "createdAt");
CREATE UNIQUE INDEX "SalesReturnLine_returnId_saleLineId_key" ON "SalesReturnLine"("returnId", "saleLineId");

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashSessionId_fkey"
  FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_cashSessionId_fkey"
  FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_salesReturnLineId_fkey"
  FOREIGN KEY ("salesReturnLineId") REFERENCES "SalesReturnLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closedById_fkey"
  FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashLedgerEntry" ADD CONSTRAINT "CashLedgerEntry_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashLedgerEntry" ADD CONSTRAINT "CashLedgerEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashLedgerEntry" ADD CONSTRAINT "CashLedgerEntry_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashLedgerEntry" ADD CONSTRAINT "CashLedgerEntry_customerPaymentId_fkey"
  FOREIGN KEY ("customerPaymentId") REFERENCES "CustomerPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashLedgerEntry" ADD CONSTRAINT "CashLedgerEntry_salesReturnId_fkey"
  FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_rejectedById_fkey"
  FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_cashSessionId_fkey"
  FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_returnId_fkey"
  FOREIGN KEY ("returnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_saleLineId_fkey"
  FOREIGN KEY ("saleLineId") REFERENCES "SaleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_cash_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'CashLedgerEntry records are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CashLedgerEntry_append_only"
  BEFORE UPDATE OR DELETE ON "CashLedgerEntry"
  FOR EACH ROW EXECUTE FUNCTION prevent_cash_ledger_mutation();
