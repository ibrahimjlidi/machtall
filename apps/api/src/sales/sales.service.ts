import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  CashLedgerEntryType,
  MovementType,
  PaymentStatus,
  Prisma,
  SalesReturnStatus,
  SaleApprovalStatus,
  UserRole,
} from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { getLocationBalances, getProductStock } from '../common/stock';
import { writeAudit } from '../common/audit';
import { expectedCashForSession, openSessionForCash } from '../common/cash-session';
import { PrismaService } from '../prisma/prisma.service';
import {
  CloseCashSessionDto,
  CreateCustomerPaymentDto,
  CreateSaleDto,
  CreateSalesReturnDto,
  OpenCashSessionDto,
  ReviewSalesReturnDto,
  VerifySalesReturnDto,
} from './sales.dto';

const activeReturnStatuses: SalesReturnStatus[] = [SalesReturnStatus.APPROVED, SalesReturnStatus.COMPLETED];

const saleInclude = {
  customer: { select: { id: true, name: true } },
  lines: {
    include: {
      product: {
        select: { id: true, sku: true, nameAr: true, nameFr: true, homeLocation: true },
      },
    },
  },
  paymentAllocations: { select: { amount: true } },
  returns: { include: { lines: true, cashEntry: { select: { amount: true } } } },
  createdBy: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, name: true } },
} satisfies Prisma.SaleInclude;
type SaleWithDetails = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

const sessionInclude = {
  entries: { select: { type: true, amount: true, createdAt: true } },
  user: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true } },
  varianceApprovedBy: { select: { id: true, name: true } },
} satisfies Prisma.CashSessionInclude;
type SessionWithDetails = Prisma.CashSessionGetPayload<{ include: typeof sessionInclude }>;

const returnInclude = {
  sale: {
    select: {
      id: true,
      code: true,
      payment: true,
      approvalStatus: true,
      customer: { select: { name: true } },
      createdById: true,
    },
  },
  requestedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  rejectedBy: { select: { id: true, name: true } },
  verifiedBy: { select: { id: true, name: true } },
  lines: {
    include: {
      saleLine: {
        include: {
          product: {
            select: { id: true, sku: true, nameAr: true, nameFr: true, homeLocation: true },
          },
        },
      },
    },
  },
} satisfies Prisma.SalesReturnInclude;
type ReturnWithDetails = Prisma.SalesReturnGetPayload<{ include: typeof returnInclude }>;

function sumReturnLines(lines: { quantity: number; saleLine: { unitPrice: Prisma.Decimal } }[]) {
  return lines.reduce(
    (sum, line) => sum.plus(line.saleLine.unitPrice.mul(line.quantity)),
    new Prisma.Decimal(0),
  );
}

function activeReturnsTotal(returns: { status: SalesReturnStatus; lines: { quantity: number; saleLine?: { unitPrice: Prisma.Decimal } }[] }[]) {
  return returns
    .filter((item) => activeReturnStatuses.includes(item.status))
    .reduce((sum, item) => sum + item.lines.reduce(
      (amount, line) => amount + Number(line.saleLine?.unitPrice ?? 0) * line.quantity,
      0,
    ), 0);
}

function sessionExpectedCash(session: Pick<SessionWithDetails, 'openingFloat' | 'entries'>) {
  return expectedCashForSession(session);
}

