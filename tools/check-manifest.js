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
import { fileURLToPath } from 'node:url';
import { resolveRef, resolveLine, resolveToken, fillTemplate, templateTokens, stripTokens, sceneOf, optionValue, SCENES, ACTIONS, STATUSES, TOKEN_KINDS } from '../js/tourtext.js';

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
const SETTINGS = /^(plate|tour|guide\.voice)(\.|\[|$)/;
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

// ---- content/experience.json ----
export function lintManifest(m, g) {
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
  if (m.guide !== undefined) {
    const gd = m.guide;
    if (!isObj(gd)) err('guide must be an object');
    else {
      for (const k of ['name', 'title', 'disclosure']) if (!isStr(gd[k])) err(`guide.${k} must be a non-empty string`);
      const vc = gd.voice;
      if (!isObj(vc)) err('guide.voice must be an object');
      else {
        for (const k of ['provider', 'name', 'locale']) if (!isStr(vc[k])) err(`guide.voice.${k} must be a non-empty string`);
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
const NODE_KEYS = ['chapter', 'scene', 'lines', 'choice', 'next', 'quiet', 'end'];
const LINE_KEYS = ['id', 'text', 'ref', 'say', 'source', 'status', 'when', 'cue', 'callout'];
const CHOICE_KEYS = ['id', 'prompt', 'remember', 'options'];
const OPTION_KEYS = ['id', 'label', 'sub', 'value', 'next', 'action', 'suggest', 'hideWhen'];
const QUESTION_KEYS = ['id', 'q', 'keys', 'lines', 'goto', 'source', 'status'];
const SCENE_KEYS = { rest: [], keep: [], door: ['door'], station: ['door', 'station'], path: ['stage'], kiosk: ['fallback'] };
const MAX_OPTIONS = 4, MAX_LABEL = 90, MAX_SUB = 60, MAX_WORDS = 35;
// A source that points into this repo rather than citing something a visitor could look up.
const INTERNAL_SOURCE = /DECISIONS|manifest/i;
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameRe = (s, flags) => new RegExp(`(?<![\\p{L}\\p{N}])${escRe(s)}(?![\\p{L}\\p{N}])`, `u${flags}`);

export function lintTour(t, m, { root = ROOT, file = 'content/tour.json' } = {}) {
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
  const stageIds = [...(m.stages || []).map((s) => s.id), 'where-to-start'];
  const nodes = isObj(t.nodes) ? t.nodes : {};
  const nodeIds = Object.keys(nodes);
  stats.nodes = nodeIds.length;
  const routes = isObj(t.routes) ? t.routes : {};
  const chapters = Array.isArray(t.chapters) ? t.chapters : [];
  const chapterIds = chapters.filter(isObj).map((c) => c.id);
  const doorCtxs = doorIds.map((door) => ({ door }));
  const ctxsFor = (s) => (/(^|[.:])@(\.|$)/.test(s || '') ? doorCtxs : [{}]);
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

  // Names live in the manifest only: door titles and stage names as written, buyer labels in any case.
  const names = [
    ...doors.map((d) => [d.title, 'door title', '']),
    ...doors.map((d) => [d.icp, 'buyer label', 'i']),
    ...(m.stages || []).map((s) => [s.name, 'stage name', '']),
  ].filter(([s]) => isStr(s)).map(([s, what, flags]) => [s, what, nameRe(s, flags)]);

  // A visitor-readable template: tokens resolve (for every door when `@` is used) and bring in no
  // figure; what the author typed passes the vocabulary, brand, figure and typed-name rules.
  function checkText(p, raw, { required = true } = {}) {
    if (raw === undefined && !required) return;
    if (typeof raw !== 'string' || !raw.trim()) { err(p, 'must be a non-empty string'); return; }
    stats.visible++;
    for (const tk of templateTokens(raw)) {
      if (!TOKEN_KINDS.includes(tk.kind)) { err(p, `unknown token ${tk.raw}`); continue; }
      if (tk.kind === 'answer') { if (!remember.has(tk.arg)) err(p, `${tk.raw}: no choice remembers ${tk.arg}`); continue; }
      if (tk.kind === 'chapters') { if (tk.arg !== 'visited') err(p, `${tk.raw}: the only chapters token is {chapters:visited}`); continue; }
      for (const ctx of ctxsFor(tk.arg)) {
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
    if (!isObj(cue) || Object.keys(cue).length !== 1 || !['station', 'stage', 'door'].includes(Object.keys(cue)[0])) { err(p, 'a cue is {station}, {stage} or {door}'); return; }
    const [[k, val]] = Object.entries(cue);
    const kind = sc?.kind;
    if (k === 'station') {
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
    const hasRef = line.ref !== undefined, hasText = line.text !== undefined;
    if (hasRef === hasText) err(p, 'a line has exactly one of text or ref');
    let source = line.source ?? inherit?.source ?? null, status = line.status ?? inherit?.status ?? null;
    if (hasRef && !hasText) {
      const r = checkRef(`${p}.ref`, line.ref);
      if (r && r.status) { source = r.source; status = r.status; }
    } else if (hasText && !hasRef) {
      checkText(`${p}.text`, line.text);
      if (!isStr(source) || !isStr(status)) err(p, 'a text line needs a source and a status');
      if (typeof line.text === 'string') {
        const words = Math.max(0, ...ctxsFor(line.text.includes('@') ? '@' : '').map((ctx) => fillTemplate(line.text, m, ctx).split(/\s+/).filter(Boolean).length));
        if (words > MAX_WORDS) warn(p, `${words} words; a caption over ${MAX_WORDS} words is hard to follow`);
      }
    }
    if (faq && !(isStr(source) && isStr(status))) err(p, 'an Ask answer needs a source and a status (from its ref, the line or the question)');
    if (status != null && !STATUSES.includes(status)) err(p, `status "${status}" is not one of ${STATUSES.join(', ')}`);
    checkText(`${p}.say`, line.say, { required: false });
    checkCond(`${p}.when`, line.when);
    if (line.cue !== undefined) checkCue(`${p}.cue`, line.cue, scene);
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
  const g = readJson('content/geometry.json');
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
  for (const w of warnings) console.warn('warn:', w);
  for (const e of errors) console.error('error:', e);
  for (const s of summary) console.log(s);
  process.exit(errors.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
