# Script Tạo GitHub Issues Hàng Loạt Qua GitHub REST API (HW05)
# Chạy khi cần đồng bộ 6 issues hiệu năng & bảo mật lên GitHub repo:
#   node scripts/create-github-issues-api.js 20120397/HW05-Performance_Testing-20120397 <GITHUB_TOKEN>

const https = require('https');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/create-github-issues-api.js <owner/repo> <GITHUB_TOKEN>');
  process.exit(1);
}

const [repo, token] = args;
const baseRawUrl = `https://raw.githubusercontent.com/${repo}/main/evidence`;

const issues = [
  {
    title: '[BUG-PERF-01] Stress 100 VU: Do tre p95 tang 17.7x (13ms -> 231ms) va sut giam RPS tai cua so 90-120s',
    labels: ['bug', 'performance'],
    body: `### Mo ta\nTrong kich ban Stress Test (100 VU, 120s, file \`20120397_Stress_20261122.jtl\`), he thong dat dinh **481.97 RPS** o cua so 60-90s (Avg 5.05ms, p95 13ms), nhung tai cua so **90-120s** thong luong giam con **299.80 RPS** (-37.8%), Avg tang len **127.95ms** va **p95 vot len 231ms** (Max 330ms). RAM Working Set tang tu 56.75 MB len 173.64 MB.\n\n### Nguyen nhan\nSQLite3 che do DELETE mac dinh + Node.js event loop don luong gay nghe co chai khi ghi dong thoi (\`POST/PUT/DELETE /api/products\`).\n\n![Stress Resource Chart](${baseRawUrl}/chart-stress-resources.png)`
  },
  {
    title: '[BUG-PERF-02] Spike 150 VU/5s: Bao hoa CPU don nhan Node.js (95.73%) khien RPS giam 45.2% va p95 dat 499ms',
    labels: ['bug', 'performance'],
    body: `### Mo ta\nTrong Spike Test (150 VU ramp-up 5s, 60s, file \`20120397_Spike_20261122.jtl\`), cua so 0-30s dat **788.27 RPS** (p95 120ms), nhung sang 30-60s thong luong rot xuong **432.07 RPS** (-45.2%) voi Avg 245.68ms, **p95 = 499ms**, Max 641ms.\n\n### Resource Monitor\nTien trinh \`node.exe\` cham **95.73% CPU don nhan** (1-core normalized), du CPU tong 16 luong chi bao 5.98%.\n\n![Spike Resource Chart](${baseRawUrl}/chart-spike-resources.png)`
  },
  {
    title: '[BUG-AUTH-01] POST /api/login khoa tai khoan sau 2 lan sai thay vi 3 lan (login_attempts + 2)',
    labels: ['bug', 'auth'],
    body: `### Vi tri\n\`eshop-sut/backend/server.js\` dong 54-58.\n\n### Mo ta\nCode tang \`const newAttempts = user.login_attempts + 2;\` va kiem tra \`if (newAttempts >= 3)\`. Do do chi sau **2 lan dang nhap sai**, lan thu 3 du nhap dung mat khau van bi chan \`403 Forbidden: Tai khoan da bi khoa. Vui long thu lai sau.\`.\n\n### Bang chung\nDa kiem chung truc tiep trong \`evidence/functional-and-lockout-verification.json\`.`
  },
  {
    title: '[BUG-SEC-01] POST/PUT/DELETE /api/products thieu middleware authenticateToken',
    labels: ['bug', 'security'],
    body: `### Vi tri\n\`eshop-sut/backend/server.js\` dong 167, 179, 191.\n\n### Mo ta\nCac endpoint quan tri san pham cho phep request an danh khong co JWT header van tra ve \`200 OK\` (tao va xoa san pham ID=6 thanh cong khong can token).`
  },
  {
    title: '[BUG-SEC-02] GET /api/admin/users va /api/admin/orders khong kiem tra role=admin (Broken Access Control)',
    labels: ['bug', 'security'],
    body: `### Vi tri\n\`eshop-sut/backend/server.js\` dong 494 va 510.\n\n### Mo ta\nDung tai khoan khach hang thuong (\`test@eshop.com\`, \`role: "user"\`) goi \`GET /api/admin/users\` va \`GET /api/admin/orders\` van nhan \`200 OK\` va doc duoc toan bo 11 user + 5 don hang.`
  },
  {
    title: '[BUG-FUNC-01] PUT/DELETE /api/products/:id tra ve 200 OK gia khi ID khong ton tai (999999)',
    labels: ['bug', 'functional'],
    body: `### Vi tri\n\`eshop-sut/backend/server.js\` dong 179-196.\n\n### Mo ta\nKhong kiem tra \`this.changes === 0\`, khien \`PUT /api/products/999999\` va \`DELETE /api/products/999999\` deu tra ve \`200 OK\`. Gay rui ro false-positive trong cac bai kiem thu tai khi correlation ID bi loi.`
  }
];

function createIssue(issue) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(issue);
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: `/repos/${repo}/issues`,
        method: 'POST',
        headers: {
          'User-Agent': 'HW05-20120397-Issue-Script',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body).html_url);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  for (const issue of issues) {
    try {
      const url = await createIssue(issue);
      console.log('Created:', url);
    } catch (e) {
      console.error('Failed:', issue.title, e.message);
    }
  }
})();
