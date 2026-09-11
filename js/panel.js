// The docked panel (bottom sheet when composed): one template for a door, one for the path.
// Every string comes from the manifest; this file only arranges them.
import { getManifest, str, esc, resolveHref, stageName } from './content.js?v=2026-09-10f';
import { getState } from './stage.js?v=2026-09-10f';
import { reducedMotion } from './content.js?v=2026-09-10f';

const panel = document.getElementById('panel');
let mode = null; // 'door' | 'path'
let currentId = null;

const talk = (filled) => `<a class="btn ${filled ? 'primary' : 'outline'} small" href="${esc(resolveHref('booking'))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(str('talk'))}, ${esc(str('newTab', { host: new URL(resolveHref('booking')).host }))}">${esc(str('talk'))}</a>`;
const src = (o) => (o?.source ? `<span class="src">${esc(o.source)}</span>` : '');

function doorTabs(active, onTab) {
  const m = getManifest();
  const tabs = document.createElement('div');
  tabs.className = 'tabs'; tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', str('doorsGroup'));
  for (const d of m.doors) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.dataset.door = d.id; b.textContent = d.title;
    b.setAttribute('aria-pressed', d.id === active ? 'true' : 'false');
    b.addEventListener('click', () => { if (d.id !== active) onTab(d.id); });
    tabs.appendChild(b);
  }
  // Roving arrows across the tab row.
  tabs.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const items = [...tabs.querySelectorAll('.tab')]; const i = items.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); items[(i + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length].focus();
  });
  return tabs;
}

function gated(d) { return d.gate !== 'pending'; }

export function openDoorPanel(d, { station, sameDoor, onBack, onTab, onStation }) {
  const m = getManifest();
  const keepFocus = sameDoor && panel.contains(document.activeElement);
  const focused = document.activeElement?.dataset?.door;
  mode = 'door'; currentId = d.id;
  panel.hidden = false;
  panel.dataset.dock = getState().composed ? 'sheet' : d.dock;
  panel.setAttribute('aria-label', `${d.title}: ${d.promise}`);
  const research = gated(d);
  const stages = m.stages.map((s) => `<li${d.maturityEmphasis.includes(s.id) ? '' : ' class="off"'}>${esc(s.name)}${d.maturityEmphasis.includes(s.id) ? `<span class="tag">${esc(str('inPath'))}</span>` : ''}</li>`).join('');
  const fams = d.serviceFamilies.map((f) => `<li><b>${esc(f.name)}</b>${f.examples?.length ? `<span>${f.examples.map(esc).join(' · ')}</span>` : ''}</li>`).join('');
  panel.innerHTML = `
    <div class="toolbar"><button class="btn outline small" type="button" id="panel-back">${esc(str('back'))}</button></div>
    <div id="panel-tabs"></div>
    <p class="kicker">${esc(d.icp)}</p>
    <h2 id="panel-h2" tabindex="-1">${esc(d.title)}: ${esc(d.promise)}</h2>
    <p class="lede">${esc(d.tension)}</p>
    <p class="audience">${esc(d.audience)}</p>
    <div class="row"><button class="btn outline small" type="button" id="panel-services">${esc(str('services'))}</button>${talk(true)}</div>
    <div class="stations" id="panel-stations" hidden></div>
    <h3 id="st-urgency" tabindex="-1">${esc(str('urgency'))}</h3>
    ${research && d.opening ? `<p><strong>${esc(d.opening.text)}</strong></p>` : ''}
    <ul>${d.triggers.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    ${research && d.stat ? `<p>${esc(d.stat.text)}${src(d.stat)}</p>` : ''}
    <h3 id="st-gap" tabindex="-1">${esc(str('gap'))}</h3>
    <p>${esc(d.gap)}</p>
    ${research && d.statSecondary ? `<p>${esc(d.statSecondary.text)}${src(d.statSecondary)}</p>` : ''}
    <h3 id="st-services" tabindex="-1">${esc(str('services'))}</h3>
    <ul class="families">${fams}</ul>
    ${research && d.proof?.length ? `<h3 id="st-proof" tabindex="-1">${esc(str('proof'))}</h3>${d.proof.map((p) => `<p>${esc(p.text)}<span class="src">${esc(p.basis)}</span></p>`).join('')}` : ''}
    ${research && d.program ? `<h3 id="st-program" tabindex="-1">${esc(str('program'))}</h3><ol class="arc">${m.arc.map((a, i) => `<li><b>${esc(a)}</b>${esc([d.program.snapshot, d.program.build, d.program.operate][i] || '')}</li>`).join('')}</ol><p class="pillars">${m.pillars.map(esc).join(' · ')}</p>` : ''}
    <h3 id="st-route" tabindex="-1">${esc(str('route'))}</h3>
    <ol class="stagelist">${stages}</ol>
    <h3 id="st-decision" tabindex="-1">${esc(str('decision'))}</h3>
    <p>${esc(d.decision)}</p>
    <div class="row">${talk(false)}</div>`;
  panel.querySelector('#panel-tabs').replaceWith(doorTabs(d.id, onTab));
  panel.querySelector('#panel-back').addEventListener('click', onBack);
  panel.querySelector('#panel-services').addEventListener('click', () => { const h = panel.querySelector('#st-services'); h.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }); h.focus({ preventScroll: true }); });
  if (!sameDoor) panel.scrollTop = 0;
  if (keepFocus) { const t = panel.querySelector(`.tab[data-door="${d.id}"]`) || panel.querySelector(focused ? `.tab[data-door="${focused}"]` : '.tab'); if (t) t.focus(); }
}

