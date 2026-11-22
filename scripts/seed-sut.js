// Seeds 9 additional admin accounts (admin1..admin9@eshop.com) and 5 sample orders
// via standard SUT REST APIs without modifying eshop-sut/backend source code.
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
  // 1. Register and promote admin1..admin9@eshop.com
  for (let i = 1; i <= 9; i++) {
    const email = `admin${i}@eshop.com`;
    const name = `Admin User ${i}`;
    await req('/api/register', 'POST', { name, email, password: 'Admin123!' });
    const login = await req('/api/login', 'POST', { email, password: 'Admin123!' });
    if (login.status === 200 && login.json?.token) {
      await req(
        '/api/users/me',
        'PUT',
        {
          name,
          shipping_address: `227 Nguyen Van Cu, Q5, TP.HCM`,
          phone: `090100000${i}`,
          role: 'admin',
        },
        login.json.token,
      );
    }
  }

  // 2. Login as Test User and create 5 sample orders so GET /api/admin/orders executes a real JOIN
  const userLogin = await req('/api/login', 'POST', {
    email: 'test@eshop.com',
    password: 'Test1234!',
  });
  if (userLogin.status === 200 && userLogin.json?.token) {
    for (let k = 1; k <= 5; k++) {
      await req(
        '/api/checkout',
        'POST',
        {
          total_amount: 4000000 * k,
          shipping_address: `So ${k * 10} Le Loi, Quan 1, TP.HCM`,
        },
        userLogin.json.token,
      );
    }
  }

  // Verify seed
  const adminLogin = await req('/api/login', 'POST', {
    email: 'admin@eshop.com',
    password: 'Admin123!',
  });
  const usersRes = await req('/api/admin/users', 'GET', null, adminLogin.json.token);
  const ordersRes = await req('/api/admin/orders', 'GET', null, adminLogin.json.token);
  console.log(
    JSON.stringify({
      seeded_users: Array.isArray(usersRes.json) ? usersRes.json.length : 0,
      seeded_orders: Array.isArray(ordersRes.json) ? ordersRes.json.length : 0,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
