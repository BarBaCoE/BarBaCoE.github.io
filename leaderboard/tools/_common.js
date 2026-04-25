// Shared helpers for the Barbacoe CLI tools.
// Reads/writes the data/ files and the data-scripts block in index.html.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..");
export const INDEX_PATH = join(ROOT, "index.html");
export const CATEGORIES_PATH = join(ROOT, "data", "categories.js");
export const RESULTS_DIR = join(ROOT, "data", "results");

// ---- index.html data-scripts block ----
const SCRIPTS_BLOCK_RE =
  /(<!-- BARBACOE-DATA-SCRIPTS:START[^\n]*-->\n)([\s\S]*?)(\s*<!-- BARBACOE-DATA-SCRIPTS:END -->)/;

export function readIndexScripts() {
  const html = readFileSync(INDEX_PATH, "utf8");
  const m = html.match(SCRIPTS_BLOCK_RE);
  if (!m) throw new Error("index.html: BARBACOE-DATA-SCRIPTS markers not found");
  // Each line that is a <script src="...">.
  const lines = m[2].split("\n").map((l) => l.trim()).filter(Boolean);
  const scripts = lines
    .map((l) => (l.match(/<script src="([^"]+)"><\/script>/) || [, null])[1])
    .filter(Boolean);
  return { html, scripts };
}

export function writeIndexScripts(scripts) {
  const html = readFileSync(INDEX_PATH, "utf8");
  const block = scripts.map((s) => `  <script src="${s}"></script>`).join("\n");
  // The END marker capture includes its leading whitespace, so we just supply
  // a newline after the block; "end" itself starts with "\n  ".
  const next = html.replace(SCRIPTS_BLOCK_RE, (_, start, _mid, end) => `${start}${block}${end}`);
  writeFileSync(INDEX_PATH, next);
}

export function ensureScript(src) {
  const { scripts } = readIndexScripts();
  if (scripts.includes(src)) return false;
  scripts.push(src);
  writeIndexScripts(scripts);
  return true;
}

// ---- categories.js ----
export function readCategoriesText() { return readFileSync(CATEGORIES_PATH, "utf8"); }
export function writeCategoriesText(t) { writeFileSync(CATEGORIES_PATH, t); }

const CATEGORY_LINE_RE =
  /BarbacoeData\.addCategory\(\s*\{\s*id:\s*"([^"]+)"[\s\S]*?\}\s*\);/g;

export function listCategories() {
  // Light parse via regex to avoid evaluating browser globals in Node.
  const text = readCategoriesText();
  const out = [];
  for (const m of text.matchAll(CATEGORY_LINE_RE)) {
    const block = m[0];
    const get = (k) => {
      const mm = block.match(new RegExp(k + ':\\s*"([^"]*)"'));
      return mm ? mm[1] : null;
    };
    const num = (k) => {
      const mm = block.match(new RegExp(k + ":\\s*(\\d+)"));
      return mm ? Number(mm[1]) : null;
    };
    out.push({
      id: get("id"),
      label: get("label"),
      volume: get("volume"),
      beerCount: num("beerCount"),
    });
  }
  return out;
}

export function categoryExists(id) {
  return listCategories().some((c) => c.id === id);
}

export function appendCategoryLine(category) {
  const text = readCategoriesText();
  const trimmed = text.replace(/\s*$/, "");
  const beer = category.beerCount ? `, beerCount: ${category.beerCount}` : "";
  const line = `BarbacoeData.addCategory({ id: ${JSON.stringify(category.id)}, label: ${JSON.stringify(category.label)}, volume: ${JSON.stringify(category.volume)}${beer} });`;
  writeCategoriesText(`${trimmed}\n${line}\n`);
}

// ---- results/<id>.js ----
export function resultsPath(categoryId) {
  return join(RESULTS_DIR, `${categoryId}.js`);
}

export function resultsFileExists(categoryId) {
  return existsSync(resultsPath(categoryId));
}

export function createResultsFile(category) {
  const path = resultsPath(category.id);
  const header = `// ${category.label} (${category.volume}) results.\n// Edit manually or use \`node tools/add-entry.js ${category.id} <name> <timeSeconds>\`.\n`;
  const body = `BarbacoeData.addResults(${JSON.stringify(category.id)}, [\n]);\n`;
  writeFileSync(path, header + body);
}

const RESULTS_TAIL_RE = /(\n)?(\s*)\]\s*\)\s*;\s*$/m;

export function appendResultEntry(categoryId, name, timeSeconds, date) {
  const path = resultsPath(categoryId);
  if (!existsSync(path)) {
    throw new Error(`No results file for category "${categoryId}". Add the category first.`);
  }
  const text = readFileSync(path, "utf8");
  const m = text.match(RESULTS_TAIL_RE);
  if (!m) throw new Error(`Could not locate the closing "]);" in ${path}`);

  // Detect existing indent (default 2 spaces).
  const itemIndent = (text.match(/\n( +)\{ name:/) || [, "  "])[1];
  const datePart = date ? `, date: ${JSON.stringify(date)}` : "";
  const formatted = `{ name: ${JSON.stringify(name)}, timeSeconds: ${timeSeconds}${datePart} }`;

  // Slice up the file at the closing tail and insert before it.
  const tailStart = text.length - m[0].length;
  const before = text.slice(0, tailStart).replace(/\s*$/, "");
  const after = text.slice(tailStart);

  // Determine if there are existing entries (look for "{ name:" in `before`).
  const hasExisting = /\{\s*name:/.test(before);
  const sep = hasExisting ? "," : "";
  const next = `${before}${sep}\n${itemIndent}${formatted}${after}`;
  writeFileSync(path, next);
}

// ---- date ----
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isValidDate(s) {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}
export function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
