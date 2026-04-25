#!/usr/bin/env node
// Add a new category. Creates data/results/<id>.js, appends to
// data/categories.js, and inserts a <script> tag in index.html
// (between the BARBACOE-DATA-SCRIPTS markers).
//
// Usage:
//   node tools/add-category.js <id> <label> <volume> [beerCount]
//   node tools/add-category.js --help
//
// Examples:
//   node tools/add-category.js xl "Extra Large" "1.50 L"
//   node tools/add-category.js double-meter "Double Meter" "22 × 0.25 L" 22

import {
  appendCategoryLine, categoryExists, createResultsFile,
  resultsFileExists, ensureScript,
} from "./_common.js";

function usage(code = 0) {
  process.stdout.write(`Usage:
  node tools/add-category.js <id> <label> <volume> [beerCount]
  node tools/add-category.js --help

Examples:
  node tools/add-category.js xl "Extra Large" "1.50 L"
  node tools/add-category.js double-meter "Double Meter" "22 × 0.25 L" 22

The id should be lowercase, alphanumeric (dashes allowed). It becomes the
file name (data/results/<id>.js) and the JSON key for results.
`);
  process.exit(code);
}

function main(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) usage(0);
  if (argv.length < 3 || argv.length > 4) {
    console.error("Error: expected 3 or 4 arguments (id, label, volume, [beerCount]).\n");
    usage(1);
  }
  const [id, label, volume, beerCountStr] = argv;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    console.error(`Error: id must be lowercase alphanumeric (dashes ok). Got "${id}".`);
    process.exit(1);
  }
  if (!label.trim() || !volume.trim()) {
    console.error("Error: label and volume must not be empty.");
    process.exit(1);
  }
  if (categoryExists(id)) {
    console.error(`Error: category "${id}" already exists.`);
    process.exit(1);
  }

  let beerCount = null;
  if (beerCountStr !== undefined) {
    beerCount = Number(beerCountStr);
    if (!Number.isInteger(beerCount) || beerCount <= 0) {
      console.error(`Error: beerCount must be a positive integer (got "${beerCountStr}").`);
      process.exit(1);
    }
  }

  const cat = { id, label: label.trim(), volume: volume.trim(), beerCount };

  appendCategoryLine(cat);

  if (resultsFileExists(id)) {
    console.log(`ℹ data/results/${id}.js already exists; leaving it alone.`);
  } else {
    createResultsFile(cat);
    console.log(`✅ Created data/results/${id}.js`);
  }

  const inserted = ensureScript(`data/results/${id}.js`);
  if (inserted) console.log(`✅ Added <script src="data/results/${id}.js"> to index.html`);
  else console.log(`ℹ <script> for data/results/${id}.js was already in index.html`);

  console.log(`✅ Added category "${id}" to data/categories.js`);
}

try { main(process.argv.slice(2)); }
catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }
