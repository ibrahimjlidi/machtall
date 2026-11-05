import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

if (process.env.ALLOW_TEST_DATA_MUTATION !== 'true') {
  throw new Error('Refusing to run: set ALLOW_TEST_DATA_MUTATION=true only for a disposable, seeded test database');
}

const baseUrl = process.env.API_BASE_URL;
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;
const viewerEmail = process.env.TEST_VIEWER_EMAIL;
const viewerPassword = process.env.TEST_VIEWER_PASSWORD;
if (!baseUrl || !adminEmail || !adminPassword || !viewerEmail || !viewerPassword) {
  throw new Error('Set API_BASE_URL, TEST_ADMIN_EMAIL/PASSWORD, and TEST_VIEWER_EMAIL/PASSWORD for the disposable test environment');
}

async function request(path, { method = 'GET', body, cookie, expected } = {}) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(cookie && { Cookie: cookie }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (expected !== undefined) assert.equal(response.status, expected, `${method} ${path}: ${text}`);
  else assert.ok(response.ok, `${method} ${path} failed ${response.status}: ${text}`);
  return { response, payload };
}

async function login(email, password) {
  const { response, payload } = await request('/auth/login', { method: 'POST', body: { email, password } });
  return { cookie: response.headers.get('set-cookie').split(';')[0], user: payload.user };
}

