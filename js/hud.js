// Header actions and the composed layout's rows and footer.
import { getManifest, str, esc, resolveHref } from './content.js';

const rows = document.getElementById('floor-rows');
const foot = document.getElementById('floor-foot');
const walkBtn = document.getElementById('walk-btn');
const talkBtn = document.getElementById('talk-btn');
const brand = document.getElementById('brand');
const brandImg = document.getElementById('brand-img');

export function buildHud({ onDoor, onPath, onWalk }) {
  const m = getManifest();
  brand.href = resolveHref('logo');
  brandImg.alt = m.site.logo.alt;
  talkBtn.href = resolveHref('booking');
  talkBtn.textContent = str('talk');
  walkBtn.textContent = str('walk');
  walkBtn.addEventListener('click', onWalk);
  document.getElementById('skip').textContent = str('skip');
  document.getElementById('doors').setAttribute('aria-label', str('doorsGroup'));

  rows.innerHTML = '';
  for (const d of m.doors) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'row-btn'; b.dataset.door = d.id; b.dataset.color = d.color;
    b.innerHTML = `<span class="n" aria-hidden="true">${d.number}</span><span><b>${esc(str('explore', { door: d.title }))}</b><span>${esc(d.promise)}</span></span>`;
    b.setAttribute('aria-label', str('accessibleName', { door: d.title, promise: d.promise }));
    b.addEventListener('click', () => onDoor(d));
    rows.appendChild(b);
  }
  const p = document.createElement('button');
  p.type = 'button'; p.className = 'row-btn'; p.dataset.door = 'path'; p.style.setProperty('--accent', 'var(--orange)');
  p.innerHTML = `<span class="n" aria-hidden="true">↑</span><span><b>${esc(str('pathChip'))}</b><span>${esc(m.stages.map((s) => s.name).join(' · '))}</span></span>`;
  p.addEventListener('click', onPath);
  rows.appendChild(p);

  foot.innerHTML = '';
  const w = document.createElement('button'); w.type = 'button'; w.className = 'btn outline'; w.textContent = str('walk'); w.addEventListener('click', onWalk);
  const t = document.createElement('a'); t.className = 'btn outline'; t.href = resolveHref('booking'); t.target = '_blank'; t.rel = 'noopener noreferrer'; t.textContent = str('talk');
  const legend = document.createElement('p'); legend.className = 'legend'; legend.textContent = str('legend');
  foot.append(w, t, legend);
}

export function rowElement(id) { return rows.querySelector(`[data-door="${id}"]`); }
export function walkButton() { return document.body.classList.contains('composed') ? foot.querySelector('button') : walkBtn; }
