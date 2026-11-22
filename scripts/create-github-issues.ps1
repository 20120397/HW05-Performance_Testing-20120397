# Script tạo 6 GitHub Issues bằng GitHub CLI (gh)
# Điều kiện: đã chạy `gh auth login` và đã push repo lên GitHub.
param(
  [string]$Repo = "20120397/HW05-Performance_Testing-20120397"
)

$baseRaw = "https://raw.githubusercontent.com/$Repo/main/evidence"

$issues = @(
  @{
    Title = "[BUG-PERF-01] Stress 100 VU: p95 latency spikes 17.7x (13ms -> 231ms) in 90-120s window"
    Body = "Stress Test (100 VU, 120s) peaked at 481.97 RPS (60-90s, p95=13ms) before degrading to 299.80 RPS in 90-120s with p95=231ms (max 330ms) and Working Set RAM climbing to 173.64 MB.`n`n![Stress Chart]($baseRaw/chart-stress-resources.png)"
  },
  @{
    Title = "[BUG-PERF-02] Spike 150 VU/5s: Single-core Node.js CPU hits 95.73%, p95 jumps to 499ms"
    Body = "Spike Test (150 VU in 5s) reached 788.27 RPS in 0-30s then dropped 45.2% to 432.07 RPS in 30-60s with p95=499ms (max 641ms) and single-core CPU saturation at 95.73%.`n`n![Spike Chart]($baseRaw/chart-spike-resources.png)"
  },
  @{
    Title = "[BUG-AUTH-01] POST /api/login locks account after 2 failed attempts instead of 3"
    Body = "In eshop-sut/backend/server.js line 54, newAttempts increments by +2 (login_attempts + 2) with threshold >= 3, locking valid users on the 3rd attempt (403 Forbidden)."
  },
  @{
    Title = "[BUG-SEC-01] Missing JWT authentication on POST/PUT/DELETE /api/products"
    Body = "In eshop-sut/backend/server.js lines 167, 179, 191, unauthenticated requests create, update, and delete products with 200 OK."
  },
  @{
    Title = "[BUG-SEC-02] Missing admin role verification on GET /api/admin/users and /api/admin/orders"
    Body = "In eshop-sut/backend/server.js lines 494 and 510, a regular user token (role='user') receives 200 OK and accesses all admin user and order records."
  },
  @{
    Title = "[BUG-FUNC-01] PUT/DELETE /api/products/:id returns 200 OK for nonexistent IDs"
    Body = "In eshop-sut/backend/server.js lines 179-196, this.changes === 0 is unchecked, returning 200 OK for ID 999999."
  }
)

foreach ($it in $issues) {
  Write-Host "Creating issue: $($it.Title)"
  & gh issue create --repo $Repo --title $it.Title --body $it.Body
}
