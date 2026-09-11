// Stage: the plate at native size in a translate+scale viewport. All maths is in plate pixels.
//
// Two placements exist. At rest the 2a rule holds (cover-fit, centred horizontally, lifted so
// the heading clears the header). Everywhere else one function, place(), aims a plate point at
// the centre of the visible frame R (viewport minus header, panel and inset) at zoom z and clamps so
// the plate always covers the whole stage. Composed viewports (phones, portrait, short) fit the
// plate into the band the layout reserves for it, showing plate x 344.5..2514.8 so all three
// doors are on screen.
import { getGeometry, reducedMotion } from './content.js?v=2026-09-10f';

const stageEl = document.getElementById('stage');
const plateEl = document.getElementById('plate');
const bandEl = document.getElementById('floor-band');
const roomEl = document.getElementById('room');
const roomImg = document.getElementById('room-img');

const state = {
  W: 2880, H: 1621, ref: 1672,
  s: 1, tx: 0, ty: 0,          // current transform (S = s·z folded into s)
  sRest: 1, txRest: 0, tyRest: 0,
  z: 1,
  composed: false, short: false,
  layerOpen: false, dock: 'right',   // dock: 'right' | 'left' (the panel's side) | 'none' (a layer with no panel)
  insetBottom: 0,                    // desktop px reserved along the bottom edge (a tour card), see setInset()
  inRoom: false,
  listeners: new Set(),
};

export function onLayout(fn) { state.listeners.add(fn); }
function emit() { for (const fn of state.listeners) fn(state); }
export function getState() { return state; }

export function viewport() { return { vw: window.innerWidth, vh: window.innerHeight }; }
export function cssPx(name, fallback) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}
export function headerH() { return cssPx('--hud-h', 66); }

// Agrees exactly with the media query in css/experience.css.
export function isComposed() {
  const { vw, vh } = viewport();
  return vw <= 900 || vh >= vw || vh < 500;
}
export function isShort() { return viewport().vh < 500; }

function panelWidth() {
  const { vw } = viewport();
  const css = getComputedStyle(document.documentElement).getPropertyValue('--panel-w').trim();
  const m = css.match(/clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)px\s*\)/);
  if (m) return Math.min(+m[3], Math.max(+m[1], vw * +m[2] / 100));
  return Math.min(640, Math.max(360, vw * 0.39));
}

// The frame a door or the tower has to land inside: the viewport minus the header, minus the
// panel on the side it docks (none for a layer docked 'none'), minus any bottom inset. Composed:
// the band above the sheet; the inset does not apply there.
export function frameRect() {
  const { vw, vh } = viewport();
  const hud = headerH();
  if (state.composed) {
    // Band-local: the stage is positioned inside #floor-band when composed, so placement maths
    // runs in the band's own coordinates. bandOffset() converts to viewport px.
    const b = bandRect();
    const r = { x: 0, y: 0, w: vw, h: b.h };
    r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2; return r;
  }
  const docked = state.layerOpen && state.dock !== 'none';
  const pw = docked ? panelWidth() : 0;
  const r = { x: docked && state.dock === 'left' ? pw : 0, y: hud, w: vw - pw, h: Math.max(0, vh - hud - state.insetBottom) };
  r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2;
  return r;
}

// Where the band is, in viewport px. Composed only.
export function bandRect() {
  const r = bandEl.getBoundingClientRect();
  return { top: r.top, left: r.left, w: r.width, h: r.height };
}
// Stage origin in viewport px: the band's corner when composed, 0,0 on the desktop.
export function bandOffset() { if (!state.composed) return { x: 0, y: 0 }; const b = bandRect(); return { x: b.left, y: b.top }; }

const g = () => getGeometry();

