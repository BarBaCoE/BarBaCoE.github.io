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

## Data

- Inlined inside `index.html` as `<script type="application/json" id="results-data">` so the page works via double-click `file://`.
- Sorted ascending by `timeSeconds` per category.
- Ties: same rank, alphabetical by name.

## Styling

- Accent: `#EBA0C3` (logo pink).
- CSS custom properties on `:root`; dark mode flips via `:root[data-theme="dark"]`.
- Theme persisted in `localStorage` under key `barbacoe-theme`. First visit respects `prefers-color-scheme`.

## Conventional commits used

- `chore:` — repo/tooling
- `feat:` — user-facing functionality
- `style:` — CSS / visual polish
- `docs:` — README / markdown
- `fix:` — bug fixes
