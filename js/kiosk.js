// The kiosk: a display-only surface perspective-mapped onto the painted screen. Mounts only once
// geometry.kiosk.quad exists (two independent measurements agreeing within 2 px). Hidden, never
// squashed, when a line would render under 12 px or a corner leaves the frame by more than 2 px.
import { getManifest, getGeometry, kioskLines, esc } from './content.js?v=2026-09-10';
import { onLayout, getState, project, viewport } from './stage.js?v=2026-09-10';
import { quadToMatrix3d, quadSize } from './screens.js?v=2026-09-10';

const mount = document.getElementById('kiosk-mount');
let el = null, size = null;

export function initKiosk() {
  const g = getGeometry(), m = getManifest();
  if (!g.kiosk?.quad) return;
  size = quadSize(g.kiosk.quad);
  el = document.createElement('div');
  el.className = 'kiosk';
  el.setAttribute('aria-hidden', 'true');
  el.style.width = size.width + 'px'; el.style.height = size.height + 'px';
  el.style.transformOrigin = '0 0';
  el.style.transform = quadToMatrix3d(g.kiosk.quad, size.width, size.height);
  el.innerHTML = `<div class="kiosk-in"><p class="kiosk-head">${esc(m.kiosk.header)}</p>${kioskLines().map((l) => `<p class="kiosk-line"><b>${esc(String(l.value))}</b> ${esc(l.label)}</p>`).join('')}<p class="kiosk-tag">${esc(m.kiosk.tag)}</p></div>`;
  mount.appendChild(el);
  placeKiosk();
}

// The smallest line's effective screen size: base font (plate px) times the stage scale, scaled
// again by how much the shortest vertical edge of the quad compresses the unwarped surface.
function effectiveFont(S) {
  const g = getGeometry(); const q = g.kiosk.quad;
  const leftH = Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]), rightH = Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1]);
  return g.layout.kioskBaseFontPx * S * (Math.min(leftH, rightH) / size.height);
}
export function kioskVisibleAt(z = 1) { if (!el) return false; const st = getState(); return effectiveFont(st.sRest * z) >= getGeometry().layout.textFloor; }

export function placeKiosk() {
  if (!el) return;
  const g = getGeometry(); const st = getState(); const { vw, vh } = viewport();
  const q = g.kiosk.quad.map(([x, y]) => project(x, y));
  // The right edge of the quad is the plate's own edge (the kiosk runs off frame), so only the
  // left corners have to be on screen; the right ones may sit at or past the viewport edge.
  const outside = q[0].x < -2 || q[3].x < -2 || q.some((p) => p.y < -2 || p.y > vh + 2);
  el.hidden = effectiveFont(st.s) < g.layout.textFloor || outside || st.composed;
}
onLayout(placeKiosk);
export function kioskElement() { return el; }
export function kioskCentroid() { const q = getGeometry().kiosk?.quad; if (!q) return null; return { x: q.reduce((a, p) => a + p[0], 0) / 4, y: q.reduce((a, p) => a + p[1], 0) / 4 }; }
