import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountingPaymentMethod,
  CashLedgerEntryType,
  ExpenseStatus,
  Prisma,
  SupplierInvoiceStatus,
  UserRole,
} from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { writeAudit } from '../common/audit';
import { assertCashPaymentAvailable, openSessionForCash } from '../common/cash-session';
import { PrismaService } from '../prisma/prisma.service';
import {
  CashSessionReviewDto,
  CreateAccountingPaymentDto,
  CreateExpenseDto,
  CreateVatRateDto,
  ExpenseReviewDto,
  RejectExpenseDto,
  UpdateVatRateDto,
} from './accounting.dto';

const cashSessionInclude = {
  entries: { select: { type: true, amount: true, createdAt: true } },
  user: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true } },
  varianceApprovedBy: { select: { id: true, name: true } },
} satisfies Prisma.CashSessionInclude;
type CashSessionWithDetails = Prisma.CashSessionGetPayload<{ include: typeof cashSessionInclude }>;

function toCashSessionResponse(session: CashSessionWithDetails) {
  return {
    id: session.id,
    userId: session.userId,
    user: session.user,
    openedAt: session.openedAt.toISOString(),
    openingFloat: Number(session.openingFloat),
    closedAt: session.closedAt?.toISOString() ?? null,
    closingCash: session.closingCash === null ? null : Number(session.closingCash),
    expectedCash: session.expectedCash === null ? null : Number(session.expectedCash),
    variance: session.variance === null ? null : Number(session.variance),
    entries: session.entries.map((entry) => ({
      type: entry.type,
      amount: Number(entry.amount),
      createdAt: entry.createdAt.toISOString(),
    })),
    reviewedBy: session.reviewedBy,
    reviewedAt: session.reviewedAt?.toISOString() ?? null,
    reviewNote: session.reviewNote,
    varianceApprovedBy: session.varianceApprovedBy,
    varianceApprovedAt: session.varianceApprovedAt?.toISOString() ?? null,
  };
}

function paymentReference(input: CreateAccountingPaymentDto) {
  const reference = input.reference?.trim() || null;
  if (input.method !== AccountingPaymentMethod.CASH && !reference) {
    throw new BadRequestException('A reference is required for bank transfer and cheque payments');
  }
  if (input.method === AccountingPaymentMethod.CASH && reference) {
    throw new BadRequestException('Cash payments must not include a transfer or cheque reference');
  }
  if (input.method !== AccountingPaymentMethod.CASH && input.cashSessionId) {
    throw new BadRequestException('Non-cash payments must not use a cashier session');
  }
  if (input.method === AccountingPaymentMethod.CASH && !input.cashSessionId) {
    throw new BadRequestException('Select an open cashier session for this cash payment');
  }
  return reference;
}

