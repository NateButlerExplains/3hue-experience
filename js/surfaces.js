// Rooms that talk back (O14). Each room's own flat displays and glass, measured twice on its
// 2560x1440 master (content/surfaces.json, tools/import-surfaces.mjs, merged here into the geometry as
// rooms.<door>.surfaces and .measuredOn), carry
// what the guide is saying, in the room's perspective, built on the homography in js/screens.js. The
// port of the art/mockup study: a surface layer per role sized quadSize() and mapped onto its quad
// with quadToMatrix3d(), the render redrawn over it where something stands in front (one <img>
// clipped to the union of the occluder polygons), and the type fitted to its box.
//
// Layers, in #room-surfaces inside #room: back surfaces, the occluder image, front surfaces (a monitor
// standing in front of a panel is itself an occluder of that panel, so it is drawn after the redraw),
// then the pointer targets. #room-surfaces and its layer boxes are plain boxes (no transform, opacity
// or z-index), so every part blends with the render beneath: #room, transformed and isolated, is the
// one blend group. The render's derivative is Wr wide, not 2560, so each part sits at its quad's
// top-left in render pixels (master px x k, k = Wr / 2560) and its own matrix maps its box onto the
// quad from there: the scale lives in each part, since a scaled wrapper would be a blend group of its
// own whose blends no longer reach the render. Each part also follows the render's settle (a scale
// about the room's focus, js/stage.js onRoomSettle), so the type never slides on its glass.
//
// Roles (tools/import-surfaces.mjs): glass takes ink (multiply) and its own light turned up
// (color-dodge): the whole pane when the line points at it, and always a feathered backlight behind
// its type, since frosted glass is mid-tone and ink alone would not reach 4.5:1; screen takes
// emissive type (screen) on a lit ground; scrim a dark plate under light type; region a glow (the lit
// niche takes a short line in ink) and dial a glow (a short line in light type under the hands).
//
// Two modes. 'door' (the door view, only while the tour is on: js/main.js): each station's first
// surface carries that station's label (strings[station]); a click on any surface of a station opens
// #/door/<id>/<station> as a pin did. 'tour': js/tour.js sets what each surface shows (the fold of the
// node's writes, js/tourtext.js foldWrites) and which surfaces the line points at; a click on a lit
// surface goes back to the line that lit it. Surfaces are aria-hidden and pointer-only (the card's
// screen-reader list says what the room shows); a surface takes the pointer only when it projects to
// at least 44x44 CSS px. Type is fitted in surface pixels and hidden, never squashed, when its size
// on screen falls under layout.textFloor (12 px, the kiosk's rule).
//
// Nothing of this loads with the lobby: the measurements and css/surfaces.css come the first time a
// room mounts its surfaces (or at idle once the tour is on: js/main.js warmSurfaces), so the gated
// site's first paint pays nothing for them. A room whose surfaces cannot load keeps its pins.
import { getGeometry, str } from './content.js?v=2026-09-10f';
import { getState, roomToScreen, onLayout, onRoomSettle, onRoomFit, frameRect, bandOffset } from './stage.js?v=2026-09-10f';
import { quadToMatrix3d, quadSize } from './screens.js?v=2026-09-10f';

const HIT = 44;                                                   // CSS px: the smallest surface a pointer may pick
const SIZE = { sign: 34, list: 22, card: 24, status: 30, label: 24 };   // surface px: the most each kind sets
const SRC = 0.62;                                                 // a card's source, relative to its text (CSS .surf-src)
const FIT_MIN = 6;
const FIGURE = /\d(?:[\d,.]*\d)?\s?%|[$€£]\s?\d(?:[\d,.]*\d)?(?:\s?(?:k|m|bn|b)\b)?/i;
const PARTS = { glass: ['lift', 'ink'], screen: ['emit'], scrim: ['plate'], region: ['glow', 'ink'], dial: ['glow', 'emit'] };
const TEXT_PART = { glass: 'ink', screen: 'emit', scrim: 'plate', region: 'ink', dial: 'emit' };
const BACKLIGHT = 10;     // surface px: how far a glass surface's backlight reaches past its type

let cur = null;         // the mounted room: {door, mode, onPick, k, src, units: Map, state, active, host, layers}
let pending = null;     // a tour state set before its room mounted: {door, state}
let wanted = 0;         // bumped by every mount asked for and every clear, so a mount that waited on the load can tell it is stale
let loading = null;     // the measurements and the stylesheet, once asked for: Promise<boolean>
let settle = { scale: 1, origin: [0, 0], ms: 0 };

