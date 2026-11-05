import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { stockByProduct } from '../common/stock';
import { writeAudit } from '../common/audit';
import { AuthUser } from '../auth/auth.types';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(role: UserRole) {
    const products = await this.prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { nameAr: 'asc' },
    });
    const stock = await stockByProduct(this.prisma, products.map((product) => product.id));
    return products.map((product) => {
      const presented = this.present(product, stock.get(product.id) ?? 0);
      if (new Set<UserRole>([
        UserRole.SELLER,
        UserRole.STOREKEEPER,
        UserRole.NURSERY_WORKER,
        UserRole.VIEWER,
      ]).has(role)) {
        const { purchasePrice: _purchasePrice, ...productView } = presented;
        return productView;
      }
      return presented;
    });
  }

  async create(input: CreateProductDto, user: AuthUser) {
    const category = await this.prisma.category.findFirst({ where: { nameAr: input.category } });
    if (!category) throw new NotFoundException('Category not found');
    const sku = input.sku?.trim() || `M-${Date.now().toString(36).toUpperCase()}`;
    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku,
          nameAr: input.nameAr.trim(),
          nameFr: input.nameFr.trim(),
          scientific: input.scientific?.trim() || null,
          categoryId: category.id,
          size: input.size,
          unit: input.unit || 'piece',
          purchasePrice: new Prisma.Decimal(input.purchasePrice),
          salePrice: new Prisma.Decimal(input.salePrice),
          minimumStock: input.minimum,
          homeLocation: input.location,
          imageUrl: input.image?.trim() || null,
        },
        include: { category: true },
      });
      if (input.initialQuantity) {
        await tx.inventoryMovement.create({
          data: {
            productId: created.id,
            type: MovementType.PURCHASE_IN,
            quantity: input.initialQuantity,
            reason: 'Opening balance',
            reference: 'OPENING',
            toLocation: input.location,
            createdById: user.sub,
          },
        });
      }
      await writeAudit(tx, user.sub, 'product.created', 'product', created.id, {
        sku: created.sku,
        nameAr: created.nameAr,
        category: created.category.nameAr,
      });
      return created;
    });
    return this.present(product, input.initialQuantity ?? 0);
  }

  async update(id: string, input: UpdateProductDto, user: AuthUser) {
    const product = await this.prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id }, include: { category: true } });
      if (!current?.active) throw new NotFoundException('Product not found');
      const category = input.category
        ? await tx.category.findFirst({ where: { nameAr: input.category } })
        : current.category;
      if (!category) throw new NotFoundException('Category not found');
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(input.nameAr !== undefined && { nameAr: input.nameAr.trim() }),
          ...(input.nameFr !== undefined && { nameFr: input.nameFr.trim() }),
          ...(input.scientific !== undefined && { scientific: input.scientific.trim() || null }),
          ...(input.category !== undefined && { categoryId: category.id }),
          ...(input.size !== undefined && { size: input.size }),
          ...(input.unit !== undefined && { unit: input.unit }),
          ...(input.purchasePrice !== undefined && { purchasePrice: new Prisma.Decimal(input.purchasePrice) }),
          ...(input.salePrice !== undefined && { salePrice: new Prisma.Decimal(input.salePrice) }),
          ...(input.minimum !== undefined && { minimumStock: input.minimum }),
          ...(input.location !== undefined && { homeLocation: input.location }),
          ...(input.image !== undefined && { imageUrl: input.image.trim() || null }),
        },
        include: { category: true },
      });
      await writeAudit(tx, user.sub, 'product.updated', 'product', id, {
        changedFields: Object.keys(input).filter((key) => key !== 'image'),
      });
      return updated;
    });
    const stock = await stockByProduct(this.prisma, [id]);
    return this.present(product, stock.get(id) ?? 0);
  }

  async archive(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product?.active) throw new NotFoundException('Product not found');
      const stock = await stockByProduct(tx, [id]);
      if ((stock.get(id) ?? 0) > 0) {
        throw new ConflictException('Products with stock cannot be archived; record a stock adjustment first');
      }
      await tx.product.update({ where: { id }, data: { active: false } });
      await writeAudit(tx, user.sub, 'product.archived', 'product', id, { sku: product.sku });
      return { success: true };
    });
  }

  private present(product: Prisma.ProductGetPayload<{ include: { category: true } }>, quantity: number) {
    return {
      id: product.id,
      sku: product.sku,
      nameAr: product.nameAr,
      nameFr: product.nameFr,
      scientific: product.scientific ?? '',
      categoryId: product.categoryId,
      category: product.category.nameAr,
      categoryFr: product.category.nameFr,
      size: product.size,
      unit: product.unit,
      purchasePrice: Number(product.purchasePrice),
      salePrice: Number(product.salePrice),
      minimum: product.minimumStock,
      location: product.homeLocation,
      image: product.imageUrl ?? '',
      quantity,
    };
  }
}
