// Ask AiVRIC's matcher: a typed (or spoken) question → one of the approved questions in
// content/tour.json (ask.questions), or a short list to choose from, or nothing. Pure: no DOM, no
// imports, no network, nothing generated. js/ask.js shows only the approved answer the match
// names (with "Answering: {q}" above it), and tests/ask-match.spec.mjs runs this file under Node.
//
// How a question scores (the voice plan, section 4):
//   the text is normalised (NFKD, lower case, punctuation dropped), function words are dropped,
//   simple endings are trimmed (plurals, -ing, -ed, a final e) and a few synonyms fold together;
//   each remaining term then counts once for each question, at its best:
//     in the question's keys +3 · in the question itself +2 · a near miss of either (one edit at 5+
//     letters, two at 8+) +1.5 · only in the answer +0.5 (answer terms add at most 1.5);
//   a key of several words found in order in the text adds +3.5, plus +3 for each content word after
//   its first (its words then count no more), or +1.5 when it is all function words;
//   the total is divided by √(number of terms), so a long question does not win on length alone.
// It answers only when the best clears ANSWER and leads the next by MARGIN; it offers a choice
// when the best clears CHOOSE; otherwise it says it has no approved answer. A question typed
// exactly as an approved one always answers. Input is cut at MAX_INPUT characters. A text made only
// of function words ("who are you?") is scored on the ones that are single-word keys.

export const MAX_INPUT = 400;
export const THRESHOLDS = { answer: 1.6, margin: 0.6, choose: 1.0, related: 0.04 };

const W = { key: 3, q: 2, near: 1.5, part: 0.75, text: 0.5, textCap: 1.5, phrase: 3.5, weakPhrase: 1.5 };

// Function words that never decide a question on their own.
const STOP = new Set(`a an the is are was were be been being am do does did doing done i im me my mine we us our ours you youre your yours
it its this that these those there here to of in on at for with from by as into onto over under than and or nor but if so
can could would should will shall may might must what whats how hows why when where who whos which whom whose
have has had having any some just tell please know want like get got really much many very also too
about them they their theirs he she his her him one ones thing things lot bit okay ok hi hello hey
dont doesnt isnt arent wasnt werent cant wont wouldnt shouldnt couldnt ive weve youve id wed youd ill well youll
let lets make makes way ask asking question questions answer`.split(/\s+/));

// Spellings and near-synonyms that count as the same term (keys are the trimmed forms).
const SYN = {
  pric: 'price', charg: 'price', afford: 'price', affordabl: 'price', spend: 'price', quot: 'quote',
  theatr: 'theater', soc2: 'soc', iso27001: 'iso', 27001: 'iso', genai: 'ai', llm: 'ai', chatgpt: 'ai', mssp: 'msp',
  kick: 'start', kickoff: 'start', begin: 'start', commenc: 'start',
  guarante: 'guarantee', warranty: 'guarantee', certif: 'certificate', certifi: 'certificate', certify: 'certificate', certificat: 'certificate', certification: 'certificate',
  employe: 'hire', recruit: 'hire', hir: 'hire',
  sponsor: 'fund', investor: 'fund', examin: 'exam', examiner: 'exam', regulator: 'exam', regulat: 'exam', regulation: 'exam',
  prov: 'proof', provabl: 'proof', consult: 'consultant', consultancy: 'consultant', vs: 'different', versus: 'different', compar: 'different', once: 'after',
};

