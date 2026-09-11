#!/usr/bin/env node
// Render AiVRIC's voice (O10): every spoken line in content/tour.json → media/voice/<key>.mp3, a
// word-timing file media/voice/<key>.json, and media/voice/manifest.json. docs/VOICE.md has the
// formats, the credentials and the runtime contract.
//
//   node tools/voice/build.mjs --check      credentials, ffmpeg and the SDK; then one short live test
//   node tools/voice/build.mjs --dry-run    no key, no network: what would render, and what it costs
//   node tools/voice/build.mjs              render what changed (needs the key only if anything does)
//
//   --only <keys>     comma-separated voice keys or line ids     --kind tour|ask|faq
//   --force           re-request every line from the service      --reencode   re-encode from the local cache only
//   --rate <n>        requests started per minute (default 18)    --concurrency <n>  lines in flight (default 2)
//   --no-prune        keep files whose line no longer exists      --report     write art/voice-report.html
//   --json            the dry-run plan as JSON                    --price <usd>  per 1M characters (default 15, S0)
//   --manifest <f>  --tour <f>  --out <dir>  --cache <dir>        other inputs and outputs (tests use these)
//
// Exit codes: 0 done; 1 a line failed or a tool is missing; 2 over budget; 3 missing credentials;
// 64 bad arguments.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { voiceItems, voiceSettings } from './items.mjs';
import { buildSsml, timingJson, round3 } from './ssml.mjs';
import { speechHash, audioHash } from './hash.mjs';
import { loadCredentials, missingMessage, describe, redact } from './env.mjs';
import { ffmpeg, ffprobe, toolVersion, processAudio, wavInfo } from './audio.mjs';
import { synthesize, withRetries, pacer, loadSdk } from './azure.mjs';
import { writeReport } from './report.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PRICE_PER_MILLION = 15;       // USD per 1M characters, standard neural voices, pay as you go (S0)
export const F0_FREE_CHARS = 500_000;      // characters a month on the free tier
export const CHARS_PER_SECOND = 14;        // measured on the owner's Ava lines (12,479 characters, 59 lines)
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const kb = (b) => Math.round(b / 100) / 10;
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const usd = (x) => (x < 0.01 && x > 0 ? '<$0.01' : `$${x.toFixed(2)}`);

class Usage extends Error {}

export function parseArgs(argv) {
  const o = { mode: 'render', only: null, kind: null, rate: 18, concurrency: 2, prune: true, report: false, json: false, force: false, reencode: false, manifest: 'content/experience.json', tour: null, out: null, cache: 'art/voice-cache', price: PRICE_PER_MILLION };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { const v = argv[++i]; if (v == null || v.startsWith('--')) throw new Usage(`${a} needs a value`); return v; };
    const pos = (v) => { const x = Number(v); if (!(x > 0)) throw new Usage(`${a} needs a positive number`); return x; };
    switch (a) {
      case '--check': o.mode = 'check'; break;
      case '--dry-run': o.mode = 'dry'; break;
      case '--force': o.force = true; break;
      case '--reencode': o.reencode = true; break;
      case '--only': o.only = new Set(val().split(',').map((s) => s.trim()).filter(Boolean)); break;
      case '--kind': o.kind = val(); if (!['tour', 'ask', 'faq'].includes(o.kind)) throw new Usage('--kind is tour, ask or faq'); break;
      case '--rate': o.rate = pos(val()); break;
      case '--concurrency': o.concurrency = Math.floor(pos(val())); break;
      case '--no-prune': o.prune = false; break;
      case '--report': o.report = true; break;
      case '--json': o.json = true; break;
      case '--manifest': o.manifest = val(); break;
      case '--tour': o.tour = val(); break;
      case '--out': o.out = val(); break;
      case '--cache': o.cache = val(); break;
      case '--price': o.price = pos(val()); break;
      case '-h': case '--help': o.mode = 'help'; break;
      default: throw new Usage(`unknown option ${a}`);
    }
  }
  if (o.force && o.reencode) throw new Usage('--force asks the service again; --reencode never does. Pick one.');
  return o;
}

