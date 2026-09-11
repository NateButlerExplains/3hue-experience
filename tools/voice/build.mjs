#!/usr/bin/env node
// Render the guides' voices (O10, O12, O13): every spoken line in content/tour.json, in the voice of
// each guide who can say it → media/voice/<guide>/<id>.mp3, a word-timing file
// media/voice/<guide>/<id>.json, and media/voice/manifest.json (v2, with a `guides` map). A manifest
// without guide.guides (the single-guide shape) renders media/voice/<id>.mp3 and a v1 manifest as
// before. docs/VOICE.md has the formats, the credentials, the costs and the runtime contract.
//
//   node tools/voice/build.mjs --check      credentials and ffmpeg; per guide its voice (name, category),
//                                           the plan's characters, and one short live line through the
//                                           whole pipeline (ElevenLabs: its alignment is saved as the
//                                           test fixture tests/fixtures/voice/eleven-alignment.json)
//   node tools/voice/build.mjs --dry-run    no key, no network: what would render, per guide, and what it costs
//   node tools/voice/build.mjs --ab eleven_v3,eleven_multilingual_v2
//                                           the listening test: 5 short lines and the "Avi" strip, each model,
//                                           each guide → art/voice-ab/report.html
//   node tools/voice/build.mjs              render what changed (needs a key only if anything does)
//
//   --only <keys>     comma-separated voice keys or line ids     --kind tour|ask|faq   --guide <ids>
//   --force           re-request every line from the service      --reencode   re-encode from the local cache only
//   --rate <n>        requests started per minute (default 18)    --concurrency <n>  lines in flight (default 2)
//   --no-prune        keep files whose line no longer exists      --report     write art/voice-report.html
//   --json            the dry-run plan as JSON                    --price <usd>  Azure, per 1M characters (default 15, S0)
//   --manifest <f>  --tour <f>  --out <dir>  --cache <dir>        other inputs and outputs (tests use these)
//   --ab-out <dir>  where --ab writes (default art/voice-ab)      --fixture <f>  where --check saves the alignment
//
// Exit codes: 0 done; 1 a line failed or a tool is missing; 2 over budget, or the ElevenLabs quota
// ran out (the run stops there); 3 missing or refused credentials; 64 bad arguments.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { voiceItems, guideVoices } from './items.mjs';
import { timingJson, round3 } from './ssml.mjs';
import { buildPlain } from './plain.mjs';
import { speechHash, audioHash } from './hash.mjs';
import { missingMessage, describe, redact } from './env.mjs';
import { ffmpeg, ffprobe, toolVersion, processAudio, wavInfo } from './audio.mjs';
import { withRetries, pacer, loadSdk } from './azure.mjs';
import { getVoice, getSubscription, alignmentEvents, creditsFor, FATAL } from './elevenlabs.mjs';
import { providerOf } from './providers.mjs';
import { writeReport, writeAbReport } from './report.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PRICE_PER_MILLION = 15;       // USD per 1M characters, Azure standard neural voices, pay as you go (S0)
export const F0_FREE_CHARS = 500_000;      // Azure: characters a month on the free tier
export const CHARS_PER_SECOND = 14;        // measured on the owner's Ava lines (12,479 characters, 59 lines)
export const FIXTURE = 'tests/fixtures/voice/eleven-alignment.json';
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const kb = (b) => Math.round(b / 100) / 10;
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const usd = (x) => (x < 0.01 && x > 0 ? '<$0.01' : `$${x.toFixed(2)}`);
const pct = (x) => `${(x * 100).toFixed(x < 0.001 && x > 0 ? 2 : 1)}%`;
const pl = (x, one, many = `${one}s`) => `${n0(x)} ${x === 1 ? one : many}`;

class Usage extends Error {}

