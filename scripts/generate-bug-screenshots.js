const fs = require('fs');
const path = require('path');
const pw = require('D:/KTPM/week 3.1/calculator-test/node_modules/playwright');

const ROOT = 'D:\\KTPM\\HW05\\20120397';
const EVIDENCE = path.join(ROOT, 'evidence');
const VERIFY_JSON = path.join(EVIDENCE, 'functional-and-lockout-verification.json');
const SERVER_JS = 'D:\\KTPM\\eshop-sut\\backend\\server.js';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getLines(lines, start1, end1, highlightLines = []) {
  const hi = new Set(highlightLines);
  const out = [];
  for (let ln = start1; ln <= end1; ln++) {
    const code = esc(lines[ln - 1] ?? '');
    const cls = hi.has(ln) ? 'line hi' : 'line';
    out.push(`<div class="${cls}"><span class="ln">${ln}</span><span class="src">${code}</span></div>`);
  }
  return out.join('');
}

function buildBugCardHtml({ id, severity, title, subtitle, codeTitle, codeHtml, httpTitle, httpJson, badgeColor }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #0b1120; color: #e2e8f0; padding: 20px; }
  .card { background: #111827; border: 1px solid #334155; border-radius: 12px; padding: 18px 20px; }
  .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-bottom: 12px; }
  .title { font-size: 17px; font-weight: 700; color: #f8fafc; }
  .sub { font-size: 12px; color: #94a3b8; margin-top: 3px; }
  .badge { background: ${badgeColor}; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.5px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .panel { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; }
  .ptitle { background: #1e293b; color: #38bdf8; font-size: 12px; font-weight: 700; padding: 7px 12px; }
  .code { padding: 8px 0; font-family: Consolas, monospace; font-size: 11.5px; line-height: 1.5; }
  .line { display: flex; padding: 1px 10px; white-space: pre-wrap; word-break: break-word; }
  .line.hi { background: rgba(239, 68, 68, 0.22); border-left: 3px solid #ef4444; padding-left: 7px; }
  .ln { width: 34px; color: #64748b; user-select: none; flex-shrink: 0; }
  .src { color: #e2e8f0; }
  pre { margin: 0; padding: 10px 12px; font-family: Consolas, monospace; font-size: 11.5px; line-height: 1.45; color: #a7f3d0; white-space: pre-wrap; word-break: break-word; }
  .ftr { margin-top: 10px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
</style></head>
<body>
<div class="card">
  <div class="hdr">
    <div>
      <div class="title">[${esc(id)}] ${esc(title)}</div>
      <div class="sub">${esc(subtitle)}</div>
    </div>
    <span class="badge">${esc(severity)}</span>
  </div>
  <div class="grid">
    <div class="panel">
      <div class="ptitle">${esc(codeTitle)}</div>
      <div class="code">${codeHtml}</div>
    </div>
    <div class="panel">
      <div class="ptitle">${esc(httpTitle)}</div>
      <pre>${esc(JSON.stringify(httpJson, null, 2))}</pre>
    </div>
  </div>
  <div class="ftr">
    <span>SUT: D:\\KTPM\\eshop-sut\\backend\\server.js | Hostname: Tung | StudentID: 20120397</span>
    <span>Source: evidence/functional-and-lockout-verification.json</span>
  </div>
</div>
</body></html>`;
}

async function renderPng(browser, html, outPath, width = 1040, height = 560) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.setContent(html, { waitUntil: 'load' });
  if (errs.length) {
    await page.close();
    throw new Error(errs.join('; '));
  }
  await page.screenshot({ path: outPath, fullPage: true });
  await page.close();
  console.log('Generated bug screenshot:', outPath);
}

async function main() {
  const verify = JSON.parse(fs.readFileSync(VERIFY_JSON, 'utf8'));
  const serverLines = fs.readFileSync(SERVER_JS, 'utf8').split(/\r?\n/);

  const cards = [
    {
      file: 'bug-auth-01-lockout.png',
      id: 'BUG-AUTH-01',
      severity: 'HIGH • AUTH / FR-02',
      badgeColor: '#d97706',
      title: 'Khóa tài khoản sau 2 lần đăng nhập sai thay vì 3 lần',
      subtitle: 'login_attempts cộng +2 mỗi lần sai nên lần thứ 3 dù nhập đúng mật khẩu vẫn bị 403 Forbidden',
      codeTitle: 'eshop-sut/backend/server.js (Lines 46–64)',
      codeHtml: getLines(serverLines, 46, 64, [54, 56, 57]),
      httpTitle: 'Observed Live HTTP Output (verify-lockout-and-bugs.js)',
      httpJson: { timestamp: verify.timestamp, lockout_behavior: verify.checks.lockout_behavior },
      height: 540,
    },
    {
      file: 'bug-sec-01-unauth-product-cud.png',
      id: 'BUG-SEC-01',
      severity: 'CRITICAL • SECURITY',
      badgeColor: '#dc2626',
      title: 'Thiếu middleware authenticateToken trên POST/PUT/DELETE /api/products',
      subtitle: 'Request ẩn danh không có header Authorization vẫn tạo và xóa sản phẩm thành công (200 OK)',
      codeTitle: 'eshop-sut/backend/server.js (Lines 167–196)',
      codeHtml: getLines(serverLines, 167, 196, [167, 179, 191]),
      httpTitle: 'Observed Live HTTP Output (No JWT Header)',
      httpJson: {
        timestamp: verify.timestamp,
        unauthenticated_product_cud: verify.checks.unauthenticated_product_cud,
      },
      height: 640,
    },
    {
      file: 'bug-sec-02-broken-rbac.png',
      id: 'BUG-SEC-02',
      severity: 'CRITICAL • BROKEN RBAC',
      badgeColor: '#dc2626',
      title: 'Admin API không kiểm tra req.user.role === "admin"',
      subtitle: 'Tài khoản thường (test@eshop.com, role="user") truy cập được /api/admin/users và /api/admin/orders',
      codeTitle: 'eshop-sut/backend/server.js (Lines 494–523)',
      codeHtml: getLines(serverLines, 494, 523, [494, 510]),
      httpTitle: 'Observed Live HTTP Output (role="user" Token)',
      httpJson: {
        timestamp: verify.timestamp,
        broken_admin_access_control: verify.checks.broken_admin_access_control,
      },
      height: 620,
    },
    {
      file: 'bug-func-01-silent-200.png',
      id: 'BUG-FUNC-01',
      severity: 'MEDIUM • FUNCTIONAL',
      badgeColor: '#2563eb',
      title: 'PUT/DELETE /api/products/:id trả về 200 OK giả với ID không tồn tại',
      subtitle: 'Không kiểm tra this.changes === 0 nên ID 999999 vẫn trả "Product updated" / "Product deleted"',
      codeTitle: 'eshop-sut/backend/server.js (Lines 179–196)',
      codeHtml: getLines(serverLines, 179, 196, [184, 186, 192, 194]),
      httpTitle: 'Observed Live HTTP Output (ID = 999999)',
      httpJson: {
        timestamp: verify.timestamp,
        silent_missing_id_mutation: verify.checks.silent_missing_id_mutation,
      },
      height: 510,
    },
  ];

  const browser = await pw.chromium.launch({ headless: true });
  for (const c of cards) {
    await renderPng(browser, buildBugCardHtml(c), path.join(EVIDENCE, c.file), 1040, c.height);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
