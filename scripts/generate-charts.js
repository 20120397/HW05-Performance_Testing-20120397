const fs = require('fs');
const path = require('path');
const pw = require('D:/KTPM/week 3.1/calculator-test/node_modules/playwright');

const ROOT = 'D:\\KTPM\\HW05\\20120397';
const EVIDENCE = path.join(ROOT, 'evidence');
const DATA_PATH = path.join(EVIDENCE, 'ground-truth-metrics.json');

function parseResourceCsv(csvPath) {
  if (!fs.existsSync(csvPath)) return [];
  const lines = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const hdr = lines[0].split(',');
  const idx = (k) => hdr.indexOf(k);
  return lines.slice(1).map((line) => {
    const f = line.split(',');
    return {
      t: Number(f[idx('elapsed_sec')]),
      cpu1: Number(f[idx('cpu_pct_1core')]),
      cpuAll: Number(f[idx('cpu_pct_allcores')]),
      ws: Number(f[idx('working_set_mb')]),
      pm: Number(f[idx('private_mem_mb')]),
      threads: Number(f[idx('threads')]),
    };
  });
}

async function renderHtmlPng(browser, html, outPath, width = 1000, height = 560) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.setContent(html, { waitUntil: 'load' });
  if (errors.length > 0) {
    await page.close();
    throw new Error(`Page JS error while rendering ${outPath}: ${errors.join('; ')}`);
  }
  await page.screenshot({ path: outPath, fullPage: false });
  await page.close();
  console.log('Generated chart:', outPath);
}

