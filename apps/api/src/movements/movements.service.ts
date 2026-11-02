import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { getLocationStock, getProductStock, movementSign } from '../common/stock';
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
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: input.productId, active: true } });
      if (!product) throw new NotFoundException('Product not found');
      const isOut = input.type === MovementType.SALE_OUT ||
        input.type === MovementType.LOSS_OUT ||
        input.type === MovementType.ADJUSTMENT_OUT;
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
      return tx.inventoryMovement.create({
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