// The SSML, hashes and billable characters of one item (the SSML map stays off the enumerable
// fields so items print cleanly).
export function prepare(item, s) {
  const built = buildSsml(item.spoken, { voice: s.voice, locale: s.locale, rate: s.rate, lexicon: s.lexicon });
  Object.defineProperty(item, 'built', { value: built, enumerable: false, configurable: true });
  item.ssml = built.ssml;
  item.billable = built.billable;
  item.chars = [...item.spoken].length;
  item.speechHash = speechHash({ provider: s.provider, voice: s.voice, locale: s.locale, rate: s.rate, lexicon: s.lexicon, text: item.spoken });
  item.hash = audioHash(item.speechHash, s);
  return item;
}

// Manifest, tour file, settings and every voiced item, resolved and hashed.
export async function loadScript({ manifest = 'content/experience.json', tour = null, out = null, cache = 'art/voice-cache', root = ROOT } = {}) {
  const m = readJson(path.resolve(root, manifest));
  const tourFile = tour || m.tour?.manifest;
  if (!tourFile) throw new Error(`${manifest} names no tour file (tour.manifest)`);
  const t = readJson(path.resolve(root, tourFile));
  const settings = voiceSettings(m);
  const { items, skipped, problems } = await voiceItems(t, m);
  for (const it of items) prepare(it, settings);
  return {
    m, t, settings, items, skipped, problems, manifestFile: manifest, tourFile,
    voiceDir: path.resolve(root, out || m.tour?.voiceBase || 'media/voice/'),
    cacheDir: path.resolve(root, cache),
  };
}

export function readVoiceManifest(voiceDir) {
  try { return readJson(path.join(voiceDir, 'manifest.json')); } catch { return null; }
}
function voiceFiles(voiceDir) {
  const out = new Map();
  let names = [];
  try { names = fs.readdirSync(voiceDir); } catch { return out; }
  for (const f of names) {
    const x = f.match(/^(.+)\.(mp3|json)$/);
    if (!x || f === 'manifest.json') continue;
    const e = out.get(x[1]) || {};
    e[x[2]] = true;
    out.set(x[1], e);
  }
  return out;
}

// Each item's state against what is on disk:
//   up-to-date        rendered with this text and these settings, both files present
//   new               never rendered
//   changed-text      the line's words (text or say) changed
//   changed-settings  same words, different voice, rate, pronunciation or encoding
//   missing-file      listed as current, but its .mp3 or .json is gone
//   forced            up to date, re-rendered because of --force
// `api` says whether the service is needed: not when the raw audio for this exact request is in
// the local cache (then it is re-encoded only), always under --force.
export function planBuild({ items, voiceDir, cacheDir, force = false }) {
  const vm = readVoiceManifest(voiceDir);
  const old = vm?.items || {};
  const disk = voiceFiles(voiceDir);
  const rows = items.map((it) => {
    const prev = old[it.key];
    const files = disk.get(it.key) || {};
    let status = !prev ? 'new' : prev.hash === it.hash ? (files.mp3 && files.json ? 'up-to-date' : 'missing-file') : prev.lineHash !== it.lineHash ? 'changed-text' : 'changed-settings';
    if (force && status === 'up-to-date') status = 'forced';
    const work = status !== 'up-to-date';
    const cached = fs.existsSync(path.join(cacheDir, `${it.speechHash}.wav`)) && fs.existsSync(path.join(cacheDir, `${it.speechHash}.events.json`));
    const api = work && (force || !cached);
    return { key: it.key, id: it.id, kind: it.kind, status, work, api, cached, chars: it.chars, billable: api ? it.billable : 0, bytes: status === 'up-to-date' ? prev.bytes : null, item: it };
  });
  const keys = new Set(items.map((i) => i.key));
  const orphans = [...new Set([...Object.keys(old), ...disk.keys()])].filter((k) => !keys.has(k)).sort();
  return { rows, orphans, voiceManifest: vm };
}

