import * as jsYaml from 'js-yaml';

export interface Sentence {
  no: number;
  index: string;              // "[001]"
  category: string;           // "01_時制"
  categoryIndex: string;      // "[01]"
  englishText: string;
  translationSlashed: string;
  translationNatural: string;
}

interface SectionEntry {
  category: string;
  categoryIndex: string;
  file: string;
}

let cache: Sentence[] | null = null;

function parseCSV(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  const rows: string[][] = [];
  let row: string[] = [];
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
      else if (ch === '\n') {
        row.push(field); rows.push(row);
        row = []; field = ''; i++;
      } else { field += ch; i++; }
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    if (row.some((f) => f !== '')) rows.push(row);
  }
  return rows;
}

async function fetchAll(basePath: string): Promise<void> {
  if (cache) return;

  const yamlResp = await fetch(`${basePath}categories.yaml`);
  if (!yamlResp.ok) throw new Error(`categories.yaml load failed: ${yamlResp.status}`);
  const yamlText = await yamlResp.text();
  const { sections } = jsYaml.load(yamlText) as { sections: SectionEntry[] };

  const csvTexts = await Promise.all(
    sections.map(async (s) => {
      const resp = await fetch(`${basePath}${s.file}`);
      if (!resp.ok) throw new Error(`CSV load failed: ${s.file} ${resp.status}`);
      return resp.text();
    })
  );

  cache = csvTexts.flatMap((text) =>
    parseCSV(text)
      .slice(1) // skip header
      .filter((row) => row.length >= 7 && row[4]?.trim())
      .map((row) => ({
        no: parseInt(row[0], 10),
        index: row[1].trim(),
        category: row[2].trim(),
        categoryIndex: row[3].trim(),
        englishText: row[4].trim(),
        translationSlashed: row[5].trim(),
        translationNatural: row[6].trim(),
      }))
  );
}

function getCategories(): string[] {
  if (!cache) return [];
  return [...new Set(cache.map((s) => s.category))];
}

function getByCategory(category: string): Sentence[] {
  if (!cache) return [];
  return cache.filter((s) => s.category === category);
}

function getAll(): Sentence[] {
  return cache ?? [];
}

export const csvLoader = { fetchAll, getCategories, getByCategory, getAll };
