#!/usr/bin/env node
// The guided tour's words, resolved exactly as the browser resolves them (js/tourtext.js): what
// Avi and Huey say (O12), what the rooms' surfaces show, with the line hash the voice pipeline and
// the runtime compare, and the copy sheet the copy gate signs.
//
//   node tools/tour-text.mjs                  every spoken line: key, hash, characters, text; then totals
//   node tools/tour-text.mjs --json           the same as JSON (lines, totals, lint result)
//   node tools/tour-text.mjs --count          totals only
//   node tools/tour-text.mjs --sheet [file]   write the copy sheet (default docs/copy-sheets-tour.md)
//   --manifest <file>                         default content/experience.json
//   --tour <file>                             default: the manifest's tour.manifest
//
// Spoken lines are node lines, ask.intro and every Ask answer line; summary lines are not spoken.
// A line pinned with `who` is spoken by that guide only; every other spoken line by the lead, so it
// is rendered in both voices (keyed <guide>/<id>, as tools/voice keys it). A line that names the
// current door (`@`) resolves once per door and is keyed <id>--<door>. A line with a runtime token ({answer:…}, {chapters:visited}) cannot be
// rendered ahead of time: it is shown as written and never voiced. The sheet refuses to write while
// tools/check-manifest.js reports an error for the manifest or the script.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, lintManifest, lintTour } from './check-manifest.js';
import { resolveLine, resolveRef, fillTemplate, templateTokens, stripTokens, sceneOf, matches, resolveNext, optionValue, hashLine, guideIds, speakerOf } from '../js/tourtext.js';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const readJson = (p) => JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8'));
const AT = /(^|[.:])@(\.|$)/;
const NEEDS_OK = new Set(['adapted', 'proposed', 'derived']);
const WPM = 150;          // a steady read-aloud pace
const CPS = 15;           // characters per second measured on Avi's ElevenLabs test lines (multilingual v2: 15.2)
const SHEET = 'docs/copy-sheets-tour.md';

// ---- arguments ----
const argv = process.argv.slice(2);
const opt = { manifest: 'content/experience.json', tour: null, mode: 'print', sheet: SHEET };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--manifest') opt.manifest = argv[++i];
  else if (a === '--tour') opt.tour = argv[++i];
  else if (a === '--json') opt.mode = 'json';
  else if (a === '--count') opt.mode = 'count';
  else if (a === '--sheet') { opt.mode = 'sheet'; if (argv[i + 1] && !argv[i + 1].startsWith('--')) opt.sheet = argv[++i]; }
  else { console.error(`unknown argument ${a}`); process.exit(2); }
}

const m = readJson(opt.manifest);
const g = readJson('content/geometry.json');
const tourFile = opt.tour || m.tour?.manifest;
if (!tourFile) { console.error(`${opt.manifest} names no tour.manifest; pass --tour <file>`); process.exit(2); }
const t = readJson(tourFile);
const lm = lintManifest(m, g), lt = lintTour(t, m, { file: tourFile });
const lint = { errors: [...lm.errors, ...lt.errors], warnings: [...lm.warnings, ...lt.warnings] };

// ---- the words ----
const doors = (m.doors || []).map((d) => d.id);
const templatesOf = (line) => [line.text, line.say].filter((s) => typeof s === 'string');
const usesDoor = (line) => (typeof line.ref === 'string' && AT.test(line.ref)) || templatesOf(line).some((s) => templateTokens(s).some((k) => k.arg && AT.test(k.arg)));
const usesRuntime = (line) => templatesOf(line).some((s) => templateTokens(s).some((k) => k.runtime));
const wordsOf = (s) => String(s).split(/\s+/).filter(Boolean).length;

function spoken() {
  const out = [];
  for (const [id, n] of Object.entries(t.nodes || {})) (n.lines || []).forEach((line, i) => out.push({ kind: 'tour', where: `nodes.${id}.lines[${i}]`, node: id, line }));
  if (isObj(t.ask?.intro)) out.push({ kind: 'ask', where: 'ask.intro', line: t.ask.intro });
  (t.ask?.questions || []).forEach((q, i) => (q.lines || []).forEach((line, j) => out.push({ kind: 'faq', where: `ask.questions[${i}].lines[${j}]`, question: q, line })));
  return out;
}

// Every resolved variant of a line: [{key, door, guide, text, say, source, status, ref}]. The first
// variant is the one the sheet shows: the pinned guide's, else the default lead's.
const GUIDES = guideIds(m);
const guideName = (id) => m.guide?.guides?.[id]?.name ?? m.guide?.name ?? id;
const LEAD0 = speakerOf({}, m, null);
const voicesOf = (line, spokenLine = true) => (!GUIDES.length || !spokenLine ? [LEAD0] : isObj(line) && GUIDES.includes(line.who) ? [line.who] : [LEAD0, ...GUIDES.filter((x) => x !== LEAD0)]);
function variants(line, inherit = null, spokenLine = true) {
  const ctxs = usesDoor(line) ? doors.map((door) => ({ door })) : [{}];
  return voicesOf(line, spokenLine).flatMap((guide) => ctxs.map((c) => {
    const ctx = guide ? { ...c, guide } : c;
    const r = resolveLine(line, m, ctx) || {};
    const text = usesRuntime(line) ? line.text : r.text;
    const id = ctx.door ? `${line.id}--${ctx.door}` : line.id;
    return {
      key: guide && spokenLine && GUIDES.length > 1 ? `${guide}/${id}` : id, door: ctx.door ?? null, guide: spokenLine ? guide : null,
      text: text ?? '', say: typeof line.say === 'string' ? fillTemplate(line.say, m, ctx) : '',
      source: r.status ? r.source : (line.source ?? inherit?.source ?? r.source ?? null),
      status: r.status ?? line.status ?? inherit?.status ?? null, ref: r.ref ?? null,
    };
  }));
}

