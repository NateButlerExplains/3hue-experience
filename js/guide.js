// The guides' sphere (O10, O12): Avi's and Huey's face. Its drawing is the owner's tour's sphere,
// ported with his permission from 3HUE/3HUE-Website experience/js/tour/guide.js at 797b153 (see
// docs/PROVENANCE.md): 96 points on a Fibonacci sphere, every ninth one gold, threads between near
// neighbours, a glow, a white-and-gold core and, while the visitor talks, a listening ring; drawn in
// its 220-unit space so every size keeps its proportions. What is ours: the scheduler below, the tint
// read from CSS per guide, the pulse taken from the voice's word timings instead of an audio
// analyser (the voice's elements stay plain <audio>, so iOS unlocking and ?voice=sim need nothing
// more), and several canvases drawn from one loop.
//
// Canvases: the tour card's (#tour-guide) follows whoever says the line on screen; the Ask console's
// and its minimised pill's (attachOrb(canvas, {follow: 'lead'})) follow the lead. Each canvas's
// guide is its data-guide; css/tour.css maps a guide to --orb-a (accent), --orb-b (gold) and
// --orb-c (pale), read here once per guide.
//   idle      it breathes and turns (a turn about every 14 s, nodding ±20°);
//   choice    "Your call": it turns at half speed;
//   speaking  it pulses on each word the voice reports (js/voice.js), the nodes swell and shimmer;
//             captions alone give one soft pulse per line;
//   listening the microphone is on (Ask): the listening ring.
// The loop runs only while a canvas is on screen and the page is visible, at about 30 frames a
// second, and stops when nothing is shown or the tab is hidden. It never moves for more than IDLE_MS
// after the last change (a new line or node, a choice, the voice starting or stopping, a word's
// pulse, the tab coming back) unless the voice is speaking or the microphone listening, and it holds
// still while the visitor has paused the tour (Pause): so with the voice off the sphere settles into
// a still frame a few seconds after each step, and no motion runs past 5 s without the visitor doing
// something (WCAG 2.2.2). Under reduced motion there is no loop: one still frame is drawn each time
// the state, the guide or the size changes, and nothing pulses.
//
// The voice reports through pulseGuide() and speakingGuide(), or as events on document:
//   lobby:voice {type: 'play' | 'word' (strength 0..1) | 'stop'}; the tour's lobby:tour events carry
// its pause reasons (pausedBy) with 'pause' and 'resume', the speaker and the lead; Ask's lobby:ask
// {type: 'listening', on} turns the listening ring on and off.
import { reducedMotion } from './content.js?v=2026-09-10f';

const TAU = Math.PI * 2;
const UNIT = 220;                 // the owner's canvas size: every length below is in these units
const N = 96;
const RATE = 0.51;                // his t per second (0.0085 a frame at 60 fps)
const SPIN = { idle: 1, choice: 0.5, speaking: 1, listening: 1, off: 0 };
const IDLE_MS = 4000;             // motion after a change while nothing is speaking or listening
const DEFAULT_TINT = { a: [31, 182, 255], b: [255, 214, 58], c: [210, 240, 255] };

const PTS = [];
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
  PTS.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, gold: i % 9 === 0 });
}

const orbs = [];                  // {canvas, g, follow: 'speaker' | 'lead', tint, tintKey}
let speaker = null, lead = null;
let mode = 'off', speaking = false, listening = false, active = false, held = false;
let energy = 0, level = 0, clock = 1.3, last = 0, until = 0;
let raf = 0, running = false, frames = 0, drawn = null;

const wake = () => { until = performance.now() + IDLE_MS; };

export function initGuide(el) {
  if (!el || orbs.some((o) => o.canvas === el)) return;
  attachOrb(el, { follow: 'speaker' });
  document.addEventListener('lobby:tour', onTour);
  document.addEventListener('lobby:voice', (e) => {
    const d = e.detail || {};
    if (d.type === 'play') speakingGuide(true);
    else if (d.type === 'stop') speakingGuide(false);
    else if (d.type === 'word') pulseGuide(d.strength ?? 0.8);
  });
  document.addEventListener('lobby:ask', (e) => { const d = e.detail || {}; if (d.type === 'listening') listenGuide(!!d.on); else if (d.type === 'lead') setLeadGuide(d.lead); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); sync(); });
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { drawn = null; sync(); }); } catch { /* old Safari: no change events */ }
}

