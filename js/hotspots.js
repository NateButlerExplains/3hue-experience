// Door hotspots and the path chip. Each door is a transparent button the size of its frame in
// plate px; the ring sits on the doorway centre and the chip hangs below it, both counter-scaled
// so they keep their screen size. Composed viewports show numbered rings only (rows carry the
// names). Plates (hover/focus, fine pointers) list what is behind the door.
import { getManifest, getGeometry, str, esc, stageName } from './content.js?v=2026-09-10e';
import { onLayout, getState, project, viewport } from './stage.js?v=2026-09-10e';

const host = document.getElementById('doors');
let doors = [];
let pathChip = null;

export function buildDoors(onDoor, onPath) {
  const m = getManifest(), g = getGeometry();
  host.innerHTML = '';
  host.classList.add('hidden');   // revealed by showDoors() once the first route has settled; a deep link never shows them
  doors = m.doors.map((d, i) => {
    const geo = g.doorways[d.id];
    const [l, t, r, b] = geo.frame;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'door';
    btn.dataset.door = d.id;
    btn.dataset.color = d.color;
    btn.style.left = l + 'px'; btn.style.top = t + 'px'; btn.style.width = (r - l) + 'px'; btn.style.height = (b - t) + 'px';
    btn.setAttribute('aria-label', str('accessibleName', { door: d.title, promise: d.promise }));
    const fams = d.serviceFamilies.map((f) => `<span>${esc(f.name)}</span>`).join('');
    btn.innerHTML = `<span class="marker" style="--mx:${geo.center[0] - l}px;--my:${geo.center[1] - t}px;--i:${i}" aria-hidden="true">` +
      `<span class="ring" data-n="${d.number}"></span>` +
      `<span class="chip">${esc(str('explore', { door: d.title }))}</span>` +
      `<span class="plate"><b>${esc(str('explore', { door: d.title }))}</b><i>${esc(str('for', { icp: d.icp }))}</i>${fams}</span>` +
      `</span>`;
    btn.addEventListener('click', () => onDoor(d));
    for (const ev of ['blur', 'pointerleave']) btn.addEventListener(ev, () => btn.classList.remove('plate-dismissed'));
    host.appendChild(btn);
    return { door: d, el: btn, marker: btn.firstElementChild };
  });
  // Path chip on the stair pill, orange hairline; the only control that opens the path.
  const [pl, pt, pr, pb] = g.stairPill;
  pathChip = document.createElement('button');
  pathChip.type = 'button';
  pathChip.className = 'path-chip';
  pathChip.style.left = pl + 'px'; pathChip.style.top = pt + 'px'; pathChip.style.width = (pr - pl) + 'px'; pathChip.style.height = (pb - pt) + 'px';
  pathChip.innerHTML = `<span class="marker" style="--mx:${(pr - pl) / 2}px;--my:${(pb - pt) / 2}px" aria-hidden="true"><span class="chip">${esc(str('pathChip'))}</span></span>`;
  pathChip.setAttribute('aria-label', str('pathChip'));
  pathChip.addEventListener('click', () => onPath());
  host.appendChild(pathChip);
  place();
  return doors;
}

// Plates flip left when the chip sits near the right edge of the viewport.
function place() {
  const { vw } = viewport();
  for (const { el, marker } of doors) {
    const geo = getGeometry().doorways[el.dataset.door];
    const p = project(geo.center[0], geo.center[1]);
    marker.classList.toggle('flip', p.x > vw - 140);
  }
  // The path chip's hit box is the stair pill, which is under 44 screen px tall on most desktops:
  // floor its height at 44 px (in plate px) and keep the marker on the pill's centre.
  if (pathChip) {
    const [pl, pt, pr, pb] = getGeometry().stairPill; const s = getState().s;
    const h = Math.max(pb - pt, 44 / s), w = Math.max(pr - pl, 44 / s);
    pathChip.style.top = ((pt + pb) / 2 - h / 2) + 'px'; pathChip.style.height = h + 'px';
    pathChip.style.left = ((pl + pr) / 2 - w / 2) + 'px'; pathChip.style.width = w + 'px';
    pathChip.firstElementChild.style.setProperty('--mx', (w / 2) + 'px'); pathChip.firstElementChild.style.setProperty('--my', (h / 2) + 'px');
  }
}
onLayout(place);

export function setCurrent(id) {
  for (const { el } of doors) { if (el.dataset.door === id) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current'); }
  if (pathChip) { if (id === 'path') pathChip.setAttribute('aria-current', 'true'); else pathChip.removeAttribute('aria-current'); }
}

// Hide (fade 150 ms) while the camera moves or a room is up; show again once settled.
let token = 0;
export function hideDoors() { token++; host.classList.add('hidden'); for (const { el } of doors) el.setAttribute('tabindex', '-1'); if (pathChip) pathChip.setAttribute('tabindex', '-1'); }
export function showDoors() {
  const t = ++token;
  setTimeout(() => {
    if (t !== token) return;
    host.classList.remove('hidden');
    // Composed: the rows are the keyboard controls; the band's numbered rings are decoration.
    const composed = getState().composed;
    for (const { el } of doors) { if (composed) { el.setAttribute('tabindex', '-1'); el.setAttribute('aria-hidden', 'true'); } else { el.removeAttribute('tabindex'); el.removeAttribute('aria-hidden'); } }
    if (pathChip) { if (composed) pathChip.setAttribute('tabindex', '-1'); else pathChip.removeAttribute('tabindex'); }
  }, 0);
}
export function doorElement(id) { return doors.find((d) => d.door.id === id)?.el || null; }
export function pathElement() { return pathChip; }
export function firstDoorElement() { return doors[0]?.el || null; }
