// Tour text: the pure half of the guided tour (O10/O11). Refs into the approved manifest, template
// tokens, conditions, next-target resolution, caption tokens and the line hash. No DOM and no
// imports, so the runtime (js/tour.js), the lint (tools/check-manifest.js) and the voice tools read
// the script in exactly the same way.
//
// Refs are dot paths into content/experience.json. A numeric segment indexes an array; any other
// segment on an array picks the element with that `id` (doors.win-trust, stages.assess); `@` is the
// door whose scene is up (ctx.door). `proof[0]` means `proof.0`. A ref resolves to text (a string or
// number; an object's `text`, `lead` or `name`; an array of strings joined by spaces) plus the source
// and status of the nearest object on the path that carries a status (`basis` counts as the source,
// as it does for proof). That is how a figure keeps its printed source.
//
// Template tokens fill names from the manifest so none is ever typed into the script:
//   {door:<id|@>.<path>}  {stage:<id|where-to-start>}  {str:<key>}  {ref:<path>}
//   {guide}  {guide:<field>}  {guide:<id>}  {guide:<id>.<field>}  {url:booking|site|logo}
//   {offer:<id>}  {program:<id>}
// and two that only the runtime can fill: {answer:<key>} (the chosen label, else the stored value)
// and {chapters:visited} (visited chapter titles).
// Two guides (O12): {guide} and {guide:<field>} are whoever speaks the line (ctx.guide: the line's
// `who`, else the lead), {guide:<id>} names one guide. A field a guide does not carry falls back to
// the shared guide block (guide.title). {offer:<id>} is a quote-builder name (offers.<id>.name, O15)
// and {program:<id>} a program name (programs.<id>.name).
// A static token that does not resolve stays visible as written so a typo shows on screen
// (content.js fmt does the same); a runtime token with nothing to show is empty.
//
// Conditions (a line's `when`, an option's `suggest` and `hideWhen`, a branch's `when`):
//   {answers:{key:[values]}, visited:[chapterIds], notVisited:[chapterIds]}
// Every clause must hold; an array of conditions matches when any one does; an absent one always does.
// Next targets: a node id, "=routeName" (a key of tour.routes), or [{when?, go}] (first match wins).
//
// ctx, where a function takes one: {door, guide, answers:{key:value}, chosen:{key:label}, visited:[ids], tour}.

export const SCENES = ['rest', 'door', 'station', 'path', 'kiosk', 'keep'];
export const ACTIONS = ['talk', 'ask', 'summary', 'replay', 'end', 'explore'];
export const STATUSES = ['approved-copy', 'verified', 'substantiated', 'adapted', 'proposed', 'derived'];
export const TOKEN_KINDS = ['door', 'stage', 'str', 'ref', 'guide', 'url', 'offer', 'program', 'answer', 'chapters'];
const RUNTIME_KINDS = new Set(['answer', 'chapters']);
const TOKEN = /\{([a-z]+)(?::([^{}\s]+))?\}/g;
const URL_KEYS = { booking: 'bookingUrl', site: 'url', logo: 'logoHref' };

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// A ref → {text, source, status, path} (path with `@` replaced by the door), or null.
export function resolveRef(m, ref, ctx = {}) {
  if (!m || typeof ref !== 'string' || !ref) return null;
  const segs = ref.replace(/\[(\d+)\]/g, '.$1').split('.');
  const chain = [], trail = [];
  let v = m;
  for (let s of segs) {
    if (s === '@') s = ctx.door;
    if (!s || v == null || typeof v !== 'object') return null;
    chain.push(v);
    v = Array.isArray(v) ? (/^\d+$/.test(s) ? v[+s] : v.find((x) => isObj(x) && x.id === s)) : (own(v, s) ? v[s] : undefined);
    trail.push(s);
  }
  let text = null;
  if (typeof v === 'string') text = v;
  else if (typeof v === 'number' && Number.isFinite(v)) text = String(v);
  else if (Array.isArray(v)) { if (v.length && v.every((x) => typeof x === 'string')) text = v.join(' '); }
  else if (isObj(v)) { for (const k of ['text', 'lead', 'name']) if (typeof v[k] === 'string') { text = v[k]; break; } }
  if (text == null) return null;
  let source = null, status = null;
  for (const o of [v, ...chain.reverse()]) {
    if (isObj(o) && typeof o.status === 'string') { status = o.status; source = o.source ?? o.basis ?? null; break; }
  }
  return { text, source, status, path: trail.join('.') };
}

// The guides (O12). guideIds: the ids in manifest order ([] for a single-guide manifest). guideId:
// the guide a line is spoken by: the id given when the manifest has it, else the lead, else the
// first. A line's `who` pins it; an unpinned line is spoken by the lead.
export const guideIds = (m) => (isObj(m?.guide?.guides) ? Object.keys(m.guide.guides) : []);
export function guideId(m, id) {
  const ids = guideIds(m);
  if (!ids.length) return null;
  if (id && ids.includes(id)) return id;
  return ids.includes(m.guide.lead) ? m.guide.lead : ids[0];
}
export const speakerOf = (line, m, lead) => guideId(m, isObj(line) && typeof line.who === 'string' ? line.who : lead);

