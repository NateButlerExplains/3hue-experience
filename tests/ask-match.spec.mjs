// T-12 (the matcher behind Ask AiVRIC): js/ask-match.js under Node, against the approved questions
// in content/tour.json (and the engine fixture), resolved from the manifest exactly as js/ask.js
// resolves them, and the visitor-style wordings in tests/fixtures/ask-paraphrases.json.
//   every approved question typed as written answers itself;
//   paraphrases: at least 90% rank the right question first, none answers a wrong one, and the right
//     one is answered or offered for at least 95%;
//   slips of the keyboard are answered or offered; off-topic and injection-style text gets no answer;
//   empty input does nothing; long input is cut at 400 characters and stays fast;
//   related questions are other approved questions, at most three, the same every time;
//   the module is pure (no imports, no DOM, no network).
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { ROOT, manifest as m, readJson, annotate } from './helpers.mjs';
import { buildIndex, match, related, MAX_INPUT, THRESHOLDS } from '../js/ask-match.js';
import { fillTemplate, resolveLine } from '../js/tourtext.js';

const P = readJson('tests/fixtures/ask-paraphrases.json');
const SCRIPTS = { 'content/tour.json': readJson('content/tour.json'), 'tests/fixtures/tour-min.json': readJson('tests/fixtures/tour-min.json') };

// The questions as js/ask.js shows them: q filled from the manifest, answer lines resolved.
function questions(T) {
  const c = { tour: T, answers: {}, chosen: {}, visited: [], door: null };
  return T.ask.questions.map((x) => ({ id: x.id, q: fillTemplate(x.q, m, c), keys: x.keys || [], text: x.lines.map((l) => resolveLine(l, m, c)?.text || '').join(' ') }));
}
const NAMES = Object.values(m.guide.guides).map((x) => x.name);
const LEAD = m.guide.guides[m.guide.lead].name;
const indexOf = (T) => buildIndex(questions(T), { names: NAMES });
const REAL = SCRIPTS['content/tour.json'];
const IX = indexOf(REAL);
const IDS = REAL.ask.questions.map((q) => q.id);

test('T-12 matcher: the wording fixture names only approved questions, and covers every one of them', () => {
  for (const p of [...P.paraphrases, ...P.misspellings]) expect(IDS, p.text).toContain(p.id);
  const covered = new Set(P.paraphrases.map((p) => p.id));
  expect(IDS.filter((id) => !covered.has(id)), 'questions with no visitor wording').toEqual([]);
});

for (const [file, T] of Object.entries(SCRIPTS)) {
  test(`T-12 matcher: every approved question in ${file}, typed as written (or in other case and punctuation), answers itself`, () => {
    const ix = indexOf(T);
    for (const q of questions(T)) {
      for (const text of [q.q, q.q.toUpperCase(), `${q.q.replace(/[?.!]/g, '')}!!`, `  ${q.q.toLowerCase()}  `]) {
        const r = match(ix, text);
        expect({ text, kind: r.kind, id: r.id }).toEqual({ text, kind: 'answer', id: q.id });
      }
    }
  });
}

test('T-12 matcher: visitor wordings rank the right question first at least 90% of the time, never answer a wrong one, and answer or offer the right one at least 95% of the time', ({}, testInfo) => {
  let top = 0, offered = 0;
  const wrong = [], missed = [];
  for (const p of P.paraphrases) {
    const r = match(IX, p.text);
    if (r.ranked[0]?.id === p.id) top++;
    if ((r.kind === 'answer' && r.id === p.id) || (r.kind === 'choose' && r.ids.includes(p.id))) offered++;
    else missed.push({ text: p.text, want: p.id, got: r.kind, ids: r.id || r.ids || null });
    if (r.kind === 'answer' && r.id !== p.id) wrong.push({ text: p.text, want: p.id, got: r.id, score: r.ranked[0].score });
  }
  const n = P.paraphrases.length;
  annotate(testInfo, { n, top1: top, offered, wrong, missed, thresholds: THRESHOLDS });
  expect(wrong, 'no wording answers the wrong question').toEqual([]);
  expect(top / n, `top-1 ${top}/${n}`).toBeGreaterThanOrEqual(0.9);
  expect(offered / n, `answered or offered ${offered}/${n}: ${JSON.stringify(missed)}`).toBeGreaterThanOrEqual(0.95);
});

test('T-12 matcher: slips of the keyboard still find the question, answered or offered', ({}, testInfo) => {
  const out = P.misspellings.map((p) => { const r = match(IX, p.text); return { text: p.text, want: p.id, kind: r.kind, ids: r.kind === 'answer' ? [r.id] : r.ids || [] }; });
  annotate(testInfo, out);
  for (const o of out) {
    expect(['answer', 'choose'], o.text).toContain(o.kind);
    expect(o.ids, o.text).toContain(o.want);
    if (o.kind === 'answer') expect(o.ids[0], o.text).toBe(o.want);
  }
});

test('T-12 matcher: off-topic and injection-style text gets no approved answer, so the fallback shows', () => {
  for (const text of [...P.offTopic, ...P.injection]) {
    const r = match(IX, text);
    expect({ text, kind: r.kind }).toEqual({ text, kind: 'none' });
  }
});

test('T-12 matcher: empty or blank input does nothing; long input is cut at 400 characters and stays fast', () => {
  for (const text of ['', '   ', '\n\t', '?!.,', null, undefined]) expect(match(IX, text).kind).toBe('empty');
  const long = `${'how much does it cost '.repeat(300)}`;
  const t0 = performance.now();
  const r = match(IX, long);
  const ms = performance.now() - t0;
  expect(r.query.length).toBe(MAX_INPUT);
  expect(r.kind).toBe('answer');
  expect(r.id).toBe('pricing');
  expect(ms, `${ms.toFixed(1)} ms`).toBeLessThan(250);
  const noise = 'x'.repeat(20000);
  expect(match(IX, noise).query.length).toBe(MAX_INPUT);
});

test('T-12 matcher: the guide addressed by name at the start is not part of the question; alone, the name asks about the guide', () => {
  expect(match(IX, `${LEAD}, how much does it cost?`)).toMatchObject({ kind: 'answer', id: 'pricing' });
  expect(match(IX, `hey ${LEAD.toLowerCase()} what proof do you have`)).toMatchObject({ kind: 'answer', id: 'proof' });
  expect(match(IX, 'What is AiVRIC?')).toMatchObject({ kind: 'answer', id: 'aivric' });
});

test('T-12 matcher: related questions are other approved questions, at most three, and the same every time', () => {
  for (const id of IDS) {
    const a = related(IX, id), b = related(IX, id);
    expect(a).toEqual(b);
    expect(a.length).toBeLessThanOrEqual(3);
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toContain(id);
    expect(new Set(a).size).toBe(a.length);
    for (const x of a) expect(IDS).toContain(x);
  }
  expect(related(IX, 'no-such-question')).toEqual([]);
});

test('T-12 matcher: js/ask-match.js is pure: no imports, no DOM, no storage, no network', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/ask-match.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  for (const re of [/\bimport\b/, /\bdocument\b/, /\bwindow\b/, /\bfetch\s*\(/, /XMLHttpRequest/, /localStorage|sessionStorage/, /navigator\./, /new\s+(Image|WebSocket|EventSource)/]) {
    expect(src, String(re)).not.toMatch(re);
  }
});