async function collect() {
  const lines = [];
  for (const s of spoken()) {
    for (const v of variants(s.line, s.question)) {
      const voiced = !usesRuntime(s.line);
      lines.push({ ...v, id: s.line.id, kind: s.kind, where: s.where, voiced, chars: v.text.length, words: wordsOf(v.text), hash: voiced ? await hashLine(v.text, v.say) : null });
    }
  }
  return lines;
}
// What a room's surfaces say for a write entry: [[surface, text (items joined) | lights up | cleared]].
function writeText(w, ctx = {}) {
  if (!isObj(w)) return [];
  return Object.entries(w).map(([id, e]) => {
    if (e === null) return [id, '(cleared)'];
    if (e?.kind === 'glow') return [id, '(lights up)'];
    const items = (e?.lines || []).map((x) => (isObj(x) ? `${resolveRef(m, x.ref, ctx)?.text ?? x.ref} (${resolveRef(m, x.ref, ctx)?.source ?? 'no source'})` : fillTemplate(x, m, ctx)));
    return [id, `${items.join(' / ')}${e?.at ? ` [on the word “${e.at}”]` : ''}`];
  });
}

// Every visible string that is not a spoken line: prompts, labels, subs, titles, Ask questions,
// the summary. Filled for every door where `@` appears; runtime tokens left as written.
function visibleOther() {
  const out = [];
  const add = (where, tpl) => { if (typeof tpl !== 'string') return; for (const ctx of AT.test(tpl) ? doors.map((door) => ({ door })) : [{}]) out.push({ where, text: fillTemplate(tpl, m, { ...ctx, tour: t }) }); };
  for (const c of t.chapters || []) { add(`chapters.${c.id}.title`, c.title); add(`chapters.${c.id}.eyebrow`, c.eyebrow); }
  for (const [id, n] of Object.entries(t.nodes || {})) {
    if (!n.choice) continue;
    add(`nodes.${id}.choice.prompt`, n.choice.prompt);
    for (const o of n.choice.options || []) { add(`nodes.${id}.${o.id}.label`, o.label ?? (o.action === 'talk' ? '{str:talk}' : undefined)); add(`nodes.${id}.${o.id}.sub`, o.sub); }
  }
  for (const q of t.ask?.questions || []) add(`ask.${q.id}.q`, q.q);
  for (const [id, n] of Object.entries(t.nodes || {})) {
    const ws = [n.write, ...(n.lines || []).map((l) => l.write)].filter(isObj);
    for (const w of ws) for (const [sid, e] of Object.entries(w)) for (const x of (isObj(e) ? e.lines || [] : [])) if (typeof x === 'string') add(`nodes.${id}.write.${sid}`, x);
  }
  add('summary.subject', t.summary?.subject);
  for (const l of t.summary?.lines || []) { if (l.text) add(`summary.${l.id}`, l.text); else if (l.ref) out.push({ where: `summary.${l.id}`, text: resolveRef(m, l.ref)?.text ?? '' }); }
  return out;
}

// ---- walking a path, to estimate how long a visit takes ----
// picks: option ids in the order the choices come up; the walk stops at an action or a dead end.
function walkPath(picks) {
  const ctx = { answers: {}, chosen: {}, visited: [], door: null, tour: t, guide: LEAD0 };
  const queue = [...picks];
  let id = t.start, chars = 0, words = 0, lines = 0;
  const seen = [];
  for (let guard = 0; id && guard < 80; guard++) {
    const n = t.nodes[id];
    if (!n) break;
    seen.push(id);
    if (!ctx.visited.includes(n.chapter)) ctx.visited.push(n.chapter);
    const sc = sceneOf(n);
    if (['door', 'station'].includes(sc.kind) && sc.door !== '@') { ctx.door = sc.door; ctx.answers.door = sc.door; }
    for (const l of n.lines || []) {
      if (!matches(l.when, ctx)) continue;
      const r = resolveLine(l, m, ctx);
      if (!r) continue;
      lines++; chars += r.text.length; words += wordsOf(r.text);
    }
    if (n.choice) {
      const want = queue.shift();
      const o = (n.choice.options || []).find((x) => x.id === want);
      if (!o) break;
      if (n.choice.remember) { ctx.answers[n.choice.remember] = optionValue(o); ctx.chosen[n.choice.remember] = fillTemplate(o.label ?? '', m, ctx); }
      if (n.choice.remember === 'lead') ctx.guide = String(optionValue(o));
      if (o.action) break;
      id = resolveNext(o.next, ctx, t);
    } else if (n.end) break;
    else id = resolveNext(n.next, ctx, t);
  }
  return { nodes: seen, lines, chars, words, minutes: words / WPM, voiceMinutes: chars / CPS / 60 };
}
const PATHS = [
  ['SaaS & AI vendor, a blocked deal, Huey leads', ['huey', 'win-trust', 'deal', 'start', 'none', 'talk']],
  ['Portfolio owner, a new acquisition, Avi leads', ['avi', 'gain-control', 'acquisition', 'start', 'review', 'talk']],
  ['Regulated operator, an open exam finding', ['avi', 'stay-ready', 'exam', 'start', 'running', 'talk']],
  ['Show me everything, nothing formal yet', ['avi', 'all', 'none', 'summary']],
];