const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const floor = () => getGeometry()?.layout?.textFloor || 12;

// ---- Geometry helpers ----
const inPoly = ([x, y], poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const centroid = (q) => [q.reduce((a, p) => a + p[0], 0) / q.length, q.reduce((a, p) => a + p[1], 0) / q.length];
// A surface stands in front when its centre lies inside another surface's occluder polygon.
const isFront = (id, s, all) => Object.entries(all).some(([o, t]) => o !== id && (t.occluders || []).some((p) => inPoly(centroid(s.quad), p)));
// The union of every occluder, as one clip path in room pixels: each ring turned the same way round so
// overlapping rings add (nonzero) instead of cancelling.
function unionPath(all, k) {
  const rings = [];
  for (const s of Object.values(all)) for (const p of s.occluders || []) {
    let area = 0;
    for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; area += x1 * y2 - x2 * y1; }
    const ring = area < 0 ? [...p].reverse() : p;
    rings.push(`M${ring.map(([x, y]) => `${+(x * k).toFixed(2)} ${+(y * k).toFixed(2)}`).join(' L')} Z`);
  }
  return rings.join(' ');
}
// The render's settle (a scale about the room's focus F) for a part whose box sits at O: the same
// move expressed about the part's own origin, translate((1 - s)(F - O)) scale(s). It keeps one list
// of functions whatever s is, so the settle interpolates function by function, as the render's does.
const settleAt = ([ox, oy]) => { const [fx, fy] = settle.origin, s = settle.scale; return `translate(${+((1 - s) * (fx - ox)).toFixed(3)}px, ${+((1 - s) * (fy - oy)).toFixed(3)}px) scale(${s})`; };

// ---- Loading: the measurements (merged into the geometry) and the stylesheet, once ----
export function warmSurfaces() {
  if (!loading) loading = Promise.all([loadData(), loadStyles()]).then(([a, b]) => a && b);
  return loading;
}
function loadData() {
  return fetch('content/surfaces.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((sf) => {
    const g = getGeometry();
    if (!sf || typeof sf.rooms !== 'object' || !g?.rooms) return false;
    for (const [door, r] of Object.entries(sf.rooms)) g.rooms[door] = { ...(g.rooms[door] || {}), ...r };
    return true;
  });
}
// Stamped as css/experience.css is (tools/stamp-version.py), as js/tour.js does for css/tour.css.
function loadStyles() {
  return new Promise((res) => {
    const main = document.querySelector('link[rel="stylesheet"][href*="css/experience.css"]');
    const v = (main?.getAttribute('href').match(/\?v=[\w.-]+/) || [''])[0];
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = `css/surfaces.css${v}`;
    link.addEventListener('load', () => res(true), { once: true });
    link.addEventListener('error', () => { link.remove(); res(false); }, { once: true });
    document.head.append(link);
  });
}

