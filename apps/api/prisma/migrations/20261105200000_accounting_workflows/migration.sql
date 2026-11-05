CREATE TYPE "AccountingPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE');
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

ALTER TYPE "CashLedgerEntryType" ADD VALUE 'SUPPLIER_PAYMENT';
ALTER TYPE "CashLedgerEntryType" ADD VALUE 'EXPENSE_PAYMENT';

ALTER TABLE "SupplierInvoice"
  ADD COLUMN "totalAmount" DECIMAL(12,3);

ALTER TABLE "CustomerPayment"
  ADD COLUMN "method" "AccountingPaymentMethod" NOT NULL DEFAULT 'CASH',
  ADD COLUMN "reference" TEXT;

ALTER TABLE "CashSession"
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "varianceApprovedById" TEXT,
  ADD COLUMN "varianceApprovedAt" TIMESTAMP(3);

ALTER TABLE "CashLedgerEntry"
  ADD COLUMN "supplierPaymentId" TEXT,
  ADD COLUMN "expensePaymentId" TEXT;

CREATE TABLE "SupplierPayment" (
  "id" TEXT NOT NULL,
  "supplierInvoiceId" TEXT NOT NULL,
  "amount" DECIMAL(12,3) NOT NULL,
  "method" "AccountingPaymentMethod" NOT NULL,
  "reference" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedById" TEXT NOT NULL,
  "cashSessionId" TEXT,
  CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierPayment_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "SupplierPayment_method_reference_check"
    CHECK ("method" = 'CASH' OR length(trim(coalesce("reference", ''))) > 0),
  CONSTRAINT "SupplierPayment_cash_session_check"
    CHECK (("method" = 'CASH' AND "cashSessionId" IS NOT NULL) OR ("method" <> 'CASH' AND "cashSessionId" IS NULL))
);

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,3) NOT NULL,
  "incurredAt" TIMESTAMP(3) NOT NULL,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Expense_category_check" CHECK (length(trim("category")) > 0),
  CONSTRAINT "Expense_description_check" CHECK (length(trim("description")) > 0),
  CONSTRAINT "Expense_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "Expense_review_state_check" CHECK (
    ("status" = 'PENDING_APPROVAL' AND "reviewedById" IS NULL AND "reviewedAt" IS NULL)
    OR ("status" <> 'PENDING_APPROVAL' AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL)
  )
);

CREATE TABLE "ExpensePayment" (
  "id" TEXT NOT NULL,
  "expenseId" TEXT NOT NULL,
  "amount" DECIMAL(12,3) NOT NULL,
  "method" "AccountingPaymentMethod" NOT NULL,
  "reference" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedById" TEXT NOT NULL,
  "cashSessionId" TEXT,
  CONSTRAINT "ExpensePayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExpensePayment_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "ExpensePayment_method_reference_check"
    CHECK ("method" = 'CASH' OR length(trim(coalesce("reference", ''))) > 0),
  CONSTRAINT "ExpensePayment_cash_session_check"
    CHECK (("method" = 'CASH' AND "cashSessionId" IS NOT NULL) OR ("method" <> 'CASH' AND "cashSessionId" IS NULL))
);

CREATE TABLE "VatRate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "percentage" DECIMAL(5,2) NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VatRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VatRate_name_check" CHECK (length(trim("name")) > 0),
  CONSTRAINT "VatRate_percentage_check" CHECK ("percentage" >= 0 AND "percentage" <= 100),
  CONSTRAINT "VatRate_effective_dates_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom")
);

CREATE INDEX "SupplierPayment_supplierInvoiceId_paidAt_idx" ON "SupplierPayment"("supplierInvoiceId", "paidAt");
CREATE INDEX "Expense_status_incurredAt_idx" ON "Expense"("status", "incurredAt");
CREATE INDEX "ExpensePayment_expenseId_paidAt_idx" ON "ExpensePayment"("expenseId", "paidAt");
CREATE INDEX "VatRate_name_effectiveFrom_idx" ON "VatRate"("name", "effectiveFrom");
CREATE UNIQUE INDEX "CashLedgerEntry_supplierPaymentId_key" ON "CashLedgerEntry"("supplierPaymentId");
CREATE UNIQUE INDEX "CashLedgerEntry_expensePaymentId_key" ON "CashLedgerEntry"("expensePaymentId");
CREATE INDEX "CashSession_reviewedAt_idx" ON "CashSession"("reviewedAt", "closedAt");

ALTER TABLE "SupplierInvoice"
  ADD CONSTRAINT "SupplierInvoice_totalAmount_check" CHECK ("totalAmount" IS NULL OR "totalAmount" > 0);
ALTER TABLE "CustomerPayment"
  ADD CONSTRAINT "CustomerPayment_method_reference_check"
    CHECK ("method" = 'CASH' OR length(trim(coalesce("reference", ''))) > 0);
ALTER TABLE "CashSession"
  ADD CONSTRAINT "CashSession_review_state_check"
    CHECK (("reviewedById" IS NULL AND "reviewedAt" IS NULL) OR ("reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL)),
  ADD CONSTRAINT "CashSession_variance_approval_state_check"
    CHECK (("varianceApprovedById" IS NULL AND "varianceApprovedAt" IS NULL) OR ("varianceApprovedById" IS NOT NULL AND "varianceApprovedAt" IS NOT NULL));

ALTER TABLE "CashSession"
  ADD CONSTRAINT "CashSession_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CashSession_varianceApprovedById_fkey"
    FOREIGN KEY ("varianceApprovedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierPayment"
  ADD CONSTRAINT "SupplierPayment_supplierInvoiceId_fkey"
    FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierPayment_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierPayment_cashSessionId_fkey"
    FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Expense_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpensePayment"
  ADD CONSTRAINT "ExpensePayment_expenseId_fkey"
    FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExpensePayment_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExpensePayment_cashSessionId_fkey"
    FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VatRate"
  ADD CONSTRAINT "VatRate_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashLedgerEntry"
  ADD CONSTRAINT "CashLedgerEntry_supplierPaymentId_fkey"
    FOREIGN KEY ("supplierPaymentId") REFERENCES "SupplierPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CashLedgerEntry_expensePaymentId_fkey"
    FOREIGN KEY ("expensePaymentId") REFERENCES "ExpensePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "SupplierPayment_append_only"
  BEFORE UPDATE OR DELETE ON "SupplierPayment"
  FOR EACH ROW EXECUTE FUNCTION prevent_cash_ledger_mutation();
CREATE TRIGGER "ExpensePayment_append_only"
  BEFORE UPDATE OR DELETE ON "ExpensePayment"
  FOR EACH ROW EXECUTE FUNCTION prevent_cash_ledger_mutation();
