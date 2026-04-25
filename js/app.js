// Plain (non-module) script so the page works when opened via file://.
// Animation API comes from window.BarbacoeAnim (loaded before this script).
const { attachDrainAnimation, resetAndPlay, resetToFull } = window.BarbacoeAnim;

// Cache the parsed data globally so the contestant dialog can query it.
let DATA = null;

// ===== Theme =====
const THEME_KEY = "barbacoe-theme";

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.querySelector(".theme-toggle-icon").textContent = theme === "dark" ? "☀️" : "🌙";
}

function initThemeToggle() {
  applyTheme(getInitialTheme());
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

// ===== Data =====
function loadData() {
  const raw = document.getElementById("results-data").textContent;
  return JSON.parse(raw);
}

function rankResults(results) {
  // Sort by time ascending, then alphabetically by name as tiebreaker.
  const sorted = [...results].sort((a, b) => {
    if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
    return a.name.localeCompare(b.name);
  });
  // Assign ranks (ties share a rank).
  let prevTime = null;
  let prevRank = 0;
  return sorted.map((r, i) => {
    const rank = r.timeSeconds === prevTime ? prevRank : i + 1;
    prevTime = r.timeSeconds;
    prevRank = rank;
    return { ...r, rank };
  });
}

// ===== SVG cloning =====
let svgInstanceCounter = 0;

function cloneLogoSvg() {
  const tpl = document.getElementById("logo-template");
  // Find the <svg> inside the template content.
  const original = tpl.content.querySelector("svg");
  const clone = original.cloneNode(true);
  // Strip width/height; CSS controls size via the wrapping element.
  clone.removeAttribute("width");
  clone.removeAttribute("height");
  // Remove inline IDs to avoid duplicates across clones (none are referenced internally).
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  clone.dataset.instance = String(++svgInstanceCounter);
  return clone;
}

// ===== Rendering =====
function medalBadge(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function formatTime(s) {
  return s.toFixed(2).replace(/\.?0+$/, "") + " s";
}

function buildPanel(category, results) {
  const beerCount = Number.isInteger(category.beerCount) && category.beerCount > 0 ? category.beerCount : 1;
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = `panel-${category.id}`;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", `tab-${category.id}`);

  const header = document.createElement("div");
  header.className = "panel-header";
  header.innerHTML = `
    <div class="panel-title">
      <h2>${category.label}<span class="volume">${category.volume}</span></h2>
    </div>
    <button class="reset-btn" type="button" data-category="${category.id}">🔄 Reset</button>
  `;
  panel.appendChild(header);

  if (results.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No contestants yet. Edit results-data in index.html to add some!";
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement("ol");
  list.className = "ranking";

  for (const r of results) {
    const li = document.createElement("li");
    li.className = "rank-item" + (r.rank <= 3 ? ` top-${r.rank}` : "");

    const badge = document.createElement("div");
    badge.className = "rank-badge";
    badge.textContent = medalBadge(r.rank);

    const info = document.createElement("div");
    info.className = "rank-info";
    info.innerHTML = `
      <div class="rank-name"></div>
      <div class="rank-time"></div>
    `;
    info.querySelector(".rank-name").textContent = r.name;
    info.querySelector(".rank-time").textContent = formatTime(r.timeSeconds);

    const logoWrap = document.createElement("div");
    logoWrap.className = "rank-logo" + (beerCount > 1 ? " multi" : "");
    for (let i = 0; i < beerCount; i++) {
      logoWrap.appendChild(cloneLogoSvg());
    }
    // Stash total drinking time and beer count for the animation scheduler.
    logoWrap.dataset.duration = String(r.timeSeconds);
    logoWrap.dataset.beerCount = String(beerCount);

    li.appendChild(badge);
    li.appendChild(info);
    li.appendChild(logoWrap);
    li.dataset.name = r.name;
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.setAttribute("aria-label", `Show ${r.name}'s best efforts`);
    li.addEventListener("click", () => openContestantDialog(r.name));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openContestantDialog(r.name); }
    });
    list.appendChild(li);
  }

  panel.appendChild(list);
  return panel;
}

function buildTabs(categories) {
  const tabsEl = document.getElementById("tabs");
  tabsEl.innerHTML = "";
  categories.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.id = `tab-${cat.id}`;
    btn.type = "button";
    btn.role = "tab";
    btn.setAttribute("aria-controls", `panel-${cat.id}`);
    btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
    btn.dataset.category = cat.id;
    btn.textContent = cat.label;
    btn.addEventListener("click", () => activateTab(cat.id));
    tabsEl.appendChild(btn);
  });
}

function activateTab(categoryId) {
  document.querySelectorAll(".tab").forEach((t) => {
    t.setAttribute("aria-selected", t.dataset.category === categoryId ? "true" : "false");
  });
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.toggle("active", p.id === `panel-${categoryId}`);
  });
  // Re-trigger animations in the newly visible panel.
  const panel = document.getElementById(`panel-${categoryId}`);
  if (panel) playPanelAnimations(panel);
}

