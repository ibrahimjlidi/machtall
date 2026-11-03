const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'mashtal.accessToken';

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) === '1' ? 'cookie-session' : null;
}

export function saveAccessToken() {
  localStorage.setItem(TOKEN_KEY, '1');
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, { method = 'GET', body, token = getAccessToken() } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    credentials: 'same-origin',
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) {
      clearAccessToken();
      window.dispatchEvent(new Event('mashtal:auth-expired'));
    }
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return payload;
}

export async function login(email, password) {
  const session = await apiRequest('/auth/login', { method: 'POST', body: { email, password }, token: null });
  saveAccessToken();
  return session.user;
}

const movementFromApi = {
  PURCHASE_IN: 'Purchase IN',
  PRODUCTION_IN: 'Production IN',
  SALE_OUT: 'Sale OUT',
  LOSS_OUT: 'Loss OUT',
  ADJUSTMENT_IN: 'Adjustment IN',
  ADJUSTMENT_OUT: 'Adjustment OUT',
  TRANSFER: 'Transfer',
};

const roleToLabel = {
  ADMIN: 'مدير / المالك',
  STOREKEEPER: 'أمين المخزن',
  SELLER: 'بائع',
  VIEWER: 'مشاهد',
};

export function normalizeWorkspace({ products, movements, batches, orders, customers, suppliers, sales }) {
  return {
    products: products.map((product) => ({
      ...product,
      minimum: product.minimumStock ?? product.minimum,
      image: product.imageUrl ?? product.image ?? '',
    })),
    movements: movements.map((movement) => ({
      ...movement,
      type: movementFromApi[movement.type] || movement.type,
    })),
    batches: batches.map((batch) => ({
      ...batch,
      id: batch.id,
      seed: batch.seedType,
      sowing: batch.sowingDate.slice(0, 10),
      sown: batch.quantitySown,
      loss: batch.quantityLost,
      stage: batch.stage.toLowerCase(),
      readyDate: batch.expectedReadyDate.slice(0, 10),
      code: batch.code,
    })),
    orders: orders.map((order) => ({
      id: order.id,
      code: order.code,
      supplier: order.supplier.name,
      date: order.createdAt.slice(0, 10),
      lines: order.lines.length,
      total: order.lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0),
      status: order.status[0] + order.status.slice(1).toLowerCase(),
      linesData: order.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    })),
    customers: customers.map((customer) => ({
      ...customer,
      type: customer.type === 'INDIVIDUAL' ? 'فرد' : customer.type === 'LANDSCAPER' ? 'بستاني' : 'بلدية',
    })),
    suppliers,
    sales: sales.map((sale) => ({
      ...sale,
      recordId: sale.id,
      id: sale.code,
      payment: sale.payment.toLowerCase(),
    })),
    roleLabel: roleToLabel,
  };
}
