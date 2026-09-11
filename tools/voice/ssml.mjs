// SSML for the speech service, and the way back from its word events to the caption (O10).
//
// buildSsml() escapes the spoken text into <speak><voice>…</voice></speak> and keeps, for every
// character of the SSML, the character of the plain text it came from (-1 for markup). Escaping
// shifts positions ("&" is five characters in SSML: &amp;), and so do pronunciation entries
// (guide.voice.say, written as <sub alias>), so this map is the only reliable way back.
//
// timingJson() turns the service's word events into the documented timing file
// (docs/VOICE.md): [start s, duration s, spoken word, charStart, charEnd) with UTF-16 offsets into
// the caption text. Each word is placed by, in order: the pronunciation span it belongs to; the
// SDK's text offset mapped back through the SSML map, when it lands on the same word at or after
// the cursor; a forward search from the cursor; a token whose letters match. When a line has a
// `say` that differs from its caption, spoken tokens are aligned to caption tokens (longest common
// subsequence on letters and digits; tokens between anchors are shared out in order).
import { tokens } from '../../js/tourtext.js';

// Attributes escape all five XML specials; text only needs &, < and >. Leaving quotes and
// apostrophes alone in text keeps words like "I'm" findable by the SDK and off the bill.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const TEXT_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
export const escapeXml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const escapeText = (s) => String(s ?? '').replace(/[&<>]/g, (c) => TEXT_ESC[c]);
// XML 1.0 forbids most C0 controls; each becomes a space so every position keeps its meaning.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/;
const WORDCH = /[\p{L}\p{N}]/u;
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const norm = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
export const round3 = (x) => Math.round(x * 1000) / 1000;
const TICKS = 1e7;   // the SDK reports offsets and durations in 100 ns ticks

// Azure's rate is a relative percentage; 0 means the voice's own pace and writes no <prosody>
// (the owner's tour uses +0%).
export function rateAttr(rate) {
  const r = Number(rate) || 0;
  return r ? `${r > 0 ? '+' : ''}${r}%` : null;
}

const charBefore = (s, i) => (i > 0 ? String.fromCodePoint(s.codePointAt(i - 1 - (/[\uDC00-\uDFFF]/.test(s[i - 1]) && i > 1 ? 1 : 0))) : '');
const charAt = (s, i) => (i < s.length ? String.fromCodePoint(s.codePointAt(i)) : '');

