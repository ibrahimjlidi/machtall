import assert from 'node:assert/strict';

if (process.env.ALLOW_TEST_DATA_MUTATION !== 'true') {
  throw new Error('Refusing to run: set ALLOW_TEST_DATA_MUTATION=true only for a disposable, seeded test database');
}

const baseUrl = process.env.API_BASE_URL;
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;
if (!baseUrl || !adminEmail || !adminPassword) {
  throw new Error('Set API_BASE_URL, TEST_ADMIN_EMAIL, and TEST_ADMIN_PASSWORD for the disposable test environment');
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
  const { payload: profile } = await request('/auth/me', { cookie: adminCookie });
  assert.equal(profile.id, admin.id);

  const { payload: categories } = await request('/categories', { cookie: adminCookie });
  const { payload: suppliers } = await request('/suppliers', { cookie: adminCookie });
  const { payload: initialProducts } = await request('/products', { cookie: adminCookie });
  const { payload: initialMovements } = await request('/movements', { cookie: adminCookie });
  const { payload: initialBatches } = await request('/production/batches', { cookie: adminCookie });
  const { payload: initialOrders } = await request('/purchase-orders', { cookie: adminCookie });
  const { payload: initialCustomers } = await request('/customers', { cookie: adminCookie });
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
      quantityLost: 2,
      expectedReadyDate: readyDate,
    },
  });
  const { payload: updatedBatch } = await request(`/production/batches/${batch.id}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { quantityLost: 3 },
  });
  assert.equal(updatedBatch.quantityLost, 3);
  const { payload: readyBatch } = await request(`/production/batches/${batch.id}/ready`, {
    method: 'POST',
    cookie: adminCookie,
  });
  assert.equal(readyBatch.stage, 'READY');
  await request(`/production/batches/${batch.id}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { quantityLost: 4 },
    expected: 409,
  });
  await request(`/production/batches/${batch.id}/ready`, {
    method: 'POST',
    cookie: adminCookie,
    expected: 409,
  });

  const { payload: order } = await request('/purchase-orders', {
    method: 'POST',
    cookie: adminCookie,
    body: { supplierId: suppliers[0].id, lines: [{ productId: testProduct.id, quantity: 3 }] },
  });
  const { payload: sentOrder } = await request(`/purchase-orders/${order.id}/send`, {
    method: 'PATCH',
    cookie: adminCookie,
  });
  assert.equal(sentOrder.status, 'SENT');
  const { payload: receivedOrder } = await request(`/purchase-orders/${order.id}/receive`, {
    method: 'PATCH',
    cookie: adminCookie,
  });
  assert.equal(receivedOrder.status, 'RECEIVED');
  const { payload: productsAfterReceiving } = await request('/products', { cookie: adminCookie });
  assert.equal(productsAfterReceiving.find((item) => item.id === testProduct.id).quantity, 18);
  await request(`/purchase-orders/${order.id}/receive`, {
    method: 'PATCH',
    cookie: adminCookie,
    expected: 409,
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
  const { payload: staff } = await request('/users', {
    method: 'POST',
    cookie: adminCookie,
    body: { name: 'Feature Test Staff', email, password: 'feature-test-password-2026', role: 'VIEWER' },
  });
  assert.equal(staff.role, 'VIEWER');
  assert.equal('passwordHash' in staff, false);
  const { payload: userList } = await request('/users', { cookie: adminCookie });
  assert.ok(userList.some((item) => item.id === staff.id));
  await request('/users', { method: 'POST', cookie: adminCookie, body: { name: 'Duplicate', email: adminEmail, password: 'feature-test-password-2026', role: 'VIEWER' }, expected: 409 });
  const { cookie: oldStaffCookie } = await login(email, 'feature-test-password-2026');
  await request('/users', { cookie: oldStaffCookie, expected: 403 });
  await request('/categories', {
    method: 'POST',
    cookie: oldStaffCookie,
    body: { nameAr: 'غير مسموح', nameFr: 'Interdit' },
    expected: 403,
  });
  await request('/products', {
    method: 'POST',
    cookie: oldStaffCookie,
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
  assert.ok(viewerCustomer && viewerProduct);
  await request('/sales', {
    method: 'POST',
    cookie: oldStaffCookie,
    body: {
      customerId: viewerCustomer.id,
      payment: 'PAID',
      lines: [{ productId: viewerProduct.id, quantity: 1 }],
    },
    expected: 403,
  });
  await request(`/users/${staff.id}/password`, { method: 'POST', cookie: adminCookie, body: { password: 'feature-reset-password-2026' } });
  await request('/auth/me', { cookie: oldStaffCookie, expected: 401 });
  const { cookie: newStaffCookie } = await login(email, 'feature-reset-password-2026');
  await request(`/users/${staff.id}`, { method: 'PATCH', cookie: adminCookie, body: { active: false } });
  await request('/auth/me', { cookie: newStaffCookie, expected: 401 });

  const { payload: customers } = await request('/customers', { cookie: adminCookie });
  const customer = customers.find((item) => item.name === 'سارة بن عمر');
  const openingCreditCustomer = customers.find((item) => item.openingCredit > 0);
  const { payload: products } = await request('/products', { cookie: adminCookie });
  const product = products.find((item) => item.sku === 'P001');
  assert.ok(customer && openingCreditCustomer && product);
  const creditBefore = customer.credit;
  const { payload: createdCreditSale } = await request('/sales', {
    method: 'POST',
    cookie: adminCookie,
    body: { customerId: customer.id, payment: 'CREDIT', lines: [{ productId: product.id, quantity: 1 }] },
  });
  const salesBeforePayment = (await request('/sales', { cookie: adminCookie })).payload
    .filter((sale) => sale.customerId === customer.id);
  assert.ok(salesBeforePayment.some((sale) => sale.id === createdCreditSale.id));
  const beforePayment = (await request('/customers', { cookie: adminCookie })).payload.find((item) => item.id === customer.id);
  await request(`/customers/${customer.id}/payments`, { method: 'POST', cookie: adminCookie, body: { amount: 2, note: 'feature smoke test' } });
  const afterPayment = (await request('/customers', { cookie: adminCookie })).payload.find((item) => item.id === customer.id);
  assert.equal(afterPayment.credit, beforePayment.credit - 2);
  assert.equal(afterPayment.payments[0].note, 'feature smoke test');
  const salesAfterPayment = (await request('/sales', { cookie: adminCookie })).payload
    .filter((sale) => sale.customerId === customer.id);
  const outstandingBeforePayment = salesBeforePayment.reduce((sum, sale) => sum + sale.balance, 0);
  const outstandingAfterPayment = salesAfterPayment.reduce((sum, sale) => sum + sale.balance, 0);
  assert.equal(outstandingAfterPayment, outstandingBeforePayment - 2);
  await request(`/customers/${customer.id}/payments`, { method: 'POST', cookie: adminCookie, body: { amount: 100000 }, expected: 400 });

  const openingBefore = openingCreditCustomer.credit;
  await request(`/customers/${openingCreditCustomer.id}/payments`, { method: 'POST', cookie: adminCookie, body: { amount: 1 } });
  const openingAfter = (await request('/customers', { cookie: adminCookie })).payload.find((item) => item.id === openingCreditCustomer.id);
  assert.equal(openingAfter.credit, openingBefore - 1);
  assert.ok(openingAfter.payments.length > 0);

  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const { payload: report } = await request(`/reports?from=${from}&to=${to}`, { cookie: adminCookie });
  assert.ok(report.summary.salesCount > 0 && report.summary.inventoryValue > 0);
  assert.ok(report.inventory.length && report.salesByCustomer.length && report.salesByProduct.length);
  await request('/reports?from=2026-12-01&to=2026-11-01', { cookie: adminCookie, expected: 400 });

  const { response: logoutResponse } = await request('/auth/logout', { method: 'POST', cookie: adminCookie });
  assert.match(logoutResponse.headers.get('set-cookie'), /Max-Age=0/);
  await request('/auth/me', { expected: 401 });

  console.log('API E2E passed: auth, dashboard, reference data, products, movements, production, purchasing, sales/payments, reports, and user authorization.');
  if (creditBefore === 0) console.log('Credit sale created against the zero-opening-credit fixture customer.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