export function estimate(chars, s, price = PRICE_PER_MILLION) {
  const seconds = chars / CHARS_PER_SECOND;
  return { chars, usd: (chars / 1e6) * price, seconds, bytes: (seconds * s.mp3.bitrate * 1000) / 8, f0: chars / F0_FREE_CHARS };
}

// Size and length limits over the whole set once rendered: rendered files count at their real
// size, the rest at the estimate. Sizes are decimal (1 KB = 1000 bytes).
export function budgetCheck(rows, s) {
  const b = s.budget, errors = [], warnings = [];
  let total = 0, largest = { key: null, bytes: 0 };
  for (const r of rows) {
    const bytes = r.bytes ?? estimate(r.chars, s).bytes;
    total += bytes;
    if (bytes > largest.bytes) largest = { key: r.key, bytes };
    if (r.chars > b.maxChars) errors.push(`${r.key}: ${r.chars} characters; split lines over ${b.maxChars} (about 40 s of speech)`);
    else if (r.chars > b.warnChars) warnings.push(`${r.key}: ${r.chars} characters; a caption over ${b.warnChars} is hard to read along with`);
    if (bytes > b.fileKB * 1000) errors.push(`${r.key}: about ${kb(bytes)} KB, over the ${b.fileKB} KB limit for one file`);
  }
  if (total > b.totalMB * 1e6) errors.push(`about ${(total / 1e6).toFixed(1)} MB in all, over the ${b.totalMB} MB limit (drop the bitrate to 40 kbps before cutting lines)`);
  else if (total > b.warnMB * 1e6) warnings.push(`about ${(total / 1e6).toFixed(1)} MB in all, past the ${b.warnMB} MB warning line`);
  return { ok: !errors.length, errors, warnings, total, largest };
}

function filterRows(rows, o) {
  let out = rows;
  if (o.only) {
    const known = new Set(rows.flatMap((r) => [r.key, r.id]));
    const unknown = [...o.only].filter((x) => !known.has(x));
    if (unknown.length) throw new Usage(`--only: no voiced line ${unknown.join(', ')}`);
    out = out.filter((r) => o.only.has(r.key) || o.only.has(r.id));
  }
  if (o.kind) out = out.filter((r) => r.kind === o.kind);
  return out;
}

// ---- --dry-run ----
export async function dryRun(o, ctx = null) {
  ctx ||= await loadScript(o);
  const plan = planBuild({ items: ctx.items, voiceDir: ctx.voiceDir, cacheDir: ctx.cacheDir, force: o.force });
  const scoped = filterRows(plan.rows, o).filter((r) => r.work);
  const count = (st) => plan.rows.filter((r) => r.status === st).length;
  const billable = scoped.reduce((a, r) => a + r.billable, 0);
  const full = plan.rows.reduce((a, r) => a + r.item.billable, 0);
  const budget = budgetCheck(plan.rows, ctx.settings);
  return {
    ctx, plan, scoped, budget,
    summary: {
      items: plan.rows.length,
      status: Object.fromEntries(['up-to-date', 'new', 'changed-text', 'changed-settings', 'missing-file', 'forced'].map((s) => [s, count(s)])),
      orphans: plan.orphans, captionsOnly: ctx.skipped.map((s) => s.id),
      render: { items: scoped.length, requests: scoped.filter((r) => r.api).length, reencodes: scoped.filter((r) => !r.api).length, ...estimate(billable, ctx.settings, o.price), spokenChars: scoped.reduce((a, r) => a + r.chars, 0) },
      full: { ...estimate(full, ctx.settings, o.price), spokenChars: plan.rows.reduce((a, r) => a + r.chars, 0) },
      budget: { ok: budget.ok, errors: budget.errors, warnings: budget.warnings, totalBytes: Math.round(budget.total), largest: budget.largest },
    },
  };
}

