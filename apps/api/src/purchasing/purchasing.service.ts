import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma, PurchaseOrderStatus, SupplierInvoiceStatus, SupplierReturnStatus } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { writeAudit } from '../common/audit';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePurchaseOrderDto,
  CreatePurchaseReceiptDto,
  CreateSupplierInvoiceDto,
  CreateSupplierQuoteDto,
  CreateSupplierReturnDto,
  SupplierDto,
} from './purchasing.dto';

@Injectable()
export class PurchasingService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        lines: {
          include: {
            product: true,
            supplierQuoteLine: { include: { quote: { select: { id: true, reference: true } } } },
          },
        },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        sentBy: { select: { id: true, name: true } },
        receipts: {
          include: {
            receivedBy: { select: { id: true, name: true } },
            lines: { include: { purchaseOrderLine: { select: { id: true } } } },
          },
          orderBy: { receivedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: CreatePurchaseOrderDto, user: AuthUser) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: input.supplierId, active: true } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    const productIds = [...new Set(input.lines.map((line) => line.productId))];
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, active: true } });
    if (products.length !== productIds.length) throw new NotFoundException('One or more products were not found');
    const quoteLineIds = [...new Set(input.lines.flatMap((line) => line.supplierQuoteLineId ? [line.supplierQuoteLineId] : []))];
    const quoteLines = quoteLineIds.length
      ? await this.prisma.supplierQuoteLine.findMany({ where: { id: { in: quoteLineIds } }, include: { quote: true } })
      : [];
    if (quoteLines.length !== quoteLineIds.length) throw new NotFoundException('One or more supplier quote lines were not found');
    const quoteLineById = new Map(quoteLines.map((line) => [line.id, line]));
    const today = new Date();
    for (const line of input.lines) {
      if (!line.supplierQuoteLineId) continue;
      const quoteLine = quoteLineById.get(line.supplierQuoteLineId)!;
      if (quoteLine.productId !== line.productId || quoteLine.quote.supplierId !== supplier.id) {
        throw new BadRequestException('The selected quote line must match the order supplier and product');
      }
      if (quoteLine.quote.validUntil
        && quoteLine.quote.validUntil.toISOString().slice(0, 10) < today.toISOString().slice(0, 10)) {
        throw new ConflictException('An expired supplier quote cannot be used for a purchase order');
      }
    }
    const code = `PO-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          code,
          supplierId: input.supplierId,
          requestedById: user.sub,
          status: PurchaseOrderStatus.PENDING_APPROVAL,
          lines: {
            create: input.lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.supplierQuoteLineId
                ? quoteLineById.get(line.supplierQuoteLineId)!.unitPrice
                : products.find((product) => product.id === line.productId)!.purchasePrice,
              ...(line.supplierQuoteLineId && { supplierQuoteLineId: line.supplierQuoteLineId }),
            })),
          },
        },
        include: { supplier: true, lines: { include: { product: true } } },
      });
      await writeAudit(tx, user.sub, 'purchase_order.submitted', 'purchase_order', order.id, {
        code: order.code,
        supplierId: order.supplierId,
        lineCount: order.lines.length,
        quoteLineIds,
      });
      return order;
    });
  }

  listSuppliers() {
    return this.prisma.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  async createSupplier(input: SupplierDto, user: AuthUser) {
    const data = this.normalizeSupplier(input);
    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({ data });
      await writeAudit(tx, user.sub, 'supplier.created', 'supplier', supplier.id, { name: supplier.name });
      return supplier;
    });
  }

  async updateSupplier(id: string, input: SupplierDto, user: AuthUser) {
    const current = await this.prisma.supplier.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Supplier not found');
    const data = this.normalizeSupplier(input);
    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.update({ where: { id }, data });
      await writeAudit(tx, user.sub, 'supplier.updated', 'supplier', id, {
        before: { name: current.name, city: current.city, type: current.type, phone: current.phone, email: current.email },
        after: data,
      });
      return supplier;
    });
  }

  async archiveSupplier(id: string, user: AuthUser) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!supplier.active) throw new ConflictException('Supplier is already archived');
    return this.prisma.$transaction(async (tx) => {
      const archived = await tx.supplier.update({ where: { id }, data: { active: false } });
      await writeAudit(tx, user.sub, 'supplier.archived', 'supplier', id, { name: supplier.name });
      return archived;
    });
  }

  listSupplierQuotes() {
    return this.prisma.supplierQuote.findMany({
      include: { supplier: true, lines: { include: { product: true } }, recordedBy: { select: { id: true, name: true } } },
      orderBy: { quoteDate: 'desc' },
    });
  }

  async createSupplierQuote(input: CreateSupplierQuoteDto, user: AuthUser) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: input.supplierId, active: true } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (new Set(input.lines.map((line) => line.productId)).size !== input.lines.length) {
      throw new BadRequestException('Each product can appear only once in a supplier quote');
    }
    const productIds = [...new Set(input.lines.map((line) => line.productId))];
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, active: true }, select: { id: true } });
    if (products.length !== productIds.length) throw new NotFoundException('One or more products were not found');
    const quoteDate = input.quoteDate ? new Date(input.quoteDate) : new Date();
    const validUntil = input.validUntil ? new Date(input.validUntil) : null;
    if (validUntil && validUntil.toISOString().slice(0, 10) < quoteDate.toISOString().slice(0, 10)) {
      throw new BadRequestException('Quote expiry cannot be earlier than its quote date');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const quote = await tx.supplierQuote.create({
          data: {
            supplierId: supplier.id,
            reference: input.reference.trim(),
            quoteDate,
            validUntil,
            note: input.note?.trim() || null,
            recordedById: user.sub,
            lines: { create: input.lines.map((line) => ({ productId: line.productId, unitPrice: line.unitPrice })) },
          },
          include: { supplier: true, lines: { include: { product: true } } },
        });
        await writeAudit(tx, user.sub, 'supplier_quote.recorded', 'supplier_quote', quote.id, {
          supplierId: quote.supplierId,
          reference: quote.reference,
          lineCount: quote.lines.length,
        });
        return quote;
      });
    } catch (error) {
      this.throwForUniqueConstraint(error, 'A quote with this reference already exists for the supplier');
      throw error;
    }
  }

  listSupplierInvoices() {
    return this.prisma.supplierInvoice.findMany({
      include: {
        supplier: true,
        purchaseOrder: { select: { id: true, code: true } },
        recordedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        payments: {
          include: { recordedBy: { select: { id: true, name: true } } },
          orderBy: { paidAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordSupplierInvoice(input: CreateSupplierInvoiceDto, user: AuthUser) {
    await this.ensureSupplierAndOrderMatch(input.supplierId, input.purchaseOrderId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const invoice = await tx.supplierInvoice.create({
          data: {
            supplierId: input.supplierId,
            purchaseOrderId: input.purchaseOrderId,
            reference: input.reference.trim(),
            totalAmount: new Prisma.Decimal(input.totalAmount),
            invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : null,
            note: input.note?.trim() || null,
            recordedById: user.sub,
          },
        });
        await writeAudit(tx, user.sub, 'supplier_invoice.recorded', 'supplier_invoice', invoice.id, {
          supplierId: invoice.supplierId,
          purchaseOrderId: invoice.purchaseOrderId,
          reference: invoice.reference,
        });
        return invoice;
      });
    } catch (error) {
      this.throwForUniqueConstraint(error, 'An invoice with this reference already exists for the supplier');
      throw error;
    }
  }

  async reviewSupplierInvoice(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.supplierInvoice.findUnique({ where: { id } });
      if (!invoice) throw new NotFoundException('Supplier invoice not found');
      if (invoice.status !== SupplierInvoiceStatus.RECORDED) throw new ConflictException('Only recorded invoices can be reviewed');
      const reviewed = await tx.supplierInvoice.update({
        where: { id },
        data: { status: SupplierInvoiceStatus.REVIEWED, reviewedById: user.sub, reviewedAt: new Date() },
      });
      await writeAudit(tx, user.sub, 'supplier_invoice.reviewed', 'supplier_invoice', id, { reference: invoice.reference });
      return reviewed;
    });
  }

  listSupplierReturns() {
    return this.prisma.supplierReturn.findMany({
      include: {
        supplier: true,
        purchaseOrder: { select: { id: true, code: true } },
        requestedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        lines: { include: { product: { select: { id: true, nameAr: true, nameFr: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSupplierReturn(input: CreateSupplierReturnDto, user: AuthUser) {
    await this.ensureSupplierAndOrderMatch(input.supplierId, input.purchaseOrderId);
    if (new Set(input.lines.map((line) => line.productId)).size !== input.lines.length) {
      throw new BadRequestException('Each product can appear only once in a supplier return request');
    }
    const productIds = [...new Set(input.lines.map((line) => line.productId))];
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
    if (products.length !== productIds.length) throw new NotFoundException('One or more products were not found');
    return this.prisma.$transaction(async (tx) => {
      const supplierReturn = await tx.supplierReturn.create({
        data: {
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId,
          supplierReference: input.supplierReference?.trim() || null,
          reason: input.reason.trim(),
          note: input.note?.trim() || null,
          requestedById: user.sub,
          lines: { create: input.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })) },
        },
        include: { lines: true },
      });
      await writeAudit(tx, user.sub, 'supplier_return.requested', 'supplier_return', supplierReturn.id, {
        supplierId: supplierReturn.supplierId,
        purchaseOrderId: supplierReturn.purchaseOrderId,
        lineCount: supplierReturn.lines.length,
      });
      return supplierReturn;
    });
  }

  async reviewSupplierReturn(id: string, approved: boolean, reason: string | undefined, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const supplierReturn = await tx.supplierReturn.findUnique({ where: { id } });
      if (!supplierReturn) throw new NotFoundException('Supplier return request not found');
      if (supplierReturn.status !== SupplierReturnStatus.PENDING_APPROVAL) {
        throw new ConflictException('Only pending supplier return requests can be reviewed');
      }
      const status = approved ? SupplierReturnStatus.APPROVED : SupplierReturnStatus.REJECTED;
      const updated = await tx.supplierReturn.update({
        where: { id },
        data: { status, reviewedById: user.sub, reviewedAt: new Date(), reviewNote: approved ? null : reason!.trim() },
      });
      await writeAudit(tx, user.sub, `supplier_return.${approved ? 'approved' : 'rejected'}`, 'supplier_return', id, {
        supplierReference: supplierReturn.supplierReference,
        ...(reason && { reason: reason.trim() }),
      });
      return updated;
    });
  }

  private normalizeSupplier(input: SupplierDto) {
    return {
      name: input.name.trim(),
      city: input.city.trim(),
      type: input.type.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim().toLowerCase() || null,
    };
  }

  private async ensureSupplierAndOrderMatch(supplierId: string, purchaseOrderId?: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!purchaseOrderId) return;
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId }, select: { supplierId: true } });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (order.supplierId !== supplierId) throw new BadRequestException('The purchase order must belong to the selected supplier');
  }

  private throwForUniqueConstraint(error: unknown, message: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(message);
    }
  }

  async approve(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Purchase order not found');
      if (order.status !== PurchaseOrderStatus.PENDING_APPROVAL && order.status !== PurchaseOrderStatus.DRAFT) {
        throw new ConflictException('Only pending purchase orders can be approved');
      }
      if (order.requestedById === user.sub) throw new ConflictException('The requester cannot approve their own purchase order');
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.APPROVED, approvedById: user.sub, approvedAt: new Date() },
      });
      await writeAudit(tx, user.sub, 'purchase_order.approved', 'purchase_order', id, { code: order.code });
      return updated;
    });
  }

  async reject(id: string, reason: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Purchase order not found');
      if (order.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
        throw new ConflictException('Only pending purchase orders can be rejected');
      }
      if (order.requestedById === user.sub) throw new ConflictException('The requester cannot reject their own purchase order');
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: PurchaseOrderStatus.REJECTED,
          rejectedById: user.sub,
          rejectedAt: new Date(),
          rejectionReason: reason.trim(),
        },
      });
      await writeAudit(tx, user.sub, 'purchase_order.rejected', 'purchase_order', id, {
        code: order.code,
        reason: reason.trim(),
      });
      return updated;
    });
  }

  async send(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Purchase order not found');
      if (order.status !== PurchaseOrderStatus.APPROVED) {
        throw new ConflictException('Only approved purchase orders can be sent');
      }
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.SENT, sentAt: new Date(), sentById: user.sub },
      });
      await writeAudit(tx, user.sub, 'purchase_order.sent', 'purchase_order', id, { code: order.code });
      return updated;
    });
  }

  async receive(id: string, input: CreatePurchaseReceiptDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PurchaseOrder" WHERE "id" = ${id} FOR UPDATE`;
      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: {
          lines: { include: { product: true, receiptLines: true } },
          receipts: { include: { lines: true } },
        },
      });
      if (!order) throw new NotFoundException('Purchase order not found');
      if (order.status === PurchaseOrderStatus.RECEIVED) throw new ConflictException('Order has already been received');
      if (order.status !== PurchaseOrderStatus.SENT && order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
        throw new ConflictException('Only approved and sent orders can be received');
      }
      if (order.lines.length === 0) throw new BadRequestException('Cannot receive an empty purchase order');
      if (new Set(input.lines.map((line) => line.orderLineId)).size !== input.lines.length) {
        throw new BadRequestException('Each purchase order line can appear only once per receipt');
      }
      const lineById = new Map(order.lines.map((line) => [line.id, line]));
      const receivedByLine = new Map<string, number>();
      for (const receipt of order.receipts) {
        for (const line of receipt.lines) {
          receivedByLine.set(line.purchaseOrderLineId, (receivedByLine.get(line.purchaseOrderLineId) ?? 0) + line.receivedQuantity);
        }
      }
      const receiptLines = input.lines.map((line) => {
        const orderLine = lineById.get(line.orderLineId);
        if (!orderLine) throw new BadRequestException('A receipt line does not belong to this purchase order');
        if (line.damagedQuantity > line.receivedQuantity) {
          throw new BadRequestException('Damaged quantity cannot exceed received quantity');
        }
        const previouslyReceived = receivedByLine.get(orderLine.id) ?? 0;
        if (line.receivedQuantity > orderLine.quantity - previouslyReceived) {
          throw new BadRequestException(`Receipt exceeds the remaining quantity for order line ${orderLine.id}`);
        }
        return { input: line, orderLine };
      });
      if (!receiptLines.some(({ input: line }) => line.receivedQuantity > 0)) {
        throw new BadRequestException('A receipt must include at least one received unit');
      }

      const code = `PR-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const receipt = await tx.purchaseReceipt.create({
        data: {
          code,
          purchaseOrderId: order.id,
          receivedById: user.sub,
          note: input.note?.trim() || null,
          lines: {
            create: receiptLines
              .filter(({ input: line }) => line.receivedQuantity > 0)
              .map(({ input: line, orderLine }) => ({
                purchaseOrderLineId: orderLine.id,
                receivedQuantity: line.receivedQuantity,
                damagedQuantity: line.damagedQuantity,
              })),
          },
        },
        include: { lines: true },
      });

      for (const receiptLine of receipt.lines) {
        const orderLine = lineById.get(receiptLine.purchaseOrderLineId)!;
        await tx.inventoryMovement.create({
          data: {
            productId: orderLine.productId,
            type: MovementType.PURCHASE_IN,
            quantity: receiptLine.receivedQuantity,
            reason: `Purchase receipt ${receipt.code}`,
            reference: receipt.code,
            toLocation: orderLine.product.homeLocation,
            createdById: user.sub,
            purchaseReceiptLineId: receiptLine.id,
          },
        });
        if (receiptLine.damagedQuantity > 0) {
          await tx.inventoryMovement.create({
            data: {
              productId: orderLine.productId,
              type: MovementType.LOSS_OUT,
              quantity: receiptLine.damagedQuantity,
              reason: `Damaged on arrival - purchase receipt ${receipt.code}`,
              reference: receipt.code,
              fromLocation: orderLine.product.homeLocation,
              createdById: user.sub,
              purchaseReceiptLineId: receiptLine.id,
            },
          });
        }
      }

      const complete = order.lines.every((line) =>
        (receivedByLine.get(line.id) ?? 0) +
          (receiptLines.find(({ orderLine }) => orderLine.id === line.id)?.input.receivedQuantity ?? 0) === line.quantity);
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: complete ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED,
          ...(complete && { receivedAt: new Date() }),
        },
      });
      await writeAudit(tx, user.sub, 'purchase_order.received', 'purchase_order', id, {
        code: order.code,
        receiptCode: receipt.code,
        lineCount: receipt.lines.length,
        receivedQuantity: receipt.lines.reduce((sum, line) => sum + line.receivedQuantity, 0),
        damagedQuantity: receipt.lines.reduce((sum, line) => sum + line.damagedQuantity, 0),
        status: updated.status,
      });
      return { ...receipt, purchaseOrderStatus: updated.status };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
