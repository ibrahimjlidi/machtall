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
  const { cookie: adminCookie, user: admin } = await login(adminEmail, adminPassword);
  assert.equal(admin.role, 'ADMIN');
  await request(`/users/${admin.id}`, { method: 'PATCH', cookie: adminCookie, body: { active: false }, expected: 400 });

  const email = `feature-smoke-${Date.now()}@example.org`;
  const { payload: staff } = await request('/users', {
    method: 'POST',
    cookie: adminCookie,
    body: { name: 'Feature Test Staff', email, password: 'feature-test-password-2026', role: 'VIEWER' },
  });
  assert.equal(staff.role, 'VIEWER');
  assert.equal('passwordHash' in staff, false);
  await request('/users', { method: 'POST', cookie: adminCookie, body: { name: 'Duplicate', email: adminEmail, password: 'feature-test-password-2026', role: 'VIEWER' }, expected: 409 });
  const { cookie: oldStaffCookie } = await login(email, 'feature-test-password-2026');
  await request('/users', { cookie: oldStaffCookie, expected: 403 });
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

  const { payload: report } = await request('/reports?from=2026-11-01&to=2026-11-30', { cookie: adminCookie });
  assert.ok(report.summary.salesCount > 0 && report.summary.inventoryValue > 0);
  assert.ok(report.inventory.length && report.salesByCustomer.length && report.salesByProduct.length);
  await request('/reports?from=2026-12-01&to=2026-11-01', { cookie: adminCookie, expected: 400 });

  console.log('Feature smoke tests passed: user administration, session revocation, credit receipts and allocations, and live reports.');
  if (creditBefore === 0) console.log('Credit sale created against the zero-opening-credit fixture customer.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