// One token → its text, or null when it cannot be filled.
export function resolveToken(kind, arg, m, ctx = {}) {
  switch (kind) {
    case 'door': {
      const i = arg ? arg.indexOf('.') : -1;
      return i > 0 ? resolveRef(m, `doors.${arg.slice(0, i)}.${arg.slice(i + 1)}`, ctx)?.text ?? null : null;
    }
    case 'stage': {
      if (arg === 'where-to-start') return typeof m?.strings?.whereToStart === 'string' ? m.strings.whereToStart : null;
      const s = (m?.stages || []).find((x) => x.id === arg);
      return s && typeof s.name === 'string' ? s.name : null;
    }
    case 'str': return arg && typeof m?.strings?.[arg] === 'string' ? m.strings[arg] : null;
    case 'ref': return arg ? resolveRef(m, arg, ctx)?.text ?? null : null;
    case 'guide': {
      const gd = m?.guide, gs = isObj(gd?.guides) ? gd.guides : null;
      if (!gs) { const v = gd?.[arg || 'name']; return typeof v === 'string' ? v : null; }
      let id = guideId(m, ctx.guide), field = arg || 'name';
      if (arg) { const [a, b] = arg.split('.'); if (own(gs, a)) { id = a; field = b || 'name'; } else if (b !== undefined) return null; }
      const v = isObj(gs[id]) && typeof gs[id][field] === 'string' ? gs[id][field] : gd[field];
      return typeof v === 'string' && field !== 'guides' ? v : null;
    }
    case 'url': { const k = URL_KEYS[arg]; return k && typeof m?.site?.[k] === 'string' ? m.site[k] : null; }
    case 'offer': { const o = arg && isObj(m?.offers) && own(m.offers, arg) ? m.offers[arg] : null; return isObj(o) && typeof o.name === 'string' ? o.name : null; }
    case 'program': { const o = arg && isObj(m?.programs) && own(m.programs, arg) ? m.programs[arg] : null; return isObj(o) && typeof o.name === 'string' ? o.name : null; }
    case 'answer': { if (!arg) return null; const v = ctx.chosen?.[arg] ?? ctx.answers?.[arg]; return v == null ? null : String(v); }
    case 'chapters': {
      if (arg !== 'visited') return null;
      const list = ctx.tour?.chapters || [];
      const plain = { ...ctx, visited: [] };   // a chapter title never lists chapters
      return (ctx.visited || []).map((id) => list.find((c) => c.id === id)).filter(Boolean).map((c) => fillTemplate(c.title, m, plain)).join(', ');
    }
    default: return null;
  }
}

export function fillTemplate(tpl, m, ctx = {}) {
  return String(tpl ?? '').replace(TOKEN, (raw, kind, arg) => {
    const v = resolveToken(kind, arg ?? null, m, ctx);
    return v != null ? v : RUNTIME_KINDS.has(kind) ? '' : raw;
  });
}

// The tokens in a template, for the lint: [{raw, kind, arg, runtime}].
export function templateTokens(tpl) {
  return [...String(tpl ?? '').matchAll(TOKEN)].map((x) => ({ raw: x[0], kind: x[1], arg: x[2] ?? null, runtime: RUNTIME_KINDS.has(x[1]) }));
}
// The template with every token replaced by a space: what the author actually typed.
export function stripTokens(tpl) { return String(tpl ?? '').replace(TOKEN, ' '); }

// A line → {id, text, source, status, ref} as shown and spoken, or null when it cannot resolve.
export function resolveLine(line, m, ctx = {}) {
  if (!isObj(line)) return null;
  if (typeof line.ref === 'string') {
    const r = resolveRef(m, line.ref, ctx);
    return r && { id: line.id ?? null, text: r.text, source: r.source, status: r.status, ref: r.path };
  }
  if (typeof line.text !== 'string') return null;
  return { id: line.id ?? null, text: fillTemplate(line.text, m, ctx), source: line.source ?? null, status: line.status ?? null, ref: null };
}

// A node's scene as {kind, door?, station?, stage?, fallback?}; a bare string names the kind.
export function sceneOf(node) {
  const s = node?.scene;
  if (typeof s === 'string') return { kind: s };
  if (isObj(s)) return { ...s };
  return { kind: 'keep' };
}

// The value a choice with `remember` stores for an option.
export const optionValue = (opt) => (opt?.value ?? opt?.id ?? null);