export function parseArgs(argv) {
  const o = { mode: 'render', only: null, kind: null, guides: null, rate: 18, concurrency: 2, prune: true, report: false, json: false, force: false, reencode: false, manifest: 'content/experience.json', tour: null, out: null, cache: 'art/voice-cache', price: PRICE_PER_MILLION, ab: null, abOut: 'art/voice-ab', fixture: FIXTURE };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { const v = argv[++i]; if (v == null || v.startsWith('--')) throw new Usage(`${a} needs a value`); return v; };
    const pos = (v) => { const x = Number(v); if (!(x > 0)) throw new Usage(`${a} needs a positive number`); return x; };
    const list = (v) => v.split(',').map((s) => s.trim()).filter(Boolean);
    switch (a) {
      case '--check': o.mode = 'check'; break;
      case '--dry-run': o.mode = 'dry'; break;
      case '--ab': o.mode = 'ab'; o.ab = list(val()); if (!o.ab.length) throw new Usage('--ab needs one or more models'); break;
      case '--ab-out': o.abOut = val(); break;
      case '--fixture': o.fixture = val(); break;
      case '--force': o.force = true; break;
      case '--reencode': o.reencode = true; break;
      case '--only': o.only = new Set(list(val())); break;
      case '--guide': o.guides = new Set(list(val())); break;
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

// What the hash of a request covers, from one guide's settings (hash.mjs picks the version).
const hashInput = (s, text) => ({ provider: s.provider, voice: s.voice, locale: s.locale, rate: s.rate, lexicon: s.lexicon, model: s.model, settings: s.voiceSettings, seed: s.seed, format: s.format, normalization: s.normalization, text });

// The request, hashes and billable characters of one item for one guide's settings (the built
// request and the settings stay off the enumerable fields so items print cleanly).
export function prepare(item, s) {
  const built = providerOf(s.provider).build(item.spoken, s);
  Object.defineProperty(item, 'built', { value: built, enumerable: false, configurable: true });
  Object.defineProperty(item, 'settings', { value: s, enumerable: false, configurable: true });
  if (s.provider === 'azure') item.ssml = built.ssml; else item.request = built.request;
  item.provider = s.provider;
  item.billable = built.billable;
  item.chars = [...item.spoken].length;
  item.speechHash = speechHash(hashInput(s, item.spoken));
  item.hash = audioHash(item.speechHash, s);
  return item;
}

// Manifest, tour file, settings (shared, and per guide) and every voiced item, resolved and hashed.
export async function loadScript({ manifest = 'content/experience.json', tour = null, out = null, cache = 'art/voice-cache', root = ROOT } = {}) {
  const m = readJson(path.resolve(root, manifest));
  const tourFile = tour || m.tour?.manifest;
  if (!tourFile) throw new Error(`${manifest} names no tour file (tour.manifest)`);
  const t = readJson(path.resolve(root, tourFile));
  const voices = guideVoices(m);
  const { items, skipped, problems } = await voiceItems(t, m);
  for (const it of items) prepare(it, it.guide ? voices.byGuide[it.guide] : voices.shared);
  return {
    m, t, settings: voices.shared, guides: voices.byGuide, guideIds: voices.ids, items, skipped, problems, manifestFile: manifest, tourFile,
    voiceDir: path.resolve(root, out || m.tour?.voiceBase || 'media/voice/'),
    cacheDir: path.resolve(root, cache),
  };
}

// [guide id | null, settings] for every guide (one null entry in the single-guide shape).
const guideList = (ctx) => (ctx.guideIds.length ? ctx.guideIds.map((g) => [g, ctx.guides[g]]) : [[null, ctx.settings]]);

export function readVoiceManifest(voiceDir) {
  try { return readJson(path.join(voiceDir, 'manifest.json')); } catch { return null; }
}
// Voice files on disk by key: <key>.mp3 / <key>.json at the top, and <guide>/<key> one folder down.
export function listVoiceFiles(voiceDir) {
  const out = new Map();
  const walk = (dir, prefix) => {
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const d of ents) {
      if (d.isDirectory()) { if (!prefix && /^[a-z0-9-]+$/.test(d.name)) walk(path.join(dir, d.name), `${d.name}/`); continue; }
      const x = d.name.match(/^(.+)\.(mp3|json)$/);
      if (!x || (!prefix && d.name === 'manifest.json')) continue;
      const e = out.get(prefix + x[1]) || {};
      e[x[2]] = true;
      out.set(prefix + x[1], e);
    }
  };
  walk(voiceDir, '');
  return out;
}

// Each item's state against what is on disk:
//   up-to-date        rendered with this text and these settings, both files present
//   new               never rendered
//   changed-text      the line's words (text or say) changed
//   changed-settings  same words, different voice, model, settings, pronunciation or encoding
//   missing-file      listed as current, but its .mp3 or .json is gone
//   forced            up to date, re-rendered because of --force
// `api` says whether the service is needed: not when the raw audio for this exact request is in
// the local cache (then it is re-encoded only), always under --force.
export function planBuild({ items, voiceDir, cacheDir, force = false }) {
  const vm = readVoiceManifest(voiceDir);
  const old = vm?.items || {};
  const disk = listVoiceFiles(voiceDir);
  const rows = items.map((it) => {
    const prev = old[it.key];
    const files = disk.get(it.key) || {};
    let status = !prev ? 'new' : prev.hash === it.hash ? (files.mp3 && files.json ? 'up-to-date' : 'missing-file') : prev.lineHash !== it.lineHash ? 'changed-text' : 'changed-settings';
    if (force && status === 'up-to-date') status = 'forced';
    const work = status !== 'up-to-date';
    const cached = fs.existsSync(path.join(cacheDir, `${it.speechHash}.wav`)) && fs.existsSync(path.join(cacheDir, `${it.speechHash}.events.json`));
    const api = work && (force || !cached);
    return { key: it.key, id: it.id, guide: it.guide, kind: it.kind, status, work, api, cached, chars: it.chars, billable: api ? it.billable : 0, bytes: status === 'up-to-date' ? prev.bytes : null, item: it };
  });
  const keys = new Set(items.map((i) => i.key));
  const orphans = [...new Set([...Object.keys(old), ...disk.keys()])].filter((k) => !keys.has(k)).sort();
  return { rows, orphans, voiceManifest: vm };
}

export function estimate(chars, s, price = PRICE_PER_MILLION) {
  const seconds = chars / CHARS_PER_SECOND;
  return { chars, usd: (chars / 1e6) * price, seconds, bytes: (seconds * s.mp3.bitrate * 1000) / 8, f0: chars / F0_FREE_CHARS };
}
// ElevenLabs credits for rows (0 for Azure rows, which cost money instead).
const creditsOf = (rows, f = (r) => r.billable) => rows.reduce((a, r) => a + (r.item.settings.provider === 'azure' ? 0 : creditsFor(f(r), r.item.settings.model)), 0);
const azureChars = (rows, f = (r) => r.billable) => rows.reduce((a, r) => a + (r.item.settings.provider === 'azure' ? f(r) : 0), 0);

// Size and length limits over the whole set once rendered: rendered files count at their real
// size, the rest at the estimate. The total is per guide (each guide's folder is one voice's worth).
// Sizes are decimal (1 KB = 1000 bytes).
export function budgetCheck(rows, s) {
  const b = s.budget, errors = [], warnings = [], byGuide = new Map();
  let total = 0, largest = { key: null, bytes: 0 };
  for (const r of rows) {
    const bytes = r.bytes ?? estimate(r.chars, s).bytes;
    const g = r.guide ?? r.item?.guide ?? null;
    total += bytes;
    byGuide.set(g, (byGuide.get(g) || 0) + bytes);
    if (bytes > largest.bytes) largest = { key: r.key, bytes };
    if (r.chars > b.maxChars) errors.push(`${r.key}: ${r.chars} characters; split lines over ${b.maxChars} (about 40 s of speech)`);
    else if (r.chars > b.warnChars) warnings.push(`${r.key}: ${r.chars} characters; a caption over ${b.warnChars} is hard to read along with`);
    if (bytes > b.fileKB * 1000) errors.push(`${r.key}: about ${kb(bytes)} KB, over the ${b.fileKB} KB limit for one file`);
  }
  for (const [g, t] of byGuide) {
    const who = g ? `${g}: ` : '';
    if (t > b.totalMB * 1e6) errors.push(`${who}about ${(t / 1e6).toFixed(1)} MB in all, over the ${b.totalMB} MB limit${g ? ' for one guide' : ''} (drop the bitrate to 40 kbps before cutting lines)`);
    else if (t > b.warnMB * 1e6) warnings.push(`${who}about ${(t / 1e6).toFixed(1)} MB in all, past the ${b.warnMB} MB warning line`);
  }
  return { ok: !errors.length, errors, warnings, total, byGuide: Object.fromEntries(byGuide), largest };
}

function filterRows(rows, o) {
  let out = rows;
  if (o.only) {
    const known = new Set(rows.flatMap((r) => [r.key, r.id]));
    const unknown = [...o.only].filter((x) => !known.has(x));
    if (unknown.length) throw new Usage(`--only: no voiced line ${unknown.join(', ')}`);
    out = out.filter((r) => o.only.has(r.key) || o.only.has(r.id));
  }
  if (o.guides) {
    const known = new Set(rows.map((r) => r.guide).filter(Boolean));
    const unknown = [...o.guides].filter((x) => !known.has(x));
    if (unknown.length) throw new Usage(`--guide: no guide ${unknown.join(', ')}`);
    out = out.filter((r) => o.guides.has(r.guide));
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
  const all = (r) => r.item.billable;
  const budget = budgetCheck(plan.rows, ctx.settings);
  const guides = Object.fromEntries(guideList(ctx).filter(([g]) => g).map(([g, s]) => {
    const mine = plan.rows.filter((r) => r.guide === g), todo = scoped.filter((r) => r.guide === g);
    return [g, {
      provider: s.provider, voice: s.voice, model: s.model, files: mine.length,
      render: { items: todo.length, requests: todo.filter((r) => r.api).length, billable: todo.reduce((a, r) => a + r.billable, 0), credits: creditsOf(todo) },
      full: { billable: mine.reduce((a, r) => a + r.item.billable, 0), credits: creditsOf(mine, all), spokenChars: mine.reduce((a, r) => a + r.chars, 0), bytes: Math.round(budget.byGuide[g] || 0) },
    }];
  }));
  return {
    ctx, plan, scoped, budget,
    summary: {
      items: plan.rows.length,
      status: Object.fromEntries(['up-to-date', 'new', 'changed-text', 'changed-settings', 'missing-file', 'forced'].map((s) => [s, count(s)])),
      orphans: plan.orphans, captionsOnly: ctx.skipped.map((s) => s.id),
      guides,
      render: { items: scoped.length, requests: scoped.filter((r) => r.api).length, reencodes: scoped.filter((r) => !r.api).length, ...estimate(billable, ctx.settings, o.price), usd: (azureChars(scoped) / 1e6) * o.price, credits: creditsOf(scoped), spokenChars: scoped.reduce((a, r) => a + r.chars, 0) },
      full: { ...estimate(full, ctx.settings, o.price), usd: (azureChars(plan.rows, all) / 1e6) * o.price, credits: creditsOf(plan.rows, all), spokenChars: plan.rows.reduce((a, r) => a + r.chars, 0) },
      budget: { ok: budget.ok, errors: budget.errors, warnings: budget.warnings, totalBytes: Math.round(budget.total), byGuide: Object.fromEntries(Object.entries(budget.byGuide).map(([k, v]) => [k, Math.round(v)])), largest: budget.largest },
    },
  };
}

const voiceLine = (s) => (s.provider === 'azure'
  ? `azure ${s.voice} (${s.locale}, rate ${s.rate >= 0 ? '+' : ''}${s.rate}%)`
  : `${s.provider} ${s.voice} on ${s.model}${s.seed != null ? `, seed ${s.seed}` : ''}, ${s.format}`);

function printDry(res, o, log) {
  const { ctx, plan, summary: s } = res;
  const st = ctx.settings;
  const rel = (p) => path.relative(ROOT, p) || '.';
  const list = guideList(ctx);
  const provs = new Set(list.map(([, x]) => x.provider));
  log('Voice dry run: no key, no network.');
  log(`  script   ${ctx.tourFile} against ${ctx.manifestFile}: ${ctx.items.length} voice files from ${new Set(ctx.items.map((i) => i.id)).size} spoken lines${ctx.guideIds.length ? ` in ${ctx.guideIds.length} voices` : ''}`);
  for (const [g, x] of list) log(`  ${(g ? `${g}` : 'voice').padEnd(8)} ${voiceLine(x)}`);
  log(`  encoding MP3 ${st.mp3.sampleRate / 1000} kHz ${st.mp3.channels === 1 ? 'mono' : `${st.mp3.channels} ch`} ${st.mp3.bitrate} kbps; loudness ${st.loudness.I} LUFS, true peak ${st.loudness.TP} dBTP`);
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
  for (const [g, x] of Object.entries(s.guides)) {
    log(`  ${g.padEnd(8)} ${pl(x.files, 'file')}; to render ${pl(x.render.items, 'file')}, ${n0(x.render.billable)} billable characters${x.provider === 'azure' ? '' : ` = ${n0(x.render.credits)} credits`}; full render ${n0(x.full.billable)} characters${x.provider === 'azure' ? '' : ` = ${n0(x.full.credits)} credits`}, about ${(x.full.spokenChars / CHARS_PER_SECOND / 60).toFixed(1)} min and ${(x.full.bytes / 1e6).toFixed(2)} MB`);
  }
  const R = s.render, F = s.full;
  const cost = (X) => [
    provs.has('azure') ? `about ${usd(X.usd)} on S0 ($${o.price} per 1M characters); on F0, ${(((X.usd / o.price) * 1e6) / F0_FREE_CHARS * 100).toFixed(1)}% of the ${n0(F0_FREE_CHARS)} free characters a month` : null,
    [...provs].some((p) => p !== 'azure') ? `${n0(X.credits)} ElevenLabs credits (${pct(X.credits / st.budget.credits)} of the plan's ${n0(st.budget.credits)} a month)` : null,
  ].filter(Boolean).join('; ');
  log(`To render${o.only || o.kind || o.guides ? ' (filtered)' : ''}: ${pl(R.items, 'file')}, ${pl(R.requests, 'request')} to the speech service, ${n0(R.chars)} billable characters, ${cost(R)}.${R.reencodes ? ` ${pl(R.reencodes, 'file re-encodes', 'files re-encode')} from the local cache at no cost.` : ''}`);
  log(`Full render of every line: ${n0(F.chars)} billable characters, ${cost(F)}; about ${(estimate(F.spokenChars, st).seconds / 60).toFixed(1)} min and ${(s.budget.totalBytes / 1e6).toFixed(2)} MB of audio (estimated at ${CHARS_PER_SECOND} characters a second, ${st.mp3.bitrate} kbps); largest file about ${kb(s.budget.largest.bytes)} KB.`);
  if (R.credits > st.budget.credits) log(`  budget warning: this render needs ${n0(R.credits)} ElevenLabs credits, more than the plan's ${n0(st.budget.credits)} a month (guide.voice.budget.credits); render one guide at a time (--guide) or raise the plan first`);
  for (const x of s.budget.warnings) log(`  budget warning: ${x}`);
  for (const x of s.budget.errors) log(`  over budget: ${x}`);
  log(`Budget: ${s.budget.ok ? 'OK' : 'OVER'} (each file up to ${st.budget.fileKB} KB and ${st.budget.maxChars} characters, ${st.budget.totalMB} MB in all${ctx.guideIds.length ? ' per guide' : ''}).`);
}

// ---- credentials, per provider ----
// deps.credentials: one object for every provider (the specs), or {provider: object}.
function credsFor(provider, deps = {}) {
  const d = deps.credentials;
  if (d && Array.isArray(d.missing)) return d;
  if (d && d[provider]) return d[provider];
  return providerOf(provider).credentials({ ...(deps.env ? { env: deps.env } : {}), ...(deps.envFile ? { file: deps.envFile } : {}) });
}
const exitFor = (e) => (e?.code === 'QuotaExceeded' ? 2 : e?.code === 'AuthenticationFailure' || e?.code === 'PermissionDenied' ? 3 : 1);

// The plan's character count lags a request by some seconds: read it until it has moved by what
// was sent, or has moved and then held still for one reading (the account may bill less than the
// price list), or the tries run out. → the last reading.
async function usageAfter(key, before, sent, deps = {}) {
  const sleep = deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  let s = null, last = null;
  for (let i = 0; i < (deps.usageTries ?? 8); i++) {
    if (i) await sleep(2500);
    s = await getSubscription({ key, fetchImpl: deps.fetchImpl });
    if (!s.ok) break;
    const moved = s.used - before.used;
    if (moved >= sent || (moved > 0 && s.used === last)) break;
    last = s.used;
  }
  return s;
}

// Arrays of numbers and strings on one line, everything else indented: a fixture that diffs well.
function compactJson(v, ind = '') {
  if (Array.isArray(v) && v.every((x) => x === null || typeof x !== 'object')) return JSON.stringify(v);
  if (Array.isArray(v)) return v.length ? `[\n${v.map((x) => `${ind} ${compactJson(x, `${ind} `)}`).join(',\n')}\n${ind}]` : '[]';
  if (v && typeof v === 'object') { const e = Object.entries(v).filter(([, x]) => x !== undefined); return e.length ? `{\n${e.map(([k, x]) => `${ind} ${JSON.stringify(k)}: ${compactJson(x, `${ind} `)}`).join(',\n')}\n${ind}}` : '{}'; }
  return JSON.stringify(v);
}

// The short line --check says for each guide: the guide's own name and three of the terms the
// pronunciation list replaces, so the saved alignment exercises the alias map.
export const CHECK_LINE = "I'm {guide}. 3HUE runs on AiVRIC, and SOC 2 starts here.";

// ---- --check ----
export async function check(o, log = console.log, deps = {}) {
  const err = deps.err || console.error;
  const ctx = deps.ctx || await loadScript(o);
  const list = guideList(ctx);
  const provs = [...new Set(list.map(([, s]) => s.provider))];
  log('Voice check');
  for (const [g, s] of list) log(`  ${g ? `${g}: ` : ''}${voiceLine(s)}`);
  const creds = Object.fromEntries(provs.map((p) => [p, credsFor(p, deps)]));
  for (const p of provs) for (const l of describe(creds[p])) log(`  ${l}`);
  const ff = await toolVersion(ffmpeg()), fp = await toolVersion(ffprobe());
  log(`  ffmpeg: ${ff ? `${ff} (${ffmpeg()})` : 'not found; install it or set FFMPEG'}`);
  log(`  ffprobe: ${fp ? `${fp.split(' Copyright')[0]} (${ffprobe()})` : 'not found; install it or set FFPROBE'}`);
  let sdk = null;
  if (provs.includes('azure')) {
    try { await loadSdk(); sdk = readJson(path.join(ROOT, 'node_modules/microsoft-cognitiveservices-speech-sdk/package.json')).version; } catch { /* reported below */ }
    log(`  speech SDK: ${sdk ? `microsoft-cognitiveservices-speech-sdk ${sdk}` : 'not installed; run npm install'}`);
  }
  const problems = [];
  const missing = provs.filter((p) => creds[p].missing.length);
  for (const p of missing) problems.push(missingMessage(creds[p]));
  if (!ff || !fp) problems.push('ffmpeg and ffprobe are needed to encode and check the audio.');
  if (provs.includes('azure') && !sdk) problems.push('The speech SDK is a devDependency: run npm install.');
  if (problems.length) { for (const p of problems) err(p); return missing.length ? 3 : 1; }
  const secrets = provs.map((p) => creds[p].key);
  fs.mkdirSync(path.join(ctx.cacheDir, 'tmp'), { recursive: true });
  const cases = [], findings = [];
  let sub0 = null;
  try {
    if (provs.includes('elevenlabs')) {
      sub0 = await getSubscription({ key: creds.elevenlabs.key, fetchImpl: deps.fetchImpl });
      log(sub0.ok ? `  ElevenLabs plan: ${sub0.tier ?? 'unknown tier'}${sub0.status ? ` (${sub0.status})` : ''}, ${n0(sub0.used)} of ${n0(sub0.limit)} characters used this period${sub0.resetsAt ? `, resets ${sub0.resetsAt}` : ''}` : `  ElevenLabs plan: not read; ${sub0.message}`);
    }
    for (const [g, s] of list) {
      const who = g || 'voice';
      if (s.provider === 'elevenlabs') {
        const v = await getVoice(s.voice, { key: creds.elevenlabs.key, fetchImpl: deps.fetchImpl });
        log(v.ok ? `  ${who}: voice "${v.name}" (${v.id}), category ${v.category ?? 'unknown'}` : `  ${who}: voice ${s.voice}: not read; ${v.message}`);
        if (!v.ok && v.permitted) findings.push(`${who}: ${v.message}`);
      }
      const caption = CHECK_LINE.replace('{guide}', s.guideName || 'your guide');
      const item = { key: `check-${who}`, text: caption, spoken: caption, built: providerOf(s.provider).build(caption, s) };
      const res = await withRetries(() => providerOf(s.provider).synthesize({ item, s, creds: creds[s.provider], deps, tmpDir: path.join(ctx.cacheDir, 'tmp') }), { onRetry: (e, n, ms) => log(`  retry ${n} for ${who} in ${(ms / 1000).toFixed(1)} s (${e.code})`) });
      const info = wavInfo(res.audio);
      const words = res.events.filter((e) => e.type === 'WordBoundary');
      const lastEnd = Math.max(0, ...words.map((e) => (e.offset + e.duration) / 1e7));
      const bad = [];
      if (!info) bad.push('no WAV audio came back');
      else {
        if (info.sampleRate !== 24000 || info.channels !== 1 || info.bitsPerSample !== 16) bad.push(`audio is ${info.sampleRate} Hz, ${info.channels} ch, ${info.bitsPerSample}-bit, not 24 kHz 16-bit mono`);
        if (!words.length) bad.push('no word events came back');
        else if (!(lastEnd > 0 && lastEnd <= info.duration + 0.05)) bad.push(`the last word ends at ${round3(lastEnd)} s in a ${round3(info.duration)} s file, so the times are not seconds from the start`);
      }
      const wav = path.join(ctx.cacheDir, `check-${who}.wav`);
      if (info) fs.writeFileSync(wav, res.audio);
      fs.writeFileSync(path.join(ctx.cacheDir, `check-${who}.events.json`), `${JSON.stringify({ provider: s.provider, voice: s.voice, model: s.model, request: item.built.request, wav: info, ...(res.meta || {}), events: res.events }, null, 1)}\n`);
      if (bad.length) { for (const b of bad) findings.push(`${who}: ${b}`); continue; }
      const enc = await processAudio({ wavFile: wav, outFile: path.join(ctx.cacheDir, `check-${who}.mp3`), loudness: s.loudness, mp3: s.mp3 });
      let timing = null;
      try { timing = timingJson({ id: item.key, hash: 'check', voice: s.voice, text: item.text, built: item.built, events: res.events, duration: enc.duration ?? info.duration }); } catch (e) { findings.push(`${who}: ${e.message}`); }
      for (const p of enc.problems) findings.push(`${who}: ${p}`);
      const placed = timing ? timing.json.words.filter((x) => x[3] != null).length : 0;
      const fmt = res.meta?.format ? `${res.meta.format}${res.meta.fellBack ? `, because ${s.format} was refused on this plan (decoded from MP3 with ffmpeg)` : ''}` : 'Riff24Khz16BitMonoPcm';
      log(`  ${who}: "${item.text}" came back as ${round3(info.duration)} s of 24 kHz 16-bit mono (${fmt}); ${placed} of ${words.length} words placed on the caption; ${enc.lufs} LUFS, ${enc.tp} dBTP after encoding${enc.warnings.length ? ` (${enc.warnings.join('; ')})` : ''}`);
      if (s.provider === 'elevenlabs') {
        cases.push({ guide: g, voice: s.voice, model: s.model, format: res.meta.format, settings: s.voiceSettings, seed: s.seed, caption: item.text, lexicon: item.built.used, request: item.built.request, duration: round3(info.duration), alignment: res.meta.alignment, normalized_alignment: res.meta.normalized });
      }
    }
    if (sub0?.ok) {
      const sent = cases.reduce((a, c) => a + [...c.request].length, 0);
      const sub1 = await usageAfter(creds.elevenlabs.key, sub0, sent, deps);
      if (sub1.ok) log(`  ElevenLabs plan after the check: ${n0(sub1.used)} of ${n0(sub1.limit)} characters used (${n0(sub1.used - sub0.used)} for this check; ${n0(sent)} characters were sent)`);
    }
  } catch (e) {
    err(`  speech service: failed. ${redact(e?.message || String(e), secrets)}`);
    return exitFor(e);
  }
  if (cases.length && o.fixture) {
    const file = path.resolve(ROOT, o.fixture);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${compactJson({ note: 'Real ElevenLabs /with-timestamps alignments, saved by node tools/voice/build.mjs --check: the text sent and the timings that came back, one case per guide. No key, no audio. tests/voice-eleven.spec.mjs turns them into word timings on the caption.', cases })}\n`);
    log(`  alignment fixture: ${path.relative(ROOT, file)}`);
  }
  if (findings.length) { for (const f of findings) err(`  speech service: ${f}`); return 1; }
  log(`  speech service: OK. Raw takes and events: ${path.relative(ROOT, ctx.cacheDir) || ctx.cacheDir}/check-*`);
  return 0;
}

// ---- render ----
function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}
async function pool(list, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) await fn(list[i++]); }));
}
const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined && o[k] !== null).map((k) => [k, o[k]]));

// v1 (single guide) or v2 (guides: provider, voice, model, settings, seed and format per guide;
// totals per guide too). One item per line, so a re-render shows up in a diff as the lines that changed.
export function writeVoiceManifest(voiceDir, s, items, guides = null) {
  const keys = Object.keys(items).sort();
  const sum = (f, ks) => ks.reduce((a, k) => a + (Number(items[k][f]) || 0), 0);
  const totals = (ks) => ({ items: ks.length, bytes: sum('bytes', ks), seconds: round3(sum('duration', ks)), chars: sum('chars', ks) });
  const ids = guides ? Object.keys(guides) : [];
  const format = { codec: 'mp3', sampleRate: s.mp3.sampleRate, bitrate: s.mp3.bitrate, channels: s.mp3.channels };
  const loudness = { I: s.loudness.I, TP: s.loudness.TP, LRA: s.loudness.LRA };
  const lines = [];
  const put = (k, v) => lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  if (ids.length) {
    put('v', 2);
    const gl = ids.map((g) => { const x = guides[g]; return `    ${JSON.stringify(g)}: ${JSON.stringify(sortKeys({ name: x.guideName, provider: x.provider, voice: x.voice, model: x.model, settings: x.voiceSettings, seed: x.seed, format: x.format }))}`; });
    lines.push(`  "guides": {\n${gl.join(',\n')}\n  }`);
    put('locale', s.locale); put('format', format); put('loudness', loudness);
    put('totals', { ...totals(keys), guides: Object.fromEntries(ids.map((g) => [g, totals(keys.filter((k) => items[k].guide === g))])) });
  } else {
    put('v', 1); put('provider', s.provider); put('voice', s.voice); put('locale', s.locale); put('rate', s.rate);
    put('format', format); put('loudness', loudness); put('totals', totals(keys));
  }
  const body = keys.map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(sortKeys(items[k]))}`).join(',\n');
  writeAtomic(path.join(voiceDir, 'manifest.json'), `{\n${lines.join(',\n')},\n  "items": {${keys.length ? `\n${body}\n  ` : ''}}\n}\n`);
}

// The raw take of an item from the cache: its WAV, and its word events (re-derived from the saved
// ElevenLabs alignment, so a better conversion never needs a new take).
function cachedEvents(evFile, it) {
  const j = readJson(evFile);
  return j.alignment && it.provider === 'elevenlabs' ? alignmentEvents(j.alignment, it.built) : j.events;
}

export async function render(o, deps = {}) {
  const log = deps.log || console.log, err = deps.err || console.error;
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
  const creds = {};
  for (const p of new Set(rows.filter((r) => r.api).map((r) => r.item.provider))) {
    creds[p] = credsFor(p, deps);
    if (creds[p].missing.length) { err(missingMessage(creds[p])); return 3; }
  }
  const secrets = Object.values(creds).map((c) => c.key);
  if (rows.length && !((await toolVersion(ffmpeg())) && (await toolVersion(ffprobe())))) { err('ffmpeg and ffprobe are needed; install ffmpeg, or set FFMPEG and FFPROBE.'); return 1; }
  fs.mkdirSync(ctx.voiceDir, { recursive: true });
  const tmpDir = path.join(ctx.cacheDir, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  const wait = deps.pace || pacer(o.rate);
  const done = new Map(), failures = [];
  let requests = 0, billed = 0, credits = 0, stop = null;
  log(rows.length ? `Rendering ${rows.length} of ${ctx.items.length} voice files (${rows.filter((r) => r.api).length} requests to the speech service).` : `All ${ctx.items.length} voice files are up to date.`);
  await pool(rows, o.concurrency, async (row) => {
    if (stop) return;
    const it = row.item, s = it.settings, prov = providerOf(s.provider);
    const wavFile = path.join(ctx.cacheDir, `${it.speechHash}.wav`), evFile = path.join(ctx.cacheDir, `${it.speechHash}.events.json`);
    const tmp = path.join(tmpDir, `${it.key.replace(/\//g, '__')}.${process.pid}.mp3`);
    try {
      if (row.api) {
        await wait();
        if (stop) return;
        const res = await withRetries(() => prov.synthesize({ item: it, s, creds: creds[s.provider], deps, tmpDir }), { onRetry: (e, n, ms) => log(`  retry ${n} for ${it.key} in ${(ms / 1000).toFixed(1)} s (${e.code})`) });
        requests++; billed += it.billable; credits += prov.credits(it.billable, s) || 0;
        if (!wavInfo(res.audio)) throw new Error('the speech service returned no WAV audio');
        if (res.meta?.fellBack) log(`  note: ${it.key}: ${s.format} was refused on this plan, so it came as ${res.meta.format} and was decoded with ffmpeg`);
        writeAtomic(wavFile, res.audio);
        const { alignment = null, normalized = null, ...meta } = res.meta || {};
        writeAtomic(evFile, `${JSON.stringify({ v: 1, key: it.key, provider: s.provider, voice: s.voice, model: s.model, request: it.built.request, ...meta, ...(alignment ? { alignment, normalized } : {}), events: res.events }, null, 1)}\n`);
      }
      const events = cachedEvents(evFile, it);
      const audio = await processAudio({ wavFile, outFile: tmp, loudness: s.loudness, mp3: s.mp3 });
      if (audio.problems.length) throw new Error(audio.problems.join('; '));
      if (audio.bytes > s.budget.fileKB * 1000) throw new Error(`${kb(audio.bytes)} KB, over the ${s.budget.fileKB} KB limit for one file; split the line`);
      const { json, coverage } = timingJson({ id: it.key, hash: it.hash, voice: s.voice, text: it.text, built: it.built, events, duration: audio.duration });
      const end = Math.max(0, ...json.words.map((x) => x[0] + x[1]));
      if (end > json.duration + 0.05) throw new Error(`the last word ends at ${round3(end)} s, after the audio (${json.duration} s)`);
      const mp3File = path.join(ctx.voiceDir, `${it.key}.mp3`);
      fs.mkdirSync(path.dirname(mp3File), { recursive: true });
      fs.renameSync(tmp, mp3File);
      writeAtomic(path.join(ctx.voiceDir, `${it.key}.json`), `${JSON.stringify(json)}\n`);
      done.set(it.key, { kind: it.kind, line: it.id, guide: it.guide, door: it.door, hash: it.hash, lineHash: it.lineHash, chars: it.chars, duration: json.duration, bytes: audio.bytes, lufs: audio.lufs, tp: audio.tp });
      log(`  ${row.api ? 'rendered' : 're-encoded'} ${it.key}: ${json.duration.toFixed(1)} s, ${kb(audio.bytes)} KB, ${audio.lufs} LUFS, ${audio.tp} dBTP, ${Math.round(coverage * 100)}% of words timed${audio.warnings.length ? ` (warning: ${audio.warnings.join('; ')})` : ''}`);
    } catch (e) {
      fs.rmSync(tmp, { force: true });
      const msg = redact(e?.message || String(e), secrets);
      if (FATAL.has(e?.code) && !stop) stop = { code: exitFor(e), why: e.code === 'QuotaExceeded' ? 'The ElevenLabs quota ran out, so the run stopped; what rendered is kept. Top up or wait for the reset, then run again: nothing already rendered is asked for twice.' : 'The key was refused, so the run stopped. Check it with node tools/voice/build.mjs --check.' };
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
  if (o.prune) for (const d of new Set(plan.orphans.filter((k) => k.includes('/')).map((k) => k.split('/')[0]))) { try { fs.rmdirSync(path.join(ctx.voiceDir, d)); } catch { /* not empty */ } }
  const shape = ctx.guideIds.length ? 2 : 1;
  if (rows.length || plan.orphans.length || !plan.voiceManifest || plan.voiceManifest.v !== shape) writeVoiceManifest(ctx.voiceDir, st, next, ctx.guideIds.length ? ctx.guides : null);
  if (o.report) log(`  report: ${path.relative(ROOT, writeReport({ file: path.join(ROOT, 'art', 'voice-report.html'), items: ctx.items, skipped: ctx.skipped, settings: st, guides: ctx.guides, voiceDir: ctx.voiceDir, voiceManifest: readVoiceManifest(ctx.voiceDir) }))}`);
  log(`Done: ${done.size} written, ${failures.length} failed; ${requests} requests, ${n0(billed)} billable characters${credits ? ` (${n0(credits)} ElevenLabs credits)` : ''}${Object.keys(creds).includes('azure') ? ` (Azure: about ${usd((billed / 1e6) * o.price)})` : ''}.`);
  if (stop) { err(stop.why); return stop.code; }
  return failures.length ? 1 : 0;
}

// ---- --ab: the listening test (O13) ----
// Five short lines (the ones Nate heard in the first ElevenLabs test, the guide's own name in the
// first, 3HUE, AiVRIC, SOC 2, vCISO and NIST CSF in the last) and a strip of "This is Avi." three
// ways (the engine's own reading, "AH-vee", "AY-vee"), in every guide's voice on every model given,
// through the published pipeline (loudness, MP3 48 kbps), with the word timings on each caption.
export const AB_LINES = [
  { id: 'welcome', text: "Welcome to the 3HUE lobby. I'm {guide}, and I'll walk you to the right door." },
  { id: 'prove', text: "Your buyer isn't asking whether you're secure. They're asking whether you can prove it by Friday." },
  { id: 'figures', text: 'Your bigger competitors run cyber diligence on 81% of deals. You run it on 29%.' },
  { id: 'march', text: 'Your controls passed in December. The question is what they were doing in March.' },
  { id: 'names', text: "3HUE's programs run on AiVRIC. If a customer needs your SOC 2 report, a vCISO and a NIST CSF crosswalk, that's where we start." },
];
export const AB_AVI = [
  { id: 'avi-default', text: 'This is Avi.', say: {}, label: 'the engine\'s own reading' },
  { id: 'avi-ah', text: 'This is Avi.', say: { Avi: 'AH-vee' }, label: '"AH-vee"' },
  { id: 'avi-ay', text: 'This is Avi.', say: { Avi: 'AY-vee' }, label: '"AY-vee"' },
];

export async function abTest(o, log = console.log, deps = {}) {
  const err = deps.err || console.error;
  const ctx = deps.ctx || await loadScript(o);
  const list = guideList(ctx).filter(([, s]) => s.provider === 'elevenlabs');
  if (!list.length) { err('--ab compares ElevenLabs models, and no guide speaks through ElevenLabs.'); return 1; }
  const creds = credsFor('elevenlabs', deps);
  if (creds.missing.length) { err(missingMessage(creds)); return 3; }
  if (!((await toolVersion(ffmpeg())) && (await toolVersion(ffprobe())))) { err('ffmpeg and ffprobe are needed; install ffmpeg, or set FFMPEG and FFPROBE.'); return 1; }
  const out = path.resolve(ROOT, o.abOut), rawDir = path.join(out, 'raw'), tmpDir = path.join(out, 'tmp');
  fs.mkdirSync(rawDir, { recursive: true }); fs.mkdirSync(tmpDir, { recursive: true });
  const wait = deps.pace || pacer(o.rate);
  const jobs = [];
  for (const [g, s] of list) for (const model of o.ab) for (const line of [...AB_LINES, ...AB_AVI]) jobs.push({ g, s, model, line });
  const takes = [];
  let requests = 0, sent = 0, spent = 0, sub0 = null, sub1 = null, stop = null;
  try {
    sub0 = await getSubscription({ key: creds.key, fetchImpl: deps.fetchImpl });
    log(`A/B listening test: ${o.ab.join(' vs ')}, ${list.map(([g]) => g || 'the guide').join(' and ')}, ${AB_LINES.length} lines and the "Avi" strip (${jobs.length} takes) → ${out}`);
    await pool(jobs, o.concurrency, async ({ g, s, model, line }) => {
      if (stop) return;
      const caption = line.text.replace('{guide}', s.guideName || 'your guide');
      const lexicon = { ...s.lexicon, ...(line.say || {}) };
      const sm = { ...s, model, lexicon };
      const built = buildPlain(caption, { lexicon });
      const sh = speechHash(hashInput(sm, caption));
      const wavFile = path.join(rawDir, `${sh}.wav`), jFile = path.join(rawDir, `${sh}.json`);
      const who = g || 'guide';
      try {
        let meta;
        if (!o.force && fs.existsSync(wavFile) && fs.existsSync(jFile)) meta = readJson(jFile);
        else {
          await wait();
          if (stop) return;
          const res = await withRetries(() => providerOf('elevenlabs').synthesize({ item: { built }, s: sm, creds, deps, tmpDir, model }), { onRetry: (e, n, ms) => log(`  retry ${n} for ${who} ${model} ${line.id} in ${(ms / 1000).toFixed(1)} s (${e.code})`) });
          requests++; sent += built.billable; spent += creditsFor(built.billable, model);
          writeAtomic(wavFile, res.audio);
          meta = { guide: g, model, voice: s.voice, caption, request: built.request, format: res.meta.format, fellBack: res.meta.fellBack, requestId: res.meta.requestId, alignment: res.meta.alignment, normalized: res.meta.normalized };
          writeAtomic(jFile, `${JSON.stringify(meta)}\n`);
        }
        const events = alignmentEvents(meta.alignment, built);
        const mp3 = path.join(out, who, model, `${line.id}.mp3`);
        fs.mkdirSync(path.dirname(mp3), { recursive: true });
        const enc = await processAudio({ wavFile, outFile: mp3, loudness: s.loudness, mp3: s.mp3 });
        const { json, coverage } = timingJson({ id: line.id, hash: sh.slice(0, 12), voice: s.voice, text: caption, built, events, duration: enc.duration, minCoverage: 0 });
        fs.writeFileSync(path.join(out, who, model, `${line.id}.json`), `${JSON.stringify(json)}\n`);
        const info = wavInfo(fs.readFileSync(wavFile));
        takes.push({ guide: g, name: s.guideName, voice: s.voice, model, line: line.id, label: line.label || null, caption, request: built.request, chars: built.billable, credits: creditsFor(built.billable, model), duration: json.duration, rawDuration: round3(info?.duration ?? 0), words: json.words, placed: json.words.filter((x) => x[3] != null).length, coverage, lufs: enc.lufs, tp: enc.tp, problems: enc.problems, warnings: enc.warnings, format: meta.format, fellBack: !!meta.fellBack, file: path.relative(out, mp3).split(path.sep).join('/') });
        log(`  ${who} ${model} ${line.id}: ${json.duration.toFixed(2)} s, ${built.billable} characters, ${Math.round(coverage * 100)}% of words placed, ${enc.lufs} LUFS${meta.fellBack ? `, ${meta.format} (PCM refused)` : ''}`);
      } catch (e) {
        const msg = redact(e?.message || String(e), [creds.key]);
        if (FATAL.has(e?.code) && !stop) stop = e;
        takes.push({ guide: g, name: s.guideName, voice: s.voice, model, line: line.id, label: line.label || null, caption, request: built.request, chars: built.billable, error: msg });
        err(`  failed ${who} ${model} ${line.id}: ${msg}`);
      }
    });
    if (sub0.ok) sub1 = await usageAfter(creds.key, sub0, sent, deps);
  } catch (e) {
    err(`  speech service: failed. ${redact(e?.message || String(e), [creds.key])}`);
    return exitFor(e);
  }
  const used = sub0?.ok && sub1?.ok ? sub1.used - sub0.used : null;
  const summary = { models: o.ab, guides: list.map(([g, s]) => ({ id: g, name: s.guideName, voice: s.voice, settings: s.voiceSettings, seed: s.seed, format: s.format })), lexicon: ctx.settings.lexicon, requests, characters: sent, credits: spent, measuredCredits: used, plan: sub1?.ok ? { tier: sub1.tier, used: sub1.used, limit: sub1.limit, resetsAt: sub1.resetsAt } : null };
  fs.writeFileSync(path.join(out, 'ab.json'), `${JSON.stringify({ ...summary, takes: takes.map(({ words, ...t }) => t) }, null, 1)}\n`);
  const report = writeAbReport({ file: path.join(out, 'report.html'), takes, lines: [...AB_LINES, ...AB_AVI], summary });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  log(`Done: ${requests} requests, ${n0(sent)} characters sent (${n0(spent)} credits by the price list${used != null ? `; the plan's count moved by ${n0(used)}` : ''}). Report: ${report}`);
  if (stop) return exitFor(stop);
  return takes.some((t) => t.error) ? 1 : 0;
}

const HELP = (() => {
  const lines = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1);
  return lines.slice(0, lines.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
})();

export async function main(argv, { log = console.log, err = console.error, deps = {} } = {}) {
  let o;
  try { o = parseArgs(argv); } catch (e) { if (e instanceof Usage) { err(`${e.message}\n\n${HELP}`); return 64; } throw e; }
  if (o.mode === 'help') { log(HELP); return 0; }
  try {
    if (o.mode === 'check') return await check(o, log, { err, ...deps });
    if (o.mode === 'ab') return await abTest(o, log, { err, ...deps });
    if (o.mode === 'dry') {
      const res = await dryRun(o);
      if (o.json) log(JSON.stringify({ ...res.summary, rows: res.plan.rows.map(({ item, ...r }) => ({ ...r, hash: item.hash, lineHash: item.lineHash })) }, null, 1));
      else printDry(res, o, log);
      if (o.report) writeReport({ file: path.join(ROOT, 'art', 'voice-report.html'), items: res.ctx.items, skipped: res.ctx.skipped, settings: res.ctx.settings, guides: res.ctx.guides, voiceDir: res.ctx.voiceDir, voiceManifest: res.plan.voiceManifest });
      return res.ctx.problems.length ? 1 : res.budget.ok ? 0 : 2;
    }
    return await render(o, { log, err, ...deps });
  } catch (e) {
    if (e instanceof Usage) { err(e.message); return 64; }
    const keys = ['azure', 'elevenlabs'].map((p) => { try { return credsFor(p, deps).key; } catch { return null; } });
    err(`voice build failed: ${redact(e?.message || String(e), keys)}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const code = await main(process.argv.slice(2));
  process.exitCode = code;
  setTimeout(() => process.exit(code), 500).unref();   // in case the SDK leaves a socket open
}
