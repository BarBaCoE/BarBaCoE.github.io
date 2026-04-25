// Theme toggle: persisted in localStorage; respects prefers-color-scheme on first visit.
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
  const theme = getInitialTheme();
  applyTheme(theme);
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  // Tabs + ranking rendering wired up in next commit.
});
