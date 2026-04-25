#!/usr/bin/env node
// Add multiple results for one contestant in a single command.
//
// Usage:
//   node tools/add-contestant.js [--date YYYY-MM-DD] <name> <category>=<time> [<category>=<time> ...]
//   node tools/add-contestant.js --help
//
// Date defaults to today and applies to all entries in this invocation.

import {
  listCategories, appendResultEntry,
  isValidDate, todayIso,
} from "./_common.js";

function usage(code = 0) {
  process.stdout.write(`Usage:
  node tools/add-contestant.js [--date YYYY-MM-DD] <name> <category>=<time> [...]
  node tools/add-contestant.js --help

Date defaults to today. Format YYYY-MM-DD.

Examples:
  node tools/add-contestant.js "Alice" small=3.8 medium=7.1 large=14.2
  node tools/add-contestant.js --date 2026-04-25 "Henry" meter=38.5
`);
  process.exit(code);
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

  const { date: flagDate, positional } = parseArgs(argv);
  if (positional.length < 2) {
    console.error("Error: expected a name and at least one <category>=<time> pair.\n");
    usage(1);
  }
  const date = flagDate || todayIso();
  if (!isValidDate(date)) {
    console.error(`Error: date must be YYYY-MM-DD (got "${date}").`);
    process.exit(1);
  }

  const [name, ...pairs] = positional;
  if (!name || !name.trim()) {
    console.error("Error: name must not be empty.");
    process.exit(1);
  }

  const known = new Set(listCategories().map((c) => c.id));
  const parsed = [];
  for (const p of pairs) {
    const m = p.match(/^([a-z0-9][a-z0-9-]*)=(.+)$/);
    if (!m) {
      console.error(`Error: invalid pair "${p}" (expected category=time).`);
      process.exit(1);
    }
    const category = m[1];
    const timeSeconds = Number(m[2]);
    if (!isFinite(timeSeconds) || timeSeconds <= 0) {
      console.error(`Error: time for "${category}" must be a positive number (got "${m[2]}").`);
      process.exit(1);
    }
    if (!known.has(category)) {
      console.error(`Error: unknown category "${category}". Known: ${[...known].join(", ")}`);
      process.exit(1);
    }
    parsed.push({ category, timeSeconds });
  }

  for (const { category, timeSeconds } of parsed) {
    appendResultEntry(category, name.trim(), timeSeconds, date);
    console.log(`✅ ${category}: ${name.trim()} = ${timeSeconds}s on ${date}`);
  }
}

try { main(process.argv.slice(2)); }
catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }
