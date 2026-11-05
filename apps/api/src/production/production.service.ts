import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MovementType,
  Prisma,
  ProductionProposalStatus,
  ProductionStage,
  ProductionTaskStatus,
  UserRole,
} from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { writeAudit } from '../common/audit';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBatchDto,
  CreateProductionCareLogDto,
  CreateProductionLossDto,
  CreateProductionTaskDto,
  ReadyProposalDto,
  RejectReadyProposalDto,
  UpdateBatchDto,
  UpdateBatchStageDto,
  UpdateProductionTaskStatusDto,
} from './production.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser) {
    return this.prisma.productionBatch.findMany({
      where: user.role === UserRole.NURSERY_WORKER ? {
        OR: [
          { createdById: user.sub },
          { tasks: { some: { assignedToId: user.sub } } },
        ],
      } : undefined,
      include: {
        product: { select: { id: true, nameAr: true, nameFr: true, sku: true } },
        tasks: {
          where: user.role === UserRole.NURSERY_WORKER ? { assignedToId: user.sub } : undefined,
          include: { assignedTo: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        careLogs: { orderBy: { performedAt: 'desc' } },
        lossReports: { orderBy: { occurredAt: 'desc' } },
      },
      orderBy: { expectedReadyDate: 'asc' },
    });
  }

  listTasks(user: AuthUser) {
    return this.prisma.productionTask.findMany({
      where: user.role === UserRole.NURSERY_WORKER ? { assignedToId: user.sub } : undefined,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        batch: { include: { product: { select: { id: true, nameAr: true, nameFr: true } } } },
      },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  listWorkers() {
    return this.prisma.user.findMany({
      where: { role: UserRole.NURSERY_WORKER, active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async createTask(input: CreateProductionTaskDto, user: AuthUser) {
    const title = input.title.trim();
    if (title.length < 2) throw new BadRequestException('Task title must contain at least 2 characters');
    return this.prisma.$transaction(async (tx) => {
      const assignee = await tx.user.findUnique({
        where: { id: input.assignedToId },
        select: { id: true, role: true, active: true },
      });
      if (!assignee || assignee.role !== UserRole.NURSERY_WORKER || !assignee.active) {
        throw new BadRequestException('Tasks may only be assigned to active nursery workers');
      }
      if (input.batchId) {
        const batch = await tx.productionBatch.findUnique({ where: { id: input.batchId } });
        if (!batch) throw new NotFoundException('Production batch not found');
        if (batch.stage === ProductionStage.READY) throw new ConflictException('Tasks cannot be assigned to a ready batch');
      }
      const task = await tx.productionTask.create({
        data: {
          title,
          type: input.type,
          assignedToId: assignee.id,
          createdById: user.sub,
          ...(input.batchId && { batchId: input.batchId }),
          ...(input.dueAt && { dueAt: new Date(input.dueAt) }),
        },
        include: { assignedTo: { select: { id: true, name: true } } },
      });
      await writeAudit(tx, user.sub, 'production.task_assigned', 'production_task', task.id, {
        title: task.title,
        type: task.type,
        assignedToId: task.assignedToId,
        batchId: task.batchId,
        dueAt: task.dueAt?.toISOString() ?? null,
      });
      return task;
    });
  }

  async updateTaskStatus(id: string, input: UpdateProductionTaskStatusDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.productionTask.findUnique({ where: { id } });
      if (!task || task.assignedToId !== user.sub) throw new NotFoundException('Production task not found');
      const validTransition = (task.status === ProductionTaskStatus.OPEN && input.status === ProductionTaskStatus.IN_PROGRESS)
        || (task.status === ProductionTaskStatus.IN_PROGRESS && input.status === ProductionTaskStatus.COMPLETED);
      if (!validTransition) throw new ConflictException('Production task status can only advance one step at a time');
      const workerNote = input.workerNote?.trim();
      const updated = await tx.productionTask.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.workerNote !== undefined && { workerNote: workerNote || null }),
          ...(input.status === ProductionTaskStatus.COMPLETED && { completedAt: new Date() }),
        },
        include: { assignedTo: { select: { id: true, name: true } } },
      });
      await writeAudit(tx, user.sub, 'production.task_status_changed', 'production_task', id, {
        from: task.status,
        to: updated.status,
        hasWorkerNote: Boolean(workerNote),
      });
      return updated;
    });
  }

  async create(input: CreateBatchDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.create({
        data: {
          code: input.code.trim(),
          seedType: input.seedType.trim(),
          productId: input.productId,
          quantitySown: input.quantitySown,
          createdById: user.sub,
          sowingDate: new Date(input.sowingDate),
          expectedReadyDate: new Date(input.expectedReadyDate),
        },
      });
      await writeAudit(tx, user.sub, 'production.batch_created', 'production_batch', batch.id, {
        code: batch.code,
        productId: batch.productId,
        quantitySown: batch.quantitySown,
      });
      return batch;
    });
  }

  async update(id: string, input: UpdateBatchDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id } });
      if (!batch) throw new NotFoundException('Production batch not found');
      if (user.role === UserRole.NURSERY_WORKER && !(await this.workerCanAccessBatch(tx, batch.id, user.sub))) {
        throw new NotFoundException('Production batch not found');
      }
      if (batch.stage === ProductionStage.READY) throw new ConflictException('Ready batches cannot be edited');
      if (batch.proposalStatus === ProductionProposalStatus.PENDING
        || batch.proposalStatus === ProductionProposalStatus.VERIFIED) {
        throw new ConflictException('A batch with a pending ready proposal cannot be edited');
      }
      if (!Object.keys(input).length) throw new BadRequestException('Provide at least one batch field to update');
      const updated = await tx.productionBatch.update({
        where: { id },
        data: {
          ...(input.seedType !== undefined && { seedType: input.seedType.trim() }),
          ...(input.expectedReadyDate && { expectedReadyDate: new Date(input.expectedReadyDate) }),
        },
      });
      await writeAudit(tx, user.sub, 'production.batch_updated', 'production_batch', id, {
        changedFields: Object.keys(input),
      });
      return updated;
    });
  }

  async updateStage(id: string, input: UpdateBatchStageDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id } });
      if (!batch) throw new NotFoundException('Production batch not found');
      if (user.role === UserRole.NURSERY_WORKER && !(await this.workerCanAccessBatch(tx, batch.id, user.sub))) {
        throw new NotFoundException('Production batch not found');
      }
      const nextStage: Partial<Record<ProductionStage, ProductionStage>> = {
        [ProductionStage.SOWING]: ProductionStage.GERMINATION,
        [ProductionStage.GERMINATION]: ProductionStage.GROWING,
      };
      if (nextStage[batch.stage] !== input.stage) {
        throw new ConflictException('Production stages must advance from sowing to germination to growing; ready requires approval');
      }
      if (batch.proposalStatus === ProductionProposalStatus.PENDING
        || batch.proposalStatus === ProductionProposalStatus.VERIFIED) {
        throw new ConflictException('A batch with a pending ready proposal cannot change stage');
      }
      const updated = await tx.productionBatch.update({ where: { id }, data: { stage: input.stage } });
      await writeAudit(tx, user.sub, 'production.stage_changed', 'production_batch', id, {
        code: batch.code,
        from: batch.stage,
        to: updated.stage,
      });
      return updated;
    });
  }

  async createCareLog(id: string, input: CreateProductionCareLogDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id } });
      if (!batch || !(await this.workerCanAccessBatch(tx, id, user.sub))) {
        throw new NotFoundException('Production batch not found');
      }
      if (batch.stage === ProductionStage.READY) throw new ConflictException('Care logs cannot be added to a ready batch');
      const performedAt = new Date(input.performedAt);
      if (performedAt.getTime() > Date.now()) throw new BadRequestException('Care log date cannot be in the future');
      const log = await tx.productionCareLog.create({
        data: {
          batchId: id,
          type: input.type,
          performedAt,
          note: input.note?.trim() || null,
          recordedById: user.sub,
        },
      });
      await writeAudit(tx, user.sub, 'production.care_recorded', 'production_care_log', log.id, {
        batchId: id,
        type: log.type,
        performedAt: log.performedAt.toISOString(),
      });
      return log;
    });
  }

  async reportLoss(id: string, input: CreateProductionLossDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ProductionBatch" WHERE "id" = ${id} FOR UPDATE`;
      const batch = await tx.productionBatch.findUnique({ where: { id } });
      if (!batch || !(await this.workerCanAccessBatch(tx, id, user.sub))) {
        throw new NotFoundException('Production batch not found');
      }
      if (batch.stage === ProductionStage.READY) throw new ConflictException('Losses cannot be reported for a ready batch');
      if (batch.proposalStatus === ProductionProposalStatus.PENDING
        || batch.proposalStatus === ProductionProposalStatus.VERIFIED) {
        throw new ConflictException('A batch with a pending ready proposal cannot record new losses');
      }
      if (batch.quantityLost + input.quantity > batch.quantitySown) {
        throw new BadRequestException(`Loss quantity cannot exceed the remaining ${batch.quantitySown - batch.quantityLost}`);
      }
      const occurredAt = new Date(input.occurredAt);
      if (occurredAt.getTime() > Date.now()) throw new BadRequestException('Loss date cannot be in the future');
      const loss = await tx.productionLoss.create({
        data: {
          batchId: id,
          quantity: input.quantity,
          reason: input.reason.trim(),
          occurredAt,
          reportedById: user.sub,
        },
      });
      await tx.productionBatch.update({
        where: { id },
        data: { quantityLost: { increment: input.quantity } },
      });
      await writeAudit(tx, user.sub, 'production.loss_reported', 'production_loss', loss.id, {
        batchId: id,
        batchCode: batch.code,
        quantity: loss.quantity,
        reason: loss.reason,
      });
      return loss;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async proposeReady(id: string, input: ReadyProposalDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findFirst({
        where: { id, stage: { not: ProductionStage.READY } },
      });
      if (!batch || !(await this.workerCanAccessBatch(tx, id, user.sub))) {
        throw new NotFoundException('Production batch not found');
      }
      if (batch.proposalStatus === ProductionProposalStatus.PENDING
        || batch.proposalStatus === ProductionProposalStatus.VERIFIED) {
        throw new ConflictException('A ready proposal is already awaiting review');
      }
      if (batch.stage !== ProductionStage.GROWING) {
        throw new ConflictException('A batch must reach the growing stage before a ready proposal');
      }
      const maximumQuantity = batch.quantitySown - batch.quantityLost;
      if (input.quantity > maximumQuantity) {
        throw new BadRequestException(`Ready quantity cannot exceed ${maximumQuantity}`);
      }
      const updated = await tx.productionBatch.update({
        where: { id },
        data: {
          readyQuantity: input.quantity,
          proposalStatus: ProductionProposalStatus.PENDING,
          proposedById: user.sub,
          proposedAt: new Date(),
          verifiedById: null,
          verifiedAt: null,
          approvedById: null,
          approvedAt: null,
          rejectedById: null,
          rejectedAt: null,
          reviewNote: null,
        },
      });
      await writeAudit(tx, user.sub, 'production.ready_proposed', 'production_batch', id, {
        code: batch.code,
        quantity: input.quantity,
      });
      return updated;
    });
  }

  private async workerCanAccessBatch(tx: Prisma.TransactionClient, batchId: string, userId: string) {
    const batch = await tx.productionBatch.findFirst({
      where: {
        id: batchId,
        OR: [
          { createdById: userId },
          { tasks: { some: { assignedToId: userId } } },
        ],
      },
      select: { id: true },
    });
    return Boolean(batch);
  }

  async verifyReady(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id } });
      if (!batch) throw new NotFoundException('Production batch not found');
      if (batch.proposalStatus !== ProductionProposalStatus.PENDING) {
        throw new ConflictException('Only pending ready proposals can be verified');
      }
      if (batch.proposedById === user.sub) {
        throw new ConflictException('The proposer cannot verify their own ready proposal');
      }
      const updated = await tx.productionBatch.update({
        where: { id },
        data: {
          proposalStatus: ProductionProposalStatus.VERIFIED,
          verifiedById: user.sub,
          verifiedAt: new Date(),
        },
      });
      await writeAudit(tx, user.sub, 'production.ready_verified', 'production_batch', id, {
        code: batch.code,
        quantity: batch.readyQuantity,
      });
      return updated;
    });
  }

  async rejectReady(id: string, input: RejectReadyProposalDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id } });
      if (!batch) throw new NotFoundException('Production batch not found');
      const permittedState = batch.proposalStatus === ProductionProposalStatus.PENDING
        || (user.role === UserRole.ADMIN && batch.proposalStatus === ProductionProposalStatus.VERIFIED);
      if (!permittedState) throw new ConflictException('This ready proposal cannot be rejected in its current state');
      const updated = await tx.productionBatch.update({
        where: { id },
        data: {
          proposalStatus: ProductionProposalStatus.REJECTED,
          rejectedById: user.sub,
          rejectedAt: new Date(),
          reviewNote: input.reason.trim(),
        },
      });
      await writeAudit(tx, user.sub, 'production.ready_rejected', 'production_batch', id, {
        code: batch.code,
        reason: input.reason.trim(),
      });
      return updated;
    });
  }

  async markReady(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id } });
      if (!batch) throw new NotFoundException('Production batch not found');
      if (batch.stage === ProductionStage.READY) throw new ConflictException('Batch is already ready');
      if (batch.proposalStatus !== ProductionProposalStatus.VERIFIED || !batch.readyQuantity) {
        throw new ConflictException('A stockkeeper-verified ready proposal is required');
      }
      if (batch.proposedById === user.sub) throw new ConflictException('The approver cannot approve their own ready proposal');
      const readyQuantity = batch.readyQuantity;
      if (readyQuantity < 1) throw new BadRequestException('Batch has no sale-ready plants');
      const updated = await tx.productionBatch.update({
        where: { id },
        data: {
          stage: ProductionStage.READY,
          readyAt: new Date(),
          proposalStatus: ProductionProposalStatus.APPROVED,
          approvedById: user.sub,
          approvedAt: new Date(),
        },
      });
      const product = await tx.product.findUniqueOrThrow({ where: { id: batch.productId } });
      await tx.inventoryMovement.create({
        data: {
          productId: batch.productId,
          type: MovementType.PRODUCTION_IN,
          quantity: readyQuantity,
          reason: `Production batch ${batch.code}`,
          reference: batch.code,
          toLocation: product.homeLocation,
          createdById: user.sub,
        },
      });
      await writeAudit(tx, user.sub, 'production.ready_approved', 'production_batch', id, {
        code: batch.code,
        quantity: readyQuantity,
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
