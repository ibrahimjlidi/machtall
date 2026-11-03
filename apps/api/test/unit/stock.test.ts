import assert from 'node:assert/strict';
import test from 'node:test';
import { MovementType } from '@prisma/client';
import { getLocationBalances, getLocationStock, getProductStock, movementSign, stockByProduct } from '../../src/common/stock';

test('movementSign classifies inventory movements', () => {
  assert.equal(movementSign(MovementType.PURCHASE_IN), 1);
  assert.equal(movementSign(MovementType.PRODUCTION_IN), 1);
  assert.equal(movementSign(MovementType.SALE_OUT), -1);
  assert.equal(movementSign(MovementType.LOSS_OUT), -1);
  assert.equal(movementSign(MovementType.TRANSFER), 0);
});

test('stockByProduct sums incoming and outgoing ledger quantities', async () => {
  const db = {
    inventoryMovement: {
      groupBy: async () => [
        { productId: 'p1', type: MovementType.PURCHASE_IN, _sum: { quantity: 12 } },
        { productId: 'p1', type: MovementType.SALE_OUT, _sum: { quantity: 4 } },
        { productId: 'p2', type: MovementType.LOSS_OUT, _sum: { quantity: 2 } },
      ],
    },
  };

  assert.deepEqual([...await stockByProduct(db as never)], [['p1', 8], ['p2', -2]]);
});

test('getProductStock never reports a negative quantity', async () => {
  const db = {
    inventoryMovement: {
      groupBy: async () => [
        { productId: 'p1', type: MovementType.SALE_OUT, _sum: { quantity: 3 } },
      ],
    },
  };

  assert.equal(await getProductStock(db as never, 'p1'), 0);
});

test('location balances apply transfers to source and destination', async () => {
  const rows = [
    { type: MovementType.PURCHASE_IN, quantity: 10, fromLocation: null, toLocation: 'Main' },
    { type: MovementType.TRANSFER, quantity: 4, fromLocation: 'Main', toLocation: 'Greenhouse' },
    { type: MovementType.SALE_OUT, quantity: 2, fromLocation: 'Greenhouse', toLocation: null },
  ];
  const db = { inventoryMovement: { findMany: async () => rows } };

  assert.equal(await getLocationStock(db as never, 'p1', 'Main'), 6);
  assert.equal(await getLocationStock(db as never, 'p1', 'Greenhouse'), 2);
  assert.deepEqual(await getLocationBalances(db as never, 'p1'), [['Main', 6], ['Greenhouse', 2]]);
});
