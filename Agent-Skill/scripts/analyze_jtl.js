#!/usr/bin/env node
/**
 * JMeter .jtl (CSV) & Resource Usage Analyzer for HW05 Performance Testing
 * Computes exact ground-truth metrics (Samples, Error %, Avg, Min, p50, p90, p95, p99, Max, RPS)
 * directly from raw JMeter CSV logs without rounding distortion or hallucination.
 */
const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = (p / 100) * (sortedArr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
}

function summarizeSamples(rows) {
  if (rows.length === 0) return null;
  const elapsed = rows.map((r) => r.elapsed).sort((a, b) => a - b);
  const minTs = Math.min(...rows.map((r) => r.timeStamp));
  const maxEnd = Math.max(...rows.map((r) => r.timeStamp + r.elapsed));
  const durationSec = Math.max((maxEnd - minTs) / 1000, 0.001);
  const errors = rows.filter((r) => !r.success).length;
  const sum = elapsed.reduce((a, b) => a + b, 0);
  const bytesSum = rows.reduce((a, r) => a + (r.bytes || 0), 0);

  const codeCounts = {};
  const errMsgs = {};
  for (const r of rows) {
    codeCounts[r.responseCode] = (codeCounts[r.responseCode] || 0) + 1;
    if (!r.success) {
      const msg = (r.failureMessage || r.responseMessage || 'Unknown Error').slice(0, 120);
      errMsgs[msg] = (errMsgs[msg] || 0) + 1;
    }
  }

  return {
    samples: rows.length,
    errors,
    errorPct: Number(((errors / rows.length) * 100).toFixed(2)),
    durationSec: Number(durationSec.toFixed(2)),
    throughputRps: Number((rows.length / durationSec).toFixed(2)),
    avgMs: Number((sum / rows.length).toFixed(2)),
    minMs: elapsed[0],
    p50Ms: Number(percentile(elapsed, 50).toFixed(2)),
    p90Ms: Number(percentile(elapsed, 90).toFixed(2)),
    p95Ms: Number(percentile(elapsed, 95).toFixed(2)),
    p99Ms: Number(percentile(elapsed, 99).toFixed(2)),
    maxMs: elapsed[elapsed.length - 1],
    avgBytes: Number((bytesSum / rows.length).toFixed(1)),
    responseCodes: codeCounts,
    topErrors: Object.entries(errMsgs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count })),
  };
}

function analyzeJtl(jtlPath) {
  const raw = fs.readFileSync(jtlPath, 'utf8').trim();
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error(`JTL file has no data rows: ${jtlPath}`);
  }
  const header = parseCsvLine(lines[0]);
  const col = (name) => header.indexOf(name);
  const iTs = col('timeStamp');
  const iEl = col('elapsed');
  const iLbl = col('label');
  const iCode = col('responseCode');
  const iMsg = col('responseMessage');
  const iSucc = col('success');
  const iFail = col('failureMessage');
  const iBytes = col('bytes');
  const iGrp = col('grpThreads');
  const iAll = col('allThreads');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const f = parseCsvLine(lines[i]);
    const ts = Number(f[iTs]);
    const el = Number(f[iEl]);
    if (!Number.isFinite(ts) || !Number.isFinite(el)) continue;
    rows.push({
      timeStamp: ts,
      elapsed: el,
      label: f[iLbl] || 'UNKNOWN',
      responseCode: f[iCode] || '',
      responseMessage: f[iMsg] || '',
      success: String(f[iSucc]).toLowerCase() === 'true',
      failureMessage: iFail >= 0 ? f[iFail] : '',
      bytes: iBytes >= 0 ? Number(f[iBytes]) || 0 : 0,
      grpThreads: iGrp >= 0 ? Number(f[iGrp]) || 0 : 0,
      allThreads: iAll >= 0 ? Number(f[iAll]) || 0 : 0,
    });
  }

  const byLabel = {};
  for (const r of rows) {
    if (!byLabel[r.label]) byLabel[r.label] = [];
    byLabel[r.label].push(r);
  }

  const overall = summarizeSamples(rows);
  overall.peakActiveThreads = Math.max(...rows.map((r) => r.allThreads));

  const perEndpoint = {};
  for (const lbl of Object.keys(byLabel).sort()) {
    perEndpoint[lbl] = summarizeSamples(byLabel[lbl]);
  }

  // Time-series windows (every 30s) to inspect endurance stability / degradation
  const t0 = Math.min(...rows.map((r) => r.timeStamp));
  const buckets = new Map();
  for (const r of rows) {
    const b = Math.floor((r.timeStamp - t0) / 30000);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b).push(r);
  }
  const timeWindows30s = Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([b, items]) => {
      const s = summarizeSamples(items);
      return {
        windowSec: `${b * 30}-${(b + 1) * 30}s`,
        samples: s.samples,
        errors: s.errors,
        errorPct: s.errorPct,
        rps: Number((items.length / 30).toFixed(2)),
        avgMs: s.avgMs,
        p95Ms: s.p95Ms,
        maxMs: s.maxMs,
      };
    });

  return { file: jtlPath, overall, perEndpoint, timeWindows30s };
}

function analyzeResourceCsv(csvPath) {
  if (!csvPath || !fs.existsSync(csvPath)) return null;
  const lines = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const header = parseCsvLine(lines[0]);
  const idx = (k) => header.indexOf(k);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const f = parseCsvLine(lines[i]);
    rows.push({
      elapsed_sec: Number(f[idx('elapsed_sec')]),
      cpu_pct_1core: Number(f[idx('cpu_pct_1core')]),
      cpu_pct_allcores: Number(f[idx('cpu_pct_allcores')]),
      working_set_mb: Number(f[idx('working_set_mb')]),
      private_mem_mb: Number(f[idx('private_mem_mb')]),
      threads: Number(f[idx('threads')]),
      handles: Number(f[idx('handles')]),
    });
  }
  if (rows.length === 0) return null;
  const avg = (arr) => Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
  const max = (arr) => Number(Math.max(...arr).toFixed(2));
  const min = (arr) => Number(Math.min(...arr).toFixed(2));
  return {
    samples: rows.length,
    durationSec: rows[rows.length - 1].elapsed_sec,
    cpu1CoreAvgPct: avg(rows.map((r) => r.cpu_pct_1core)),
    cpu1CoreMaxPct: max(rows.map((r) => r.cpu_pct_1core)),
    cpuAllCoresAvgPct: avg(rows.map((r) => r.cpu_pct_allcores)),
    cpuAllCoresMaxPct: max(rows.map((r) => r.cpu_pct_allcores)),
    workingSetStartMb: rows[0].working_set_mb,
    workingSetEndMb: rows[rows.length - 1].working_set_mb,
    workingSetMinMb: min(rows.map((r) => r.working_set_mb)),
    workingSetMaxMb: max(rows.map((r) => r.working_set_mb)),
    privateMemMaxMb: max(rows.map((r) => r.private_mem_mb)),
    maxThreads: max(rows.map((r) => r.threads)),
    maxHandles: max(rows.map((r) => r.handles)),
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node analyze_jtl.js <path-to-results.jtl> [path-to-resource-usage.csv]');
    process.exit(1);
  }
  const jtlRes = analyzeJtl(args[0]);
  const resSummary = args[1] ? analyzeResourceCsv(args[1]) : null;
  console.log(JSON.stringify({ jtl: jtlRes, resources: resSummary }, null, 2));
}

module.exports = { analyzeJtl, analyzeResourceCsv };
