// What the guides say, and how (O10, O12, O13). Every spoken line in content/tour.json, resolved
// against content/experience.json exactly as the runtime resolves it (js/tourtext.js), once per
// guide who can say it, plus each guide's voice settings with their defaults.
//
// Spoken lines: every node line (kind "tour"), Ask's own lines such as ask.intro (kind "ask") and
// every answer line under ask.questions (kind "faq"). Summary lines are not spoken; they fill the
// mailto body.
//
// Two guides (O12). A node line pinned with `who` is said by that guide only and keyed
// <who>/<id>; every other node line, ask.intro and every Ask answer is said by whoever leads, so it
// is rendered in every guide's voice, keyed <guide>/<id> (the files are media/voice/<guide>/<id>.mp3).
// Each is resolved with ctx.guide set, so {guide} names the guide saying it. A manifest without
// guide.guides is the single-guide shape: keys are <id> as before.
//
// A line using `@` (the door whose scene is up) is rendered once per door, keyed <id>--<door> (under
// the guide's folder when there are guides); line ids never contain "--", so keys cannot collide. A
// line with a runtime token ({answer:…}, {chapters:visited}) cannot be rendered ahead of time and
// runs captions-only.
import { resolveLine, fillTemplate, templateTokens, hashLine, guideIds } from '../../js/tourtext.js';
import { RAW_FORMAT } from './hash.mjs';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const AT = /(^|[.:])@(\.|$)/;

export const DEFAULTS = {
  provider: 'azure', name: 'en-US-AvaNeural', locale: 'en-US', rate: 0, required: true,
  say: {},
  loudness: { I: -18, TP: -1.5, LRA: 11 },
  mp3: { sampleRate: 24000, bitrate: 48, channels: 1 },
  // credits: the ElevenLabs plan's characters a month (Starter, 40,000, as --check read it on
  // 2026-09-11; Creator is 100,000), which the dry run prices a render against.
  budget: { fileKB: 240, totalMB: 16, warnMB: 12, warnChars: 300, maxChars: 550, credits: 40_000 },
};
// ElevenLabs (O13): the model when a guide names none, and the raw format asked for.
export const ELEVEN_DEFAULTS = { model: 'eleven_multilingual_v2', format: 'pcm_24000' };

// One guide's settings: its voice (guide.guides.<id>.voice: provider, name, model, settings, seed,
// format, normalization) over what both share (guide.voice: locale, rate, required, say, loudness,
// mp3, budget). No id, or a single-guide manifest: the lead's voice, or guide.voice itself.
export function voiceSettings(m, id = null) {
  const gd = isObj(m?.guide) ? m.guide : {};
  const v = isObj(gd.voice) ? gd.voice : {};
  const gs = isObj(gd.guides) && Object.keys(gd.guides).length ? gd.guides : null;
  const gid = gs ? (id && isObj(gs[id]) ? id : isObj(gs[gd.lead]) ? gd.lead : Object.keys(gs)[0]) : null;
  const one = gid ? (isObj(gs[gid].voice) ? gs[gid].voice : {}) : v;
  const provider = one.provider || DEFAULTS.provider;
  const azure = provider === 'azure';
  return {
    guide: gid, guideName: gid ? gs[gid].name ?? gid : (typeof gd.name === 'string' ? gd.name : null),
    provider,
    voice: one.name || (azure ? DEFAULTS.name : null),
    model: azure ? null : one.model || ELEVEN_DEFAULTS.model,
    voiceSettings: !azure && isObj(one.settings) ? one.settings : null,
    seed: !azure && Number.isInteger(one.seed) ? one.seed : null,
    format: azure ? RAW_FORMAT : one.format || v.format || ELEVEN_DEFAULTS.format,
    normalization: !azure && typeof one.normalization === 'string' ? one.normalization : null,
    locale: v.locale || DEFAULTS.locale,
    rate: Number(v.rate) || 0,
    required: typeof v.required === 'boolean' ? v.required : DEFAULTS.required,
    lexicon: isObj(v.say) ? v.say : {},
    loudness: { ...DEFAULTS.loudness, ...(isObj(v.loudness) ? v.loudness : {}) },
    mp3: { ...DEFAULTS.mp3, ...(isObj(v.mp3) ? v.mp3 : {}) },
    budget: { ...DEFAULTS.budget, ...(isObj(v.budget) ? v.budget : {}) },
  };
}

