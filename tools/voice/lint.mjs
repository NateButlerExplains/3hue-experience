#!/usr/bin/env node
// The voice lint (O10, O13): does media/voice/ match the script? Offline, no key, no ffmpeg (unless
// --deep). Part of `npm run lint`.
//
//   node tools/voice/lint.mjs [--manifest content/experience.json] [--tour <file>] [--voice-dir <dir>] [--deep]
//
// Missing audio and stale audio (the words or voice settings changed since the render) both mean
// the line runs captions-only. While guide.voice.required is false (drafting) they are warnings;
// once it is true they fail. Broken files fail either way: a manifest.json that disagrees with the
// files, a timing file of the wrong shape or with words out of order or outside the text or the
// audio, fewer than 90% of words timed, an MP3 that is not mono at the configured sample rate and
// bitrate, a file or a guide's total over budget, loudness off target (lines of 3 s or more).
// With two guides (manifest v2, media/voice/<guide>/<id>.*) it also warns when the guides' median
// loudness is more than 1 LU apart, so the hand-off does not jump in level. --deep re-measures
// loudness with ffmpeg. Exits 1 on any error.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScript, readVoiceManifest, listVoiceFiles, estimate, ROOT } from './build.mjs';
import { parseMp3, measureLoudness } from './audio.mjs';
import { creditsFor } from './elevenlabs.mjs';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const MIN_COVERAGE = 0.9;
const MAX_LU_APART = 1;
const rel = (p) => path.relative(ROOT, p) || '.';
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

// The guides' median loudness (lines of 3 s or more when a guide has any, since a word or two is
// not a stable measure) → a warning when they are more than 1 LU apart, else null.
export function loudnessSpread(entries) {
  const by = new Map();
  for (const [key, e] of entries) {
    const g = e?.guide ?? (key.includes('/') ? key.split('/')[0] : null);
    if (!g || !Number.isFinite(e?.lufs)) continue;
    if (!by.has(g)) by.set(g, []);
    by.get(g).push(e);
  }
  if (by.size < 2) return null;
  const med = [...by].map(([g, es]) => { const long = es.filter((e) => e.duration >= 3); return [g, median((long.length ? long : es).map((e) => e.lufs))]; });
  const vals = med.map(([, v]) => v);
  const apart = Math.max(...vals) - Math.min(...vals);
  return apart > MAX_LU_APART ? `the guides' median loudness is ${Math.round(apart * 10) / 10} LU apart (${med.map(([g, v]) => `${g} ${Math.round(v * 10) / 10} LUFS`).join(', ')}; at most ${MAX_LU_APART} LU), so the voice jumps in level at a hand-off; re-render the louder or quieter guide` : null;
}

