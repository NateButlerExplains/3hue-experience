// ?debug=1: draw every geometry item on the plate and expose window.__lobby for the checks.
import { getManifest, getGeometry, getParams } from './content.js?v=2026-09-10f';
import { getState, project, projectRect, onLayout, frameRect, bandOffset } from './stage.js?v=2026-09-10f';

const svg = document.getElementById('debug');
const NS = 'http://www.w3.org/2000/svg';

export function initDebug() {
  const on = getParams().get('debug') === '1';
  window.__lobby = {
    get manifest() { return getManifest(); },
    get geometry() { return getGeometry(); },
    get stage() { const s = getState(); return { s: s.s, tx: s.tx, ty: s.ty, z: s.z, sRest: s.sRest, composed: s.composed, layerOpen: s.layerOpen, dock: s.dock, inRoom: s.inRoom }; },
    project, projectRect, frame: () => { const r = frameRect(), o = bandOffset(); return { ...r, x: r.x + o.x, y: r.y + o.y, cx: r.cx + o.x, cy: r.cy + o.y }; },
    get rects() {
      const g = getGeometry();
      const out = { doors: {}, rings: {}, stairPill: projectRect(g.stairPill), tower: project(g.tower[0], g.tower[1]) };
      for (const [id, d] of Object.entries(g.doorways)) out.doors[id] = { center: project(d.center[0], d.center[1]), frame: projectRect(d.frame), sign: project(d.sign.x, d.sign.y) };
      for (const r of g.rings) out.rings[r.stage] = project(r.label[0], r.label[1]);
      if (g.kiosk?.quad) out.kiosk = g.kiosk.quad.map(([x, y]) => project(x, y));
      return out;
    },
  };
  if (!on) return;
  svg.hidden = false;
  const g = getGeometry();
  svg.setAttribute('viewBox', `0 0 ${g.plate.width} ${g.plate.height}`);
  const el = (n, a) => { const e = document.createElementNS(NS, n); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); svg.appendChild(e); return e; };
  for (const [id, d] of Object.entries(g.doorways)) {
    const [l, t, r, b] = d.frame;
    el('rect', { x: l, y: t, width: r - l, height: b - t, fill: 'none', stroke: '#52cce3', 'stroke-width': 3 });
    el('circle', { cx: d.center[0], cy: d.center[1], r: 10, fill: '#52cce3' });
    el('circle', { cx: d.sign.x, cy: d.sign.y, r: 8, fill: 'none', stroke: '#e98445', 'stroke-width': 3 });
    el('text', { x: l + 8, y: t + 34, fill: '#52cce3', 'font-size': 28, 'font-family': 'monospace' }).textContent = id;
  }
  el('circle', { cx: g.tower[0], cy: g.tower[1], r: 12, fill: 'none', stroke: '#fff', 'stroke-width': 3 });
  for (const r of g.rings) {
    el('line', { x1: r.label[0] - 120, y1: r.label[1], x2: r.label[0] + 120, y2: r.label[1], stroke: '#ffd9a3', 'stroke-width': 2, 'stroke-dasharray': '8 6' });
    if (r.arc) el('path', { d: r.arc, fill: 'none', stroke: '#ffd9a3', 'stroke-width': 4 });
  }
  const [pl, pt, pr, pb] = g.stairPill;
  el('rect', { x: pl, y: pt, width: pr - pl, height: pb - pt, fill: 'none', stroke: '#e98445', 'stroke-width': 3 });
  if (g.kiosk?.quad) el('polygon', { points: g.kiosk.quad.map((p) => p.join(',')).join(' '), fill: 'none', stroke: '#25b5d6', 'stroke-width': 3 });
  const pb2 = g.phoneBand;
  el('rect', { x: pb2.left, y: 0, width: pb2.right - pb2.left, height: g.plate.height, fill: 'none', stroke: '#fff', 'stroke-width': 2, 'stroke-dasharray': '20 12', opacity: .5 });
}
