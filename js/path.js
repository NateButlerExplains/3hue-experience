// The maturity path: the four ring arcs on the tower, lit one at a time during the climb.
// Arc geometry is an SVG path in plate px measured in the geometry tool; until measured, a flat
// arc is synthesised across the label position so the climb still reads.
import { getGeometry } from './content.js?v=2026-09-10d';

const svg = document.getElementById('arcs');
const paths = new Map();

export function buildArcs() {
  const g = getGeometry();
  svg.setAttribute('viewBox', `0 0 ${g.plate.width} ${g.plate.height}`);
  svg.innerHTML = '';
  for (const r of g.rings) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const [x, y] = r.label;
    // Synthesised arc: 230 px wide, bowing 22 px up, sitting 40 px above the label (the painted
    // arc is directly above each stage name).
    p.setAttribute('d', r.arc || `M ${x - 115} ${y - 40} Q ${x} ${y - 62} ${x + 115} ${y - 40}`);
    p.dataset.stage = r.stage;
    svg.appendChild(p);
    paths.set(r.stage, p);
  }
}

export function lightStage(stage) {
  for (const [id, p] of paths) p.classList.toggle('lit', id === stage);
}
export function clearArcs() { for (const p of paths.values()) p.classList.remove('lit'); }
export function arcElement(stage) { return paths.get(stage) || null; }