// Problems with one timing file, [] when it is sound. `text` is the caption it must carry.
export function checkTiming(json, { key, text = null } = {}) {
  const e = [];
  if (!isObj(json)) return ['not a JSON object'];
  if (json.v !== 1) e.push('v must be 1');
  for (const k of ['id', 'hash', 'voice', 'text']) if (typeof json[k] !== 'string' || !json[k]) e.push(`${k} must be a non-empty string`);
  if (key && json.id !== key) e.push(`id is ${JSON.stringify(json.id)}, not ${key}`);
  if (!(typeof json.duration === 'number' && json.duration > 0)) e.push('duration must be a positive number of seconds');
  if (text != null && json.text !== text) e.push('text differs from the caption the script shows');
  if (!Array.isArray(json.words)) { e.push('words must be a list'); return e; }
  const T = typeof json.text === 'string' ? json.text : '';
  let prev = -Infinity, placed = 0, late = null;
  const bad = [];
  json.words.forEach((w, i) => {
    if (!Array.isArray(w) || w.length !== 5) { bad.push(`words[${i}] must be [start, duration, word, charStart, charEnd]`); return; }
    const [s, d, word, cs, ce] = w;
    if (!(Number.isFinite(s) && s >= 0 && Number.isFinite(d) && d >= 0)) bad.push(`words[${i}]: start and duration must be seconds, 0 or more`);
    if (typeof word !== 'string') bad.push(`words[${i}]: the spoken word must be a string`);
    if (s < prev) bad.push(`words[${i}] starts at ${s} s, before the word ahead of it (${prev} s)`);
    prev = Math.max(prev, s);
    if (cs === null && ce === null) { /* spoken but not placed on the caption */ }
    else if (!Number.isInteger(cs) || !Number.isInteger(ce) || cs < 0 || ce <= cs || ce > T.length) bad.push(`words[${i}]: [${cs}, ${ce}) is not a range in the text`);
    else placed++;
    if (late == null && s + d > json.duration + 0.05) late = `words[${i}] ends at ${Math.round((s + d) * 1000) / 1000} s, after the audio (${json.duration} s)`;
  });
  e.push(...bad.slice(0, 4));
  if (bad.length > 4) e.push(`and ${bad.length - 4} more word problems`);
  if (late) e.push(late);
  if (/[\p{L}\p{N}]/u.test(T)) {
    if (!json.words.length) e.push('no word timings');
    else if (placed / json.words.length < MIN_COVERAGE) e.push(`${placed} of ${json.words.length} words placed on the caption; at least ${MIN_COVERAGE * 100}% needed`);
  }
  return e;
}

