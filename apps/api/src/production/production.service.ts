import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma, ProductionStage } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto, UpdateBatchDto } from './production.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.productionBatch.findMany({
      include: { product: { select: { id: true, nameAr: true, nameFr: true, sku: true } } },
      orderBy: { expectedReadyDate: 'asc' },
    });
  }

  create(input: CreateBatchDto) {
    if (input.quantityLost && input.quantityLost >= input.quantitySown) {
      throw new BadRequestException('Loss must be lower than the quantity sown');
    }
    return this.prisma.productionBatch.create({
      data: {
        ...input,
        sowingDate: new Date(input.sowingDate),
        expectedReadyDate: new Date(input.expectedReadyDate),
      },
    });
  }

  async update(id: string, input: UpdateBatchDto) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Production batch not found');
    if (batch.stage === ProductionStage.READY) throw new ConflictException('Ready batches cannot be edited');
    const quantityLost = input.quantityLost ?? batch.quantityLost;
    if (quantityLost >= batch.quantitySown) throw new BadRequestException('Loss must be lower than the quantity sown');
    return this.prisma.productionBatch.update({
      where: { id },
      data: {
        ...input,
        ...(input.expectedReadyDate && { expectedReadyDate: new Date(input.expectedReadyDate) }),
      },
    });
  }

  async markReady(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id } });
      if (!batch) throw new NotFoundException('Production batch not found');
      if (batch.stage === ProductionStage.READY) throw new ConflictException('Batch is already ready');
      const readyQuantity = batch.quantitySown - batch.quantityLost;
      if (readyQuantity < 1) throw new BadRequestException('Batch has no sale-ready plants');
      const updated = await tx.productionBatch.update({
        where: { id },
        data: { stage: ProductionStage.READY, readyAt: new Date() },
      });
      await tx.inventoryMovement.create({
        data: {
          productId: batch.productId,
          type: MovementType.PRODUCTION_IN,
          quantity: readyQuantity,
          reason: `Production batch ${batch.code}`,
          reference: batch.code,
          toLocation: 'مشتل 2',
          createdById: user.sub,
        },
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