// Station pins in a room and the station chips in the panel both call this. focus: false scrolls
// the section into view and leaves focus where it is (a narrator pointing, not a visitor moving).
export function setPanelStation(id, { room, animate, focus = true } = {}) {
  const h = panel.querySelector(`#st-${CSS.escape(id)}`);
  if (!h) return false;
  h.setAttribute('tabindex', '-1');
  h.scrollIntoView({ block: 'start', behavior: animate && !reducedMotion() ? 'smooth' : 'auto' });
  if (focus) h.focus({ preventScroll: true });
  return true;
}

export function showStationChips(d, stations, onStation) {
  const host = panel.querySelector('#panel-stations');
  if (!host) return;
  host.innerHTML = '';
  host.hidden = !stations?.length;
  for (const s of stations || []) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.textContent = str(s); b.dataset.station = s;
    b.addEventListener('click', () => onStation(s));
    host.appendChild(b);
  }
}

export function openPathPanel({ stage, samePanel, onBack, onDoor, onStage }) {
  const m = getManifest();
  const keepFocus = samePanel && panel.contains(document.activeElement);
  const focusedStage = document.activeElement?.dataset?.stage;
  mode = 'path'; currentId = 'path';
  panel.hidden = false;
  panel.dataset.dock = getState().composed ? 'sheet' : 'left';
  panel.setAttribute('aria-label', m.path.title);
  const idx = stage && stage !== 'where-to-start' ? m.stages.findIndex((s) => s.id === stage) : (stage === 'where-to-start' ? m.stages.length : -1);
  const li = m.stages.map((s, i) => {
    const doors = m.doors.filter((d) => d.maturityEmphasis.includes(s.id));
    const cur = i === idx;
    return `<li${cur ? ' aria-current="step"' : ''}><b>${esc(s.name)}</b>${cur ? `<span class="current">${esc(str('current'))}</span>` : ''}<div class="stage-doors">${doors.map((d) => `<button type="button" data-door="${d.id}">${esc(d.title)}</button>`).join('')}</div></li>`;
  }).join('');
  const nextLabel = idx < 0 ? str('next') : idx >= m.stages.length - 1 ? str('whereToStart') : str('next');
  const showStart = idx >= m.stages.length;
  panel.innerHTML = `
    <div class="toolbar"><button class="btn outline small" type="button" id="panel-back">${esc(str('back'))}</button></div>
    <div class="tabs" role="group" aria-label="${esc(str('doorsGroup'))}">${m.doors.map((d) => `<button class="tab" type="button" data-door="${d.id}" aria-pressed="false">${esc(d.title)}</button>`).join('')}</div>
    <p class="kicker">${esc(str('stagesGroup'))}</p>
    <h2 id="panel-h2" tabindex="-1">${esc(m.path.title)}</h2>
    <p class="audience">${esc(m.path.intro || '')}</p>
    <div class="climb"><button class="btn outline small" type="button" id="stage-prev"${idx <= 0 ? ' disabled' : ''}>${esc(str('prev'))}</button><button class="btn outline small" type="button" id="stage-next"${showStart ? ' disabled' : ''}>${esc(nextLabel)}</button></div>
    <ol class="stagelist" id="stage-list">${li}</ol>
    ${showStart ? `<h3 id="where-to-start" tabindex="-1">${esc(str('whereToStart'))}</h3><p>${esc(m.path.whereToStart.lead)}${src(m.path.whereToStart)}</p><ul>${m.doors.map((d) => `<li><button type="button" class="tab" data-door="${d.id}">${esc(d.title)}</button> ${esc(d.maturityEmphasis.map(stageName).join(', '))}</li>`).join('')}</ul>` : ''}
    <div class="row">${talk(true)}</div>`;
  panel.querySelector('#panel-back').addEventListener('click', onBack);
  for (const b of panel.querySelectorAll('[data-door]')) b.addEventListener('click', () => onDoor(b.dataset.door));
  panel.querySelector('#stage-prev').addEventListener('click', () => onStage(idx <= 0 ? null : m.stages[idx - 1].id));
  panel.querySelector('#stage-next').addEventListener('click', () => onStage(idx >= m.stages.length - 1 ? 'where-to-start' : m.stages[idx + 1].id));
  if (!samePanel) panel.scrollTop = 0;
  if (keepFocus) { const n = panel.querySelector('#stage-next'); if (n && !n.disabled) n.focus(); else panel.querySelector('#where-to-start')?.focus(); }
}

export function closePanel() { panel.hidden = true; panel.innerHTML = ''; mode = null; currentId = null; }
export function panelHeading() { return panel.querySelector('#panel-h2'); }
export function panelMode() { return mode; }
export function panelElement() { return panel; }