// ---- Mounting ----
// door: the door id; roomEl: #room; mode 'door' | 'tour'; onPick(station | surfaceId, surfaceId).
// Resolves true once mounted, false when the surfaces cannot load (the caller keeps the pins), null
// when a later mount or a clear overtook it while it waited. Mounting the room already up in the
// same mode keeps it (a resize, a hand-over, a station change): only the pointer callback and the
// layout are refreshed, and a new render size rebuilds it with the state it showed.
export function mountSurfaces(door, roomEl, opts = {}) {
  const my = ++wanted;
  return warmSurfaces().then((ok) => (my !== wanted ? null : ok ? mount(door, roomEl, opts) : false));
}
function mount(door, roomEl, { mode = 'door', onPick = null } = {}) {
  const geo = getGeometry()?.rooms?.[door];
  const fit = getState().roomFit;
  const src = document.getElementById('room-img')?.getAttribute('src') || '';
  if (!geo?.surfaces || !fit || !roomEl) { drop(); return false; }
  const k = fit.Wr / (Number(geo.width) || 2560);
  if (cur && cur.door === door && cur.mode === mode && cur.k === k && cur.src === src) { cur.onPick = onPick; layoutSurfaces(); return true; }
  const keep = cur && cur.door === door && cur.mode === mode ? { state: cur.state, active: [...cur.active] } : null;
  drop();
  const host = el('div', 'room-surfaces'); host.id = 'room-surfaces'; host.setAttribute('aria-hidden', 'true');
  const layers = { back: el('div', 'surf-layer back'), front: el('div', 'surf-layer front'), hits: el('div', 'surf-layer hits') };
  // Pointer targets: a front surface's over the back ones (the monitor standing on its panel).
  const hitsBack = el('div', 'surf-layer'), hitsFront = el('div', 'surf-layer');
  layers.hits.append(hitsBack, hitsFront);
  const occ = el('img', 'surf-occ'); occ.alt = ''; occ.decoding = 'async'; occ.draggable = false; occ.hidden = true;
  host.append(layers.back, occ, layers.front, layers.hits);
  const pins = roomEl.querySelector('#room-pins');
  if (pins) roomEl.insertBefore(host, pins); else roomEl.append(host);
  cur = { door, mode, onPick, k, src, geo, host, layers, occ, units: new Map(), state: {}, active: new Set() };
  // The occluder image: the render itself at its own size, clipped to the union of the occluders.
  const path = unionPath(geo.surfaces, k);
  if (path) { occ.src = src; occ.style.width = `${fit.Wr}px`; occ.style.height = `${fit.Hr}px`; occ.style.clipPath = `path('${path}')`; }
  for (const [id, s] of Object.entries(geo.surfaces)) {
    const size = quadSize(s.quad);
    // The box is placed at the quad's top-left (left/top) and its matrix maps it onto the quad from
    // there. One matrix carrying the whole offset is the same mapping, but its affine part turns
    // negative once the perspective term meets a large translation; WebKit, which may draw a
    // perspective matrix by its affine part, then shows a surface in strong perspective (the niche,
    // the folders) mirrored and off its quad.
    const o = [+(s.quad[0][0] * k).toFixed(3), +(s.quad[0][1] * k).toFixed(3)];
    const m = size && quadToMatrix3d(s.quad.map(([x, y]) => [x * k - o[0], y * k - o[1]]), size.width, size.height);
    if (!m) continue;
    const u = { id, s, size, m, o, front: isFront(id, s, geo.surfaces), parts: [], box: null, backlight: null, key: null, entry: null, fit: 0, font: 0, eff: 0, pw: 0, ph: 0, shown: false, srcShown: false, hover: false, label: null, hit: null };
    const parent = u.front ? layers.front : layers.back;
    for (const part of PARTS[s.role] || ['glow']) {
      if ((part === 'emit' || part === 'ink') && (s.role === 'region' || s.role === 'dial') && !s.text) continue;
      const p = el('div', `surf surf-${part} role-${s.role}`);
      p.dataset.surface = id;
      p.style.cssText = `left:${o[0]}px;top:${o[1]}px;width:${size.width}px;height:${size.height}px`;
      if (part === TEXT_PART[s.role] && s.text) {
        if (part === 'emit' || part === 'plate') p.append(el('div', 'surf-ground'));
        const b = el('div', 'surf-box');
        b.style.cssText = `left:${s.text.left * 100}%;right:${s.text.right * 100}%;top:${s.text.top * 100}%;bottom:${s.text.bottom * 100}%`;
        p.append(b); u.box = b;
      }
      if (part === 'glow' && s.role === 'dial') p.classList.add('dial');
      if (part === 'lift') {
        p.append(el('div', 'surf-sheen'));
        if (s.text) { u.backlight = el('div', 'surf-backlight'); p.append(u.backlight); }
      }
      parent.append(p); u.parts.push(p);
    }
    if (s.target) {
      const h = el('div', 'surf surf-hit'); h.dataset.surface = id;
      h.style.cssText = `left:${o[0]}px;top:${o[1]}px;width:${size.width}px;height:${size.height}px`;
      h.addEventListener('pointerenter', () => { if (h.classList.contains('on')) hover(u, true); });
      h.addEventListener('pointerleave', () => hover(u, false));
      h.addEventListener('click', (e) => { if (!h.classList.contains('on') || !cur) return; e.preventDefault(); cur.onPick?.(cur.mode === 'door' ? u.s.station : u.id, u.id); });
      (u.front ? hitsFront : hitsBack).append(h); u.hit = h; u.parts.push(h);
    }
    cur.units.set(id, u);
  }
  place();
  if (mode === 'door') {
    // One label per station, on its first surface that takes type.
    const seen = new Set();
    for (const u of cur.units.values()) {
      const st = u.s.station;
      if (!st || !u.box || seen.has(st)) continue;
      seen.add(st); u.label = str(st);
      paint(u, { kind: 'label', items: [{ text: u.label, source: null }] });
    }
    fitAll();
  } else {
    const p = pending && pending.door === door ? pending.state : keep?.state;
    pending = null;
    if (p) applyState(p);
    if (keep?.active) setActiveSurface(keep.active);
  }
  layoutSurfaces();
  return true;
}