function printDry(res, o, log) {
  const { ctx, plan, summary: s } = res;
  const st = ctx.settings;
  const rel = (p) => path.relative(ROOT, p) || '.';
  log('Voice dry run: no key, no network.');
  log(`  script   ${ctx.tourFile} against ${ctx.manifestFile}: ${ctx.items.length} voice files from ${new Set(ctx.items.map((i) => i.id)).size} spoken lines`);
  log(`  voice    ${st.provider} ${st.voice} (${st.locale}, rate ${st.rate >= 0 ? '+' : ''}${st.rate}%); MP3 ${st.mp3.sampleRate / 1000} kHz ${st.mp3.channels === 1 ? 'mono' : `${st.mp3.channels} ch`} ${st.mp3.bitrate} kbps; loudness ${st.loudness.I} LUFS, true peak ${st.loudness.TP} dBTP`);
  log(`  output   ${rel(ctx.voiceDir)}/${plan.voiceManifest ? '' : ' (no manifest.json yet)'}; audio required: ${st.required ? 'yes' : 'no (guide.voice.required is false)'}`);
  log('');
  const w = Math.max(20, ...plan.rows.map((r) => r.key.length));
  for (const r of plan.rows) log(`  ${r.status.padEnd(16)} ${r.key.padEnd(w)} ${String(r.chars).padStart(4)} chars${r.work ? (r.api ? `  ${r.billable} billable` : '  re-encode from cache') : ''}`);
  for (const k of plan.orphans) log(`  ${'orphan'.padEnd(16)} ${k.padEnd(w)} (no such line; removed on the next render unless --no-prune)`);
  for (const x of ctx.skipped) log(`  ${'captions-only'.padEnd(16)} ${x.id.padEnd(w)} ${x.reason}`);
  for (const x of ctx.problems) log(`  ${'error'.padEnd(16)} ${(x.key || x.where).padEnd(w)} ${x.message}`);
  log('');
  const counts = Object.entries(s.status).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(', ') || 'none';
  log(`${s.items} voice files: ${counts}. ${s.orphans.length} orphan${s.orphans.length === 1 ? '' : 's'}. ${s.captionsOnly.length} captions-only.`);
  const R = s.render;
  const pl = (x, one, many = `${one}s`) => `${x} ${x === 1 ? one : many}`;
  log(`To render${o.only || o.kind ? ' (filtered)' : ''}: ${pl(R.items, 'file')}, ${pl(R.requests, 'request')} to the speech service, ${n0(R.chars)} billable characters, about ${usd(R.usd)} on S0 ($${o.price} per 1M characters); on F0, ${(R.f0 * 100).toFixed(1)}% of the ${n0(F0_FREE_CHARS)} free characters a month.${R.reencodes ? ` ${pl(R.reencodes, 'file re-encodes', 'files re-encode')} from the local cache at no cost.` : ''}`);
  const F = s.full;
  log(`Full render of every line: ${n0(F.chars)} billable characters, about ${usd(F.usd)}; about ${(estimate(F.spokenChars, st).seconds / 60).toFixed(1)} min and ${(s.budget.totalBytes / 1e6).toFixed(2)} MB of audio (estimated at ${CHARS_PER_SECOND} characters a second, ${st.mp3.bitrate} kbps); largest file about ${kb(s.budget.largest.bytes)} KB.`);
  for (const x of s.budget.warnings) log(`  budget warning: ${x}`);
  for (const x of s.budget.errors) log(`  over budget: ${x}`);
  log(`Budget: ${s.budget.ok ? 'OK' : 'OVER'} (each file up to ${st.budget.fileKB} KB and ${st.budget.maxChars} characters, ${st.budget.totalMB} MB in all).`);
}

