// Verifies account-lockout behavior (FR-02) and security/functional bugs against a live SUT
// and logs exact observed HTTP responses + reset procedure evidence.
const fs = require('fs');
const BASE = 'http://localhost:3000';

async function req(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

async function main() {
  const evidence = { timestamp: new Date().toISOString(), checks: {} };

  // Check 1: Account Lockout threshold (server.js increments login_attempts += 2, locks at >= 3!)
  const email = 'admin@eshop.com';
  const fail1 = await req('/api/login', 'POST', { email, password: 'WrongPassword1' });
  const fail2 = await req('/api/login', 'POST', { email, password: 'WrongPassword2' });
  const attempt3Right = await req('/api/login', 'POST', { email, password: 'Admin123!' });
  evidence.checks.lockout_behavior = {
    fail1,
    fail2,
    attempt3_with_valid_password: attempt3Right,
  };

  // Check 2: Unauthenticated Product CUD (missing authenticateToken on POST/PUT/DELETE /api/products)
  const unauthCreate = await req('/api/products', 'POST', {
    name: 'Unauth Test Product',
    price: 99999,
    description: 'Created without JWT',
    imageUrl: '',
    category_id: 1,
  });
  let unauthDelete = null;
  if (unauthCreate.json?.id) {
    unauthDelete = await req(`/api/products/${unauthCreate.json.id}`, 'DELETE');
  }
  evidence.checks.unauthenticated_product_cud = { unauthCreate, unauthDelete };

  // Check 3: Broken Access Control - regular 'user' accessing /api/admin/users and /api/admin/orders
  const userLogin = await req('/api/login', 'POST', {
    email: 'test@eshop.com',
    password: 'Test1234!',
  });
  const normalUserToken = userLogin.json?.token;
  const userGetAdminUsers = await req('/api/admin/users', 'GET', null, normalUserToken);
  const userGetAdminOrders = await req('/api/admin/orders', 'GET', null, normalUserToken);
  evidence.checks.broken_admin_access_control = {
    user_role: userLogin.json?.user?.role,
    admin_users_status: userGetAdminUsers.status,
    admin_users_count: Array.isArray(userGetAdminUsers.json) ? userGetAdminUsers.json.length : 0,
    admin_orders_status: userGetAdminOrders.status,
  };

  // Check 4: DELETE /api/products/0 or nonexistent ID returns 200 OK "Product deleted" instead of 404
  const deleteMissing = await req('/api/products/999999', 'DELETE');
  const putMissing = await req('/api/products/999999', 'PUT', {
    name: 'Ghost',
    price: 1000,
    description: 'None',
    imageUrl: '',
    category_id: 1,
  });
  evidence.checks.silent_missing_id_mutation = { putMissing, deleteMissing };

  // Check 5: SQLite concurrency / locking probe (25 parallel writes to POST /api/products)
  const parallelCreates = await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      req('/api/products', 'POST', {
        name: `Burst Item ${i}`,
        price: 10000 + i,
        description: 'Concurrency check',
        imageUrl: '',
        category_id: 1,
      }),
    ),
  );
  const createdStatuses = parallelCreates.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const createdIds = parallelCreates.map((r) => r.json?.id).filter(Boolean);
  await Promise.all(createdIds.map((id) => req(`/api/products/${id}`, 'DELETE')));
  evidence.checks.parallel_write_probe = {
    total: 25,
    status_counts: createdStatuses,
    sample_errors: parallelCreates.filter((r) => r.status !== 200).slice(0, 3),
  };

  fs.writeFileSync(
    'D:\\KTPM\\HW05\\20120397\\evidence\\functional-and-lockout-verification.json',
    JSON.stringify(evidence, null, 2),
    'utf8',
  );
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
