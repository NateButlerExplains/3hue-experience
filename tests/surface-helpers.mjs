// Shared helpers for the room-surface specs (O14): surfaces.spec (S-01..S-06), tour-surfaces.spec
// (T-27) and surfaces-contrast.spec. What the page reports comes from window.__lobby.surfaces and
// window.__tour; what the specs expect is computed here from the geometry, the fixture and the
// manifest through js/tourtext.js, never typed.
import { roomVisible, manifest as m, ROOT } from './helpers.mjs';
import { FX } from './tour-helpers.mjs';
import { foldWrites, resolveEntry, entryText, matches, resolveLine } from '../js/tourtext.js';
import { readGeometry } from '../tools/check-manifest.js';

// The geometry with the rooms' surfaces merged in (content/surfaces.json into rooms.<door>), as the
// page merges them once the tour is on and as the lint reads them.
export const G = readGeometry(ROOT);

// The room has faded in and the render's settle (1.06 → 1 over 1.6 s) and any pan have finished.
export async function roomSettled(page) {
  await roomVisible(page, 4000);
  await page.waitForFunction(() => { const i = document.getElementById('room-img'); return i.style.transform === 'scale(1)' && !document.getAnimations().some((a) => a.effect?.target?.closest?.('#room')); }, null, { polling: 50, timeout: 6000 });
  await page.waitForTimeout(150);
}

// The tour's session as a pick of `segment` left it, so a deep link into the fixture's room node shows
// that trigger version's lines (js/tour.js restores the session for a deep link). Registered before
// every navigation of the page; a later call wins.
export const withSegment = (page, segment) => page.addInitScript((seg) => {
  try { sessionStorage.setItem('3hue-experience:tour', JSON.stringify({ node: 'arrive', answers: seg ? { segment: seg } : {}, chosen: {}, visited: ['arrival'], door: null })); } catch { /* about:blank */ }
}, segment);

// Each surface's corners on screen, measured on the DOM: four empty markers at its box's corners.
export const CORNERS = () => {
  const seen = new Set(), out = {};
  for (const e of document.querySelectorAll('#room-surfaces .surf[data-surface]')) {
    const id = e.dataset.surface;
    if (seen.has(id)) continue;
    seen.add(id);
    const w = e.offsetWidth, h = e.offsetHeight;
    out[id] = [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => {
      const d = document.createElement('i'); d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0;`;
      e.append(d); const r = d.getBoundingClientRect(); d.remove();
      return [r.left, r.top];
    });
  }
  return out;
};

// Each surface's effective scale measured on the DOM (the smallest edge ratio), with its type's size,
// for the legibility and pointer rules.
export const EFF = () => {
  const out = {};
  for (const e of document.querySelectorAll('#room-surfaces .surf-hit, #room-surfaces .surf-ink, #room-surfaces .surf-emit, #room-surfaces .surf-plate')) {
    const id = e.dataset.surface;
    if (out[id]) continue;
    const w = e.offsetWidth, h = e.offsetHeight;
    const P = [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => { const d = document.createElement('i'); d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0;`; e.append(d); const r = d.getBoundingClientRect(); d.remove(); return r; });
    const L = (a, b) => Math.hypot(P[b].left - P[a].left, P[b].top - P[a].top);
    const box = document.querySelector(`#room-surfaces [data-surface="${id}"] .surf-box`);
    const t = box?.querySelector('.surf-t');
    out[id] = {
      eff: Math.min(Math.min(L(0, 1), L(3, 2)) / w, Math.min(L(0, 3), L(1, 2)) / h), w: (L(0, 1) + L(3, 2)) / 2, h: (L(0, 3) + L(1, 2)) / 2,
      font: t ? parseFloat(getComputedStyle(t).fontSize) : 0, visible: !!t && getComputedStyle(box).visibility !== 'hidden' && !!t.textContent.trim(),
      src: [...(box?.querySelectorAll('.surf-src') || [])].map((s) => ({ px: parseFloat(getComputedStyle(s).fontSize), shown: getComputedStyle(s).display !== 'none' })),
    };
  }
  return out;
};

// The fixture's room node as the tour shows it for `answers` (the door its scene records included):
// its lines filtered by `when`, each with its caption, and what its surfaces show at line li — the fold
// of the node's base write and the lines' writes (js/tourtext.js foldWrites), resolved. heard: the
// caption token the voice has reached on line li (Infinity: not voiced, every entry applies).
export const ROOM = 'room';
export function roomCtx(answers = {}) {
  const door = FX.nodes[ROOM].scene.door;
  return { tour: FX, answers: { ...answers, door }, chosen: {}, visited: [], door, guide: m.guide?.lead };
}
export function roomLines(answers = {}) {
  const c = roomCtx(answers);
  return FX.nodes[ROOM].lines.filter((l) => matches(l.when, c)).map((l) => ({ ...l, text: resolveLine(l, m, c).text }));
}
export function roomState(answers, li, heard = Infinity) {
  const c = roomCtx(answers);
  const folded = foldWrites(FX.nodes[ROOM].write, roomLines(answers), li, heard);
  return Object.fromEntries(Object.entries(folded).map(([id, e]) => { const r = resolveEntry(e, m, c); return [id, r]; }).filter(([, r]) => r));
}
// What tourState().surfaces reports for a state: each surface's words, or its kind for a glow.
export const reported = (state) => Object.fromEntries(Object.entries(state).map(([id, r]) => [id, entryText(r) || r.kind]));
// The card's screen-reader list for a state: in the room's order, a ref's source after its figure.
export const listed = (state, order) => Object.entries(state).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)).map(([, r]) => r.items.map((x) => (x.source ? `${x.text} (${x.source})` : x.text)).join('; ')).filter(Boolean);
