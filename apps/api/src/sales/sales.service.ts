import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, PaymentStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { getLocationBalances, getProductStock } from '../common/stock';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './sales.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const sales = await this.prisma.sale.findMany({
      include: { customer: true, lines: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return sales.map((sale) => ({
      id: sale.id,
      code: sale.code,
      customerId: sale.customerId,
      customer: sale.customer.name,
      date: sale.createdAt.toISOString().slice(0, 10),
      payment: sale.payment,
      total: sale.lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0),
      lines: sale.lines.map((line) => ({
        productId: line.productId,
        productName: line.product.nameAr,
        quantity: line.quantity,
        unitPrice: Number(line.unitPrice),
      })),
    }));
  }

  async create(input: CreateSaleDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: input.customerId, active: true } });
      if (!customer) throw new NotFoundException('Customer not found');
      const requested = new Map<string, number>();
      for (const line of input.lines) {
        requested.set(line.productId, (requested.get(line.productId) ?? 0) + line.quantity);
      }
      const products = await tx.product.findMany({
        where: { id: { in: [...requested.keys()] }, active: true },
      });
      if (products.length !== requested.size) throw new NotFoundException('One or more products were not found');
      for (const [productId, quantity] of requested) {
        const available = await getProductStock(tx, productId);
        if (quantity > available) {
          const product = products.find((item) => item.id === productId);
          throw new BadRequestException(`Insufficient stock for ${product?.nameAr ?? productId}; available: ${available}`);
        }
      }
      const byId = new Map(products.map((product) => [product.id, product]));
      const code = `V-${Date.now().toString(36).toUpperCase()}`;
      const sale = await tx.sale.create({
        data: {
          code,
          customerId: customer.id,
          payment: input.payment,
          createdById: user.sub,
          lines: {
            create: [...requested].map(([productId, quantity]) => ({
              productId,
              quantity,
              unitPrice: byId.get(productId)!.salePrice,
            })),
          },
        },
        include: { lines: { include: { product: true } } },
      });
      for (const line of sale.lines) {
        let remaining = line.quantity;
        const locations = await getLocationBalances(tx, line.productId);
        for (const [location, available] of locations) {
          if (remaining === 0) break;
          const quantity = Math.min(remaining, available);
          await tx.inventoryMovement.create({
            data: {
              productId: line.productId,
              type: MovementType.SALE_OUT,
              quantity,
              reason: `Sale ${sale.code}`,
              reference: sale.code,
              fromLocation: location,
              createdById: user.sub,
              saleLineId: line.id,
            },
          });
          remaining -= quantity;
        }
        if (remaining > 0) throw new BadRequestException(`Stock location balance changed for ${line.product.nameAr}`);
      }
      return {
        id: sale.id,
        code: sale.code,
        customerId: sale.customerId,
        customer: customer.name,
        date: sale.createdAt.toISOString().slice(0, 10),
        payment: sale.payment,
        total: sale.lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async customerBalances() {
    const [customers, creditSales] = await Promise.all([
      this.prisma.customer.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      this.prisma.sale.findMany({
        where: { payment: PaymentStatus.CREDIT },
        include: { lines: { select: { quantity: true, unitPrice: true } } },
      }),
    ]);
    const balances = new Map<string, number>();
    for (const sale of creditSales) {
      const amount = sale.lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
      balances.set(sale.customerId, (balances.get(sale.customerId) ?? 0) + amount);
    }
    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      type: customer.type,
      phone: customer.phone,
      credit: Number(customer.openingCredit) + (balances.get(customer.id) ?? 0),
    }));
  }
}
