// Rendered rooms (O5). A door whose manifest entry carries room.render opens onto its render;
// station pins inside the room go to the same panel sections the chips do. `?rooms=0` turns the
// layer off (spec-as-written behaviour); `?room-preview=<path>` mounts a candidate for the gate.
import { getManifest, getGeometry, getParams, str, esc } from './content.js';
import { onLayout, roomToScreen, getState } from './stage.js';

const pinsEl = document.getElementById('room-pins');
let pins = [];
let previewFor = null;

export function initRooms() {
  const p = getParams();
  const prev = p.get('room-preview');
  if (prev && !/^[a-z]+:|^\/\//i.test(prev) && !prev.includes('..')) previewFor = prev;
}

export function roomFor(d) {
  if (getParams().get('rooms') === '0') return null;
  const g = getGeometry();
  if (previewFor) return { render: previewFor, focus: g.rooms?.[d.id]?.focus || { x: 0.5, y: 0.55 }, stations: g.rooms?.[d.id]?.stations || null, preview: true };
  if (!d.room?.render) return null;
  const geo = g.rooms?.[d.id] || {};
  return { render: d.room.render, focus: d.room.focus || geo.focus || { x: 0.5, y: 0.5 }, stations: geo.stations || null, width: geo.width, height: geo.height };
}

export function showRoomPins(d, room, onStation) {
  clearRoomPins();
  if (!room.stations || getState().composed) return;
  pins = Object.entries(room.stations).map(([id, [x, y]]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'room-pin'; b.dataset.station = id;
    b.innerHTML = `<span class="marker" aria-hidden="true"><span class="ring"></span><span class="chip">${esc(str(id))}</span></span>`;
    b.setAttribute('aria-label', str(id));
    b.addEventListener('click', () => onStation(id));
    pinsEl.appendChild(b);
    return { el: b, x, y };
  });
  placePins();
}
function placePins() {
  const f = getState().roomFit; if (!f) return;
  for (const p of pins) { p.el.style.left = (p.x * f.s) + 'px'; p.el.style.top = (p.y * f.s) + 'px'; }
  pinsEl.style.setProperty('--counter', '1');
}
onLayout(placePins);
export function clearRoomPins() { pins = []; pinsEl.innerHTML = ''; }