// ---- totals ----
function totals(lines) {
  const sum = (xs, f) => xs.reduce((a, x) => a + f(x), 0);
  const tour = lines.filter((l) => l.kind === 'tour'), ask = lines.filter((l) => l.kind !== 'tour');
  const voiced = lines.filter((l) => l.voiced);
  const other = visibleOther();
  const statuses = {};
  for (const s of spoken()) { const st = variants(s.line, s.question)[0].status ?? 'none'; statuses[st] = (statuses[st] || 0) + 1; }
  for (const l of t.summary?.lines || []) { const st = l.status ?? resolveRef(m, l.ref || '')?.status ?? 'none'; statuses[st] = (statuses[st] || 0) + 1; }
  return {
    nodes: Object.keys(t.nodes || {}).length,
    tourLines: new Set(tour.map((l) => l.id)).size,
    askQuestions: (t.ask?.questions || []).length,
    askLines: new Set(ask.map((l) => l.id)).size,
    summaryLines: (t.summary?.lines || []).length,
    spokenTourChars: sum(tour, (l) => l.chars),
    spokenAskChars: sum(ask, (l) => l.chars),
    voicedChars: sum(voiced, (l) => (l.say || l.text).length),
    voiceFiles: voiced.length,
    otherVisibleChars: sum(other, (x) => x.text.length),
    totalChars: sum(lines, (l) => l.chars) + sum(other, (x) => x.text.length),
    longestLine: lines.reduce((a, l) => (l.words > a.words ? l : a), { words: 0 }),
    statuses,
    paths: PATHS.map(([name, picks]) => ({ name, ...walkPath(picks) })),
  };
}

// ---- the copy sheet ----
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const q = (s) => `“${s}”`;
const STATION = (s) => m.strings?.[s] || s;
const doorTitle = (id) => m.doors.find((d) => d.id === id)?.title || id;
const chapterTitle = (id) => { const c = (t.chapters || []).find((x) => x.id === id); return c ? fillTemplate(c.title, m, {}) : id; };
const nodeName = (id) => `\`${id}\``;

