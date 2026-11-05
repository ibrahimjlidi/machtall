CREATE TYPE "SupplierInvoiceStatus" AS ENUM ('RECORDED', 'REVIEWED');
CREATE TYPE "SupplierReturnStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

ALTER TABLE "PurchaseOrderLine"
  ADD COLUMN "supplierQuoteLineId" TEXT;
CREATE INDEX "PurchaseOrderLine_supplierQuoteLineId_idx" ON "PurchaseOrderLine"("supplierQuoteLineId");

CREATE TABLE "SupplierQuote" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "quoteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "note" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierQuote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierQuote_reference_check" CHECK (length(trim("reference")) > 0)
);

CREATE TABLE "SupplierQuoteLine" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "unitPrice" DECIMAL(12,3) NOT NULL,
  CONSTRAINT "SupplierQuoteLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierQuoteLine_unitPrice_check" CHECK ("unitPrice" >= 0),
  CONSTRAINT "SupplierQuoteLine_quoteId_productId_key" UNIQUE ("quoteId", "productId")
);

CREATE TABLE "SupplierInvoice" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "purchaseOrderId" TEXT,
  "reference" TEXT NOT NULL,
  "invoiceDate" TIMESTAMP(3),
  "note" TEXT,
  "status" "SupplierInvoiceStatus" NOT NULL DEFAULT 'RECORDED',
  "recordedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierInvoice_reference_check" CHECK (length(trim("reference")) > 0)
);

CREATE TABLE "SupplierReturn" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "purchaseOrderId" TEXT,
  "supplierReference" TEXT,
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "status" "SupplierReturnStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierReturn_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierReturn_reason_check" CHECK (length(trim("reason")) >= 3)
);

CREATE TABLE "SupplierReturnLine" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "SupplierReturnLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierReturnLine_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "SupplierReturnLine_returnId_productId_key" UNIQUE ("returnId", "productId")
);

CREATE UNIQUE INDEX "SupplierQuote_supplierId_reference_key" ON "SupplierQuote"("supplierId", "reference");
CREATE INDEX "SupplierQuote_supplierId_quoteDate_idx" ON "SupplierQuote"("supplierId", "quoteDate");
CREATE INDEX "SupplierInvoice_status_createdAt_idx" ON "SupplierInvoice"("status", "createdAt");
CREATE UNIQUE INDEX "SupplierInvoice_supplierId_reference_key" ON "SupplierInvoice"("supplierId", "reference");
CREATE INDEX "SupplierReturn_status_createdAt_idx" ON "SupplierReturn"("status", "createdAt");
CREATE INDEX "SupplierReturn_supplierId_createdAt_idx" ON "SupplierReturn"("supplierId", "createdAt");

ALTER TABLE "PurchaseOrderLine"
  ADD CONSTRAINT "PurchaseOrderLine_supplierQuoteLineId_fkey"
  FOREIGN KEY ("supplierQuoteLineId") REFERENCES "SupplierQuoteLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierQuote"
  ADD CONSTRAINT "SupplierQuote_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierQuote_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierQuoteLine"
  ADD CONSTRAINT "SupplierQuoteLine_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "SupplierQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierQuoteLine_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierInvoice"
  ADD CONSTRAINT "SupplierInvoice_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierInvoice_purchaseOrderId_fkey"
  FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierInvoice_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierInvoice_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierReturn"
  ADD CONSTRAINT "SupplierReturn_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierReturn_purchaseOrderId_fkey"
  FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierReturn_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierReturn_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierReturnLine"
  ADD CONSTRAINT "SupplierReturnLine_returnId_fkey"
  FOREIGN KEY ("returnId") REFERENCES "SupplierReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SupplierReturnLine_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "SupplierQuote_append_only"
  BEFORE UPDATE OR DELETE ON "SupplierQuote"
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_history_mutation();
CREATE TRIGGER "SupplierQuoteLine_append_only"
  BEFORE UPDATE OR DELETE ON "SupplierQuoteLine"
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_history_mutation();
