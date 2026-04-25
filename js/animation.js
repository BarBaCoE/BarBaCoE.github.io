// SVG drain animation: clip the pink (.st1) elements with a rectangle that
// shrinks from the top, simulating beer being drunk.
// Uses requestAnimationFrame for maximum cross-browser compat (animating SVG
// `y`/`height` attributes via WAAPI is inconsistent across browsers).

let clipIdCounter = 0;

// WeakMap<SVGElement, AnimationState>
const stateMap = new WeakMap();

/**
 * Prepare the SVG for animation: compute pink bbox, inject a clipPath,
 * and apply clip-path to every .st1 element. Stores per-svg state.
 *
 * Must be called after the SVG has been inserted into the DOM, because
 * getBBox() returns zeros on detached elements.
 *
 * @param {SVGSVGElement} svg
 * @param {number} durationSeconds
 */
export function attachDrainAnimation(svg, durationSeconds) {
  const pinkEls = Array.from(svg.querySelectorAll(".st1"));
  if (pinkEls.length === 0) return;

  // Combined bounding box of all pink elements.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of pinkEls) {
    let bb;
    try { bb = el.getBBox(); } catch { continue; }
    if (!bb || (bb.width === 0 && bb.height === 0)) continue;
    if (bb.x < minX) minX = bb.x;
    if (bb.y < minY) minY = bb.y;
    if (bb.x + bb.width > maxX) maxX = bb.x + bb.width;
    if (bb.y + bb.height > maxY) maxY = bb.y + bb.height;
  }
  if (!isFinite(minX)) return;

  const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

  const clipId = `beer-clip-${++clipIdCounter}`;
  const SVG_NS = "http://www.w3.org/2000/svg";

  // <defs><clipPath id=...><rect/></clipPath></defs>
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  const clipPath = document.createElementNS(SVG_NS, "clipPath");
  clipPath.setAttribute("id", clipId);
  // Use userSpaceOnUse explicitly (default, but be safe).
  clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(bbox.x));
  rect.setAttribute("y", String(bbox.y));
  rect.setAttribute("width", String(bbox.width));
  rect.setAttribute("height", String(bbox.height));
  clipPath.appendChild(rect);
  defs.appendChild(clipPath);

  for (const el of pinkEls) {
    el.setAttribute("clip-path", `url(#${clipId})`);
  }

  stateMap.set(svg, {
    rect,
    bbox,
    durationMs: Math.max(50, durationSeconds * 1000),
    rafId: null,
  });

  // Initial play.
  playDrain(svg);
}

function playDrain(svg) {
  const state = stateMap.get(svg);
  if (!state) return;

  // Cancel any in-flight animation.
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);

  const { rect, bbox, durationMs } = state;
  const startTime = performance.now();

  // Reset to full.
  rect.setAttribute("y", String(bbox.y));
  rect.setAttribute("height", String(bbox.height));

  const tick = (now) => {
    const t = Math.min(1, (now - startTime) / durationMs);
    // Linear: liquid level falls steadily. The clip rect's top edge moves down,
    // and its height shrinks correspondingly so the bottom stays anchored.
    const newY = bbox.y + bbox.height * t;
    const newH = bbox.height * (1 - t);
    rect.setAttribute("y", String(newY));
    rect.setAttribute("height", String(newH));
    if (t < 1) {
      state.rafId = requestAnimationFrame(tick);
    } else {
      state.rafId = null;
    }
  };
  state.rafId = requestAnimationFrame(tick);
}

/**
 * Reset the drain to full and play again.
 * @param {SVGSVGElement} svg
 * @param {number} [durationSeconds] optional new duration
 */
export function resetAndPlay(svg, durationSeconds) {
  const state = stateMap.get(svg);
  if (!state) return;
  if (typeof durationSeconds === "number" && isFinite(durationSeconds)) {
    state.durationMs = Math.max(50, durationSeconds * 1000);
  }
  playDrain(svg);
}