// Take the surfaces off the room, and forget a tour state waiting for one and any mount still loading.
export function clearSurfaces() { wanted++; pending = null; drop(); }
function drop() { if (!cur) return; cur.host.remove(); cur = null; }

// Each part's transform: the render's settle, then the quad's matrix. The settle's duration is a
// custom property the stylesheet puts beside the parts' own opacity transition.
function place() {
  if (!cur) return;
  cur.host.style.setProperty('--settle', `${settle.ms}ms`);
  for (const u of cur.units.values()) { const t = `${settleAt(u.o)} ${u.m}`; for (const p of u.parts) p.style.transform = t; }
  cur.occ.style.transform = settleAt([0, 0]);
}
onRoomSettle((s) => {
  settle = { scale: s.scale, origin: s.origin, ms: s.ms };
  // A new render (another door, another size) under the mounted surfaces: they belong to the old one.
  if (cur && document.getElementById('room-img')?.getAttribute('src') !== cur.src) drop();
  place();
});

// ---- What the surfaces show ----
// entry: {kind: sign|list|card|status|glow|label, items: [{text, source}]} or null. Returns whether
// anything changed.
function paint(u, e) {
  const key = e ? JSON.stringify(e) : null;
  if (key === u.key) return false;
  u.key = key; u.entry = e; u.fit = 0;
  if (u.box) u.box.replaceChildren(...(e && e.kind !== 'glow' ? content(e) : []));
  const kind = e?.kind || '';
  for (const p of u.parts) {
    p.classList.toggle('is-written', !!e && kind !== 'label');
    p.classList.toggle('is-label', kind === 'label');
    p.classList.toggle('is-glow', kind === 'glow');
    p.dataset.kind = kind;
  }
  return true;
}
const text = (t) => document.createTextNode(t);
// A figure (a percentage, an amount) in a card is set heavier where it sits in the sentence.
function withFigure(p, t) {
  const m = t.match(FIGURE);
  if (!m) { p.append(text(t)); return p; }
  const b = el('b'); b.textContent = m[0];
  p.append(text(t.slice(0, m.index)), b, text(t.slice(m.index + m[0].length)));
  return p;
}
function content(e) {
  const items = e.items || [];
  if (e.kind === 'sign' || e.kind === 'label') {
    const p = el('p', `surf-t surf-${e.kind}`);
    for (const it of items) { const s = el('span', 'ln'); s.textContent = it.text; p.append(s); }
    return [el('i', 'surf-rule'), p];
  }
  if (e.kind === 'list') {
    const ul = el('ul', 'surf-t surf-list');
    for (const it of items) { const li = el('li'); li.textContent = it.text; ul.append(li); }
    return [el('i', 'surf-rule'), ul];
  }
  if (e.kind === 'status') {
    const p = el('p', 'surf-t surf-status');
    items.forEach((it, i) => {
      const m = it.text.match(/^(.*?)\s*([✓✔?])$/u);
      const ln = el('span', 'ln');
      if (m) { const mk = el('span', `surf-mark ${m[2] === '?' ? 'q' : 'ok'}`); mk.textContent = m[2]; ln.append(text(m[1] ? `${m[1]} ` : ''), mk); }
      else ln.textContent = it.text;
      p.append(ln); if (i < items.length - 1) p.append(text(' '));
    });
    return [el('i', 'surf-rule'), p];
  }
  // card: each item's text (a figure set heavier), a ref's source under it in small type.
  const out = [];
  const wrap = el('div', 'surf-t surf-card');
  for (const it of items) {
    wrap.append(withFigure(el('p', 'surf-card-t'), it.text));
    if (it.source) { const s = el('p', 'surf-src'); s.textContent = it.source; wrap.append(s); }
  }
  out.push(wrap);
  return out;
}