export async function lintVoice({ manifest = 'content/experience.json', tour = null, voiceDir = null, deep = false } = {}) {
  const errors = [], warnings = [];
  const ctx = await loadScript({ manifest, tour, out: voiceDir });
  const st = ctx.settings, dir = ctx.voiceDir, where = `${rel(dir)}/`;
  const gap = (msg) => (st.required ? errors : warnings).push(`${msg}${st.required ? '' : ' (guide.voice.required is false)'}`);
  const counts = { expected: ctx.items.length, current: 0, stale: 0, missing: 0, orphans: 0 };
  const shape = ctx.guideIds.length ? 2 : 1;

  for (const p of ctx.problems) errors.push(`${ctx.tourFile}: ${p.where}: ${p.message}`);
  for (const s of ctx.skipped) warnings.push(`${ctx.tourFile}: ${s.where}: ${s.id} runs captions-only: ${s.reason}`);
  for (const it of ctx.items) {
    if (it.chars > st.budget.maxChars) errors.push(`${it.key}: ${it.chars} characters; split lines over ${st.budget.maxChars} (about 40 s of speech)`);
    else if (it.chars > st.budget.warnChars) warnings.push(`${it.key}: ${it.chars} characters; a caption over ${st.budget.warnChars} is hard to read along with`);
  }

  const onDisk = new Set(listVoiceFiles(dir).keys());
  const vm = readVoiceManifest(dir);
  if (!vm) {
    if (fs.existsSync(path.join(dir, 'manifest.json'))) errors.push(`${where}manifest.json is not valid JSON`);
    else {
      if (onDisk.size) errors.push(`${where} has ${onDisk.size} voice files but no manifest.json; run node tools/voice/build.mjs`);
      const chars = ctx.items.reduce((a, i) => a + i.billable, 0);
      const az = ctx.items.filter((i) => i.provider === 'azure').reduce((a, i) => a + i.billable, 0);
      const el = ctx.items.filter((i) => i.provider !== 'azure').reduce((a, i) => a + creditsFor(i.billable, i.settings.model), 0);
      const cost = [az ? `about $${estimate(az, st).usd.toFixed(2)}` : null, el ? `${el.toLocaleString('en-US')} ElevenLabs credits` : null].filter(Boolean).join(' and ') || 'nothing to bill';
      gap(`no ${where}manifest.json yet, so all ${ctx.items.length} voice files run captions-only (a full render is ${chars.toLocaleString('en-US')} billable characters, ${cost})`);
      counts.missing = ctx.items.length;
    }
    return { errors, warnings, counts, ctx };
  }

  if (![1, 2].includes(vm.v) || !isObj(vm.items)) { errors.push(`${where}manifest.json: v must be 1 or 2 and items an object`); return { errors, warnings, counts, ctx }; }
  if (vm.v === 2 && !isObj(vm.guides)) errors.push(`${where}manifest.json: v2 needs a guides map`);
  if (vm.v !== shape) {
    // Written for the other shape (one voice, or two guides): nothing in it can match the script.
    gap(`${where}manifest.json is v${vm.v} (${vm.v === 2 ? 'per-guide folders' : 'one voice'}), but the script is voiced ${shape === 2 ? `by ${ctx.guideIds.join(' and ')}` : 'by one guide'}; every line runs captions-only until a render writes v${shape}`);
    counts.missing = ctx.items.length;
    return { errors, warnings, counts, ctx };
  }
  const fmt = isObj(vm.format) ? vm.format : { sampleRate: st.mp3.sampleRate, bitrate: st.mp3.bitrate, channels: st.mp3.channels };
  const keys = Object.keys(vm.items).sort();
  const sum = (f, ks) => ks.reduce((a, k) => a + (Number(vm.items[k]?.[f]) || 0), 0);
  const adds = (x, ks) => isObj(x) && x.items === ks.length && x.bytes === sum('bytes', ks) && x.chars === sum('chars', ks) && Math.abs((x.seconds ?? -1) - sum('duration', ks)) <= 0.01;
  const t = vm.totals || {};
  if (!adds(t, keys) || (vm.v === 2 && Object.entries(t.guides || {}).some(([g, x]) => !adds(x, keys.filter((k) => vm.items[k]?.guide === g))))) errors.push(`${where}manifest.json: totals do not add up to its items; re-run node tools/voice/build.mjs`);

  const current = new Set(ctx.items.map((i) => i.key));
  const totals = new Map();
  for (const it of ctx.items) {
    const entry = vm.items[it.key];
    const mp3 = path.join(dir, `${it.key}.mp3`), jf = path.join(dir, `${it.key}.json`);
    if (!entry) { counts.missing++; gap(`${it.key} (${it.where}) has no audio yet; it runs captions-only`); continue; }
    const have = [fs.existsSync(mp3), fs.existsSync(jf)];
    if (!have[0] || !have[1]) { counts.missing++; errors.push(`${it.key}: manifest.json lists it but ${!have[0] ? `${it.key}.mp3` : `${it.key}.json`} is missing`); continue; }
    if (vm.v === 2 && entry.guide !== it.guide) errors.push(`${it.key}: manifest.json files it under guide ${JSON.stringify(entry.guide ?? null)}, not ${it.guide}`);
    const fresh = entry.hash === it.hash;
    if (fresh) counts.current++;
    else { counts.stale++; gap(`${it.key} (${it.where}) is stale: its ${entry.lineHash !== it.lineHash ? 'words' : 'voice or encoding settings'} changed since the render; it runs captions-only until re-rendered`); }

    let json = null;
    try { json = JSON.parse(fs.readFileSync(jf, 'utf8')); } catch { errors.push(`${it.key}.json is not valid JSON`); }
    if (json) {
      for (const p of checkTiming(json, { key: it.key, text: fresh ? it.text : null })) errors.push(`${it.key}.json: ${p}`);
      if (json.hash !== entry.hash) errors.push(`${it.key}.json has hash ${json.hash}, manifest.json has ${entry.hash}`);
    }
    const buf = fs.readFileSync(mp3);
    totals.set(it.guide, (totals.get(it.guide) || 0) + buf.length);
    if (buf.length !== entry.bytes) errors.push(`${it.key}.mp3 is ${buf.length} bytes, manifest.json says ${entry.bytes}`);
    if (buf.length > st.budget.fileKB * 1000) errors.push(`${it.key}.mp3 is ${Math.round(buf.length / 100) / 10} KB, over the ${st.budget.fileKB} KB limit for one file`);
    const info = parseMp3(buf);
    if (!info) errors.push(`${it.key}.mp3 is not a readable MP3`);
    else {
      const got = [];
      if (info.layer !== 3) got.push(`layer ${info.layer}`);
      if (info.sampleRate !== fmt.sampleRate) got.push(`${info.sampleRate} Hz`);
      if (info.channels !== fmt.channels) got.push(`${info.channels} channels`);
      if (info.bitrate !== fmt.bitrate || !info.cbr) got.push(`${info.bitrate} kbps${info.cbr ? '' : ' variable'}`);
      if (got.length) errors.push(`${it.key}.mp3 is ${got.join(', ')}; expected MP3 layer III, ${fmt.sampleRate} Hz, ${fmt.channels === 1 ? 'mono' : `${fmt.channels} channels`}, a constant ${fmt.bitrate} kbps`);
      if (json && typeof json.duration === 'number' && Math.abs(info.duration - json.duration) > 0.05) errors.push(`${it.key}: the MP3 plays for ${Math.round(info.duration * 1000) / 1000} s, the timing file says ${json.duration} s`);
    }
    const off = [];
    if (!(Math.abs(entry.lufs - st.loudness.I) <= 1)) off.push(`${entry.lufs} LUFS (target ${st.loudness.I} ±1)`);
    if (!(entry.tp <= st.loudness.TP + 0.5)) off.push(`true peak ${entry.tp} dBTP (at most ${st.loudness.TP + 0.5})`);
    if (off.length) (entry.duration >= 3 ? errors : warnings).push(`${it.key}: loudness ${off.join(', ')}`);
    if (deep) {
      const L = await measureLoudness(mp3, st.loudness);
      if (Math.abs(L.I - entry.lufs) > 0.5 || Math.abs(L.TP - entry.tp) > 0.5) errors.push(`${it.key}.mp3 measures ${L.I.toFixed(1)} LUFS, ${L.TP.toFixed(1)} dBTP; manifest.json records ${entry.lufs}, ${entry.tp}`);
    }
  }
  const orphans = [...new Set([...keys, ...onDisk])].filter((k) => !current.has(k)).sort();
  counts.orphans = orphans.length;
  for (const k of orphans) gap(`${where}${k} belongs to no line in the script; the next render removes it`);
  for (const k of onDisk) if (current.has(k) && !vm.items[k]) gap(`${where}${k} is on disk but not in manifest.json`);
  // The size budget holds per guide: each guide's folder is one voice's worth of the tour.
  for (const [g, total] of totals) {
    const w = g ? `${where}${g}/` : where;
    if (total > st.budget.totalMB * 1e6) errors.push(`${w}: ${(total / 1e6).toFixed(1)} MB of audio, over the ${st.budget.totalMB} MB limit${g ? ' for one guide' : ''}`);
    else if (total > st.budget.warnMB * 1e6) warnings.push(`${w}: ${(total / 1e6).toFixed(1)} MB of audio, past the ${st.budget.warnMB} MB warning line`);
  }
  const spread = loudnessSpread(Object.entries(vm.items).filter(([k]) => current.has(k)));
  if (spread) warnings.push(`${where}: ${spread}`);
  return { errors, warnings, counts, ctx };
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--manifest') o.manifest = argv[++i];
    else if (a === '--tour') o.tour = argv[++i];
    else if (a === '--voice-dir') o.voiceDir = argv[++i];
    else if (a === '--deep') o.deep = true;
    else throw new Error(`unknown option ${a}`);
  }
  return o;
}

async function main(argv) {
  let o;
  try { o = parseArgs(argv); } catch (e) { console.error(e.message); return 64; }
  const { errors, warnings, counts, ctx } = await lintVoice(o);
  for (const w of warnings) console.warn('warn: voice:', w);
  for (const e of errors) console.error('error: voice:', e);
  console.log(`${rel(ctx.voiceDir)}/: ${errors.length} errors, ${warnings.length} warnings; ${counts.expected} voice files in ${ctx.tourFile}, ${counts.current} current, ${counts.stale} stale, ${counts.missing} missing, ${counts.orphans} orphans`);
  return errors.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
