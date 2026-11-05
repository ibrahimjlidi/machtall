ALTER TYPE "MovementType" ADD VALUE 'INTERNAL_ISSUE_OUT';
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'PARTIALLY_RECEIVED';

CREATE TABLE "PurchaseReceipt" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "receivedById" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReceipt_code_key" UNIQUE ("code")
);

CREATE TABLE "PurchaseReceiptLine" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "purchaseOrderLineId" TEXT NOT NULL,
  "receivedQuantity" INTEGER NOT NULL,
  "damagedQuantity" INTEGER NOT NULL,
  CONSTRAINT "PurchaseReceiptLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReceiptLine_receiptId_purchaseOrderLineId_key" UNIQUE ("receiptId", "purchaseOrderLineId"),
  CONSTRAINT "PurchaseReceiptLine_receivedQuantity_check" CHECK ("receivedQuantity" > 0),
  CONSTRAINT "PurchaseReceiptLine_damagedQuantity_check" CHECK ("damagedQuantity" >= 0 AND "damagedQuantity" <= "receivedQuantity")
);

ALTER TABLE "InventoryMovement"
  ADD COLUMN "purchaseReceiptLineId" TEXT;

CREATE TABLE "StockCount" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "systemQuantity" INTEGER NOT NULL,
  "countedQuantity" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "recordedById" TEXT NOT NULL,
  "adjustmentRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockCount_systemQuantity_check" CHECK ("systemQuantity" >= 0),
  CONSTRAINT "StockCount_countedQuantity_check" CHECK ("countedQuantity" >= 0),
  CONSTRAINT "StockCount_reason_check" CHECK (length(trim("reason")) > 0)
);

CREATE UNIQUE INDEX "StockCount_adjustmentRequestId_key" ON "StockCount"("adjustmentRequestId");
CREATE INDEX "StockCount_productId_location_createdAt_idx" ON "StockCount"("productId", "location", "createdAt");
CREATE INDEX "PurchaseReceipt_purchaseOrderId_receivedAt_idx" ON "PurchaseReceipt"("purchaseOrderId", "receivedAt");

ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_purchaseOrderId_fkey"
  FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_receivedById_fkey"
  FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_purchaseOrderLineId_fkey"
  FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_purchaseReceiptLineId_fkey"
  FOREIGN KEY ("purchaseReceiptLineId") REFERENCES "PurchaseReceiptLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_adjustmentRequestId_fkey"
  FOREIGN KEY ("adjustmentRequestId") REFERENCES "AdjustmentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_inventory_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "InventoryMovement_append_only"
  BEFORE UPDATE OR DELETE ON "InventoryMovement"
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_history_mutation();
CREATE TRIGGER "PurchaseReceipt_append_only"
  BEFORE UPDATE OR DELETE ON "PurchaseReceipt"
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_history_mutation();
CREATE TRIGGER "PurchaseReceiptLine_append_only"
  BEFORE UPDATE OR DELETE ON "PurchaseReceiptLine"
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_history_mutation();
CREATE TRIGGER "StockCount_append_only"
  BEFORE UPDATE OR DELETE ON "StockCount"
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_history_mutation();
