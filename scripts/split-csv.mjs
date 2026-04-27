// scripts/split-csv.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- CSV parser (same logic as csvLoader.ts) ---
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else { field += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === ',') { row.push(field); field = ''; i++; }
      else if (ch === '\r') { i++; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
      else { field += ch; i++; }
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    if (row.some(f => f !== '')) rows.push(row);
  }
  return rows;
}

// --- CSV serializer ---
function fieldToCSV(val) {
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function rowToCSV(row) {
  return row.map(fieldToCSV).join(',');
}

// --- Main ---
const srcPath = join(ROOT, 'public/assets/allinone-text-contents.csv');
const outDir  = join(ROOT, 'public/assets/sentences');
const yamlPath = join(ROOT, 'public/assets/categories.yaml');

const text = readFileSync(srcPath, 'utf-8');
const rows = parseCSV(text);
const header = rows[0];
const dataRows = rows.slice(1).filter(r => r.length >= 7 && r[4]?.trim());

// Group by category_index (column 3), preserving order
const groups = new Map();
for (const row of dataRows) {
  const catIdx = row[3].trim(); // "[01]" etc.
  if (!groups.has(catIdx)) groups.set(catIdx, []);
  groups.get(catIdx).push(row);
}

mkdirSync(outDir, { recursive: true });

const yamlLines = ['sections:'];

for (const [catIdx, catRows] of groups) {
  const num = catIdx.replace(/[\[\]]/g, ''); // "[01]" -> "01"
  const category = catRows[0][2].trim();     // "01_時制"
  const filename = `sentences/${num}.csv`;
  const outPath  = join(ROOT, 'public/assets', filename);

  const csvContent = [rowToCSV(header), ...catRows.map(rowToCSV)].join('\n') + '\n';
  writeFileSync(outPath, csvContent, 'utf-8');
  console.log(`Written: ${filename} (${catRows.length} rows)`);

  yamlLines.push(`  - category: "${category}"`);
  yamlLines.push(`    categoryIndex: "${catIdx}"`);
  yamlLines.push(`    file: "${filename}"`);
}

writeFileSync(yamlPath, yamlLines.join('\n') + '\n', 'utf-8');
console.log(`Written: categories.yaml (${groups.size} sections)`);