// What each remembered value means, in the words the visitor clicked.
const valueLabels = new Map([['door', new Map(doors.map((d) => [d, `the ${doorTitle(d)} room`]))]]);
for (const n of Object.values(t.nodes || {})) {
  const c = n.choice;
  if (!c || typeof c.remember !== 'string') continue;
  const map = valueLabels.get(c.remember) || new Map();
  for (const o of c.options || []) { const v = String(optionValue(o)); if (!map.has(v)) map.set(v, q(fillTemplate(o.label ?? '{str:talk}', m, {}))); }
  valueLabels.set(c.remember, map);
}
function condText(c) {
  if (c === undefined) return '';
  if (Array.isArray(c)) return c.map(condText).join('; or ');
  if (!isObj(c) || !Object.keys(c).length) return 'otherwise (the first matching option is the one marked Suggested)';
  const parts = [];
  const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
  for (const [k, vals] of Object.entries(c.answers || {})) {
    const names = [].concat(vals).map((v) => valueLabels.get(k)?.get(String(v)) || v);
    const every = valueLabels.get(k) && [...valueLabels.get(k).keys()].every((x) => [].concat(vals).map(String).includes(x));
    parts.push(every && k !== 'door' ? `${k} has been answered` : k === 'door' ? `the room is ${names.map((x) => x.replace(/^the | room$/g, '')).join(' or ')}` : `${k} is ${names.join(' or ')}`);
  }
  if (c.visited) { const v = [].concat(c.visited).map(chapterTitle); parts.push(`${list(v)} ${v.length > 1 ? 'all ' : ''}visited`); }
  if (c.notVisited) parts.push(`${list([].concat(c.notVisited).map(chapterTitle))} not yet visited`);
  return parts.join(', and ');
}
const branches = (r) => r.map((b) => (b.when ? `${routeText(b.go)} if ${condText(b.when)}` : `otherwise ${routeText(b.go)}`)).join('; ');
function routeText(n) {
  if (typeof n === 'string') {
    if (!n.startsWith('=')) return nodeName(n);
    const r = t.routes?.[n.slice(1)];
    return Array.isArray(r) ? `route \`${n.slice(1)}\`: ${branches(r)}` : routeText(r);
  }
  return Array.isArray(n) ? branches(n) : '';
}
const ACTION = {
  talk: `opens ${m.site?.bookingUrl} in a new tab`,
  ask: "opens Ask (the lead's console)",
  summary: 'opens the summary: an email draft to yourself (no recipient filled in) or Copy',
  replay: 'starts the tour again with a clean slate',
  end: 'ends the tour',
  explore: 'ends the tour and opens this room in the normal panel at the current station',
};
function sceneText(n) {
  const sc = sceneOf(n);
  switch (sc.kind) {
    case 'rest': return 'the lobby at rest';
    case 'door': return `dolly to the ${doorTitle(sc.door)} door; the room opens`;
    case 'station': return `the ${sc.door === '@' ? 'current' : doorTitle(sc.door)} room, at ${q(STATION(sc.station))}`;
    case 'path': return sc.stage ? `the tower, maturity path, with ${q(sc.stage === 'where-to-start' ? m.strings.whereToStart : m.stages.find((s) => s.id === sc.stage)?.name)} lit` : 'the tower, maturity path';
    case 'kiosk': return 'the kiosk (the lobby at rest where the kiosk is hidden, as on phones)';
    default: return 'scene unchanged';
  }
}
function cueText(cue) {
  if (!isObj(cue)) return '';
  if (cue.station) return `pans to ${q(STATION(cue.station))}`;
  if (cue.stage) return `lights ${q(cue.stage === 'where-to-start' ? m.strings.whereToStart : m.stages.find((s) => s.id === cue.stage)?.name)}`;
  if (cue.door) return `points at the ${doorTitle(cue.door)} door`;
  if (cue.surface) return `frames ${cue.surface}`;
  return '';
}
const typed = (tpl) => /[\p{L}]/u.test(stripTokens(tpl ?? ''));
// Review flags, worked out from the line itself so the source strings stay plain citations (Ask
// shows them to visitors).
const INTERNAL = /The Message Stack §02/;           // "Internal, not customer-facing copy"
const isPairing = (v) => v.status === 'proposed' && /service catalog/i.test(v.source || '');
function flagOf(v, line) {
  if (line.ref !== undefined) return /^guide\./.test(v.ref || '') ? 'manifest field, new with the tour: **needs sign-off**' : 'manifest field, on the site since 7fa92e4';
  const extra = [isPairing(v) ? 'service pairing: decision 1' : null, INTERNAL.test(v.source || '') ? 'from a section marked internal: decision 2' : null].filter(Boolean);
  if (NEEDS_OK.has(v.status)) return ['**needs sign-off**', ...extra].join(' · ');
  return ['verbatim approved boilerplate, new placement', ...extra].join(' · ');
}
function lineBlock(line, n, inherit = null, spokenLine = true) {
  const out = [];
  const all = variants(line, inherit, spokenLine);
  // One entry per distinct text: a line the lead speaks shows once unless the guides' texts differ.
  const shown = all.filter((v, i) => all.findIndex((x) => x.door === v.door && x.text === v.text) === i);
  for (const v of shown) {
    const differs = all.some((x) => x !== v && x.door === v.door && x.text !== v.text);
    const who = !v.guide ? null : isObj(line) && GUIDES.includes(line.who) ? guideName(line.who) : differs ? `${guideName(v.guide)}, when leading` : 'the lead';
    const bits = [`**${v.key.replace(/^[a-z]+\//, '')}**`, who ? `spoken by ${who}` : null, v.status ?? 'no status', flagOf(v, line)].filter(Boolean);
    out.push(`- ${bits.join(' · ')}  `);
    out.push(`  ${usesRuntime(line) ? `\`${line.text}\` (filled in the browser from the visitor's answers and the chapters visited)` : v.text}  `);
    const meta = [];
    if (v.source) meta.push(`Source: ${v.source}`);
    if (line.ref) meta.push(`ref \`${line.ref}\``);
    if (line.when) meta.push(`shown only when ${condText(line.when)}`);
    if (line.cue) meta.push(cueText(line.cue));
    for (const [sid, txt] of writeText(line.write, v.door ? { door: v.door } : {})) meta.push(`on ${sid}: ${txt}`);
    if (line.callout) meta.push(`callout tile: ${line.callout.map((r) => { const x = resolveRef(m, r); return x ? `${q(x.text)} (${x.source ?? 'no source'})` : r; }).join('; ')}`);
    if (!usesRuntime(line) && v.hash) meta.push(`hash \`${v.hash}\``);
    if (meta.length) out.push(`  <small>${meta.map(esc).join(' · ')}</small>`);
  }
  return out;
}
function choiceBlock(n) {
  const c = n.choice;
  const out = [];
  out.push('', `**Choice:** ${q(fillTemplate(c.prompt, m, {}))}${typed(c.prompt) ? ' (new copy)' : ''}${c.remember ? `, remembered as \`${c.remember}\`` : ''}`, '');
  out.push('| # | Option | Sub-label | Copy | Goes to | Suggested when | Hidden when |', '|---|---|---|---|---|---|---|');
  (c.options || []).forEach((o, i) => {
    const label = o.label ?? (o.action === 'talk' ? '{str:talk}' : '');
    const copy = typed(label) || typed(o.sub) ? 'new' : 'manifest';
    const to = o.action ? `action \`${o.action}\`: ${ACTION[o.action] || ''}` : routeText(o.next);
    out.push(`| ${i + 1} | ${esc(fillTemplate(label, m, {}))} | ${esc(o.sub ? fillTemplate(o.sub, m, {}) : '')} | ${copy} | ${esc(to)} | ${esc(o.suggest !== undefined ? condText(o.suggest) : '')} | ${esc(o.hideWhen ? condText(o.hideWhen) : '')} |`);
  });
  return out;
}

