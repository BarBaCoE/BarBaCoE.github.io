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

Open `index.html` and find the block:

```html
<script type="application/json" id="results-data">
  { ... }
</script>
```

Edit it. Each result is just:

```json
{ "category": "small", "name": "Alice", "timeSeconds": 3.8 }
```

`category` must match one of the `id`s in `categories` (`small`, `medium`,
`large`, `meter`). `timeSeconds` is a number — the drain animation will run
for exactly that many seconds.

To add a new category, append to the `categories` array:

```json
{ "id": "shoey", "label": "Shoey", "volume": "size 9 boot" }
```

Save and reload the page. Done.

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
├── index.html            # Markup + inlined data + inlined SVG template
├── css/styles.css        # Theme variables, layout, dark mode
├── js/
│   ├── animation.js      # SVG drain animation (clipPath + rAF)
│   └── app.js            # Tabs, rendering, theme toggle
├── assets/barbacoe_logo.svg
├── PLAN.md               # Original design plan
└── NOTES.md              # Implementation decisions / gotchas
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