export function normalize(s) {
  return String(s ?? '').slice(0, MAX_INPUT).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’‘`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim();
}

export function stem(w) {
  if (w.length <= 3 || /\d/.test(w)) return SYN[w] || w;
  if (w.endsWith('ies') && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  if (/([b-df-hj-np-tv-z])\1$/.test(w) && !/(ll|ss|zz)$/.test(w)) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  return SYN[w] || w;
}

// Every word of a text, trimmed (function words kept: multi-word keys need them).
const trim = (w) => (STOP.has(w) ? w : stem(w));
const words = (s) => normalize(s).split(' ').filter(Boolean).map(trim);
// The words that can decide a question.
export const terms = (s) => words(s).filter((w) => !STOP.has(w));

function edits(a, b, max) {
  // Optimal string alignment: insertions, deletions, substitutions and swaps of neighbours cost 1.
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let low = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      if (d[i][j] < low) low = d[i][j];
    }
    if (low > max) return max + 1;
  }
  return d[a.length][b.length];
}
const near = (t, set) => {
  if (t.length < 3 || /\d/.test(t)) return false;
  const max = t.length >= 8 ? 2 : 1;
  for (const w of set) if (w.length >= 4 && w !== t && edits(t, w, max) <= max) return true;
  return false;
};
const hasRun = (seq, run) => {
  outer: for (let i = 0; i + run.length <= seq.length; i++) { for (let j = 0; j < run.length; j++) if (seq[i + j] !== run[j]) continue outer; return true; }
  return false;
};

// questions: [{id, q, keys?, text?}], q and text already resolved to what the visitor reads.
// names: words a visitor may open with to address the guide ("AiVRIC, how much…"), dropped there.
export function buildIndex(questions, { names = [] } = {}) {
  const entries = (questions || []).filter((x) => x && typeof x.id === 'string' && typeof x.q === 'string').map((x) => {
    const keys = (Array.isArray(x.keys) ? x.keys : []).map(words).filter((k) => k.length);
    const key = new Set(keys.filter((k) => k.length === 1).map((k) => k[0]).filter((w) => !STOP.has(w)));
    return {
      id: x.id,
      exact: normalize(x.q),
      key,                                                                     // single-word keys
      keyAll: new Set(keys.filter((k) => k.length === 1).map((k) => k[0])),   // the same, function words too
      phrases: keys.filter((k) => k.length > 1).map((k) => { const content = new Set(k.filter((w) => !STOP.has(w))).size; return { words: k, content, weak: !content }; }),
      part: new Set(keys.filter((k) => k.length > 1).flat().filter((w) => !STOP.has(w) && !key.has(w))),   // a word of a multi-word key, alone
      q: new Set(terms(x.q)),
      text: new Set(terms(x.text || '')),
    };
  });
  entries.names = new Set(names.map((n) => normalize(n)).filter(Boolean));
  return entries;
}

function score(e, ts, seq, fallback) {
  let s = 0, fromText = 0;
  const used = new Set();   // words a multi-word key already counted
  for (const p of e.phrases) if (hasRun(seq, p.words)) { s += p.weak ? W.weakPhrase : W.phrase + W.key * (p.content - 1); for (const w of p.words) used.add(w); }
  for (const t of ts) {
    if (used.has(t)) continue;
    if (e.key.has(t) || (fallback && e.keyAll.has(t))) s += W.key;
    else if (e.q.has(t)) s += W.q;
    else if (near(t, e.key) || near(t, e.q)) s += W.near;
    else if (e.part.has(t)) s += W.part;
    else if (e.text.has(t) && fromText < W.textCap) { const add = Math.min(W.text, W.textCap - fromText); s += add; fromText += add; }
  }
  return ts.length ? s / Math.sqrt(ts.length) : 0;
}

function prepare(index, input) {
  let norm = normalize(input);
  for (const n of index.names || []) {
    const lead = new RegExp(`^(?:(?:hey|hi|hello|ok|okay|so)\\s+)?${n.replace(/[^a-z0-9 ]/g, '')}(?:\\s+|$)`);
    if (lead.test(norm) && norm.replace(lead, '').trim()) norm = norm.replace(lead, '').trim();
  }
  return norm;
}

function rank(index, norm, { exclude = null } = {}) {
  const seq = norm.split(' ').filter(Boolean).map(trim);
  let ts = [...new Set(seq.filter((w) => !STOP.has(w)))];
  const fallback = !ts.length;
  if (fallback) ts = [...new Set(seq)];
  const order = new Map(index.map((e, i) => [e.id, i]));
  return index.filter((e) => e.id !== exclude).map((e) => ({ id: e.id, score: Math.round(score(e, ts, seq, fallback) * 1000) / 1000 }))
    .sort((a, b) => b.score - a.score || order.get(a.id) - order.get(b.id));
}

// → {kind: 'empty'|'answer'|'choose'|'none', id?, ids?, ranked, query}
export function match(index, input) {
  const query = String(input ?? '').slice(0, MAX_INPUT);
  const norm = prepare(index, query);
  if (!norm) return { kind: 'empty', ranked: [], query };
  const exact = index.find((e) => e.exact === norm);
  if (exact) return { kind: 'answer', id: exact.id, ranked: [{ id: exact.id, score: Infinity }], query };
  const ranked = rank(index, norm);
  const [a, b] = ranked;
  if (a && a.score >= THRESHOLDS.answer && a.score - (b?.score || 0) >= THRESHOLDS.margin) return { kind: 'answer', id: a.id, ranked, query };
  if (a && a.score >= THRESHOLDS.choose) {
    const ids = ranked.filter((x) => x.score >= Math.max(THRESHOLDS.choose * 0.6, a.score * 0.6)).slice(0, 3).map((x) => x.id);
    return { kind: 'choose', ids, ranked, query };
  }
  return { kind: 'none', ranked, query };
}

// Up to n other approved questions nearest this one: the words each question is made of (keys,
// wording, answer) compared as sets weighted by rarity (a word every question shares says nothing),
// topped up in the script's order; the same list every time.
export function related(index, id, n = 3) {
  const i = index.findIndex((x) => x.id === id);
  if (i < 0) return [];
  const bags = index.map((e) => new Set([...e.key, ...e.q, ...e.part, ...e.text]));
  const df = new Map();
  for (const b of bags) for (const t of b) df.set(t, (df.get(t) || 0) + 1);
  const w = (t) => Math.log((index.length + 1) / (df.get(t) || 1)) ** 2;
  const size = (b) => Math.sqrt([...b].reduce((s, t) => s + w(t), 0)) || 1;
  const A = bags[i], nA = size(A);
  const out = bags.map((B, j) => {
    if (j === i) return null;
    let dot = 0;
    for (const t of A) if (B.has(t)) dot += w(t);
    return { id: index[j].id, s: dot / (nA * size(B)), j };
  }).filter((x) => x && x.s >= THRESHOLDS.related).sort((a, b) => b.s - a.s || a.j - b.j).slice(0, n).map((x) => x.id);
  for (const x of index) { if (out.length >= n) break; if (x.id !== id && !out.includes(x.id)) out.push(x.id); }
  return out;
}