function makeCode(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const sales = await this.prisma.sale.findMany({
      where: user.role === UserRole.SELLER ? { createdById: user.sub } : undefined,
      include: saleInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return sales.map((sale) => this.toSaleResponse(sale));
  }

  private toSaleResponse(sale: SaleWithDetails) {
    const total = sale.lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
    const linePrices = new Map(sale.lines.map((line) => [line.id, Number(line.unitPrice)]));
    const acceptedReturns = sale.returns.filter((item) => activeReturnStatuses.includes(item.status));
    const returnedAmount = acceptedReturns.reduce((sum, item) => sum + item.lines.reduce(
      (amount, line) => amount + (linePrices.get(line.saleLineId) ?? 0) * line.quantity,
      0,
    ), 0);
    const refundedCash = acceptedReturns.reduce((sum, item) => sum + Number(item.cashRefundAmount), 0);
    const paidAmount = sale.approvalStatus !== SaleApprovalStatus.APPROVED
      ? 0
      : sale.payment === PaymentStatus.PAID
        ? Math.max(0, total - refundedCash)
        : Math.max(0, sale.paymentAllocations.reduce(
          (sum, allocation) => sum + Number(allocation.amount),
          0,
        ) - refundedCash);
    const balance = sale.approvalStatus === SaleApprovalStatus.APPROVED
      ? Math.max(0, total - returnedAmount - paidAmount)
      : 0;
    return {
      id: sale.id,
      code: sale.code,
      customerId: sale.customerId,
      customer: sale.customer.name,
      date: sale.createdAt.toISOString().slice(0, 10),
      createdAt: sale.createdAt.toISOString(),
      createdBy: sale.createdBy,
      payment: sale.payment,
      approvalStatus: sale.approvalStatus,
      reviewNote: sale.reviewNote,
      reviewedBy: sale.reviewedBy,
      reviewedAt: sale.reviewedAt?.toISOString() ?? null,
      cashSessionId: sale.cashSessionId,
      total,
      returnedAmount,
      paidAmount,
      balance,
      lines: sale.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        productName: line.product.nameAr,
        productNameFr: line.product.nameFr,
        sku: line.product.sku,
        quantity: line.quantity,
        unitPrice: Number(line.unitPrice),
      })),
      returns: sale.returns.map((item) => ({
        id: item.id,
        code: item.code,
        status: item.status,
        reason: item.reason,
        createdAt: item.createdAt.toISOString(),
        lines: item.lines.map((line) => ({
          saleLineId: line.saleLineId,
          quantity: line.quantity,
          restockedQuantity: line.restockedQuantity,
        })),
      })),
    };
  }

  private toSessionResponse(session: SessionWithDetails) {
    const expected = sessionExpectedCash(session);
    return {
      id: session.id,
      userId: session.userId,
      user: session.user,
      openedAt: session.openedAt.toISOString(),
      openingFloat: Number(session.openingFloat),
      closedAt: session.closedAt?.toISOString() ?? null,
      closingCash: session.closingCash === null ? null : Number(session.closingCash),
      expectedCash: session.expectedCash === null ? Number(expected) : Number(session.expectedCash),
      variance: session.variance === null ? null : Number(session.variance),
      reviewedBy: session.reviewedBy,
      reviewedAt: session.reviewedAt?.toISOString() ?? null,
      reviewNote: session.reviewNote,
      varianceApprovedBy: session.varianceApprovedBy,
      varianceApprovedAt: session.varianceApprovedAt?.toISOString() ?? null,
      entries: session.entries.map((entry) => ({
        type: entry.type,
        amount: Number(entry.amount),
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  private toReturnResponse(item: ReturnWithDetails, user: AuthUser) {
    const canSeeCustomer = user.role !== UserRole.STOREKEEPER;
    return {
      id: item.id,
      code: item.code,
      saleId: item.sale.id,
      saleCode: item.sale.code,
      customer: canSeeCustomer ? item.sale.customer.name : undefined,
      status: item.status,
      reason: item.reason,
      reviewNote: item.reviewNote,
      requestedBy: item.requestedBy,
      approvedBy: item.approvedBy,
      rejectedBy: item.rejectedBy,
      verifiedBy: item.verifiedBy,
      createdAt: item.createdAt.toISOString(),
      approvedAt: item.approvedAt?.toISOString() ?? null,
      verifiedAt: item.verifiedAt?.toISOString() ?? null,
      cashRefundAmount: Number(item.cashRefundAmount),
      lines: item.lines.map((line) => ({
        id: line.id,
        saleLineId: line.saleLineId,
        productId: line.saleLine.productId,
        productName: line.saleLine.product.nameAr,
        sku: line.saleLine.product.sku,
        location: line.saleLine.product.homeLocation,
        quantity: line.quantity,
        unitPrice: Number(line.saleLine.unitPrice),
        restockedQuantity: line.restockedQuantity,
      })),
    };
  }

  async listCashSessions(user: AuthUser) {
    const sessions = await this.prisma.cashSession.findMany({
      where: user.role === UserRole.SELLER ? { userId: user.sub } : undefined,
      include: sessionInclude,
      orderBy: { openedAt: 'desc' },
      take: 100,
    });
    return sessions.map((session) => this.toSessionResponse(session));
  }

  async openCashSession(input: OpenCashSessionDto, user: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.cashSession.findFirst({
          where: { userId: user.sub, closedAt: null },
          select: { id: true },
        });
        if (existing) throw new ConflictException('You already have an open cash session');
        const session = await tx.cashSession.create({
          data: { userId: user.sub, openingFloat: new Prisma.Decimal(input.openingFloat) },
          include: sessionInclude,
        });
        await writeAudit(tx, user.sub, 'cash_session.opened', 'cash_session', session.id, {
          openingFloat: Number(session.openingFloat),
        });
        return this.toSessionResponse(session);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You already have an open cash session');
      }
      throw error;
    }
  }

  async closeCashSession(id: string, input: CloseCashSessionDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CashSession" WHERE "id" = ${id} FOR UPDATE`;
      const session = await tx.cashSession.findUnique({
        where: { id },
        include: sessionInclude,
      });
      if (!session) throw new NotFoundException('Cash session not found');
      if (session.userId !== user.sub) {
        throw new ForbiddenException('You can only close your own cash session');
      }
      if (session.closedAt) throw new ConflictException('Cash session is already closed');

      const expected = sessionExpectedCash(session);
      const closingCash = new Prisma.Decimal(input.closingCash);
      const variance = closingCash.minus(expected);
      const closed = await tx.cashSession.update({
        where: { id },
        data: {
          closedAt: new Date(),
          closedById: user.sub,
          closingCash,
          expectedCash: expected,
          variance,
        },
        include: sessionInclude,
      });
      await writeAudit(tx, user.sub, 'cash_session.closed', 'cash_session', session.id, {
        expectedCash: Number(expected),
        closingCash: Number(closingCash),
        variance: Number(variance),
      });
      return this.toSessionResponse(closed);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async postSaleStock(
    tx: Prisma.TransactionClient,
    sale: {
      id: string;
      code: string;
      lines: { id: string; productId: string; quantity: number; product: { nameAr: string } }[];
    },
    actorId: string,
  ) {
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
            createdById: actorId,
            saleLineId: line.id,
          },
        });
        remaining -= quantity;
      }
      if (remaining > 0) {
        throw new BadRequestException(`Stock location balance changed for ${line.product.nameAr}`);
      }
    }
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
      const session = input.payment === PaymentStatus.PAID
        ? await openSessionForCash(tx, user)
        : null;
      const byId = new Map(products.map((product) => [product.id, product]));
      const code = makeCode('V');
      const sale = await tx.sale.create({
        data: {
          code,
          customerId: customer.id,
          payment: input.payment,
          approvalStatus: input.payment === PaymentStatus.CREDIT
            ? SaleApprovalStatus.PENDING
            : SaleApprovalStatus.APPROVED,
          cashSessionId: session?.id,
          createdById: user.sub,
          lines: {
            create: [...requested].map(([productId, quantity]) => ({
              productId,
              quantity,
              unitPrice: byId.get(productId)!.salePrice,
            })),
          },
        },
        include: {
          lines: { include: { product: { select: { nameAr: true } } } },
        },
      });
      if (input.payment === PaymentStatus.PAID) {
        await this.postSaleStock(tx, sale, user.sub);
        await tx.cashLedgerEntry.create({
          data: {
            sessionId: session!.id,
            type: CashLedgerEntryType.SALE,
            amount: sale.lines.reduce(
              (sum, line) => sum.plus(line.unitPrice.mul(line.quantity)),
              new Prisma.Decimal(0),
            ),
            reason: `Sale ${sale.code}`,
            createdById: user.sub,
            saleId: sale.id,
          },
        });
      }
      const total = sale.lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
      await writeAudit(tx, user.sub, 'sale.created', 'sale', sale.id, {
        code: sale.code,
        customerId: sale.customerId,
        total,
        payment: sale.payment,
        approvalStatus: sale.approvalStatus,
      });
      return this.toSaleResponse(await tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: saleInclude,
      }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async approveCreditSale(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Sale" WHERE "id" = ${id} FOR UPDATE`;
      const sale = await tx.sale.findUnique({
        where: { id },
        include: {
          lines: { include: { product: { select: { nameAr: true, active: true } } } },
        },
      });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.payment !== PaymentStatus.CREDIT) throw new ConflictException('Only credit sales need approval');
      if (sale.approvalStatus !== SaleApprovalStatus.PENDING) {
        throw new ConflictException('Credit sale is no longer awaiting approval');
      }
      if (sale.lines.some((line) => !line.product.active)) {
        throw new ConflictException('A product in this sale is no longer active');
      }
      await this.postSaleStock(tx, sale, user.sub);
      const approved = await tx.sale.update({
        where: { id },
        data: { approvalStatus: SaleApprovalStatus.APPROVED, reviewedById: user.sub, reviewedAt: new Date() },
      });
      await writeAudit(tx, user.sub, 'sale.credit_approved', 'sale', sale.id, { code: sale.code });
      return this.toSaleResponse(await tx.sale.findUniqueOrThrow({
        where: { id: approved.id },
        include: saleInclude,
      }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async rejectCreditSale(id: string, input: ReviewSalesReturnDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id } });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.payment !== PaymentStatus.CREDIT || sale.approvalStatus !== SaleApprovalStatus.PENDING) {
        throw new ConflictException('Credit sale is no longer awaiting approval');
      }
      await tx.sale.update({
        where: { id },
        data: {
          approvalStatus: SaleApprovalStatus.REJECTED,
          reviewedById: user.sub,
          reviewedAt: new Date(),
          reviewNote: input.reason.trim(),
        },
      });
      await writeAudit(tx, user.sub, 'sale.credit_rejected', 'sale', sale.id, {
        code: sale.code,
        reason: input.reason.trim(),
      });
      return this.toSaleResponse(await tx.sale.findUniqueOrThrow({
        where: { id },
        include: saleInclude,
      }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listReturns(user: AuthUser) {
    const returns = await this.prisma.salesReturn.findMany({
      where: user.role === UserRole.SELLER
        ? { sale: { createdById: user.sub } }
        : user.role === UserRole.STOREKEEPER
          ? { status: SalesReturnStatus.APPROVED }
          : undefined,
      include: returnInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return returns.map((item) => this.toReturnResponse(item, user));
  }

  async requestReturn(saleId: string, input: CreateSalesReturnDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Sale" WHERE "id" = ${saleId} FOR UPDATE`;
      const sale = await tx.sale.findFirst({
        where: {
          id: saleId,
          approvalStatus: SaleApprovalStatus.APPROVED,
          ...(user.role === UserRole.SELLER && { createdById: user.sub }),
        },
        include: {
          lines: true,
          returns: { include: { lines: true } },
        },
      });
      if (!sale) throw new NotFoundException('Sale not found');

      const requested = new Map<string, number>();
      for (const line of input.lines) {
        requested.set(line.productId, (requested.get(line.productId) ?? 0) + line.quantity);
      }
      const alreadyRequested = new Map<string, number>();
      for (const item of sale.returns.filter((entry) => entry.status !== SalesReturnStatus.REJECTED)) {
        for (const line of item.lines) {
          alreadyRequested.set(line.saleLineId, (alreadyRequested.get(line.saleLineId) ?? 0) + line.quantity);
        }
      }
      const saleLines = new Map(sale.lines.map((line) => [line.productId, line]));
      const lines = [...requested].map(([productId, quantity]) => {
        const saleLine = saleLines.get(productId);
        if (!saleLine) throw new BadRequestException('A returned product is not part of this sale');
        const remaining = saleLine.quantity - (alreadyRequested.get(saleLine.id) ?? 0);
        if (quantity > remaining) {
          throw new BadRequestException(`Return quantity exceeds the remaining sold quantity for ${productId}`);
        }
        return { saleLineId: saleLine.id, quantity };
      });
      const item = await tx.salesReturn.create({
        data: {
          code: makeCode('R'),
          saleId,
          reason: input.reason.trim(),
          requestedById: user.sub,
          lines: { create: lines },
        },
        include: returnInclude,
      });
      await writeAudit(tx, user.sub, 'sale.return_requested', 'sales_return', item.id, {
        code: item.code,
        saleCode: sale.code,
        reason: item.reason,
      });
      return this.toReturnResponse(item, user);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async approveReturn(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "SalesReturn" WHERE "id" = ${id} FOR UPDATE`;
      const item = await tx.salesReturn.findUnique({
        where: { id },
        include: {
          sale: {
            include: {
              lines: true,
              paymentAllocations: { select: { amount: true } },
              returns: {
                where: { status: { in: activeReturnStatuses } },
                include: { lines: { include: { saleLine: { select: { unitPrice: true } } } } },
              },
            },
          },
          lines: { include: { saleLine: true } },
        },
      });
      if (!item) throw new NotFoundException('Return request not found');
      if (item.status !== SalesReturnStatus.PENDING) {
        throw new ConflictException('Return request is no longer awaiting approval');
      }
      const returnAmount = sumReturnLines(item.lines);
      const previousReturns = item.sale.returns.reduce(
        (sum, previous) => sum.plus(sumReturnLines(previous.lines)),
        new Prisma.Decimal(0),
      );
      const saleTotal = item.sale.lines.reduce(
        (sum, line) => sum.plus(line.unitPrice.mul(line.quantity)),
        new Prisma.Decimal(0),
      );
      const collected = item.sale.payment === PaymentStatus.PAID
        ? saleTotal
        : item.sale.paymentAllocations.reduce((sum, allocation) => sum.plus(allocation.amount), new Prisma.Decimal(0));
      const outstanding = Prisma.Decimal.max(new Prisma.Decimal(0), saleTotal.minus(previousReturns).minus(collected));
      const cashRefund = item.sale.payment === PaymentStatus.PAID
        ? returnAmount
        : Prisma.Decimal.max(new Prisma.Decimal(0), returnAmount.minus(outstanding));
      const session = cashRefund.greaterThan(0)
        ? await tx.cashSession.findFirst({
          where: { userId: user.sub, closedAt: null },
          select: { id: true },
        })
        : null;
      if (cashRefund.greaterThan(0) && !session) {
        throw new ConflictException('Open your cash session before approving a cash refund');
      }

      const approved = await tx.salesReturn.update({
        where: { id },
        data: {
          status: SalesReturnStatus.APPROVED,
          approvedById: user.sub,
          approvedAt: new Date(),
          cashRefundAmount: cashRefund,
          cashSessionId: session?.id,
        },
        include: returnInclude,
      });
      if (cashRefund.greaterThan(0)) {
        await tx.cashLedgerEntry.create({
          data: {
            sessionId: session!.id,
            type: CashLedgerEntryType.REFUND,
            amount: cashRefund,
            reason: `Return ${item.code}`,
            createdById: user.sub,
            salesReturnId: item.id,
          },
        });
      }
      await writeAudit(tx, user.sub, 'sale.return_approved', 'sales_return', item.id, {
        code: item.code,
        saleCode: item.sale.code,
        returnAmount: Number(returnAmount),
        cashRefundAmount: Number(cashRefund),
      });
      return this.toReturnResponse(approved, user);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async rejectReturn(id: string, input: ReviewSalesReturnDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.salesReturn.findUnique({ where: { id } });
      if (!item) throw new NotFoundException('Return request not found');
      if (item.status !== SalesReturnStatus.PENDING) {
        throw new ConflictException('Return request is no longer awaiting approval');
      }
      const rejected = await tx.salesReturn.update({
        where: { id },
        data: {
          status: SalesReturnStatus.REJECTED,
          rejectedById: user.sub,
          rejectedAt: new Date(),
          reviewNote: input.reason.trim(),
        },
        include: returnInclude,
      });
      await writeAudit(tx, user.sub, 'sale.return_rejected', 'sales_return', item.id, {
        code: item.code,
        reason: input.reason.trim(),
      });
      return this.toReturnResponse(rejected, user);
    });
  }

  async verifyReturn(id: string, input: VerifySalesReturnDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "SalesReturn" WHERE "id" = ${id} FOR UPDATE`;
      const item = await tx.salesReturn.findUnique({
        where: { id },
        include: { ...returnInclude, lines: { include: { saleLine: { include: { product: true } } } } },
      });
      if (!item) throw new NotFoundException('Return request not found');
      if (item.status !== SalesReturnStatus.APPROVED) {
        throw new ConflictException('Only an approved return can be verified');
      }
      const requested = new Map(input.lines.map((line) => [line.returnLineId, line.restockedQuantity]));
      if (requested.size !== item.lines.length || item.lines.some((line) => !requested.has(line.id))) {
        throw new BadRequestException('Provide a restock quantity for every returned product');
      }
      for (const line of item.lines) {
        const quantity = requested.get(line.id)!;
        if (quantity > line.quantity) {
          throw new BadRequestException('Restocked quantity cannot exceed the approved return quantity');
        }
        if (quantity > 0) {
          await tx.inventoryMovement.create({
            data: {
              productId: line.saleLine.productId,
              type: MovementType.SALE_RETURN_IN,
              quantity,
              reason: `Verified customer return ${item.code}`,
              reference: item.code,
              toLocation: line.saleLine.product.homeLocation,
              createdById: user.sub,
              salesReturnLineId: line.id,
            },
          });
        }
        await tx.salesReturnLine.update({
          where: { id: line.id },
          data: { restockedQuantity: quantity },
        });
      }
      const verified = await tx.salesReturn.update({
        where: { id },
        data: {
          status: SalesReturnStatus.COMPLETED,
          verifiedById: user.sub,
          verifiedAt: new Date(),
        },
        include: returnInclude,
      });
      await writeAudit(tx, user.sub, 'sale.return_verified', 'sales_return', item.id, {
        code: item.code,
        restockedQuantity: input.lines.reduce((sum, line) => sum + line.restockedQuantity, 0),
      });
      return this.toReturnResponse(verified, user);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async receiveCustomerPayment(customerId: string, input: CreateCustomerPaymentDto, user: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customerId} FOR UPDATE`;
        const method = input.method ?? 'CASH';
        const reference = input.reference?.trim() || null;
        if (method !== 'CASH' && !reference) {
          throw new BadRequestException('A reference is required for bank transfer and cheque payments');
        }
        if (method !== 'CASH' && input.cashSessionId) {
          throw new BadRequestException('Non-cash payments must not use a cashier session');
        }
        const session = method === 'CASH'
          ? await openSessionForCash(tx, user, input.cashSessionId, true)
          : null;
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          include: {
            payments: { include: { allocations: true }, orderBy: { receivedAt: 'desc' } },
            sales: {
              where: {
                payment: PaymentStatus.CREDIT,
                approvalStatus: SaleApprovalStatus.APPROVED,
                ...(user.role === UserRole.SELLER && { createdById: user.sub }),
              },
              include: {
                lines: { select: { quantity: true, unitPrice: true } },
                paymentAllocations: { select: { amount: true } },
                returns: {
                  where: { status: { in: activeReturnStatuses } },
                  include: { lines: { include: { saleLine: { select: { unitPrice: true } } } } },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        if (!customer || !customer.active) throw new NotFoundException('Customer not found');
        if (user.role === UserRole.SELLER && !customer.sales.length) {
          throw new NotFoundException('No outstanding sales for this customer belong to this seller');
        }

        const amount = new Prisma.Decimal(input.amount);
        const openingPaid = customer.payments.reduce(
          (sum, payment) => sum.plus(payment.allocations.filter((allocation) => allocation.saleId === null).reduce(
            (allocated, allocation) => allocated.plus(allocation.amount),
            new Prisma.Decimal(0),
          )),
          new Prisma.Decimal(0),
        );
        const openingBalance = user.role === UserRole.SELLER ? new Prisma.Decimal(0) : Prisma.Decimal.max(
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
          const returned = activeReturnsTotal(sale.returns);
          return { id: sale.id, balance: Prisma.Decimal.max(new Prisma.Decimal(0), total.minus(paid).minus(returned)) };
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

        const payment = await tx.customerPayment.create({
          data: {
            customerId,
            amount,
            method,
            reference,
            note: input.note?.trim() || null,
            recordedById: user.sub,
            cashSessionId: session?.id,
            allocations: { create: allocations },
          },
          include: { allocations: true },
        });
        if (session) {
          await tx.cashLedgerEntry.create({
            data: {
              sessionId: session.id,
              type: CashLedgerEntryType.CUSTOMER_PAYMENT,
              amount,
              reason: `Customer payment ${payment.id}`,
              createdById: user.sub,
              customerPaymentId: payment.id,
            },
          });
        }
        await writeAudit(tx, user.sub, 'customer_payment.recorded', 'customer_payment', payment.id, {
          customerId,
          amount: Number(payment.amount),
          method,
          cashSessionId: session?.id,
          allocationCount: payment.allocations.length,
        });
        return payment;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Another payment was recorded at the same time; reload and retry');
      }
      throw error;
    }
  }

  async customerBalances(user: AuthUser) {
    const customers = await this.prisma.customer.findMany({
      where: {
        active: true,
        ...(user.role === UserRole.SELLER && { sales: { some: { createdById: user.sub } } }),
      },
      include: {
        payments: {
          where: user.role === UserRole.SELLER
            ? { allocations: { some: { sale: { createdById: user.sub } } }
              }
            : undefined,
          include: {
            allocations: {
              where: user.role === UserRole.SELLER
                ? { sale: { createdById: user.sub } }
                : undefined,
            },
          },
          orderBy: { receivedAt: 'desc' },
        },
        sales: {
          where: {
            payment: PaymentStatus.CREDIT,
            approvalStatus: SaleApprovalStatus.APPROVED,
            ...(user.role === UserRole.SELLER && { createdById: user.sub }),
          },
          include: {
            lines: { select: { quantity: true, unitPrice: true } },
            paymentAllocations: { select: { amount: true } },
            returns: {
              where: { status: { in: activeReturnStatuses } },
              include: { lines: { include: { saleLine: { select: { unitPrice: true } } } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return customers.map((customer) => {
      const openingPaid = user.role === UserRole.SELLER ? 0 : customer.payments.reduce(
        (sum, payment) => sum + payment.allocations
          .filter((allocation) => allocation.saleId === null)
          .reduce((total, allocation) => total + Number(allocation.amount), 0),
        0,
      );
      const creditSales = customer.sales.reduce((sum, sale) => {
        const total = sale.lines.reduce((amount, line) => amount + Number(line.unitPrice) * line.quantity, 0);
        const paid = sale.paymentAllocations.reduce((amount, allocation) => amount + Number(allocation.amount), 0);
        const returned = activeReturnsTotal(sale.returns);
        return sum + Math.max(0, total - paid - returned);
      }, 0);
      return {
        id: customer.id,
        name: customer.name,
        type: customer.type,
        phone: customer.phone,
        openingCredit: user.role === UserRole.SELLER ? 0 : Number(customer.openingCredit),
        credit: (user.role === UserRole.SELLER ? 0 : Math.max(0, Number(customer.openingCredit) - openingPaid)) + creditSales,
        payments: customer.payments.slice(0, 20).map((payment) => {
          const allocations = payment.allocations.map((allocation) => ({
            saleId: allocation.saleId,
            amount: Number(allocation.amount),
          }));
          return {
            id: payment.id,
            amount: user.role === UserRole.SELLER
              ? allocations.reduce((sum, allocation) => sum + allocation.amount, 0)
              : Number(payment.amount),
            note: payment.note,
            method: payment.method,
            reference: payment.reference,
            receivedAt: payment.receivedAt.toISOString(),
            allocations,
          };
        }),
      };
    });
  }
}
