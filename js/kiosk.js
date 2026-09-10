// The kiosk: a display-only surface perspective-mapped onto the painted screen. Mounts only once
// geometry.kiosk.quad exists (two independent measurements agreeing within 2 px). Hidden, never
// squashed, when a line would render under 12 px or a corner leaves the frame by more than 2 px.
import { getManifest, getGeometry, kioskLines, esc } from './content.js';
import { onLayout, getState, project, viewport } from './stage.js';
import { quadToMatrix3d, quadSize } from './screens.js';

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

export function placeKiosk() {
  if (!el) return;
  const g = getGeometry(); const st = getState(); const { vw, vh } = viewport();
  const base = g.layout.kioskBaseFontPx;
  // Shortest vertical edge of the projected quad relative to the unwarped height decides the
  // effective text size.
  const q = g.kiosk.quad.map(([x, y]) => project(x, y));
  const leftH = Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y), rightH = Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y);
  const eff = base * st.s * (Math.min(leftH, rightH) / (size.height * st.s));
  const outside = q.some((p) => p.x < -2 || p.y < -2 || p.x > vw + 2 || p.y > vh + 2);
  el.hidden = eff < g.layout.textFloor || outside || st.composed;
}
onLayout(placeKiosk);
export function kioskElement() { return el; }
export function kioskCentroid() { const q = getGeometry().kiosk?.quad; if (!q) return null; return { x: q.reduce((a, p) => a + p[0], 0) / 4, y: q.reduce((a, p) => a + p[1], 0) / 4 }; }
