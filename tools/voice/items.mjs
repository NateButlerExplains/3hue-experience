// What AiVRIC says, and how (O10). Every spoken line in content/tour.json, resolved against
// content/experience.json exactly as the runtime resolves it (js/tourtext.js), plus the voice
// settings from guide.voice with their defaults.
//
// Spoken lines: every node line (kind "tour"), Ask's own lines such as ask.intro (kind "ask") and
// every answer line under ask.questions (kind "faq"). Summary lines are not spoken; they fill the
// mailto body. A line using `@` (the door whose scene is up) is rendered once per door, keyed
// <id>--<door>; line ids never contain "--", so the keys cannot collide. A line with a runtime
// token ({answer:…}, {chapters:visited}) cannot be rendered ahead of time and runs captions-only.
import { resolveLine, fillTemplate, templateTokens, hashLine } from '../../js/tourtext.js';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const AT = /(^|[.:])@(\.|$)/;

export const DEFAULTS = {
  provider: 'azure', name: 'en-US-AvaNeural', locale: 'en-US', rate: 0, required: true,
  say: {},
  loudness: { I: -18, TP: -1.5, LRA: 11 },
  mp3: { sampleRate: 24000, bitrate: 48, channels: 1 },
  budget: { fileKB: 240, totalMB: 16, warnMB: 12, warnChars: 300, maxChars: 550 },
};

export function voiceSettings(m) {
  const v = isObj(m?.guide?.voice) ? m.guide.voice : {};
  return {
    provider: v.provider || DEFAULTS.provider,
    voice: v.name || DEFAULTS.name,
    locale: v.locale || DEFAULTS.locale,
    rate: Number(v.rate) || 0,
    required: typeof v.required === 'boolean' ? v.required : DEFAULTS.required,
    lexicon: isObj(v.say) ? v.say : {},
    loudness: { ...DEFAULTS.loudness, ...(isObj(v.loudness) ? v.loudness : {}) },
    mp3: { ...DEFAULTS.mp3, ...(isObj(v.mp3) ? v.mp3 : {}) },
    budget: { ...DEFAULTS.budget, ...(isObj(v.budget) ? v.budget : {}) },
  };
}

const lineTemplates = (line) => [line.text, line.say].filter((s) => typeof s === 'string');
export const usesDoor = (line) => (typeof line.ref === 'string' && AT.test(line.ref)) || lineTemplates(line).some((s) => templateTokens(s).some((t) => t.arg && AT.test(t.arg)));
export const usesRuntime = (line) => lineTemplates(line).some((s) => templateTokens(s).some((t) => t.runtime));

// Every spoken line in a tour file with where it sits: [{kind, where, line}].
export function spokenLines(t) {
  const out = [];
  for (const [id, n] of Object.entries(isObj(t?.nodes) ? t.nodes : {})) {
    (Array.isArray(n?.lines) ? n.lines : []).forEach((line, i) => out.push({ kind: 'tour', where: `nodes.${id}.lines[${i}]`, line }));
  }
  const ask = isObj(t?.ask) ? t.ask : {};
  for (const [k, v] of Object.entries(ask)) {
    if (k === 'questions') continue;
    if (isObj(v) && typeof v.id === 'string') out.push({ kind: 'ask', where: `ask.${k}`, line: v });
  }
  (Array.isArray(ask.questions) ? ask.questions : []).forEach((q, i) => {
    (Array.isArray(q?.lines) ? q.lines : []).forEach((line, j) => out.push({ kind: 'faq', where: `ask.questions[${i}].lines[${j}]`, line }));
  });
  return out;
}

// → {items: [{key, id, door, kind, where, text, say, spoken, lineHash}], skipped, problems}
//   text     the caption, as shown (and as js/tourtext.js resolveLine gives it)
//   say      the filled `say`, or '' when the line has none
//   spoken   what the voice reads: say || text, NFC
//   lineHash hashLine(text, say): what js/voice.js compares to spot a stale line
export async function voiceItems(t, m) {
  const doors = (Array.isArray(m?.doors) ? m.doors : []).map((d) => d.id);
  const items = [], skipped = [], problems = [];
  const seen = new Map();
  for (const { kind, where, line } of spokenLines(t)) {
    if (!isObj(line) || typeof line.id !== 'string' || !line.id) { problems.push({ where, message: 'a spoken line needs an id' }); continue; }
    if (usesRuntime(line)) { skipped.push({ id: line.id, kind, where, reason: 'a runtime token ({answer:…} or {chapters:visited}) cannot be rendered ahead of time' }); continue; }
    for (const ctx of usesDoor(line) ? doors.map((door) => ({ door })) : [{}]) {
      const key = ctx.door ? `${line.id}--${ctx.door}` : line.id;
      const r = resolveLine(line, m, ctx);
      if (!r || !String(r.text).trim()) { problems.push({ where, key, message: `does not resolve${ctx.door ? ` for door ${ctx.door}` : ''}` }); continue; }
      if (seen.has(key)) { problems.push({ where, key, message: `voice key ${key} is also used at ${seen.get(key)}` }); continue; }
      seen.set(key, where);
      const say = typeof line.say === 'string' ? fillTemplate(line.say, m, ctx) : '';
      items.push({
        key, id: line.id, door: ctx.door ?? null, kind, where,
        text: r.text, say, spoken: (say || r.text).normalize('NFC'),
        lineHash: await hashLine(r.text, say),
      });
    }
  }
  return { items, skipped, problems };
}