// Every guide's settings: {ids ([] for a single-guide manifest), byGuide: {id: settings}, shared}.
export function guideVoices(m) {
  const ids = guideIds(m);
  return { ids, byGuide: Object.fromEntries(ids.map((id) => [id, voiceSettings(m, id)])), shared: voiceSettings(m) };
}

const lineTemplates = (line) => [line.text, line.say].filter((s) => typeof s === 'string');
export const usesDoor = (line) => (typeof line.ref === 'string' && AT.test(line.ref)) || lineTemplates(line).some((s) => templateTokens(s).some((t) => t.arg && AT.test(t.arg)));
export const usesRuntime = (line) => lineTemplates(line).some((s) => templateTokens(s).some((t) => t.runtime));

// The voice key for a line, a guide (null: single-guide) and a door (null: none).
export const voiceKey = (id, guide = null, door = null) => `${guide ? `${guide}/` : ''}${id}${door ? `--${door}` : ''}`;

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

// → {items: [{key, id, guide, who, door, kind, where, text, say, spoken, lineHash}], skipped, problems}
//   guide    the guide saying it (null in the single-guide shape)
//   who      the guide a node line is pinned to, or null (said by the lead, so rendered by each)
//   text     the caption, as shown (and as js/tourtext.js resolveLine gives it for that guide)
//   say      the filled `say`, or '' when the line has none
//   spoken   what the voice reads: say || text, NFC
//   lineHash hashLine(text, say): what js/voice.js compares to spot a stale line
export async function voiceItems(t, m) {
  const doors = (Array.isArray(m?.doors) ? m.doors : []).map((d) => d.id);
  const ids = guideIds(m);
  const items = [], skipped = [], problems = [];
  const seen = new Map();
  for (const { kind, where, line } of spokenLines(t)) {
    if (!isObj(line) || typeof line.id !== 'string' || !line.id) { problems.push({ where, message: 'a spoken line needs an id' }); continue; }
    if (usesRuntime(line)) { skipped.push({ id: line.id, kind, where, reason: 'a runtime token ({answer:…} or {chapters:visited}) cannot be rendered ahead of time' }); continue; }
    // Ask speaks in the lead's voice whoever that is, so its lines are never pinned.
    const who = ids.length && kind === 'tour' && typeof line.who === 'string' ? line.who : null;
    if (who && !ids.includes(who)) { problems.push({ where, message: `who is ${JSON.stringify(who)}, not a guide (${ids.join(', ')})` }); continue; }
    for (const guide of ids.length ? (who ? [who] : ids) : [null]) {
      for (const door of usesDoor(line) ? doors : [null]) {
        const ctx = { ...(door ? { door } : {}), ...(guide ? { guide } : {}) };
        const key = voiceKey(line.id, guide, door);
        const r = resolveLine(line, m, ctx);
        if (!r || !String(r.text).trim()) { problems.push({ where, key, message: `does not resolve${door ? ` for door ${door}` : ''}${guide ? ` for ${guide}` : ''}` }); continue; }
        if (seen.has(key)) { problems.push({ where, key, message: `voice key ${key} is also used at ${seen.get(key)}` }); continue; }
        seen.set(key, where);
        const say = typeof line.say === 'string' ? fillTemplate(line.say, m, ctx) : '';
        items.push({
          key, id: line.id, guide, who, door, kind, where,
          text: r.text, say, spoken: (say || r.text).normalize('NFC'),
          lineHash: await hashLine(r.text, say),
        });
      }
    }
  }
  return { items, skipped, problems };
}
