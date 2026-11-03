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

async function mockApplicationApi(page, role = 'ADMIN') {
  let categories = [{ id: 'fruit', nameAr: 'أشجار مثمرة', nameFr: 'Arbres fruitiers' }];
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
    ['التقارير', 'التقارير'],
    ['المستخدمون والصلاحيات', 'المستخدمون والصلاحيات'],
  ];
  for (const [navigationLabel, pageTitle] of sections) {
    await page.locator('aside').getByRole('button', { name: navigationLabel, exact: true }).click();
    await expect(page.locator('main')).toContainText(pageTitle);
  }

  await page.getByRole('button', { name: 'تسجيل الخروج' }).click();
  await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();
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
