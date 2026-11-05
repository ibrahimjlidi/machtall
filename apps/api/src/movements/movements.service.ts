import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { getLocationStock, getProductStock, movementSign } from '../common/stock';
import { writeAudit } from '../common/audit';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './movements.dto';

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(type?: MovementType) {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: type ? { type } : undefined,
      include: { product: { select: { nameAr: true, nameFr: true, sku: true } } },
      orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    return movements.map((movement) => ({
      id: movement.id,
      productId: movement.productId,
      product: movement.product,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason ?? '',
      reference: movement.reference ?? '',
      location: movement.toLocation ?? movement.fromLocation ?? '',
      fromLocation: movement.fromLocation,
      toLocation: movement.toLocation,
      date: movement.effectiveAt.toISOString().slice(0, 10),
    }));
  }

  async create(input: CreateMovementDto, user: AuthUser) {
    if (new Set<MovementType>([
      MovementType.PURCHASE_IN,
      MovementType.PRODUCTION_IN,
      MovementType.SALE_OUT,
      MovementType.SALE_RETURN_IN,
      MovementType.ADJUSTMENT_IN,
      MovementType.ADJUSTMENT_OUT,
    ]).has(input.type)) {
      throw new BadRequestException('This movement type must be created by its approved business workflow');
    }
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: input.productId, active: true } });
      if (!product) throw new NotFoundException('Product not found');
      const isOut = input.type === MovementType.SALE_OUT ||
        input.type === MovementType.LOSS_OUT ||
        input.type === MovementType.INTERNAL_ISSUE_OUT ||
        input.type === MovementType.ADJUSTMENT_OUT;
      if ((input.type === MovementType.LOSS_OUT || input.type === MovementType.INTERNAL_ISSUE_OUT || input.type === MovementType.TRANSFER)
        && !input.reason?.trim()) {
        throw new BadRequestException('A reason is required for loss, internal issue, and transfer movements');
      }
      const fromLocation = input.fromLocation || (isOut ? product.homeLocation : undefined);
      const toLocation = input.toLocation || (!isOut && input.type !== MovementType.TRANSFER ? product.homeLocation : undefined);
      if (isOut && input.quantity > await getProductStock(tx, product.id)) {
        throw new BadRequestException('Outbound quantity exceeds available stock');
      }
      if (isOut && fromLocation && input.quantity > await getLocationStock(tx, product.id, fromLocation)) {
        throw new BadRequestException(`Not enough stock at ${fromLocation}`);
      }
      if (input.type === MovementType.TRANSFER) {
        if (!fromLocation || !toLocation || fromLocation === toLocation) {
          throw new BadRequestException('A transfer requires different source and destination locations');
        }
        if (input.quantity > await getLocationStock(tx, product.id, fromLocation)) {
          throw new BadRequestException(`Not enough stock at ${fromLocation}`);
        }
      }
      if (movementSign(input.type) === 0 && input.type !== MovementType.TRANSFER) {
        throw new BadRequestException('Unsupported movement type');
      }
      const movement = await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: input.type,
          quantity: input.quantity,
          reason: input.reason?.trim() || null,
          reference: input.reference?.trim() || null,
          fromLocation,
          toLocation,
          effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : new Date(),
          createdById: user.sub,
        },
      });
      await writeAudit(tx, user.sub, 'inventory.movement_created', 'inventory_movement', movement.id, {
        type: movement.type,
        productId: product.id,
        quantity: movement.quantity,
        reason: movement.reason,
        reference: movement.reference,
      });
      return movement;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