// Rest placement (2a). k converts old-plate units (1672 wide) to screen px.
function computeRest() {
  const { vw, vh } = viewport();
  const L = g().layout;
  const { W, H, ref } = state;
  if (state.composed) {
    const pb = g().phoneBand;
    const bw = vw;
    const spanW = pb.right - pb.left;
    // The band is width·941/1260 tall, capped at 60vh; the plate is scaled to that band.
    let bandH = bw * pb.ratio;
    bandH = Math.min(bandH, vh * 0.6);
    const s = Math.min(bw / spanW, bandH / H);
    // A custom property, not an inline height: the stylesheet shortens the band to the sheet when
    // a layer is open, and an inline height would beat that rule.
    bandEl.style.setProperty('--band-h', Math.round(H * s) + 'px');
    const cx = bw / 2;
    state.sRest = s;
    state.txRest = cx - (pb.left + spanW / 2) * s;
    state.tyRest = 0;
    return;
  }
  bandEl.style.removeProperty('--band-h');
  const s = Math.max(vw / W, vh / H);
  const k = s * W / ref;
  state.sRest = s;
  state.txRest = (vw - W * s) / 2;
  state.tyRest = Math.max(vh - H * s, Math.min(0, L.rest.topOffset - L.rest.topSlope * k));
}

function apply(s, tx, ty, animate) {
  state.s = s; state.tx = tx; state.ty = ty;
  const anim = animate && !reducedMotion();
  const L = g().layout;
  plateEl.style.transition = anim ? `transform ${L.dolly.ms}ms ${L.dolly.ease}, opacity 600ms var(--ease)` : 'opacity 600ms var(--ease)';
  if (anim) { plateEl.classList.add('moving'); clearTimeout(apply._t); apply._t = setTimeout(() => plateEl.classList.remove('moving'), L.dolly.ms + 50); }
  else plateEl.classList.remove('moving');
  plateEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
  document.documentElement.style.setProperty('--counter', String(1 / s));
  document.documentElement.style.setProperty('--k', String(s * state.W / state.ref));
  emit();
}

export function layout() {
  state.composed = isComposed();
  state.short = isShort();
  document.body.classList.toggle('composed', state.composed);
  document.body.classList.toggle('short', state.short);
  computeRest();
}

// Camera at rest.
export function rest(animate = true) {
  state.z = 1;
  document.body.classList.remove('zoomed');
  apply(state.sRest, state.txRest, state.tyRest, animate);
}

// Aim plate point (fx, fy) at the centre of the frame at zoom z, clamped so the plate covers the
// whole stage. Composed: aim inside the band; z is honoured but the plate still covers the band.
export function place({ fx, fy, z = 1, animate = true }) {
  state.z = z;
  const R = frameRect();
  const { vw, vh } = viewport();
  const S = state.sRest * z;
  let tx = R.cx - fx * S, ty = R.cy - fy * S;
  const cover = state.composed ? { x: 0, y: 0, w: vw, h: bandRect().h } : { x: 0, y: 0, w: vw, h: vh };
  tx = Math.min(cover.x, Math.max(cover.x + cover.w - state.W * S, tx));
  ty = Math.min(cover.y, Math.max(cover.y + cover.h - state.H * S, ty));
  document.body.classList.toggle('zoomed', z !== 1);
  apply(S, tx, ty, animate);
}

// Plate → screen (viewport px, band offset included when composed).
export function project(x, y) { const o = bandOffset(); return { x: o.x + state.tx + x * state.s, y: o.y + state.ty + y * state.s }; }
export function projectRect([l, t, r, b]) { const a = project(l, t), c = project(r, b); return { left: a.x, top: a.y, right: c.x, bottom: c.y, width: c.x - a.x, height: c.y - a.y }; }

// A layer is open over the lobby. dock names the panel's side, or 'none' for a layer with no
// panel (the frame keeps the full width); body[data-dock] mirrors it while a layer is open.
// Closing the last layer also releases any bottom inset.
export function setLayer(open, dock = 'right') {
  state.layerOpen = open; state.dock = dock;
  if (!open) state.insetBottom = 0;
  document.body.classList.toggle('layer-open', open);
  if (open) document.body.dataset.dock = dock; else delete document.body.dataset.dock;
}

// Reserve px along the bottom of the desktop frame for something drawn over the stage (a tour
// card), so place() and the room fit aim above it. Takes effect at the next place() or room fit;
// listeners re-run at once so pin visibility follows. setLayer(false) resets it to 0.
export function setInset({ bottom = 0 } = {}) {
  const b = Math.max(0, Number(bottom) || 0);
  if (b === state.insetBottom) return;
  state.insetBottom = b;
  emit();
}

