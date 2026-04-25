---
name: barbacoe-data
description: Add results, contestants, or new categories to the Barbacoe beer ranking site (under leaderboard/). Use when the user asks to add a competition result, record a contestant's times, create a new beer category, or otherwise edit data under leaderboard/data/ in this repo.
---

# Barbacoe data editing

The leaderboard site lives under `leaderboard/` in this repo (the rest of
the repo is the main `barbacoe.nl` page). Its data is in plain JS files
under `leaderboard/data/`, loaded as non-module `<script>` tags so the page
works on `file://`. Three CLI tools in `leaderboard/tools/` edit those
files (and `leaderboard/index.html` for new categories) without needing a
build step or any dependencies.

**Always prefer the CLI tools over hand-editing.** They preserve formatting,
validate input (positive times, real calendar dates, known categories), and—
for new categories—also update `leaderboard/index.html` between the
`<!-- BARBACOE-DATA-SCRIPTS:START/END -->` markers.

All commands below assume you run them from the **repo root**. They use
`leaderboard/...` paths. If you `cd leaderboard` first, drop the prefix.

## Layout (for context)

```
leaderboard/
  data/
    bootstrap.js          # defines window.BarbacoeData (do not edit unless changing the schema)
    categories.js         # one BarbacoeData.addCategory(...) per category
    results/
      <category>.js       # one file per category, BarbacoeData.addResults(<id>, [...])
  tools/
    add-entry.js          # add one result
    add-contestant.js     # add many results for one person
    add-category.js       # create a new category (file + script tag in leaderboard/index.html)
    _common.js            # shared helpers (do not invoke directly)
```

Result entry schema: `{ name: string, timeSeconds: number, date: "YYYY-MM-DD" | null }`.

## Adding a single result

```bash
node leaderboard/tools/add-entry.js <category> <name> <timeSeconds> [date]
node leaderboard/tools/add-entry.js --date YYYY-MM-DD <category> <name> <timeSeconds>
```

- `category` must already exist (`small`, `medium`, `large`, `meter`, ...).
  Run `node leaderboard/tools/add-entry.js --list` to see them.
- `timeSeconds` is a positive number (e.g. `3.8`).
- `date` defaults to today (local time) and must be a real `YYYY-MM-DD`
  date. `2025-02-29` and `2026-13-99` are rejected.

Examples:
```bash
node leaderboard/tools/add-entry.js small "Alice" 3.8                  # date = today
node leaderboard/tools/add-entry.js small "Alice" 3.8 2026-04-25
node leaderboard/tools/add-entry.js --date 2026-04-25 medium "Bob" 7.4
```

## Adding several results for one contestant on one day

```bash
node leaderboard/tools/add-contestant.js [--date YYYY-MM-DD] <name> <category>=<time> [...]
```

The `--date` (or default of today) applies to every entry in the call.

```bash
node leaderboard/tools/add-contestant.js "Alice" small=3.8 medium=7.1 large=14.2
node leaderboard/tools/add-contestant.js --date 2026-04-25 "Henry" meter=38.5 small=4.1
```

## Adding a new category

```bash
node leaderboard/tools/add-category.js <id> <label> <volume> [beerCount]
```

This will:
1. Create `leaderboard/data/results/<id>.js` (empty result list).
2. Append a `BarbacoeData.addCategory(...)` call to `leaderboard/data/categories.js`.
3. Insert `<script src="data/results/<id>.js"></script>` into `leaderboard/index.html`
   inside the `<!-- BARBACOE-DATA-SCRIPTS:START/END -->` block.

Field rules:
- `id`: lowercase alphanumeric with optional dashes. Becomes the file name
  and the JSON key linking results to the category. Must be unique.
- `label`: human-readable name shown on the tab (e.g. `"Extra Large"`).
- `volume`: free-form display string (e.g. `"1.50 L"`, `"22 × 0.25 L"`).
- `beerCount`: optional positive integer. Set this for multi-beer categories
  like a Meter (`11`) or Double Meter (`22`); the UI will render that many
  beer SVGs and animate them sequentially. Omit for single-beer categories.

Examples:
```bash
node leaderboard/tools/add-category.js xl "Extra Large" "1.50 L"
node leaderboard/tools/add-category.js double-meter "Double Meter" "22 × 0.25 L" 22
```

After adding the category, add results to it the normal way:
```bash
node leaderboard/tools/add-entry.js xl "Alice" 11.2
```

## Manual edits (only if the CLI cannot handle it)

If you must hand-edit (e.g. fixing a typo, removing an entry, reordering),
edit the relevant file directly:

- Fixing or deleting a result: edit `leaderboard/data/results/<id>.js`. Keep the
  `BarbacoeData.addResults("<id>", [ ... ]);` shape and the
  `{ name, timeSeconds, date }` entry shape.
- Removing a category: delete `leaderboard/data/results/<id>.js`, remove its
  `addCategory` line from `leaderboard/data/categories.js`, and remove the matching
  `<script src="data/results/<id>.js">` line from `leaderboard/index.html` between the
  `BARBACOE-DATA-SCRIPTS` markers.
- Renaming a category id: rename the file under `leaderboard/data/results/`, update
  the `id` in `leaderboard/data/categories.js`, update the first arg of
  `addResults(...)` inside the file, and update the `<script>` src in
  `leaderboard/index.html`.

After any manual edit, double-check by running
`node leaderboard/tools/add-entry.js --list` (it parses the data files and
will fail loudly if the category list is malformed).

## Verifying changes

The site is fully static. To eyeball the change:

```bash
# Open directly:
xdg-open leaderboard/index.html

# Or serve locally if you need a real http origin for some reason:
( cd leaderboard && python3 -m http.server 8000 )
```

The drain animation runs for exactly `timeSeconds`, so very small or very
large values are visually obvious if you fat-fingered them.

## Don'ts

- Don't `npm install` anything—there are zero dependencies and no
  `package.json` at the repo root. `leaderboard/tools/package.json` only
  declares `"type": "module"` for ESM.
- Don't reintroduce inlined JSON in `leaderboard/index.html`; the data must
  stay split across `leaderboard/data/` so the CLI tools and manual editors
  stay sane.
- Don't remove the `<!-- BARBACOE-DATA-SCRIPTS:START/END -->` markers—
  `leaderboard/tools/add-category.js` needs them to know where to insert
  script tags.
- Don't touch the root site files (`index.html`, `default.css`, `darkmode.js`,
  `images/`, `CNAME`) when working on leaderboard data—those belong to the
  main `barbacoe.nl` page.
- Don't commit secrets, photos of contestants, or anything else not
  related to results/categories under `leaderboard/data/`.
