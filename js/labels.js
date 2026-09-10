// Live labels painted into plate space (door signs, tower stage names) and the heading block,
// which sits outside the stage and is placed from the plate transform by the 2a rule.
import { getManifest, getGeometry, esc } from './content.js';
import { onLayout, getState, viewport, headerH } from './stage.js';

const labelsEl = document.getElementById('labels');
const introEl = document.getElementById('intro');
const h1 = document.getElementById('h1');
const eyebrow = document.getElementById('eyebrow');
const sub = document.getElementById('sub');
let signs = [], stagesEls = [];

export function buildLabels() {
  const m = getManifest(), g = getGeometry();
  labelsEl.innerHTML = '';
  signs = m.doors.map((d) => {
    const s = g.doorways[d.id].sign;
    const el = document.createElement('span');
    el.className = 'sign';
    el.textContent = d.title;
    el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
    if (s.angle) el.style.transform = `translate(-50%,-50%) rotate(${s.angle}deg)`;
    labelsEl.appendChild(el);
    return { el, capPx: s.capPx };
  });
  stagesEls = g.rings.map((r) => {
    const el = document.createElement('span');
    el.className = 'stage-name';
    el.dataset.stage = r.stage;
    el.textContent = m.stages.find((s) => s.id === r.stage)?.name || r.stage;
    el.style.left = r.label[0] + 'px'; el.style.top = r.label[1] + 'px';
    labelsEl.appendChild(el);
    return { el };
  });
  // Heading
  const L = m.lobby;
  eyebrow.textContent = L.eyebrow;
  const [a, b] = L.heading;
  const acc = L.headingAccent;
  let line2 = esc(b);
  if (acc && b.includes(acc.text)) line2 = esc(b).replace(esc(acc.text), `<span class="accent" style="color:${esc(acc.color)}">${esc(acc.text)}</span>`);
  h1.innerHTML = `${esc(a)}<br>${line2}`;
  sub.innerHTML = L.subline.map(esc).join('<br>');
  place();
}

// Sign: cap height of the painted lettering (29.3 plate px) or 12 screen px, whichever is larger.
// Stage names: 18.9 plate px floor (11 px on the 1672 reference) or 12 screen px.
function place() {
  const st = getState(), g = getGeometry(), L = g.layout;
  const s = st.s;
  for (const { el, capPx } of signs) el.style.fontSize = Math.max(L.textFloor / s, capPx * 1.05) + 'px';
  for (const { el } of stagesEls) el.style.fontSize = Math.max(L.textFloor / s, 11 * st.W / st.ref) + 'px';
  if (st.composed) { introEl.style.left = ''; introEl.style.top = ''; h1.style.fontSize = ''; sub.style.fontSize = ''; introEl.style.maxWidth = ''; return; }
  // Heading placement, 2a rule (page.tsx:353-363 verbatim in spirit).
  const k = s * st.W / st.ref;
  const tx = st.tx, ty = st.ty;
  const introTop = L.heading.top * k + ty;
  const left = Math.max(24, L.heading.left * k + tx);
  const first = g.doorways['win-trust'].frame;
  const firstDoorTop = first[1] * s + ty;
  const subFont = Math.max(L.heading.subMin, L.heading.sub * k);
  const h1Font = Math.max(L.heading.h1Min, Math.min(L.heading.h1 * k, (firstDoorTop - introTop - (12 + 16 + subFont * 2 * 1.4) - 9 - L.heading.clearance) / 2));
  introEl.style.left = left + 'px';
  introEl.style.top = Math.max(headerH() + 8, introTop) + 'px';
  h1.style.fontSize = h1Font + 'px';
  sub.style.fontSize = subFont + 'px';
  introEl.style.maxWidth = Math.min(640, Math.max(300, first[0] * s + tx - left - 8 + 0)) + 'px';
}
onLayout(place);
export function headingElement() { return h1; }
