import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdjustmentRequestStatus, MovementType, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { writeAudit } from '../common/audit';
import { getLocationStock } from '../common/stock';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockCountDto } from './adjustments.dto';

@Injectable()
export class AdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.adjustmentRequest.findMany({
      include: {
        product: { select: { id: true, sku: true, nameAr: true, nameFr: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
        movement: { select: { id: true, createdAt: true } },
        stockCount: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  listCounts() {
    return this.prisma.stockCount.findMany({
      include: {
        product: { select: { id: true, sku: true, nameAr: true, nameFr: true } },
        recordedBy: { select: { id: true, name: true } },
        adjustmentRequest: { select: { id: true, status: true, type: true, quantity: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async recordCount(input: CreateStockCountDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: input.productId, active: true } });
      if (!product) throw new NotFoundException('Product not found');
      const location = input.location.trim();
      const systemQuantity = Math.max(0, await getLocationStock(tx, product.id, location));
      const difference = input.countedQuantity - systemQuantity;
      const adjustmentRequest = difference === 0 ? null : await tx.adjustmentRequest.create({
        data: {
          productId: product.id,
          type: difference > 0 ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT,
          quantity: Math.abs(difference),
          reason: input.reason.trim(),
          location,
          requestedById: user.sub,
        },
      });
      const count = await tx.stockCount.create({
        data: {
          productId: product.id,
          location,
          systemQuantity,
          countedQuantity: input.countedQuantity,
          reason: input.reason.trim(),
          recordedById: user.sub,
          adjustmentRequestId: adjustmentRequest?.id,
        },
        include: { adjustmentRequest: true },
      });
      await writeAudit(tx, user.sub, 'inventory.stock_counted', 'stock_count', count.id, {
        productId: product.id,
        location,
        systemQuantity,
        countedQuantity: input.countedQuantity,
        difference,
        reason: input.reason.trim(),
      });
      if (adjustmentRequest) {
        await writeAudit(tx, user.sub, 'inventory.adjustment_requested', 'adjustment_request', adjustmentRequest.id, {
          productId: product.id,
          stockCountId: count.id,
          type: adjustmentRequest.type,
          quantity: adjustmentRequest.quantity,
          reason: adjustmentRequest.reason,
          location: adjustmentRequest.location,
        });
      }
      return count;
    });
  }

  async approve(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.adjustmentRequest.findUnique({
        where: { id },
        include: { product: true, stockCount: true },
      });
      if (!request) throw new NotFoundException('Adjustment request not found');
      if (request.status !== AdjustmentRequestStatus.PENDING) {
        throw new ConflictException('Only pending adjustment requests can be approved');
      }
      if (request.requestedById === user.sub) throw new ConflictException('The requester cannot approve their own adjustment');
      if (request.stockCount) {
        const currentQuantity = Math.max(0, await getLocationStock(tx, request.productId, request.location));
        if (currentQuantity !== request.stockCount.systemQuantity) {
          throw new ConflictException('Stock changed after this count; record a new physical count before approval');
        }
      }
      if (request.type === MovementType.ADJUSTMENT_OUT
        && request.quantity > await getLocationStock(tx, request.productId, request.location)) {
        throw new BadRequestException(`Not enough stock at ${request.location}`);
      }
      const updated = await tx.adjustmentRequest.update({
        where: { id },
        data: {
          status: AdjustmentRequestStatus.APPROVED,
          approvedById: user.sub,
          reviewedAt: new Date(),
        },
      });
      const movement = await tx.inventoryMovement.create({
        data: {
          productId: request.productId,
          type: request.type,
          quantity: request.quantity,
          reason: request.reason,
          reference: `ADJ-${request.id}`,
          fromLocation: request.type === MovementType.ADJUSTMENT_OUT ? request.location : null,
          toLocation: request.type === MovementType.ADJUSTMENT_IN ? request.location : null,
          createdById: user.sub,
          adjustmentRequestId: request.id,
        },
      });
      await writeAudit(tx, user.sub, 'inventory.adjustment_approved', 'adjustment_request', id, {
        movementId: movement.id,
        productId: request.productId,
        type: request.type,
        quantity: request.quantity,
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async reject(id: string, reason: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.adjustmentRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Adjustment request not found');
      if (request.status !== AdjustmentRequestStatus.PENDING) {
        throw new ConflictException('Only pending adjustment requests can be rejected');
      }
      const updated = await tx.adjustmentRequest.update({
        where: { id },
        data: {
          status: AdjustmentRequestStatus.REJECTED,
          rejectedById: user.sub,
          reviewedAt: new Date(),
          reviewNote: reason.trim(),
        },
      });
      await writeAudit(tx, user.sub, 'inventory.adjustment_rejected', 'adjustment_request', id, {
        reason: reason.trim(),
      });
      return updated;
    });
  }
}
