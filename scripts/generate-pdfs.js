const fs = require('fs');
const path = require('path');
const pw = require('D:/KTPM/week 3.1/calculator-test/node_modules/playwright');

const ROOT = 'D:\\KTPM\\HW05\\20120397';

const DOCS = [
  { md: path.join(ROOT, 'README.md'), pdf: path.join(ROOT, 'README.pdf') },
  { md: path.join(ROOT, 'main-report.md'), pdf: path.join(ROOT, 'main-report.pdf') },
  { md: path.join(ROOT, 'reports', 'bug-report.md'), pdf: path.join(ROOT, 'reports', 'bug-report.pdf') },
  { md: path.join(ROOT, 'reports', 'ai-audit-report.md'), pdf: path.join(ROOT, 'reports', 'ai-audit-report.pdf') },
  { md: path.join(ROOT, 'reports', 'ai-critique.md'), pdf: path.join(ROOT, 'reports', 'ai-critique.pdf') },
];

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMd(text, baseDir) {
  let out = escHtml(text);
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, href) => {
    const resolved = path.resolve(baseDir, href);
    if (fs.existsSync(resolved) && /\.(png|jpg|jpeg)$/i.test(resolved)) {
      const ext = path.extname(resolved).slice(1).toLowerCase();
      const mime = ext === 'jpg' ? 'jpeg' : ext;
      const b64 = fs.readFileSync(resolved).toString('base64');
      return `<div style="margin:8px 0;"><img src="data:image/${mime};base64,${b64}" alt="${escHtml(alt)}" style="max-width:100%;max-height:420px;border:1px solid #cbd5e1;border-radius:6px;display:block;"/></div>`;
    }
    return `<em>[Image: ${escHtml(alt)}]</em>`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label) => {
    return `<span style="color:#1d4ed8;text-decoration:underline;">${label}</span>`;
  });
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

function mdToHtml(mdText, baseDir, title) {
  const lines = mdText.split(/\r?\n/);
  const html = [];
  let inCode = false;
  let inList = false;
  let listTag = 'ul';
  let inTable = false;

  const closeList = () => {
    if (inList) {
      html.push(`</${listTag}>`);
      inList = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      html.push('</tbody></table></div>');
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line.startsWith('```')) {
      closeList();
      closeTable();
      if (!inCode) {
        html.push('<pre><code>');
        inCode = true;
      } else {
        html.push('</code></pre>');
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      html.push(escHtml(raw));
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      closeList();
      closeTable();
      html.push('<hr/>');
      continue;
    }

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      closeList();
      const cells = line.trim().slice(1, -1).split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }
      if (!inTable) {
        html.push('<div class="table-wrap"><table><thead><tr>');
        cells.forEach((c) => html.push(`<th>${inlineMd(c, baseDir)}</th>`));
        html.push('</tr></thead><tbody>');
        inTable = true;
      } else {
        html.push('<tr>');
        cells.forEach((c) => html.push(`<td>${inlineMd(c, baseDir)}</td>`));
        html.push('</tr>');
      }
      continue;
    } else {
      closeTable();
    }

    const hMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (hMatch) {
      closeList();
      const lvl = hMatch[1].length;
      html.push(`<h${lvl}>${inlineMd(hMatch[2], baseDir)}</h${lvl}>`);
      continue;
    }

    if (line.trim().startsWith('>')) {
      closeList();
      const body = line.trim().replace(/^>\s?/, '');
      if (!body || /^\[!(IMPORTANT|NOTE|TIP|WARNING|CAUTION)\]/i.test(body)) {
        if (/^\[!(IMPORTANT|NOTE|TIP|WARNING|CAUTION)\]/i.test(body)) {
          html.push(`<div class="callout-title">${escHtml(body)}</div>`);
        }
        continue;
      }
      html.push(`<blockquote>${inlineMd(body, baseDir)}</blockquote>`);
      continue;
    }

    const ulMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const targetTag = olMatch ? 'ol' : 'ul';
      if (!inList || listTag !== targetTag) {
        closeList();
        listTag = targetTag;
        const startAttr = olMatch && Number(olMatch[2]) > 1 ? ` start="${olMatch[2]}"` : '';
        html.push(`<${listTag}${startAttr}>`);
        inList = true;
      }
      const content = ulMatch ? ulMatch[2] : olMatch[3];
      html.push(`<li>${inlineMd(content, baseDir)}</li>`);
      continue;
    } else if (line.trim() === '') {
      closeList();
      continue;
    } else if (inList && /^\s+/.test(raw)) {
      html.push(`<div class="li-cont">${inlineMd(line.trim(), baseDir)}</div>`);
      continue;
    } else {
      closeList();
    }

    html.push(`<p>${inlineMd(line, baseDir)}</p>`);
  }

  closeList();
  closeTable();

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>${escHtml(title)}</title>
<style>
  @page { size: A4; margin: 15mm 13mm 15mm 13mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1e293b; }
  h1 { font-size: 17pt; color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 6px; margin-top: 0; }
  h2 { font-size: 13.5pt; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 16px; page-break-after: avoid; }
  h3 { font-size: 11pt; color: #1e40af; margin-top: 12px; page-break-after: avoid; }
  p { margin: 5px 0; }
  ul, ol { margin: 5px 0 8px 20px; padding: 0; }
  li { margin: 3px 0; }
  .li-cont { margin-left: 16px; color: #334155; }
  code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-family: Consolas, monospace; font-size: 8.8pt; color: #0f172a; }
  pre { background: #0f172a; color: #e2e8f0; padding: 9px; border-radius: 6px; overflow-x: auto; font-size: 8.2pt; white-space: pre-wrap; word-break: break-word; }
  pre code { background: none; color: inherit; }
  blockquote { border-left: 4px solid #3b82f6; background: #eff6ff; margin: 6px 0; padding: 6px 10px; color: #1e3a8a; }
  .callout-title { font-weight: 700; color: #b91c1c; margin-top: 8px; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 8.4pt; }
  th { background: #1e3a8a; color: #ffffff; padding: 5px 6px; border: 1px solid #cbd5e1; text-align: left; }
  td { padding: 4px 6px; border: 1px solid #cbd5e1; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  tr { page-break-inside: avoid; }
</style>
</head>
<body>
${html.join('\n')}
</body>
</html>`;
}

async function run() {
  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const doc of DOCS) {
    if (!fs.existsSync(doc.md)) {
      console.log(`Skipping missing: ${doc.md}`);
      continue;
    }
    const mdText = fs.readFileSync(doc.md, 'utf8');
    const html = mdToHtml(mdText, path.dirname(doc.md), path.basename(doc.md));
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: doc.pdf,
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
    });
    console.log(`Exported PDF: ${doc.pdf}`);
  }

  await browser.close();
}

run().catch((err) => {
  console.error('PDF EXPORT FAILED:', err);
  process.exit(1);
});
