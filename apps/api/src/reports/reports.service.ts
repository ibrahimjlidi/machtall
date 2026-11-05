import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CashLedgerEntryType,
  ExpenseStatus,
  MovementType,
  PaymentStatus,
  SaleApprovalStatus,
  SalesReturnStatus,
  SupplierInvoiceStatus,
} from '@prisma/client';
import { stockByProduct } from '../common/stock';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './reports.dto';

function day(value: Date) {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(query: ReportQueryDto) {
    const now = new Date();
    const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
    const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : now;
    const endExclusive = new Date(to);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    if (from > to) throw new BadRequestException('The report start date must not be after its end date');
    if (endExclusive.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Report date range cannot exceed 366 days');
    }
    const createdAt = { gte: from, lt: endExclusive };

    const [products, sales, losses, creditSales, customers, stock, expensesByCategory, expensePayments,
      supplierPayments, customerPayments, supplierInvoices, cashEntries, cashSessions, unknownAmountInvoices,
      approvedExpensesWithPayments] = await Promise.all([
      this.prisma.product.findMany({
        where: { active: true },
        include: { category: { select: { nameAr: true, nameFr: true } } },
        orderBy: { sku: 'asc' },
      }),
      this.prisma.sale.findMany({
        where: { createdAt, approvalStatus: SaleApprovalStatus.APPROVED },
        include: {
          customer: { select: { id: true, name: true, type: true } },
          lines: { include: { product: { select: { id: true, nameAr: true, nameFr: true, sku: true } } } },
          paymentAllocations: { select: { amount: true } },
          returns: {
            where: { status: { in: [SalesReturnStatus.APPROVED, SalesReturnStatus.COMPLETED] } },
            include: { lines: { include: { saleLine: { select: { id: true, productId: true, unitPrice: true } } } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.inventoryMovement.findMany({
        where: { type: MovementType.LOSS_OUT, effectiveAt: { gte: from, lt: endExclusive } },
        include: { product: { select: { nameAr: true, nameFr: true, sku: true } } },
        orderBy: { effectiveAt: 'asc' },
      }),
      this.prisma.sale.findMany({
        where: { payment: PaymentStatus.CREDIT, approvalStatus: SaleApprovalStatus.APPROVED },
        include: {
          lines: { select: { quantity: true, unitPrice: true } },
          paymentAllocations: { select: { amount: true } },
          returns: {
            where: { status: { in: [SalesReturnStatus.APPROVED, SalesReturnStatus.COMPLETED] } },
            include: { lines: { include: { saleLine: { select: { unitPrice: true } } } } },
          },
        },
      }),
      this.prisma.customer.findMany({
        where: { active: true },
        select: {
          openingCredit: true,
          payments: { include: { allocations: { where: { saleId: null }, select: { amount: true } } } },
        },
      }),
      stockByProduct(this.prisma),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: { status: ExpenseStatus.APPROVED, incurredAt: { gte: from, lt: endExclusive } },
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: { category: 'asc' },
      }),
      this.prisma.expensePayment.aggregate({
        where: { paidAt: { gte: from, lt: endExclusive } },
        _sum: { amount: true },
      }),
      this.prisma.supplierPayment.aggregate({
        where: { paidAt: { gte: from, lt: endExclusive } },
        _sum: { amount: true },
      }),
      this.prisma.customerPayment.aggregate({
        where: { receivedAt: { gte: from, lt: endExclusive } },
        _sum: { amount: true },
      }),
      this.prisma.supplierInvoice.findMany({
        where: { status: SupplierInvoiceStatus.REVIEWED, totalAmount: { not: null } },
        select: { totalAmount: true, payments: { select: { amount: true } } },
      }),
      this.prisma.cashLedgerEntry.findMany({
        where: { createdAt },
        select: { type: true, amount: true },
      }),
      this.prisma.cashSession.findMany({
        where: { closedAt: { gte: from, lt: endExclusive } },
        select: { variance: true, reviewedAt: true, varianceApprovedAt: true },
      }),
      this.prisma.supplierInvoice.count({
        where: { status: SupplierInvoiceStatus.REVIEWED, totalAmount: null },
      }),
      this.prisma.expense.findMany({
        where: { status: ExpenseStatus.APPROVED },
        select: { amount: true, payments: { select: { amount: true } } },
      }),
    ]);

    const inventory = products.map((product) => {
      const quantity = Math.max(0, stock.get(product.id) ?? 0);
      const unitValue = Number(product.purchasePrice);
      return {
        productId: product.id,
        sku: product.sku,
        nameAr: product.nameAr,
        nameFr: product.nameFr,
        categoryAr: product.category.nameAr,
        categoryFr: product.category.nameFr,
        size: product.size,
        location: product.homeLocation,
        quantity,
        minimum: product.minimumStock,
        unitValue,
        stockValue: quantity * unitValue,
      };
    });

    const salesByDay = new Map<string, { date: string; count: number; total: number }>();
    const salesByCustomer = new Map<string, { customerId: string; customer: string; count: number; total: number }>();
    const salesByProduct = new Map<string, { productId: string; sku: string; productAr: string; productFr: string; quantity: number; total: number }>();
    let salesTotal = 0;
    for (const sale of sales) {
      const grossTotal = sale.lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
      const totalReturned = sale.returns.reduce((sum, item) => sum + item.lines.reduce(
        (amount, line) => amount + Number(line.saleLine.unitPrice) * line.quantity,
        0,
      ), 0);
      const total = Math.max(0, grossTotal - totalReturned);
      salesTotal += total;
      const salesDay = day(sale.createdAt);
      const daily = salesByDay.get(salesDay) ?? { date: salesDay, count: 0, total: 0 };
      daily.count += 1;
      daily.total += total;
      salesByDay.set(salesDay, daily);

      const customer = salesByCustomer.get(sale.customerId) ?? {
        customerId: sale.customerId, customer: sale.customer.name, count: 0, total: 0,
      };
      customer.count += 1;
      customer.total += total;
      salesByCustomer.set(sale.customerId, customer);

      for (const line of sale.lines) {
        const returnedQuantity = sale.returns.reduce((sum, item) => sum + item.lines
          .filter((returned) => returned.saleLine.id === line.id)
          .reduce((quantity, returned) => quantity + returned.quantity, 0), 0);
        const netQuantity = Math.max(0, line.quantity - returnedQuantity);
        const product = salesByProduct.get(line.productId) ?? {
          productId: line.productId,
          sku: line.product.sku,
          productAr: line.product.nameAr,
          productFr: line.product.nameFr,
          quantity: 0,
          total: 0,
        };
        product.quantity += netQuantity;
        product.total += Number(line.unitPrice) * netQuantity;
        salesByProduct.set(line.productId, product);
      }
    }

    const lossesByReason = new Map<string, { reason: string; quantity: number; entries: number }>();
    const lossDetails = losses.map((movement) => {
      const reason = movement.reason?.trim() || 'غير محدد';
      const current = lossesByReason.get(reason) ?? { reason, quantity: 0, entries: 0 };
      current.quantity += movement.quantity;
      current.entries += 1;
      lossesByReason.set(reason, current);
      return {
        date: day(movement.effectiveAt),
        sku: movement.product.sku,
        productAr: movement.product.nameAr,
        productFr: movement.product.nameFr,
        reason,
        quantity: movement.quantity,
        reference: movement.reference ?? '',
      };
    });

    const creditOutstanding = creditSales.reduce((sum, sale) => {
      const total = sale.lines.reduce((amount, line) => amount + Number(line.unitPrice) * line.quantity, 0);
      const received = sale.paymentAllocations.reduce((amount, allocation) => amount + Number(allocation.amount), 0);
      const returned = sale.returns.reduce((amount, item) => amount + item.lines.reduce(
        (lineTotal, line) => lineTotal + Number(line.saleLine.unitPrice) * line.quantity,
        0,
      ), 0);
      return sum + Math.max(0, total - received - returned);
    }, 0) + customers.reduce((sum, customer) => {
      const received = customer.payments.reduce(
        (amount, payment) => amount + payment.allocations.reduce(
          (allocated, allocation) => allocated + Number(allocation.amount),
          0,
        ),
        0,
      );
      return sum + Math.max(0, Number(customer.openingCredit) - received);
    }, 0);

    const expensesTotal = expensesByCategory.reduce((sum, expense) => sum + Number(expense._sum.amount ?? 0), 0);
    const expensePayableOutstanding = approvedExpensesWithPayments.reduce((sum, expense) => {
      const paid = expense.payments.reduce((amount, payment) => amount + Number(payment.amount), 0);
      return sum + Math.max(0, Number(expense.amount) - paid);
    }, 0);
    const supplierPayableOutstanding = supplierInvoices.reduce((sum, invoice) => {
      const paid = invoice.payments.reduce((amount, payment) => amount + Number(payment.amount), 0);
      return sum + Math.max(0, Number(invoice.totalAmount ?? 0) - paid);
    }, 0);
    const cashIn = cashEntries
      .filter((entry) => entry.type === CashLedgerEntryType.SALE || entry.type === CashLedgerEntryType.CUSTOMER_PAYMENT)
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const cashOut = cashEntries
      .filter((entry) => entry.type === CashLedgerEntryType.REFUND
        || entry.type === CashLedgerEntryType.SUPPLIER_PAYMENT
        || entry.type === CashLedgerEntryType.EXPENSE_PAYMENT)
      .reduce((sum, entry) => sum + Number(entry.amount), 0);

    return {
      from: day(from),
      to: day(to),
      summary: {
        salesCount: sales.length,
        salesTotal,
        creditOutstanding,
        customerCollections: Number(customerPayments._sum.amount ?? 0),
        approvedExpenses: expensesTotal,
        expensePayableOutstanding,
        expensePayments: Number(expensePayments._sum.amount ?? 0),
        supplierPayments: Number(supplierPayments._sum.amount ?? 0),
        supplierPayableOutstanding,
        reviewedInvoicesWithoutAmounts: unknownAmountInvoices,
        cashIn,
        cashOut,
        cashNet: cashIn - cashOut,
        cashSessionsClosed: cashSessions.length,
        cashVarianceTotal: cashSessions.reduce((sum, session) => sum + Number(session.variance ?? 0), 0),
        cashSessionsPendingReview: cashSessions.filter((session) => !session.reviewedAt).length,
        cashVariancesPendingApproval: cashSessions.filter((session) =>
          session.variance !== null && !session.variance.isZero() && !session.varianceApprovedAt).length,
        profitAvailable: false,
        vatApplied: false,
        financialReportNotice: 'Operational summary only; VAT is not applied and profit is unavailable until inventory cost accounting is implemented.',
        inventoryProducts: inventory.length,
        inventoryUnits: inventory.reduce((sum, product) => sum + product.quantity, 0),
        inventoryValue: inventory.reduce((sum, product) => sum + product.stockValue, 0),
        lossUnits: lossDetails.reduce((sum, loss) => sum + loss.quantity, 0),
      },
      inventory,
      salesByDay: [...salesByDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
      salesByCustomer: [...salesByCustomer.values()].sort((a, b) => b.total - a.total),
      salesByProduct: [...salesByProduct.values()].sort((a, b) => b.quantity - a.quantity),
      losses: lossDetails,
      lossesByReason: [...lossesByReason.values()].sort((a, b) => b.quantity - a.quantity),
      expensesByCategory: expensesByCategory.map((expense) => ({
        category: expense.category,
        count: expense._count._all,
        amount: Number(expense._sum.amount ?? 0),
      })),
    };
  }
}
