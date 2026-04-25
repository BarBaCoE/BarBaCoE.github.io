#!/usr/bin/env node
// Add a contestant result to a category's data file.
//
// Usage:
//   node tools/add-entry.js <category> <name> <timeSeconds>
//   node tools/add-entry.js --list
//   node tools/add-entry.js --help

import { listCategories, categoryExists, appendResultEntry } from "./_common.js";

function usage(code = 0) {
  process.stdout.write(`Usage:
  node tools/add-entry.js <category> <name> <timeSeconds>
  node tools/add-entry.js --list
  node tools/add-entry.js --help

Examples:
  node tools/add-entry.js small "Alice" 3.8
  node tools/add-entry.js meter "Henry" 38.5
`);
  process.exit(code);
}

function listCmd() {
  console.log("Categories:");
  for (const c of listCategories()) {
    const beer = c.beerCount ? ` [${c.beerCount} beers]` : "";
    console.log(`  ${c.id.padEnd(8)} ${c.label}  (${c.volume})${beer}`);
  }
}

function main(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) usage(0);
  if (argv.includes("--list")) { listCmd(); return; }

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
  if (!categoryExists(category)) {
    const known = listCategories().map((c) => c.id).join(", ");
    console.error(`Error: unknown category "${category}". Known: ${known}`);
    process.exit(1);
  }

  appendResultEntry(category, name.trim(), timeSeconds);
  console.log(`✅ Added to data/results/${category}.js: { name: ${JSON.stringify(name.trim())}, timeSeconds: ${timeSeconds} }`);
}

try { main(process.argv.slice(2)); }
catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }
