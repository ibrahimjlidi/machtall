import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './purchasing.dto';

@Injectable()
export class PurchasingService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.purchaseOrder.findMany({
      include: { supplier: true, lines: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: CreatePurchaseOrderDto) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: input.supplierId, active: true } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    const productIds = [...new Set(input.lines.map((line) => line.productId))];
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, active: true } });
    if (products.length !== productIds.length) throw new NotFoundException('One or more products were not found');
    const prices = new Map(products.map((product) => [product.id, product.purchasePrice]));
    const code = `PO-${Date.now().toString(36).toUpperCase()}`;
    return this.prisma.purchaseOrder.create({
      data: {
        code,
        supplierId: input.supplierId,
        lines: {
          create: input.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: prices.get(line.productId)!,
          })),
        },
      },
      include: { supplier: true, lines: { include: { product: true } } },
    });
  }

  async send(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (order.status !== PurchaseOrderStatus.DRAFT) throw new ConflictException('Only draft orders can be sent');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.SENT, sentAt: new Date() },
    });
  }

  async receive(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { lines: { include: { product: true } } },
      });
      if (!order) throw new NotFoundException('Purchase order not found');
      if (order.status === PurchaseOrderStatus.RECEIVED) throw new ConflictException('Order has already been received');
      if (order.lines.length === 0) throw new BadRequestException('Cannot receive an empty purchase order');
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.RECEIVED, receivedAt: new Date() },
      });
      for (const line of order.lines) {
        await tx.inventoryMovement.create({
          data: {
            productId: line.productId,
            type: MovementType.PURCHASE_IN,
            quantity: line.quantity,
            reason: `Purchase order ${order.code}`,
            reference: order.code,
            toLocation: line.product.homeLocation,
            createdById: user.sub,
            purchaseOrderLineId: line.id,
          },
        });
      }
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