function playPanelAnimations(panel) {
  panel.querySelectorAll(".rank-logo").forEach((wrap) => {
    const svgs = Array.from(wrap.querySelectorAll("svg"));
    const totalDuration = parseFloat(wrap.dataset.duration);
    const beerCount = parseInt(wrap.dataset.beerCount, 10) || 1;
    if (svgs.length === 0 || !isFinite(totalDuration)) return;
    const perBeer = totalDuration / beerCount;

    // Cancel any pending sequential timers from a previous run.
    if (wrap._pendingTimers) {
      wrap._pendingTimers.forEach(clearTimeout);
    }
    wrap._pendingTimers = [];

    // Lazy attach on first play (hidden panels return 0 from getBBox).
    if (!wrap.dataset.attached) {
      svgs.forEach((svg) => attachDrainAnimation(svg, perBeer, { autoplay: false }));
      wrap.dataset.attached = "1";
    }

    // Reset all to full immediately, then play one-by-one.
    svgs.forEach((svg) => resetToFull(svg, perBeer));
    svgs.forEach((svg, i) => {
      const delayMs = i * perBeer * 1000;
      if (delayMs === 0) {
        resetAndPlay(svg, perBeer);
      } else {
        const tid = setTimeout(() => resetAndPlay(svg, perBeer), delayMs);
        wrap._pendingTimers.push(tid);
      }
    });
  });
}

// ===== Contestant dialog =====
function bestTimesByName(name) {
  // Returns { categoryId: bestTimeSeconds | null } across all categories.
  const out = {};
  for (const cat of DATA.categories) out[cat.id] = null;
  for (const r of DATA.results) {
    if (r.name !== name) continue;
    const cur = out[r.category];
    if (cur === null || r.timeSeconds < cur) out[r.category] = r.timeSeconds;
  }
  return out;
}

function openContestantDialog(name) {
  const dialog = document.getElementById("contestant-dialog");
  if (!dialog) return;
  document.getElementById("contestant-dialog-title").textContent = `${name} — best efforts`;

  const body = document.getElementById("contestant-dialog-body");
  body.innerHTML = "";
  const bests = bestTimesByName(name);

  // Track per-row playback context so we can stage the animations after show.
  const rowsToAnimate = [];

  for (const cat of DATA.categories) {
    const beerCount = Number.isInteger(cat.beerCount) && cat.beerCount > 0 ? cat.beerCount : 1;
    const best = bests[cat.id];

    const row = document.createElement("div");
    row.className = "contestant-row";

    const labelWrap = document.createElement("div");
    labelWrap.className = "cat-label";
    const catName = document.createElement("span");
    catName.className = "cat-name";
    catName.textContent = `${cat.label} (${cat.volume})`;
    const catTime = document.createElement("span");
    catTime.className = "cat-time" + (best === null ? " dnf" : "");
    catTime.textContent = best === null ? "did not compete" : `best: ${formatTime(best)}`;
    labelWrap.appendChild(catName);
    labelWrap.appendChild(catTime);

    const logoWrap = document.createElement("div");
    logoWrap.className = "rank-logo" + (beerCount > 1 ? " multi" : "");
    for (let i = 0; i < beerCount; i++) logoWrap.appendChild(cloneLogoSvg());

    row.appendChild(labelWrap);
    row.appendChild(logoWrap);
    body.appendChild(row);

    rowsToAnimate.push({ logoWrap, beerCount, totalDuration: best });
  }

  // Show the dialog first so the SVGs are laid out (getBBox needs that).
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");

  // Now stage animations. Categories without a time stay full (no attach).
  // We use a microtask/rAF to ensure layout is done.
  requestAnimationFrame(() => {
    for (const { logoWrap, beerCount, totalDuration } of rowsToAnimate) {
      if (totalDuration === null) continue; // Stay full — no animation.
      const svgs = Array.from(logoWrap.querySelectorAll("svg"));
      const perBeer = totalDuration / beerCount;
      svgs.forEach((svg) => attachDrainAnimation(svg, perBeer, { autoplay: false }));
      svgs.forEach((svg) => resetToFull(svg, perBeer));
      svgs.forEach((svg, i) => {
        const delayMs = i * perBeer * 1000;
        if (delayMs === 0) resetAndPlay(svg, perBeer);
        else setTimeout(() => resetAndPlay(svg, perBeer), delayMs);
      });
    }
  });
}

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();

  const data = loadData();
  DATA = data;
  buildTabs(data.categories);

  const panelsEl = document.getElementById("panels");
  panelsEl.innerHTML = "";

  data.categories.forEach((cat, i) => {
    const catResults = rankResults(data.results.filter((r) => r.category === cat.id));
    const panel = buildPanel(cat, catResults);
    if (i === 0) panel.classList.add("active");
    panelsEl.appendChild(panel);
  });

  // Reset buttons.
  document.querySelectorAll(".reset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(`panel-${btn.dataset.category}`);
      if (panel) playPanelAnimations(panel);
    });
  });

  // Auto-play first (visible) panel on load.
  // Attaching is lazy because hidden panels (display:none) return 0 from getBBox.
  const firstPanel = document.querySelector(".panel.active");
  if (firstPanel) playPanelAnimations(firstPanel);
});
