#!/usr/bin/env node
// Refuse to build a manifest that could put the wrong words on a public surface.
//
//   node tools/check-manifest.js [manifest.json] [--tour tour.json]
//
// Lints content/experience.json (or the manifest given), then the guided-tour script it names in
// tour.manifest (or the file given with --tour) against it. Exits 1 on any error. The specs import
// lintManifest, lintTour and figures directly; running the file is the CLI.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolveRef, resolveLine, resolveToken, fillTemplate, templateTokens, stripTokens, sceneOf, optionValue, guideIds, SCENES, ACTIONS, STATUSES, TOKEN_KINDS, tokens, WRITE_KINDS, MAX_WRITE_ITEMS } from '../js/tourtext.js';
import { quadToMatrix3d, quadSize, quadProblem, normalizeQuad } from '../js/screens.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8'));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const own = (o, k) => isObj(o) && Object.prototype.hasOwnProperty.call(o, k);
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// A repo-relative path: plain characters, no scheme, no leading slash, no dot segments.
const safeRelative = (p) => typeof p === 'string' && /^[\w./-]+$/.test(p) && !/(^|\/)\.\.?(\/|$)/.test(p) && !p.startsWith('/');

// Strings no visitor reads: provenance, paths, URLs, plate data, and the tour and voice settings.
const NON_VISIBLE = /\.(source|basis|provenance|ref|placeholder|src|srcset2x|card|url|bookingUrl|logoHref|route|derive)$/;
const SETTINGS = /^(plate|tour|guide\.voice|guide\.lead|guide\.guides\.[a-z]+\.voice)(\.|\[|$)/;
export function visibleStrings(m) {
  const strings = [];
  (function walk(v, p) {
    if (typeof v === 'string') strings.push([p, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) {
      if (p === '' && (k === 'vocabulary' || k === 'sources' || k === 'note')) continue;
      walk(v[k], p ? `${p}.${k}` : k);
    }
  })(m, '');
  return strings.filter(([p]) => !NON_VISIBLE.test(p) && !SETTINGS.test(p));
}
const isVisiblePath = (p) => !NON_VISIBLE.test(p) && !SETTINGS.test(p) && !/^(vocabulary|sources|note|version)(\.|$)/.test(p);

// ---- Figures. A figure reaches a public surface only from a manifest field that prints its source,
// so the tour script may carry one only through a ref. Spelled-out numbers count: "sixty-one
// percent", "ten business days", "under thirty minutes" and "one in five" are figures. A number
// word that counts things on screen ("three doors", "four questions") is not; neither is a bare
// digit inside a framework name (SOC 2, ISO 27001, 800-53).
const SMALL = '(?:zero|one|two|three|four|five|six|seven|eight|nine|ten)';
const BIG = '(?:eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|dozen)s?';
const TIME = '(?:(?:business|working|calendar)[\\s-]+)?(?:second|minute|hour|day|week|month|quarter|year)s?';
const FIGURES = [
  /\d(?:[\d,.]*\d)?\s?%/,                                                  // 61%, 86.8 %
  /[$€£]\s?\d/,                                                            // $25B
  /\b\d{1,3}(?:,\d{3})+\b/,                                                // 1,000
  /\b\d+(?:\.\d+)?\s?(?:\+|×|x\b)/i,                                       // 50+, 3x
  /\b\d+(?:\.\d+)?(?:k|bn|b|m)\b/i,                                        // 25B, 10k
  /\b\d+(?:\.\d+)?\s+(?:hundred|thousand|million|billion|trillion)\b/i,     // 359 million
  new RegExp(`\\b\\d+(?:\\.\\d+)?[\\s-]+${TIME}\\b`, 'i'),                  // 10 business days, 10-business-day
  /\b(?:percent|per\s+cent|percentage\s+points?|dollars?)\b/i,
  new RegExp(`\\b${BIG}\\b`, 'i'),                                         // seventy-two, nine hundred
  new RegExp(`\\b${SMALL}[\\s-]+${TIME}\\b`, 'i'),                          // ten business days, six months
  new RegExp(`\\b${SMALL}\\s+(?:times|fold)\\b`, 'i'),
  new RegExp(`\\b${SMALL}\\s+(?:in|out\\s+of)\\s+${SMALL}\\b`, 'i'),         // one in five
  /\b(?:half|a\s+third|two[\s-]thirds|a\s+quarter|three[\s-]quarters)\s+of\b/i,
  /\bzero\s+(?!trust\b)[a-z]+s\b/i,                                         // zero findings (not zero trust)
];
export function figures(s) {
  const out = [];
  for (const re of FIGURES) { const x = String(s ?? '').match(re); if (x) out.push(x[0]); }
  return out;
}

// ---- Room surfaces (O14): geometry.rooms.<door>.surfaces, in master pixels of the 2560x1440 render.
// They live in content/surfaces.json (rooms.<door>: {measuredOn, surfaces}, tools/import-surfaces.mjs),
// off the boot path; the page merges them into the geometry once the tour is on and readGeometry()
// does the same here, so every check below reads geometry.rooms.<door>.surfaces.
// Each is read twice (passes a and b) and the two agree within 2 px on every corner that could be
// seen; the quad is their mean within 0.5 px (a hidden corner is rebuilt, so neither rule applies
// there); it maps to a matrix3d; its station is one of the door's; its occluders and text box stay
// on the image. measuredOn names the render they were read on with its SHA-256, so a new render of
// the room fails here until it is measured again (tools/geometry-tool.html) and re-imported.
export function mergeSurfaces(g, sf) {
  for (const [door, r] of Object.entries(isObj(sf?.rooms) ? sf.rooms : {})) if (isObj(r)) { g.rooms = g.rooms || {}; g.rooms[door] = { ...(g.rooms[door] || {}), ...r }; }
  return g;
}
export function readGeometry(root = ROOT) {
  const read = (f) => JSON.parse(fs.readFileSync(path.resolve(root, f), 'utf8'));
  const g = read('content/geometry.json');
  return fs.existsSync(path.resolve(root, 'content/surfaces.json')) ? mergeSurfaces(g, read('content/surfaces.json')) : g;
}
export const SURFACE_ROLES = ['glass', 'screen', 'scrim', 'region', 'dial'];
const PASS_PX = 2, MEAN_PX = 0.5;
export function lintSurfaces(d, room, err, root = ROOT) {
  const p0 = `geometry.rooms.${d.id}`;
  const S = room.surfaces;
  if (!isObj(S) || !Object.keys(S).length) { err(`${p0}.surfaces must map a surface id to its measurements`); return; }
  const W = Number(room.width) || 2560, H = Number(room.height) || 1440;
  const on = room.measuredOn;
  if (!isObj(on) || on.file !== `media/rooms/${d.id}-${W}.jpg` || !/^[0-9a-f]{64}$/.test(on.sha256 || '')) err(`${p0}.measuredOn must be {file: "media/rooms/${d.id}-${W}.jpg", sha256}`);
  else {
    const f = path.resolve(root, on.file);
    if (!fs.existsSync(f)) err(`${p0}.measuredOn: ${on.file} does not exist`);
    else if (crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') !== on.sha256) err(`${p0}: ${on.file} is not the render the surfaces were measured on (sha256 differs); measure the new render in tools/geometry-tool.html and re-run tools/import-surfaces.mjs`);
  }
  const onImage = ([x, y]) => x >= 0 && y >= 0 && x <= W && y <= H;
  for (const [id, s] of Object.entries(S)) {
    const p = `${p0}.surfaces.${id}`;
    if (!ID.test(id)) err(`${p}: a surface id must match ^[a-z0-9-]+$`);
    if (!isObj(s)) { err(`${p} must be an object`); continue; }
    if (!SURFACE_ROLES.includes(s.role)) err(`${p}.role must be one of ${SURFACE_ROLES.join(', ')}`);
    if (s.station !== undefined && !(d.stations || []).includes(s.station)) err(`${p}.station ${JSON.stringify(s.station)} is not a station of ${d.id}`);
    if (typeof s.target !== 'boolean') err(`${p}.target must be true or false`);
    const q = normalizeQuad(s.quad), a = normalizeQuad(s.measurements?.a), b = normalizeQuad(s.measurements?.b);
    if (!q) { err(`${p}.quad must be four [x, y] corners (TL, TR, BR, BL)`); continue; }
    const why = quadProblem(q);
    if (why) err(`${p}.quad: ${why}`);
    const { width: w, height: h } = quadSize(q);
    if (!quadToMatrix3d(q, w, h)) err(`${p}.quad does not map to a matrix3d`);
    if (!q.every(onImage)) err(`${p}.quad leaves the ${W}x${H} image`);
    const hidden = s.hidden === undefined ? [] : s.hidden;
    if (!Array.isArray(hidden) || hidden.some((i) => !Number.isInteger(i) || i < 0 || i > 3) || new Set(hidden).size !== hidden.length || hidden.length > 2) err(`${p}.hidden lists at most two corner indexes 0-3`);
    if (!a || !b) err(`${p}.measurements needs passes a and b, four corners each`);
    else for (let i = 0; i < 4; i++) {
      if (hidden.includes(i)) continue;
      const dist = Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]);
      if (dist > PASS_PX) err(`${p}: corner ${i} disagrees by ${dist.toFixed(2)} px between passes a and b (at most ${PASS_PX}; a corner that cannot be seen is declared in hidden)`);
      for (let j = 0; j < 2; j++) {
        const mean = (a[i][j] + b[i][j]) / 2;
        if (Math.abs(q[i][j] - mean) > MEAN_PX) err(`${p}: quad corner ${i} axis ${j} is ${q[i][j]}, not the mean ${mean.toFixed(2)} of the passes (within ${MEAN_PX} px)`);
      }
    }
    const polys = s.occluders;
    if (!Array.isArray(polys) || polys.some((o) => !Array.isArray(o) || o.length < 3 || o.some((pt) => !Array.isArray(pt) || pt.length !== 2 || !pt.every(Number.isFinite)))) err(`${p}.occluders must be a list of polygons of [x, y] points`);
    else if (polys.some((o) => !o.every(onImage))) err(`${p}.occluders leave the ${W}x${H} image`);
    if (s.text !== null) {
      const t = s.text;
      const ok = isObj(t) && ['top', 'bottom', 'left', 'right'].every((k) => Number.isFinite(t[k]) && t[k] >= 0 && t[k] < 1) && t.top + t.bottom < 1 && t.left + t.right < 1;
      if (!ok) err(`${p}.text must be null or {top, bottom, left, right} insets that leave a box`);
    }
    if (s.panes !== undefined && (!isObj(s.panes) || Object.values(s.panes).some((x) => !normalizeQuad(x) || quadProblem(normalizeQuad(x))))) err(`${p}.panes must map a name to a quad`);
    if (s.dial !== undefined && (!isObj(s.dial) || !normalizeQuad([s.dial.centre, s.dial.centre, s.dial.centre, s.dial.centre]) || !onImage(s.dial.centre) || !(s.dial.radius > 0))) err(`${p}.dial must be {centre, radius} on the image`);
  }
}

// ---- content/experience.json ----
export function lintManifest(m, g, { root = ROOT } = {}) {
  const errors = [], warnings = [];
  const err = (s) => errors.push(s);
  const warn = (s) => warnings.push(s);
  const visible = visibleStrings(m);

  const v = m.vocabulary || {};
  for (const [p, s] of visible) {
    for (const w of v.forbidden || []) if (s.toLowerCase().includes(w.toLowerCase())) err(`forbidden "${w}" in ${p}: ${s}`);
    for (const w of v.retired || []) if (s.includes(w)) err(`retired name "${w}" in ${p}: ${s}`);
    for (const w of v.avoid || []) if (s.toLowerCase().includes(w.toLowerCase())) warn(`avoid "${w}" in ${p}`);
    if (/\$\s?\d/.test(s) && !/\.(stat|statSecondary|opening)\.text$/.test(p)) err(`currency figure outside a sourced field in ${p}: ${s}`);
    if (/\d+(\.\d+)?%/.test(s) && !/\.(stat|statSecondary|opening)\.text$/.test(p)) err(`percentage outside a sourced field in ${p}: ${s}`);
    if (/\b3hue\b|\b3Hue\b|3-HUE|3 HUE/.test(s) && !/3hue\.net/.test(s)) err(`brand must be written 3HUE in ${p}: ${s}`);
    if (/\bAIVRIC\b|\bAivric\b|\baivric\b/.test(s) && !/aivric\.com/.test(s)) err(`brand must be written AiVRIC in ${p}: ${s}`);
  }
  // Customer names: anything that looks like a proper-noun customer must be on the allowlist.
  const allowed = (v.allowedCustomers || []).map((x) => x.toLowerCase());
  for (const d of m.doors || []) for (const pr of d.proof || []) {
    const basis = (pr.basis || '').toLowerCase();
    if (!allowed.some((a) => basis.includes(a)) && !/boilerplate/.test(basis)) err(`proof basis not on allowedCustomers: ${d.id}: ${pr.basis}`);
  }
  // Sourced fields.
  const needSource = (obj, p) => { if (!obj) return; if (!obj.source || !obj.status) err(`${p} needs source and status`); };
  for (const d of m.doors || []) {
    needSource(d.opening, `${d.id}.opening`); needSource(d.stat, `${d.id}.stat`); needSource(d.statSecondary, `${d.id}.statSecondary`); needSource(d.program, `${d.id}.program`);
    for (const [i, pr] of (d.proof || []).entries()) if (!pr.basis || !pr.status) err(`${d.id}.proof[${i}] needs basis and status`);
    if ((d.serviceFamilies || []).length !== 4) err(`${d.id} must list exactly four service families`);
    if (!['left', 'right'].includes(d.dock)) err(`${d.id}.dock must be left or right`);
    for (const s of d.maturityEmphasis || []) if (!m.stages.find((x) => x.id === s)) err(`${d.id} emphasises unknown stage ${s}`);
    if (!g.doorways?.[d.id]) err(`geometry has no doorway for ${d.id}`);
  }
  needSource(m.path?.whereToStart, 'path.whereToStart');
  if (m.lobby && !m.lobby.heading[1].includes(m.lobby.headingAccent.text)) err('headingAccent.text must be a substring of heading[1]');
  if (m.stages?.[0]?.id !== 'assess') err('stages must be Assess-first (lowest ring)');
  if ((m.doors || []).length !== 3) err('exactly three doors');
  const icps = (m.doors || []).map((d) => d.icp);
  const O1 = ['SaaS & AI vendors', 'Portfolio owners', 'Regulated operators'];
  if (JSON.stringify(icps) !== JSON.stringify(O1)) err(`O1 buyer labels must be ${O1.join(' / ')}, got ${icps.join(' / ')}`);
  if (m.site?.bookingUrl !== 'https://3hue.net/contact.html') err('O2 booking URL must be https://3hue.net/contact.html');
  // Kiosk double measurement.
  const km = g.kiosk?.measurements;
  if (km?.a && km?.b) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if (Math.abs(km.a[i][j] - km.b[i][j]) > 2) err(`kiosk corner ${i} axis ${j} disagrees by ${Math.abs(km.a[i][j] - km.b[i][j])} px between passes`);
    if (!g.kiosk.quad) err('kiosk quad missing although both measurements exist');
  }
  // Rooms that are wired must have geometry.
  for (const d of m.doors || []) if (d.room?.render && !g.rooms?.[d.id]) err(`${d.id}.room.render set but geometry.rooms.${d.id} missing`);
  // The rooms' own surfaces (O14), as tools/import-surfaces.mjs writes them.
  for (const d of m.doors || []) if (g.rooms?.[d.id]?.surfaces !== undefined) lintSurfaces(d, g.rooms[d.id], err, root);

  // The tour flag (O11) and the guide (O10). The tour stays off until the gate is "approved".
  if (m.tour !== undefined) {
    const t = m.tour;
    if (!isObj(t)) err('tour must be an object');
    else {
      if (!['pending', 'approved'].includes(t.gate)) err(`tour.gate must be "pending" or "approved", got ${JSON.stringify(t.gate)}`);
      if (!safeRelative(t.manifest) || !t.manifest.endsWith('.json')) err('tour.manifest must be a repo-relative .json path');
      if (!safeRelative(t.voiceBase) || !t.voiceBase.endsWith('/')) err('tour.voiceBase must be a repo-relative directory ending in /');
      if (!isObj(m.guide)) err('tour needs a guide block');
    }
  }
  // Two guides (O12): guide.guides maps an id to {name, voice}; guide.lead names who leads until the
  // visitor picks; guide.voice holds what both voices share. A manifest without guides keeps the
  // single-guide shape (guide.name, guide.voice.provider and .name).
  if (m.guide !== undefined) {
    const gd = m.guide;
    if (!isObj(gd)) err('guide must be an object');
    else {
      const gs = gd.guides;
      for (const k of gs === undefined ? ['name', 'title', 'disclosure'] : ['title', 'disclosure']) if (!isStr(gd[k])) err(`guide.${k} must be a non-empty string`);
      if (gs !== undefined) {
        if (!isObj(gs) || !Object.keys(gs).length) err('guide.guides must map a guide id to {name, voice}');
        else {
          if (gd.name !== undefined) err('guide.name: with guide.guides each guide carries its own name');
          const shared = new Set(['title', 'disclosure', 'lead', 'guides', 'voice', 'name']);
          for (const [id, one] of Object.entries(gs)) {
            const p = `guide.guides.${id}`;
            if (!ID.test(id)) err(`${p}: a guide id must match ^[a-z0-9-]+$`);
            if (shared.has(id)) err(`${p}: "${id}" is a field of the guide block, so it cannot be a guide id`);
            if (!isObj(one)) { err(`${p} must be {name, voice}`); continue; }
            if (!isStr(one.name)) err(`${p}.name must be a non-empty string`);
            const vc = one.voice;
            if (!isObj(vc)) err(`${p}.voice must be an object`);
            else {
              for (const k of ['provider', 'name']) if (!isStr(vc[k])) err(`${p}.voice.${k} must be a non-empty string`);
              if (vc.settings !== undefined && !isObj(vc.settings)) err(`${p}.voice.settings must be an object`);
              if (vc.seed !== undefined && !Number.isInteger(vc.seed)) err(`${p}.voice.seed must be an integer`);
            }
          }
          const names = Object.values(gs).filter(isObj).map((x) => x.name);
          if (new Set(names).size !== names.length) err('guide.guides: two guides share a name');
          if (!own(gs, gd.lead)) err(`guide.lead must name a guide in guide.guides, got ${JSON.stringify(gd.lead)}`);
        }
      }
      const vc = gd.voice;
      if (!isObj(vc)) err('guide.voice must be an object');
      else {
        for (const k of gs === undefined ? ['provider', 'name', 'locale'] : ['locale']) if (!isStr(vc[k])) err(`guide.voice.${k} must be a non-empty string`);
        if (typeof vc.rate !== 'number' || !Number.isFinite(vc.rate)) err('guide.voice.rate must be a number');
        if (typeof vc.required !== 'boolean') err('guide.voice.required must be true or false');
      }
    }
  }
  return { errors, warnings, visible: visible.length };
}

