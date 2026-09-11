// Plain text for ElevenLabs (O13), and the way back from its alignment to the caption.
//
// ElevenLabs reads plain text, and on eleven_multilingual_v2 and eleven_v3 its pronunciation
// dictionaries only honour alias rules (phoneme rules are for the older English models), so
// pronunciation is done here, the same way for every model: each whole-word term in guide.voice.say
// is replaced by its alias in the text sent (AiVRIC → "av-RICK", 3HUE → "three hue"). The terms
// and their order are the ones buildSsml() uses (lexiconSpans in ssml.mjs), so both providers say
// the same thing.
//
// buildPlain() mirrors buildSsml(): for every character of the request it keeps the range of the
// spoken text it came from. A character outside any alias maps to itself; every character of an
// alias maps to the whole term it replaced, so a word the service times inside "three hue" lands
// on "3HUE" in the caption. `aliases` gives each replacement's range in the request, which
// elevenlabs.mjs uses to time a replaced term as one word.
import { lexiconSpans } from './ssml.mjs';

// Most C0 controls mean nothing to a speech model; each becomes a space so every position keeps its
// meaning (as in the SSML).
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/;

// Characters ElevenLabs bills: every character of the text sent, counted in code points.
export const plainBillable = (s) => [...String(s ?? '')].length;

export function buildPlain(text, { lexicon = {} } = {}) {
  const plain = String(text ?? '');
  const spans = lexiconSpans(plain, lexicon);
  const lo = [], hi = [], aliases = [];
  let request = '';
  for (let i = 0, si = 0; i < plain.length;) {
    const sp = spans[si];
    if (sp && i === sp.start) {
      const a = String(sp.alias).replace(new RegExp(CONTROL.source, 'g'), ' ');
      aliases.push({ start: request.length, end: request.length + a.length, term: sp.term, alias: a, span: sp });
      request += a;
      for (let k = 0; k < a.length; k++) { lo.push(sp.start); hi.push(sp.end); }
      i = sp.end; si++;
      continue;
    }
    request += CONTROL.test(plain[i]) ? ' ' : plain[i];
    lo.push(i); hi.push(i + 1);
    i++;
  }
  return {
    request, text: plain, spans, aliases,
    used: Object.fromEntries(spans.map((x) => [x.term, x.alias])),
    billable: plainBillable(request),
    // Request offset → the first spoken character it stands for, or -1 outside the request.
    toPlain: (off) => (Number.isInteger(off) && off >= 0 && off < lo.length ? lo[off] : -1),
    // Request range [a, b) → spoken range [start, end), or null when it covers no character.
    plainRange(a, b) {
      let s = -1, e = -1;
      for (let k = Math.max(0, a); k < Math.min(b, lo.length); k++) { if (s < 0 || lo[k] < s) s = lo[k]; if (hi[k] > e) e = hi[k]; }
      return s < 0 ? null : [s, e];
    },
  };
}