const pairingLines = () => spoken().filter((s) => s.line.ref === undefined && s.kind === 'tour').map((s) => variants(s.line, s.question)[0]).filter((v) => /service catalog/i.test(v.source || '')).map((v) => v.key);
const OWNER = /Inside 3HUE tour|3hue\.net, /;
const ownerLines = () => spoken().filter((s) => s.line.ref === undefined).map((s) => variants(s.line, s.question)[0]).filter((v) => OWNER.test(v.source || '')).map((v) => v.key);
// Every text line that draws on the source library, by document and section. A source names a
// document, then one or more sections ("The Message Stack §01, beat five; §09"); a section number
// belongs to the document named last before it.
const LIBRARY = /(The Forcing Function|The Message Stack|The Ship List|Brand Sheet)|§(\d\d)|\b(cover)\b|(catalog|Catalog|Manifest|DECISIONS)/g;
function sectionsTable() {
  const table = new Map();
  const add = (k, key) => { if (!table.has(k)) table.set(k, new Set()); table.get(k).add(key); };
  for (const s of spoken()) {
    const v = variants(s.line, s.question)[0];
    if (s.line.ref !== undefined || !v.source) continue;
    let doc = null;
    for (const x of v.source.matchAll(LIBRARY)) {
      if (x[1]) doc = x[1];
      else if (x[4]) doc = null;                  // a source outside the library: sections after it are not the library's
      else if (x[2] && doc) add(`${doc} §${x[2]}`, v.key);
      else if (x[3] && doc === 'The Forcing Function') add(`${doc} cover`, v.key);
    }
  }
  return [...table.entries()].sort(([a], [b]) => a.localeCompare(b));
}
const SECTION_NOTES = {
  'The Forcing Function cover': 'segment descriptions on the cover',
  'The Forcing Function §01': 'the fit model, written to score prospects',
  'The Forcing Function §02': 'the three segments: descriptions, triggers, who is in the room, what 3HUE sells them',
  'The Forcing Function §03': 'the buying committee: what each role says, fears and converts on',
  'The Forcing Function §04': 'trigger events and the opening move for each',
  'The Forcing Function §05': 'who to decline',
  'The Forcing Function §06': 'what to say to each (the approved opening lines already on the site come from here)',
  'The Message Stack §01': 'the core narrative',
  'The Message Stack §02': 'the positioning statement, marked internal, not customer-facing copy',
  'The Message Stack §03': 'the three pillars',
  'The Message Stack §04': 'the message by segment',
  'The Message Stack §05': 'the claims library',
  'The Message Stack §06': 'objection handling: the sales moves',
  'The Message Stack §07': 'battlecards',
  'The Message Stack §08': 'words we use, words we avoid',
  'The Message Stack §09': 'approved boilerplate',
  'The Ship List §03': 'landing page copy, written to publish',
  'The Ship List §04': 'the LinkedIn post series',
  'The Ship List §06': 'the discovery script',
  'The Ship List §07': 'the offer one-pagers',
  'Brand Sheet §06': 'verbal identity and naming conventions',
};

// Text lines marked approved-copy are boilerplate used word for word (a new placement, not new words).
function verbatimNote() {
  const n = spoken().filter((x) => x.line.ref === undefined && variants(x.line, x.question)[0].status === 'approved-copy').length;
  return n ? `; the ${n === 1 ? 'one approved-copy text line is' : `${n} approved-copy text lines are`} boilerplate used word for word` : '';
}