// ---- content/tour.json: the guided-tour script, linted against the manifest it quotes ----
const TOP_KEYS = ['version', 'note', 'start', 'chapters', 'routes', 'nodes', 'ask', 'summary'];
const CHAPTER_KEYS = ['id', 'entry', 'title', 'eyebrow', 'landmark', 'optional'];
const NODE_KEYS = ['chapter', 'scene', 'lines', 'choice', 'next', 'quiet', 'end', 'ask', 'write'];
const LINE_KEYS = ['id', 'text', 'ref', 'say', 'source', 'status', 'when', 'cue', 'callout', 'who', 'write'];
const ENTRY_KEYS = ['kind', 'lines', 'at'];
const CHOICE_KEYS = ['id', 'prompt', 'remember', 'options'];
const OPTION_KEYS = ['id', 'label', 'sub', 'value', 'next', 'action', 'suggest', 'hideWhen'];
const QUESTION_KEYS = ['id', 'q', 'keys', 'lines', 'goto', 'source', 'status', 'learnMore'];
const MAX_SUGGEST = 4;
const SCENE_KEYS = { rest: [], keep: [], door: ['door'], station: ['door', 'station'], path: ['stage'], kiosk: ['fallback'] };
const MAX_OPTIONS = 4, MAX_LABEL = 90, MAX_SUB = 60, MAX_WORDS = 35;
// A source that points into this repo rather than citing something a visitor could look up.
const INTERNAL_SOURCE = /DECISIONS|manifest/i;
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameRe = (s, flags) => new RegExp(`(?<![\\p{L}\\p{N}])${escRe(s)}(?![\\p{L}\\p{N}])`, `u${flags}`);