// ---- Plate boot: <picture> with the manifest's srcsets; resolves once decoded. ----
export function buildPicture(plate) {
  const pic = document.getElementById('picture');
  const img = document.getElementById('plate-img');
  const sizes = state.composed ? plate.sizes.composed : plate.sizes.desktop;
  for (const [type, list] of [['image/avif', plate.sources.avif], ['image/webp', plate.sources.webp]]) {
    const src = document.createElement('source');
    src.type = type; src.srcset = list.join(', '); src.sizes = sizes;
    pic.insertBefore(src, img);
  }
  img.srcset = plate.sources.jpeg.join(', ');
  img.sizes = sizes;
  img.width = plate.width; img.height = plate.height;
  img.src = plate.fallback;
  // The placeholder is inlined in index.html so it paints before any script; a manifest swap can still override it.
  if (plate.placeholder) document.getElementById('placeholder').style.backgroundImage = `url("${plate.placeholder}")`;
  // decode() is the signal the spec asks for, but Chromium defers it while a tab is hidden and a
  // few browsers lack it, so it is raced against the load event plus a short timeout: the plate
  // must never stay at opacity 0 behind a resolved network request.
  return new Promise((res) => {
    let done = false;
    const finish = () => { if (!done) { done = true; res(); } };
    const onLoad = () => {
      const d = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
      d.then(finish);
      setTimeout(finish, document.visibilityState === 'hidden' ? 0 : 1200);
    };
    if (img.complete && img.naturalWidth) onLoad();
    else { img.addEventListener('load', onLoad, { once: true }); img.addEventListener('error', finish, { once: true }); }
  });
}