function sheet(lines, tot) {
  const L = [];
  const push = (...xs) => L.push(...xs);
  const byKey = new Map(lines.map((l) => [l.key, l]));
  const show = (key) => { const l = byKey.get(key); return l ? `- **${key.replace(/^[a-z]+\//, '')}**: ${l.text}` : `- **${key}**`; };
  push('# Tour copy sheet v2: Avi and Huey, three doors, the quote builder\'s names', '');
  push(`Every word the guided tour shows, speaks or writes on a room\'s surfaces, as a visitor meets it, with the source and status of each line. Generated by \`node tools/tour-text.mjs --sheet\` from \`${tourFile}\` against \`${opt.manifest}\`; regenerate after any change to either file and do not edit this file by hand. The lint (\`npm run lint\`) reports ${lint.errors.length} errors for both files.`, '');
  push(`The tour stays off (\`tour.gate\` is ${q(m.tour?.gate)}) until Nate and the owner sign this sheet and the Builder copy sheet (\`docs/copy-sheet-builder.md\`, the approved fields that change). Record the decision in \`docs/COPY-GATE.md\`, naming the line hashes below, which change whenever a word changes.`, '');

  push('## Decisions for Nate and the owner', '');
  push('### 1. A first step per door, named as the team quotes it', '');
  push('"Every path starts with a Snapshot" was approved copy, but the quote builder has no Snapshot item. Each door and trigger now names its own first step, the program that runs after it, and the tower ring it lights, all with the builder\'s exact names (O15). The approved fields that change are listed in `docs/copy-sheet-builder.md`. These tour lines carry the pairings:', '');
  for (const k of pairingLines()) push(show(k));
  push('', '**Decide:** publish these pairings as written, change them, or drop a name and end the line at the step.', '');

  push('### 2. The owner\'s program descriptions', '');
  push('Inside each room the guides describe the programs that fit (the Information Security, Risk Management, Cyber-Incident Response and Vendor Compliance programs, a virtual CISO, engineering fixes), adapted from 3HUE\'s public pages and the owner\'s own tour. Hours, the 15-minute notification figure, the named SOC partner, "up to 60% less audit prep", "under 6 months", "as low as 50%", the maturity scorecard and the threat statistics are left out: none has a source our claims rules accept.', '');
  for (const k of ownerLines()) push(show(k));
  push('', '**Decide:** approve these descriptions, or strike lines by id.', '');

  push('### 3. Two guides', '');
  push(`${guideName('avi')} opens and meets ${guideName('huey')}; the visitor picks who leads, as in the owner\'s tour (O12). ${guideName('avi')} is the owner\'s Ava, renamed at Nate\'s request: 3hue.net\'s own pages say "led by Ava", so the two tours will name her differently unless the owner renames his. The arrival and hand-off lines are new copy, and so is the disclosure (\`guide.disclosure\`).`, '');

  push('### 4. Forcing Function and Message Stack material in public lines', '');
  push('As in the first sheet: the new lines draw on sections written for 3HUE\'s sellers, and Ask shows each answer\'s source to the visitor, so these document names and section numbers appear on the public site.', '');
  push('| Section | What it is | Lines drawing on it |', '|---|---|---|');
  for (const [sec, keys] of sectionsTable()) push(`| ${sec} | ${SECTION_NOTES[sec] || ''} | ${[...keys].map((k) => `\`${k}\``).join(', ')} |`);
  push('', '**Decide:** approve all of it; approve it except the lines you strike by id; or have the tour rewritten from public material only.', '');

  push('### 5. The A-LIGN 80% statistic', '');
  push('Still left out: the claims library does not list it, so the AI trigger\'s lines carry no number. **Decide:** add it to the claims library as verified, with the source printed, or leave it out.', '');

  push('## At a glance', '');
  push(`- **Script:** ${tot.nodes} nodes and ${tot.tourLines} spoken lines. Ask has ${tot.askQuestions} questions, answered in ${tot.askLines} spoken lines. The summary has ${tot.summaryLines} lines, which are not spoken.`);
  push(`- **Characters:** ${tot.spokenTourChars.toLocaleString('en-US')} spoken in the tour, and ${tot.spokenAskChars.toLocaleString('en-US')} spoken in Ask. That makes ${tot.voicedChars.toLocaleString('en-US')} to render as voice, in ${tot.voiceFiles} files. Prompts, labels, titles, questions and the summary add ${tot.otherVisibleChars.toLocaleString('en-US')}, for **${tot.totalChars.toLocaleString('en-US')} characters in all**.`);
  push(`- **Line statuses:** ${Object.entries(tot.statuses).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k} ${v}`).join(', ')}. Every adapted, proposed or derived text line needs sign-off. Ref lines quote manifest fields already on the site${verbatimNote()}.`);
  push(`- **Longest line:** \`${tot.longestLine.key}\`, at ${tot.longestLine.words} words. The lint warns above 35.`);
  push(`- **Lint:** ${lint.errors.length} error${lint.errors.length === 1 ? '' : 's'} and ${lint.warnings.length} warning${lint.warnings.length === 1 ? '' : 's'}${lint.warnings.length ? ` (${lint.warnings.map((w) => w.replace(/^[^:]+: /, '')).join('; ')})` : ''}.`, '');
  push('**How long a visit takes** (spoken lines only; choices and pauses add time):', '');
  push('| Path | Lines | Words | At 150 words a minute | At the voice\'s pace |', '|---|---|---|---|---|');
  for (const p of tot.paths) push(`| ${p.name} | ${p.lines} | ${p.words} | ${p.minutes.toFixed(1)} min | ${p.voiceMinutes.toFixed(1)} min |`);
  push('');

  push('## How to read this sheet', '');
  push('- Text appears as the visitor sees it, with names filled in from the manifest. A line in `code` is filled in the browser from the visitor\'s own answers.');
  push('- **Status values:**');
  push('  - **approved-copy, verified, substantiated:** the manifest\'s existing statuses.');
  push('  - **adapted:** approved or published wording, shortened or re-voiced for the guides. Where the source had figures, vendor names or comparisons with other firms, they are taken out.');
  push('- **Spoken by:** a guide\'s name for a line pinned to that guide; "the lead" for a line whichever guide leads says (rendered in both voices).');
  push('- **On <surface>:** what the room\'s own display shows while the line is up (a surface keeps what it shows until a later line in the step changes it). "Room when this step opens" is the step\'s starting state.');
  push('  - **proposed:** new linking copy.');
  push('  - **derived:** assembled from manifest fields.');
  push('- A **ref** line quotes a manifest field word for word, with the source that field already prints.');
  push('- **Sources** are written as plain citations, because Ask shows each answer\'s source to the visitor. Review notes live in this sheet, not in the sources.');
  push('- The **hash** is the first 16 hex characters of SHA-256 over the text. Voice files are checked against it, so sign-off covers these exact words.');
  push('- **Callout tiles** carry each figure on screen with its printed source. No panel opens during the tour.', '');

  push('## The tour, node by node', '');
  const byChapter = new Map((t.chapters || []).map((c) => [c.id, []]));
  for (const [id, n] of Object.entries(t.nodes || {})) { if (!byChapter.has(n.chapter)) byChapter.set(n.chapter, []); byChapter.get(n.chapter).push([id, n]); }
  for (const c of t.chapters || []) {
    const title = fillTemplate(c.title, m, {});
    const bits = [c.landmark ? `landmark: ${c.landmark}` : 'no landmark', c.optional ? 'optional' : null, typed(c.title) ? 'title is new copy' : 'title from the manifest', c.eyebrow ? `eyebrow ${q(fillTemplate(c.eyebrow, m, {}))}` : null].filter(Boolean);
    push(`### Chapter: ${title}`, '', `<small>\`${c.id}\` · ${bits.join(' · ')} · entry ${nodeName(c.entry)}</small>`, '');
    for (const [id, n] of byChapter.get(c.id) || []) {
      push(`#### ${nodeName(id)}: ${sceneText(n)}`, '');
      if (isObj(n.write)) push(`<small>Room when this step opens: ${writeText(n.write).map(([sid, txt]) => `${sid}: ${txt}`).map(esc).join(' · ')}</small>`, '');
      if (Array.isArray(n.ask)) push(`<small>Ask suggests: ${n.ask.map((x) => `\`${x}\``).join(', ')}</small>`, '');
      for (const line of n.lines || []) push(...lineBlock(line, n));
      if (n.choice) push(...choiceBlock(n));
      if (n.next != null) push('', `Then: ${routeText(n.next)}.`);
      if (n.end) push('', 'The tour ends here.');
      push('');
    }
  }

  push(`## Ask (${[...new Set(GUIDES.map((g0) => fillTemplate(m.strings?.tourAsk ?? 'Ask {guide}', m, { guide: g0 })))].join(' / ')})`, '');
  push('Static answers only: nothing is generated in the browser. Each answer shows its source and is spoken by the lead. Matching uses the keywords listed; "Take me there" opens the node named; "Learn more" opens the 3hue.net page named, in a new tab.', '');
  if (t.ask?.intro) { push('**Intro**', ''); push(...lineBlock(t.ask.intro, null)); push(''); }
  for (const qq of t.ask?.questions || []) {
    const lmp = qq.learnMore ? m.site?.learnMore?.pages?.[qq.learnMore] : null;
    push(`### ${fillTemplate(qq.q, m, { guide: LEAD0 })}`, '', `<small>\`${qq.id}\`${qq.goto ? ` · Take me there: ${nodeName(qq.goto)}` : ''}${lmp ? ` · Learn more: ${lmp.url}` : ''} · keywords: ${(qq.keys || []).join(', ')}</small>`, '');
    for (const line of qq.lines || []) push(...lineBlock(line, null, qq));
    push('');
  }

  push('## The summary ("Send me a summary")', '');
  push(`Built in the browser. It opens as an email draft with no recipient filled in, or it can be copied. Subject: ${q(fillTemplate(t.summary?.subject ?? '', m, {}))}.`, '');
  for (const line of t.summary?.lines || []) push(...lineBlock(line, null, null, false));
  push('');

  // The words the engine and Ask show around the script live in the manifest (every accessible name
  // comes from there); they are visitor copy too, so the gate signs them with the script.
  push(`## Interface words (\`${opt.manifest}\`)`, '');
  push(`The tour's buttons, states, announcements and dialogs take their words from \`strings\` and \`guide\` in \`${opt.manifest}\`, never from the script or the code. The sentences among them (the disclosures and Ask's no-match line) need sign-off with this sheet; the rest are control labels. \`strings.walk\` is still the walk's label (${q(m.strings?.walk ?? '')}); it becomes the tour's label when the gate opens.`, '');
  push('| Key | Text | Kind |', '|---|---|---|');
  for (const k of ['name', 'title', 'disclosure']) if (typeof m.guide?.[k] === 'string') push(`| \`guide.${k}\` | ${esc(m.guide[k])} | ${k === 'disclosure' ? 'sentence: **needs sign-off**' : 'name'} |`);
  for (const g0 of GUIDES) push(`| \`guide.guides.${g0}.name\` | ${esc(guideName(g0))} | name |`);
  for (const [k, v] of Object.entries(m.strings || {})) {
    if (!/^tour/.test(k) || typeof v !== 'string') continue;
    const sentence = /[.!?]$/.test(v.trim()) && v.trim().split(/\s+/).length > 3;
    push(`| \`strings.${k}\` | ${esc(v)} | ${sentence ? 'sentence: **needs sign-off**' : 'label'} |`);
  }
  push('');

  push('## Left out on purpose, and open items', '');
  push('- **Held Ask answers.** "What is the difference between a virtual CIO and a virtual CISO?" (the virtual CIO is a draft in the quote builder), "What is the Get-Well methodology?" (not in the builder) and "What about the AI Snapshot?" (not in the builder) are left out until the owner decides.');
  push('- **Held facts.** Program hours, the 15-minute notification figure, the named SOC partner, "up to 60% less audit prep", "under 6 months", "as fast as 90 days", "as low as 50% of the standard rate", the maturity scorecard, "around the clock" and the threat statistics. Each needs a source our claims rules accept, or it stays out.');
  push('- **Names the builder holds.** The virtual CISO retainers and the fractional DPO are marked "[Confirm price]" in the builder, so the tour says "a virtual CISO" and names only CISO Support as an item.');
  push('- **No quotes on the site.** The tour names first steps; it never builds a quote or shows a price (O15). The summary names the first step so the conversation with the team starts there.');
  push('- **CMMC.** The Message Stack marks it TIME-SENSITIVE; no room leads with it and Ask has no CMMC answer.');
  push('- **Pronunciation.** Check 3HUE, AiVRIC ("av-RICK"), Avi, Huey, SOC 2, NIST CSF, 800-53/171, POA&M, BOD, TTX, MXDR, vCISO and CloudSignals+RiskOps in the listening report before the full render.');
  push(`- **When Ask finds no match** it shows \`strings.tourAskNone\` from \`${opt.manifest}\` (${q(m.strings?.tourAskNone ?? '')}), followed by the Talk to our team link and the suggested questions. It is shown and read by screen readers, not voiced, and it is signed with the interface words above.`);
  const engineLabels = [];
  for (const n of Object.values(t.nodes || {})) for (const o of n.choice?.options || []) { const x = /^\{str:(tour\w+)\}$/.exec(o.label || ''); if (x && !engineLabels.includes(x[1])) engineLabels.push(x[1]); }
  push(`- **Option labels.** ${engineLabels.length ? `${engineLabels.map((k) => `${q(m.strings?.[k] ?? k)} (\`strings.${k}\`)`).join(' and ')} come from the interface words, so the tour and the engine share one wording. ` : ''}The rest (${[...new Set(Object.values(t.nodes || {}).flatMap((n) => (n.choice?.options || []).map((o) => o.label)).filter((l) => typeof l === 'string' && typed(l)))].slice(0, 6).map((l) => q(l)).join(', ')} and others) are the script's own new copy, marked "new" in the choice tables.`);
  push('');
  return L.join('\n');
}