// Fit a surface's type: the largest size (surface px) at which its widest line and its whole block
// fit the box, by bisection. A sign or status line is set whole on one line; one too long for its
// surface wraps (balanced) instead when that sets it at least a sixth larger. Signs, statuses and
// labels in one room then share the smallest size of their kind, so a row of panels reads as one sign
// system.
function fitOne(u) {
  const t = u.box?.querySelector('.surf-t');
  if (!t) return 0;
  const max = SIZE[u.entry.kind] || 22;
  const box = u.box;
  // Measured with a card's source in place (the layout may hide it afterwards when it would be small).
  box.classList.remove('no-src');
  const fits = () => {
    const lines = t.querySelectorAll('.ln');
    const wide = lines.length ? Math.max(...[...lines].map((l) => l.offsetWidth)) : t.scrollWidth;
    return wide <= box.clientWidth + 0.5 && t.scrollWidth <= box.clientWidth + 0.5 && box.scrollHeight <= box.clientHeight + 0.5;
  };
  const best = () => {
    t.style.fontSize = `${max}px`;
    if (fits()) return max;
    let lo = FIT_MIN, hi = max;
    for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; t.style.fontSize = `${mid}px`; if (fits()) lo = mid; else hi = mid; }
    return lo;
  };
  let size = best();
  if (size < max && (u.entry.kind === 'sign' || u.entry.kind === 'status')) {
    t.classList.add('wrap');
    const wrapped = best();
    if (wrapped >= size * 7 / 6) size = wrapped; else t.classList.remove('wrap');
  }
  t.style.fontSize = `${size}px`;
  return size;
}
const ROW = new Set(['sign', 'status', 'label']);
function fitAll() {
  if (!cur) return;
  const groups = new Map();
  for (const u of cur.units.values()) {
    u.font = 0;
    if (!u.entry || u.entry.kind === 'glow' || !u.box) continue;
    if (!u.fit) u.fit = fitOne(u);
    u.font = u.fit;
    if (ROW.has(u.entry.kind)) { const g = `${u.s.role}:${u.entry.kind}`; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(u); }
  }
  for (const list of groups.values()) {
    const m = Math.min(...list.map((u) => u.fit));
    for (const u of list) { u.font = m; u.box.querySelector('.surf-t').style.fontSize = `${m}px`; }
  }
  for (const u of cur.units.values()) if (u.backlight) backlight(u);
}
// A glass surface's backlight covers its type block (the box's width, the type's height) and a margin.
function backlight(u) {
  const b = u.backlight, box = u.box, last = box?.lastElementChild;
  if (!b || !last || !u.font) return;
  const t = u.s.text, W = u.size.width, H = u.size.height, x = BACKLIGHT;
  const top = t.top * H, h = Math.min(H * (1 - t.top - t.bottom), last.offsetTop + last.offsetHeight);
  b.style.cssText = `left:${Math.max(0, t.left * W - x)}px;width:${Math.min(W, (1 - t.left - t.right) * W + 2 * x)}px;top:${Math.max(0, top - x)}px;height:${h + 2 * x}px`;
}

function applyState(state) {
  cur.state = state || {};
  let changed = false;
  for (const u of cur.units.values()) changed = paint(u, cur.state[u.id] || null) || changed;
  if (changed) fitAll();
}

// The tour's state: {surfaceId: {kind, items: [{text, source}]}}; a surface not named goes dark.
// door: the room it is for; set before that room is mounted it waits for it.
export function setSurfaceState(state, { door = null } = {}) {
  if (!cur || (door && cur.door !== door)) { pending = door ? { door, state } : null; return false; }
  if (cur.mode !== 'tour') return false;
  applyState(state);
  layoutSurfaces();
  return true;
}

// The surfaces the line points at (a cue, a station scene): marked and lit; null clears.
export function setActiveSurface(ids) {
  if (!cur) return;
  cur.active = new Set([].concat(ids ?? []).filter((id) => cur.units.has(id)));
  for (const u of cur.units.values()) for (const p of u.parts) p.classList.toggle('is-active', cur.active.has(u.id));
  layoutSurfaces();
}

function hover(u, on) {
  if (!cur || u.hover === on) return;
  u.hover = on;
  for (const p of u.parts) p.classList.toggle('is-hover', on);
  syncOcc();
}