export function lintTour(t, m, { root = ROOT, file = 'content/tour.json', geometry = null } = {}) {
  const errors = [], warnings = [];
  const err = (p, s) => errors.push(`${file}: ${p ? `${p}: ` : ''}${s}`);
  const warn = (p, s) => warnings.push(`${file}: ${p ? `${p}: ` : ''}${s}`);
  const stats = { visible: 0, nodes: 0, lines: 0 };
  const done = () => ({ errors, warnings, ...stats });
  if (!isObj(t)) { err('', 'the tour file must be a JSON object'); return done(); }
  for (const k of Object.keys(t)) {
    if (k === 'strings' || k === 'guide') err(k, `lives in content/experience.json (${k}), never in the tour file`);
    else if (!TOP_KEYS.includes(k)) warn(k, 'unknown top-level key');
  }

  const doors = m.doors || [];
  const doorIds = doors.map((d) => d.id);
  const allStations = [...new Set(doors.flatMap((d) => d.stations || []))];
  // `@` (the door whose scene is up) must work for every door.
  const stationsOf = (id) => (id === '@' ? allStations.filter((s) => doors.every((d) => (d.stations || []).includes(s))) : doors.find((d) => d.id === id)?.stations || []);
  // The rooms' surfaces (O14) from the geometry: ids belong to one room, so `@` never carries one.
  const geo = geometry || (fs.existsSync(path.resolve(root, 'content/geometry.json')) ? readGeometry(root) : {});
  const surfacesOf = (id) => (id && id !== '@' && isObj(geo.rooms?.[id]?.surfaces) ? geo.rooms[id].surfaces : {});
  const stageIds = [...(m.stages || []).map((s) => s.id), 'where-to-start'];
  const nodes = isObj(t.nodes) ? t.nodes : {};
  const nodeIds = Object.keys(nodes);
  stats.nodes = nodeIds.length;
  const routes = isObj(t.routes) ? t.routes : {};
  const chapters = Array.isArray(t.chapters) ? t.chapters : [];
  const chapterIds = chapters.filter(isObj).map((c) => c.id);
  const doorCtxs = doorIds.map((door) => ({ door }));
  const ctxsFor = (s) => (/(^|[.:])@(\.|$)/.test(s || '') ? doorCtxs : [{}]);
  // Two guides (O12): a line's `who` pins it to one guide; an unpinned line is spoken by the lead,
  // so {guide} in it must work for every guide.
  const gIds = guideIds(m);
  const withGuides = (ctxs, who) => (gIds.length ? ctxs.flatMap((c) => (who ? [{ ...c, guide: who }] : gIds.map((guide) => ({ ...c, guide })))) : ctxs);
  const v = m.vocabulary || {};

  // What every choice with `remember` can store, so conditions naming an answer can be checked.
  // `door` is recorded by door scenes.
  const remember = new Map([['door', new Set(doorIds)]]);
  for (const n of Object.values(nodes)) {
    const c = isObj(n) ? n.choice : null;
    if (!isObj(c) || typeof c.remember !== 'string' || c.remember === 'door') continue;
    const set = remember.get(c.remember) || new Set();
    for (const o of Array.isArray(c.options) ? c.options : []) { const val = optionValue(o); if (val != null) set.add(String(val)); }
    remember.set(c.remember, set);
  }

  // Names live in the manifest only: door titles, stage names and guide names as written, buyer
  // labels in any case.
  const names = [
    ...doors.map((d) => [d.title, 'door title', '']),
    ...doors.map((d) => [d.icp, 'buyer label', 'i']),
    ...(m.stages || []).map((s) => [s.name, 'stage name', '']),
    ...gIds.map((id) => [m.guide.guides[id]?.name, 'guide name', '']),
  ].filter(([s]) => isStr(s)).map(([s, what, flags]) => [s, what, nameRe(s, flags)]);

  // A visitor-readable template: tokens resolve (for every door when `@` is used) and bring in no
  // figure; what the author typed passes the vocabulary, brand, figure and typed-name rules.
  function checkText(p, raw, { required = true, who = null } = {}) {
    if (raw === undefined && !required) return;
    if (typeof raw !== 'string' || !raw.trim()) { err(p, 'must be a non-empty string'); return; }
    stats.visible++;
    for (const tk of templateTokens(raw)) {
      if (!TOKEN_KINDS.includes(tk.kind)) { err(p, `unknown token ${tk.raw}`); continue; }
      if (tk.kind === 'answer') { if (!remember.has(tk.arg)) err(p, `${tk.raw}: no choice remembers ${tk.arg}`); continue; }
      if (tk.kind === 'chapters') { if (tk.arg !== 'visited') err(p, `${tk.raw}: the only chapters token is {chapters:visited}`); continue; }
      for (const ctx of tk.kind === 'guide' ? withGuides(ctxsFor(tk.arg), who) : ctxsFor(tk.arg)) {
        const val = resolveToken(tk.kind, tk.arg, m, ctx);
        if (val == null) { err(p, `${tk.raw} does not resolve${ctx.door ? ` for door ${ctx.door}` : ''}`); break; }
        const f = figures(val);
        if (f.length) { err(p, `figure "${f[0]}" enters through ${tk.raw}; use a ref line so its source prints`); break; }
      }
    }
    const typed = stripTokens(raw);
    for (const w of v.forbidden || []) if (typed.toLowerCase().includes(w.toLowerCase())) err(p, `forbidden "${w}": ${raw}`);
    for (const w of v.retired || []) if (typed.includes(w)) err(p, `retired name "${w}": ${raw}`);
    for (const w of v.avoid || []) if (typed.toLowerCase().includes(w.toLowerCase())) warn(p, `avoid "${w}"`);
    if (/\b3hue\b|\b3Hue\b|3-HUE|3 HUE/.test(typed) && !/3hue\.net/.test(typed)) err(p, `brand must be written 3HUE: ${raw}`);
    if (/\bAIVRIC\b|\bAivric\b|\baivric\b/.test(typed) && !/aivric\.com/.test(typed)) err(p, `brand must be written AiVRIC: ${raw}`);
    const f = figures(typed);
    if (f.length) err(p, `figure "${f[0]}" typed into the script; a figure enters only through a ref to a sourced manifest field: ${raw}`);
    for (const [name, what, re] of names) if (re.test(typed)) err(p, `typed ${what} "${name}"; use a token so the manifest stays the only place it is written: ${raw}`);
  }
  const maxLen = (p, tpl, n) => {
    const len = Math.max(0, ...ctxsFor(tpl.includes('@') ? '@' : '').map((ctx) => fillTemplate(tpl, m, ctx).length));
    if (len > n) err(p, `${len} characters once filled; at most ${n}`);
  };

  // A ref resolves (for every door when it uses `@`), points at a string a visitor reads, and brings
  // its figure only with the source and status the manifest prints beside it.
  function checkRef(p, ref) {
    if (!isStr(ref)) { err(p, 'a ref is a manifest path such as doors.win-trust.stat'); return null; }
    let first = null;
    for (const ctx of ctxsFor(ref)) {
      const r = resolveRef(m, ref, ctx);
      if (!r) { err(p, `ref ${ref} does not resolve${ctx.door ? ` for door ${ctx.door}` : ''}`); return null; }
      if (!isVisiblePath(r.path)) { err(p, `ref ${ref} points at ${r.path}, which no visitor reads`); return null; }
      const f = figures(r.text);
      if (f.length && !(r.source && r.status)) err(p, `ref ${ref} brings the figure "${f[0]}" with no source and status`);
      first = first || r;
    }
    return first;
  }

  function checkCond(p, c) {
    if (c === undefined) return;
    if (Array.isArray(c)) { if (!c.length) err(p, 'an empty list of conditions'); c.forEach((x, i) => checkCond(`${p}[${i}]`, x)); return; }
    if (!isObj(c)) { err(p, 'a condition is {answers?, visited?, notVisited?}'); return; }
    for (const k of Object.keys(c)) if (!['answers', 'visited', 'notVisited'].includes(k)) err(p, `unknown condition ${k}`);
    if (c.answers !== undefined) {
      if (!isObj(c.answers)) err(p, 'answers is {key: [values]}');
      else for (const [k, vals] of Object.entries(c.answers)) {
        if (!remember.has(k)) { err(p, `answers.${k}: no choice remembers ${k}`); continue; }
        for (const x of [].concat(vals)) if (!remember.get(k).has(String(x))) err(p, `answers.${k}: no option stores ${JSON.stringify(x)}`);
      }
    }
    for (const k of ['visited', 'notVisited']) if (c[k] !== undefined) for (const id of [].concat(c[k])) if (!chapterIds.includes(id)) err(p, `${k}: unknown chapter ${id}`);
  }

  // The node ids a Next can lead to (routes expanded); and the checks on its shape.
  function targets(n, seen = new Set()) {
    const out = new Set();
    if (typeof n === 'string') {
      if (!n.startsWith('=')) { if (own(nodes, n)) out.add(n); }
      else if (own(routes, n.slice(1)) && !seen.has(n)) { seen.add(n); for (const x of targets(routes[n.slice(1)], seen)) out.add(x); }
    } else if (Array.isArray(n)) for (const b of n) if (isObj(b)) for (const x of targets(b.go, seen)) out.add(x);
    return out;
  }
  function checkNext(p, n) {
    if (typeof n === 'string') {
      if (n.startsWith('=')) { if (!own(routes, n.slice(1))) err(p, `unknown route ${n}`); }
      else if (!own(nodes, n)) err(p, `unknown node ${n}`);
      return;
    }
    if (Array.isArray(n)) {
      if (!n.length) { err(p, 'an empty list of branches'); return; }
      n.forEach((b, i) => {
        const q = `${p}[${i}]`;
        if (!isObj(b)) { err(q, 'a branch is {when?, go}'); return; }
        for (const k of Object.keys(b)) if (!['when', 'go'].includes(k)) err(q, `unknown key ${k}`);
        if (typeof b.go !== 'string') err(q, 'go is a node id or "=route"'); else checkNext(`${q}.go`, b.go);
        checkCond(`${q}.when`, b.when);
      });
      if (isObj(n[n.length - 1]) && n[n.length - 1].when !== undefined) err(p, 'the last branch must have no when, so every visitor has somewhere to go');
      return;
    }
    err(p, 'next is a node id, "=route" or a list of {when?, go}');
  }

  function checkScene(p, s) {
    if (s === undefined) { err(p, 'every node names a scene'); return null; }
    if (typeof s !== 'string' && !isObj(s)) { err(p, 'a scene is a kind or {kind, ...}'); return null; }
    const sc = sceneOf({ scene: s });
    if (!SCENES.includes(sc.kind)) { err(p, `unknown scene ${sc.kind}; one of ${SCENES.join(', ')}`); return null; }
    for (const k of Object.keys(sc)) if (k !== 'kind' && !SCENE_KEYS[sc.kind].includes(k)) err(p, `a ${sc.kind} scene takes no ${k}`);
    if (['door', 'station'].includes(sc.kind) && !(doorIds.includes(sc.door) || sc.door === '@')) err(p, `unknown door ${sc.door}`);
    if (sc.kind === 'station' && !stationsOf(sc.door).includes(sc.station)) err(p, `station ${sc.station} is not in ${sc.door}`);
    if (sc.kind === 'path' && sc.stage !== undefined && !stageIds.includes(sc.stage)) err(p, `unknown stage ${sc.stage}`);
    if (sc.kind === 'kiosk' && sc.fallback !== undefined && sc.fallback !== 'rest') err(p, 'a kiosk scene falls back to rest only');
    return sc;
  }

  // A cue points at something inside the node's scene (a keep scene can be anything, so only the
  // value is checked there).
  function checkCue(p, cue, sc) {
    if (!isObj(cue) || Object.keys(cue).length !== 1 || !['station', 'stage', 'door', 'surface'].includes(Object.keys(cue)[0])) { err(p, 'a cue is {station}, {stage}, {door} or {surface}'); return; }
    const [[k, val]] = Object.entries(cue);
    const kind = sc?.kind;
    if (k === 'surface') {
      // Frames that surface in the room and marks it (O14): a surface of the node's own room.
      if (!['door', 'station'].includes(kind)) err(p, `a surface cue needs a door or station scene, not ${kind ?? 'none'}`);
      else if (sc.door === '@') err(p, 'a surface cue needs a named door: surface ids belong to one room, so @ cannot carry one');
      else if (!own(surfacesOf(sc.door), val)) err(p, `surface ${JSON.stringify(val)} is not in ${sc.door}`);
    } else if (k === 'station') {
      if (kind === 'keep' || !sc) { if (!allStations.includes(val)) err(p, `unknown station ${val}`); }
      else if (!['door', 'station'].includes(kind)) err(p, `a station cue needs a door or station scene, not ${kind}`);
      else if (!stationsOf(sc.door).includes(val)) err(p, `station ${val} is not in ${sc.door}`);
    } else if (k === 'stage') {
      if (!stageIds.includes(val)) err(p, `unknown stage ${val}`);
      else if (kind && kind !== 'keep' && kind !== 'path') err(p, `a stage cue needs a path scene, not ${kind}`);
    } else {
      if (!doorIds.includes(val)) err(p, `unknown door ${val}`);
      else if (kind && !['rest', 'keep'].includes(kind)) err(p, `a door cue points from the lobby, so it needs a rest scene, not ${kind}`);
    }
  }

  // A write (O14): {<surface id>: entry | null} on a node (its base state) or a line, in a door or
  // station scene with a named door (surface ids belong to one room). An entry is {kind, lines, at?}:
  // glow has no lines; the others have one to four items (sign two at most, card at least one ref),
  // each a template checked as a caption or {ref} to a sourced field (a figure only enters that way).
  // A surface with no text box takes glow only. `at` (a line's writes only) must be a word of that
  // line's caption for every door and guide it can be said with.
  function checkWrite(p, w, sc, line = null, who = null) {
    if (!isObj(w) || !Object.keys(w).length) { err(p, 'a write maps a surface id to an entry or null'); return; }
    if (!['door', 'station'].includes(sc?.kind)) { err(p, `a write needs a door or station scene, not ${sc?.kind ?? 'none'}`); return; }
    if (sc.door === '@') { err(p, 'a write needs a named door: surface ids belong to one room, so @ cannot carry them'); return; }
    const S = surfacesOf(sc.door);
    const captions = line ? (() => {
      const src = typeof line.ref === 'string' ? line.ref : typeof line.text === 'string' ? line.text : '';
      return withGuides(ctxsFor(src), who).map((ctx) => resolveLine(line, m, ctx)?.text).filter((x) => typeof x === 'string');
    })() : [];
    for (const [id, e] of Object.entries(w)) {
      const q = `${p}.${id}`;
      if (!own(S, id)) { err(q, `${id} is not a surface of ${sc.door}`); continue; }
      if (e === null) continue;
      if (!isObj(e)) { err(q, 'an entry is {kind, lines, at?} or null'); continue; }
      for (const k of Object.keys(e)) if (!ENTRY_KEYS.includes(k)) err(q, `unknown key ${k}`);
      if (!WRITE_KINDS.includes(e.kind)) { err(q, `kind must be one of ${WRITE_KINDS.join(', ')}`); continue; }
      const items = e.lines;
      if (e.kind === 'glow') { if (items !== undefined && !(Array.isArray(items) && !items.length)) err(q, 'a glow has no lines'); }
      else {
        if (S[id].text === null) err(q, `${id} carries no text (nothing may be written on it); give it a glow`);
        if (!Array.isArray(items) || !items.length) err(q, `a ${e.kind} needs lines`);
        else {
          const max = e.kind === 'sign' ? 2 : MAX_WRITE_ITEMS;
          if (items.length > max) err(q, `${items.length} lines; a ${e.kind} carries at most ${max}`);
          items.forEach((it, i) => {
            if (typeof it === 'string') checkText(`${q}.lines[${i}]`, it, { who });
            else if (isObj(it) && Object.keys(it).length === 1 && typeof it.ref === 'string') checkRef(`${q}.lines[${i}].ref`, it.ref);
            else err(`${q}.lines[${i}]`, 'an item is a template or {ref}');
          });
          if (e.kind === 'card' && !items.some((it) => isObj(it) && typeof it.ref === 'string')) err(q, 'a card carries a ref, so its figure keeps its source');
        }
      }
      if (e.at !== undefined) {
        if (!line) err(`${q}.at`, 'at waits for a word of a line, so it belongs on a line\'s write, not the node\'s');
        else if (typeof e.at !== 'string' || !/^\S+$/.test(e.at)) err(`${q}.at`, 'at is one word of the line');
        else for (const text of captions) if (!tokens(text).some((t) => t.word.toLowerCase() === e.at.toLowerCase())) { err(`${q}.at`, `"${e.at}" is not a word of the line's caption: ${text}`); break; }
      }
    }
  }

  // Every line: a ref to the manifest, or text carrying a source and a status. Line ids are unique
  // across the whole file because voice files are named by them (media/voice/<id>.mp3).
  const lineIds = new Map();
  function lintLine(p, line, { scene = null, faq = false, inherit = null } = {}) {
    if (!isObj(line)) { err(p, 'a line is an object'); return; }
    stats.lines++;
    for (const k of Object.keys(line)) if (!LINE_KEYS.includes(k)) warn(p, `unknown key ${k}`);
    if (!ID.test(line.id || '')) err(p, `line id ${JSON.stringify(line.id)} must match ^[a-z0-9-]+$`);
    else if (lineIds.has(line.id)) err(p, `line id ${line.id} is also used at ${lineIds.get(line.id)}; voice files are named by line id`);
    else lineIds.set(line.id, p);
    if (line.who !== undefined && !(gIds.includes(line.who))) err(`${p}.who`, gIds.length ? `who must name a guide: ${gIds.join(', ')}` : 'who pins a line to a guide, but guide.guides is not set');
    const who = gIds.includes(line.who) ? line.who : null;
    const hasRef = line.ref !== undefined, hasText = line.text !== undefined;
    if (hasRef === hasText) err(p, 'a line has exactly one of text or ref');
    let source = line.source ?? inherit?.source ?? null, status = line.status ?? inherit?.status ?? null;
    if (hasRef && !hasText) {
      const r = checkRef(`${p}.ref`, line.ref);
      if (r && r.status) { source = r.source; status = r.status; }
    } else if (hasText && !hasRef) {
      checkText(`${p}.text`, line.text, { who });
      if (!isStr(source) || !isStr(status)) err(p, 'a text line needs a source and a status');
      if (typeof line.text === 'string') {
        const words = Math.max(0, ...ctxsFor(line.text.includes('@') ? '@' : '').map((ctx) => fillTemplate(line.text, m, ctx).split(/\s+/).filter(Boolean).length));
        if (words > MAX_WORDS) warn(p, `${words} words; a caption over ${MAX_WORDS} words is hard to follow`);
      }
    }
    if (faq && !(isStr(source) && isStr(status))) err(p, 'an Ask answer needs a source and a status (from its ref, the line or the question)');
    if (status != null && !STATUSES.includes(status)) err(p, `status "${status}" is not one of ${STATUSES.join(', ')}`);
    checkText(`${p}.say`, line.say, { required: false, who });
    checkCond(`${p}.when`, line.when);
    if (line.cue !== undefined) checkCue(`${p}.cue`, line.cue, scene);
    if (line.write !== undefined) { if (faq || !scene) err(`${p}.write`, 'only a node\'s lines write on the room'); else checkWrite(`${p}.write`, line.write, scene, line, who); }
    if (line.callout !== undefined) {
      if (!Array.isArray(line.callout) || !line.callout.length) err(`${p}.callout`, 'a callout is a list of refs');
      else line.callout.forEach((r, i) => checkRef(`${p}.callout[${i}]`, r));
    }
  }

  function lintChoice(p, c) {
    if (!isObj(c)) { err(p, 'a choice is {id?, prompt, remember?, options}'); return; }
    for (const k of Object.keys(c)) if (!CHOICE_KEYS.includes(k)) warn(p, `unknown key ${k}`);
    if (c.id !== undefined && !ID.test(c.id)) err(p, 'id must match ^[a-z0-9-]+$');
    checkText(`${p}.prompt`, c.prompt);
    if (c.remember !== undefined && (typeof c.remember !== 'string' || !/^[a-z][a-zA-Z0-9-]*$/.test(c.remember))) err(p, 'remember is a plain key');
    if (c.remember === 'door') err(p, 'remember "door" is reserved: door scenes record it');
    if (c.remember === 'lead') {
      // The visitor's pick of who leads (O12): every option stores a guide id.
      if (!gIds.length) err(p, 'remember "lead" picks a guide, but guide.guides is not set');
      else for (const [i, o] of (Array.isArray(c.options) ? c.options : []).entries()) if (!gIds.includes(String(optionValue(o)))) err(`${p}.options[${i}]`, `a lead option stores a guide id (${gIds.join(', ')}), not ${JSON.stringify(optionValue(o))}`);
    }
    const opts = Array.isArray(c.options) ? c.options : [];
    if (!opts.length) err(p, 'a choice needs options');
    if (opts.length > MAX_OPTIONS) err(p, `${opts.length} options; at most ${MAX_OPTIONS} per choice`);
    const seen = new Set();
    opts.forEach((o, i) => {
      const q = `${p}.options[${i}]`;
      if (!isObj(o)) { err(q, 'an option is an object'); return; }
      for (const k of Object.keys(o)) if (!OPTION_KEYS.includes(k)) warn(q, `unknown key ${k}`);
      if (!ID.test(o.id || '')) err(q, 'option id must match ^[a-z0-9-]+$');
      else if (seen.has(o.id)) err(q, `duplicate option ${o.id}`);
      else seen.add(o.id);
      if (o.value !== undefined && !isStr(o.value)) err(q, 'value is a string');
      const hasNext = o.next !== undefined, hasAction = o.action !== undefined;
      if (hasNext === hasAction) err(q, 'an option has exactly one of next or action');
      if (hasNext) checkNext(`${q}.next`, o.next);
      if (hasAction && !ACTIONS.includes(o.action)) err(q, `unknown action ${o.action}; one of ${ACTIONS.join(', ')}`);
      const label = o.label ?? (o.action === 'talk' ? '{str:talk}' : undefined);
      if (label === undefined) err(q, 'an option needs a label (only talk has a default, {str:talk})');
      else { checkText(`${q}.label`, label); if (typeof label === 'string') maxLen(`${q}.label`, label, MAX_LABEL); }
      if (o.sub !== undefined) { checkText(`${q}.sub`, o.sub); if (typeof o.sub === 'string') maxLen(`${q}.sub`, o.sub, MAX_SUB); }
      checkCond(`${q}.suggest`, o.suggest);
      checkCond(`${q}.hideWhen`, o.hideWhen);
    });
  }

  // Chapters: the progress bar, the map and the title cards.
  if (!Array.isArray(t.chapters) || !t.chapters.length) err('chapters', 'needs at least one chapter');
  const seenChapters = new Set();
  chapters.forEach((c, i) => {
    const p = `chapters[${i}]`;
    if (!isObj(c)) { err(p, 'a chapter is an object'); return; }
    for (const k of Object.keys(c)) if (!CHAPTER_KEYS.includes(k)) warn(p, `unknown key ${k}`);
    if (!ID.test(c.id || '')) err(p, 'id must match ^[a-z0-9-]+$');
    else if (seenChapters.has(c.id)) err(p, `duplicate chapter ${c.id}`);
    else seenChapters.add(c.id);
    if (!own(nodes, c.entry)) err(p, `entry ${c.entry} is not a node`);
    else if (nodes[c.entry]?.chapter !== c.id) warn(p, `entry ${c.entry} belongs to chapter ${nodes[c.entry]?.chapter}`);
    checkText(`${p}.title`, c.title);
    checkText(`${p}.eyebrow`, c.eyebrow, { required: false });
    if (c.landmark !== undefined && !['lobby', 'tower', 'kiosk', ...doorIds.map((d) => `door:${d}`)].includes(c.landmark)) err(p, `landmark ${c.landmark} is not lobby, tower, kiosk or door:<id>`);
    if (c.optional !== undefined && typeof c.optional !== 'boolean') err(p, 'optional is true or false');
  });

  // Routes: named conditional targets. A route that leads back to itself without a node between
  // would never settle.
  if (t.routes !== undefined && !isObj(t.routes)) err('routes', 'routes is {name: next}');
  for (const [name, n] of Object.entries(routes)) {
    if (!ID.test(name)) err(`routes.${name}`, 'route name must match ^[a-z0-9-]+$');
    checkNext(`routes.${name}`, n);
  }
  const routeDeps = (n) => (typeof n === 'string' ? (n.startsWith('=') ? [n.slice(1)] : []) : Array.isArray(n) ? n.flatMap((b) => (isObj(b) ? routeDeps(b.go) : [])) : []);
  const routeState = {};
  const visitRoute = (r, trail) => {
    if (routeState[r] === 2) return;
    if (routeState[r] === 1) { err(`routes.${r}`, `routes lead back to themselves: ${[...trail, r].map((x) => `=${x}`).join(' → ')}`); return; }
    routeState[r] = 1;
    for (const d of routeDeps(routes[r])) if (own(routes, d)) visitRoute(d, [...trail, r]);
    routeState[r] = 2;
  };
  for (const r of Object.keys(routes)) visitRoute(r, []);

  // Nodes.
  if (!nodeIds.length) err('nodes', 'needs at least one node');
  if (!own(nodes, t.start)) err('start', `${JSON.stringify(t.start)} is not a node`);
  for (const [id, n] of Object.entries(nodes)) {
    const p = `nodes.${id}`;
    if (!ID.test(id)) err(p, 'node id must match ^[a-z0-9-]+$');
    if (!isObj(n)) { err(p, 'a node is an object'); continue; }
    for (const k of Object.keys(n)) if (!NODE_KEYS.includes(k)) warn(p, `unknown key ${k}`);
    if (!chapterIds.includes(n.chapter)) err(p, `chapter ${n.chapter} is not in chapters`);
    const sc = checkScene(`${p}.scene`, n.scene);
    if (n.write !== undefined) checkWrite(`${p}.write`, n.write, sc);
    if (!Array.isArray(n.lines)) err(p, 'lines is a list');
    else {
      if (!n.lines.length && !n.choice) err(p, 'a node with no lines needs a choice');
      n.lines.forEach((l, i) => lintLine(`${p}.lines[${i}]`, l, { scene: sc }));
    }
    if (n.choice !== undefined) lintChoice(`${p}.choice`, n.choice);
    const hasNext = n.next !== undefined && n.next !== null;
    if (hasNext) checkNext(`${p}.next`, n.next);
    if (!n.choice && !hasNext && n.end !== true) err(p, 'a dead end: no choice, no next, and not marked end: true');
    for (const k of ['quiet', 'end']) if (n[k] !== undefined && typeof n[k] !== 'boolean') err(p, `${k} is true or false`);
    // Ask's suggested questions while this node is on screen (O12): approved question ids, at most four.
    if (n.ask !== undefined) {
      const qids = new Set((Array.isArray(t.ask?.questions) ? t.ask.questions : []).filter(isObj).map((q) => q.id));
      if (!Array.isArray(n.ask) || !n.ask.length) err(`${p}.ask`, 'ask is a list of question ids');
      else {
        if (n.ask.length > MAX_SUGGEST) err(`${p}.ask`, `${n.ask.length} suggestions; at most ${MAX_SUGGEST}`);
        if (new Set(n.ask).size !== n.ask.length) err(`${p}.ask`, 'a question is suggested twice');
        for (const id of n.ask) if (!qids.has(id)) err(`${p}.ask`, `no approved question ${JSON.stringify(id)}`);
      }
    }
  }
  for (const c of chapters) if (isObj(c) && !Object.values(nodes).some((n) => isObj(n) && n.chapter === c.id)) warn(`chapters.${c.id}`, 'no node belongs to this chapter');

  // Ask: approved answers only, each with a source and a status.
  if (t.ask !== undefined) {
    const a = t.ask;
    if (!isObj(a)) err('ask', 'ask is {intro?, questions}');
    else {
      for (const k of Object.keys(a)) if (!['intro', 'questions'].includes(k)) warn('ask', `unknown key ${k}`);
      if (a.intro !== undefined) lintLine('ask.intro', a.intro);
      const qs = Array.isArray(a.questions) ? a.questions : [];
      if (!qs.length) err('ask.questions', 'needs at least one question');
      const seenQ = new Set();
      qs.forEach((q, i) => {
        const p = `ask.questions[${i}]`;
        if (!isObj(q)) { err(p, 'a question is an object'); return; }
        for (const k of Object.keys(q)) if (!QUESTION_KEYS.includes(k)) warn(p, `unknown key ${k}`);
        if (!ID.test(q.id || '')) err(p, 'id must match ^[a-z0-9-]+$');
        else if (seenQ.has(q.id)) err(p, `duplicate question ${q.id}`);
        else seenQ.add(q.id);
        checkText(`${p}.q`, q.q);
        if (q.keys !== undefined && !(Array.isArray(q.keys) && q.keys.every(isStr))) err(`${p}.keys`, 'keys is a list of words');
        if (!Array.isArray(q.lines) || !q.lines.length) err(p, 'an answer needs at least one line');
        else q.lines.forEach((l, j) => lintLine(`${p}.lines[${j}]`, l, { faq: true, inherit: q }));
        // Ask prints each answer's source to the visitor (and copies it into the mail draft): a plain
        // citation, never a pointer into this repo (a decision record, "the manifest").
        const printed = [['source', q.source], ...(Array.isArray(q.lines) ? q.lines : []).map((l, j) => {
          const r = isObj(l) ? resolveLine(l, m, {}) : null;
          return [`lines[${j}].source`, (r?.status ? r.source : null) ?? l?.source ?? q.source];
        })];
        for (const [k, s] of printed) if (typeof s === 'string' && INTERNAL_SOURCE.test(s)) err(`${p}.${k}`, `Ask prints this source to visitors, so it must be a plain citation, not an internal reference: ${s}`);
        if (q.goto !== undefined) { if (typeof q.goto !== 'string' || q.goto.startsWith('=')) err(`${p}.goto`, 'goto is a node id'); else checkNext(`${p}.goto`, q.goto); }
        // Learn more (O12): a key of site.learnMore.pages, a page on the manifest's allowlist.
        if (q.learnMore !== undefined) {
          const pages = m.site?.learnMore?.pages;
          if (typeof q.learnMore !== 'string' || !isObj(pages) || !own(pages, q.learnMore)) err(`${p}.learnMore`, `${JSON.stringify(q.learnMore)} is not a page in site.learnMore.pages`);
        }
      });
    }
  }

  // Summary: what "Send me a summary" puts in the mailto body and the Copy text.
  if (t.summary !== undefined) {
    const s = t.summary;
    if (!isObj(s)) err('summary', 'summary is {subject?, lines?}');
    else {
      for (const k of Object.keys(s)) if (!['subject', 'lines'].includes(k)) warn('summary', `unknown key ${k}`);
      checkText('summary.subject', s.subject, { required: false });
      if (s.lines !== undefined) { if (!Array.isArray(s.lines)) err('summary.lines', 'lines is a list'); else s.lines.forEach((l, i) => lintLine(`summary.lines[${i}]`, l)); }
    }
  }

  // The graph: every node reachable from the start, a chapter entry (the map) or an Ask goto; and no
  // loop made only of nodes that never stop for a choice.
  const edges = (n) => {
    const out = new Set();
    if (!isObj(n)) return out;
    if (n.next != null) for (const x of targets(n.next)) out.add(x);
    for (const o of Array.isArray(n.choice?.options) ? n.choice.options : []) if (isObj(o) && o.next !== undefined) for (const x of targets(o.next)) out.add(x);
    return out;
  };
  const roots = [t.start, ...chapters.filter(isObj).map((c) => c.entry), ...(Array.isArray(t.ask?.questions) ? t.ask.questions : []).filter(isObj).map((q) => q.goto)].filter((x) => own(nodes, x));
  const reached = new Set();
  for (const queue = [...roots]; queue.length;) { const id = queue.shift(); if (reached.has(id)) continue; reached.add(id); for (const x of edges(nodes[id])) queue.push(x); }
  for (const id of nodeIds) if (!reached.has(id)) err(`nodes.${id}`, 'unreachable from the start, the map or Ask');
  const stops = (id) => isObj(nodes[id]) && nodes[id].choice !== undefined;
  const color = {}, loops = new Set();
  const dfs = (id, stack) => {
    color[id] = 1; stack.push(id);
    for (const x of targets(nodes[id]?.next)) {
      if (stops(x)) continue;
      if (color[x] === 1) {
        const cyc = stack.slice(stack.indexOf(x)), key = [...cyc].sort().join(' ');
        if (!loops.has(key)) { loops.add(key); err(`nodes.${x}`, `a loop with no choice in it: ${[...cyc, x].join(' → ')}`); }
      } else if (!color[x]) dfs(x, stack);
    }
    stack.pop(); color[id] = 2;
  };
  for (const id of nodeIds) if (!color[id] && !stops(id)) dfs(id, []);

  // Voice: rendered at build time into media/voice/ (tools/voice). tools/voice/lint.mjs checks every
  // file against the script (missing, stale, broken) and is the gate for guide.voice.required; this
  // only says, once, that no render exists yet. Summary lines are never spoken, so they do not count.
  const base = m.tour?.voiceBase || 'media/voice/';
  if (!fs.existsSync(path.resolve(root, base, 'manifest.json'))) {
    const spoken = [...lineIds.values()].filter((p) => !String(p).startsWith('summary.')).length;
    const msg = `no ${base}manifest.json yet, so all ${spoken} spoken lines run captions-only (node tools/voice/lint.mjs has the per-file count)`;
    if (m.guide?.voice?.required) err('voice', `${msg}, but guide.voice.required is true`);
    else warn('voice', `${msg} (guide.voice.required is false)`);
  }
  return done();
}