async function run() {
  const { payload: health } = await request('/health');
  assert.equal(health.status, 'ok');
  await request('/dashboard', { expected: 401 });
  await request('/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: 'invalid-test-password' },
    expected: 401,
  });

  const { cookie: adminCookie, user: admin } = await login(adminEmail, adminPassword);
  assert.equal(admin.role, 'ADMIN');
  const createStaff = async (role) => {
    const { payload } = await request('/users', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        name: `Feature ${role}`,
        email: `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.org`,
        password: 'feature-test-password-2026',
        role,
      },
    });
    assert.equal(payload.role, role);
    assert.equal('passwordHash' in payload, false);
    return payload;
  };
  const storekeeper = await createStaff('STOREKEEPER');
  const purchaser = await createStaff('PURCHASING');
  const nurseryWorker = await createStaff('NURSERY_WORKER');
  const secondNurseryWorker = await createStaff('NURSERY_WORKER');
  const { payload: profile } = await request('/auth/me', { cookie: adminCookie });
  assert.equal(profile.id, admin.id);

  const { payload: categories } = await request('/categories', { cookie: adminCookie });
  const { payload: suppliers } = await request('/suppliers', { cookie: adminCookie });
  const { payload: initialProducts } = await request('/products', { cookie: adminCookie });
  const { payload: initialMovements } = await request('/movements', { cookie: adminCookie });
  const { payload: initialBatches } = await request('/production/batches', { cookie: adminCookie });
  const { payload: initialOrders } = await request('/purchase-orders', { cookie: adminCookie });
  const { payload: initialCustomers } = await request('/customers', { cookie: adminCookie });
  const openingCreditCustomer = initialCustomers.find((item) => item.openingCredit > 0);
  const { payload: initialSales } = await request('/sales', { cookie: adminCookie });
  const { payload: dashboard } = await request('/dashboard', { cookie: adminCookie });
  assert.ok(categories.length && suppliers.length && initialProducts.length);
  assert.ok(Array.isArray(initialMovements) && Array.isArray(initialBatches) && Array.isArray(initialOrders));
  assert.ok(Array.isArray(initialCustomers) && Array.isArray(initialSales));
  for (const metric of ['totalProducts', 'stockValue', 'lowStock', 'lossesThisMonth', 'todaySales']) {
    assert.equal(typeof dashboard[metric], 'number', `dashboard.${metric} should be numeric`);
  }

  const defaultCategory = categories[0];
  const { payload: createdCategory } = await request('/categories', {
    method: 'POST',
    cookie: adminCookie,
    body: { nameAr: 'فئة الاختبار', nameFr: 'Catégorie test' },
  });
  assert.equal(createdCategory.nameAr, 'فئة الاختبار');
  await request('/categories', {
    method: 'POST',
    cookie: adminCookie,
    body: { nameAr: '   ', nameFr: '   ' },
    expected: 400,
  });
  await request('/categories', {
    method: 'POST',
    cookie: adminCookie,
    body: { nameAr: 'فئة الاختبار', nameFr: 'Autre nom' },
    expected: 409,
  });
  const { payload: updatedCategory } = await request(`/categories/${createdCategory.id}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { nameAr: 'فئة اختبار محدثة', nameFr: 'Catégorie test modifiée' },
  });
  assert.equal(updatedCategory.nameFr, 'Catégorie test modifiée');
  const category = updatedCategory.nameAr;
  const { payload: testProduct } = await request('/products', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      sku: `E2E-${Date.now()}`,
      nameAr: 'منتج اختبار شامل',
      nameFr: 'Produit test complet',
      category,
      size: 'قطعة',
      purchasePrice: 1,
      salePrice: 2,
      minimum: 1,
      location: 'E2E warehouse',
      initialQuantity: 10,
    },
  });
  assert.equal(testProduct.quantity, 10);
  const { payload: updatedProduct } = await request(`/products/${testProduct.id}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { nameFr: 'Produit test modifié', minimum: 2 },
  });
  assert.equal(updatedProduct.nameFr, 'Produit test modifié');
  assert.equal(updatedProduct.minimum, 2);
  assert.equal(updatedProduct.category, category);
  await request(`/products/${testProduct.id}`, { method: 'DELETE', cookie: adminCookie, expected: 409 });
  await request(`/categories/${createdCategory.id}`, { method: 'DELETE', cookie: adminCookie, expected: 409 });

  await request('/movements', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      productId: testProduct.id,
      type: 'TRANSFER',
      quantity: 3,
      fromLocation: testProduct.location,
      toLocation: 'E2E greenhouse',
      reason: 'E2E transfer',
    },
  });
  await request('/movements?type=TRANSFER', { cookie: adminCookie }).then(({ payload }) => {
    assert.ok(payload.some((movement) => movement.productId === testProduct.id && movement.quantity === 3));
  });
  await request('/movements', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      productId: testProduct.id,
      type: 'TRANSFER',
      quantity: 1,
      fromLocation: testProduct.location,
      toLocation: testProduct.location,
    },
    expected: 400,
  });
  await request('/movements', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      productId: testProduct.id,
      type: 'TRANSFER',
      quantity: 3,
      fromLocation: 'E2E greenhouse',
      toLocation: testProduct.location,
      reason: 'E2E transfer return',
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const readyDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const { cookie: storekeeperWorkflowCookie } = await login(storekeeper.email, 'feature-test-password-2026');
  const { cookie: purchaserWorkflowCookie } = await login(purchaser.email, 'feature-test-password-2026');
  const { cookie: workerWorkflowCookie } = await login(nurseryWorker.email, 'feature-test-password-2026');
  const { cookie: secondWorkerCookie } = await login(secondNurseryWorker.email, 'feature-test-password-2026');
  await request('/purchase-orders', {
    method: 'POST',
    cookie: adminCookie,
    body: { supplierId: suppliers[0].id, lines: [{ productId: testProduct.id, quantity: 1 }] },
    expected: 403,
  });
  const batchCode = `E2E-B-${Date.now()}`;
  const { payload: batch } = await request('/production/batches', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      code: batchCode,
      seedType: 'E2E seeds',
      productId: testProduct.id,
      sowingDate: today,
      quantitySown: 8,
      expectedReadyDate: readyDate,
    },
  });
  const { payload: unassignedWorkerBatches } = await request('/production/batches', { cookie: workerWorkflowCookie });
  assert.equal(unassignedWorkerBatches.some((item) => item.id === batch.id), false);
  const { payload: unassignedSecondWorkerBatches } = await request('/production/batches', { cookie: secondWorkerCookie });
  assert.equal(unassignedSecondWorkerBatches.some((item) => item.id === batch.id), false);
  const { payload: secondWorkerTask } = await request('/production/tasks', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      title: 'Inspect another nursery batch',
      type: 'INSPECTION',
      assignedToId: secondNurseryWorker.id,
    },
  });
  assert.equal(secondWorkerTask.status, 'OPEN');
  const { payload: assignedTask } = await request('/production/tasks', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      title: 'Water olive seedlings',
      type: 'WATERING',
      assignedToId: nurseryWorker.id,
      batchId: batch.id,
      dueAt: readyDate,
    },
  });
  assert.equal(assignedTask.assignedToId, nurseryWorker.id);
  const { payload: assignedWorkerBatches } = await request('/production/batches', { cookie: workerWorkflowCookie });
  assert.ok(assignedWorkerBatches.some((item) => item.id === batch.id));
  const { payload: unassignedSecondWorkerBatchesAfterTask } = await request('/production/batches', { cookie: secondWorkerCookie });
  assert.equal(unassignedSecondWorkerBatchesAfterTask.some((item) => item.id === batch.id), false);
  await request('/production/workers', { cookie: workerWorkflowCookie, expected: 403 });
  await request('/production/tasks', {
    method: 'POST',
    cookie: workerWorkflowCookie,
    body: { title: 'Unauthorized task', type: 'OTHER', assignedToId: nurseryWorker.id },
    expected: 403,
  });
  const { payload: workerTasks } = await request('/production/tasks', { cookie: workerWorkflowCookie });
  assert.equal(workerTasks.length, 1);
  assert.equal(workerTasks[0].id, assignedTask.id);
  const { payload: otherWorkerTasks } = await request('/production/tasks', { cookie: secondWorkerCookie });
  assert.deepEqual(otherWorkerTasks.map((task) => task.id), [secondWorkerTask.id]);
  await request(`/production/tasks/${assignedTask.id}/status`, {
    method: 'PATCH',
    cookie: workerWorkflowCookie,
    body: { status: 'COMPLETED' },
    expected: 409,
  });
  await request(`/production/tasks/${assignedTask.id}/status`, {
    method: 'PATCH',
    cookie: secondWorkerCookie,
    body: { status: 'IN_PROGRESS' },
    expected: 404,
  });
  await request(`/production/tasks/${assignedTask.id}/status`, {
    method: 'PATCH',
    cookie: workerWorkflowCookie,
    body: { status: 'IN_PROGRESS', workerNote: 'Starting nursery work' },
  });
  const { payload: completedTask } = await request(`/production/tasks/${assignedTask.id}/status`, {
    method: 'PATCH',
    cookie: workerWorkflowCookie,
    body: { status: 'COMPLETED', workerNote: 'Watering completed' },
  });
  assert.equal(completedTask.status, 'COMPLETED');
  assert.equal(completedTask.workerNote, 'Watering completed');
  const { payload: careLog } = await request(`/production/batches/${batch.id}/care-logs`, {
    method: 'POST',
    cookie: workerWorkflowCookie,
    body: { type: 'WATERING', performedAt: `${today}T10:00:00.000Z`, note: 'Morning watering' },
  });
  assert.equal(careLog.type, 'WATERING');
  await request(`/production/batches/${batch.id}/care-logs`, {
    method: 'POST',
    cookie: workerWorkflowCookie,
    body: { type: 'TREATMENT', performedAt: '2999-01-01T10:00:00.000Z' },
    expected: 400,
  });
  await request(`/production/batches/${batch.id}/care-logs`, {
    method: 'POST',
    cookie: secondWorkerCookie,
    body: { type: 'WATERING', performedAt: `${today}T10:00:00.000Z` },
    expected: 404,
  });
  const { payload: firstLoss } = await request(`/production/batches/${batch.id}/losses`, {
    method: 'POST',
    cookie: workerWorkflowCookie,
    body: { quantity: 2, reason: 'Seedling disease', occurredAt: `${today}T10:00:00.000Z` },
  });
  assert.equal(firstLoss.quantity, 2);
  await request(`/production/batches/${batch.id}`, {
    method: 'PATCH',
    cookie: workerWorkflowCookie,
    body: { quantityLost: 3 },
    expected: 400,
  });
  const { payload: secondLoss } = await request(`/production/batches/${batch.id}/losses`, {
    method: 'POST',
    cookie: workerWorkflowCookie,
    body: { quantity: 1, reason: 'One plant dried out', occurredAt: `${today}T11:00:00.000Z` },
  });
  assert.equal(secondLoss.quantity, 1);
  await request(`/production/batches/${batch.id}/losses`, {
    method: 'POST',
    cookie: workerWorkflowCookie,
    body: { quantity: 6, reason: 'Exceeds surviving plants', occurredAt: `${today}T11:00:00.000Z` },
    expected: 400,
  });
  await request(`/production/batches/${batch.id}/losses`, {
    method: 'POST',
    cookie: secondWorkerCookie,
    body: { quantity: 1, reason: 'Unassigned loss', occurredAt: `${today}T11:00:00.000Z` },
    expected: 404,
  });
  await request(`/production/batches/${batch.id}/stage`, {
    method: 'PATCH',
    cookie: workerWorkflowCookie,
    body: { stage: 'GROWING' },
    expected: 409,
  });
  const { payload: germinationBatch } = await request(`/production/batches/${batch.id}/stage`, {
    method: 'PATCH',
    cookie: workerWorkflowCookie,
    body: { stage: 'GERMINATION' },
  });
  assert.equal(germinationBatch.stage, 'GERMINATION');
  await request(`/production/batches/${batch.id}/stage`, {
    method: 'PATCH',
    cookie: secondWorkerCookie,
    body: { stage: 'GROWING' },
    expected: 404,
  });
  const { payload: growingBatch } = await request(`/production/batches/${batch.id}/stage`, {
    method: 'PATCH',
    cookie: workerWorkflowCookie,
    body: { stage: 'GROWING' },
  });
  assert.equal(growingBatch.stage, 'GROWING');
  await request(`/production/batches/${batch.id}/stage`, {
    method: 'PATCH',
    cookie: workerWorkflowCookie,
    body: { stage: 'GERMINATION' },
    expected: 409,
  });
  const { payload: assignedBatches } = await request('/production/batches', { cookie: workerWorkflowCookie });
  assert.ok(assignedBatches.some((item) => item.id === batch.id));
  assert.ok(assignedBatches.find((item) => item.id === batch.id).careLogs.some((item) => item.id === careLog.id));
  assert.equal(assignedBatches.find((item) => item.id === batch.id).quantityLost, 3);
  const stockBeforeProductionApproval = (await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity;
  await request(`/production/batches/${batch.id}/ready-proposal`, {
    method: 'POST',
    cookie: workerWorkflowCookie,
    body: { quantity: 6 },
    expected: 400,
  });
  const { payload: readyProposal } = await request(`/production/batches/${batch.id}/ready-proposal`, {
    method: 'POST',
    cookie: workerWorkflowCookie,
    body: { quantity: 5 },
  });
  assert.equal(readyProposal.proposalStatus, 'PENDING');
  await request(`/production/batches/${batch.id}/losses`, {
    method: 'POST',
    cookie: workerWorkflowCookie,
    body: { quantity: 1, reason: 'Loss while proposal is pending', occurredAt: `${today}T12:00:00.000Z` },
    expected: 409,
  });
  assert.equal((await request('/products', { cookie: adminCookie })).payload.find((item) => item.id === testProduct.id).quantity, stockBeforeProductionApproval);
  await request(`/production/batches/${batch.id}/ready`, { method: 'POST', cookie: adminCookie, expected: 409 });
  await request(`/production/batches/${batch.id}/verify-ready`, { method: 'POST', cookie: adminCookie, expected: 403 });
  const { payload: verifiedProposal } = await request(`/production/batches/${batch.id}/verify-ready`, {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
  });
  assert.equal(verifiedProposal.proposalStatus, 'VERIFIED');
  await request(`/production/batches/${batch.id}/ready`, { method: 'POST', cookie: storekeeperWorkflowCookie, expected: 403 });
  const { payload: readyBatch } = await request(`/production/batches/${batch.id}/ready`, {
    method: 'POST',
    cookie: adminCookie,
  });
  assert.equal(readyBatch.stage, 'READY');
  assert.equal((await request('/products', { cookie: adminCookie })).payload.find((item) => item.id === testProduct.id).quantity, stockBeforeProductionApproval + 5);
  await request(`/production/batches/${batch.id}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { seedType: 'Edited after ready' },
    expected: 409,
  });
  await request(`/production/batches/${batch.id}/ready`, {
    method: 'POST',
    cookie: adminCookie,
    expected: 409,
  });

  const { payload: order } = await request('/purchase-orders', {
    method: 'POST',
    cookie: purchaserWorkflowCookie,
    body: { supplierId: suppliers[0].id, lines: [{ productId: testProduct.id, quantity: 3 }] },
  });
  assert.equal(order.status, 'PENDING_APPROVAL');
  await request(`/purchase-orders/${order.id}/send`, { method: 'PATCH', cookie: purchaserWorkflowCookie, expected: 409 });
  await request(`/purchase-orders/${order.id}/approve`, { method: 'PATCH', cookie: storekeeperWorkflowCookie, expected: 403 });
  const { payload: approvedOrder } = await request(`/purchase-orders/${order.id}/approve`, {
    method: 'PATCH',
    cookie: adminCookie,
  });
  assert.equal(approvedOrder.status, 'APPROVED');
  const { payload: sentOrder } = await request(`/purchase-orders/${order.id}/send`, {
    method: 'PATCH',
    cookie: purchaserWorkflowCookie,
  });
  assert.equal(sentOrder.status, 'SENT');
  await request(`/purchase-orders/${order.id}/receipts`, {
    method: 'POST',
    cookie: purchaserWorkflowCookie,
    body: { lines: [{ orderLineId: order.lines[0].id, receivedQuantity: 1, damagedQuantity: 0 }] },
    expected: 403,
  });
  const { payload: overReceiptLine } = await request(`/purchase-orders/${order.id}/receipts`, {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: { lines: [{ orderLineId: order.lines[0].id, receivedQuantity: 4, damagedQuantity: 0 }] },
    expected: 400,
  });
  assert.ok(overReceiptLine.message);
  await request(`/purchase-orders/${order.id}/receipts`, {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: { lines: [{ orderLineId: order.lines[0].id, receivedQuantity: 1, damagedQuantity: 2 }] },
    expected: 400,
  });
  const { payload: partialReceipt } = await request(`/purchase-orders/${order.id}/receipts`, {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: {
      lines: [{ orderLineId: order.lines[0].id, receivedQuantity: 2, damagedQuantity: 1 }],
      note: 'E2E partial delivery',
    },
  });
  assert.equal(partialReceipt.purchaseOrderStatus, 'PARTIALLY_RECEIVED');
  assert.equal(partialReceipt.lines[0].receivedQuantity, 2);
  assert.equal(partialReceipt.lines[0].damagedQuantity, 1);
  const { payload: partialOrderList } = await request('/purchase-orders', { cookie: adminCookie });
  assert.equal(partialOrderList.find((item) => item.id === order.id).status, 'PARTIALLY_RECEIVED');
  const { payload: partialReceiptMovements } = await request('/movements', { cookie: adminCookie });
  assert.ok(partialReceiptMovements.some((item) => item.type === 'PURCHASE_IN' && item.quantity === 2 && item.reference === partialReceipt.code));
  assert.ok(partialReceiptMovements.some((item) => item.type === 'LOSS_OUT' && item.quantity === 1 && item.reference === partialReceipt.code));
  const { payload: productsAfterReceiving } = await request('/products', { cookie: adminCookie });
  assert.equal(productsAfterReceiving.find((item) => item.id === testProduct.id).quantity, 16);
  const { payload: completedReceipt } = await request(`/purchase-orders/${order.id}/receipts`, {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: { lines: [{ orderLineId: order.lines[0].id, receivedQuantity: 1, damagedQuantity: 0 }] },
  });
  assert.equal(completedReceipt.purchaseOrderStatus, 'RECEIVED');
  const { payload: receivedOrderList } = await request('/purchase-orders', { cookie: adminCookie });
  assert.equal(receivedOrderList.find((item) => item.id === order.id).status, 'RECEIVED');
  const { payload: productsAfterFinalReceipt } = await request('/products', { cookie: adminCookie });
  assert.equal(productsAfterFinalReceipt.find((item) => item.id === testProduct.id).quantity, 17);
  await request(`/purchase-orders/${order.id}/receipts`, {
    method: 'POST',
    cookie: adminCookie,
    body: { lines: [{ orderLineId: order.lines[0].id, receivedQuantity: 1, damagedQuantity: 0 }] },
    expected: 409,
  });
  await request(`/purchase-orders/${order.id}/receive`, { method: 'PATCH', cookie: adminCookie, expected: 404 });
  const { payload: unsentOrder } = await request('/purchase-orders', {
    method: 'POST',
    cookie: purchaserWorkflowCookie,
    body: { supplierId: suppliers[0].id, lines: [{ productId: testProduct.id, quantity: 1 }] },
  });
  await request(`/purchase-orders/${unsentOrder.id}/receipts`, {
    method: 'POST',
    cookie: adminCookie,
    body: { lines: [{ orderLineId: unsentOrder.lines[0].id, receivedQuantity: 1, damagedQuantity: 0 }] },
    expected: 409,
  });
  const stockBeforePurchaseRejection = (await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity;
  const { payload: rejectedOrder } = await request(`/purchase-orders/${unsentOrder.id}/reject`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { reason: 'E2E rejection path' },
  });
  assert.equal(rejectedOrder.status, 'REJECTED');
  assert.equal((await request('/products', { cookie: adminCookie })).payload.find((item) => item.id === testProduct.id).quantity, stockBeforePurchaseRejection);
  await request(`/purchase-orders/${unsentOrder.id}/approve`, { method: 'PATCH', cookie: adminCookie, expected: 409 });
  const quantityBeforeAdjustment = (await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity;
  const { payload: count } = await request('/stock-counts', {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: {
      productId: testProduct.id,
      countedQuantity: quantityBeforeAdjustment + 2,
      reason: 'E2E approved stock correction',
      location: testProduct.location,
    },
  });
  assert.equal(count.systemQuantity, quantityBeforeAdjustment);
  assert.equal(count.countedQuantity, quantityBeforeAdjustment + 2);
  const adjustment = count.adjustmentRequest;
  assert.equal(adjustment.status, 'PENDING');
  assert.equal(adjustment.type, 'ADJUSTMENT_IN');
  assert.equal((await request('/stock-counts', { cookie: adminCookie })).payload
    .some((item) => item.id === count.id && item.adjustmentRequestId === adjustment.id), true);
  await request('/stock-counts', {
    method: 'POST',
    cookie: purchaserWorkflowCookie,
    body: { productId: testProduct.id, countedQuantity: 0, reason: 'Unauthorized count', location: testProduct.location },
    expected: 403,
  });
  await request('/adjustment-requests', {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: {
      productId: testProduct.id,
      type: 'ADJUSTMENT_IN',
      quantity: 2,
      reason: 'Count bypass attempt',
      location: testProduct.location,
    },
    expected: 404,
  });
  await request('/movements', {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: { productId: testProduct.id, type: 'ADJUSTMENT_IN', quantity: 1, reason: 'bypass approval' },
    expected: 400,
  });
  for (const type of ['PURCHASE_IN', 'PRODUCTION_IN', 'SALE_OUT']) {
    await request('/movements', {
      method: 'POST',
      cookie: storekeeperWorkflowCookie,
      body: { productId: testProduct.id, type, quantity: 1, reason: 'bypass approved workflow' },
      expected: 400,
    });
  }
  assert.equal((await request('/products', { cookie: adminCookie })).payload.find((item) => item.id === testProduct.id).quantity, quantityBeforeAdjustment);
  await request('/movements', {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: { productId: testProduct.id, type: 'LOSS_OUT', quantity: 1, reason: 'E2E stock changed after count', fromLocation: testProduct.location },
  });
  await request(`/adjustment-requests/${adjustment.id}/approve`, {
    method: 'PATCH',
    cookie: adminCookie,
    expected: 409,
  });
  await request(`/adjustment-requests/${adjustment.id}/reject`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { reason: 'Count became stale after another stock movement' },
  });
  const quantityBeforeFreshCount = (await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity;
  const { payload: freshCount } = await request('/stock-counts', {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: {
      productId: testProduct.id,
      countedQuantity: quantityBeforeFreshCount + 2,
      reason: 'E2E fresh stock correction',
      location: testProduct.location,
    },
  });
  const { payload: approvedAdjustment } = await request(`/adjustment-requests/${freshCount.adjustmentRequest.id}/approve`, {
    method: 'PATCH',
    cookie: adminCookie,
  });
  assert.equal(approvedAdjustment.status, 'APPROVED');
  assert.equal((await request('/products', { cookie: adminCookie })).payload.find((item) => item.id === testProduct.id).quantity, quantityBeforeFreshCount + 2);
  const quantityAfterFreshAdjustment = quantityBeforeFreshCount + 2;
  const { payload: exactCount } = await request('/stock-counts', {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: {
      productId: testProduct.id,
      countedQuantity: quantityAfterFreshAdjustment,
      reason: 'E2E exact stock count',
      location: testProduct.location,
    },
  });
  assert.equal(exactCount.systemQuantity, exactCount.countedQuantity);
  assert.equal(exactCount.adjustmentRequestId, null);
  const { payload: rejectedCount } = await request('/stock-counts', {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: {
      productId: testProduct.id,
      countedQuantity: quantityAfterFreshAdjustment - 1,
      reason: 'E2E rejected stock correction',
      location: testProduct.location,
    },
  });
  const rejectedAdjustmentRequest = rejectedCount.adjustmentRequest;
  assert.equal(rejectedAdjustmentRequest.type, 'ADJUSTMENT_OUT');
  const quantityBeforeRejection = (await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity;
  await request(`/adjustment-requests/${rejectedAdjustmentRequest.id}/reject`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { reason: 'Count evidence not attached' },
  });
  assert.equal((await request('/products', { cookie: adminCookie })).payload.find((item) => item.id === testProduct.id).quantity, quantityBeforeRejection);
  await request('/movements', {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: { productId: testProduct.id, type: 'INTERNAL_ISSUE_OUT', quantity: 1, reason: 'E2E internal use', fromLocation: testProduct.location },
  });
  assert.equal((await request('/products', { cookie: adminCookie })).payload.find((item) => item.id === testProduct.id).quantity, quantityBeforeRejection - 1);
  await request('/movements', {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: { productId: testProduct.id, type: 'INTERNAL_ISSUE_OUT', quantity: 1, fromLocation: testProduct.location },
    expected: 400,
  });
  await request('/adjustment-requests', { cookie: purchaserWorkflowCookie, expected: 403 });
  await request('/stock-counts', { cookie: purchaserWorkflowCookie, expected: 403 });
  const { payload: adminSession } = await request('/cash-sessions', {
    method: 'POST',
    cookie: adminCookie,
    body: { openingFloat: 10 },
  });
  await request('/cash-sessions', {
    method: 'POST',
    cookie: adminCookie,
    body: { openingFloat: 0 },
    expected: 409,
  });
  const { payload: preflightSale } = await request('/sales', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      customerId: initialCustomers.find((item) => item.name === 'سارة بن عمر').id,
      payment: 'PAID',
      lines: [{ productId: testProduct.id, quantity: 1 }],
    },
  });
  const stockBeforeMissingCashSession = (await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity;
  const { payload: closedAdminSession } = await request(`/cash-sessions/${adminSession.id}/close`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { closingCash: 10 + preflightSale.total },
  });
  assert.equal(closedAdminSession.expectedCash, 10 + preflightSale.total);
  assert.equal(closedAdminSession.variance, 0);
  await request('/sales', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      customerId: initialCustomers.find((item) => item.name === 'سارة بن عمر').id,
      payment: 'PAID',
      lines: [{ productId: testProduct.id, quantity: 1 }],
    },
    expected: 409,
  });
  assert.equal((await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity, stockBeforeMissingCashSession);
  const { payload: reopenedAdminSession } = await request('/cash-sessions', {
    method: 'POST',
    cookie: adminCookie,
    body: { openingFloat: 100 },
  });
  const { payload: paidSale } = await request('/sales', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      customerId: initialCustomers.find((item) => item.name === 'سارة بن عمر').id,
      payment: 'PAID',
      lines: [{ productId: testProduct.id, quantity: 1 }],
    },
  });
  const { payload: salesAfterCashSale } = await request('/sales', { cookie: adminCookie });
  assert.equal(salesAfterCashSale.find((sale) => sale.id === paidSale.id).payment, 'PAID');
  assert.equal(salesAfterCashSale.find((sale) => sale.id === paidSale.id).approvalStatus, 'APPROVED');

  const { payload: emptyProduct } = await request('/products', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      sku: `E2E-EMPTY-${Date.now()}`,
      nameAr: 'منتج أرشفة اختبار',
      nameFr: 'Produit à archiver',
      category: defaultCategory.nameAr,
      size: 'قطعة',
      purchasePrice: 1,
      salePrice: 2,
      minimum: 0,
      location: 'E2E warehouse',
    },
  });
  const { payload: archived } = await request(`/products/${emptyProduct.id}`, {
    method: 'DELETE',
    cookie: adminCookie,
  });
  assert.equal(archived.success, true);
  assert.ok(!(await request('/products', { cookie: adminCookie })).payload.some((item) => item.id === emptyProduct.id));
  const { payload: reassignedProduct } = await request(`/products/${testProduct.id}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { category: defaultCategory.nameAr },
  });
  assert.equal(reassignedProduct.category, defaultCategory.nameAr);
  assert.equal((await request(`/categories/${createdCategory.id}`, { method: 'DELETE', cookie: adminCookie })).payload.success, true);
  assert.ok(!(await request('/categories', { cookie: adminCookie })).payload.some((item) => item.id === createdCategory.id));

  await request(`/users/${admin.id}`, { method: 'PATCH', cookie: adminCookie, body: { active: false }, expected: 400 });

  const email = `feature-smoke-${Date.now()}@example.org`;
  await request('/users', {
    method: 'POST',
    cookie: adminCookie,
    body: { name: 'New Viewer', email, password: 'feature-test-password-2026', role: 'VIEWER' },
    expected: 400,
  });
  const seller = await createStaff('SELLER');
  const otherSeller = await createStaff('SELLER');
  const accountant = await createStaff('ACCOUNTANT');
  const { cookie: accountantCookie } = await login(accountant.email, 'feature-test-password-2026');
  const { payload: userList } = await request('/users', { cookie: adminCookie });
  assert.ok([seller, otherSeller, storekeeper, purchaser, nurseryWorker, accountant].every((staff) => userList.some((item) => item.id === staff.id)));
  await request('/users', { method: 'POST', cookie: adminCookie, body: { name: 'Duplicate', email: adminEmail, password: 'feature-test-password-2026', role: 'SELLER' }, expected: 409 });
  const { cookie: sellerCookie } = await login(seller.email, 'feature-test-password-2026');
  const { payload: sellerCashSession } = await request('/cash-sessions', {
    method: 'POST',
    cookie: sellerCookie,
    body: { openingFloat: 5 },
  });
  await request('/cash-sessions', {
    method: 'POST',
    cookie: sellerCookie,
    body: { openingFloat: 0 },
    expected: 409,
  });
  await request('/cash-sessions', { cookie: storekeeperWorkflowCookie, expected: 403 });
  await request('/cash-sessions', { method: 'POST', cookie: accountantCookie, body: { openingFloat: 0 }, expected: 403 });
  await request('/users', { cookie: sellerCookie, expected: 403 });
  await request('/categories', {
    method: 'POST',
    cookie: sellerCookie,
    body: { nameAr: 'غير مسموح', nameFr: 'Interdit' },
    expected: 403,
  });
  const { payload: sellerProducts } = await request('/products', { cookie: sellerCookie });
  assert.ok(sellerProducts.length && sellerProducts.every((item) => !('purchasePrice' in item)));
  await request('/products', {
    method: 'POST',
    cookie: sellerCookie,
    body: {
      nameAr: 'غير مسموح',
      nameFr: 'Interdit',
      category,
      size: 'قطعة',
      purchasePrice: 1,
      salePrice: 2,
      minimum: 0,
      location: 'E2E',
    },
    expected: 403,
  });
  const viewerCustomer = initialCustomers.find((item) => item.name === 'سارة بن عمر');
  const viewerProduct = initialProducts.find((item) => item.sku === 'P001');
  assert.ok(viewerCustomer && viewerProduct && openingCreditCustomer);
  await request('/movements', { cookie: sellerCookie, expected: 403 });
  await request('/production/batches', { cookie: sellerCookie, expected: 403 });
  await request('/purchase-orders', { cookie: sellerCookie, expected: 403 });
  await request('/suppliers', { cookie: sellerCookie, expected: 403 });
  await request('/supplier-quotes', { cookie: sellerCookie, expected: 403 });
  await request('/supplier-invoices', { cookie: sellerCookie, expected: 403 });
  await request('/supplier-returns', { cookie: sellerCookie, expected: 403 });
  await request('/reports', { cookie: sellerCookie, expected: 403 });
  const { payload: sellerPaidSale } = await request('/sales', {
    method: 'POST',
    cookie: sellerCookie,
    body: {
      customerId: viewerCustomer.id,
      payment: 'PAID',
      lines: [{ productId: viewerProduct.id, quantity: 1 }],
    },
  });
  const { payload: sellerOwnSale } = await request('/sales', {
    method: 'POST',
    cookie: sellerCookie,
    body: {
      customerId: openingCreditCustomer.id,
      payment: 'CREDIT',
      lines: [{ productId: testProduct.id, quantity: 1 }],
    },
  });
  assert.equal(sellerOwnSale.approvalStatus, 'PENDING');
  const stockBeforeCreditApproval = (await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity;
  await request(`/sales/${sellerOwnSale.id}/approve`, { method: 'PATCH', cookie: sellerCookie, expected: 403 });
  assert.equal((await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity, stockBeforeCreditApproval);
  assert.equal((await request('/customers', { cookie: sellerCookie })).payload
    .find((item) => item.id === openingCreditCustomer.id).credit, 0);
  await request(`/sales/${sellerOwnSale.id}/approve`, { method: 'PATCH', cookie: adminCookie });
  const { payload: rejectedCreditSale } = await request('/sales', {
    method: 'POST',
    cookie: sellerCookie,
    body: {
      customerId: viewerCustomer.id,
      payment: 'CREDIT',
      lines: [{ productId: testProduct.id, quantity: 1 }],
    },
  });
  const stockBeforeCreditRejection = (await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity;
  await request(`/sales/${rejectedCreditSale.id}/reject`, {
    method: 'PATCH',
    cookie: sellerCookie,
    body: { reason: 'not authorized' },
    expected: 403,
  });
  const { payload: rejectedCredit } = await request(`/sales/${rejectedCreditSale.id}/reject`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { reason: 'Credit not approved' },
  });
  assert.equal(rejectedCredit.approvalStatus, 'REJECTED');
  assert.equal((await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity, stockBeforeCreditRejection);
  const { cookie: otherSellerCookie } = await login(otherSeller.email, 'feature-test-password-2026');
  const { payload: otherSellerSale } = await request('/sales', {
    method: 'POST',
    cookie: otherSellerCookie,
    body: {
      customerId: openingCreditCustomer.id,
      payment: 'CREDIT',
      lines: [{ productId: testProduct.id, quantity: 1 }],
    },
  });
  assert.equal(otherSellerSale.approvalStatus, 'PENDING');
  await request(`/sales/${otherSellerSale.id}/approve`, { method: 'PATCH', cookie: adminCookie });
  const sellerSales = (await request('/sales', { cookie: sellerCookie })).payload;
  assert.ok(sellerSales.some((sale) => sale.id === sellerOwnSale.id));
  assert.ok(!sellerSales.some((sale) => sale.id === otherSellerSale.id || sale.id === paidSale.id));
  const sellerCustomer = (await request('/customers', { cookie: sellerCookie })).payload.find((item) => item.id === openingCreditCustomer.id);
  assert.equal(sellerCustomer.openingCredit, 0);
  assert.equal(sellerCustomer.credit, sellerOwnSale.total);
  const globalCustomerBeforeSellerPayment = (await request('/customers', { cookie: adminCookie })).payload.find((item) => item.id === openingCreditCustomer.id);
  await request(`/customers/${openingCreditCustomer.id}/payments`, {
    method: 'POST',
    cookie: sellerCookie,
    body: { amount: 1, note: 'seller-scoped payment', cashSessionId: sellerCashSession.id },
  });
  const sellerCustomerAfterPayment = (await request('/customers', { cookie: sellerCookie })).payload.find((item) => item.id === openingCreditCustomer.id);
  assert.equal(sellerCustomerAfterPayment.credit, sellerOwnSale.total - 1);
  assert.equal(sellerCustomerAfterPayment.payments[0].amount, 1);
  await request(`/customers/${openingCreditCustomer.id}/payments`, {
    method: 'POST',
    cookie: sellerCookie,
    body: { amount: 1, cashSessionId: reopenedAdminSession.id },
    expected: 403,
  });
  const globalCustomerAfterSellerPayment = (await request('/customers', { cookie: adminCookie })).payload.find((item) => item.id === openingCreditCustomer.id);
  assert.equal(globalCustomerAfterSellerPayment.credit, globalCustomerBeforeSellerPayment.credit - 1);
  await request(`/sales/${sellerPaidSale.id}/returns`, {
    method: 'POST',
    cookie: sellerCookie,
    body: { reason: '   ', lines: [{ productId: viewerProduct.id, quantity: 1 }] },
    expected: 400,
  });
  const returnRequest = await request(`/sales/${sellerPaidSale.id}/returns`, {
    method: 'POST',
    cookie: sellerCookie,
    body: { reason: 'E2E customer return', lines: [{ productId: viewerProduct.id, quantity: 1 }] },
  });
  assert.equal(returnRequest.payload.status, 'PENDING');
  await request(`/sales/${sellerPaidSale.id}/returns`, {
    method: 'POST',
    cookie: sellerCookie,
    body: { reason: 'Too many items', lines: [{ productId: viewerProduct.id, quantity: 2 }] },
    expected: 400,
  });
  await request(`/sales/returns/${returnRequest.payload.id}/approve`, { method: 'PATCH', cookie: sellerCookie, expected: 403 });
  await request(`/sales/returns/${returnRequest.payload.id}/verify`, {
    method: 'PATCH',
    cookie: storekeeperWorkflowCookie,
    body: { lines: [{ returnLineId: returnRequest.payload.lines[0].id, restockedQuantity: 1 }] },
    expected: 409,
  });
  const { payload: approvedReturn } = await request(`/sales/returns/${returnRequest.payload.id}/approve`, {
    method: 'PATCH',
    cookie: adminCookie,
  });
  assert.equal(approvedReturn.status, 'APPROVED');
  assert.equal(approvedReturn.cashRefundAmount, sellerPaidSale.total);
  const saleAfterRefund = (await request('/sales', { cookie: sellerCookie })).payload
    .find((sale) => sale.id === sellerPaidSale.id);
  assert.equal(saleAfterRefund.returnedAmount, sellerPaidSale.total);
  assert.equal(saleAfterRefund.paidAmount, 0);
  const storekeeperReturns = await request('/sales/returns', { cookie: storekeeperWorkflowCookie });
  assert.ok(storekeeperReturns.payload.some((item) => item.id === approvedReturn.id));
  assert.equal('customer' in storekeeperReturns.payload.find((item) => item.id === approvedReturn.id), false);
  const productStockBeforeReturn = (await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === viewerProduct.id).quantity;
  await request(`/sales/returns/${approvedReturn.id}/verify`, {
    method: 'PATCH',
    cookie: storekeeperWorkflowCookie,
    body: { lines: [{ returnLineId: approvedReturn.lines[0].id, restockedQuantity: 1 }] },
  });
  assert.equal((await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === viewerProduct.id).quantity, productStockBeforeReturn + 1);
  assert.equal((await request('/sales/returns', { cookie: sellerCookie })).payload
    .find((item) => item.id === approvedReturn.id).status, 'COMPLETED');
  await request(`/sales/returns/${approvedReturn.id}/verify`, {
    method: 'PATCH',
    cookie: storekeeperWorkflowCookie,
    body: { lines: [{ returnLineId: approvedReturn.lines[0].id, restockedQuantity: 1 }] },
    expected: 409,
  });
  assert.equal(globalCustomerAfterSellerPayment.openingCredit, globalCustomerBeforeSellerPayment.openingCredit);
  const allCustomerSales = (await request('/sales', { cookie: adminCookie })).payload
    .filter((sale) => sale.customerId === openingCreditCustomer.id);
  assert.equal(allCustomerSales.find((sale) => sale.id === otherSellerSale.id).balance, otherSellerSale.total);
  assert.equal(allCustomerSales.find((sale) => sale.id === sellerOwnSale.id).balance, sellerOwnSale.total - 1);

  const { cookie: storekeeperCookie } = await login(storekeeper.email, 'feature-test-password-2026');
  await request('/movements', { cookie: storekeeperCookie });
  await request('/production/batches', { cookie: storekeeperCookie });
  await request('/purchase-orders', { cookie: storekeeperCookie });
  await request('/stock-counts', { cookie: storekeeperCookie });
  await request('/sales', { cookie: storekeeperCookie, expected: 403 });
  await request('/customers', { cookie: storekeeperCookie, expected: 403 });
  await request('/products', {
    method: 'POST',
    cookie: storekeeperWorkflowCookie,
    body: { nameAr: 'غير مسموح', nameFr: 'Interdit', category, size: 'قطعة', purchasePrice: 1, salePrice: 2, minimum: 0, location: 'E2E' },
    expected: 403,
  });
  const { cookie: purchaserCookie } = await login(purchaser.email, 'feature-test-password-2026');
  await request('/purchase-orders', { cookie: purchaserCookie });
  await request('/suppliers', { cookie: purchaserCookie });
  const { payload: managedSupplier } = await request('/suppliers', {
    method: 'POST',
    cookie: purchaserCookie,
    body: { name: `E2E Supplier ${Date.now()}`, city: 'Test city', type: 'Plants', phone: '+21600000000', email: 'supplier-e2e@example.test' },
  });
  assert.equal(managedSupplier.active, true);
  const { payload: updatedSupplier } = await request(`/suppliers/${managedSupplier.id}`, {
    method: 'PATCH',
    cookie: purchaserCookie,
    body: { name: managedSupplier.name, city: 'Updated city', type: managedSupplier.type, phone: managedSupplier.phone, email: managedSupplier.email },
  });
  assert.equal(updatedSupplier.city, 'Updated city');
  await request('/suppliers', {
    method: 'POST',
    cookie: storekeeperCookie,
    body: { name: 'Forbidden supplier', city: 'Test', type: 'Plants', phone: '12345' },
    expected: 403,
  });
  const { payload: quote } = await request('/supplier-quotes', {
    method: 'POST',
    cookie: purchaserCookie,
    body: {
      supplierId: managedSupplier.id,
      reference: `QUOTE-${Date.now()}`,
      quoteDate: today,
      validUntil: readyDate,
      lines: [{ productId: testProduct.id, unitPrice: 5.555 }],
    },
  });
  assert.equal(Number(quote.lines[0].unitPrice), 5.555);
  await request('/supplier-quotes', {
    method: 'POST',
    cookie: adminCookie,
    body: { supplierId: managedSupplier.id, reference: 'FORBIDDEN-QUOTE', lines: [{ productId: testProduct.id, unitPrice: 5 }] },
    expected: 403,
  });
  const { payload: quoteBackedOrder } = await request('/purchase-orders', {
    method: 'POST',
    cookie: purchaserCookie,
    body: {
      supplierId: managedSupplier.id,
      lines: [{ productId: testProduct.id, quantity: 2, supplierQuoteLineId: quote.lines[0].id }],
    },
  });
  assert.equal(Number(quoteBackedOrder.lines[0].unitPrice), 5.555);
  assert.equal(quoteBackedOrder.lines[0].supplierQuoteLineId, quote.lines[0].id);
  await request('/purchase-orders', {
    method: 'POST',
    cookie: purchaserCookie,
    body: {
      supplierId: suppliers[0].id,
      lines: [{ productId: testProduct.id, quantity: 1, supplierQuoteLineId: quote.lines[0].id }],
    },
    expected: 400,
  });
  const { payload: expiredQuote } = await request('/supplier-quotes', {
    method: 'POST',
    cookie: purchaserCookie,
    body: {
      supplierId: managedSupplier.id,
      reference: `EXPIRED-${Date.now()}`,
      quoteDate: '2020-01-01',
      validUntil: '2020-01-02',
      lines: [{ productId: testProduct.id, unitPrice: 4 }],
    },
  });
  await request('/purchase-orders', {
    method: 'POST',
    cookie: purchaserCookie,
    body: {
      supplierId: managedSupplier.id,
      lines: [{ productId: testProduct.id, quantity: 1, supplierQuoteLineId: expiredQuote.lines[0].id }],
    },
    expected: 409,
  });
  const { payload: supplierInvoice } = await request('/supplier-invoices', {
    method: 'POST',
    cookie: purchaserCookie,
    body: { supplierId: managedSupplier.id, purchaseOrderId: quoteBackedOrder.id, reference: `INV-${Date.now()}`, totalAmount: 100, invoiceDate: today },
  });
  assert.equal(supplierInvoice.status, 'RECORDED');
  await request('/supplier-invoices', {
    method: 'POST',
    cookie: purchaserCookie,
    body: { supplierId: managedSupplier.id, purchaseOrderId: quoteBackedOrder.id, reference: supplierInvoice.reference, totalAmount: 100 },
    expected: 409,
  });
  await request('/supplier-invoices', {
    method: 'POST',
    cookie: purchaserCookie,
    body: { supplierId: managedSupplier.id, purchaseOrderId: order.id, reference: 'MISMATCHED-ORDER', totalAmount: 25 },
    expected: 400,
  });
  await request('/supplier-invoices', {
    method: 'POST',
    cookie: purchaserCookie,
    body: { supplierId: managedSupplier.id, reference: 'MISSING-AMOUNT' },
    expected: 400,
  });
  const stockBeforeSupplierReturn = (await request('/products', { cookie: adminCookie })).payload
    .find((item) => item.id === testProduct.id).quantity;
  const { payload: supplierReturn } = await request('/supplier-returns', {
    method: 'POST',
    cookie: purchaserCookie,
    body: {
      supplierId: managedSupplier.id,
      purchaseOrderId: quoteBackedOrder.id,
      supplierReference: 'RMA-E2E',
      reason: 'E2E damaged goods',
      lines: [{ productId: testProduct.id, quantity: 1 }],
    },
  });
  assert.equal(supplierReturn.status, 'PENDING_APPROVAL');
  await request(`/supplier-returns/${supplierReturn.id}/approve`, { method: 'PATCH', cookie: storekeeperCookie, expected: 403 });
  const { payload: approvedSupplierReturn } = await request(`/supplier-returns/${supplierReturn.id}/approve`, { method: 'PATCH', cookie: adminCookie });
  assert.equal(approvedSupplierReturn.status, 'APPROVED');
  assert.equal((await request('/products', { cookie: adminCookie })).payload.find((item) => item.id === testProduct.id).quantity, stockBeforeSupplierReturn);
  const { payload: rejectedSupplierReturnRequest } = await request('/supplier-returns', {
    method: 'POST',
    cookie: purchaserCookie,
    body: { supplierId: managedSupplier.id, reason: 'Second return for rejection coverage', lines: [{ productId: testProduct.id, quantity: 1 }] },
  });
  const { payload: rejectedSupplierReturn } = await request(`/supplier-returns/${rejectedSupplierReturnRequest.id}/reject`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { reason: 'Not eligible' },
  });
  assert.equal(rejectedSupplierReturn.status, 'REJECTED');
  const { payload: purchaserDraft } = await request('/purchase-orders', {
    method: 'POST',
    cookie: purchaserCookie,
    body: { supplierId: suppliers[0].id, lines: [{ productId: testProduct.id, quantity: 1 }] },
  });
  assert.equal(Number(purchaserDraft.lines[0].unitPrice), testProduct.purchasePrice);
  await request(`/suppliers/${managedSupplier.id}`, { method: 'DELETE', cookie: purchaserCookie });
  assert.ok(!(await request('/suppliers', { cookie: purchaserCookie })).payload.some((item) => item.id === managedSupplier.id));
  assert.equal(purchaserDraft.status, 'PENDING_APPROVAL');
  await request(`/purchase-orders/${purchaserDraft.id}/send`, { method: 'PATCH', cookie: purchaserCookie, expected: 409 });
  await request(`/purchase-orders/${purchaserDraft.id}/receipts`, {
    method: 'POST',
    cookie: purchaserCookie,
    body: { lines: [{ orderLineId: purchaserDraft.lines[0].id, receivedQuantity: 1, damagedQuantity: 0 }] },
    expected: 403,
  });
  const { payload: managerApprovedOrder } = await request(`/purchase-orders/${purchaserDraft.id}/approve`, { method: 'PATCH', cookie: adminCookie });
  assert.equal(managerApprovedOrder.status, 'APPROVED');
  const { payload: sentRoleOrder } = await request(`/purchase-orders/${purchaserDraft.id}/send`, { method: 'PATCH', cookie: purchaserCookie });
  assert.equal(sentRoleOrder.status, 'SENT');
  await request(`/purchase-orders/${purchaserDraft.id}/receipts`, {
    method: 'POST',
    cookie: storekeeperCookie,
    body: { lines: [{ orderLineId: purchaserDraft.lines[0].id, receivedQuantity: 1, damagedQuantity: 0 }] },
  });
  const { cookie: nurseryWorkerCookie } = await login(nurseryWorker.email, 'feature-test-password-2026');
  await request('/production/batches', { cookie: nurseryWorkerCookie });
  await request('/movements', { cookie: nurseryWorkerCookie, expected: 403 });
  await request('/sales', { cookie: nurseryWorkerCookie, expected: 403 });
  const { payload: workerBatch } = await request('/production/batches', {
    method: 'POST',
    cookie: nurseryWorkerCookie,
    body: { code: `E2E-WORKER-${Date.now()}`, seedType: 'seeds', productId: testProduct.id, sowingDate: today, quantitySown: 1, expectedReadyDate: readyDate },
  });
  assert.equal(workerBatch.createdById, nurseryWorker.id);
  const { payload: workerBatches } = await request('/production/batches', { cookie: nurseryWorkerCookie });
  assert.ok(workerBatches.some((item) => item.id === workerBatch.id));
  assert.ok(workerBatches.some((item) => item.id === batch.id));
  assert.ok(workerBatches.every((item) => item.createdById === nurseryWorker.id
    || item.tasks.some((task) => task.assignedToId === nurseryWorker.id)));
  await request(`/production/batches/${workerBatch.id}/ready`, { method: 'POST', cookie: nurseryWorkerCookie, expected: 403 });
  await request('/supplier-quotes', { cookie: accountantCookie });
  await request('/supplier-invoices', { cookie: accountantCookie });
  await request(`/supplier-invoices/${supplierInvoice.id}/review`, { method: 'PATCH', cookie: purchaserCookie, expected: 403 });
  const { payload: reviewedSupplierInvoice } = await request(`/supplier-invoices/${supplierInvoice.id}/review`, {
    method: 'PATCH',
    cookie: accountantCookie,
  });
  assert.equal(reviewedSupplierInvoice.status, 'REVIEWED');
  assert.equal(Number(reviewedSupplierInvoice.totalAmount), 100);
  await request(`/supplier-invoices/${supplierInvoice.id}/payments`, {
    method: 'POST',
    cookie: sellerCookie,
    body: { amount: 1, method: 'BANK_TRANSFER', reference: 'SELLER-TRANSFER' },
    expected: 403,
  });
  await request(`/supplier-invoices/${supplierInvoice.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 20, method: 'BANK_TRANSFER' },
    expected: 400,
  });
  await request(`/supplier-invoices/${supplierInvoice.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 100, method: 'CASH', cashSessionId: sellerCashSession.id },
    expected: 400,
  });
  const { payload: supplierCashPayment } = await request(`/supplier-invoices/${supplierInvoice.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 40, method: 'CASH', cashSessionId: reopenedAdminSession.id },
  });
  assert.equal(supplierCashPayment.cashSessionId, reopenedAdminSession.id);
  const { payload: supplierBankPayment } = await request(`/supplier-invoices/${supplierInvoice.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 10, method: 'BANK_TRANSFER', reference: 'BANK-INV-10' },
  });
  assert.equal(supplierBankPayment.cashSessionId, null);
  await request(`/supplier-invoices/${supplierInvoice.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 51, method: 'CHEQUE', reference: 'CHEQUE-OVERPAY' },
    expected: 400,
  });
  const invoiceWithPayments = (await request('/supplier-invoices', { cookie: accountantCookie })).payload
    .find((item) => item.id === supplierInvoice.id);
  assert.equal(invoiceWithPayments.payments.length, 2);
  assert.equal(invoiceWithPayments.payments.reduce((sum, item) => sum + Number(item.amount), 0), 50);
  await request('/expenses', { cookie: sellerCookie, expected: 403 });
  await request('/expenses', {
    method: 'POST',
    cookie: sellerCookie,
    body: { category: 'Utilities', description: 'Not allowed', amount: 2, incurredAt: today },
    expected: 403,
  });
  await request('/expenses', {
    method: 'POST',
    cookie: adminCookie,
    body: { category: 'Utilities', description: 'Admin cannot enter expenses', amount: 2, incurredAt: today },
    expected: 403,
  });
  await request('/expenses', {
    method: 'POST',
    cookie: accountantCookie,
    body: { category: 'Utilities', description: 'Invalid amount', amount: 0, incurredAt: today },
    expected: 400,
  });
  const { payload: expense } = await request('/expenses', {
    method: 'POST',
    cookie: accountantCookie,
    body: { category: 'Utilities', description: 'Monthly water and electricity', amount: 100, incurredAt: today },
  });
  assert.equal(expense.status, 'PENDING_APPROVAL');
  await request(`/expenses/${expense.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 10, method: 'BANK_TRANSFER', reference: 'EXP-PENDING' },
    expected: 409,
  });
  await request(`/expenses/${expense.id}/approve`, { method: 'PATCH', cookie: accountantCookie, expected: 403 });
  const { payload: approvedExpense } = await request(`/expenses/${expense.id}/approve`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { note: 'Verified against receipt' },
  });
  assert.equal(approvedExpense.status, 'APPROVED');
  const { payload: expenseCashPayment } = await request(`/expenses/${expense.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 30, method: 'CASH', cashSessionId: reopenedAdminSession.id },
  });
  assert.equal(expenseCashPayment.cashSessionId, reopenedAdminSession.id);
  const { payload: expenseBankPayment } = await request(`/expenses/${expense.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 20, method: 'CHEQUE', reference: 'CHEQUE-EXP-20' },
  });
  assert.equal(expenseBankPayment.cashSessionId, null);
  await request(`/expenses/${expense.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 51, method: 'BANK_TRANSFER', reference: 'EXP-OVERPAY' },
    expected: 400,
  });
  const expensesAfterPayment = (await request('/expenses', { cookie: adminCookie })).payload;
  assert.equal(expensesAfterPayment.find((item) => item.id === expense.id).paid, 50);
  assert.equal(expensesAfterPayment.find((item) => item.id === expense.id).balance, 50);
  const { payload: rejectedExpense } = await request('/expenses', {
    method: 'POST',
    cookie: accountantCookie,
    body: { category: 'Travel', description: 'Cancelled trip', amount: 12, incurredAt: today },
  });
  const { payload: rejectedExpenseResult } = await request(`/expenses/${rejectedExpense.id}/reject`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { note: 'Receipt was cancelled' },
  });
  assert.equal(rejectedExpenseResult.status, 'REJECTED');
  await request(`/expenses/${rejectedExpense.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 1, method: 'BANK_TRANSFER', reference: 'REJECTED-EXPENSE' },
    expected: 409,
  });
  await request('/vat-rates', { cookie: sellerCookie, expected: 403 });
  await request('/vat-rates', {
    method: 'POST',
    cookie: accountantCookie,
    body: { name: 'Standard', percentage: 19, effectiveFrom: '2099-01-01' },
    expected: 403,
  });
  const { payload: vatRate } = await request('/vat-rates', {
    method: 'POST',
    cookie: adminCookie,
    body: { name: 'Standard', percentage: 19, effectiveFrom: '2099-01-01' },
  });
  await request('/vat-rates', {
    method: 'POST',
    cookie: adminCookie,
    body: { name: 'Standard', percentage: 20, effectiveFrom: '2099-06-01' },
    expected: 409,
  });
  const { payload: vatRateList } = await request('/vat-rates', { cookie: accountantCookie });
  assert.equal(vatRateList.applicationEnabled, false);
  assert.ok(vatRateList.rates.some((item) => item.id === vatRate.id));
  const { payload: updatedVatRate } = await request(`/vat-rates/${vatRate.id}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { percentage: 20 },
  });
  assert.equal(updatedVatRate.percentage, 20);
  await request(`/vat-rates/${vatRate.id}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { effectiveFrom: '2020-01-01' },
    expected: 409,
  });
  await request('/cash-sessions', { cookie: accountantCookie });
  await request(`/cash-sessions/${sellerCashSession.id}/review`, { method: 'PATCH', cookie: sellerCookie, expected: 403 });
  await request(`/cash-sessions/${sellerCashSession.id}/review`, { method: 'PATCH', cookie: accountantCookie, expected: 409 });
  await request(`/cash-sessions/${sellerCashSession.id}/approve-variance`, { method: 'PATCH', cookie: adminCookie, expected: 409 });
  const sellerSessionBeforeNonCash = (await request('/cash-sessions', { cookie: sellerCookie })).payload
    .find((session) => session.id === sellerCashSession.id);
  await request(`/customers/${openingCreditCustomer.id}/payments`, {
    method: 'POST',
    cookie: adminCookie,
    body: { amount: 1, method: 'BANK_TRANSFER', reference: 'CUSTOMER-BANK-1' },
  });
  const openingCreditAfterNonCash = (await request('/customers', { cookie: adminCookie })).payload
    .find((item) => item.id === openingCreditCustomer.id);
  assert.equal(openingCreditAfterNonCash.payments[0].method, 'BANK_TRANSFER');
  assert.equal(openingCreditAfterNonCash.payments[0].reference, 'CUSTOMER-BANK-1');
  const sellerSessionAfterNonCash = (await request('/cash-sessions', { cookie: sellerCookie })).payload
    .find((session) => session.id === sellerCashSession.id);
  assert.equal(sellerSessionAfterNonCash.expectedCash, sellerSessionBeforeNonCash.expectedCash);
  await request(`/cash-sessions/${sellerCashSession.id}/close`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { closingCash: sellerSessionAfterNonCash.expectedCash },
    expected: 403,
  });
  const { payload: closedSellerSession } = await request(`/cash-sessions/${sellerCashSession.id}/close`, {
    method: 'PATCH',
    cookie: sellerCookie,
    body: { closingCash: sellerSessionAfterNonCash.expectedCash + 3 },
  });
  assert.equal(closedSellerSession.variance, 3);
  await request(`/cash-sessions/${sellerCashSession.id}/approve-variance`, { method: 'PATCH', cookie: adminCookie, expected: 409 });
  await request(`/cash-sessions/${sellerCashSession.id}/review`, { method: 'PATCH', cookie: adminCookie, expected: 403 });
  await request(`/cash-sessions/${sellerCashSession.id}/approve-variance`, { method: 'PATCH', cookie: accountantCookie, expected: 403 });
  const { payload: reviewedSellerSession } = await request(`/cash-sessions/${sellerCashSession.id}/review`, {
    method: 'PATCH',
    cookie: accountantCookie,
    body: { note: 'Drawer counted and reconciled' },
  });
  assert.equal(reviewedSellerSession.reviewedBy.id, accountant.id);
  const { payload: approvedSellerVariance } = await request(`/cash-sessions/${sellerCashSession.id}/approve-variance`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { note: 'Approved after review' },
  });
  assert.equal(approvedSellerVariance.varianceApprovedBy.id, admin.id);
  await request('/sales', { cookie: accountantCookie });
  await request('/customers', { cookie: accountantCookie });
  await request('/reports', { cookie: accountantCookie });
  await request('/movements', { cookie: accountantCookie });
  await request('/purchase-orders', { cookie: accountantCookie });
  await request('/sales', {
    method: 'POST',
    cookie: accountantCookie,
    body: { customerId: viewerCustomer.id, payment: 'PAID', lines: [{ productId: testProduct.id, quantity: 1 }] },
    expected: 403,
  });
  await request(`/customers/${openingCreditCustomer.id}/payments`, {
    method: 'POST',
    cookie: accountantCookie,
    body: { amount: 1, cashSessionId: reopenedAdminSession.id, note: 'accountant collection' },
  });
  await request('/cash-sessions', { cookie: accountantCookie });
  const { cookie: viewerCookie } = await login(viewerEmail, viewerPassword);
  await request('/products', { cookie: viewerCookie });
  await request('/movements', { cookie: viewerCookie });
  await request('/dashboard', { cookie: viewerCookie });
  for (const path of ['/sales', '/customers', '/purchase-orders', '/suppliers', '/supplier-quotes',
    '/supplier-invoices', '/supplier-returns', '/production/batches', '/reports', '/users']) {
    await request(path, { cookie: viewerCookie, expected: 403 });
  }
  await request('/audit-logs', { cookie: viewerCookie, expected: 403 });
  await request('/audit-logs?limit=0', { cookie: adminCookie, expected: 400 });
  const { payload: auditEntries } = await request('/audit-logs?limit=200', { cookie: adminCookie });
  for (const action of ['user.created', 'product.created', 'category.created', 'inventory.movement_created',
    'production.ready_proposed', 'production.ready_verified', 'production.ready_approved',
    'purchase_order.submitted', 'purchase_order.approved', 'purchase_order.sent', 'purchase_order.received',
    'supplier.created', 'supplier.updated', 'supplier.archived', 'supplier_quote.recorded',
    'supplier_invoice.recorded', 'supplier_invoice.reviewed', 'supplier_return.requested',
    'supplier_return.approved', 'supplier_return.rejected',
    'purchase_order.rejected', 'inventory.adjustment_requested', 'inventory.adjustment_approved',
    'inventory.adjustment_rejected', 'inventory.stock_counted', 'sale.created',
    'cash_session.opened', 'customer_payment.recorded']) {
    assert.ok(auditEntries.some((entry) => entry.action === action), `missing audit event ${action}`);
  }
  const serializedAudit = JSON.stringify(auditEntries);
  assert.ok(!serializedAudit.includes('passwordHash'));
  assert.ok(!serializedAudit.includes('feature-test-password'));
  const prisma = new PrismaClient();
  try {
    const auditId = auditEntries[0].id;
    await assert.rejects(
      prisma.auditLog.update({ where: { id: auditId }, data: { action: 'tampered' } }),
      /AuditLog records are append-only/,
    );
    await assert.rejects(
      prisma.auditLog.delete({ where: { id: auditId } }),
      /AuditLog records are append-only/,
    );
    const cashEntry = await prisma.cashLedgerEntry.findFirstOrThrow();
    await assert.rejects(
      prisma.cashLedgerEntry.update({ where: { id: cashEntry.id }, data: { reason: 'tampered' } }),
      /CashLedgerEntry records are append-only/,
    );
    await assert.rejects(
      prisma.cashLedgerEntry.delete({ where: { id: cashEntry.id } }),
      /CashLedgerEntry records are append-only/,
    );
    const inventoryMovement = await prisma.inventoryMovement.findFirstOrThrow({
      where: { purchaseReceiptLineId: { not: null } },
    });
    await assert.rejects(
      prisma.inventoryMovement.update({ where: { id: inventoryMovement.id }, data: { reason: 'tampered' } }),
      /InventoryMovement records are append-only/,
    );
    await assert.rejects(
      prisma.supplierQuote.update({ where: { id: quote.id }, data: { note: 'tampered' } }),
      /SupplierQuote records are append-only/,
    );
    await assert.rejects(
      prisma.supplierQuoteLine.delete({ where: { id: quote.lines[0].id } }),
      /SupplierQuoteLine records are append-only/,
    );
    const stockCount = await prisma.stockCount.findFirstOrThrow();
    await assert.rejects(
      prisma.stockCount.update({ where: { id: stockCount.id }, data: { countedQuantity: 999 } }),
      /StockCount records are append-only/,
    );
    await assert.rejects(
      prisma.purchaseReceipt.update({ where: { id: partialReceipt.id }, data: { note: 'tampered' } }),
      /PurchaseReceipt records are append-only/,
    );
  } finally {
    await prisma.$disconnect();
  }
  await request(`/users/${seller.id}/password`, { method: 'POST', cookie: adminCookie, body: { password: 'feature-reset-password-2026' } });
  await request('/auth/me', { cookie: sellerCookie, expected: 401 });
  const { cookie: newStaffCookie } = await login(seller.email, 'feature-reset-password-2026');
  await request(`/users/${seller.id}`, { method: 'PATCH', cookie: adminCookie, body: { active: false } });
  await request('/auth/me', { cookie: newStaffCookie, expected: 401 });

  const { payload: customers } = await request('/customers', { cookie: adminCookie });
  const customer = customers.find((item) => item.name === 'سارة بن عمر');
  const { payload: products } = await request('/products', { cookie: adminCookie });
  const product = products.find((item) => item.sku === 'P001');
  assert.ok(customer && openingCreditCustomer && product);
  const creditBefore = customer.credit;
  const { payload: pendingCreditSale } = await request('/sales', {
    method: 'POST',
    cookie: adminCookie,
    body: { customerId: customer.id, payment: 'CREDIT', lines: [{ productId: product.id, quantity: 1 }] },
  });
  assert.equal(pendingCreditSale.approvalStatus, 'PENDING');
  assert.equal((await request('/customers', { cookie: adminCookie })).payload
    .find((item) => item.id === customer.id).credit, creditBefore);
  const { payload: createdCreditSale } = await request(`/sales/${pendingCreditSale.id}/approve`, {
    method: 'PATCH',
    cookie: adminCookie,
  });
  assert.equal(createdCreditSale.approvalStatus, 'APPROVED');
  const salesBeforePayment = (await request('/sales', { cookie: adminCookie })).payload
    .filter((sale) => sale.customerId === customer.id);
  assert.ok(salesBeforePayment.some((sale) => sale.id === createdCreditSale.id));
  const beforePayment = (await request('/customers', { cookie: adminCookie })).payload.find((item) => item.id === customer.id);
  await request(`/customers/${customer.id}/payments`, {
    method: 'POST',
    cookie: adminCookie,
    body: { amount: 2, note: 'feature smoke test', cashSessionId: reopenedAdminSession.id },
  });
  const afterPayment = (await request('/customers', { cookie: adminCookie })).payload.find((item) => item.id === customer.id);
  assert.equal(afterPayment.credit, beforePayment.credit - 2);
  assert.equal(afterPayment.payments[0].note, 'feature smoke test');
  const salesAfterPayment = (await request('/sales', { cookie: adminCookie })).payload
    .filter((sale) => sale.customerId === customer.id);
  const outstandingBeforePayment = salesBeforePayment.reduce((sum, sale) => sum + sale.balance, 0);
  const outstandingAfterPayment = salesAfterPayment.reduce((sum, sale) => sum + sale.balance, 0);
  assert.equal(outstandingAfterPayment, outstandingBeforePayment - 2);
  await request(`/customers/${customer.id}/payments`, {
    method: 'POST',
    cookie: adminCookie,
    body: { amount: 100000, cashSessionId: reopenedAdminSession.id },
    expected: 400,
  });

  const openingBefore = (await request('/customers', { cookie: adminCookie })).payload
    .find((item) => item.id === openingCreditCustomer.id).credit;
  await request(`/customers/${openingCreditCustomer.id}/payments`, {
    method: 'POST',
    cookie: adminCookie,
    body: { amount: 1, cashSessionId: reopenedAdminSession.id },
  });
  const openingAfter = (await request('/customers', { cookie: adminCookie })).payload.find((item) => item.id === openingCreditCustomer.id);
  assert.equal(openingAfter.credit, openingBefore - 1);
  assert.ok(openingAfter.payments.length > 0);

  const { payload: openSessions } = await request('/cash-sessions', { cookie: adminCookie });
  const activeAdminSession = openSessions.find((session) => session.id === reopenedAdminSession.id);
  assert.ok(activeAdminSession);
  assert.equal(activeAdminSession.expectedCash, 100 + paidSale.total + 4 - sellerPaidSale.total - 70);
  const { payload: finalSession } = await request(`/cash-sessions/${activeAdminSession.id}/close`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { closingCash: activeAdminSession.expectedCash },
  });
  assert.equal(finalSession.variance, 0);

  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const { payload: report } = await request(`/reports?from=${from}&to=${to}`, { cookie: adminCookie });
  assert.ok(report.summary.salesCount > 0 && report.summary.inventoryValue > 0);
  assert.ok(report.inventory.length && report.salesByCustomer.length && report.salesByProduct.length);
  assert.ok(report.summary.salesTotal >= 0);
  assert.equal(report.summary.profitAvailable, false);
  assert.equal(report.summary.vatApplied, false);
  assert.ok(report.summary.approvedExpenses >= 100);
  assert.ok(report.summary.expensePayableOutstanding >= 50);
  assert.ok(report.summary.supplierPayments >= 50);
  assert.ok(report.summary.supplierPayableOutstanding >= 50);
  assert.match(report.summary.financialReportNotice, /Operational summary/);
  await request('/reports?from=2026-12-01&to=2026-11-01', { cookie: adminCookie, expected: 400 });

  const { response: logoutResponse } = await request('/auth/logout', { method: 'POST', cookie: adminCookie });
  assert.match(logoutResponse.headers.get('set-cookie'), /Max-Age=0/);
  await request('/auth/me', { expected: 401 });

  console.log('API E2E passed: auth, dashboard, reference data, products, movements, production approvals, purchasing approvals, stock adjustments, audit history, POS sessions, credit approvals, returns, sales/payments, reports, and user authorization.');
  if (creditBefore === 0) console.log('Credit sale created against the zero-opening-credit fixture customer.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
