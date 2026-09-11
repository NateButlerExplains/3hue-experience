#!/usr/bin/env node
// Import the measured room surfaces (O14).
//
//   node tools/import-surfaces.mjs [dir]      dir defaults to ../art/surfaces of the main checkout
//
// Reads <dir>/<door>.json (the two-pass measurements taken on the 2560x1440 room masters, which are
// the same pixels as media/rooms/<door>-2560.*) and writes content/surfaces.json, one entry per door
// in the shape geometry.rooms.<door> takes:
//   rooms.<door>.surfaces.<id> = {role, station?, target, hidden?, quad, measurements:{a,b}, text,
//                                 panes?, dial?, occluders}
//   rooms.<door>.measuredOn    = {file: "media/rooms/<door>-2560.jpg", sha256}
// The page merges it into geometry.rooms once the tour is on (js/surfaces.js), and the lint merges it
// the same way (tools/check-manifest.js readGeometry), so everything reads geometry.rooms.<door>.
// surfaces. It is its own file because content/geometry.json is preloaded at boot and ~17 KB of
// polygons there pushed the lobby's first paint past its budget (P2a-D05) for a feature the gated
// site does not show. Everything is in master pixels (2560x1440); js/surfaces.js scales it to
// whichever derivative is on screen. The lint re-checks the passes, the means, the matrices and the
// render's hash, so a new render cannot ship with the old surfaces: measure it again, then re-run this.
//
// role     how the surface carries light (js/surfaces.js draws each differently):
//          glass  backlit frosted glass: ink printed into it (multiply), its own light turned up
//          screen a dark display: emissive type (screen blend) on a lit ground
//          scrim  glass over a busy face (the rack): a dark plate under light type
//          region not a writing surface (a table top, a niche, a plinth): it glows; the niche takes
//                 a short line on its wall plane
//          dial   the clock (a circle): it glows; a short line sits inside the ticks
// station  the door's station the surface stands for: in the door view it carries that station's
//          label (the first surface listed for a station does) and a click opens #/door/<id>/<station>;
//          in the tour a station scene or cue frames and marks the station's surfaces.
// target   whether a pointer may pick it (it still only does when it projects to 44x44 CSS px).
// hidden   corner indexes (0 TL, 1 TR, 2 BR, 3 BL) rebuilt from the other corners, not read; the
//          passes need not agree there and the quad is not their mean.
// text     the writable box as insets (fractions of the surface's width and height) from the
//          clear area the measurements give (usableQuad, clearQuad, panes) or, failing that, from the
//          occluders, plus a margin; null where nothing may be written.
//
// Station mapping (decided here; also in the PR notes). By what each surface is in the room and,
// where they agree, by where the approved station pins stood:
//   Win Trust     the six frosted panels carry the buyer's moment and what changes: panels 1-2
//                 urgency, 3-4 gap, 5-6 program (how it runs); the desk monitor proof; the folders on
//                 the table services (what you'd receive); the lit niche decision.
//   Gain Control  the wall display urgency (the pin stood on it; the figures live there); the left
//                 amber panel gap; the right amber panel program (its pin); the portfolio model proof
//                 (its pin). The console under the model is a glow the script may light, not a target
//                 (an L-shaped strip ~16 px wide, half under the plinth). No surface stands for
//                 services or decision: the panel's station chips reach them.
//   Stay Ready    the clock urgency (its pin); the three monitors gap (December, March, today); the
//                 rack services (its pin); the three panels proof, program and decision.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { solveProjective, quadSize } from '../js/screens.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DIR = '/Users/nateb/3Hue/3hue-experience/art/surfaces';
const GEO = path.join(ROOT, 'content/geometry.json');
const OUT = path.join(ROOT, 'content/surfaces.json');
const CORNERS = ['TL', 'TR', 'BR', 'BL'];
const FRAME_TOP = 432;   // master px: the highest room row the tour's door framing shows under the header

const MAP = {
  'win-trust': {
    'wt-panel-1': ['glass', 'urgency'], 'wt-panel-2': ['glass', 'urgency'], 'wt-panel-3': ['glass', 'gap'], 'wt-panel-4': ['glass', 'gap'],
    'wt-panel-5': ['glass', 'program'], 'wt-panel-6': ['glass', 'program'], 'wt-monitor': ['screen', 'proof'], 'wt-binders': ['region', 'services'], 'wt-niche': ['region', 'decision'],
  },
  'gain-control': {
    'gc-wall': ['screen', 'urgency'], 'gc-amber-left': ['glass', 'gap'], 'gc-amber-right': ['glass', 'program'], 'gc-model': ['region', 'proof'], 'gc-console': ['region', null],
  },
  'stay-ready': {
    'sr-monitor-1': ['screen', 'gap'], 'sr-monitor-2': ['screen', 'gap'], 'sr-monitor-3': ['screen', 'gap'], 'sr-panel-1': ['glass', 'proof'], 'sr-panel-2': ['glass', 'program'],
    'sr-panel-3': ['glass', 'decision'], 'sr-rack': ['scrim', 'services'], 'sr-clock': ['dial', 'urgency'],
  },
};
// Surfaces nothing may be written on (a table top under the folders, a plinth rim, a console strip).
const NO_TEXT = new Set(['wt-binders', 'gc-model', 'gc-console']);
const NOT_TARGET = new Set(['gc-console']);

