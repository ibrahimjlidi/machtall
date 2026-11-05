import { expect, test } from '@playwright/test';

test('login language, password visibility, and invalid credentials', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Invalid email or password' }),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();

  await page.getByRole('button', { name: 'Français' }).click();
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
  await expect(page.getByLabel('Adresse e-mail')).toBeVisible();

  await page.getByRole('button', { name: 'العربية' }).click();
  const password = page.getByRole('textbox', { name: 'كلمة المرور' });
  await password.fill('wrong-password');
  await page.getByRole('button', { name: 'إظهار كلمة المرور' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'إخفاء كلمة المرور' }).click();
  await expect(password).toHaveAttribute('type', 'password');

  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
});

async function mockApplicationApi(page, role = 'ADMIN', { pos = false, stock = false, production = false, accounting = false } = {}) {
  let categories = [{ id: 'fruit', nameAr: 'أشجار مثمرة', nameFr: 'Arbres fruitiers' }];
  let suppliers = [{ id: 'supplier-1', name: 'مورد تجريبي', city: 'صفاقس', type: 'نباتات', phone: '12345678', active: true }];
  let supplierQuotes = [];
  let supplierInvoices = [];
  let supplierReturns = [];
  let expenses = accounting ? [{
    id: 'expense-pending-ui',
    category: 'Utilities',
    description: 'Water and electricity',
    amount: 80,
    paid: 0,
    balance: 80,
    incurredAt: '2026-11-05T00:00:00.000Z',
    status: 'PENDING_APPROVAL',
    requestedBy: { id: 'accountant-ui', name: 'UI Accountant' },
    payments: [],
  }] : [];
  let vatRates = [];
  const products = pos || stock || production ? [{
    id: 'olive-1',
    sku: 'OLV-001',
    nameAr: 'زيتون شملالي',
    nameFr: 'Olivier Chemlali',
    scientific: 'Olea europaea',
    category: 'أشجار مثمرة',
    size: '30 سم',
    salePrice: 12,
    purchasePrice: 7,
    minimumStock: 2,
    homeLocation: 'مشتل 1',
    location: 'مشتل 1',
    quantity: 10,
    imageUrl: null,
    active: true,
  }] : [];
  let movements = stock ? [{
    id: 'stock-movement-1',
    productId: 'olive-1',
    type: 'PURCHASE_IN',
    quantity: 10,
    reason: 'Opening stock',
    reference: 'OPEN-1',
    toLocation: 'مشتل 1',
    date: '2026-11-05',
    createdAt: '2026-11-05T09:00:00.000Z',
  }] : [];
  let orders = stock ? [{
    id: 'po-stock-1',
    code: 'PO-STOCK-1',
    supplierId: 'supplier-1',
    status: 'SENT',
    createdAt: '2026-11-05T09:00:00.000Z',
    supplier: { id: 'supplier-1', name: 'مورد تجريبي' },
    lines: [{
      id: 'po-line-1',
      productId: 'olive-1',
      quantity: 5,
      unitPrice: 7,
      product: { id: 'olive-1', nameAr: 'زيتون شملالي', nameFr: 'Olivier Chemlali' },
    }],
    receipts: [],
  }] : [];
  let stockCounts = [];
  let productionBatches = production ? [{
    id: 'batch-ui-1',
    code: 'B-UI-001',
    seedType: 'Olivier',
    productId: 'olive-1',
    product: { id: 'olive-1', nameAr: 'زيتون شملالي', nameFr: 'Olivier Chemlali', sku: 'OLV-001' },
    sowingDate: '2026-11-01T00:00:00.000Z',
    quantitySown: 10,
    quantityLost: 0,
    stage: 'SOWING',
    expectedReadyDate: '2026-12-01T00:00:00.000Z',
    readyAt: null,
    createdById: 'ui-test-user',
    proposalStatus: 'NONE',
    readyQuantity: null,
    careLogs: [],
    lossReports: [],
    tasks: [],
  }] : [];
  let productionTasks = production && role === 'NURSERY_WORKER' ? [{
    id: 'production-task-ui-1',
    title: 'Water olive seedlings',
    type: 'WATERING',
    status: 'OPEN',
    dueAt: null,
    workerNote: null,
    assignedToId: 'ui-test-user',
    assignedTo: { id: 'ui-test-user', name: 'UI Test Admin' },
    createdBy: { id: 'admin-user', name: 'UI Administrator' },
    batchId: 'batch-ui-1',
    batch: { id: 'batch-ui-1', code: 'B-UI-001', product: { id: 'olive-1', nameAr: 'زيتون شملالي', nameFr: 'Olivier Chemlali' } },
  }] : [];
  const productionWorkers = [{ id: 'worker-ui-1', name: 'Worker One' }];
  let lastProductionTaskInput = null;
  let lastProductionCareInput = null;
  let lastProductionLossInput = null;
  let lastReceiptInput = null;
  let lastStockCountInput = null;
  let lastPurchaseOrderInput = null;
  let lastCustomerPaymentInput = null;
  let sales = pos ? [{
    id: 'sale-1',
    code: 'V-UI-001',
    customer: 'عميل تجريبي',
    payment: 'PAID',
    date: '2026-11-05',
    createdAt: '2026-11-05T10:00:00.000Z',
    total: 12,
    paidAmount: 12,
    balance: 0,
    returnedAmount: 0,
    approvalStatus: 'APPROVED',
    lines: [{ id: 'sale-line-1', productId: 'olive-1', productName: 'زيتون شملالي', quantity: 1, unitPrice: 12 }],
    returns: [],
  }] : [];
  let salesReturns = pos && ['ADMIN', 'STOREKEEPER'].includes(role) ? [{
    id: 'return-1',
    code: 'R-UI-001',
    saleCode: 'V-UI-001',
    status: role === 'ADMIN' ? 'PENDING' : 'APPROVED',
    reason: 'تجربة استرجاع',
    lines: [{ id: 'return-line-1', productName: 'زيتون شملالي', quantity: 1, restockedQuantity: 0 }],
  }] : [];
  let cashSessions = pos ? [{
    id: 'cash-session-1',
    userId: 'ui-test-user',
    user: { id: 'ui-test-user', name: 'UI Test Admin' },
    openingFloat: 20,
    expectedCash: 32,
    closingCash: null,
    variance: null,
    openedAt: '2026-11-05T09:00:00.000Z',
    closedAt: null,
  }] : [];
  if (accounting) cashSessions.push({
    id: 'cash-session-closed-ui',
    userId: 'seller-ui',
    user: { id: 'seller-ui', name: 'UI Seller' },
    openingFloat: 20,
    expectedCash: 32,
    closingCash: 35,
    variance: 3,
    openedAt: '2026-11-04T09:00:00.000Z',
    closedAt: '2026-11-04T17:00:00.000Z',
    reviewedBy: role === 'ADMIN' ? { id: 'accountant-ui', name: 'UI Accountant' } : null,
    reviewedAt: role === 'ADMIN' ? '2026-11-05T09:00:00.000Z' : null,
    varianceApprovedBy: null,
    varianceApprovedAt: null,
  });
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace(/^\/api/, '');
    const method = route.request().method();
    if (pathname === '/auth/login') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Set-Cookie': 'mashtal_session=ui-test-session; HttpOnly; Path=/api; SameSite=Strict' },
        body: JSON.stringify({
          user: { id: 'ui-test-user', name: 'UI Test Admin', email: 'ui@example.test', role },
        }),
      });
      return;
    }
    if (pathname === '/auth/logout') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
      return;
    }
    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'ui-test-user', name: 'UI Test Admin', email: 'ui@example.test', role, active: true }),
      });
      return;
    }
    if (pathname === '/expenses') {
      if (method === 'POST') {
        const input = route.request().postDataJSON();
        const expense = {
          id: 'expense-created-ui',
          ...input,
          paid: 0,
          balance: Number(input.amount),
          amount: Number(input.amount),
          status: 'PENDING_APPROVAL',
          requestedBy: { id: 'ui-test-user', name: 'UI Test Admin' },
          payments: [],
        };
        expenses = [expense, ...expenses];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(expense) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(expenses) });
      return;
    }
    const expenseActionMatch = pathname.match(/^\/expenses\/([^/]+)\/(approve|reject|payments)$/);
    if (expenseActionMatch && method === 'POST' && expenseActionMatch[2] === 'payments') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'expense-payment-ui', amount: route.request().postDataJSON().amount }) });
      return;
    }
    if (expenseActionMatch && method === 'PATCH') {
      expenses = expenses.map((item) => item.id === expenseActionMatch[1]
        ? { ...item, status: expenseActionMatch[2] === 'approve' ? 'APPROVED' : 'REJECTED' }
        : item);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(expenses.find((item) => item.id === expenseActionMatch[1])) });
      return;
    }
    if (pathname === '/vat-rates') {
      if (method === 'POST') {
        const rate = { id: 'vat-rate-ui', ...route.request().postDataJSON(), createdBy: { id: 'ui-test-user', name: 'UI Test Admin' } };
        vatRates = [rate, ...vatRates];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(rate) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ applicationEnabled: false, rates: vatRates }) });
      return;
    }
    const vatRateUpdateMatch = pathname.match(/^\/vat-rates\/([^/]+)$/);
    if (vatRateUpdateMatch && method === 'PATCH') {
      vatRates = vatRates.map((rate) => rate.id === vatRateUpdateMatch[1] ? { ...rate, ...route.request().postDataJSON() } : rate);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(vatRates[0]) });
      return;
    }
    if (pathname === '/production/workers') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(productionWorkers) });
      return;
    }
    if (pathname === '/production/tasks') {
      if (method === 'POST') {
        lastProductionTaskInput = route.request().postDataJSON();
        const worker = productionWorkers.find((item) => item.id === lastProductionTaskInput.assignedToId) || { id: lastProductionTaskInput.assignedToId, name: 'Assigned Worker' };
        const batch = productionBatches.find((item) => item.id === lastProductionTaskInput.batchId);
        const task = {
          id: 'production-task-created-ui',
          ...lastProductionTaskInput,
          status: 'OPEN',
          assignedTo: worker,
          createdBy: { id: 'ui-test-user', name: 'UI Test Admin' },
          batch: batch ? { id: batch.id, code: batch.code, product: batch.product } : null,
        };
        productionTasks = [task, ...productionTasks];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(task) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(productionTasks) });
      return;
    }
    const productionTaskStatusMatch = pathname.match(/^\/production\/tasks\/([^/]+)\/status$/);
    if (productionTaskStatusMatch && method === 'PATCH') {
      const input = route.request().postDataJSON();
      productionTasks = productionTasks.map((task) => task.id === productionTaskStatusMatch[1]
        ? { ...task, ...input }
        : task);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(productionTasks.find((task) => task.id === productionTaskStatusMatch[1])) });
      return;
    }
    if (pathname === '/production/batches') {
      if (method === 'POST') {
        const input = route.request().postDataJSON();
        const batch = {
          id: 'batch-created-ui',
          ...input,
          stage: 'SOWING',
          quantityLost: 0,
          expectedReadyDate: input.expectedReadyDate,
          sowingDate: input.sowingDate,
          product: products.find((item) => item.id === input.productId),
          careLogs: [],
          lossReports: [],
          tasks: [],
        };
        productionBatches = [batch, ...productionBatches];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(batch) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(productionBatches) });
      return;
    }
    const productionStageMatch = pathname.match(/^\/production\/batches\/([^/]+)\/stage$/);
    if (productionStageMatch && method === 'PATCH') {
      const input = route.request().postDataJSON();
      productionBatches = productionBatches.map((batch) => batch.id === productionStageMatch[1] ? { ...batch, stage: input.stage } : batch);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(productionBatches.find((batch) => batch.id === productionStageMatch[1])) });
      return;
    }
    const productionCareMatch = pathname.match(/^\/production\/batches\/([^/]+)\/care-logs$/);
    if (productionCareMatch && method === 'POST') {
      lastProductionCareInput = route.request().postDataJSON();
      const careLog = { id: `care-log-${productionBatches[0].careLogs.length + 1}`, ...lastProductionCareInput, recordedById: 'ui-test-user' };
      productionBatches = productionBatches.map((batch) => batch.id === productionCareMatch[1] ? { ...batch, careLogs: [careLog, ...batch.careLogs] } : batch);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(careLog) });
      return;
    }
    const productionLossMatch = pathname.match(/^\/production\/batches\/([^/]+)\/losses$/);
    if (productionLossMatch && method === 'POST') {
      lastProductionLossInput = route.request().postDataJSON();
      const lossReport = { id: `loss-${productionBatches[0].lossReports.length + 1}`, ...lastProductionLossInput, reportedById: 'ui-test-user' };
      productionBatches = productionBatches.map((batch) => batch.id === productionLossMatch[1]
        ? { ...batch, quantityLost: batch.quantityLost + lastProductionLossInput.quantity, lossReports: [lossReport, ...batch.lossReports] }
        : batch);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(lossReport) });
      return;
    }
    const productionProposalMatch = pathname.match(/^\/production\/batches\/([^/]+)\/ready-proposal$/);
    if (productionProposalMatch && method === 'POST') {
      const input = route.request().postDataJSON();
      productionBatches = productionBatches.map((batch) => batch.id === productionProposalMatch[1]
        ? { ...batch, proposalStatus: 'PENDING', readyQuantity: input.quantity }
        : batch);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(productionBatches.find((batch) => batch.id === productionProposalMatch[1])) });
      return;
    }
    if (pathname === '/suppliers') {
      if (method === 'POST') {
        const supplier = { id: 'supplier-new', ...route.request().postDataJSON(), active: true };
        suppliers = [...suppliers, supplier];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(supplier) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(suppliers) });
      return;
    }
    const supplierMatch = pathname.match(/^\/suppliers\/([^/]+)$/);
    if (supplierMatch) {
      const [, id] = supplierMatch;
      if (method === 'PATCH') {
        const updated = { id, ...route.request().postDataJSON(), active: true };
        suppliers = suppliers.map((item) => item.id === id ? updated : item);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) });
        return;
      }
      suppliers = suppliers.filter((item) => item.id !== id);
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
      return;
    }
    if (pathname === '/supplier-quotes') {
      if (method === 'POST') {
        const input = route.request().postDataJSON();
        const quote = {
          id: 'supplier-quote-ui',
          supplierId: input.supplierId,
          supplier: suppliers.find((item) => item.id === input.supplierId),
          reference: input.reference,
          quoteDate: `${input.quoteDate}T00:00:00.000Z`,
          validUntil: input.validUntil ? `${input.validUntil}T00:00:00.000Z` : null,
          lines: input.lines.map((line) => ({
            id: `quote-line-${line.productId}`,
            ...line,
            unitPrice: String(line.unitPrice),
            product: products.find((item) => item.id === line.productId),
          })),
        };
        supplierQuotes = [quote, ...supplierQuotes];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(quote) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(supplierQuotes) });
      return;
    }
    if (pathname === '/supplier-invoices') {
      if (method === 'POST') {
        const input = route.request().postDataJSON();
        const invoice = {
          id: 'supplier-invoice-ui',
          ...input,
          status: 'RECORDED',
          supplier: suppliers.find((item) => item.id === input.supplierId),
          purchaseOrder: orders.find((item) => item.id === input.purchaseOrderId) || null,
          createdAt: '2026-11-05T10:00:00.000Z',
        };
        supplierInvoices = [invoice, ...supplierInvoices];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(invoice) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(supplierInvoices) });
      return;
    }
    const invoiceReviewMatch = pathname.match(/^\/supplier-invoices\/([^/]+)\/review$/);
    if (invoiceReviewMatch && method === 'PATCH') {
      supplierInvoices = supplierInvoices.map((item) => item.id === invoiceReviewMatch[1] ? { ...item, status: 'REVIEWED' } : item);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(supplierInvoices[0]) });
      return;
    }
    if (pathname === '/supplier-returns') {
      if (method === 'POST') {
        const input = route.request().postDataJSON();
        const supplierReturn = {
          id: 'supplier-return-ui',
          ...input,
          status: 'PENDING_APPROVAL',
          supplier: suppliers.find((item) => item.id === input.supplierId),
          purchaseOrder: orders.find((item) => item.id === input.purchaseOrderId) || null,
          lines: input.lines.map((line) => ({
            id: `supplier-return-line-${line.productId}`,
            ...line,
            product: products.find((item) => item.id === line.productId),
          })),
        };
        supplierReturns = [supplierReturn, ...supplierReturns];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(supplierReturn) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(supplierReturns) });
      return;
    }
    const supplierReturnReviewMatch = pathname.match(/^\/supplier-returns\/([^/]+)\/(approve|reject)$/);
    if (supplierReturnReviewMatch && method === 'PATCH') {
      const status = supplierReturnReviewMatch[2] === 'approve' ? 'APPROVED' : 'REJECTED';
      supplierReturns = supplierReturns.map((item) => item.id === supplierReturnReviewMatch[1] ? { ...item, status } : item);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(supplierReturns[0]) });
      return;
    }
    if (pathname === '/reports') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
          summary: { salesTotal: 0, salesCount: 0, inventoryValue: 0, creditOutstanding: 0 },
          inventory: [],
          salesByDay: [],
          salesByCustomer: [],
          salesByProduct: [],
          losses: [],
          lossesByReason: [],
        }),
      });
      return;
    }
    if (stock && pathname === '/purchase-orders' && method === 'POST') {
      const input = route.request().postDataJSON();
      lastPurchaseOrderInput = input;
      const order = {
        id: 'po-created-ui',
        code: 'PO-UI-001',
        status: 'PENDING_APPROVAL',
        supplierId: input.supplierId,
        createdAt: '2026-11-05T12:00:00.000Z',
        supplier: suppliers.find((item) => item.id === input.supplierId),
        lines: input.lines.map((line) => ({
          id: 'po-line-created-ui',
          ...line,
          unitPrice: supplierQuotes.flatMap((quote) => quote.lines).find((quoteLine) => quoteLine.id === line.supplierQuoteLineId)?.unitPrice
            || products.find((product) => product.id === line.productId)?.purchasePrice,
          product: products.find((product) => product.id === line.productId),
        })),
        receipts: [],
      };
      orders = [order, ...orders];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(order) });
      return;
    }
    if (stock && pathname === '/purchase-orders') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(orders) });
      return;
    }
    if (stock && pathname.match(/^\/purchase-orders\/[^/]+\/receipts$/) && method === 'POST') {
      const input = route.request().postDataJSON();
      lastReceiptInput = input;
      const receipt = {
        id: 'receipt-stock-1',
        code: 'PR-STOCK-1',
        receivedAt: '2026-11-05T10:00:00.000Z',
        lines: input.lines.map((line) => ({
          id: 'receipt-line-stock-1',
          purchaseOrderLineId: line.orderLineId,
          receivedQuantity: line.receivedQuantity,
          damagedQuantity: line.damagedQuantity,
        })),
      };
      orders = orders.map((order) => ({
        ...order,
        status: 'PARTIALLY_RECEIVED',
        receipts: [receipt, ...order.receipts],
      }));
      movements = [
        ...input.lines.flatMap((line) => [
          { id: 'purchase-in-ui', productId: 'olive-1', type: 'PURCHASE_IN', quantity: line.receivedQuantity, reason: 'Receipt', reference: receipt.code, toLocation: 'مشتل 1', date: '2026-11-05', createdAt: receipt.receivedAt },
          ...(line.damagedQuantity > 0 ? [{ id: 'damage-ui', productId: 'olive-1', type: 'LOSS_OUT', quantity: line.damagedQuantity, reason: 'Damaged', reference: receipt.code, fromLocation: 'مشتل 1', date: '2026-11-05', createdAt: receipt.receivedAt }] : []),
        ]),
        ...movements,
      ];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...receipt, purchaseOrderStatus: 'PARTIALLY_RECEIVED' }) });
      return;
    }
    if (stock && pathname === '/stock-counts') {
      if (method === 'POST') {
        const input = route.request().postDataJSON();
        lastStockCountInput = input;
        const count = {
          id: 'stock-count-ui-1',
          ...input,
          systemQuantity: 11,
          countedQuantity: input.countedQuantity,
          createdAt: '2026-11-05T11:00:00.000Z',
          product: { id: 'olive-1', sku: 'OLV-001', nameAr: 'زيتون شملالي', nameFr: 'Olivier Chemlali' },
          recordedBy: { id: 'ui-test-user', name: 'UI Test Admin' },
          adjustmentRequest: null,
        };
        stockCounts = [count, ...stockCounts];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(count) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stockCounts) });
      return;
    }
    if ((pos || stock || production) && pathname === '/products') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(products) });
      return;
    }
    if ((pos || stock) && pathname === '/movements') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(movements),
      });
      return;
    }
    if (pos && pathname === '/customers') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'customer-1', name: 'عميل تجريبي', type: 'INDIVIDUAL', credit: accounting ? 40 : 0, openingCredit: 0, payments: [] }]),
      });
      return;
    }
    if (/^\/customers\/[^/]+\/payments$/.test(pathname) && method === 'POST') {
      lastCustomerPaymentInput = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'customer-payment-ui', ...lastCustomerPaymentInput }) });
      return;
    }
    if (pos && pathname === '/sales') {
      if (method === 'POST') {
        const input = route.request().postDataJSON();
        const sale = {
          id: 'sale-credit-1',
          code: 'V-UI-002',
          customer: 'عميل تجريبي',
          payment: input.payment,
          date: '2026-11-05',
          createdAt: '2026-11-05T11:00:00.000Z',
          total: 12,
          paidAmount: 0,
          balance: 12,
          returnedAmount: 0,
          approvalStatus: 'PENDING',
          lines: [{ id: 'sale-line-credit-1', productId: 'olive-1', productName: 'زيتون شملالي', quantity: 1, unitPrice: 12 }],
          returns: [],
        };
        sales = [sale, ...sales];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(sale) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sales) });
      return;
    }
    if (pathname === '/cash-sessions') {
      if (method === 'POST' && pos) {
        const input = route.request().postDataJSON();
        const session = {
          id: 'cash-session-new',
          userId: 'ui-test-user',
          user: { id: 'ui-test-user', name: 'UI Test Admin' },
          openingFloat: input.openingFloat,
          expectedCash: input.openingFloat,
          openedAt: '2026-11-05T12:00:00.000Z',
          closedAt: null,
        };
        cashSessions = [session, ...cashSessions.filter((item) => item.closedAt)];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(session) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cashSessions) });
      return;
    }
    const cashSessionActionMatch = pathname.match(/^\/cash-sessions\/([^/]+)\/(close|review|approve-variance)$/);
    if (cashSessionActionMatch && method === 'PATCH') {
      const [, sessionId, action] = cashSessionActionMatch;
      const input = route.request().postDataJSON();
      cashSessions = cashSessions.map((session) => {
        if (session.id !== sessionId) return session;
        if (action === 'close') {
          return {
            ...session,
            closedAt: '2026-11-05T12:30:00.000Z',
            closingCash: input.closingCash,
            variance: Number(input.closingCash) - Number(session.expectedCash),
          };
        }
        if (action === 'review') {
          return { ...session, reviewedBy: { id: 'accountant-ui', name: 'UI Accountant' }, reviewedAt: '2026-11-05T13:00:00.000Z' };
        }
        return { ...session, varianceApprovedBy: { id: 'ui-test-user', name: 'UI Test Admin' }, varianceApprovedAt: '2026-11-05T14:00:00.000Z' };
      });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cashSessions.find((session) => session.id === sessionId)) });
      return;
    }
    if (pos && pathname === '/sales/returns') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(salesReturns) });
      return;
    }
    if (pos && pathname === '/sales/returns/return-1/approve' && method === 'PATCH') {
      salesReturns = salesReturns.map((item) => item.id === 'return-1' ? { ...item, status: 'APPROVED' } : item);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(salesReturns[0]) });
      return;
    }
    if (pos && /^\/sales\/[^/]+\/returns$/.test(pathname) && method === 'POST') {
      const item = {
        id: 'return-new',
        code: 'R-UI-002',
        saleCode: 'V-UI-001',
        status: 'PENDING',
        reason: route.request().postDataJSON().reason,
        lines: [{ id: 'return-line-new', productName: 'زيتون شملالي', quantity: 1, restockedQuantity: 0 }],
      };
      salesReturns = [item, ...salesReturns];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(item) });
      return;
    }
    if (pos && pathname === '/sales/returns/return-1/verify' && method === 'PATCH') {
      salesReturns = salesReturns.map((item) => item.id === 'return-1' ? { ...item, status: 'COMPLETED' } : item);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(salesReturns[0]) });
      return;
    }
    if (pathname === '/categories') {
      if (method === 'POST') {
        const input = route.request().postDataJSON();
        const category = { id: 'test-category', ...input };
        categories = [...categories, category];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(category) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) });
      return;
    }
    const categoryMatch = pathname.match(/^\/categories\/([^/]+)$/);
    if (categoryMatch) {
      const [, id] = categoryMatch;
      if (method === 'PATCH') {
        const updated = { id, ...route.request().postDataJSON() };
        categories = categories.map((item) => item.id === id ? updated : item);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) });
        return;
      }
      categories = categories.filter((item) => item.id !== id);
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  return {
    getReceiptInput: () => lastReceiptInput,
    getStockCountInput: () => lastStockCountInput,
    getPurchaseOrderInput: () => lastPurchaseOrderInput,
    getCustomerPaymentInput: () => lastCustomerPaymentInput,
    getProductionTaskInput: () => lastProductionTaskInput,
    getProductionCareInput: () => lastProductionCareInput,
    getProductionLossInput: () => lastProductionLossInput,
  };
}