// ---- --check ----
async function check(o, log) {
  const creds = loadCredentials();
  log('Voice check');
  for (const l of describe(creds)) log(`  ${l}`);
  const ff = await toolVersion(ffmpeg()), fp = await toolVersion(ffprobe());
  log(`  ffmpeg: ${ff ? `${ff} (${ffmpeg()})` : 'not found; install it or set FFMPEG'}`);
  log(`  ffprobe: ${fp ? `${fp.split(' Copyright')[0]} (${ffprobe()})` : 'not found; install it or set FFPROBE'}`);
  let sdk = null;
  try { await loadSdk(); sdk = readJson(path.join(ROOT, 'node_modules/microsoft-cognitiveservices-speech-sdk/package.json')).version; } catch { /* reported below */ }
  log(`  speech SDK: ${sdk ? `microsoft-cognitiveservices-speech-sdk ${sdk}` : 'not installed; run npm install'}`);
  const problems = [];
  if (creds.missing.length) problems.push(missingMessage(creds));
  if (!ff || !fp) problems.push('ffmpeg and ffprobe are needed to encode and check the audio.');
  if (!sdk) problems.push('The speech SDK is a devDependency: run npm install.');
  if (problems.length) {
    for (const p of problems) console.error(p);
    return creds.missing.length ? 3 : 1;
  }
  const ctx = await loadScript(o);
  const st = ctx.settings;
  const built = buildSsml('Test.', { voice: st.voice, locale: st.locale, rate: st.rate, lexicon: st.lexicon });
  let res;
  try { res = await synthesize({ ssml: built.ssml, key: creds.key, region: creds.region }); } catch (e) {
    console.error(`  speech service: failed. ${redact(e.message, [creds.key])}`);
    return 1;
  }
  const info = wavInfo(res.audio);
  const words = res.events.filter((e) => e.type === 'WordBoundary');
  const lastEnd = Math.max(0, ...words.map((e) => (e.offset + e.duration) / 1e7));
  const findings = [];
  if (!info) findings.push('no WAV audio came back');
  else {
    if (info.sampleRate !== 24000 || info.channels !== 1 || info.bitsPerSample !== 16) findings.push(`audio is ${info.sampleRate} Hz, ${info.channels} ch, ${info.bitsPerSample}-bit, not 24 kHz 16-bit mono`);
    if (!words.length) findings.push('no word events came back');
    else if (!(lastEnd > 0 && lastEnd <= info.duration + 0.05)) findings.push(`the last word ends at ${round3(lastEnd)} s in a ${round3(info.duration)} s file, so offsets are not 100 ns ticks`);
  }
  fs.mkdirSync(ctx.cacheDir, { recursive: true });
  fs.writeFileSync(path.join(ctx.cacheDir, 'check-events.json'), `${JSON.stringify({ ssml: built.ssml, durationTicks: res.durationTicks, wav: info, events: res.events }, null, 1)}\n`);
  if (findings.length) { for (const f of findings) console.error(`  speech service: ${f}`); return 1; }
  log(`  speech service: OK. "Test." came back as ${round3(info.duration)} s of 24 kHz 16-bit mono WAV with ${words.length} word event${words.length === 1 ? '' : 's'} (last word ends at ${round3(lastEnd)} s; offsets are 100 ns ticks). Raw events: ${path.relative(ROOT, path.join(ctx.cacheDir, 'check-events.json'))}`);
  return 0;
}

// ---- render ----
function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}
async function pool(list, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) await fn(list[i++]); }));
}
const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined && o[k] !== null).map((k) => [k, o[k]]));

