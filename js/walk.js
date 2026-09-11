// The captioned walk: visitor-paced, no timers, no audio. Steps are built from the manifest —
// lobby, each door, each stage, the kiosk (skipped when hidden or composed), Talk, end. The bar
// keeps focus on Next; Left/Right step; Escape or End walk returns to the resting lobby.
import { getManifest, getGeometry, str, esc, kioskLines, stageName } from './content.js?v=2026-09-10e';
import { getState, place, rest } from './stage.js?v=2026-09-10e';
import { kioskElement, kioskCentroid, kioskVisibleAt } from './kiosk.js?v=2026-09-10e';
import { hideDoors, showDoors, setCurrent } from './hotspots.js?v=2026-09-10e';
import { lightStage, clearArcs } from './path.js?v=2026-09-10e';
import { pushLayer, resetLayers } from './focus.js?v=2026-09-10e';
import { walkButton } from './hud.js?v=2026-09-10e';
import { setLayer } from './stage.js?v=2026-09-10e';

const bar = document.getElementById('walk');
const live = document.getElementById('walk-live');
let steps = [], i = 0, count = 0, walking = false, api = null;

function say(text) { live.textContent = ''; setTimeout(() => { live.textContent = text; }, 0); }
function fill(t, vars) { return String(t).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ''); }

export function initWalk({ go, onEnd }) {
  api = { go, onEnd };
  const m = getManifest(), g = getGeometry(), c = m.walk.captions;
  steps = [];
  steps.push({ id: 'lobby', caption: fill(c.lobby, { eyebrow: m.lobby.eyebrow, heading: m.lobby.heading.join(' '), subline: m.lobby.subline.join(' ') }), cam: 'rest' });
  for (const d of m.doors) steps.push({ id: `door-${d.id}`, door: d.id, caption: fill(c.door, { title: d.title, promise: d.promise, icp: d.icp, audience: d.audience }), cam: { fx: g.doorways[d.id].center[0], fy: g.doorways[d.id].center[1], z: g.layout.dolly.zoom } });
  for (const s of m.stages) steps.push({ id: `stage-${s.id}`, stage: s.id, caption: fill(c.stage, { stage: s.name, doors: m.doors.filter((d) => d.maturityEmphasis.includes(s.id)).map((d) => d.title).join(', ') }), cam: { fx: g.tower[0], fy: g.tower[1] + 120, z: g.layout.dolly.zoom } });
  steps.push({ id: 'kiosk', skipWhenHidden: true, caption: () => fill(c.kiosk, { lines: kioskLines().map((l) => `${l.value} ${l.label.toLowerCase()}`).join(', ') }), cam: () => { const k = kioskCentroid(); return k ? { fx: k.x, fy: k.y, z: g.layout.dolly.zoom } : 'rest'; } });
  steps.push({ id: 'talk', caption: c.talk, cam: 'rest' });
  steps.push({ id: 'end', caption: c.end, cam: 'rest' });
}

function visibleSteps() {
  const st = getState();
  const z = getGeometry().layout.dolly.zoom;
  return steps.filter((s) => !(s.skipWhenHidden && (st.composed || !kioskElement() || !kioskVisibleAt(z))));
}

export function isWalking() { return walking; }

export function startWalk() {
  if (walking) return;
  api.go({ view: 'walk', step: 0 });
}

export function walkStep(n, { animate = true, resize = false } = {}) {
  const list = visibleSteps(); count = list.length;
  bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', str('walk'));
  if (!walking) { walking = true; document.body.classList.add('walking'); setLayer(true, 'right'); pushLayer({ id: 'walk', opener: walkButton(), first: () => bar.querySelector('#walk-next'), onEscape: () => endWalk() }); }
  i = Math.max(0, Math.min(list.length - 1, n));
  const s = list[i];
  const cam = typeof s.cam === 'function' ? s.cam() : s.cam;
  clearArcs(); setCurrent(s.door || null);
  if (s.stage) lightStage(s.stage);
  if (cam === 'rest') { rest(animate); showDoors(); } else { hideDoors(); place({ ...cam, animate }); }
  const caption = typeof s.caption === 'function' ? s.caption() : s.caption;
  if (resize && !bar.hidden) return;   // a resize only re-aims the camera; the bar and the live region stay put
  bar.hidden = false;
  bar.innerHTML = `<button class="btn outline small" type="button" id="walk-prev"${i === 0 ? ' disabled' : ''}>${esc(str('prevStep'))}</button><button class="btn primary small" type="button" id="walk-next"${i === list.length - 1 ? ' disabled' : ''}>${esc(str('nextStep'))}</button><span class="count">${i + 1} / ${list.length}</span><span class="caption">${esc(caption)}</span><button class="btn outline small" type="button" id="walk-end">${esc(str('endWalk'))}</button>`;
  bar.querySelector('#walk-prev').addEventListener('click', () => api.go({ view: 'walk', step: i - 1 }, { replace: true }));
  bar.querySelector('#walk-next').addEventListener('click', () => api.go({ view: 'walk', step: i + 1 }, { replace: true }));
  bar.querySelector('#walk-end').addEventListener('click', () => endWalk());
  const nextBtn = bar.querySelector('#walk-next');
  (nextBtn.disabled ? bar.querySelector('#walk-end') : nextBtn).focus({ preventScroll: true });
  say(caption);
}

bar.addEventListener('keydown', (e) => {
  if (!walking) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); if (i < count - 1) api.go({ view: 'walk', step: i + 1 }, { replace: true }); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); if (i > 0) api.go({ view: 'walk', step: i - 1 }, { replace: true }); }
});

export function endWalk({ silent = false } = {}) {
  if (!walking) return;
  walking = false;
  document.body.classList.remove('walking');
  bar.hidden = true; bar.innerHTML = '';
  clearArcs();
  if (!silent) api.onEnd();
}
