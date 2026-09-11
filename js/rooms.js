// Rendered rooms (O5). A door whose manifest entry carries room.render opens onto its render;
// station pins inside the room go to the same panel sections the chips do. `?rooms=0` turns the
// layer off (spec-as-written behaviour); `?room-preview=<path>` mounts a candidate for the gate.
import { getManifest, getGeometry, getParams, str, esc, safeRelative } from './content.js?v=2026-09-10f';
import { onLayout, roomToScreen, getState, frameRect, bandOffset } from './stage.js?v=2026-09-10f';

const pinsEl = document.getElementById('room-pins');
let pins = [];
let previewFor = null;

export function initRooms() {
  const p = getParams();
  previewFor = safeRelative(p.get('room-preview'));
}

// Format support is probed once with 1x1 images; the size follows the viewport in device pixels.
const support = { avif: null, webp: null };
function probe(type, uri) {
  if (support[type] !== null) return Promise.resolve(support[type]);
  return new Promise((res) => { const im = new Image(); im.onload = () => { support[type] = im.width > 0; res(support[type]); }; im.onerror = () => { support[type] = false; res(false); }; im.src = uri; });
}
export function probeFormats() {
  return Promise.all([
    probe('avif', 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='),
    probe('webp', 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='),
  ]);
}
function pickSize() {
  const px = Math.max(window.innerWidth, window.innerHeight * 16 / 9) * Math.min(2, window.devicePixelRatio || 1);
  return px <= 1280 ? 1280 : px <= 2048 ? 2048 : 2560;
}
function resolveRender(base) {
  if (/\.(avif|webp|jpe?g|png)$/i.test(base)) return base;               // an explicit file (previews)
  const ext = support.avif ? 'avif' : support.webp ? 'webp' : 'jpg';
  return `${base}-${pickSize()}.${ext}`;
}

export function roomFor(d) {
  if (getParams().get('rooms') === '0') return null;
  const g = getGeometry();
  if (previewFor) return { render: previewFor, focus: g.rooms?.[d.id]?.focus || { x: 0.5, y: 0.55 }, stations: g.rooms?.[d.id]?.stations || null, preview: true };
  if (!d.room?.render) return null;
  const geo = g.rooms?.[d.id] || {};
  return { render: resolveRender(d.room.render), focus: d.room.focus || geo.focus || { x: 0.5, y: 0.5 }, stations: geo.stations || null, width: geo.width, height: geo.height };
}

export function showRoomPins(d, room, onStation) {
  clearRoomPins();
  if (!room.stations || getState().composed) return;
  pins = Object.entries(room.stations).map(([id, [x, y]]) => {
    const b = document.createElement('button');
    // Pointer affordance only: keyboard users reach the same sections through the panel's station
    // chips, which keeps the Tab order panel-first and avoids duplicate stops.
    b.type = 'button'; b.className = 'room-pin'; b.dataset.station = id; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true');
    b.innerHTML = `<span class="marker" aria-hidden="true"><span class="ring"></span><span class="chip">${esc(str(id))}</span></span>`;
    b.addEventListener('click', () => onStation(id));
    pinsEl.appendChild(b);
    return { el: b, x, y };
  });
  placePins();
}
// Pins are children of the transformed room layer, so they sit in room-image pixels and are
// counter-scaled by the room's own scale, not the plate's.
function placePins() {
  const f = getState().roomFit; if (!f) return;
  const R = frameRect(), o = bandOffset();
  for (const p of pins) {
    p.el.style.left = (p.x * f.Wr) + 'px'; p.el.style.top = (p.y * f.Hr) + 'px';
    const sp = roomToScreen(p.x * f.Wr, p.y * f.Hr);
    const inside = sp && sp.x >= R.x + o.x + 24 && sp.x <= R.x + o.x + R.w - 24 && sp.y >= R.y + o.y + 24 && sp.y <= R.y + o.y + R.h - 24;
    p.el.hidden = !inside;
  }
  pinsEl.style.setProperty('--counter', String(1 / f.s));
}
onLayout(placePins);
export function clearRoomPins() { pins = []; pinsEl.innerHTML = ''; }
