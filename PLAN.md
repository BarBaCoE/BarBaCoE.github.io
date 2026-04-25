# Barbacoe Beer Ranking — Static Website Plan

A static website that ranks contestants by how quickly they drink a beer, per category. Each contestant has an animated barbacoe logo whose pink "filling" drains from top to bottom over their drinking time.

## 1. Project structure

```
barbacoe_bak/
├── index.html              # Single-page app (data inlined here)
├── css/
│   └── styles.css          # Barbacoe-themed + dark mode
├── js/
│   ├── app.js              # Tabs, rendering, reset, dark-mode toggle
│   └── animation.js        # SVG drain animation logic
├── assets/
│   └── barbacoe_logo.svg   # Existing logo (untouched on disk)
└── README.md               # How to add results / deploy
```

No build step. Works by double-clicking `index.html` **or** serving with any static server. Paths are relative so it works on GitHub Pages too.

## 2. Data model (inlined in `index.html`)

The data lives in a `<script type="application/json" id="results-data">` tag inside `index.html`. This avoids `fetch()` issues when opening the file via `file://`.

```html
<script type="application/json" id="results-data">
{
  "categories": [
    { "id": "small",  "label": "Small",  "volume": "0.25 L" },
    { "id": "medium", "label": "Medium", "volume": "0.50 L" },
    { "id": "large",  "label": "Large",  "volume": "1.00 L" },
    { "id": "meter",  "label": "Meter",  "volume": "11 × 0.25 L" }
  ],
  "results": [
    { "category": "small",  "name": "Alice", "timeSeconds": 3.8 },
    { "category": "small",  "name": "Bob",   "timeSeconds": 5.2 },
    { "category": "medium", "name": "Alice", "timeSeconds": 7.1 }
  ]
}
</script>
```

Adding a result = edit this block in `index.html`, commit, redeploy. The app sorts by `timeSeconds` ascending per category.

## 3. The SVG drain animation

The logo's pink "filling" lives in `Layer_3` and `Layer_2` (paths with `fill="#EBA0C3"`/`class="st1"`) — the body/contents of the character. Outlines and other parts stay static.

**Approach: SVG `<clipPath>` with an animated rectangle.**

Plan:
1. **One-time SVG prep** (done in `animation.js` at runtime, so the source SVG file stays untouched):
   - Load the SVG once via `fetch('assets/barbacoe_logo.svg')` (or, to stay 100% `file://`-friendly, inline the SVG markup in `index.html` as a hidden `<template>`).
   - Compute the bounding box of the pink shapes (roughly `y ≈ 730 → 1350` in the 2048-viewBox).
   - Inject a `<clipPath id="beer-clip-{uid}">` containing a `<rect>` covering that bbox.
   - Wrap the pink-filled paths in a `<g clip-path="url(#beer-clip-{uid})">`.
2. **Animation**: animate the clip rect's `y` from `bboxTop` → `bboxBottom` over `timeSeconds` using the **Web Animations API** (`element.animate(...)`) — duration is per-contestant, and we get clean `play()` / `cancel()` for the reset button.
3. **End state**: pink stays fully clipped (empty) — outlines remain visible.
4. **Per-instance uniqueness**: each rendered logo gets its own `uid` so clip paths don't collide.
5. **Easing**: linear by default (drinking is steady-ish); easy to tweak later.

This way the original `barbacoe_logo.svg` is loaded once, cloned per contestant, and modified in-memory. No manual SVG editing needed.

## 4. UI / interactions

- **Header**: site title, dark-mode toggle (☀/🌙), persisted in `localStorage`.
- **Tabs**: one per category (Small / Medium / Large / Meter). Clicking switches the visible panel. Active tab's animations auto-play; switching tabs re-triggers play for the newly visible panel.
- **Per category panel**:
  - Category title + volume subtitle.
  - "🔄 Reset" button — replays all animations in the active category.
  - Ranked list (1st, 2nd, 3rd, …): rank badge, name, time (`4.2 s`), animated logo (~120–160 px).
  - Top 3 get medal emojis (🥇🥈🥉) and slightly larger logos.
- **Auto-play**: on page load and on tab switch, all visible logos start their drain animation simultaneously — visually, the fastest contestants empty first, which is the fun part.

## 5. Styling (barbacoe theme + dark mode)

- Accent color: `#EBA0C3` (the logo pink).
- **Light mode**: warm off-white background (`#FFF7FA`), dark text, pink accents on tabs/buttons/medals.
- **Dark mode**: deep neutral background (`#1a1418` — slightly warm), light text, same pink accents (which pop nicely on dark).
- Implemented via CSS custom properties on `:root` and `:root[data-theme="dark"]`.
- System fonts (`system-ui, sans-serif`), playful headings (slightly bolder/italic), generous spacing.
- Toggle stores choice in `localStorage`; respects `prefers-color-scheme` on first visit.

## 6. Implementation order

1. Scaffold files + minimal `index.html` (with inlined JSON data block) and `styles.css` with theme variables and dark-mode toggle.
2. Parse the inlined JSON and render: tabs + ranked list (no animation yet, just static logos).
3. Build the SVG clip-path injector and Web Animations API drain animation; wire up auto-play and reset.
4. Polish: medals, transitions, responsive layout (logos wrap on narrow screens).
5. Write `README.md` with: how to add a contestant (edit the JSON block), how to run locally (just open `index.html`), how to deploy to GitHub Pages.

## 7. Open assumptions (flag now if any are wrong)

- **Ties on time**: shown with the same rank number, listed alphabetically.
- **Logo size** in the list: ~140 px wide; on mobile, list items stack vertically.
- **Number of contestants per category**: assumed small (say <50) — no virtualization/pagination needed.
- **SVG loading**: if the user wants strict `file://` double-click support, the SVG markup will also be inlined into `index.html` (as a hidden `<template>`) instead of fetched. Otherwise `fetch()` from `assets/barbacoe_logo.svg` is fine when served over `http://`.
- **Per-contestant data fields**: just `rank, name, time, animated logo`. No photos, dates, teams, etc. (easy to add later).