const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;
const pt = (p) => [r1(+p[0]), r1(+p[1])];

// Image px → the surface's own unit square (u right, v down), through the inverse homography.
function toUnit(quad) {
  const m = solveProjective(quad, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  if (!m) throw new Error('unmappable quad');
  const [a, b, c, d, e, f, g, h] = m;
  return ([x, y]) => { const w = g * x + h * y + 1; return [(a * x + b * y + c) / w, (d * x + e * y + f) / w]; };
}
const vRange = (unit, poly) => { const v = poly.map((p) => unit(p)[1]); return [Math.max(0, Math.min(...v)), Math.min(1, Math.max(...v))]; };
const uRange = (unit, poly) => { const u = poly.map((p) => unit(p)[0]); return [Math.max(0, Math.min(...u)), Math.min(1, Math.max(...u))]; };

// The writable box. Margins: 7% of the width (at least 8 px) and 5% of the height (at least 8 px);
// screens keep 8% all round for the bezel. A clear band from the measurements wins; otherwise an
// occluder that starts in the lower two thirds pushes the bottom above it and one in the top third
// pushes the top below it (plants, bowls and chair backs stand at the foot of these surfaces).
function textBox(id, role, s, quad) {
  if (NO_TEXT.has(id)) return null;
  const { width: w, height: h } = quadSize(quad);
  const unit = toUnit(quad);
  const mx = role === 'screen' || role === 'scrim' ? 0.08 : Math.max(0.07, 8 / w);
  const my = role === 'screen' || role === 'scrim' ? 0.08 : Math.max(0.05, 8 / h);
  let top = 0, bottom = 0, left = 0, right = 0;
  if (role === 'dial') {
    // The lower half inside the inner tick ends: the hands (its occluders) stand at ten past ten, in
    // the upper half, so a short line or a mark under the hub is never crossed by them.
    const r = s.innerRadius, [x0, y0] = quad[0], [x1, y1] = quad[2];
    const top = s.centre[1] + 6, bottom = s.centre[1] + r * 0.85, half = r * 0.75;
    return { top: r3((top - y0) / (y1 - y0)), bottom: r3((y1 - bottom) / (y1 - y0)), left: r3((s.centre[0] - half - x0) / (x1 - x0)), right: r3((x1 - s.centre[0] - half) / (x1 - x0)) };
  }
  const band = s.clearQuad || s.usableQuad || null;
  if (band) {
    const [v0, v1] = vRange(unit, band);
    top = Math.max(top, v0); bottom = Math.max(bottom, 1 - v1);
  }
  if (s.panes) {
    // The largest pane inside the clear band: type never crosses a mullion.
    const lo = top, hi = 1 - bottom;
    const panes = Object.values(s.panes).map((p) => vRange(unit, p)).filter(([a, b]) => a >= lo - 0.01 && b <= hi + 0.01).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    if (panes.length) { top = Math.max(top, panes[0][0]); bottom = Math.max(bottom, 1 - panes[0][1]); }
  }
  if (!band) {
    for (const poly of s.occluders || []) {
      const [v0, v1] = vRange(unit, poly), [u0, u1] = uRange(unit, poly);
      if (v1 <= 0 || v0 >= 1 || u1 <= 0 || u0 >= 1) continue;
      if (v0 > 1 / 3) bottom = Math.max(bottom, 1 - v0);
      else if (v1 < 1 / 3) top = Math.max(top, v1);
    }
  }
  // Tall glass: type starts at or below FRAME_TOP, so the door's own framing in the tour (the header
  // covers the room down to master y 405-438 from 1280x720 to 1920x1080) never hides a line; a cued
  // surface is framed whole anyway. Kept only when a box of at least 100 px remains.
  const ys = quad.map((p) => p[1]), qTop = Math.min(...ys), qH = Math.max(...ys) - qTop;
  if (role === 'glass' && qH > 300) { const t = (FRAME_TOP - qTop) / qH; if ((1 - bottom - my - t) * qH >= 100) top = Math.max(top, t - my); }
  return { top: r3(top + my), bottom: r3(bottom + my), left: r3(left + mx), right: r3(right + mx) };
}

// A clock is measured as a circle: its quad is the bounding box of its ellipse, per pass and mean.
const ellipseBox = (c, rx, ry) => [[c[0] - rx, c[1] - ry], [c[0] + rx, c[1] - ry], [c[0] + rx, c[1] + ry], [c[0] - rx, c[1] + ry]].map(pt);

// Occluder rings as measured, points rounded to 0.1 px.
const polys = (list) => (Array.isArray(list) ? list : []).filter((p) => Array.isArray(p) && p.length >= 3).map((p) => p.map(pt));

function importDoor(door, src) {
  const out = {};
  const map = MAP[door] || {};
  for (const [id, s] of Object.entries(src.surfaces || {})) {
    const [role, station] = map[id] || ['region', null];
    const e = { role };
    if (station) e.station = station;
    e.target = !NOT_TARGET.has(id);
    if (s.centre && s.radius) {
      const rx = s.radiusX ?? s.radius, ry = s.radiusY ?? s.radius;
      e.quad = ellipseBox(s.centre, rx, ry);
      e.measurements = { a: ellipseBox(s.passA.centre, s.passA.radiusX ?? s.passA.radius, s.passA.radiusY ?? s.passA.radius), b: ellipseBox(s.passB.centre, s.passB.radiusX ?? s.passB.radius, s.passB.radiusY ?? s.passB.radius) };
      e.text = textBox(id, 'dial', s, e.quad);
      e.dial = { centre: pt(s.centre), radius: r1(s.radius), radiusX: r1(rx), radiusY: r1(ry), innerRadius: r1(s.innerRadius) };
    } else {
      const hidden = (s.hiddenCorners || []).map((c) => CORNERS.indexOf(c)).filter((i) => i >= 0);
      if (hidden.length) e.hidden = hidden;
      e.quad = s.quad.map(pt);
      e.measurements = { a: s.passA.map(pt), b: s.passB.map(pt) };
      e.text = textBox(id, role, s, e.quad);
      if (s.panes) e.panes = Object.fromEntries(Object.entries(s.panes).map(([k, q]) => [k, q.map(pt)]));
    }
    e.occluders = polys(s.occluders);
    out[id] = e;
  }
  return out;
}

// ---- Writing: printed compactly (a point per pair of numbers, a polygon per line) so a room stays
// readable in review. ----
const inline = (v) => JSON.stringify(v);
function printSurfaces(surfaces, pad) {
  const i1 = pad + '  ', i2 = i1 + '  ', i3 = i2 + '  ';
  const rows = Object.entries(surfaces).map(([id, s]) => {
    const f = [];
    for (const [k, v] of Object.entries(s)) {
      if (k === 'measurements') f.push(`${i2}"measurements": {\n${i3}"a": ${inline(v.a)},\n${i3}"b": ${inline(v.b)}\n${i2}}`);
      else if (k === 'occluders') f.push(v.length ? `${i2}"occluders": [\n${v.map((p) => i3 + inline(p)).join(',\n')}\n${i2}]` : `${i2}"occluders": []`);
      else if (k === 'panes') f.push(`${i2}"panes": {\n${Object.entries(v).map(([n, q]) => `${i3}"${n}": ${inline(q)}`).join(',\n')}\n${i2}}`);
      else f.push(`${i2}${JSON.stringify(k)}: ${inline(v)}`);
    }
    return `${i1}${JSON.stringify(id)}: {\n${f.join(',\n')}\n${i1}}`;
  });
  return `{\n${rows.join(',\n')}\n${pad}}`;
}

const NOTE = 'Room surfaces (O14), written by tools/import-surfaces.mjs from the two-pass measurements on each 2560x1440 master. Merged into geometry.rooms.<door> by js/surfaces.js (once the tour is on) and by tools/check-manifest.js. Master pixels; quads TL TR BR BL.';
function main(argv) {
  const dir = path.resolve(argv[0] || DEFAULT_DIR);
  const g = JSON.parse(fs.readFileSync(GEO, 'utf8'));
  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { rooms: {} };
  const rooms = {};
  for (const door of Object.keys(MAP)) {
    const f = path.join(dir, `${door}.json`);
    if (!fs.existsSync(f)) { console.warn(`skip ${door}: no ${f}`); if (old.rooms?.[door]) rooms[door] = old.rooms[door]; continue; }
    const src = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (src.width !== 2560 || src.height !== 1440) throw new Error(`${f}: measured on ${src.width}x${src.height}, expected the 2560x1440 master`);
    if (!g.rooms?.[door]) throw new Error(`geometry.rooms.${door} missing`);
    const file = `media/rooms/${door}-2560.jpg`;
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex');
    rooms[door] = { measuredOn: { file, sha256 }, surfaces: importDoor(door, src) };
    console.log(`${door}: ${Object.keys(rooms[door].surfaces).length} surfaces, measured on ${file} (${sha256.slice(0, 12)}…)`);
  }
  const text = printFile(rooms);
  JSON.parse(text);   // never write a file that does not parse
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}
function printFile(rooms) {
  const doors = Object.entries(rooms).map(([door, r]) => `    ${JSON.stringify(door)}: {\n      "measuredOn": ${inline(r.measuredOn)},\n      "surfaces": ${printSurfaces(r.surfaces, '      ')}\n    }`);
  return `{\n  "note": ${JSON.stringify(NOTE)},\n  "rooms": {\n${doors.join(',\n')}\n  }\n}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
export { importDoor, MAP, printFile };
