#!/usr/bin/env node
// Add a contestant result to the inlined data block in index.html.
//
// Usage:
//   node tools/add-entry.js <category> <name> <timeSeconds>
//   node tools/add-entry.js --list                         # list categories
//   node tools/add-entry.js --help
//
// Examples:
//   node tools/add-entry.js small "Alice" 3.8
//   node tools/add-entry.js meter "Henry" 38.5
//
// The script edits index.html in place, preserving the surrounding markup
// and the existing JSON formatting style.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(HERE, "..", "index.html");
const BLOCK_RE =
  /(<script type="application\/json" id="results-data">)([\s\S]*?)(<\/script>)/;

function readBlock() {
  const html = readFileSync(INDEX_PATH, "utf8");
  const m = html.match(BLOCK_RE);
  if (!m) {
    throw new Error("Could not find the results-data <script> block in index.html");
  }
  return { html, prefix: m[1], jsonText: m[2], suffix: m[3] };
}

function parseData(jsonText) {
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Existing JSON in index.html is invalid: ${e.message}`);
  }
}

function usage(exitCode = 0) {
  const text = `Usage:
  node tools/add-entry.js <category> <name> <timeSeconds>
  node tools/add-entry.js --list
  node tools/add-entry.js --help

Examples:
  node tools/add-entry.js small "Alice" 3.8
  node tools/add-entry.js meter "Henry" 38.5
`;
  process.stdout.write(text);
  process.exit(exitCode);
}

function listCategories() {
  const { jsonText } = readBlock();
  const data = parseData(jsonText);
  console.log("Categories:");
  for (const c of data.categories) {
    const extra = c.beerCount ? ` [${c.beerCount} beers]` : "";
    console.log(`  ${c.id.padEnd(8)} ${c.label}  (${c.volume})${extra}`);
  }
}

function formatEntry(entry) {
  // Match the existing one-line-per-result style:
  // { "category": "small", "name": "Alice", "timeSeconds": 3.8 }
  return `{ "category": "${entry.category}", "name": ${JSON.stringify(entry.name)}, "timeSeconds": ${entry.timeSeconds} }`;
}

function addEntry(category, name, timeSeconds) {
  const { html, prefix, jsonText, suffix } = readBlock();
  const data = parseData(jsonText);

  const cat = data.categories.find((c) => c.id === category);
  if (!cat) {
    const ids = data.categories.map((c) => c.id).join(", ");
    throw new Error(`Unknown category "${category}". Known: ${ids}`);
  }

  const entry = { category, name, timeSeconds };

  // Try to insert the new entry textually, right before the closing `]` of
  // the results array, on its own line. This preserves the existing layout.
  const indent = (jsonText.match(/\n( +)\{ "category"/) || [, "      "])[1];
  const formatted = formatEntry(entry);

  // Find the results array's closing `]`. We assume it's the last `]` before
  // the trailing `}` of the JSON object.
  const endResultsRe = /\n( *)\](\s*\}\s*)$/;
  const m = jsonText.match(endResultsRe);
  if (!m) {
    // Fallback: re-serialize the whole thing.
    data.results.push(entry);
    const newJson = "\n  " + JSON.stringify(data, null, 2).replace(/\n/g, "\n  ") + "\n  ";
    const newHtml = html.replace(BLOCK_RE, `${prefix}${newJson}${suffix}`);
    writeFileSync(INDEX_PATH, newHtml);
    return entry;
  }

  // Insert: ",\n<indent><formatted>" before the closing bracket.
  const insertionPoint = jsonText.length - m[0].length;
  const before = jsonText.slice(0, insertionPoint);
  const after = jsonText.slice(insertionPoint);
  // Ensure the previous line ends with a comma.
  const beforeTrimmed = before.replace(/\s*$/, "");
  const newJsonText = `${beforeTrimmed},\n${indent}${formatted}${after}`;

  // Sanity-check: still valid JSON.
  try { JSON.parse(newJsonText); } catch (e) {
    throw new Error(`Refusing to write: produced invalid JSON (${e.message})`);
  }

  const newHtml = html.replace(BLOCK_RE, `${prefix}${newJsonText}${suffix}`);
  writeFileSync(INDEX_PATH, newHtml);
  return entry;
}

function main(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) usage(0);
  if (argv.includes("--list")) { listCategories(); return; }

  if (argv.length !== 3) {
    console.error("Error: expected 3 arguments (category, name, timeSeconds).\n");
    usage(1);
  }

  const [category, name, timeStr] = argv;
  const timeSeconds = Number(timeStr);
  if (!isFinite(timeSeconds) || timeSeconds <= 0) {
    console.error(`Error: timeSeconds must be a positive number (got "${timeStr}").`);
    process.exit(1);
  }
  if (!name || !name.trim()) {
    console.error("Error: name must not be empty.");
    process.exit(1);
  }

  const entry = addEntry(category, name.trim(), timeSeconds);
  console.log(`\u2705 Added: ${formatEntry(entry)}`);
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error(`\u274c ${e.message}`);
  process.exit(1);
}