// ---- main ----
const lines = await collect();
const tot = totals(lines);
if (opt.mode === 'json') {
  process.stdout.write(`${JSON.stringify({ manifest: opt.manifest, tour: tourFile, lint, totals: tot, lines }, null, 2)}\n`);
} else if (opt.mode === 'sheet') {
  if (lint.errors.length) { for (const e of lint.errors) console.error('error:', e); console.error(`not writing ${opt.sheet}: the lint reports ${lint.errors.length} errors`); process.exit(1); }
  fs.writeFileSync(path.resolve(ROOT, opt.sheet), sheet(lines, tot));
  console.log(`wrote ${opt.sheet}: ${tot.tourLines} tour lines, ${tot.askQuestions} Ask questions, ${tot.totalChars} characters in all (${tot.voicedChars} to voice)`);
} else {
  if (opt.mode === 'print') for (const l of lines) console.log([l.key, l.hash ?? 'captions-only', String(l.chars).padStart(4), l.text].join('\t'));
  const p = (k, v) => console.log(`${k.padEnd(28)}${v}`);
  p('nodes', tot.nodes); p('tour lines (spoken)', tot.tourLines); p('ask questions / lines', `${tot.askQuestions} / ${tot.askLines}`); p('summary lines', tot.summaryLines);
  p('spoken characters, tour', tot.spokenTourChars); p('spoken characters, ask', tot.spokenAskChars); p('characters to voice', `${tot.voicedChars} in ${tot.voiceFiles} files`);
  p('other visible characters', tot.otherVisibleChars); p('total characters', tot.totalChars);
  p('statuses', Object.entries(tot.statuses).map(([k, v]) => `${k} ${v}`).join(', '));
  for (const x of tot.paths) p(x.name.slice(0, 27), `${x.lines} lines, ${x.words} words, ${x.minutes.toFixed(1)} min read, ${x.voiceMinutes.toFixed(1)} min voiced`);
  p('lint', `${lint.errors.length} errors, ${lint.warnings.length} warnings`);
  if (lint.errors.length) process.exitCode = 1;
}
