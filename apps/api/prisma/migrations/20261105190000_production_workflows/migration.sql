CREATE TYPE "ProductionTaskType" AS ENUM (
  'PLANTING',
  'WATERING',
  'FERTILIZING',
  'TREATMENT',
  'PRUNING',
  'INSPECTION',
  'OTHER'
);

CREATE TYPE "ProductionTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "ProductionCareType" AS ENUM ('WATERING', 'FERTILIZING', 'TREATMENT', 'PRUNING', 'OBSERVATION', 'OTHER');

CREATE TABLE "ProductionTask" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "ProductionTaskType" NOT NULL DEFAULT 'OTHER',
  "status" "ProductionTaskStatus" NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMP(3),
  "workerNote" TEXT,
  "completedAt" TIMESTAMP(3),
  "batchId" TEXT,
  "assignedToId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductionTask_title_check" CHECK (length(trim("title")) >= 2),
  CONSTRAINT "ProductionTask_workerNote_check" CHECK ("workerNote" IS NULL OR length("workerNote") <= 500)
);

CREATE TABLE "ProductionCareLog" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "type" "ProductionCareType" NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionCareLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductionCareLog_note_check" CHECK ("note" IS NULL OR length("note") <= 500)
);

CREATE TABLE "ProductionLoss" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "reportedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionLoss_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductionLoss_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "ProductionLoss_reason_check" CHECK (length(trim("reason")) >= 3)
);

CREATE INDEX "ProductionTask_assignedToId_status_dueAt_idx"
  ON "ProductionTask"("assignedToId", "status", "dueAt");
CREATE INDEX "ProductionTask_batchId_createdAt_idx"
  ON "ProductionTask"("batchId", "createdAt");
CREATE INDEX "ProductionCareLog_batchId_performedAt_idx"
  ON "ProductionCareLog"("batchId", "performedAt");
CREATE INDEX "ProductionLoss_batchId_occurredAt_idx"
  ON "ProductionLoss"("batchId", "occurredAt");

ALTER TABLE "ProductionTask"
  ADD CONSTRAINT "ProductionTask_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductionTask_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductionTask_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionCareLog"
  ADD CONSTRAINT "ProductionCareLog_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductionCareLog_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionLoss"
  ADD CONSTRAINT "ProductionLoss_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductionLoss_reportedById_fkey"
    FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "ProductionCareLog_append_only"
  BEFORE UPDATE OR DELETE ON "ProductionCareLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_history_mutation();
CREATE TRIGGER "ProductionLoss_append_only"
  BEFORE UPDATE OR DELETE ON "ProductionLoss"
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_history_mutation();