test('admin can navigate all application sections and log out', async ({ page }) => {
  await mockApplicationApi(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('ui@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();

  const sections = [
    ['المنتجات', 'المنتجات'],
    ['حركة المخزون', 'حركة المخزون'],
    ['الإنتاج', 'الإنتاج'],
    ['الموردون والشراء', 'الموردون والشراء'],
    ['العملاء والمبيعات', 'العملاء والمبيعات'],
    ['التنبيهات', 'تنبيهات تحتاج إلى متابعة'],
    ['المحاسبة', 'المحاسبة'],
    ['التقارير', 'التقارير'],
    ['المستخدمون والصلاحيات', 'المستخدمون والصلاحيات'],
    ['سجل التدقيق', 'سجل التدقيق'],
  ];
  for (const [navigationLabel, pageTitle] of sections) {
    await page.locator('aside').getByRole('button', { name: navigationLabel, exact: true }).click();
    await expect(page.locator('main')).toContainText(pageTitle);
  }

  await page.getByRole('button', { name: 'تسجيل الخروج' }).click();
  await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();
});

test('dashboard charts load and render after login', async ({ page }) => {
  await mockApplicationApi(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('ui@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();

  await expect(page.getByRole('heading', { name: 'حركة المخزون', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'قيمة المخزون حسب الفئة', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'المبيعات الشهرية', exact: true })).toBeVisible();
});

test('non-admin users do not see user administration navigation', async ({ page }) => {
  await mockApplicationApi(page, 'SELLER');
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('seller@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();

  await expect(page.getByRole('button', { name: 'المنتجات', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'المستخدمون والصلاحيات', exact: true })).toHaveCount(0);
});

test('stockkeeper records a partial receipt, damaged units, and a physical count', async ({ page }) => {
  const api = await mockApplicationApi(page, 'STOREKEEPER', { stock: true });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('stockkeeper@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();

  await page.locator('aside').getByRole('button', { name: 'الموردون والشراء', exact: true }).click();
  await page.getByRole('button', { name: 'استلام', exact: true }).first().click();
  await page.getByLabel('الكمية المستلمة').fill('2');
  await page.getByLabel('الكمية التالفة').fill('1');
  await page.getByRole('button', { name: 'استلام', exact: true }).last().click();
  await expect.poll(() => api.getReceiptInput()).not.toBeNull();
  await expect(page.locator('main')).toContainText('مستلم جزئياً');
  expect(api.getReceiptInput()).toEqual({
    lines: [{ orderLineId: 'po-line-1', receivedQuantity: 2, damagedQuantity: 1 }],
    note: '',
  });

  await page.locator('aside').getByRole('button', { name: 'حركة المخزون', exact: true }).click();
  await page.getByRole('button', { name: 'جرد فعلي', exact: true }).click();
  await page.getByLabel('المنتج').selectOption('olive-1');
  await page.getByLabel('الكمية الفعلية').fill('11');
  await page.getByLabel('السبب').fill('مطابقة بعد الاستلام');
  await page.getByRole('button', { name: 'جرد فعلي', exact: true }).last().click();
  await expect(page.locator('main')).toContainText('سجل الجرد');
  await expect(page.locator('main')).toContainText('مطابقة بعد الاستلام');
  expect(api.getStockCountInput()).toEqual({
    productId: 'olive-1',
    countedQuantity: 11,
    reason: 'مطابقة بعد الاستلام',
    location: 'مشتل 1',
  });
});

const roleNavigation = [
  { role: 'STOREKEEPER', visible: ['حركة المخزون', 'الإنتاج', 'الموردون والشراء', 'طلبات الإرجاع'], hidden: ['العملاء والمبيعات', 'المحاسبة', 'التقارير', 'المستخدمون والصلاحيات', 'سجل التدقيق'] },
  { role: 'SELLER', visible: ['المنتجات', 'العملاء والمبيعات', 'طلبات الإرجاع'], hidden: ['حركة المخزون', 'الموردون والشراء', 'المحاسبة', 'التقارير', 'المستخدمون والصلاحيات', 'سجل التدقيق'] },
  { role: 'PURCHASING', visible: ['المنتجات', 'الموردون والشراء', 'التنبيهات'], hidden: ['حركة المخزون', 'الإنتاج', 'العملاء والمبيعات', 'طلبات الإرجاع', 'المحاسبة', 'التقارير', 'المستخدمون والصلاحيات', 'سجل التدقيق'] },
  { role: 'NURSERY_WORKER', visible: ['المنتجات', 'الإنتاج'], hidden: ['حركة المخزون', 'الموردون والشراء', 'العملاء والمبيعات', 'طلبات الإرجاع', 'المحاسبة', 'التقارير', 'المستخدمون والصلاحيات', 'سجل التدقيق'] },
  { role: 'ACCOUNTANT', visible: ['حركة المخزون', 'الإنتاج', 'الموردون والشراء', 'العملاء والمبيعات', 'المحاسبة', 'التقارير'], hidden: ['طلبات الإرجاع', 'التنبيهات', 'المستخدمون والصلاحيات', 'سجل التدقيق'] },
  { role: 'VIEWER', visible: ['المنتجات', 'حركة المخزون'], hidden: ['الإنتاج', 'الموردون والشراء', 'العملاء والمبيعات', 'طلبات الإرجاع', 'المحاسبة', 'التقارير', 'المستخدمون والصلاحيات', 'سجل التدقيق'] },
];

for (const { role, visible, hidden } of roleNavigation) {
  test(`${role} sees only its permitted navigation`, async ({ page }) => {
    await mockApplicationApi(page, role);
    await page.goto('/');
    await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill(`${role.toLowerCase()}@example.test`);
    await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
    await page.getByRole('button', { name: 'دخول إلى النظام' }).click();

    const navigation = page.locator('aside');
    for (const label of visible) {
      await expect(navigation.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    for (const label of hidden) {
      await expect(navigation.getByRole('button', { name: label, exact: true })).toHaveCount(0);
    }
    if (role === 'SELLER') {
      await navigation.getByRole('button', { name: 'المنتجات', exact: true }).click();
      await expect(page.getByRole('button', { name: 'إدارة الفئات' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'إضافة منتج' })).toHaveCount(0);
    }
    if (role === 'STOREKEEPER') {
      await navigation.getByRole('button', { name: 'حركة المخزون', exact: true }).click();
      await expect(page.getByRole('button', { name: 'جرد فعلي' })).toBeVisible();
    }
    if (role === 'NURSERY_WORKER') {
      await navigation.getByRole('button', { name: 'الإنتاج', exact: true }).click();
      await expect(page.getByRole('button', { name: 'دفعة إنتاج' })).toBeVisible();
    }
  });
}

test('accountant records expenses and reviews closed cash sessions', async ({ page }) => {
  const api = await mockApplicationApi(page, 'ACCOUNTANT', { pos: true, accounting: true });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('accountant@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();
  await page.locator('aside').getByRole('button', { name: 'المحاسبة', exact: true }).click();

  await page.getByRole('button', { name: 'تسجيل مصروف' }).click();
  const form = page.locator('.fixed.inset-0');
  await form.getByRole('textbox', { name: 'فئة المصروف' }).fill('Utilities');
  await form.getByRole('textbox', { name: 'وصف المصروف' }).fill('Water bill');
  await form.getByRole('spinbutton', { name: 'المبلغ' }).fill('75');
  await form.getByRole('button', { name: 'تسجيل مصروف' }).click();
  await expect(page.locator('main')).toContainText('Water bill');
  await expect(page.getByRole('button', { name: 'اعتماد المصروف' })).toHaveCount(0);

  await page.getByRole('button', { name: 'مراجعة الجلسة' }).click();
  await expect(page.getByText('UI Accountant').last()).toBeVisible();
  await expect(page.getByRole('button', { name: 'إضافة نسبة أداء' })).toHaveCount(0);

  await page.locator('aside').getByRole('button', { name: 'العملاء والمبيعات', exact: true }).click();
  await page.getByRole('button', { name: 'تسجيل دفعة' }).click();
  const paymentForm = page.locator('.fixed.inset-0');
  await paymentForm.getByRole('combobox').nth(0).selectOption('BANK_TRANSFER');
  await paymentForm.getByRole('textbox', { name: 'مرجع التحويل أو الشيك' }).fill('BANK-UI-REF');
  await paymentForm.getByRole('spinbutton', { name: 'مبلغ الدفعة' }).fill('5');
  await paymentForm.getByRole('button', { name: 'تأكيد استلام الدفعة' }).click();
  await expect.poll(() => api.getCustomerPaymentInput()).toMatchObject({
    amount: 5,
    method: 'BANK_TRANSFER',
    reference: 'BANK-UI-REF',
  });
  expect(api.getCustomerPaymentInput()).not.toHaveProperty('cashSessionId');
});

test('manager approves expenses and variances and configures inactive VAT rates', async ({ page }) => {
  await mockApplicationApi(page, 'ADMIN', { pos: true, accounting: true });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('admin@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();
  await page.locator('aside').getByRole('button', { name: 'المحاسبة', exact: true }).click();

  await expect(page.locator('main')).toContainText('Water and electricity');
  await page.getByRole('button', { name: 'اعتماد المصروف' }).click();
  await expect(page.locator('main')).toContainText('تمت الموافقة');
  await expect(page.getByRole('button', { name: 'اعتماد الفرق' })).toBeVisible();
  await page.getByRole('button', { name: 'اعتماد الفرق' }).click();
  await expect(page.getByRole('button', { name: 'اعتماد الفرق' })).toHaveCount(0);

  await page.getByRole('button', { name: 'إضافة نسبة أداء' }).click();
  const vatForm = page.locator('.fixed.inset-0');
  await vatForm.getByRole('textbox', { name: 'اسم الأداء' }).fill('Standard');
  await vatForm.getByRole('spinbutton', { name: 'النسبة %' }).fill('19');
  await vatForm.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.locator('main')).toContainText('Standard · 19%');
  await expect(page.locator('main')).toContainText('إعداد فقط؛ لن تُحتسب الضريبة');
});

test('admin can assign a production task to a worker and batch', async ({ page }) => {
  const api = await mockApplicationApi(page, 'ADMIN', { production: true });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('admin@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();
  await page.locator('aside').getByRole('button', { name: 'الإنتاج', exact: true }).click();

  await page.getByRole('button', { name: 'إسناد مهمة' }).first().click();
  await page.getByLabel('عنوان المهمة').fill('Inspect olive seedlings');
  await page.getByLabel('نوع المهمة').selectOption('INSPECTION');
  await page.getByLabel('العامل المكلف').selectOption('worker-ui-1');
  await page.getByLabel('دفعة مرتبطة (اختياري)').selectOption('batch-ui-1');
  await page.getByLabel('تاريخ الاستحقاق (اختياري)').fill('2026-11-06');
  await page.getByRole('button', { name: 'إسناد مهمة' }).last().click();

  await expect.poll(() => api.getProductionTaskInput()).toMatchObject({
    title: 'Inspect olive seedlings',
    type: 'INSPECTION',
    assignedToId: 'worker-ui-1',
    batchId: 'batch-ui-1',
  });
  await expect(page.locator('main')).toContainText('Inspect olive seedlings');
});

test('nursery worker tracks tasks, care, losses, growth, and ready proposals', async ({ page }) => {
  const api = await mockApplicationApi(page, 'NURSERY_WORKER', { production: true });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('worker@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();
  await page.locator('aside').getByRole('button', { name: 'الإنتاج', exact: true }).click();

  await page.getByRole('button', { name: 'بدء المهمة' }).click();
  await page.getByLabel('ملاحظة العامل (اختياري)').fill('Starting care rounds');
  await page.getByRole('button', { name: 'بدء المهمة' }).last().click();
  await expect(page.locator('main')).toContainText('قيد التنفيذ');
  await page.getByRole('button', { name: 'إنهاء المهمة' }).click();
  await page.getByLabel('ملاحظة العامل (اختياري)').fill('Watering completed');
  await page.getByRole('button', { name: 'إنهاء المهمة' }).last().click();
  await expect(page.locator('main')).toContainText('مكتملة');

  await page.getByRole('button', { name: 'تسجيل عناية' }).click();
  await page.getByLabel('نوع المهمة').selectOption('TREATMENT');
  await page.getByLabel('ملاحظة العامل (اختياري)').fill('Applied approved treatment');
  await page.getByRole('button', { name: 'تسجيل عناية' }).last().click();
  await expect.poll(() => api.getProductionCareInput()).toMatchObject({ type: 'TREATMENT', note: 'Applied approved treatment' });

  await page.getByRole('button', { name: 'تسجيل فاقد' }).click();
  await page.getByLabel('الكمية').fill('2');
  await page.getByLabel('سبب الفاقد').fill('Two seedlings dried out');
  await page.getByRole('button', { name: 'تسجيل فاقد' }).last().click();
  await expect.poll(() => api.getProductionLossInput()).toMatchObject({ quantity: 2, reason: 'Two seedlings dried out' });
  await expect(page.locator('main')).toContainText('2 فاقد');

  await page.getByRole('button', { name: 'تقدم إلى المرحلة التالية' }).click();
  await page.getByRole('button', { name: 'تقدم إلى المرحلة التالية' }).click();
  await page.getByRole('button', { name: 'اقتراح جاهزية' }).click();
  await page.getByLabel('الكمية الجاهزة المقترحة').fill('8');
  await page.getByRole('button', { name: 'اقتراح جاهزية' }).last().click();
  await expect(page.locator('main')).toContainText('بانتظار الموافقة');
});

test('seller can print a sale, request a return, and submit credit for approval', async ({ page }) => {
  await mockApplicationApi(page, 'SELLER', { pos: true });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('seller@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();
  await page.locator('aside').getByRole('button', { name: 'العملاء والمبيعات', exact: true }).click();

  await page.getByRole('button', { name: 'فاتورة', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'فاتورة' })).toBeVisible();
  await expect(page.getByText('الضريبة غير مهيأة؛ الإجمالي دون ضريبة')).toBeVisible();
  await page.getByRole('button', { name: 'إغلاق' }).click();

  await page.getByRole('button', { name: 'طلب إرجاع', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'سبب الإرجاع' }).fill('المنتج غير مناسب');
  await page.getByRole('spinbutton', { name: 'الكمية' }).fill('1');
  await page.locator('.fixed.inset-0').getByRole('button', { name: 'طلب إرجاع', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('طلب إرجاع');

  await page.locator('aside').getByRole('button', { name: 'العملاء والمبيعات', exact: true }).click();
  await page.getByRole('button', { name: 'إغلاق الصندوق' }).click();
  let cashSessionForm = page.locator('.fixed.inset-0');
  await cashSessionForm.getByRole('spinbutton', { name: 'النقد الفعلي عند الإغلاق' }).fill('32');
  await cashSessionForm.getByRole('button', { name: 'إغلاق الصندوق' }).click();
  await page.getByRole('button', { name: 'فتح الصندوق' }).click();
  cashSessionForm = page.locator('.fixed.inset-0');
  await cashSessionForm.getByRole('spinbutton', { name: 'الرصيد الافتتاحي' }).fill('25');
  await cashSessionForm.getByRole('button', { name: 'فتح الصندوق' }).click();
  await expect(page.getByText('جلسة مفتوحة').first()).toBeVisible();

  await page.getByRole('button', { name: 'عملية بيع' }).click();
  const saleForm = page.locator('.fixed.inset-0');
  await saleForm.getByRole('combobox').nth(0).selectOption('customer-1');
  await saleForm.getByRole('combobox').nth(1).selectOption('credit');
  await saleForm.getByRole('combobox').nth(2).selectOption('olive-1');
  await expect(saleForm.getByText('بانتظار اعتماد المدير')).toBeVisible();
  await saleForm.getByRole('button', { name: 'تأكيد البيع' }).click();
  await expect(page.getByRole('status')).toHaveText('بانتظار اعتماد المدير');
});

test('manager can approve a seller return', async ({ page }) => {
  await mockApplicationApi(page, 'ADMIN', { pos: true });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('admin@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();
  await page.locator('aside').getByRole('button', { name: 'طلبات الإرجاع', exact: true }).click();
  await page.getByRole('button', { name: 'موافقة', exact: true }).click();
  await expect(page.getByRole('button', { name: 'تأكيد استلام الإرجاع' })).toBeVisible();
});

test('stockkeeper can verify an approved return quantity', async ({ page }) => {
  await mockApplicationApi(page, 'STOREKEEPER', { pos: true });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('storekeeper@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();
  await page.locator('aside').getByRole('button', { name: 'طلبات الإرجاع', exact: true }).click();
  await page.getByRole('button', { name: 'تأكيد استلام الإرجاع' }).click();
  await page.getByRole('spinbutton', { name: 'الكمية الصالحة لإعادة التخزين' }).fill('1');
  await page.getByRole('button', { name: 'تأكيد استلام الإرجاع' }).last().click();
  await expect(page.getByRole('status')).toHaveText('تم التحقق من الإرجاع');
});

test('purchasing staff can manage a supplier, compare a quote, create a priced order, and track supplier documents', async ({ page }) => {
  const api = await mockApplicationApi(page, 'PURCHASING', { stock: true });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('purchasing@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();
  await page.locator('aside').getByRole('button', { name: 'الموردون والشراء', exact: true }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'تصدير تقرير المشتريات' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('purchasing-report.csv');

  await page.getByRole('button', { name: 'إضافة مورد' }).click();
  let modal = page.locator('.fixed.inset-0');
  await modal.getByRole('textbox', { name: 'المورد' }).fill('مورد النباتات');
  await modal.getByRole('textbox', { name: 'المدينة' }).fill('صفاقس');
  await modal.getByRole('textbox', { name: 'التخصص' }).fill('نباتات');
  await modal.getByRole('textbox', { name: 'الهاتف' }).fill('12345678');
  await modal.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('supplier@example.test');
  await modal.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText('مورد النباتات')).toBeVisible();

  await page.getByRole('button', { name: 'تسجيل عرض سعر' }).click();
  modal = page.locator('.fixed.inset-0');
  await modal.getByRole('combobox').nth(0).selectOption('supplier-new');
  await modal.getByRole('textbox', { name: 'مرجع العرض' }).fill('QUOTE-UI-001');
  await modal.getByRole('combobox').nth(1).selectOption('olive-1');
  await modal.getByRole('spinbutton', { name: 'سعر الشراء' }).fill('5.555');
  await modal.getByRole('button', { name: 'تسجيل عرض سعر' }).click();
  await expect(page.getByText('QUOTE-UI-001')).toBeVisible();

  await page.getByRole('button', { name: 'طلب شراء', exact: true }).click();
  modal = page.locator('.fixed.inset-0');
  await modal.getByRole('combobox').nth(0).selectOption('supplier-new');
  await modal.getByRole('combobox').nth(1).selectOption('olive-1');
  await modal.getByRole('spinbutton', { name: 'الكمية' }).fill('2');
  await modal.getByRole('combobox').nth(2).selectOption('quote-line-olive-1');
  await expect(modal.getByRole('combobox').nth(2)).toHaveValue('quote-line-olive-1');
  await modal.getByRole('button', { name: 'إنشاء الطلب' }).click();
  expect(api.getPurchaseOrderInput().lines[0].supplierQuoteLineId).toBe('quote-line-olive-1');
  await expect(page.getByRole('table').getByText('بانتظار الموافقة')).toBeVisible();

  await page.getByRole('button', { name: 'تسجيل فاتورة مورد' }).click();
  modal = page.locator('.fixed.inset-0');
  await modal.getByRole('combobox').nth(0).selectOption('supplier-new');
  await modal.getByRole('textbox', { name: 'مرجع الفاتورة' }).fill('INV-UI-001');
  await modal.getByRole('spinbutton', { name: 'مبلغ الفاتورة' }).fill('50');
  await modal.getByRole('button', { name: 'تسجيل فاتورة مورد' }).click();
  await expect(page.getByText('INV-UI-001')).toBeVisible();
  await expect(page.getByText(/إعداد فقط؛ لن تُحتسب الضريبة/)).toBeVisible();

  await page.getByRole('button', { name: 'طلب إرجاع للمورد' }).click();
  modal = page.locator('.fixed.inset-0');
  await modal.getByRole('combobox').nth(0).selectOption('supplier-new');
  await modal.getByRole('textbox', { name: 'مرجع المورد' }).fill('RMA-UI-001');
  await modal.getByRole('textbox', { name: 'سبب الإرجاع' }).fill('منتج متضرر');
  await modal.getByRole('combobox').nth(2).selectOption('olive-1');
  await modal.getByRole('spinbutton', { name: 'الكمية' }).fill('1');
  await modal.getByRole('button', { name: 'طلب إرجاع للمورد' }).click();
  await expect(page.getByText('RMA-UI-001')).toBeVisible();
});

test('admin can add, rename, assign, and remove an unused product category', async ({ page }) => {
  await mockApplicationApi(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill('ui@example.test');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('ui-test-password');
  await page.getByRole('button', { name: 'دخول إلى النظام' }).click();
  await page.locator('aside').getByRole('button', { name: 'المنتجات', exact: true }).click();

  const categoryFilter = page.getByRole('combobox', { name: 'كل الفئات' });
  await expect(categoryFilter).toContainText('أشجار مثمرة');
  await page.getByRole('button', { name: 'إدارة الفئات' }).click();
  await page.getByRole('textbox', { name: 'الاسم بالعربية' }).fill('فئة تجريبية');
  await page.getByRole('textbox', { name: 'الاسم بالفرنسية' }).fill('Catégorie temporaire');
  await page.getByRole('button', { name: 'إضافة فئة' }).click();
  await expect(page.getByRole('button', { name: 'تعديل الفئة فئة تجريبية' })).toBeVisible();

  await page.getByRole('button', { name: 'تعديل الفئة فئة تجريبية' }).click();
  await page.getByRole('textbox', { name: 'الاسم بالعربية' }).fill('فئة نباتات جديدة');
  await page.getByRole('textbox', { name: 'الاسم بالفرنسية' }).fill('Nouvelle catégorie');
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByRole('button', { name: 'تعديل الفئة فئة نباتات جديدة' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'إغلاق' }).click();

  await expect(categoryFilter).toContainText('فئة نباتات جديدة');
  await page.getByRole('button', { name: 'إضافة منتج' }).click();
  await expect(page.getByRole('combobox', { name: 'الفئة' })).toContainText('فئة نباتات جديدة');
  await page.getByRole('button', { name: 'إلغاء' }).click();

  await page.getByRole('button', { name: 'إدارة الفئات' }).click();
  await page.getByRole('button', { name: 'حذف فئة نباتات جديدة' }).click();
  await expect(page.getByRole('button', { name: 'تعديل الفئة فئة نباتات جديدة' })).toHaveCount(0);
});
