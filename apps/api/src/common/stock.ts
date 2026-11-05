import { InventoryMovement, MovementType, Prisma, PrismaClient } from '@prisma/client';

type MovementReader = Prisma.TransactionClient | PrismaClient;

const incoming = new Set<MovementType>([
  MovementType.PURCHASE_IN,
  MovementType.PRODUCTION_IN,
  MovementType.SALE_RETURN_IN,
  MovementType.ADJUSTMENT_IN,
]);
const outgoing = new Set<MovementType>([
  MovementType.SALE_OUT,
  MovementType.LOSS_OUT,
  MovementType.INTERNAL_ISSUE_OUT,
  MovementType.ADJUSTMENT_OUT,
]);

export function movementSign(type: MovementType) {
  if (incoming.has(type)) return 1;
  if (outgoing.has(type)) return -1;
  return 0;
}

export async function stockByProduct(db: MovementReader, productIds?: string[]) {
  const where = productIds?.length ? { productId: { in: productIds } } : {};
  const rows = await db.inventoryMovement.groupBy({
    by: ['productId', 'type'],
    where,
    _sum: { quantity: true },
  });
  const stock = new Map<string, number>();
  for (const row of rows) {
    stock.set(row.productId, (stock.get(row.productId) ?? 0) + movementSign(row.type) * (row._sum.quantity ?? 0));
  }
  return stock;
}

export async function getProductStock(db: MovementReader, productId: string) {
  return Math.max(0, (await stockByProduct(db, [productId])).get(productId) ?? 0);
}

export async function getLocationStock(db: MovementReader, productId: string, location: string) {
  const rows: Pick<InventoryMovement, 'type' | 'quantity' | 'fromLocation' | 'toLocation'>[] =
    await db.inventoryMovement.findMany({
      where: { productId },
      select: { type: true, quantity: true, fromLocation: true, toLocation: true },
    });
  return rows.reduce((total, row) => {
    if (row.type === MovementType.TRANSFER) {
      if (row.toLocation === location) return total + row.quantity;
      if (row.fromLocation === location) return total - row.quantity;
      return total;
    }
    if (incoming.has(row.type) && row.toLocation === location) return total + row.quantity;
    if (outgoing.has(row.type) && row.fromLocation === location) return total - row.quantity;
    return total;
  }, 0);
}

export async function getLocationBalances(db: MovementReader, productId: string) {
  const rows: Pick<InventoryMovement, 'type' | 'quantity' | 'fromLocation' | 'toLocation'>[] =
    await db.inventoryMovement.findMany({
      where: { productId },
      select: { type: true, quantity: true, fromLocation: true, toLocation: true },
    });
  const balances = new Map<string, number>();
  const add = (location: string | null, quantity: number) => {
    if (location) balances.set(location, (balances.get(location) ?? 0) + quantity);
  };
  for (const row of rows) {
    if (row.type === MovementType.TRANSFER) {
      add(row.fromLocation, -row.quantity);
      add(row.toLocation, row.quantity);
    } else {
      const sign = movementSign(row.type);
      add(sign > 0 ? row.toLocation : row.fromLocation, sign * row.quantity);
    }
  }
  return [...balances].filter(([, quantity]) => quantity > 0).sort((a, b) => b[1] - a[1]);
}
