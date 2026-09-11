// Voice files for the tour specs (T-14, T-15, T-22, T-23), written at test time into a served,
// git-ignored folder (tests/results/voice/<name>/) and loaded with ?voice-base=. They are made from
// the tour script and the manifest exactly as tools/voice/items.mjs lists the voiced lines, so the
// hashes js/voice.js checks always match the copy under test; only the audio is stand-in:
//   timing   one word every 0.3 s from the caption's own tokens, each with its character range;
//   audio    none (?voice=sim plays the timings on a clock), or, for the keys in `mp3`, the real
//            one-second MP3 tests/fixtures/voice/one-second.mp3 (made with ffmpeg: 24 kHz mono
//            48 kbps silence, the published format) with its words spread over that second.
// With two guides (O12) the manifest is v2 and every file sits in its guide's folder
// (<guide>/<id>.json, keys "<guide>/<id>"), as tools/voice/build.mjs writes them; a single-guide
// manifest gives v1 and flat keys.
// Options turn keys into the failures the player must survive: `drop` (no manifest entry),
// `badHash` (the script changed after the render), `noJson` (a 404 for the timing file), `staleText`
// (a timing file for other words) and `noMp3` (a 404 for the audio). Each takes full keys
// ("avi/wt-3") or bare line keys ("wt-3", "lens-1--win-trust"), which match that line in every
// guide's voice.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, manifest } from './helpers.mjs';
import { voiceItems, guideVoices } from '../tools/voice/items.mjs';
import { tokens } from '../js/tourtext.js';

export const STEP = 0.3;
export const MP3 = 'tests/fixtures/voice/one-second.mp3';
const r3 = (n) => Math.round(n * 1000) / 1000;

export function timingFor(text, { duration = null } = {}) {
  const toks = tokens(text);
  const n = Math.max(1, toks.length);
  const step = duration ? (duration - 0.1) / n : STEP;
  const words = toks.map((t, i) => [r3(0.05 + i * step), r3(step * 0.8), t.word || t.text, t.start, t.end]);
  return { words, duration: duration ?? r3(0.05 + n * step + 0.1) };
}

// The manifest in the single-guide shape the voice was first built for (O10): no guide.guides, one
// voice in guide.voice (Azure Ava by default). The specs that hold the Azure adapter and the v1
// voice manifest to their contract use it.
export function singleGuide(m = manifest, { name = 'Avi', provider = 'azure', voice = 'en-US-AvaNeural' } = {}) {
  const x = structuredClone(m);
  const { guides, lead, ...rest } = x.guide;
  x.guide = { ...rest, name, voice: { ...x.guide.voice, provider, name: voice } };
  return x;
}

// The key a spec names for the lead's voice: "avi/<id>" with guides, "<id>" without.
export const leadKey = (key, m = manifest) => { const { ids, shared } = guideVoices(m); return ids.length ? `${shared.guide}/${key}` : key; };

// → {base (for ?voice-base=), dir, items: {key: entry}, lines: [{key, id, guide, door, text}]}
export async function buildVoice(name, { tour, m = manifest, drop = [], badHash = [], noJson = [], staleText = [], mp3 = [], noMp3 = [] } = {}) {
  const base = `tests/results/voice/${name.replace(/[^\w-]+/g, '-')}/`;
  const dir = path.join(ROOT, base);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { items } = await voiceItems(tour, m);
  const { ids, byGuide, shared } = guideVoices(m);
  const bare = (key) => key.replace(/^[a-z0-9-]+\//, '');
  const has = (list, it) => list.includes(it.key) || list.includes(bare(it.key));
  const out = ids.length
    ? { v: 2, guides: Object.fromEntries(ids.map((g) => [g, { name: byGuide[g].guideName, provider: byGuide[g].provider, voice: byGuide[g].voice, model: byGuide[g].model }])), locale: shared.locale, items: {} }
    : { v: 1, provider: 'azure', voice: 'en-US-AvaNeural', locale: 'en-US', rate: 0, items: {} };
  const lines = [];
  for (const it of items) {
    if (has(drop, it)) continue;
    const hash = crypto.createHash('sha256').update(`${it.key}\n${it.lineHash}`).digest('hex').slice(0, 12);
    const real = has(mp3, it);
    const t = timingFor(it.text, real ? { duration: 1 } : {});
    out.items[it.key] = { kind: it.kind, line: it.id, ...(it.guide ? { guide: it.guide } : {}), ...(it.door ? { door: it.door } : {}), hash, lineHash: has(badHash, it) ? '0'.repeat(16) : it.lineHash, duration: t.duration, chars: it.text.length };
    fs.mkdirSync(path.dirname(path.join(dir, `${it.key}.json`)), { recursive: true });
    if (!has(noJson, it)) fs.writeFileSync(path.join(dir, `${it.key}.json`), JSON.stringify({ v: 1, id: it.key, hash, voice: it.guide ? byGuide[it.guide].voice : out.voice, text: has(staleText, it) ? `${it.text} Again.` : it.text, duration: t.duration, words: t.words }));
    if (real && !has(noMp3, it)) fs.copyFileSync(path.join(ROOT, MP3), path.join(dir, `${it.key}.mp3`));
    lines.push({ key: it.key, id: it.id, guide: it.guide, door: it.door, text: it.text, duration: t.duration, words: t.words.length });
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(out));
  return { base, dir, items: out.items, lines };
}

// Requests under a voice folder, as paths inside it with their query ("avi/arrive-1.json?h=…",
// "manifest.json"); tour-min.json and the like are not voice.
export const voiceFiles = (urls, base) => urls.filter((u) => new URL(u).pathname.includes(`/${base}`)).map((u) => { const x = new URL(u); return x.pathname.slice(x.pathname.indexOf(`/${base}`) + base.length + 1) + x.search; });