// ---- Layout: what shows at the room's current fit ----
// Per surface: its corners on screen, the smallest scale any edge takes (the type's size on screen is
// its fitted size times that), and its projected width and height (the pointer's 44 px rule). As pins
// outside the visible frame were hidden, a surface whose centre is outside it takes no pointer, and in
// the door view a label shows only on a surface wholly inside it (not half under the panel).
export function layoutSurfaces() {
  if (!cur || !getState().roomFit) return;
  const fl = floor();
  const R = frameRect(), o = bandOffset();
  const inFrame = (p) => p.x >= R.x + o.x - 1 && p.x <= R.x + o.x + R.w + 1 && p.y >= R.y + o.y - 1 && p.y <= R.y + o.y + R.h + 1;
  for (const u of cur.units.values()) {
    const P = u.s.quad.map(([x, y]) => roomToScreen(x * cur.k, y * cur.k));
    const d = (a, b) => Math.hypot(P[b].x - P[a].x, P[b].y - P[a].y);
    u.corners = P;
    u.inside = P.every(inFrame);
    u.centred = inFrame({ x: P.reduce((a, p) => a + p.x, 0) / 4, y: P.reduce((a, p) => a + p.y, 0) / 4 });
    u.pw = (d(0, 1) + d(3, 2)) / 2; u.ph = (d(0, 3) + d(1, 2)) / 2;
    u.eff = Math.min(Math.min(d(0, 1), d(3, 2)) / u.size.width, Math.min(d(0, 3), d(1, 2)) / u.size.height);
    if (u.box) {
      const has = !!u.entry && u.entry.kind !== 'glow';
      u.shown = has && !(u.entry.kind === 'label' && !u.inside) && u.font * u.eff >= fl;
      u.srcShown = u.shown && u.font * SRC * u.eff >= fl;
      u.box.classList.toggle('is-small', has && !u.shown);
      u.box.classList.toggle('no-src', !u.srcShown);
    }
    if (u.hit) {
      const lit = !!u.entry || cur.active.has(u.id);
      const can = cur.mode === 'door' ? !!u.s.station : lit;
      const on = can && u.centred && u.pw >= HIT && u.ph >= HIT;
      u.hit.classList.toggle('on', on);
      if (!on && u.hover) hover(u, false);
    }
  }
  syncOcc();
}
// The occluder redraw is needed only while something behind it shows.
function syncOcc() {
  if (!cur) return;
  cur.occ.hidden = ![...cur.units.values()].some((u) => !u.front && (u.entry || u.hover || cur.active.has(u.id)));
}
onLayout(layoutSurfaces);
onRoomFit(layoutSurfaces);

// ---- For the camera, the tour and the checks ----
export const surfacesOn = (door) => !!cur && (!door || cur.door === door);
export const surfaceMode = () => cur?.mode ?? null;
// The surfaces of the mounted room standing for a station.
export const stationSurfaces = (station) => (cur ? [...cur.units.values()].filter((u) => u.s.station === station).map((u) => u.id) : []);
export const surfaceStation = (id) => cur?.units.get(id)?.s.station ?? null;
// [x0, y0, x1, y1] around the named surfaces' quads, in master pixels; null when none is mounted.
export function surfaceBBox(ids) {
  if (!cur) return null;
  const pts = [].concat(ids ?? []).map((id) => cur.units.get(id)).filter(Boolean).flatMap((u) => u.s.quad);
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
export function surfaceStats() {
  if (!cur) return null;
  const r1 = (n) => Math.round(n * 10) / 10;
  return {
    door: cur.door, mode: cur.mode, k: cur.k, occluder: !cur.occ.hidden, active: [...cur.active],
    surfaces: [...cur.units.values()].map((u) => ({
      id: u.id, role: u.s.role, station: u.s.station || null, front: u.front, target: !!u.s.target,
      kind: u.entry?.kind || null, text: u.entry ? u.entry.items.map((x) => x.text).join(' · ') : null, label: u.label,
      written: !!u.entry && u.entry.kind !== 'label', active: cur.active.has(u.id),
      font: r1(u.font), eff: Math.round(u.eff * 1000) / 1000, px: r1(u.font * u.eff), shown: u.shown, sourceShown: u.srcShown,
      hit: !!u.hit?.classList.contains('on'), w: r1(u.pw), h: r1(u.ph), inside: u.inside,
      corners: (u.corners || []).map((p) => [r1(p.x), r1(p.y)]),
    })),
  };
}
