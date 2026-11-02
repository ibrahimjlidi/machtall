import { config } from 'dotenv';
import { hash } from 'bcryptjs';
import { CustomerType, MovementType, PaymentStatus, PrismaClient, ProductionStage, PurchaseOrderStatus, UserRole } from '@prisma/client';
import {
  createInitialMovements,
  initialBatches,
  initialCustomers,
  initialProducts,
  suppliers,
} from '../../../src/data.js';

config();

const prisma = new PrismaClient();
const categoryFrench: Record<string, string> = {
  'نباتات زينة': 'Plantes ornementales',
  'أشجار مثمرة': 'Arbres fruitiers',
  'نباتات داخلية': "Plantes d'intérieur",
  'زهور وشتلات': 'Fleurs et plants',
  'صبار وعصاريات': 'Cactus et succulentes',
  'نباتات عطرية': 'Plantes aromatiques',
  'بذور': 'Graines',
  'أصص وحاويات': 'Pots et contenants',
  'تربة وأسمدة': 'Terreaux et engrais',
  'أدوات وري': 'Outils et irrigation',
};
const seedProductSku = (productId: string) => initialProducts.find((product) => product.id === productId)?.id;

async function seed() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be set to a unique password of at least 12 characters');
  }
  const email = (process.env.SEED_ADMIN_EMAIL || 'owner@mashtal.tn').toLowerCase();
  const passwordHash = await hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    create: { name: 'سيد الزاهي', email, passwordHash, role: UserRole.ADMIN },
    update: { name: 'سيد الزاهي', passwordHash, role: UserRole.ADMIN, active: true },
  });

  const categories = [...new Set(initialProducts.map((product) => product.category))];
  await prisma.category.createMany({
    data: categories.map((nameAr) => ({
      slug: `category-${Buffer.from(nameAr).toString('hex').slice(0, 40)}`,
      nameAr,
      nameFr: categoryFrench[nameAr] || nameAr,
    })),
    skipDuplicates: true,
  });
  const categoryIds = new Map(
    (await prisma.category.findMany()).map((category) => [category.nameAr, category.id]),
  );

  for (const product of initialProducts) {
    await prisma.product.upsert({
      where: { sku: product.id },
      create: {
        sku: product.id,
        nameAr: product.nameAr,
        nameFr: product.nameFr,
        scientific: product.scientific || null,
        categoryId: categoryIds.get(product.category)!,
        size: product.size,
        unit: product.size === 'صينية' ? 'tray' : product.size === 'قطعة' ? 'piece' : 'unit',
        purchasePrice: product.purchasePrice,
        salePrice: product.salePrice,
        minimumStock: product.minimum,
        homeLocation: product.location,
        imageUrl: product.image,
      },
      update: {},
    });
  }

  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { id: `seed-${supplier.id}` },
      create: {
        id: `seed-${supplier.id}`,
        name: supplier.name,
        city: supplier.city,
        type: supplier.type,
        phone: supplier.phone,
      },
      update: {},
    });
  }

  const customerType: Record<string, CustomerType> = {
    فرد: CustomerType.INDIVIDUAL,
    بستاني: CustomerType.LANDSCAPER,
    بلدية: CustomerType.MUNICIPALITY,
  };
  for (const customer of initialCustomers) {
    await prisma.customer.upsert({
      where: { id: `seed-${customer.id}` },
      create: {
        id: `seed-${customer.id}`,
        name: customer.name,
        type: customerType[customer.type],
        phone: customer.phone,
        openingCredit: customer.credit,
      },
      update: {},
    });
  }

  const dbProducts = await prisma.product.findMany({ select: { id: true, sku: true } });
  const productIds = new Map(dbProducts.map((product) => [product.sku, product.id]));
  const movements = createInitialMovements();
  await prisma.inventoryMovement.createMany({
    data: movements.map((movement) => {
      const incoming = movement.type.endsWith('IN');
      const typeMap: Record<string, MovementType> = {
        'Purchase IN': MovementType.PURCHASE_IN,
        'Production IN': MovementType.PRODUCTION_IN,
        'Sale OUT': MovementType.SALE_OUT,
        'Loss OUT': MovementType.LOSS_OUT,
      };
      return {
        id: `seed-${movement.id}`,
        productId: productIds.get(seedProductSku(movement.productId)!)!,
        type: typeMap[movement.type],
        quantity: movement.quantity,
        reason: movement.reason,
        reference: movement.reference,
        fromLocation: incoming ? null : movement.location,
        toLocation: incoming ? movement.location : null,
        effectiveAt: new Date(`${movement.date}T12:00:00.000Z`),
        createdById: admin.id,
      };
    }),
    skipDuplicates: true,
  });

  const batchProductSku: Record<string, string> = {
    'طماطم سان مارزانو': 'P028',
    'ريحان أخضر': 'P020',
    'لافندر فرنسي': 'P017',
    'فلفل حلو': 'P027',
    'بتونيا مشكلة': 'P024',
  };
  const stageMap: Record<string, ProductionStage> = {
    sowing: ProductionStage.SOWING,
    germination: ProductionStage.GERMINATION,
    growing: ProductionStage.GROWING,
    ready: ProductionStage.READY,
  };
  for (const batch of initialBatches) {
    await prisma.productionBatch.upsert({
      where: { code: batch.id },
      create: {
        code: batch.id,
        seedType: batch.seed,
        productId: productIds.get(batchProductSku[batch.seed])!,
        sowingDate: new Date(`${batch.sowing}T12:00:00.000Z`),
        quantitySown: batch.sown,
        quantityLost: batch.loss,
        stage: stageMap[batch.stage],
        expectedReadyDate: new Date(`${batch.readyDate}T12:00:00.000Z`),
        readyAt: batch.stage === 'ready' ? new Date(`${batch.readyDate}T12:00:00.000Z`) : null,
      },
      update: {},
    });
  }

  const dbSuppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });
  const supplierIds = new Map(dbSuppliers.map((supplier) => [supplier.name, supplier.id]));
  const orders = [
    { code: 'BC-026', supplier: 'مشتل قرمبالية', date: '2026-10-28', status: PurchaseOrderStatus.SENT, lines: [['P001', 12], ['P003', 8], ['P016', 10], ['P035', 6]] },
    { code: 'BC-025', supplier: 'الخضراء للتجهيزات', date: '2026-10-24', status: PurchaseOrderStatus.SENT, lines: [['P029', 24], ['P030', 36], ['P033', 5]] },
    { code: 'BC-024', supplier: 'تونس للتربة والأسمدة', date: '2026-10-21', status: PurchaseOrderStatus.DRAFT, lines: [['P031', 30], ['P032', 20]] },
  ] as const;
  for (const order of orders) {
    const existing = await prisma.purchaseOrder.findUnique({ where: { code: order.code } });
    if (existing) continue;
    await prisma.purchaseOrder.create({
      data: {
        code: order.code,
        supplierId: supplierIds.get(order.supplier)!,
        status: order.status,
        createdAt: new Date(`${order.date}T12:00:00.000Z`),
        sentAt: order.status === PurchaseOrderStatus.DRAFT ? null : new Date(`${order.date}T12:00:00.000Z`),
        receivedAt: null,
        lines: {
          create: order.lines.map(([sku, quantity]) => {
            const product = initialProducts.find((item) => item.id === sku)!;
            return {
              productId: productIds.get(sku)!,
              quantity,
              unitPrice: product.purchasePrice,
            };
          }),
        },
      },
    });
  }

  const customerIds = new Map(
    initialCustomers.map((customer) => [customer.id, `seed-${customer.id}`]),
  );
  const demoSales = [
    { code: 'V-482', customerId: 'C02', date: '2026-11-02', payment: PaymentStatus.CREDIT, lines: [['P001', 2], ['P011', 3]] },
    { code: 'V-481', customerId: 'C01', date: '2026-11-02', payment: PaymentStatus.PAID, lines: [['P003', 2], ['P017', 1]] },
    { code: 'V-480', customerId: 'C03', date: '2026-11-01', payment: PaymentStatus.CREDIT, lines: [['P013', 5], ['P015', 2]] },
  ] as const;
  for (const sale of demoSales) {
    if (await prisma.sale.findUnique({ where: { code: sale.code } })) continue;
    await prisma.sale.create({
      data: {
        code: sale.code,
        customerId: customerIds.get(sale.customerId)!,
        payment: sale.payment,
        createdAt: new Date(`${sale.date}T12:00:00.000Z`),
        createdById: admin.id,
        lines: {
          create: sale.lines.map(([sku, quantity]) => ({
            productId: productIds.get(sku)!,
            quantity,
            unitPrice: initialProducts.find((product) => product.id === sku)!.salePrice,
          })),
        },
      },
    });
  }

  console.info(`Seeded demo inventory: ${initialProducts.length} products, ${movements.length} movements, ${initialCustomers.length} customers.`);
}

seed()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