// Another canvas drawing the same sphere (the Ask console's head, its pill), tinted by the lead.
export function attachOrb(canvas, { follow = 'lead' } = {}) {
  if (!canvas || orbs.some((o) => o.canvas === canvas)) return;
  orbs.push({ canvas, g: canvas.getContext('2d'), follow, tint: DEFAULT_TINT, tintKey: null });
  canvas.dataset.guide = (follow === 'lead' ? lead : speaker) || '';
  drawn = null;
  wake(); sync();
}
// Ask shows its console outside the tour too, before any lead has been picked.
export function setLeadGuide(id) { if (id && id !== lead) { lead = id; retint(); } }

// The tour's own signals (js/tour.js emit): a node or a line on screen, a choice waiting, a pause
// reason on or off, the speaker and the lead, the end.
function onTour(e) {
  const d = e.detail || {};
  if (d.type === 'end') { active = false; speaking = false; held = false; mode = 'off'; energy = 0; drawn = null; sync(); return; }
  active = true;
  if (d.speaker && d.speaker !== speaker) { speaker = d.speaker; retint(); }
  if (d.lead && d.lead !== lead) { lead = d.lead; retint(); }
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
function retint() {
  for (const o of orbs) { const id = (o.follow === 'lead' ? lead : speaker) || ''; if (o.canvas.dataset.guide !== id) { o.canvas.dataset.guide = id; o.drawn = false; } }
  drawn = null; wake(); sync();
}

// The voice: speaking on or off, and one pulse per word (strength 0..1).
export function speakingGuide(on) {
  speaking = !!on;
  if (mode !== 'off' && mode !== 'choice') mode = speaking ? 'speaking' : 'idle';
  wake(); sync();
}
export function pulseGuide(strength = 0.8) {
  if (reducedMotion() || mode === 'off' && !orbs.some(shownOutsideTour)) return;
  energy = Math.max(energy, Math.max(0, Math.min(1, +strength || 0)));
  wake();
}
export function listenGuide(on) { listening = !!on; drawn = null; wake(); sync(); }

export function guideStats() { return { frames, running, mode, active, held, speaker, lead, listening, orbs: orbs.filter(visible).length }; }

const shownOutsideTour = (o) => o.follow === 'lead' && visible(o);
function visible(o) { return o.canvas.isConnected && o.canvas.getClientRects().length > 0; }
const shown = () => orbs.filter((o) => visible(o) && (o.follow === 'lead' || (active && mode !== 'off')));
const modeFor = (o) => (o.follow === 'lead' && listening ? 'listening' : o.follow === 'lead' && mode === 'off' ? 'idle' : mode);

// Run the loop only while a sphere can be seen and may move (speaking, listening, or within IDLE_MS
// of a change, and not held by Pause); otherwise the last frame stays. Under reduced motion draw the
// state once.
function sync() {
  const list = document.hidden ? [] : shown();
  const moving = speaking || listening || performance.now() < until;
  if (list.length && !reducedMotion() && !held && moving) {
    if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
    return;
  }
  if (running) { cancelAnimationFrame(raf); running = false; }
  if (list.length && reducedMotion()) still(list);
  else for (const o of list) if (!o.drawn) drawOrb(o);   // never drawn yet: one frame, so the sphere is there
}

function tick(now) {
  if (!running) return;
  // Settled: nothing is speaking or listening and the last change is IDLE_MS old. The frames stay.
  if (!speaking && !listening && now >= until) { running = false; return; }
  raf = requestAnimationFrame(tick);
  const dt = now - last;
  if (dt < 30) return;   // about 30 frames a second
  last = now;
  const s = Math.min(dt, 100) / 1000;
  clock += s * (SPIN[mode] ?? 1);
  energy *= Math.exp(-s / 0.26);
  const t = clock * RATE;
  // His level: the speaking voice's loudness, here its word pulses; listening breathes on its own.
  const target = listening ? 0.25 + 0.1 * Math.sin(t * 6) : speaking ? Math.max(0.3, energy) : energy * 0.6;
  level += (target - level) * Math.min(1, s * 15);
  for (const o of shown()) drawOrb(o);
}

// Reduced motion: one frame per state, guide and size; a fixed moment, no pulse, no easing.
function still(list) {
  const key = `${mode}|${listening}|${list.map((o) => `${o.canvas.dataset.guide}:${size(o).join('x')}`).join(',')}`;
  if (key === drawn) return;
  drawn = key;
  energy = 0;
  level = speaking || mode === 'speaking' ? 0.35 : 0;
  for (const o of list) drawOrb(o, { at: 1.3 });
}

function size(o) {
  const b = o.canvas.getBoundingClientRect();
  return [Math.max(1, Math.round(b.width)), Math.min(2, window.devicePixelRatio || 1)];
}

// A guide's colours, from css/tour.css (--orb-a, --orb-b, --orb-c as "r g b"), read once per guide.
function tintOf(o) {
  const key = o.canvas.dataset.guide || '';
  if (o.tintKey === key) return o.tint;
  const cs = getComputedStyle(o.canvas);
  const read = (name, fb) => { const v = cs.getPropertyValue(name).trim().split(/[\s,]+/).map(Number); return v.length === 3 && v.every((x) => Number.isFinite(x)) ? v : fb; };
  o.tint = { a: read('--orb-a', DEFAULT_TINT.a), b: read('--orb-b', DEFAULT_TINT.b), c: read('--orb-c', DEFAULT_TINT.c) };
  o.tintKey = key;
  return o.tint;
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

function drawOrb(o, { at = null } = {}) {
  const [css, dpr] = size(o);
  const px = Math.round(css * dpr);
  const { canvas, g } = o;
  if (canvas.width !== px || canvas.height !== px) { canvas.width = px; canvas.height = px; }
  g.setTransform(px / UNIT, 0, 0, px / UNIT, 0, 0);
  g.clearRect(0, 0, UNIT, UNIT);
  const tint = tintOf(o), m = modeFor(o);
  const t = (at ?? clock) * RATE;
  const lv = m === 'listening' && at != null ? 0.3 : level;
  const W = UNIT, cx = W / 2, cy = W / 2;
  const R = W * (0.30 + 0.05 * lv + (m === 'listening' ? 0.02 : 0)) * (1 + 0.012 * Math.sin(t * 2));

  // Glow.
  const glow = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.55);
  glow.addColorStop(0, rgba(tint.a, 0.20 + 0.35 * lv)); glow.addColorStop(0.55, rgba(tint.a, 0.06 + 0.12 * lv)); glow.addColorStop(1, rgba(tint.a, 0));
  g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, R * 1.55, 0, TAU); g.fill();

  // Turn about the vertical axis, nodding.
  const ay = t * 0.9, ax = Math.sin(t * 0.5) * 0.35, ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
  const wobble = m === 'speaking' && at == null;
  const P = PTS.map((p) => {
    let x = p.x * ca - p.z * sa, z = p.x * sa + p.z * ca, y = p.y;
    const y2 = y * cb - z * sb; z = y * sb + z * cb; y = y2;
    const wob = 1 + (wobble ? lv * 0.12 * Math.sin(t * 20 + p.y * 6) : 0);
    return { x: cx + x * R * wob, y: cy + y * R * wob, z, gold: p.gold };
  });

  // Threads between near neighbours.
  g.lineWidth = 1;
  const near = R * R * 0.22;
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const a = P[i], b = P[j], dx = a.x - b.x, dy = a.y - b.y;
    if (dx * dx + dy * dy < near) {
      const depth = (a.z + b.z) / 2 + 1, al = (0.10 + 0.35 * depth / 2) * (0.6 + 0.8 * lv);
      g.strokeStyle = a.gold && b.gold ? rgba(tint.b, al) : rgba(tint.a, al);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
  }
  // Nodes.
  for (const p of P) {
    const depth = (p.z + 1) / 2, r = 1.2 + depth * 1.8 + lv * 1.2;
    g.fillStyle = p.gold ? rgba(tint.b, 0.5 + 0.5 * depth) : rgba(tint.c, 0.35 + 0.65 * depth);
    g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill();
  }
  // Listening ring.
  if (m === 'listening') {
    const pulse = at == null ? Math.sin(t * 8) : 0;
    g.strokeStyle = rgba(tint.a, 0.5 + 0.3 * pulse); g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, R * 1.28 + 3 * pulse, 0, TAU); g.stroke();
  }
  // Core.
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.42);
  core.addColorStop(0, `rgba(255,255,255,${(0.55 + 0.4 * lv).toFixed(3)})`); core.addColorStop(0.5, rgba(tint.b, 0.18 + 0.3 * lv)); core.addColorStop(1, rgba(tint.b, 0));
  g.fillStyle = core; g.beginPath(); g.arc(cx, cy, R * 0.42, 0, TAU); g.fill();
  o.drawn = true;
  frames++;
}
