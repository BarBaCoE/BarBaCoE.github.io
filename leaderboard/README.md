# Barbacoe Beer Ranking 🍺

A tiny static website that ranks contestants by how quickly they drink a beer
in different categories (Small, Medium, Large, Meter). Each contestant has an
animated barbacoe logo whose pink "filling" drains from top to bottom over
their actual drinking time — so visually, the fastest contestant empties first.

![barbacoe logo](assets/barbacoe_logo.svg)

## Run it

No build step, no dependencies. Two options:

1. **Double-click** `index.html` and it opens in your browser. ✅ Works because
   both the data and the SVG are inlined into the HTML.
2. Or serve the folder with any static server, e.g.:
   ```bash
   python3 -m http.server 8000
   # then open http://localhost:8000
   ```

## Add / edit results

### Quick: use the CLI tools

```bash
# Add a single result (date defaults to today)
node tools/add-entry.js <category> <name> <timeSeconds> [date]
node tools/add-entry.js small "Alice" 3.8                  # uses today
node tools/add-entry.js small "Alice" 3.8 2026-04-25       # explicit date
node tools/add-entry.js --date 2026-04-25 small "Alice" 3.8

# Add many results for one contestant on the same day
node tools/add-contestant.js [--date YYYY-MM-DD] <name> <category>=<time> [...]
node tools/add-contestant.js "Alice" small=3.8 medium=7.1 large=14.2
node tools/add-contestant.js --date 2026-04-25 "Henry" meter=38.5

# Add a new category (creates data file + wires it into index.html)
node tools/add-category.js <id> <label> <volume> [beerCount]
node tools/add-category.js xl "Extra Large" "1.50 L"
node tools/add-category.js double-meter "Double Meter" "22 × 0.25 L" 22

# List categories
node tools/add-entry.js --list
```

Dates are `YYYY-MM-DD` and validated for actual calendar correctness (no
`2025-02-29`, no `2026-13-99`).

### Manual: edit the data files

### Manual: edit the data files

Data lives under `data/`:

- `data/categories.js` — one `BarbacoeData.addCategory({...})` per category.
- `data/results/<id>.js` — one file per category, with a list of
  `{ name, timeSeconds }` entries.

When adding a category by hand, also add a `<script src="data/results/<id>.js">`
inside the `<!-- BARBACOE-DATA-SCRIPTS:START/END -->` block in `index.html`.

## Features

- 📊 Tabs per category (auto-sorted by time, with tied ranks sharing a number).
- 🎞️ Auto-play drain animation on tab open, with a per-category 🔄 Reset button.
- 🥇🥈🥉 Medal styling for the top three.
- 🌙 Dark / light mode toggle (persisted in `localStorage`, respects
  `prefers-color-scheme` on first visit).
- 📱 Responsive layout for narrow screens.

## Project layout

```
.
├── index.html             # Markup + inlined SVG template
├── css/styles.css         # Theme variables, layout, dark mode
├── js/
│   ├── animation.js       # SVG drain animation (clipPath + rAF)
│   └── app.js             # Tabs, rendering, theme toggle, contestant dialog
├── data/
│   ├── bootstrap.js       # window.BarbacoeData with addCategory/addResults
│   ├── categories.js      # category definitions
│   └── results/
│       ├── small.js
│       ├── medium.js
│       ├── large.js
│       └── meter.js
├── tools/
│   ├── _common.js         # shared helpers
│   ├── add-entry.js       # add a single result
│   ├── add-contestant.js  # add many results for one contestant
│   └── add-category.js    # add a new category (file + script tag)
├── assets/barbacoe_logo.svg
├── PLAN.md                # Original design plan
└── NOTES.md               # Implementation decisions / gotchas
```

## Deploy

It's a plain static site. Drop the folder on:

- **GitHub Pages**: push to a repo, enable Pages on the `main` branch.
- **Netlify / Cloudflare Pages**: connect the repo, no build command, publish
  directory `/`.
- **Any web host**: just upload the files.

All paths are relative.

## License

Have fun. Drink responsibly.
