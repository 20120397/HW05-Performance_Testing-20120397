const fs = require('fs');
const path = require('path');
const { analyzeJtl, analyzeResourceCsv } = require('../Agent-Skill/scripts/analyze_jtl');

const ROOT = 'D:\\KTPM\\HW05\\20120397';
const items = [
  ['load', 'results/load/20120397_Load_20261122.jtl', 'evidence/resource-usage-load.csv'],
  ['stress', 'results/stress/20120397_Stress_20261122.jtl', 'evidence/resource-usage-stress.csv'],
  ['spike', 'results/spike/20120397_Spike_20261122.jtl', 'evidence/resource-usage-spike.csv'],
  ['endurance', 'results/endurance/20120397_Endurance_20261122.jtl', 'evidence/resource-usage-endurance.csv'],
];

const out = {};
for (const [key, jtlRel, resRel] of items) {
  const jtlAbs = path.join(ROOT, jtlRel);
  const resAbs = path.join(ROOT, resRel);
  if (fs.existsSync(jtlAbs)) {
    out[key] = {
      jtl: analyzeJtl(jtlAbs),
      resources: analyzeResourceCsv(resAbs),
    };
  }
}

const outPath = path.join(ROOT, 'evidence', 'ground-truth-metrics.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log('Saved ground truth metrics to:', outPath);
for (const [k, v] of Object.entries(out)) {
  console.log(k, JSON.stringify(v.jtl.overall), 'RES:', JSON.stringify(v.resources));
}