export function writeVoiceManifest(voiceDir, s, items) {
  const keys = Object.keys(items).sort();
  const sum = (f) => keys.reduce((a, k) => a + (Number(items[k][f]) || 0), 0);
  const head = {
    v: 1, provider: s.provider, voice: s.voice, locale: s.locale, rate: s.rate,
    format: { codec: 'mp3', sampleRate: s.mp3.sampleRate, bitrate: s.mp3.bitrate, channels: s.mp3.channels },
    loudness: { I: s.loudness.I, TP: s.loudness.TP, LRA: s.loudness.LRA },
    totals: { items: keys.length, bytes: sum('bytes'), seconds: round3(sum('duration')), chars: sum('chars') },
  };
  // One item per line, so a re-render shows up in a diff as the lines that changed.
  const lines = Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  const body = keys.map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(sortKeys(items[k]))}`).join(',\n');
  writeAtomic(path.join(voiceDir, 'manifest.json'), `{\n${lines.join(',\n')},\n  "items": {${keys.length ? `\n${body}\n  ` : ''}}\n}\n`);
}

export async function render(o, deps = {}) {
  const log = deps.log || console.log, err = deps.err || console.error;
  const synth = deps.synthesize || synthesize;
  const ctx = deps.ctx || await loadScript(o);
  const st = ctx.settings;
  if (ctx.problems.length) { for (const x of ctx.problems) err(`error: ${x.key || x.where}: ${x.message}`); return 1; }
  const plan = planBuild({ items: ctx.items, voiceDir: ctx.voiceDir, cacheDir: ctx.cacheDir, force: o.force });
  const rows = filterRows(plan.rows, o).filter((r) => r.work);
  const budget = budgetCheck(plan.rows, st);
  const tooLong = budget.errors.filter((e) => /characters; split/.test(e));
  if (tooLong.length) { for (const e of tooLong) err(`over budget: ${e}`); return 2; }
  if (o.reencode) {
    const need = rows.filter((r) => r.api);
    if (need.length) { err(`No cached raw audio for ${need.map((r) => r.key).join(', ')}; run without --reencode to request it.`); return 1; }
  }
  let creds = null;
  if (rows.some((r) => r.api)) {
    creds = deps.credentials || loadCredentials();
    if (creds.missing.length) { err(missingMessage(creds)); return 3; }
  }
  if (rows.length && !((await toolVersion(ffmpeg())) && (await toolVersion(ffprobe())))) { err('ffmpeg and ffprobe are needed; install ffmpeg, or set FFMPEG and FFPROBE.'); return 1; }
  fs.mkdirSync(ctx.voiceDir, { recursive: true });
  fs.mkdirSync(path.join(ctx.cacheDir, 'tmp'), { recursive: true });

  const wait = deps.pace || pacer(o.rate);
  const done = new Map(), failures = [];
  let requests = 0, billed = 0;
  log(rows.length ? `Rendering ${rows.length} of ${ctx.items.length} voice files (${rows.filter((r) => r.api).length} requests to the speech service).` : `All ${ctx.items.length} voice files are up to date.`);
  await pool(rows, o.concurrency, async (row) => {
    const it = row.item;
    const wavFile = path.join(ctx.cacheDir, `${it.speechHash}.wav`), evFile = path.join(ctx.cacheDir, `${it.speechHash}.events.json`);
    const tmp = path.join(ctx.cacheDir, 'tmp', `${it.key}.${process.pid}.mp3`);
    try {
      if (row.api) {
        await wait();
        const res = await withRetries(() => synth({ ssml: it.ssml, key: creds.key, region: creds.region }), { onRetry: (e, n, ms) => log(`  retry ${n} for ${it.key} in ${(ms / 1000).toFixed(1)} s (${e.code})`) });
        requests++; billed += it.billable;
        if (!wavInfo(res.audio)) throw new Error('the speech service returned no WAV audio');
        writeAtomic(wavFile, res.audio);
        writeAtomic(evFile, `${JSON.stringify({ v: 1, key: it.key, voice: st.voice, ssml: it.ssml, durationTicks: res.durationTicks ?? null, events: res.events }, null, 1)}\n`);
      }
      const { events } = readJson(evFile);
      const audio = await processAudio({ wavFile, outFile: tmp, loudness: st.loudness, mp3: st.mp3 });
      if (audio.problems.length) throw new Error(audio.problems.join('; '));
      if (audio.bytes > st.budget.fileKB * 1000) throw new Error(`${kb(audio.bytes)} KB, over the ${st.budget.fileKB} KB limit for one file; split the line`);
      const { json, coverage } = timingJson({ id: it.key, hash: it.hash, voice: st.voice, text: it.text, built: it.built, events, duration: audio.duration });
      const end = Math.max(0, ...json.words.map((x) => x[0] + x[1]));
      if (end > json.duration + 0.05) throw new Error(`the last word ends at ${round3(end)} s, after the audio (${json.duration} s)`);
      fs.renameSync(tmp, path.join(ctx.voiceDir, `${it.key}.mp3`));
      writeAtomic(path.join(ctx.voiceDir, `${it.key}.json`), `${JSON.stringify(json)}\n`);
      done.set(it.key, { kind: it.kind, line: it.id, door: it.door, hash: it.hash, lineHash: it.lineHash, chars: it.chars, duration: json.duration, bytes: audio.bytes, lufs: audio.lufs, tp: audio.tp });
      log(`  ${row.api ? 'rendered' : 're-encoded'} ${it.key}: ${json.duration.toFixed(1)} s, ${kb(audio.bytes)} KB, ${audio.lufs} LUFS, ${audio.tp} dBTP, ${Math.round(coverage * 100)}% of words timed${audio.warnings.length ? ` (warning: ${audio.warnings.join('; ')})` : ''}`);
    } catch (e) {
      fs.rmSync(tmp, { force: true });
      const msg = redact(e?.message || String(e), [creds?.key]);
      failures.push({ key: it.key, message: msg });
      err(`  failed ${it.key}: ${msg}`);
    }
  });

  const old = plan.voiceManifest?.items || {};
  const next = {};
  const present = (k) => fs.existsSync(path.join(ctx.voiceDir, `${k}.mp3`)) && fs.existsSync(path.join(ctx.voiceDir, `${k}.json`));
  for (const it of ctx.items) {
    if (done.has(it.key)) next[it.key] = done.get(it.key);
    else if (old[it.key] && present(it.key)) next[it.key] = old[it.key];
  }
  for (const k of plan.orphans) {
    if (o.prune) { for (const ext of ['mp3', 'json']) fs.rmSync(path.join(ctx.voiceDir, `${k}.${ext}`), { force: true }); log(`  removed orphan ${k}`); }
    else if (old[k] && present(k)) next[k] = old[k];
  }
  if (rows.length || plan.orphans.length || !plan.voiceManifest) writeVoiceManifest(ctx.voiceDir, st, next);
  if (o.report) log(`  report: ${path.relative(ROOT, writeReport({ file: path.join(ROOT, 'art', 'voice-report.html'), items: ctx.items, skipped: ctx.skipped, settings: st, voiceDir: ctx.voiceDir, voiceManifest: readVoiceManifest(ctx.voiceDir) }))}`);
  log(`Done: ${done.size} written, ${failures.length} failed; ${requests} requests, ${n0(billed)} billable characters (about ${usd((billed / 1e6) * o.price)}).`);
  return failures.length ? 1 : 0;
}

const HELP = (() => {
  const lines = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1);
  return lines.slice(0, lines.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
})();

export async function main(argv, { log = console.log } = {}) {
  let o;
  try { o = parseArgs(argv); } catch (e) { if (e instanceof Usage) { console.error(`${e.message}\n\n${HELP}`); return 64; } throw e; }
  if (o.mode === 'help') { log(HELP); return 0; }
  try {
    if (o.mode === 'check') return await check(o, log);
    if (o.mode === 'dry') {
      const res = await dryRun(o);
      if (o.json) log(JSON.stringify({ ...res.summary, rows: res.plan.rows.map(({ item, ...r }) => ({ ...r, hash: item.hash, lineHash: item.lineHash })) }, null, 1));
      else printDry(res, o, log);
      if (o.report) writeReport({ file: path.join(ROOT, 'art', 'voice-report.html'), items: res.ctx.items, skipped: res.ctx.skipped, settings: res.ctx.settings, voiceDir: res.ctx.voiceDir, voiceManifest: res.plan.voiceManifest });
      return res.ctx.problems.length ? 1 : res.budget.ok ? 0 : 2;
    }
    return await render(o, { log });
  } catch (e) {
    if (e instanceof Usage) { console.error(e.message); return 64; }
    console.error(`voice build failed: ${redact(e?.message || String(e), [loadCredentials().key])}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const code = await main(process.argv.slice(2));
  process.exitCode = code;
  setTimeout(() => process.exit(code), 500).unref();   // in case the SDK leaves a socket open
}
