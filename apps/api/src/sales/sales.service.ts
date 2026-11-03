import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, PaymentStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { getLocationBalances, getProductStock } from '../common/stock';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerPaymentDto, CreateSaleDto } from './sales.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const sales = await this.prisma.sale.findMany({
      include: {
        customer: true,
        lines: { include: { product: true } },
        paymentAllocations: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return sales.map((sale) => this.toSaleResponse(sale));
  }

  private toSaleResponse(sale: {
    id: string;
    code: string;
    customerId: string;
    customer: { name: string };
    createdAt: Date;
    payment: PaymentStatus;
    lines: { productId: string; product: { nameAr: string }; quantity: number; unitPrice: Prisma.Decimal }[];
    paymentAllocations: { amount: Prisma.Decimal }[];
  }) {
    const total = sale.lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
    const paidAmount = sale.payment === PaymentStatus.PAID
      ? total
      : sale.paymentAllocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
    return {
      id: sale.id,
      code: sale.code,
      customerId: sale.customerId,
      customer: sale.customer.name,
      date: sale.createdAt.toISOString().slice(0, 10),
      payment: paidAmount >= total ? PaymentStatus.PAID : PaymentStatus.CREDIT,
      total,
      paidAmount,
      balance: Math.max(0, total - paidAmount),
      lines: sale.lines.map((line) => ({
        productId: line.productId,
        productName: line.product.nameAr,
        quantity: line.quantity,
        unitPrice: Number(line.unitPrice),
      })),
      payments: sale.paymentAllocations.map((allocation) => Number(allocation.amount)),
    };
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

  async receiveCustomerPayment(customerId: string, input: CreateCustomerPaymentDto, user: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customerId} FOR UPDATE`;
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          include: {
            payments: { include: { allocations: true }, orderBy: { receivedAt: 'desc' } },
            sales: {
              where: { payment: PaymentStatus.CREDIT },
              include: {
                lines: { select: { quantity: true, unitPrice: true } },
                paymentAllocations: { select: { amount: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        if (!customer || !customer.active) throw new NotFoundException('Customer not found');

        const amount = new Prisma.Decimal(input.amount);
        const openingPaid = customer.payments.reduce(
          (sum, payment) => sum.plus(payment.allocations.filter((allocation) => allocation.saleId === null).reduce(
            (allocated, allocation) => allocated.plus(allocation.amount),
            new Prisma.Decimal(0),
          )),
          new Prisma.Decimal(0),
        );
        const openingBalance = Prisma.Decimal.max(
          new Prisma.Decimal(0),
          new Prisma.Decimal(customer.openingCredit).minus(openingPaid),
        );
        const saleBalances = customer.sales.map((sale) => {
          const total = sale.lines.reduce(
            (sum, line) => sum.plus(line.unitPrice.mul(line.quantity)),
            new Prisma.Decimal(0),
          );
          const paid = sale.paymentAllocations.reduce(
            (sum, allocation) => sum.plus(allocation.amount),
            new Prisma.Decimal(0),
          );
          return { id: sale.id, balance: Prisma.Decimal.max(new Prisma.Decimal(0), total.minus(paid)) };
        });
        const balance = saleBalances.reduce(
          (sum, sale) => sum.plus(sale.balance),
          openingBalance,
        );
        if (amount.greaterThan(balance)) {
          throw new BadRequestException(`Payment exceeds the outstanding balance of ${balance.toFixed(3)}`);
        }

        let remaining = amount;
        const allocations: { saleId?: string; amount: Prisma.Decimal }[] = [];
        if (openingBalance.greaterThan(0)) {
          const applied = remaining.greaterThan(openingBalance) ? openingBalance : remaining;
          allocations.push({ amount: applied });
          remaining = remaining.minus(applied);
        }
        for (const sale of saleBalances) {
          if (remaining.isZero()) break;
          if (sale.balance.isZero()) continue;
          const applied = remaining.greaterThan(sale.balance) ? sale.balance : remaining;
          allocations.push({ saleId: sale.id, amount: applied });
          remaining = remaining.minus(applied);
        }
        if (!remaining.isZero()) throw new BadRequestException('Payment could not be allocated to the outstanding balance');

        return tx.customerPayment.create({
          data: {
            customerId,
            amount,
            note: input.note?.trim() || null,
            recordedById: user.sub,
            allocations: { create: allocations },
          },
          include: { allocations: true },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Another payment was recorded at the same time; reload and retry');
      }
      throw error;
    }
  }

  async customerBalances() {
    const customers = await this.prisma.customer.findMany({
      where: { active: true },
      include: {
        payments: { include: { allocations: true }, orderBy: { receivedAt: 'desc' } },
        sales: {
          where: { payment: PaymentStatus.CREDIT },
          include: {
            lines: { select: { quantity: true, unitPrice: true } },
            paymentAllocations: { select: { amount: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return customers.map((customer) => {
      const openingPaid = customer.payments.reduce(
        (sum, payment) => sum + payment.allocations
          .filter((allocation) => allocation.saleId === null)
          .reduce((total, allocation) => total + Number(allocation.amount), 0),
        0,
      );
      const creditSales = customer.sales.reduce((sum, sale) => {
        const total = sale.lines.reduce((amount, line) => amount + Number(line.unitPrice) * line.quantity, 0);
        const paid = sale.paymentAllocations.reduce((amount, allocation) => amount + Number(allocation.amount), 0);
        return sum + Math.max(0, total - paid);
      }, 0);
      return {
        id: customer.id,
        name: customer.name,
        type: customer.type,
        phone: customer.phone,
        openingCredit: Number(customer.openingCredit),
        credit: Math.max(0, Number(customer.openingCredit) - openingPaid) + creditSales,
        payments: customer.payments.slice(0, 20).map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          note: payment.note,
          receivedAt: payment.receivedAt.toISOString(),
          allocations: payment.allocations.map((allocation) => ({
            saleId: allocation.saleId,
            amount: Number(allocation.amount),
          })),
        })),
      };
    });
  }
}