// ---- Room layer (O5). Same fit maths as AiVRIC: cover the frame, put the focus at its centre. ----
const roomCache = new Map();
export function warmRoom(src) {
  if (!src) return Promise.resolve(null);
  let p = roomCache.get(src);
  if (!p) {
    p = new Promise((res) => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { const d = im.decode ? im.decode() : null; d && d.then ? d.then(() => res(im), () => res(im)) : res(im); };
      im.onerror = () => res(null);
      im.src = src;
    });
    roomCache.set(src, p);
  }
  return p;
}
export function isRoomVisible() { return parseFloat(getComputedStyle(roomEl).opacity) > 0; }
let hideToken = 0;
export function whenRoomHidden(fn) {
  const token = ++hideToken; let raf = 0;
  const step = () => { if (token !== hideToken) return; if (!isRoomVisible()) { fn(); return; } raf = setTimeout(step, 40); };
  step();
  return () => { if (token === hideToken) hideToken++; clearTimeout(raf); };
}
function fitRoom(Wr, Hr, cover, R, focus) {
  const fx = Math.min(0.98, Math.max(0.02, focus?.x ?? 0.5)), fy = Math.min(0.98, Math.max(0.02, focus?.y ?? 0.5));
  const base = Math.max(cover.w / Wr, cover.h / Hr);
  const need = Math.max((R.cx - cover.x) / (fx * Wr), (cover.x + cover.w - R.cx) / ((1 - fx) * Wr), (R.cy - cover.y) / (fy * Hr), (cover.y + cover.h - R.cy) / ((1 - fy) * Hr));
  const s = Math.min(Math.max(base, need), base * 1.6);
  let ox = R.cx - fx * Wr * s, oy = R.cy - fy * Hr * s;
  ox = Math.min(cover.x, Math.max(cover.x + cover.w - Wr * s, ox));
  oy = Math.min(cover.y, Math.max(cover.y + cover.h - Hr * s, oy));
  return { s, ox, oy };
}
// The rectangle a room render must fill. The panel is opaque, so the render only has to cover
// the visible frame plus a bleed under the header and the panel's inner edge; covering the whole
// viewport would push the image under the panel and crop the quiet third that was rendered for
// it. With no panel (no layer, or a layer docked 'none') it covers the whole viewport. A bottom
// inset never shortens it: what sits in the inset does not span the width, so the render still
// runs to the bottom edge (the frame's centre, which the fit aims at, does move up). Composed:
// the band plus a bleed under the sheet's rounded top.
function roomCover() {
  const { vw, vh } = viewport();
  const bleed = 18;
  if (state.composed) { const b = bandRect(); return { x: 0, y: 0, w: vw, h: b.h + bleed }; }
  if (!state.layerOpen || state.dock === 'none') return { x: 0, y: 0, w: vw, h: vh };
  const R = frameRect();
  if (state.dock === 'left') return { x: Math.max(0, R.x - bleed), y: 0, w: vw - Math.max(0, R.x - bleed), h: vh };
  return { x: 0, y: 0, w: Math.min(vw, R.x + R.w + bleed), h: vh };
}
let roomToken = 0;
export async function showRoom(src, focus, { animate = true, delay = 0 } = {}) {
  const token = ++roomToken; hideToken++;
  state.inRoom = true;
  const decoded = await warmRoom(src);
  if (token !== roomToken || !state.inRoom || !decoded) return false;
  if (roomImg.getAttribute('src') !== src) {
    roomImg.setAttribute('src', src);
    if (!roomImg.complete) await new Promise((res) => { const d = () => { roomImg.removeEventListener('load', d); roomImg.removeEventListener('error', d); res(); }; roomImg.addEventListener('load', d); roomImg.addEventListener('error', d); });
    if (token !== roomToken || !state.inRoom) return false;
  }
  const Wr = decoded.naturalWidth, Hr = decoded.naturalHeight;
  const fr = frameRect(); const R = { ...fr }; R.cx = fr.cx; R.cy = fr.cy;
  const fit = fitRoom(Wr, Hr, roomCover(), R, focus);
  roomImg.width = Wr; roomImg.height = Hr;
  roomEl.style.transition = 'none';
  roomEl.style.transform = `translate3d(${fit.ox}px, ${fit.oy}px, 0) scale(${fit.s})`;
  roomImg.style.transition = 'none';
  roomImg.style.transformOrigin = `${(focus?.x ?? 0.5) * 100}% ${(focus?.y ?? 0.5) * 100}%`;
  roomImg.style.transform = `scale(${getGeometry().layout.roomSettle})`;
  void roomEl.offsetWidth;
  const anim = animate && !reducedMotion();
  const L = getGeometry().layout;
  const go = () => {
    if (token !== roomToken || !state.inRoom) return;
    roomEl.style.transition = anim ? `opacity ${L.roomFadeInMs}ms var(--ease)` : 'none';
    roomImg.style.transition = anim ? 'transform 1600ms var(--ease)' : 'none';
    roomImg.style.transform = 'scale(1)';
    roomEl.style.opacity = '1';
    roomEl.classList.add('on');
    roomEl.setAttribute('aria-hidden', 'false');
    emit();
  };
  if (anim && delay) setTimeout(go, delay); else go();
  state.roomFit = { ...fit, Wr, Hr };
  return true;
}
export function hideRoom(animate = true) {
  state.inRoom = false; roomToken++;
  const L = getGeometry().layout;
  roomEl.style.transition = animate && !reducedMotion() ? `opacity ${L.roomFadeOutMs}ms var(--ease)` : 'none';
  roomEl.style.opacity = '0';
  roomEl.classList.remove('on');
  roomEl.setAttribute('aria-hidden', 'true');
  emit();
}
export function panRoom(focus, ms = 1200) {
  if (!state.inRoom || !state.roomFit) return false;
  const { Wr, Hr } = state.roomFit;
  const fit = fitRoom(Wr, Hr, roomCover(), frameRect(), focus);
  roomEl.style.transition = reducedMotion() ? 'none' : `transform ${ms}ms var(--ease), opacity 600ms var(--ease)`;
  roomEl.style.transform = `translate3d(${fit.ox}px, ${fit.oy}px, 0) scale(${fit.s})`;
  state.roomFit = { ...fit, Wr, Hr };
  return true;
}
export function roomToScreen(x, y) { const f = state.roomFit; if (!f) return null; const o = bandOffset(); return { x: o.x + f.ox + x * f.s, y: o.y + f.oy + y * f.s }; }

// ---- Resize ----
let resizeT = 0; let onResize = null;
export function setResizeHandler(fn) { onResize = fn; }
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { layout(); if (onResize) onResize(); }, 60); });
if (window.ResizeObserver) {
  let first = true;
  new ResizeObserver(() => { if (first) { first = false; return; } if (!state.composed) return; clearTimeout(resizeT); resizeT = setTimeout(() => { layout(); if (onResize) onResize(); }, 60); }).observe(bandEl);
}
