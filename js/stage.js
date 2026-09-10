// Stage: the plate at native size in a translate+scale viewport. All maths is in plate pixels.
//
// Two placements exist. At rest the 2a rule holds (cover-fit, centred horizontally, lifted so
// the heading clears the header). Everywhere else one function, place(), aims a plate point at
// the centre of the visible frame R (viewport minus header minus panel) at zoom z and clamps so
// the plate always covers the whole stage. Composed viewports (phones, portrait, short) fit the
// plate into the band the layout reserves for it, showing plate x 344.5..2514.8 so all three
// doors are on screen.
import { getGeometry, reducedMotion } from './content.js';

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
  layerOpen: false, dock: 'right',
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
// panel on the side it docks. Composed: the band above the sheet.
export function frameRect() {
  const { vw, vh } = viewport();
  const hud = headerH();
  if (state.composed) {
    const b = bandRect();
    const r = { x: 0, y: b.top, w: vw, h: b.h };
    r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2; return r;
  }
  const pw = state.layerOpen ? panelWidth() : 0;
  const r = { x: state.layerOpen && state.dock === 'left' ? pw : 0, y: hud, w: vw - pw, h: vh - hud };
  r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2;
  return r;
}

// Where the band is, in viewport px. Composed only.
export function bandRect() {
  const r = bandEl.getBoundingClientRect();
  return { top: r.top, left: r.left, w: r.width, h: r.height };
}

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
    bandEl.style.height = Math.round(H * s) + 'px';
    const cx = bw / 2;
    state.sRest = s;
    state.txRest = cx - (pb.left + spanW / 2) * s;
    state.tyRest = 0;
    return;
  }
  bandEl.style.height = '';
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

// Plate → screen.
export function project(x, y) { return { x: state.tx + x * state.s, y: state.ty + y * state.s }; }
export function projectRect([l, t, r, b]) { const a = project(l, t), c = project(r, b); return { left: a.x, top: a.y, right: c.x, bottom: c.y, width: c.x - a.x, height: c.y - a.y }; }

export function setLayer(open, dock = 'right') { state.layerOpen = open; state.dock = dock; document.body.classList.toggle('layer-open', open); }

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
  document.getElementById('placeholder').style.backgroundImage = `url("${plate.placeholder}")`;
  return new Promise((res) => {
    const done = () => { const d = img.decode ? img.decode().catch(() => {}) : Promise.resolve(); d.then(res); };
    if (img.complete && img.naturalWidth) done(); else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', () => res(), { once: true }); }
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
  const step = () => { if (token !== hideToken) return; if (!isRoomVisible()) { fn(); return; } raf = requestAnimationFrame(step); };
  step();
  return () => { if (token === hideToken) hideToken++; cancelAnimationFrame(raf); };
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
function roomCover() {
  const { vw, vh } = viewport();
  if (!state.composed) return { x: 0, y: 0, w: vw, h: vh };
  const b = bandRect(); return { x: 0, y: 0, w: vw, h: b.h + 18 };
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
export function roomToScreen(x, y) { const f = state.roomFit; return f ? { x: f.ox + x * f.s, y: f.oy + y * f.s } : null; }

// ---- Resize ----
let resizeT = 0; let onResize = null;
export function setResizeHandler(fn) { onResize = fn; }
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { layout(); if (onResize) onResize(); }, 60); });
if (window.ResizeObserver) {
  let first = true;
  new ResizeObserver(() => { if (first) { first = false; return; } if (!state.composed) return; clearTimeout(resizeT); resizeT = setTimeout(() => { layout(); if (onResize) onResize(); }, 60); }).observe(bandEl);
}
