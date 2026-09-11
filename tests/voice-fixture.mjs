// Voice files for the tour specs (T-14, T-15, T-22, T-23), written at test time into a served,
// git-ignored folder (tests/results/voice/<name>/) and loaded with ?voice-base=. They are made from
// the tour script and the manifest exactly as tools/voice/items.mjs lists the voiced lines, so the
// hashes js/voice.js checks always match the copy under test; only the audio is stand-in:
//   timing   one word every 0.3 s from the caption's own tokens, each with its character range;
//   audio    none (?voice=sim plays the timings on a clock), or, for the keys in `mp3`, the real
//            one-second MP3 tests/fixtures/voice/one-second.mp3 (made with ffmpeg: 24 kHz mono
//            48 kbps silence, the published format) with its words spread over that second.
// Options turn single keys into the failures the player must survive: `drop` (no manifest entry),
// `badHash` (the script changed after the render), `noJson` (a 404 for the timing file), `staleText`
// (a timing file for other words) and `noMp3` (a 404 for the audio).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, manifest } from './helpers.mjs';
import { voiceItems } from '../tools/voice/items.mjs';
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

// → {base (for ?voice-base=), dir, items: {key: entry}, lines: [{key, id, door, text}]}
export async function buildVoice(name, { tour, m = manifest, drop = [], badHash = [], noJson = [], staleText = [], mp3 = [], noMp3 = [] } = {}) {
  const base = `tests/results/voice/${name.replace(/[^\w-]+/g, '-')}/`;
  const dir = path.join(ROOT, base);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { items } = await voiceItems(tour, m);
  const out = { v: 1, provider: 'azure', voice: 'en-US-AvaNeural', locale: 'en-US', rate: 0, items: {} };
  const lines = [];
  for (const it of items) {
    if (drop.includes(it.key)) continue;
    const hash = crypto.createHash('sha256').update(`${it.key}\n${it.lineHash}`).digest('hex').slice(0, 12);
    const real = mp3.includes(it.key);
    const t = timingFor(it.text, real ? { duration: 1 } : {});
    out.items[it.key] = { kind: it.kind, line: it.id, ...(it.door ? { door: it.door } : {}), hash, lineHash: badHash.includes(it.key) ? '0'.repeat(16) : it.lineHash, duration: t.duration, chars: it.text.length };
    if (!noJson.includes(it.key)) fs.writeFileSync(path.join(dir, `${it.key}.json`), JSON.stringify({ v: 1, id: it.key, hash, voice: out.voice, text: staleText.includes(it.key) ? `${it.text} Again.` : it.text, duration: t.duration, words: t.words }));
    if (real && !noMp3.includes(it.key)) fs.copyFileSync(path.join(ROOT, MP3), path.join(dir, `${it.key}.mp3`));
    lines.push({ key: it.key, id: it.id, door: it.door, text: it.text, duration: t.duration, words: t.words.length });
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(out));
  return { base, dir, items: out.items, lines };
}

// Requests under a voice folder, by file name (tour-min.json and the like are not voice).
export const voiceFiles = (urls, base) => urls.filter((u) => new URL(u).pathname.includes(`/${base}`)).map((u) => { const x = new URL(u); return x.pathname.split('/').pop() + x.search; });
