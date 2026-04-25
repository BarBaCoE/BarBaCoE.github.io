# Implementation Notes

Decisions and gotchas discovered during implementation. Keep this updated as we go.

## SVG structure (`assets/barbacoe_logo.svg`)

- `viewBox="0 0 2048 2048"` — square.
- Color classes:
  - `.st0` — white fill, black stroke (eyes / details)
  - `.st1` — solid pink `#EBA0C3` (the **body interior / "filling"**)
  - `.st2` — light blush `#E9CFD8` with black stroke (the **head/face/outline shell**)
- Dark line-art lives inside the bottom `<g transform="translate(0,2048) scale(0.1,-0.1)">` group — these are detail paths, not pink.
- White eyes sit in `Layer_9`, `Layer_10`, `Layer_11` (`.st0`).

## Drain animation strategy

- We treat **`.st1` elements as "the beer"** (the saturated pink filling). They get clipped/animated.
- `.st2` (lighter blush head/outline) stays static — it acts like the **glass / container** so the character outline remains visible while emptying.
- Implementation:
  1. Clone the SVG from a hidden `<template id="logo-template">` per contestant (no `fetch()` — works on `file://`).
  2. Assign unique `clipId` per instance (counter).
  3. Compute combined bounding box of all `.st1` elements via `getBBox()` (requires the SVG to be in the DOM first — render, then attach animation).
  4. Inject `<defs><clipPath id={clipId}><rect .../></clipPath></defs>`.
  5. Set `clip-path="url(#{clipId})"` on every `.st1` element.
  6. Animate the rect with `requestAnimationFrame` (max compat — animating SVG `y`/`height` via WAAPI is spotty across browsers): from full bbox → zero-height at the bottom.
- End state: pink fully drained, outline remains visible.
- Reset: cancel rAF loops in active panel, restore rect to full size, kick off a new run.
- **Lazy attach**: hidden panels (`display:none`) return zeros from `getBBox()`, so we only attach the animation the first time a panel becomes active. Subsequent plays just reset the existing clip rect.
- **White backing**: for each `.st1` element we insert a white-filled clone of it directly behind the original (same shape, no clip-path). As the pink drains, the backing shows through so the emptied area looks like an empty glass instead of the page background.

## Data

- Inlined inside `index.html` as `<script type="application/json" id="results-data">` so the page works via double-click `file://`.
- Sorted ascending by `timeSeconds` per category.
- Ties: same rank, alphabetical by name.

## Styling

- Accent: `#EBA0C3` (logo pink).
- CSS custom properties on `:root`; dark mode flips via `:root[data-theme="dark"]`.
- Theme persisted in `localStorage` under key `barbacoe-theme`. First visit respects `prefers-color-scheme`.

## Why no ES modules

Browsers block `<script type="module">` from `file://` URLs (CORS). Since the
requirement is double-click `file://` support, both JS files are plain scripts:

- `js/animation.js` runs in an IIFE and exposes `window.BarbacoeAnim`.
- `js/app.js` reads from `window.BarbacoeAnim`.
- They are loaded in order in `index.html` (animation first, then app).

## Multi-beer categories (e.g. Meter)

- Categories may declare `"beerCount": N` (default 1).
- For multi-beer categories the rank-item logo wrapper gets class `multi` and contains N cloned SVGs in a horizontal flex row.
- Per-beer duration = `timeSeconds / N`. Beers play **sequentially** (not simultaneously): a `setTimeout` schedules each beer's drain to start when the previous one finishes.
- On reset/replay, any pending `setTimeout`s from the previous run are cleared and all beers are reset to full before re-staging.
- `attachDrainAnimation(svg, duration, { autoplay: false })` skips the immediate play so the scheduler in `app.js` can stage all beers consistently. `resetToFull(svg, duration)` resets the clip rect without playing.

## Per-contestant dialog

- Clicking any rank-item (or pressing Enter/Space when focused) opens a `<dialog>` with that person's **best time per category**.
- Best time = minimum `timeSeconds` for that `(name, category)` pair across all results.
- For categories where the person has no entry, the beer(s) render **fully filled** with no animation attached — the visual cue for "did not compete".
- Categories with multiple beers (e.g. Meter) play sequentially using the same scheduler logic as the panel view.
- Animations are staged inside `requestAnimationFrame` after `showModal()` so layout is complete and `getBBox()` returns real values.
- The parsed data is cached on a module-scoped `DATA` variable so the dialog can query it without re-parsing the inlined JSON.

## CLI tool: `tools/add-entry.js`

- Plain Node.js script (uses ESM, no dependencies). Run with any modern Node.
- Surgically edits the `<script type="application/json" id="results-data">` block in `index.html` instead of re-serialising the whole JSON, so existing formatting (one-line-per-result, comments outside the block) is preserved.
- Validates: category exists, time is a positive number, name is non-empty, and the post-edit JSON still parses before writing.
- Falls back to a full re-serialise if the regex-based insertion can't find the array's closing bracket (e.g. someone manually reformatted the block).

## Per-category icons

- Categories may declare `"icon": "pitcher"` to use a different SVG (default = the original character logo).
- Each icon variant is inlined as its own `<template id="logo-template-...">` in `index.html`.
- `cloneLogoSvg(iconId)` picks the right template and falls back to the default if an unknown id is requested.
- The pitcher icon (`assets/barbacoe_pitcher.svg`) keeps the same `.st0`/`.st1`/`.st2` class scheme, so the existing drain animation (clip on `.st1`) and white-backing logic both work without changes.

## Conventional commits used

- `chore:` — repo/tooling
- `feat:` — user-facing functionality
- `style:` — CSS / visual polish
- `docs:` — README / markdown
- `fix:` — bug fixes