export function matches(cond, ctx = {}) {
  if (cond == null) return true;
  if (Array.isArray(cond)) return cond.some((c) => matches(c, ctx));
  if (!isObj(cond)) return false;
  const answers = ctx.answers || {};
  const visited = new Set(ctx.visited || []);
  for (const [k, vals] of Object.entries(cond.answers || {})) if (!new Set([].concat(vals)).has(answers[k])) return false;
  for (const c of [].concat(cond.visited || [])) if (!visited.has(c)) return false;
  for (const c of [].concat(cond.notVisited || [])) if (visited.has(c)) return false;
  return true;
}

// A Next → the node id it names for this ctx, or null (no branch matched, unknown route, a route
// loop). Node existence is the caller's check.
export function resolveNext(next, ctx = {}, tour = ctx.tour || {}, depth = 0) {
  if (next == null || depth > 16) return null;
  if (typeof next === 'string') return next.startsWith('=') ? resolveNext(tour.routes?.[next.slice(1)], ctx, tour, depth + 1) : next;
  if (Array.isArray(next)) {
    for (const b of next) if (isObj(b) && matches(b.when, ctx)) return resolveNext(b.go, ctx, tour, depth + 1);
  }
  return null;
}

// Whitespace-separated caption tokens with UTF-16 offsets (end exclusive), for word spans and for
// mapping voice word timings [start, dur, word, charStart, charEnd] onto the caption. `word` is the
// token without leading or trailing punctuation.
export function tokens(text) {
  const out = [];
  for (const x of String(text ?? '').matchAll(/\S+/g)) {
    out.push({ text: x[0], word: x[0].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''), start: x.index, end: x.index + x[0].length });
  }
  return out;
}

// ---- Rooms that talk back (O14) ----
// A node (its base state) and any of its lines may carry write: {<surface id>: entry | null}, where
// entry = {kind, lines: [item], at?} and an item is a template (as a caption) or {ref} (a sourced
// field: the only way a figure reaches a surface; its source prints with it). Kinds: sign (one or two
// short lines, large), list (up to four short items), card (a ref'd figure and its source), status (a
// short label; a typed ✓ or ? is its mark), glow (no text: the surface lights). `at` names a word of
// the line's caption: with the voice on, the entry waits until that word is said.
export const WRITE_KINDS = ['sign', 'list', 'card', 'status', 'glow'];
export const MAX_WRITE_ITEMS = 4;

// The token index of `word` in a caption (compared without punctuation and case), or -1.
export function atIndex(text, word) {
  const w = String(word ?? '').toLowerCase();
  return w ? tokens(text).findIndex((t) => t.word.toLowerCase() === w) : -1;
}

// What a node's surfaces show at line li: the node's base write, then the write of every shown line
// (lines: the node's lines already filtered by `when`, each {text, write}) from the first to li, in
// order; null clears a surface. Nothing carries over from the node before. On line li itself an entry
// with `at` waits while the voice has not reached that word: heard is the token index the voice has
// said (Infinity when the line is not being voiced). → {surfaceId: entry}. Pure, so Previous, a deep
// link, a resize and each trigger version all come back to the same state.
export function foldWrites(base, lines, li, heard = Infinity) {
  const out = {};
  const put = (w, line) => {
    if (!isObj(w)) return;
    for (const [id, e] of Object.entries(w)) {
      if (e === null) { delete out[id]; continue; }
      if (!isObj(e)) continue;
      if (line && typeof e.at === 'string' && heard < atIndex(line.text, e.at)) continue;
      out[id] = e;
    }
  };
  put(base, null);
  for (let i = 0; i <= li && i < (lines || []).length; i++) put(lines[i]?.write, i === li ? lines[i] : null);
  return out;
}

// An entry as shown: {kind, items: [{text, source}]} with templates filled and refs resolved (a ref
// keeps the source the manifest prints beside it), or null when nothing resolves.
export function resolveEntry(e, m, ctx = {}) {
  if (!isObj(e) || !WRITE_KINDS.includes(e.kind)) return null;
  const items = [];
  for (const it of Array.isArray(e.lines) ? e.lines : []) {
    if (typeof it === 'string') { const text = fillTemplate(it, m, ctx).trim(); if (text) items.push({ text, source: null }); }
    else if (isObj(it) && typeof it.ref === 'string') { const r = resolveRef(m, it.ref, ctx); if (r?.text) items.push({ text: r.text, source: r.status ? r.source : null }); }
  }
  if (e.kind !== 'glow' && !items.length) return null;
  return { kind: e.kind, items: e.kind === 'glow' ? [] : items };
}
// The words an entry puts on its surface, for the screen-reader list and the checks; a glow has none.
export const entryText = (r) => (r?.items || []).map((x) => x.text).join(' · ');

// SHA-256 of NFC(text) + "\0" + NFC(say), first 16 hex characters. Browser and Node (WebCrypto).
export async function hashLine(text, say = '') {
  const data = new TextEncoder().encode(`${String(text ?? '').normalize('NFC')}\u0000${String(say ?? '').normalize('NFC')}`);
  const buf = await globalThis.crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