// Whole-word occurrences of each pronunciation term, longest term first, never overlapping.
export function lexiconSpans(text, lexicon = {}) {
  const s = String(text ?? '');
  const terms = Object.keys(lexicon || {}).filter(Boolean).sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
  const spans = [];
  for (const term of terms) {
    for (let i = s.indexOf(term); i !== -1; i = s.indexOf(term, i + 1)) {
      const end = i + term.length;
      const edge = (!WORDCH.test(charAt(term, 0)) || !WORDCH.test(charBefore(s, i)))
        && (!WORDCH.test(charBefore(term, term.length)) || !WORDCH.test(charAt(s, end)));
      if (edge && !spans.some((x) => i < x.end && end > x.start)) spans.push({ start: i, end, term, alias: String(lexicon[term]) });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}
export const usedLexicon = (text, lexicon = {}) => Object.fromEntries(lexiconSpans(text, lexicon).map((x) => [x.term, x.alias]));

// Characters the service bills: everything inside <voice>, markup and entities included, but not
// the <speak> and <voice> tags. Counted in code points; CJK ideographs count twice.
export function billableChars(ssml) {
  const body = String(ssml ?? '').replace(/<\/?speak\b[^>]*>|<\/?voice\b[^>]*>/g, '');
  let n = 0;
  for (const ch of body) n += /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/u.test(ch) ? 2 : 1;
  return n;
}

export function buildSsml(text, { voice = 'en-US-AvaNeural', locale = 'en-US', rate = 0, lexicon = {} } = {}) {
  const plain = String(text ?? '');
  const r = rateAttr(rate);
  const open = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${escapeXml(locale)}"><voice name="${escapeXml(voice)}">${r ? `<prosody rate="${r}">` : ''}`;
  const close = `${r ? '</prosody>' : ''}</voice></speak>`;
  const spans = lexiconSpans(plain, lexicon);
  const back = [];
  let ssml = '';
  const markup = (m) => { ssml += m; for (let k = 0; k < m.length; k++) back.push(-1); };
  markup(open);
  const bodyStart = ssml.length;
  for (let i = 0, si = 0; i < plain.length; i++) {
    const sp = spans[si];
    if (sp && i === sp.start) markup(`<sub alias="${escapeXml(sp.alias)}">`);
    const c = CONTROL.test(plain[i]) ? ' ' : plain[i];
    const e = TEXT_ESC[c] ?? c;
    ssml += e;
    for (let k = 0; k < e.length; k++) back.push(i);
    if (sp && i === sp.end - 1) { markup('</sub>'); si++; }
  }
  const bodyEnd = ssml.length;
  markup(close);
  return {
    ssml, text: plain, spans, bodyStart, bodyEnd,
    used: Object.fromEntries(spans.map((x) => [x.term, x.alias])),
    billable: billableChars(ssml),
    // SSML offset → plain offset, or -1 inside markup or outside the body.
    toPlain: (off) => (Number.isInteger(off) && off >= 0 && off < back.length ? back[off] : -1),
    // SSML range [a, b) → plain range [start, end), or null when it covers no plain character.
    plainRange(a, b) {
      let lo = -1, hi = -1;
      for (let k = Math.max(0, a); k < Math.min(b, back.length); k++) if (back[k] >= 0) { if (lo < 0) lo = back[k]; hi = back[k]; }
      return lo < 0 ? null : [lo, hi + 1];
    },
  };
}

// The plain text of an SSML body (for tests and the listening report): markup dropped, entities
// decoded.
export function ssmlText(ssml) {
  const body = String(ssml).replace(/^[\s\S]*?<voice\b[^>]*>(?:<prosody\b[^>]*>)?|(?:<\/prosody>)?<\/voice>[\s\S]*$/g, '');
  return body.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|apos);/g, (m, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[k]);
}

// Word events as recorded by tools/voice/azure.mjs, or straight from the SDK.
const evType = (e) => e.type ?? e.boundaryType ?? 'WordBoundary';
const evOffset = (e) => e.offset ?? e.audioOffset ?? 0;

// Word events → [{start, dur, word, ps, pe}], ranges into the spoken text (null when unplaced).
export function placeWords(events, built) {
  const spoken = built.text;
  const toks = tokens(spoken);
  const aliasWords = (sp) => new Set([...sp.alias.split(/\s+/).map(norm), norm(sp.term)].filter(Boolean));
  const find = (w, from) => {
    if (!w) return null;
    const re = new RegExp(escRe(w), 'giu');
    re.lastIndex = from;
    const m = re.exec(spoken);
    if (m) return [m.index, m.index + m[0].length];
    const n = norm(w);
    const t = n && toks.find((x) => x.start >= from && norm(x.word) === n);
    if (!t) return null;
    const off = t.text.indexOf(t.word);
    return [t.start + off, t.start + off + t.word.length];
  };
  const out = [];
  let cursor = 0, inSpan = null;
  for (const ev of (events || []).filter((e) => evType(e) === 'WordBoundary')) {
    const w = String(ev.text ?? '');
    const n = norm(w);
    let range = null, viaSpan = null;
    if (inSpan && !(n && aliasWords(inSpan).has(n))) { cursor = Math.max(cursor, inSpan.end); inSpan = null; }
    // 1. A word of the pronunciation span we are in, or the next one, when nothing nearer matches.
    const sp = inSpan || built.spans.find((x) => x.end > cursor);
    if (sp && n && aliasWords(sp).has(n)) {
      const nearer = sp === inSpan ? null : find(w, cursor);
      if (!nearer || nearer[0] >= sp.start) { range = [sp.start, sp.end]; viaSpan = sp; }
    }
    // 2. The SDK's offset, when it lands on this word at or after the cursor.
    if (!range && Number.isInteger(ev.textOffset) && ev.textOffset >= 0) {
      const r = built.plainRange(ev.textOffset, ev.textOffset + w.length);
      if (r && r[0] >= cursor && (norm(spoken.slice(r[0], r[1])) === n || spoken.slice(r[0], r[1]) === w)) range = r;
    }
    // 3. Search forward.
    if (!range) range = find(w, cursor);
    if (range) {
      if (viaSpan) { inSpan = viaSpan; cursor = Math.max(cursor, viaSpan.start); }
      else cursor = range[1];
    }
    out.push({ start: evOffset(ev) / TICKS, dur: (ev.duration ?? 0) / TICKS, word: w, ps: range ? range[0] : null, pe: range ? range[1] : null });
  }
  return out;
}

// Spoken range → caption range, for a line whose `say` differs from its caption.
export function captionMapper(spoken, caption) {
  if (spoken === caption) return (ps, pe) => [ps, pe];
  const A = tokens(spoken), B = tokens(caption);
  const an = A.map((t) => norm(t.word)), bn = B.map((t) => norm(t.word));
  const n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = an[i] && an[i] === bn[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const anchors = [[-1, -1]];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (an[i] && an[i] === bn[j]) { anchors.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  anchors.push([n, m]);
  const toB = new Array(n).fill(-1);
  for (let k = 0; k < anchors.length - 1; k++) {
    const [a0, b0] = anchors[k], [a1, b1] = anchors[k + 1];
    if (a0 >= 0) toB[a0] = b0;
    const ga = a1 - a0 - 1, gb = b1 - b0 - 1;
    for (let t = 0; t < ga; t++) toB[a0 + 1 + t] = gb > 0 ? b0 + 1 + Math.floor((t * gb) / ga) : b0 >= 0 ? b0 : b1 < m ? b1 : -1;
  }
  const wordRange = (t) => { if (!t.word) return [t.start, t.end]; const off = t.text.indexOf(t.word); return [t.start + off, t.start + off + t.word.length]; };
  return (ps, pe) => {
    const hit = [];
    A.forEach((t, i) => { if (t.start < pe && t.end > ps) hit.push(i); });
    if (!hit.length) return null;
    const bs = hit.map((i) => toB[i]).filter((b) => b >= 0);
    if (!bs.length) return null;
    return [wordRange(B[Math.min(...bs)])[0], wordRange(B[Math.max(...bs)])[1]];
  };
}

// The documented timing file for one voiced line. `text` is the caption, `built` the SSML of what
// was spoken (built.text is `say` when the line has one). Throws when fewer than minCoverage of
// the words can be placed on the caption, or when a line with words got no word events.
export function timingJson({ id, hash, voice, text, built, events, duration, minCoverage = 0.9 }) {
  const placed = placeWords(events, built);
  const map = captionMapper(built.text, text);
  const words = placed.map((w) => {
    const r = w.ps == null ? null : map(w.ps, w.pe);
    return [round3(w.start), round3(w.dur), w.word, r ? r[0] : null, r ? r[1] : null];
  }).sort((a, b) => a[0] - b[0]);
  const placedCount = words.filter((w) => w[3] != null).length;
  const coverage = words.length ? placedCount / words.length : 0;
  if (/[\p{L}\p{N}]/u.test(text) && coverage < minCoverage) {
    throw new Error(`${id}: ${placedCount} of ${words.length} word timings placed on the caption (${Math.round(coverage * 100)}%, at least ${Math.round(minCoverage * 100)}% needed)`);
  }
  return { json: { v: 1, id, hash, voice, text, duration: round3(duration), words }, coverage };
}