function main(argv) {
  let file = 'content/experience.json', tourArg = null;
  for (let i = 0; i < argv.length; i++) { if (argv[i] === '--tour') tourArg = argv[++i]; else file = argv[i]; }
  const m = readJson(file);
  const g = readGeometry();
  const r = lintManifest(m, g);
  const errors = [...r.errors], warnings = [...r.warnings], summary = [`${file}: ${r.errors.length} errors, ${r.warnings.length} warnings, ${r.visible} visible strings checked`];
  const tourFile = tourArg || m.tour?.manifest || null;
  if (tourFile) {
    let t = null;
    if (!fs.existsSync(path.resolve(ROOT, tourFile))) {
      // Declared but absent is fine while the tour is gated off; the gate cannot open without it.
      if (tourArg || m.tour?.gate === 'approved') errors.push(`${tourFile} not found`); else warnings.push(`${tourFile} not found; the tour stays off`);
    } else {
      try { t = readJson(tourFile); } catch (e) { errors.push(`${tourFile}: not valid JSON: ${e.message}`); }
    }
    if (t) {
      const tr = lintTour(t, m, { file: tourFile });
      errors.push(...tr.errors); warnings.push(...tr.warnings);
      summary.push(`${tourFile}: ${tr.errors.length} errors, ${tr.warnings.length} warnings, ${tr.visible} visible strings checked, ${tr.nodes} nodes, ${tr.lines} lines`);
    }
  }
  // index.html decides before first paint whether the header shows Ask (O12); its tour-gate meta
  // must say what tour.gate says.
  const html = fs.existsSync(path.resolve(ROOT, 'index.html')) ? fs.readFileSync(path.resolve(ROOT, 'index.html'), 'utf8') : '';
  const meta = (html.match(/<meta name="tour-gate" content="([^"]*)">/) || [])[1];
  if (m.tour && meta !== m.tour.gate) errors.push(`index.html: <meta name="tour-gate"> says ${JSON.stringify(meta ?? null)}, but tour.gate is ${JSON.stringify(m.tour.gate)}`);
  for (const w of warnings) console.warn('warn:', w);
  for (const e of errors) console.error('error:', e);
  for (const s of summary) console.log(s);
  process.exit(errors.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