function toExpenseResponse(expense: {
  id: string;
  category: string;
  description: string;
  amount: Prisma.Decimal;
  incurredAt: Date;
  status: ExpenseStatus;
  requestedBy: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  payments: { id: string; amount: Prisma.Decimal; method: AccountingPaymentMethod; reference: string | null; paidAt: Date }[];
  createdAt: Date;
}) {
  const paid = expense.payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  return {
    ...expense,
    amount: Number(expense.amount),
    incurredAt: expense.incurredAt.toISOString(),
    reviewedAt: expense.reviewedAt?.toISOString() ?? null,
    createdAt: expense.createdAt.toISOString(),
    paid: Number(paid),
    balance: Number(Prisma.Decimal.max(new Prisma.Decimal(0), expense.amount.minus(paid))),
    payments: expense.payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
      paidAt: payment.paidAt.toISOString(),
    })),
  };
}

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async listExpenses() {
    const expenses = await this.prisma.expense.findMany({
      include: {
        requestedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
      orderBy: [{ incurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return expenses.map(toExpenseResponse);
  }

  async createExpense(input: CreateExpenseDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          category: input.category,
          description: input.description,
          amount: new Prisma.Decimal(input.amount),
          incurredAt: new Date(input.incurredAt),
          requestedById: user.sub,
        },
        include: {
          requestedBy: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
          payments: true,
        },
      });
      await writeAudit(tx, user.sub, 'expense.recorded', 'expense', expense.id, {
        category: expense.category,
        amount: Number(expense.amount),
      });
      return toExpenseResponse(expense);
    });
  }

  async reviewExpense(id: string, input: ExpenseReviewDto | RejectExpenseDto, approved: boolean, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Expense" WHERE "id" = ${id} FOR UPDATE`;
      const expense = await tx.expense.findUnique({ where: { id } });
      if (!expense) throw new NotFoundException('Expense not found');
      if (expense.status !== ExpenseStatus.PENDING_APPROVAL) {
        throw new ConflictException('Only pending expenses can be reviewed');
      }
      const reviewed = await tx.expense.update({
        where: { id },
        data: {
          status: approved ? ExpenseStatus.APPROVED : ExpenseStatus.REJECTED,
          reviewedById: user.sub,
          reviewedAt: new Date(),
          reviewNote: input.note?.trim() || null,
        },
        include: {
          requestedBy: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
          payments: true,
        },
      });
      await writeAudit(tx, user.sub, approved ? 'expense.approved' : 'expense.rejected', 'expense', id, {
        amount: Number(expense.amount),
        note: input.note?.trim() || null,
      });
      return toExpenseResponse(reviewed);
    });
  }

  async payExpense(id: string, input: CreateAccountingPaymentDto, user: AuthUser) {
    const reference = paymentReference(input);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Expense" WHERE "id" = ${id} FOR UPDATE`;
        const expense = await tx.expense.findUnique({
          where: { id },
          include: { payments: { select: { amount: true } } },
        });
        if (!expense) throw new NotFoundException('Expense not found');
        if (expense.status !== ExpenseStatus.APPROVED) throw new ConflictException('Only approved expenses can be paid');
        const paid = expense.payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
        const amount = new Prisma.Decimal(input.amount);
        const outstanding = expense.amount.minus(paid);
        if (amount.greaterThan(outstanding)) {
          throw new BadRequestException(`Payment exceeds the outstanding expense balance of ${outstanding.toFixed(3)}`);
        }
        const session = input.method === AccountingPaymentMethod.CASH
          ? await openSessionForCash(tx, user, input.cashSessionId, true)
          : null;
        if (session) await assertCashPaymentAvailable(tx, session.id, amount);
        const payment = await tx.expensePayment.create({
          data: {
            expenseId: id,
            amount,
            method: input.method,
            reference,
            recordedById: user.sub,
            cashSessionId: session?.id,
          },
        });
        if (session) {
          await tx.cashLedgerEntry.create({
            data: {
              sessionId: session.id,
              type: CashLedgerEntryType.EXPENSE_PAYMENT,
              amount,
              reason: `Expense payment ${payment.id}`,
              createdById: user.sub,
              expensePaymentId: payment.id,
            },
          });
        }
        await writeAudit(tx, user.sub, 'expense.payment_recorded', 'expense_payment', payment.id, {
          expenseId: id,
          amount: Number(amount),
          method: input.method,
          cashSessionId: session?.id,
        });
        return { ...payment, amount: Number(payment.amount), paidAt: payment.paidAt.toISOString() };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Another expense payment was recorded at the same time; reload and retry');
      }
      throw error;
    }
  }

  async paySupplierInvoice(id: string, input: CreateAccountingPaymentDto, user: AuthUser) {
    const reference = paymentReference(input);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "SupplierInvoice" WHERE "id" = ${id} FOR UPDATE`;
        const invoice = await tx.supplierInvoice.findUnique({
          where: { id },
          include: { payments: { select: { amount: true } } },
        });
        if (!invoice) throw new NotFoundException('Supplier invoice not found');
        if (invoice.status !== SupplierInvoiceStatus.REVIEWED) {
          throw new ConflictException('Only reviewed supplier invoices can be paid');
        }
        if (invoice.totalAmount === null) {
          throw new ConflictException('This historical supplier invoice has no recorded amount and cannot be paid through the ledger');
        }
        const paid = invoice.payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
        const amount = new Prisma.Decimal(input.amount);
        const outstanding = invoice.totalAmount.minus(paid);
        if (!outstanding.greaterThan(0)) throw new ConflictException('Supplier invoice is already fully paid');
        if (amount.greaterThan(outstanding)) {
          throw new BadRequestException(`Payment exceeds the outstanding supplier balance of ${outstanding.toFixed(3)}`);
        }
        const session = input.method === AccountingPaymentMethod.CASH
          ? await openSessionForCash(tx, user, input.cashSessionId, true)
          : null;
        if (session) await assertCashPaymentAvailable(tx, session.id, amount);
        const payment = await tx.supplierPayment.create({
          data: {
            supplierInvoiceId: id,
            amount,
            method: input.method,
            reference,
            recordedById: user.sub,
            cashSessionId: session?.id,
          },
        });
        if (session) {
          await tx.cashLedgerEntry.create({
            data: {
              sessionId: session.id,
              type: CashLedgerEntryType.SUPPLIER_PAYMENT,
              amount,
              reason: `Supplier payment ${payment.id}`,
              createdById: user.sub,
              supplierPaymentId: payment.id,
            },
          });
        }
        await writeAudit(tx, user.sub, 'supplier_payment.recorded', 'supplier_payment', payment.id, {
          supplierInvoiceId: id,
          amount: Number(amount),
          method: input.method,
          cashSessionId: session?.id,
        });
        return { ...payment, amount: Number(payment.amount), paidAt: payment.paidAt.toISOString() };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Another supplier payment was recorded at the same time; reload and retry');
      }
      throw error;
    }
  }

  async reviewCashSession(id: string, input: CashSessionReviewDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CashSession" WHERE "id" = ${id} FOR UPDATE`;
      const session = await tx.cashSession.findUnique({ where: { id } });
      if (!session) throw new NotFoundException('Cash session not found');
      if (!session.closedAt) throw new ConflictException('Only closed cash sessions can be reviewed');
      if (session.reviewedAt) throw new ConflictException('Cash session was already reviewed');
      const reviewed = await tx.cashSession.update({
        where: { id },
        data: { reviewedById: user.sub, reviewedAt: new Date(), reviewNote: input.note?.trim() || null },
        include: cashSessionInclude,
      });
      await writeAudit(tx, user.sub, 'cash_session.reviewed', 'cash_session', id, {
        variance: session.variance === null ? null : Number(session.variance),
        note: input.note?.trim() || null,
      });
      return toCashSessionResponse(reviewed);
    });
  }

  async approveCashVariance(id: string, input: CashSessionReviewDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CashSession" WHERE "id" = ${id} FOR UPDATE`;
      const session = await tx.cashSession.findUnique({ where: { id } });
      if (!session) throw new NotFoundException('Cash session not found');
      if (!session.closedAt || !session.reviewedAt) {
        throw new ConflictException('Review the closed cash session before approving its variance');
      }
      if (!session.variance || session.variance.isZero()) {
        throw new ConflictException('Only non-zero cash variances require approval');
      }
      if (session.varianceApprovedAt) throw new ConflictException('Cash variance was already approved');
      const approved = await tx.cashSession.update({
        where: { id },
        data: { varianceApprovedById: user.sub, varianceApprovedAt: new Date() },
        include: cashSessionInclude,
      });
      await writeAudit(tx, user.sub, 'cash_session.variance_approved', 'cash_session', id, {
        variance: Number(session.variance),
        note: input.note?.trim() || null,
      });
      return toCashSessionResponse(approved);
    });
  }

  listVatRates() {
    return this.prisma.vatRate.findMany({
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: [{ name: 'asc' }, { effectiveFrom: 'desc' }],
    }).then((rates) => ({
      applicationEnabled: false,
      rates: rates.map((rate) => ({
        ...rate,
        percentage: Number(rate.percentage),
        effectiveFrom: rate.effectiveFrom.toISOString(),
        effectiveTo: rate.effectiveTo?.toISOString() ?? null,
        createdAt: rate.createdAt.toISOString(),
        updatedAt: rate.updatedAt.toISOString(),
      })),
    }));
  }

  async createVatRate(input: CreateVatRateDto, user: AuthUser) {
    const data = {
      name: input.name,
      percentage: new Prisma.Decimal(input.percentage),
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
    };
    if (data.effectiveTo && data.effectiveTo < data.effectiveFrom) {
      throw new BadRequestException('VAT rate end date must not be before its start date');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.assertVatRateRangeAvailable(tx, data.name, data.effectiveFrom, data.effectiveTo);
      const rate = await tx.vatRate.create({ data: { ...data, createdById: user.sub } });
      await writeAudit(tx, user.sub, 'vat_rate.created', 'vat_rate', rate.id, {
        name: rate.name,
        percentage: Number(rate.percentage),
        effectiveFrom: rate.effectiveFrom.toISOString(),
        effectiveTo: rate.effectiveTo?.toISOString() ?? null,
        applicationEnabled: false,
      });
      return { ...rate, percentage: Number(rate.percentage) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updateVatRate(id: string, input: UpdateVatRateDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.vatRate.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('VAT rate not found');
      if (existing.effectiveFrom <= new Date()) {
        throw new ConflictException('Effective and historical VAT rates cannot be edited');
      }
      const data = {
        name: input.name ?? existing.name,
        percentage: input.percentage === undefined ? existing.percentage : new Prisma.Decimal(input.percentage),
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : existing.effectiveFrom,
        effectiveTo: input.effectiveTo === undefined
          ? existing.effectiveTo
          : input.effectiveTo === null ? null : new Date(input.effectiveTo),
      };
      if (data.effectiveFrom <= new Date()) {
        throw new ConflictException('Effective and historical VAT rates cannot be edited');
      }
      if (data.effectiveTo && data.effectiveTo < data.effectiveFrom) {
        throw new BadRequestException('VAT rate end date must not be before its start date');
      }
      await this.assertVatRateRangeAvailable(tx, data.name, data.effectiveFrom, data.effectiveTo, id);
      const rate = await tx.vatRate.update({ where: { id }, data });
      await writeAudit(tx, user.sub, 'vat_rate.updated', 'vat_rate', id, {
        name: rate.name,
        percentage: Number(rate.percentage),
        effectiveFrom: rate.effectiveFrom.toISOString(),
        effectiveTo: rate.effectiveTo?.toISOString() ?? null,
        applicationEnabled: false,
      });
      return { ...rate, percentage: Number(rate.percentage) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async assertVatRateRangeAvailable(
    tx: Prisma.TransactionClient,
    name: string,
    from: Date,
    to: Date | null,
    excludeId?: string,
  ) {
    const existing = await tx.vatRate.findMany({ where: { name, ...(excludeId && { id: { not: excludeId } }) } });
    const overlaps = existing.some((rate) =>
      (!rate.effectiveTo || rate.effectiveTo >= from) && (!to || to >= rate.effectiveFrom));
    if (overlaps) throw new ConflictException('A VAT rate with this name already overlaps the effective date range');
  }
}
