#!/usr/bin/env node
// Add a contestant result to a category's data file.
//
// Usage:
//   node tools/add-entry.js <category> <name> <timeSeconds> [date]
//   node tools/add-entry.js --date YYYY-MM-DD <category> <name> <timeSeconds>
//   node tools/add-entry.js --list
//   node tools/add-entry.js --help
//
// Date defaults to today (YYYY-MM-DD).

import {
  listCategories, categoryExists, appendResultEntry,
  isValidDate, todayIso,
} from "./_common.js";

function usage(code = 0) {
  process.stdout.write(`Usage:
  node tools/add-entry.js <category> <name> <timeSeconds> [date]
  node tools/add-entry.js --date YYYY-MM-DD <category> <name> <timeSeconds>
  node tools/add-entry.js --list
  node tools/add-entry.js --help

If date is omitted, today is used. Date format is YYYY-MM-DD.

Examples:
  node tools/add-entry.js small "Alice" 3.8
  node tools/add-entry.js small "Alice" 3.8 2026-04-25
  node tools/add-entry.js --date 2026-04-25 small "Alice" 3.8
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

function parseArgs(argv) {
  let date = null;
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date") { date = argv[++i]; continue; }
    positional.push(a);
  }
  return { date, positional };
}

function main(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) usage(0);
  if (argv.includes("--list")) { listCmd(); return; }

  const { date: flagDate, positional } = parseArgs(argv);
  if (positional.length < 3 || positional.length > 4) {
    console.error("Error: expected 3 or 4 positional arguments (category, name, timeSeconds, [date]).\n");
    usage(1);
  }
  const [category, name, timeStr, posDate] = positional;
  const date = flagDate || posDate || todayIso();

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
  if (!isValidDate(date)) {
    console.error(`Error: date must be YYYY-MM-DD (got "${date}").`);
    process.exit(1);
  }

  appendResultEntry(category, name.trim(), timeSeconds, date);
  console.log(`✅ Added to data/results/${category}.js: { name: ${JSON.stringify(name.trim())}, timeSeconds: ${timeSeconds}, date: ${JSON.stringify(date)} }`);
}

try { main(process.argv.slice(2)); }
catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }
