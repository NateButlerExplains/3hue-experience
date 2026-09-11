// AiVRIC's sphere (O10): the guide's face in the tour card's head row (#tour-guide, aria-hidden).
// This is this repo's own drawing code. The owner's tour has a sphere in the same visual style, but
// its repo carries no licence, so nothing here is taken from it.
//
// A Fibonacci sphere of nodes, each tied by threads to its nearest neighbours, turning slowly.
//   idle      it breathes (a slow swell of the radius) and turns;
//   choice    "Your call": it slows and part of it warms to the lit-arc colour;
//   speaking  the voice (js/voice.js) reports each word from the line's timings and the sphere
//             pulses on it: brighter nodes, a wider halo, then it settles. While the voice is on
//             the words are the only pulse; captions alone give one soft pulse per line.
// The drawing loop runs only while the card is on screen and the page is visible, at about 30
// frames a second, and stops when the tour ends or the tab is hidden. It never moves for more than
// IDLE_MS after the last change (a new line or node, a choice, the voice starting or stopping, a
// word's pulse, the tab coming back) unless the voice is speaking, and it holds still while the
// visitor has paused the tour (Pause): so with the voice off the sphere settles into a still frame
// a few seconds after each step, and no motion runs past 5 s without the visitor doing something
// (WCAG 2.2.2). Under reduced motion there is no loop: one still frame is drawn each time the state
// changes, and nothing pulses.
//
// The voice reports through pulseGuide() and speakingGuide(), or the same as events on document:
//   lobby:voice {type: 'play' | 'word' (strength 0..1) | 'stop'}; the tour's lobby:tour events carry
// its pause reasons (pausedBy) with 'pause' and 'resume'.
import { reducedMotion } from './content.js?v=2026-09-10f';

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const COOL = [82, 204, 227];    // --cyan-ink
const DEEP = [37, 181, 214];    // --cyan
const WARM = [255, 217, 163];   // the path's lit arcs
const N = 64, NEAREST = 3;
const SPIN = { idle: 0.34, choice: 0.16, speaking: 0.5, off: 0 };   // radians a second
const IDLE_MS = 4000;           // motion after a change while nothing is speaking

let canvas = null, g = null;
let pts = [], links = [];
let mode = 'off', speaking = false, active = false, held = false;
let energy = 0, warmth = 0, clock = 1.3, last = 0, until = 0;
let raf = 0, running = false, frames = 0, drawn = null;

// A change on screen: the sphere may move for IDLE_MS from now.
const wake = () => { until = performance.now() + IDLE_MS; };

// The sphere: N points spread evenly over a unit sphere (the golden-angle spiral), a warm share of
// them picked by the same spiral so the warm patches are scattered, and each point's nearest
// neighbours as threads (each pair once).
function build() {
  pts = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - ((i + 0.5) / N) * 2, r = Math.sqrt(1 - y * y), a = i * GOLDEN;
    pts.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, warm: ((i * 0.618034) % 1) > 0.58 ? 1 : 0.2 });
  }
  const seen = new Set();
  links = [];
  pts.forEach((p, i) => {
    const near = pts.map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, NEAREST);
    for (const { j } of near) { const k = i < j ? `${i}.${j}` : `${j}.${i}`; if (!seen.has(k)) { seen.add(k); links.push([i, j]); } }
  });
}

export function initGuide(el) {
  if (canvas || !el) return;
  canvas = el;
  g = canvas.getContext('2d');
  build();
  document.addEventListener('lobby:tour', onTour);
  document.addEventListener('lobby:voice', (e) => {
    const d = e.detail || {};
    if (d.type === 'play') speakingGuide(true);
    else if (d.type === 'stop') speakingGuide(false);
    else if (d.type === 'word') pulseGuide(d.strength ?? 0.8);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); sync(); });
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { drawn = null; sync(); }); } catch { /* old Safari: no change events */ }
}

// The tour's own signals (js/tour.js emit): a node or a line on screen, a choice waiting, a pause
// reason on or off, the end.
function onTour(e) {
  const d = e.detail || {};
  if (d.type === 'end') { active = false; speaking = false; held = false; mode = 'off'; energy = 0; drawn = null; sync(); return; }
  active = !!canvas && canvas.getClientRects().length > 0;
  if (d.type === 'pause' || d.type === 'resume') {
    held = Array.isArray(d.pausedBy) && d.pausedBy.includes('user');
    if (!held) wake();
  }
  if (d.type === 'line' || d.type === 'node' || d.type === 'start') {
    mode = d.phase === 'choice' ? 'choice' : speaking ? 'speaking' : 'idle';
    if (d.type === 'line' && !speaking && !d.voice && !reducedMotion()) energy = Math.max(energy, 0.45);
    wake();
  }
  sync();
}

// The voice: speaking on or off, and one pulse per word (strength 0..1).
export function speakingGuide(on) {
  speaking = !!on;
  if (mode !== 'off' && mode !== 'choice') mode = speaking ? 'speaking' : 'idle';
  wake();
  sync();
}
export function pulseGuide(strength = 0.8) {
  if (reducedMotion() || mode === 'off') return;
  energy = Math.max(energy, Math.max(0, Math.min(1, +strength || 0)));
  wake();
}

export function guideStats() { return { frames, running, mode, active, held }; }

// Run the loop only while it can be seen and may move (speaking, or within IDLE_MS of a change, and
// not held by Pause); otherwise the last frame stays. Under reduced motion draw the state once.
function sync() {
  const visible = active && !!canvas && !document.hidden && mode !== 'off';
  if (visible && !reducedMotion() && !held && (speaking || performance.now() < until)) {
    if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
    return;
  }
  if (running) { cancelAnimationFrame(raf); running = false; }
  if (visible && reducedMotion()) still();
  else if (visible && !frames) draw();   // never drawn yet: one frame, so the sphere is there
}

function tick(now) {
  if (!running) return;
  // Settled: nothing is speaking and the last change is IDLE_MS old. The frame on the canvas stays.
  if (!speaking && now >= until) { running = false; return; }
  raf = requestAnimationFrame(tick);
  const dt = now - last;
  if (dt < 30) return;   // about 30 frames a second is plenty for a 44 px sphere
  last = now;
  const s = Math.min(dt, 100) / 1000;
  clock += s;
  energy *= Math.exp(-s / 0.26);
  warmth += ((mode === 'choice' ? 1 : 0) - warmth) * Math.min(1, s * 3);
  draw();
}

// Reduced motion: one frame per state (and per size), no pulse, no easing.
function still() {
  const key = `${mode}|${size().join('x')}`;
  if (key === drawn) return;
  drawn = key;
  energy = 0;
  warmth = mode === 'choice' ? 1 : 0;
  draw();
}

function size() {
  const b = canvas.getBoundingClientRect();
  return [Math.max(1, Math.round(b.width)), Math.min(2, window.devicePixelRatio || 1)];
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;

function draw() {
  const [css, dpr] = size();
  const px = Math.round(css * dpr);
  if (canvas.width !== px || canvas.height !== px) { canvas.width = px; canvas.height = px; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, css, css);
  const c = css / 2;
  const breathe = mode === 'off' ? 0 : 0.035 * Math.sin((clock * TAU) / 4.2);
  const R = css * 0.34 * (1 + breathe + 0.08 * energy);

  // Halo and core: the glow the nodes sit in.
  const halo = g.createRadialGradient(c, c, R * 0.1, c, c, R * 1.45);
  halo.addColorStop(0, rgba(mix(DEEP, WARM, warmth * 0.35), 0.34 + 0.3 * energy));
  halo.addColorStop(0.55, rgba(DEEP, 0.12 + 0.12 * energy));
  halo.addColorStop(1, rgba(DEEP, 0));
  g.fillStyle = halo;
  g.fillRect(0, 0, css, css);

  // Turn about the vertical axis, tilted towards the viewer, with a slight wobble.
  const ay = clock * (SPIN[mode] ?? 0.3), ax = 0.42 + 0.05 * Math.sin(clock * 0.7);
  const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
  const P = pts.map((p) => {
    const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
    const y2 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;
    return { x: c + x1 * R, y: c + y2 * R, d: (z2 + 1) / 2, warm: p.warm };
  });

  g.lineWidth = 0.6;
  for (const [i, j] of links) {
    const a = P[i], b = P[j], d = (a.d + b.d) / 2;
    g.strokeStyle = rgba(mix(COOL, WARM, warmth * ((a.warm + b.warm) / 2)), 0.06 + 0.34 * d * d + 0.2 * energy);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  for (const p of [...P].sort((a, b) => a.d - b.d)) {
    g.fillStyle = rgba(mix(COOL, WARM, warmth * p.warm), 0.3 + 0.7 * p.d + 0.2 * energy);
    g.beginPath(); g.arc(p.x, p.y, 0.5 + 1.15 * p.d + 0.7 * energy * p.d, 0, TAU); g.fill();
  }
  frames++;
}