function buildResourceChartHtml(title, subtitle, rows) {
  const payload = JSON.stringify(rows);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; box-sizing: border-box; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px 20px; }
  h2 { margin: 0 0 4px 0; font-size: 18px; color: #38bdf8; }
  .sub { font-size: 12px; color: #94a3b8; margin-bottom: 12px; }
  .legend { display: flex; gap: 20px; font-size: 12px; margin-bottom: 8px; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
  canvas { display: block; background: #0f172a; border-radius: 6px; }
</style></head>
<body>
<div class="card">
  <h2>${title}</h2>
  <div class="sub">${subtitle}</div>
  <div class="legend">
    <span><span class="dot" style="background:#38bdf8"></span>Backend CPU % (1-core normalized, left axis)</span>
    <span><span class="dot" style="background:#f59e0b"></span>Working Set RAM MB (right axis)</span>
  </div>
  <canvas id="c" width="920" height="400"></canvas>
</div>
<script>
(() => {
const rows = ${payload};
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const padL = 55, padR = 60, padT = 20, padB = 36;
const plotW = W - padL - padR, plotH = H - padT - padB;

ctx.fillStyle = '#0f172a';
ctx.fillRect(0, 0, W, H);

if (rows.length > 0) {
  const maxT = Math.max(...rows.map(r => r.t), 1);
  const maxCpu = Math.max(100, ...rows.map(r => r.cpu1));
  const minRam = Math.floor(Math.min(...rows.map(r => r.ws)) * 0.9);
  const maxRam = Math.ceil(Math.max(...rows.map(r => r.ws)) * 1.1) + 5;

  // grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.font = '11px Consolas';
  for (let i = 0; i <= 5; i++) {
    const y = padT + (plotH * i) / 5;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    const cpuVal = Math.round(maxCpu * (1 - i / 5));
    const ramVal = Math.round(minRam + (maxRam - minRam) * (1 - i / 5));
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(cpuVal + '%', 8, y + 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(ramVal + ' MB', W - padR + 6, y + 4);
  }
  for (let i = 0; i <= 6; i++) {
    const x = padL + (plotW * i) / 6;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(Math.round((maxT * i) / 6) + 's', x - 10, H - 12);
  }

  // CPU line
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  rows.forEach((r, idx) => {
    const x = padL + (r.t / maxT) * plotW;
    const y = padT + (1 - r.cpu1 / maxCpu) * plotH;
    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // RAM line
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  rows.forEach((r, idx) => {
    const x = padL + (r.t / maxT) * plotW;
    const y = padT + (1 - (r.ws - minRam) / Math.max(maxRam - minRam, 1)) * plotH;
    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
})();
</script>
</body></html>`;
}

function buildComparisonChartHtml(metrics) {
  const scenarios = ['load', 'stress', 'spike', 'endurance'].filter((k) => metrics[k]);
  const items = scenarios.map((k) => ({
    name: k.toUpperCase(),
    rps: metrics[k].jtl.overall.throughputRps,
    avg: metrics[k].jtl.overall.avgMs,
    p95: metrics[k].jtl.overall.p95Ms,
    err: metrics[k].jtl.overall.errorPct,
  }));
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #ffffff; color: #0f172a; padding: 20px; }
  h2 { margin: 0 0 12px 0; color: #1e3a8a; font-size: 18px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
  .box h3 { margin: 0 0 8px 0; font-size: 14px; color: #334155; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
  th { background: #1e3a8a; color: #fff; padding: 6px 8px; text-align: left; }
  td { border: 1px solid #cbd5e1; padding: 6px 8px; }
</style></head>
<body>
<h2>EShop SUT Performance Summary Across All 4 JMeter Scenarios (Hostname: Tung)</h2>
<div class="grid">
  <div class="box"><h3>Throughput (Requests / Second)</h3><canvas id="c1" width="440" height="210"></canvas></div>
  <div class="box"><h3>Response Latency: Avg vs p95 (ms)</h3><canvas id="c2" width="440" height="210"></canvas></div>
</div>
<table>
  <thead><tr><th>Scenario</th><th>Samples</th><th>Errors</th><th>Error %</th><th>RPS</th><th>Avg (ms)</th><th>p95 (ms)</th><th>Max (ms)</th></tr></thead>
  <tbody>
    ${scenarios.map((k) => {
      const o = metrics[k].jtl.overall;
      return `<tr><td><b>${k.toUpperCase()}</b></td><td>${o.samples}</td><td>${o.errors}</td><td>${o.errorPct}%</td><td>${o.throughputRps}</td><td>${o.avgMs}</td><td>${o.p95Ms}</td><td>${o.maxMs}</td></tr>`;
    }).join('')}
  </tbody>
</table>
<script>
(() => {
const items = ${JSON.stringify(items)};
function drawBars(id, series, colors) {
  const c = document.getElementById(id);
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height, padL = 46, padB = 28, padT = 20, padR = 12;
  const maxVal = Math.max(10, ...items.flatMap(it => series.map(s => it[s]))) * 1.15;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#e2e8f0'; ctx.font = '11px Segoe UI';
  for (let i = 0; i <= 4; i++) {
    const y = padT + ((H - padT - padB) * i) / 4;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.fillStyle = '#475569';
    ctx.fillText(Math.round(maxVal * (1 - i / 4)), 4, y + 4);
  }
  const grpW = (W - padL - padR) / items.length;
  items.forEach((it, idx) => {
    const barW = Math.min(34, (grpW - 18) / series.length);
    series.forEach((s, si) => {
      const v = it[s];
      const bh = (v / maxVal) * (H - padT - padB);
      const x = padL + idx * grpW + 10 + si * (barW + 4);
      const y = H - padB - bh;
      ctx.fillStyle = colors[si];
      ctx.fillRect(x, y, barW, bh);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(v, x, y - 3);
    });
    ctx.fillStyle = '#1e293b';
    ctx.fillText(it.name, padL + idx * grpW + 14, H - 8);
  });
}
drawBars('c1', ['rps'], ['#2563eb']);
drawBars('c2', ['avg', 'p95'], ['#10b981', '#ef4444']);
})();
</script>
</body></html>`;
}

function buildHardwareSpecHtml(hwText) {
  const rows = hwText
    .split(/\r?\n/)
    .filter((l) => l.includes(':') && !l.startsWith('==='))
    .map((l) => {
      const idx = l.indexOf(':');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    });
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #0f172a; padding: 20px; }
  .card { background: #ffffff; border-radius: 10px; padding: 18px 22px; }
  h2 { margin: 0 0 10px 0; color: #1e3a8a; font-size: 18px; border-bottom: 2px solid #2563eb; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1e3a8a; color: #fff; padding: 8px 10px; text-align: left; width: 220px; }
  td { border: 1px solid #cbd5e1; padding: 7px 10px; color: #0f172a; }
  tr:nth-child(even) td { background: #f8fafc; }
</style></head>
<body>
<div class="card">
  <h2>Hardware & Runtime Specification Report — Hostname: Tung</h2>
  <table>
    <tbody>
      ${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}
    </tbody>
  </table>
</div>
</body></html>`;
}

function buildCptFlowchartHtml() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #ffffff; padding: 16px; }
  .wrap { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; background: #f8fafc; }
  h2 { margin: 0 0 10px 0; color: #1e3a8a; font-size: 16px; text-align: center; }
</style></head>
<body>
<div class="wrap">
  <h2>Continuous Performance Testing (CPT) Pipeline Architecture — EShop SUT</h2>
  <svg viewBox="0 0 940 340" width="920" height="330" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif" font-size="12">
    <defs>
      <marker id="arr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#334155"/>
      </marker>
    </defs>
    <rect x="18" y="30" width="145" height="58" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <text x="90" y="54" text-anchor="middle" font-weight="700" fill="#1e3a8a">1. Git Push / PR</text>
    <text x="90" y="72" text-anchor="middle" fill="#334155">SUT Commit Watcher</text>

    <line x1="163" y1="59" x2="210" y2="59" stroke="#334155" stroke-width="2" marker-end="url(#arr)"/>

    <polygon points="300,14 390,59 300,104 210,59" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
    <text x="300" y="54" text-anchor="middle" font-weight="700" fill="#92400e">2. Risk Gate</text>
    <text x="300" y="70" text-anchor="middle" font-size="10.5" fill="#78350f">Touches server.js / DB?</text>

    <line x1="300" y1="104" x2="300" y2="150" stroke="#334155" stroke-width="2" marker-end="url(#arr)"/>
    <text x="308" y="132" font-size="11" fill="#64748b">No (docs/UI only)</text>
    <rect x="215" y="152" width="170" height="48" rx="8" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>
    <text x="300" y="173" text-anchor="middle" font-weight="600" fill="#334155">Skip Perf Gate</text>
    <text x="300" y="189" text-anchor="middle" font-size="11" fill="#64748b">Run Unit Tests Only</text>

    <line x1="390" y1="59" x2="450" y2="59" stroke="#334155" stroke-width="2" marker-end="url(#arr)"/>
    <text x="418" y="50" text-anchor="middle" font-size="11" font-weight="700" fill="#15803d">Yes</text>

    <rect x="452" y="25" width="195" height="68" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
    <text x="550" y="48" text-anchor="middle" font-weight="700" fill="#14532d">3. Ephemeral Runner</text>
    <text x="550" y="64" text-anchor="middle" font-size="11" fill="#166534">Boot SUT + Seed CSV Data</text>
    <text x="550" y="80" text-anchor="middle" font-size="11" fill="#166534">Run JMeter Load (120s)</text>

    <line x1="647" y1="59" x2="700" y2="59" stroke="#334155" stroke-width="2" marker-end="url(#arr)"/>

    <rect x="702" y="25" width="215" height="68" rx="8" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2"/>
    <text x="810" y="48" text-anchor="middle" font-weight="700" fill="#312e81">4. analyze_jtl.js Gate</text>
    <text x="810" y="64" text-anchor="middle" font-size="11" fill="#3730a3">Compare p95 vs Baseline</text>
    <text x="810" y="80" text-anchor="middle" font-size="11" fill="#3730a3">Check Error% &lt; 1%, RAM</text>

    <line x1="810" y1="93" x2="810" y2="145" stroke="#334155" stroke-width="2" marker-end="url(#arr)"/>

    <polygon points="810,147 915,192 810,237 705,192" fill="#fce7f3" stroke="#db2777" stroke-width="2"/>
    <text x="810" y="187" text-anchor="middle" font-weight="700" fill="#831843">p95 &gt; +20% or</text>
    <text x="810" y="203" text-anchor="middle" font-weight="700" fill="#831843">Err &gt; 1%?</text>

    <line x1="705" y1="192" x2="625" y2="192" stroke="#16a34a" stroke-width="2" marker-end="url(#arr)"/>
    <text x="665" y="184" text-anchor="middle" font-size="11" font-weight="700" fill="#15803d">Pass</text>
    <rect x="440" y="162" width="183" height="60" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
    <text x="531" y="186" text-anchor="middle" font-weight="700" fill="#14532d">5a. Approve PR &amp;</text>
    <text x="531" y="204" text-anchor="middle" font-size="11" fill="#166534">Update Rolling Baseline</text>

    <line x1="810" y1="237" x2="810" y2="275" stroke="#dc2626" stroke-width="2" marker-end="url(#arr)"/>
    <text x="855" y="260" font-size="11" font-weight="700" fill="#dc2626">Regression</text>
    <rect x="660" y="277" width="260" height="52" rx="8" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
    <text x="790" y="298" text-anchor="middle" font-weight="700" fill="#7f1d1d">5b. Block Merge &amp; Re-verify</text>
    <text x="790" y="315" text-anchor="middle" font-size="11" fill="#991b1b">Auto-rerun x1 to filter noisy-neighbor</text>

    <rect x="20" y="235" width="365" height="90" rx="8" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.5"/>
    <text x="34" y="258" font-weight="700" fill="#1e3a8a">Nightly Scheduled Tier (Off-Peak 02:00 UTC)</text>
    <text x="34" y="277" fill="#334155">• Runs full Stress (100 VU), Spike (150 VU), and 10m Soak Test</text>
    <text x="34" y="295" fill="#334155">• Prevents PR CI latency bloat while catching memory leaks</text>
    <text x="34" y="313" fill="#334155">• Archives .jtl + HTML dashboard artifacts for 30 days</text>
  </svg>
</div>
</body></html>`;
}

async function main() {
  const browser = await pw.chromium.launch({ headless: true });

  // 1. Resource usage charts per scenario
  const scenarios = [
    ['load', 'Load Test Backend Resource Usage (20 VU, 120s)', 'SUT: node server.js (PID monitored every 2s)'],
    ['stress', 'Stress Test Backend Resource Usage (100 VU, 120s)', 'SUT: node server.js (PID monitored every 2s)'],
    ['spike', 'Spike Test Backend Resource Usage (150 VU / 5s burst, 60s)', 'SUT: node server.js (PID monitored every 2s)'],
    ['endurance', 'Endurance / Soak Test Backend Resource Usage (15 VU, 600s)', 'SUT: node server.js (10-minute sustained soak)'],
  ];
  for (const [sc, title, sub] of scenarios) {
    const csvPath = path.join(EVIDENCE, `resource-usage-${sc}.csv`);
    const rows = parseResourceCsv(csvPath);
    if (rows.length > 0) {
      await renderHtmlPng(browser, buildResourceChartHtml(title, sub, rows), path.join(EVIDENCE, `chart-${sc}-resources.png`), 980, 520);
    }
  }

  // 2. Comparison chart from ground-truth-metrics.json
  if (fs.existsSync(DATA_PATH)) {
    const metrics = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    await renderHtmlPng(browser, buildComparisonChartHtml(metrics), path.join(EVIDENCE, 'chart-scenarios-comparison.png'), 980, 540);
  }

  // 3. Hardware Spec PNG
  const hwPath = path.join(EVIDENCE, 'hardware-spec.txt');
  if (fs.existsSync(hwPath)) {
    const hwText = fs.readFileSync(hwPath, 'utf8');
    await renderHtmlPng(browser, buildHardwareSpecHtml(hwText), path.join(EVIDENCE, 'hardware-spec-table.png'), 900, 460);
  }

  // 4. Task 3 CPT Flowchart PNG
  await renderHtmlPng(browser, buildCptFlowchartHtml(), path.join(EVIDENCE, 'cpt-pipeline-flowchart.png'), 960, 390);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
