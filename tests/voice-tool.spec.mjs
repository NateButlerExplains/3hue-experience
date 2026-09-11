// The voice tooling (O10, tools/voice/): no browser, no key, no network. Hashes; SSML escaping and
// its position map; word events to the documented timing file; the dry-run plan, cost and budget;
// credentials; the MP3 header parser and the ffmpeg pipeline; a full render through a stand-in
// synthesiser that the voice lint then passes; and the lint's drafting rule (guide.voice.required).
// Every file a test writes goes under its own test-results output directory.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, manifest as m, readJson } from './helpers.mjs';
import { speechHash, audioHash, canonical, hashLine } from '../tools/voice/hash.mjs';
import { buildSsml, ssmlText, lexiconSpans, billableChars, timingJson, rateAttr } from '../tools/voice/ssml.mjs';
import { voiceItems, voiceSettings, spokenLines } from '../tools/voice/items.mjs';
import { parseMp3, makeWav, processAudio, toolVersion, ffmpeg, probe } from '../tools/voice/audio.mjs';
import { loadCredentials, readEnvFile, redact, describe as describeCreds, KEY, REGION } from '../tools/voice/env.mjs';
import { loadScript, planBuild, dryRun, parseArgs, render, writeVoiceManifest, prepare } from '../tools/voice/build.mjs';
import { lintVoice, checkTiming } from '../tools/voice/lint.mjs';
import { withRetries, pacer, SpeechError } from '../tools/voice/azure.mjs';

const FIXTURE = 'tests/fixtures/tour-min.json';
const TINY = path.join(ROOT, 'tests/fixtures/voice/tiny.mp3');
const ENC = { mp3: { sampleRate: 24000, bitrate: 48, channels: 1 }, loudness: { I: -18, TP: -1.5, LRA: 11 } };
const clone = (x) => structuredClone(x);
const hasFfmpeg = !!(await toolVersion(ffmpeg()));
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 1)); return f; };
// A child environment with no Azure credentials and a home with no ~/.env.
const cleanEnv = (home, extra = {}) => { const e = { ...process.env, HOME: home, ...extra }; if (!(KEY in extra)) delete e[KEY]; if (!(REGION in extra)) delete e[REGION]; return e; };
const tool = (args, env) => spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8' });

// A stand-in for the speech service: a WAV with a tone burst per spoken word and word events
// shaped like the SDK's, text offsets found in the raw SSML the way SynthesisTurn.updateTextOffset
// finds them (a hit inside a tag is skipped), aliases spoken instead of their terms.
function fakeSynth(calls) {
  return async ({ ssml }) => {
    calls.push(ssml);
    const body = ssml.replace(/^[\s\S]*?<voice\b[^>]*>(?:<prosody\b[^>]*>)?|(?:<\/prosody>)?<\/voice>[\s\S]*$/g, '');
    const spoken = body.replace(/<sub alias="([^"]*)">[^<]*<\/sub>/g, (x, a) => a.replace(/&quot;/g, '"').replace(/&amp;/g, '&')).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const words = spoken.split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
    let next = 0;
    const within = (i) => ssml.indexOf('<', i + 1) > ssml.indexOf('>', i + 1);
    const offsetOf = (w) => { let o = ssml.indexOf(w, next); while (o >= 0) { next = o + w.length; if (!within(o)) return o; o = ssml.indexOf(w, next); } return -1; };
    const sr = 24000, lead = 0.3, per = 0.32, tail = 0.3;
    const n = Math.round((lead + words.length * per + tail) * sr);
    const s = new Float32Array(n);
    words.forEach((_, k) => { const a = Math.round((lead + k * per) * sr), b = Math.round((lead + k * per + per * 0.8) * sr); for (let i = a; i < b; i++) s[i] = 0.25 * Math.sin((2 * Math.PI * 190 * i) / sr) * Math.sin((Math.PI * (i - a)) / (b - a)); });
    const events = words.map((w, k) => ({ type: 'WordBoundary', offset: Math.round((lead + k * per) * 1e7), duration: Math.round(per * 0.8 * 1e7), text: w, textOffset: offsetOf(w), wordLength: w.length }));
    return { audio: makeWav(s, sr), events, durationTicks: Math.round((n / sr) * 1e7) };
  };
}

test.describe('T-02 voice tooling and the voice lint (no browser)', () => {
  test('hashes: a fixed input gives a fixed hash; words, voice, locale, rate and pronunciation change the request, encoding changes only the file', () => {
    const base = { provider: 'azure', voice: 'en-US-AvaNeural', locale: 'en-US', rate: 0, lexicon: {}, text: 'Welcome to 3HUE.' };
    const s0 = speechHash(base), h0 = audioHash(s0, ENC);
    // Golden values: if these move, every published line re-renders. Change HASH_VERSION or
    // AUDIO_PIPELINE on purpose, never by accident.
    expect(s0).toBe('7eea64cb789e80ad08cfb58467ff7c3f13f2277bc67994cc7efac51da2f4d68b');
    expect(h0).toBe('a19255b770d4');
    for (const change of [{ text: 'Welcome to 3HUE!' }, { voice: 'en-US-AndrewNeural' }, { locale: 'en-GB' }, { rate: 5 }, { lexicon: { '3HUE': 'three hue' } }, { provider: 'other' }]) {
      expect(speechHash({ ...base, ...change }), JSON.stringify(change)).not.toBe(s0);
    }
    // A pronunciation entry the text does not use, key order and Unicode normalisation change nothing.
    expect(speechHash({ ...base, lexicon: { vCISO: 'virtual C I S O' } })).toBe(s0);
    expect(speechHash({ text: base.text, rate: 0, locale: 'en-US', voice: base.voice, provider: 'azure' })).toBe(s0);
    const nfd = `Cafe${String.fromCharCode(0x301)}`, nfc = 'Caf' + String.fromCharCode(0xe9);
    expect(speechHash({ ...base, text: nfd })).toBe(speechHash({ ...base, text: nfc }));
    for (const e of [{ mp3: { ...ENC.mp3, bitrate: 40 } }, { mp3: { ...ENC.mp3, sampleRate: 22050 } }, { loudness: { ...ENC.loudness, I: -16 } }, { loudness: { ...ENC.loudness, TP: -1 } }]) {
      expect(audioHash(s0, { ...ENC, ...e }), JSON.stringify(e)).not.toBe(h0);
    }
    expect(h0).toMatch(/^[0-9a-f]{12}$/);
    expect(canonical({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
  });

  test('hashes: a line re-renders when the manifest field it quotes changes, and for nothing else', async () => {
    const t = readJson(FIXTURE);
    const hashed = async (mm) => { const { items } = await voiceItems(t, mm); const s = voiceSettings(mm); return Object.fromEntries(items.map((i) => [i.key, prepare(i, s)])); };
    const A = await hashed(m);
    for (const it of Object.values(A)) expect(it.lineHash).toBe(await hashLine(it.text, it.say));
    // Edit the field one ref line quotes: exactly the lines whose words changed get a new hash.
    const target = Object.values(A).find((i) => typeof t.nodes[i.where.split('.')[1]]?.lines?.[+i.where.match(/\[(\d+)\]$/)[1]]?.ref === 'string' && !i.door);
    const ref = t.nodes[target.where.split('.')[1]].lines[+target.where.match(/\[(\d+)\]$/)[1]].ref;
    const m2 = clone(m);
    const segs = ref.split('.');
    let o = m2;
    for (const sgm of segs.slice(0, -1)) o = Array.isArray(o) && !/^\d+$/.test(sgm) ? o.find((x) => x.id === sgm) : o[sgm];
    const last = segs[segs.length - 1];
    o[last] = Array.isArray(o[last]) ? [...o[last], 'Edited.'] : typeof o[last] === 'string' ? `${o[last]} Edited.` : { ...o[last], text: `${o[last].text} Edited.` };
    const B = await hashed(m2);
    const changed = Object.keys(A).filter((k) => A[k].hash !== B[k].hash);
    expect(changed).toContain(target.key);
    for (const k of Object.keys(A)) expect(A[k].hash === B[k].hash, k).toBe(A[k].text === B[k].text);
    // An edit no line quotes changes no hash.
    const m3 = clone(m); m3.guide.disclosure += ' Edited.'; m3.vocabulary.avoid = [...m3.vocabulary.avoid, 'zzz'];
    const C = await hashed(m3);
    expect(Object.keys(A).filter((k) => A[k].hash !== C[k].hash)).toEqual([]);
    // A voice change re-renders everything; an encoding change keeps the request (so it re-encodes from the cache).
    const m4 = clone(m); m4.guide.voice.name = 'en-US-AndrewNeural';
    const D = await hashed(m4);
    for (const k of Object.keys(A)) { expect(D[k].hash).not.toBe(A[k].hash); expect(D[k].lineHash).toBe(A[k].lineHash); }
    const m5 = clone(m); m5.guide.voice.mp3 = { bitrate: 40 };
    const E = await hashed(m5);
    for (const k of Object.keys(A)) { expect(E[k].hash).not.toBe(A[k].hash); expect(E[k].speechHash).toBe(A[k].speechHash); }
  });

  test('SSML: text escapes & < >, attributes escape all five; every plain character maps back from its SSML position', () => {
    const smile = String.fromCodePoint(0x1f600);
    const text = `Ben & Jerry's <b>"best"</b> — 3HUE ${smile} done.`;
    const b = buildSsml(text, { voice: 'en-US-AvaNeural', locale: 'en-US', lexicon: { '3HUE': 'three "hue" & co' } });
    expect(b.ssml.startsWith('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"')).toBe(true);
    expect(b.ssml).toContain('xml:lang="en-US"><voice name="en-US-AvaNeural">Ben &amp; Jerry\'s &lt;b&gt;"best"&lt;/b&gt; — <sub alias="three &quot;hue&quot; &amp; co">3HUE</sub>');
    expect(b.ssml.endsWith('</voice></speak>')).toBe(true);
    expect(b.ssml).not.toContain('<prosody');
    expect(ssmlText(b.ssml)).toBe(text);
    const seen = new Set();
    for (let off = 0; off < b.ssml.length; off++) {
      const i = b.toPlain(off);
      if (i < 0) continue;
      seen.add(i);
      const esc = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[text[i]];
      if (esc) expect(esc).toContain(b.ssml[off]); else expect(b.ssml[off], `ssml[${off}]`).toBe(text[i]);
    }
    expect(seen.size).toBe(text.length);
    expect(b.toPlain(b.ssml.indexOf('<sub'))).toBe(-1);
    expect(b.toPlain(b.ssml.indexOf('alias='))).toBe(-1);
    const amp = b.ssml.indexOf('&amp;');
    expect(b.plainRange(amp, amp + 5)).toEqual([4, 5]);
    expect(b.plainRange(b.ssml.indexOf('3HUE<'), b.ssml.indexOf('3HUE<') + 4)).toEqual([text.indexOf('3HUE'), text.indexOf('3HUE') + 4]);
    const so = b.ssml.indexOf(smile);
    expect([b.toPlain(so), b.toPlain(so + 1)]).toEqual([text.indexOf(smile), text.indexOf(smile) + 1]);
    expect(b.used).toEqual({ '3HUE': 'three "hue" & co' });
    // A control character becomes a space and keeps its position.
    const c = buildSsml(`a${String.fromCharCode(7)}b`);
    expect(ssmlText(c.ssml)).toBe('a b');
    expect(c.toPlain(c.ssml.indexOf('a b') + 1)).toBe(1);
    // Rate: none at 0 (the owner's +0%), a relative percentage otherwise.
    expect(rateAttr(0)).toBeNull();
    expect(rateAttr(-5)).toBe('-5%');
    expect(buildSsml('Hi.', { rate: 10 }).ssml).toContain('<voice name="en-US-AvaNeural"><prosody rate="+10%">Hi.</prosody></voice>');
    // Pronunciation entries apply to whole words only.
    expect(lexiconSpans('3HUE and 3HUEs and x3HUE; 3HUE.', { '3HUE': 'three hue' }).map((x) => x.start)).toEqual([0, 26]);
    // Billing counts everything inside <voice> (markup and entities too) but not the speak and voice tags.
    expect(billableChars(buildSsml('A & B').ssml)).toBe('A &amp; B'.length);
    expect(b.billable).toBe(billableChars(b.ssml));
    expect(billableChars(buildSsml(smile).ssml)).toBe(1);
  });

  test('word events: the SDK-shaped fixture converts to the documented timing file', () => {
    const fx = readJson('tests/fixtures/voice/boundaries.json');
    expect(fx.cases.length).toBeGreaterThanOrEqual(2);
    for (const c of fx.cases) {
      const b = buildSsml(c.say || c.text, { voice: 'en-US-AvaNeural', locale: 'en-US', rate: 0, lexicon: c.lexicon || {} });
      expect(b.ssml, c.name).toBe(c.ssml);
      const { json, coverage } = timingJson({ id: 'sample', hash: 'abcdefabcdef', voice: 'en-US-AvaNeural', text: c.text, built: b, events: c.events, duration: c.duration });
      expect(json, c.name).toEqual({ v: 1, id: 'sample', hash: 'abcdefabcdef', voice: 'en-US-AvaNeural', text: c.text, duration: c.duration, words: c.expected.words });
      expect(coverage).toBe(1);
      expect(json.words.length).toBe(c.events.filter((e) => e.type === 'WordBoundary').length);
      expect(checkTiming(json, { key: 'sample', text: c.text }), c.name).toEqual([]);
      for (const w of json.words) { expect(w).toHaveLength(5); expect(w[0] >= 0 && w[1] >= 0 && typeof w[2] === 'string').toBe(true); }
    }
    const [one, say] = fx.cases.map((c) => ({ c, j: timingJson({ id: 's', hash: 'h', voice: 'v', text: c.text, built: buildSsml(c.say || c.text, { lexicon: c.lexicon || {} }), events: c.events, duration: c.duration }).json }));
    const on = ({ c, j }, word) => j.words.filter((w) => w[2] === word).map((w) => c.text.slice(w[3], w[4]));
    expect(on(one, '&')).toEqual(['&']);                         // through the SDK's offset into &amp;
    expect(on(one, 'I’m')).toEqual(["I'm"]);                    // textOffset -1: found by its letters
    expect(on(one, 'virtual')).toEqual(['vCISO']);               // spoken through <sub alias>
    expect(on(one, 'O')).toEqual(['vCISO']);
    expect(on(say, 'Three')).toEqual(['3HUE']);                  // a say line lands on its caption
    expect(on(say, 'sock')).toEqual(['SOC']);
    expect(on(say, 'two')).toEqual(['2']);
    // Words the service says that are nowhere in the text fail the line rather than drift.
    const b = buildSsml('Short line here.');
    const stray = ['alpha', 'beta', 'gamma', 'here'].map((w, i) => ({ type: 'WordBoundary', offset: i * 3e6, duration: 2e6, text: w, textOffset: -1 }));
    expect(() => timingJson({ id: 'x', hash: 'h', voice: 'v', text: 'Short line here.', built: b, events: stray, duration: 2 })).toThrow(/1 of 4 word timings placed/);
    expect(() => timingJson({ id: 'x', hash: 'h', voice: 'v', text: 'Short line here.', built: b, events: [], duration: 2 })).toThrow(/0 of 0/);
  });

  test('timing file checks: order, ranges, audio length and coverage', () => {
    const ok = { v: 1, id: 'k', hash: 'h', voice: 'v', text: 'One two three.', duration: 1.5, words: [[0.1, 0.2, 'One', 0, 3], [0.4, 0.2, 'two', 4, 7], [0.7, 0.3, 'three', 8, 13]] };
    expect(checkTiming(ok, { key: 'k', text: ok.text })).toEqual([]);
    const bad = (patch) => checkTiming({ ...clone(ok), ...patch }, { key: 'k', text: ok.text }).join(' | ');
    expect(bad({ words: [ok.words[1], ok.words[0], ok.words[2]] })).toMatch(/starts at 0.1 s, before/);
    expect(bad({ words: [[0.1, 0.2, 'One', 0, 99], ok.words[1], ok.words[2]] })).toMatch(/not a range in the text/);
    expect(bad({ duration: 0.5 })).toMatch(/after the audio/);
    expect(bad({ words: [[0.1, 0.2, 'One', null, null], [0.4, 0.2, 'two', null, null], ok.words[2]] })).toMatch(/1 of 3 words placed/);
    expect(bad({ text: 'Something else.' })).toMatch(/text differs/);
    expect(bad({ v: 2 })).toMatch(/v must be 1/);
    expect(bad({ words: [[0.1, 0.2, 'One']] })).toMatch(/must be \[start, duration, word, charStart, charEnd\]/);
  });

  test('spoken lines: node lines, Ask lines and answers; @ lines once per door; runtime tokens captions-only; the summary is not spoken', async () => {
    const t = readJson(FIXTURE);
    const { items, skipped, problems } = await voiceItems(t, m);
    expect(problems).toEqual([]);
    const summaryIds = (t.summary?.lines || []).map((l) => l.id);
    for (const id of summaryIds) expect(items.some((i) => i.id === id)).toBe(false);
    expect(spokenLines(t).length).toBe(Object.values(t.nodes).reduce((a, n) => a + n.lines.length, 0) + (t.ask?.intro ? 1 : 0) + (t.ask?.questions || []).reduce((a, q) => a + q.lines.length, 0));
    const at = items.filter((i) => i.id === 'lens-1');
    expect(at.map((i) => i.key)).toEqual(m.doors.map((d) => `lens-1--${d.id}`));
    expect(new Set(at.map((i) => i.text)).size).toBe(m.doors.length);
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
    if (t.ask?.intro) expect(items.find((i) => i.id === t.ask.intro.id).kind).toBe('ask');
    for (const q of t.ask?.questions || []) for (const l of q.lines) expect(items.find((i) => i.id === l.id).kind).toBe('faq');
    expect(skipped).toEqual([]);
    const t2 = clone(t);
    const firstNode = Object.values(t2.nodes)[0];
    firstNode.lines.push({ id: 'runtime-line', text: 'You chose {answer:segment}.', source: 'test', status: 'approved-copy' });
    const r2 = await voiceItems(t2, m);
    expect(r2.skipped.map((s) => s.id)).toEqual(['runtime-line']);
  });

  test('dry run: marks exactly the line whose words changed, a settings change, a missing file and an orphan', async ({}, testInfo) => {
    const out = testInfo.outputPath('voice'), cache = testInfo.outputPath('cache');
    const ctx = await loadScript({ tour: FIXTURE, out, cache });
    fs.mkdirSync(out, { recursive: true });
    const entries = {};
    for (const it of ctx.items) {
      fs.copyFileSync(TINY, path.join(out, `${it.key}.mp3`));
      fs.writeFileSync(path.join(out, `${it.key}.json`), JSON.stringify({ v: 1, id: it.key, hash: it.hash }));
      entries[it.key] = { kind: it.kind, line: it.id, door: it.door, hash: it.hash, lineHash: it.lineHash, chars: it.chars, duration: 0.3, bytes: 2352, lufs: -18, tp: -3 };
    }
    writeVoiceManifest(out, ctx.settings, entries);
    const statuses = (res) => Object.fromEntries(res.plan.rows.map((r) => [r.key, r.status]));
    const args = (...extra) => parseArgs(['--dry-run', '--tour', FIXTURE, '--out', out, '--cache', cache, ...extra]);

    const clean = await dryRun(args());
    expect(new Set(Object.values(statuses(clean)))).toEqual(new Set(['up-to-date']));
    expect(clean.summary.render).toMatchObject({ items: 0, requests: 0, chars: 0 });
    expect(clean.plan.orphans).toEqual([]);

    // One line's words change: that line alone, billed at its own characters.
    const t2 = readJson(FIXTURE);
    const [nodeId, node] = Object.entries(t2.nodes).find(([, n]) => n.lines.some((l) => l.ref && !l.ref.includes('@')));
    const li = node.lines.findIndex((l) => l.ref && !l.ref.includes('@'));
    const edited = node.lines[li].id;
    node.lines[li].ref = node.lines[li].ref === 'lobby.eyebrow' ? 'lobby.subline' : 'lobby.eyebrow';
    const t2file = writeJson(testInfo.outputPath('tour-edited.json'), t2);
    const res2 = await dryRun({ ...args(), tour: t2file });
    const s2 = statuses(res2);
    expect(Object.entries(s2).filter(([, v]) => v !== 'up-to-date'), nodeId).toEqual([[edited, 'changed-text']]);
    const row = res2.plan.rows.find((r) => r.key === edited);
    expect(res2.summary.render).toMatchObject({ items: 1, requests: 1, chars: row.item.billable });

    // A settings change: every line, as a settings change, not a text change.
    const m2 = clone(m); m2.guide.voice.rate = 5;
    const res3 = await dryRun({ ...args(), manifest: writeJson(testInfo.outputPath('m-rate.json'), m2) });
    expect(new Set(Object.values(statuses(res3)))).toEqual(new Set(['changed-settings']));
    // An encoding change with the raw audio cached costs nothing: re-encode only.
    const m3 = clone(m); m3.guide.voice.mp3 = { bitrate: 40 };
    fs.mkdirSync(cache, { recursive: true });
    for (const it of ctx.items) { fs.writeFileSync(path.join(cache, `${it.speechHash}.wav`), ''); fs.writeFileSync(path.join(cache, `${it.speechHash}.events.json`), '{}'); }
    const res4 = await dryRun({ ...args(), manifest: writeJson(testInfo.outputPath('m-40k.json'), m3) });
    expect(new Set(Object.values(statuses(res4)))).toEqual(new Set(['changed-settings']));
    expect(res4.summary.render).toMatchObject({ items: ctx.items.length, requests: 0, chars: 0, reencodes: ctx.items.length });

    // A missing file and an orphan.
    const gone = ctx.items[1].key;
    fs.rmSync(path.join(out, `${gone}.mp3`));
    fs.copyFileSync(TINY, path.join(out, 'retired-line.mp3'));
    const res5 = await dryRun(args());
    expect(Object.entries(statuses(res5)).filter(([, v]) => v !== 'up-to-date')).toEqual([[gone, 'missing-file']]);
    expect(res5.plan.orphans).toEqual(['retired-line']);

    // The same through the command line, as JSON and as the printed plan.
    const env = cleanEnv(testInfo.outputPath('home'));
    const cli = tool(['tools/voice/build.mjs', '--dry-run', '--tour', t2file, '--out', out, '--cache', cache, '--json'], env);
    expect(cli.status, cli.stderr).toBe(0);
    const j = JSON.parse(cli.stdout);
    expect(j.status['changed-text']).toBe(1);
    expect(j.status['missing-file']).toBe(1);
    expect(j.orphans).toEqual(['retired-line']);
    expect(j.rows.find((r) => r.key === edited)).toMatchObject({ status: 'changed-text', api: true });
    const printed = tool(['tools/voice/build.mjs', '--dry-run', '--tour', t2file, '--out', out, '--cache', cache], env);
    expect(printed.status).toBe(0);
    expect(printed.stdout).toMatch(new RegExp(`changed-text\\s+${edited}\\b`));
    expect(printed.stdout).toMatch(/orphan\s+retired-line/);
    // The missing file's raw audio is in the cache seeded above, so only the edited line is billed.
    expect(printed.stdout).toMatch(new RegExp(`To render: 2 files, 1 request to the speech service, ${row.item.billable} billable characters, about (\\$\\d+\\.\\d\\d|<\\$0\\.01) on S0`));
    expect(printed.stdout).toMatch(/1 file re-encodes from the local cache at no cost/);
  });

  test('dry run: over budget exits 2 and names the limit', async ({}, testInfo) => {
    const env = cleanEnv(testInfo.outputPath('home'));
    const small = clone(m); small.guide.voice.budget = { fileKB: 1, totalMB: 0.001 };
    const r = tool(['tools/voice/build.mjs', '--dry-run', '--tour', FIXTURE, '--manifest', writeJson(testInfo.outputPath('m-small.json'), small), '--out', testInfo.outputPath('voice')], env);
    expect(r.status, r.stdout + r.stderr).toBe(2);
    expect(r.stdout).toMatch(/over budget: .* over the 1 KB limit for one file/);
    expect(r.stdout).toMatch(/over the 0\.001 MB limit/);
    expect(r.stdout).toMatch(/Budget: OVER/);
    const short = clone(m); short.guide.voice.budget = { maxChars: 20 };
    const r2 = tool(['tools/voice/build.mjs', '--dry-run', '--tour', FIXTURE, '--manifest', writeJson(testInfo.outputPath('m-short.json'), short), '--out', testInfo.outputPath('voice')], env);
    expect(r2.status).toBe(2);
    expect(r2.stdout).toMatch(/characters; split lines over 20/);
  });

  test('dry run on content/tour.json needs no key and prints billable characters and the cost', async ({}, testInfo) => {
    const r = tool(['tools/voice/build.mjs', '--dry-run'], cleanEnv(testInfo.outputPath('home')));
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toMatch(/Voice dry run: no key, no network\./);
    expect(r.stdout).toMatch(/[\d,]+ billable characters, about (\$\d+\.\d\d|<\$0\.01) on S0 \(\$15 per 1M characters\)/);
    expect(r.stdout).toMatch(/Full render of every line: [\d,]+ billable characters/);
    expect(r.stdout).toMatch(/Budget: OK/);
  });

  test('--check without credentials names each missing variable and exits non-zero, printing no value', async ({}, testInfo) => {
    const home = testInfo.outputPath('home');
    fs.mkdirSync(home, { recursive: true });
    const none = tool(['tools/voice/build.mjs', '--check'], cleanEnv(home));
    const all = none.stdout + none.stderr;
    expect(none.status, all).toBe(3);
    expect(all).toContain(`${KEY}: not set (looked in the environment and ~/.env)`);
    expect(all).toContain(`${REGION}: not set (looked in the environment and ~/.env)`);
    expect(all).toContain(`Missing credentials: ${KEY} and ${REGION}.`);
    const region = 'zz-region-for-test';
    const half = tool(['tools/voice/build.mjs', '--check'], cleanEnv(home, { [REGION]: region }));
    const out = half.stdout + half.stderr;
    expect(half.status).toBe(3);
    expect(out).toContain(`${REGION}: set (from the environment)`);
    expect(out).toContain(`Missing credential: ${KEY}.`);
    expect(out).not.toContain(region);
    // Rendering anything new asks for the key the same way.
    const run = tool(['tools/voice/build.mjs', '--tour', FIXTURE, '--out', testInfo.outputPath('voice'), '--cache', testInfo.outputPath('cache')], cleanEnv(home));
    expect(run.status).toBe(3);
    expect(run.stderr).toContain(`Missing credentials: ${KEY} and ${REGION}.`);
    expect(fs.existsSync(testInfo.outputPath('voice'))).toBe(false);
  });

  test('credentials: the environment first, then ~/.env, only the two names read, values never printed', async ({}, testInfo) => {
    const other = 'sk-this-must-never-load-0123456789';
    const key = 'abc123abc123abc123abc123abc123ab';
    const file = testInfo.outputPath('.env');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `OPENAI_API_KEY=${other}\nexport ${KEY}="${key}"\n${REGION}=eastus # the resource's region\n`);
    const got = readEnvFile(file);
    expect(got).toEqual({ [KEY]: key, [REGION]: 'eastus' });
    expect(JSON.stringify(got)).not.toContain(other);
    const fromFile = loadCredentials({ env: {}, file });
    expect(fromFile).toMatchObject({ key, region: 'eastus', missing: [] });
    expect(fromFile.from[KEY]).toBe(file);
    const mixed = loadCredentials({ env: { [REGION]: 'westus2' }, file });
    expect(mixed.region).toBe('westus2');
    expect(mixed.from[REGION]).toBe('the environment');
    for (const l of describeCreds(mixed)) { expect(l).not.toContain(key); expect(l).not.toContain('westus2'); }
    expect(loadCredentials({ env: {}, file: testInfo.outputPath('missing.env') }).missing).toEqual([KEY, REGION]);
    const msg = redact(`auth failed for ${key}; header Ocp-Apim-Subscription-Key: ${key}x; ocp-apim-subscription-key=zzzz`, [key]);
    expect(msg).not.toContain(key);
    expect(msg).not.toContain('zzzz');
    expect(msg).toContain('[redacted]');
  });

  test('MP3 header parser reads the ffmpeg-made fixture, with or without an ID3 tag', async () => {
    const buf = fs.readFileSync(TINY);
    const info = parseMp3(buf);
    expect(info).toMatchObject({ version: 2, layer: 3, sampleRate: 24000, channels: 1, bitrate: 48, cbr: true, frames: 15, samplesPerFrame: 576, tag: 'Info', delay: 576, padding: 864, bytes: 2352 });
    expect(info.duration).toBeCloseTo(0.3, 3);
    const id3 = Buffer.concat([Buffer.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 20]), Buffer.alloc(20), buf]);
    expect(parseMp3(id3)).toMatchObject({ sampleRate: 24000, channels: 1, bitrate: 48, frames: 15 });
    expect(parseMp3(Buffer.from('not an mp3 at all, just text'))).toBeNull();
    expect(parseMp3(Buffer.alloc(0))).toBeNull();
    expect(parseMp3(fs.readFileSync(path.join(ROOT, 'content/tour.json')))).toBeNull();
    if (hasFfmpeg) expect(await probe(TINY)).toEqual({ codec: 'mp3', sampleRate: 24000, channels: 1, bitrate: 48 });
  });

  test('ffmpeg pipeline: loudness to target, speech start kept to the millisecond, mono 24 kHz 48 kbps', async ({}, testInfo) => {
    test.skip(!hasFfmpeg, 'ffmpeg is not installed');
    const sr = 24000, sec = 4, lead = 0.3, s = new Float32Array(sec * sr);
    for (let i = 0; i < s.length; i++) { const t = i / sr; if (t >= lead && t < sec - 0.2) s[i] = 0.3 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * (t - lead))) * (Math.sin(2 * Math.PI * 180 * t) + 0.5 * Math.sin(2 * Math.PI * 360 * t)); }
    const wavFile = testInfo.outputPath('speech.wav'), outFile = testInfo.outputPath('speech.mp3');
    fs.mkdirSync(path.dirname(wavFile), { recursive: true });
    fs.writeFileSync(wavFile, makeWav(s, sr));
    const r = await processAudio({ wavFile, outFile, loudness: ENC.loudness, mp3: ENC.mp3 });
    expect(r.problems).toEqual([]);
    expect(Math.abs(r.lufs - -18)).toBeLessThanOrEqual(1);
    expect(r.tp).toBeLessThanOrEqual(-1);
    expect(r.start.raw).toBeCloseTo(lead, 2);
    expect(Math.abs(r.start.mp3 - r.start.raw)).toBeLessThanOrEqual(0.02);
    expect(r.duration).toBeCloseTo(sec, 2);
    expect(r.mp3).toMatchObject({ sampleRate: 24000, channels: 1, bitrate: 48, cbr: true, layer: 3 });
    expect(fs.readFileSync(outFile).subarray(0, 3).toString('latin1')).not.toBe('ID3');
    // The same input gives the same bytes.
    const again = testInfo.outputPath('again.mp3');
    await processAudio({ wavFile, outFile: again, loudness: ENC.loudness, mp3: ENC.mp3 });
    expect(fs.readFileSync(again).equals(fs.readFileSync(outFile))).toBe(true);
  });

  test('render: a stand-in synthesiser renders a small script that the lint passes; re-runs render only what changed', async ({}, testInfo) => {
    test.skip(!hasFfmpeg, 'ffmpeg is not installed');
    const out = testInfo.outputPath('voice'), cache = testInfo.outputPath('cache');
    const mm = clone(m); mm.guide.voice.say = { '3HUE': 'three hue' };
    const mfile = writeJson(testInfo.outputPath('m.json'), mm);
    const tour = {
      version: 1, start: 'a', chapters: [{ id: 'c', entry: 'a', title: '{str:legend}' }],
      nodes: { a: { chapter: 'c', scene: 'rest', end: true, lines: [
        { id: 'l-ref', ref: 'lobby.heading' },
        { id: 'l-say', text: '{guide} walks you through 3HUE.', say: '{guide} walks you through 3HUE, step by step.', source: 'test', status: 'approved-copy' },
        { id: 'l-door', ref: 'doors.@.promise' },
      ] } },
      ask: { intro: { id: 'l-intro', ref: 'lobby.eyebrow' }, questions: [] },
    };
    const tfile = writeJson(testInfo.outputPath('tour.json'), tour);
    const calls = [];
    const errs = [];
    const deps = { synthesize: fakeSynth(calls), credentials: { key: 'unused', region: 'unused', missing: [] }, pace: async () => {}, log: () => {}, err: (x) => errs.push(x) };
    const opts = (...extra) => parseArgs(['--manifest', mfile, '--tour', tfile, '--out', out, '--cache', cache, ...extra]);
    const keys = ['l-ref', 'l-say', ...m.doors.map((d) => `l-door--${d.id}`), 'l-intro'].sort();

    await test.step('first render: every line, through the service', async () => {
      expect(await render(opts(), deps)).toBe(0);
      expect(calls.length).toBe(keys.length);
      const vm = readJson(path.relative(ROOT, path.join(out, 'manifest.json')));
      expect(Object.keys(vm.items)).toEqual(keys);
      expect(vm).toMatchObject({ v: 1, provider: 'azure', voice: 'en-US-AvaNeural', format: { codec: 'mp3', sampleRate: 24000, bitrate: 48, channels: 1 }, totals: { items: keys.length } });
      const ctx = await loadScript({ manifest: mfile, tour: tfile, out, cache });
      for (const it of ctx.items) {
        const j = JSON.parse(fs.readFileSync(path.join(out, `${it.key}.json`), 'utf8'));
        expect(checkTiming(j, { key: it.key, text: it.text }), it.key).toEqual([]);
        expect(j.hash).toBe(it.hash);
        expect(vm.items[it.key]).toMatchObject({ hash: it.hash, lineHash: it.lineHash, line: it.id, kind: it.kind });
        expect(parseMp3(fs.readFileSync(path.join(out, `${it.key}.mp3`)))).toMatchObject({ sampleRate: 24000, channels: 1, bitrate: 48 });
      }
      // The say line is spoken through the pronunciation entry and timed on its caption.
      expect(calls.find((c) => c.includes('step by step'))).toContain('<sub alias="three hue">3HUE</sub>');
      const sayJson = JSON.parse(fs.readFileSync(path.join(out, 'l-say.json'), 'utf8'));
      const cap = ctx.items.find((i) => i.key === 'l-say').text;
      expect(sayJson.words.filter((w) => w[2] === 'hue').map((w) => cap.slice(w[3], w[4]))).toEqual(['3HUE']);
      const lint = await lintVoice({ manifest: mfile, tour: tfile, voiceDir: out });
      expect(lint.errors).toEqual([]);
      expect(lint.counts).toMatchObject({ expected: keys.length, current: keys.length, stale: 0, missing: 0, orphans: 0 });
    });

    await test.step('a re-run renders nothing and rewrites nothing', async () => {
      const before = fs.readFileSync(path.join(out, 'manifest.json'), 'utf8');
      calls.length = 0;
      expect(await render(opts(), deps)).toBe(0);
      expect(calls.length).toBe(0);
      expect(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')).toBe(before);
    });

    await test.step('one edited line re-renders alone; the lint calls the old file stale until then', async () => {
      const t2 = clone(tour); t2.nodes.a.lines[1].say = '{guide} walks you through 3HUE, one step at a time.';
      writeJson(tfile, t2);
      const stale = await lintVoice({ manifest: mfile, tour: tfile, voiceDir: out });
      expect(stale.errors).toEqual([]);
      expect(stale.warnings.join('\n')).toMatch(/l-say .* is stale: its words changed/);
      const strict = clone(mm); strict.guide.voice.required = true;
      const sfile = writeJson(testInfo.outputPath('m-strict.json'), strict);
      expect((await lintVoice({ manifest: sfile, tour: tfile, voiceDir: out })).errors.join('\n')).toMatch(/l-say .* is stale/);
      calls.length = 0;
      expect(await render(opts(), deps)).toBe(0);
      expect(calls.length).toBe(1);
      expect(calls[0]).toContain('one step at a time');
      expect((await lintVoice({ manifest: mfile, tour: tfile, voiceDir: out })).errors).toEqual([]);
    });

    await test.step('an encoding change re-encodes from the cache with no request; orphans are pruned', async () => {
      const lower = clone(mm); lower.guide.voice.loudness = { I: -20 };
      const lfile = writeJson(testInfo.outputPath('m-lower.json'), lower);
      fs.copyFileSync(TINY, path.join(out, 'gone-line.mp3'));
      calls.length = 0;
      expect(await render({ ...opts(), manifest: lfile }, deps)).toBe(0);
      expect(calls.length).toBe(0);
      expect(fs.existsSync(path.join(out, 'gone-line.mp3'))).toBe(false);
      const lint = await lintVoice({ manifest: lfile, tour: tfile, voiceDir: out });
      expect(lint.errors).toEqual([]);
      expect(lint.counts.current).toBe(keys.length);
    });

    await test.step('the lint refuses broken files whatever guide.voice.required says', async () => {
      const lfile = testInfo.outputPath('m-lower.json');
      const jf = path.join(out, 'l-ref.json');
      const j = JSON.parse(fs.readFileSync(jf, 'utf8'));
      j.words = [...j.words].reverse();
      fs.writeFileSync(jf, JSON.stringify(j));
      fs.writeFileSync(path.join(out, 'l-intro.mp3'), Buffer.concat([fs.readFileSync(path.join(out, 'l-intro.mp3')), Buffer.alloc(10)]));
      const { errors } = await lintVoice({ manifest: lfile, tour: tfile, voiceDir: out });
      expect(errors.join('\n')).toMatch(/l-ref\.json: words\[1\] starts at/);
      expect(errors.join('\n')).toMatch(/l-intro\.mp3 is \d+ bytes, manifest\.json says \d+/);
    });

    await test.step('--reencode never calls the service', async () => {
      fs.rmSync(cache, { recursive: true, force: true });
      const t3 = clone(tour); t3.nodes.a.lines[0].ref = 'lobby.subline';
      writeJson(tfile, t3);
      calls.length = 0;
      expect(await render(opts('--reencode'), deps)).toBe(1);
      expect(calls.length).toBe(0);
      expect(errs.join('\n')).toMatch(/No cached raw audio for l-ref.*; run without --reencode/);
    });
  });

  test('lint: missing audio is a warning while guide.voice.required is false and an error once it is true', async ({}, testInfo) => {
    const empty = testInfo.outputPath('voice');
    const draft = clone(m); draft.guide.voice.required = false;
    const d = await lintVoice({ manifest: writeJson(testInfo.outputPath('m-draft.json'), draft), tour: FIXTURE, voiceDir: empty });
    expect(d.errors).toEqual([]);
    expect(d.warnings.join('\n')).toMatch(/no .*manifest\.json yet, so all \d+ voice files run captions-only .*\(guide\.voice\.required is false\)/);
    const strict = clone(m); strict.guide.voice.required = true;
    const s = await lintVoice({ manifest: writeJson(testInfo.outputPath('m-strict.json'), strict), tour: FIXTURE, voiceDir: empty });
    expect(s.errors.join('\n')).toMatch(/no .*manifest\.json yet, so all \d+ voice files run captions-only/);
    // The repository as it stands: the lint passes (npm run lint).
    const r = tool(['tools/voice/lint.mjs'], cleanEnv(testInfo.outputPath('home')));
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toMatch(/0 errors/);
  });

  test('service calls: throttling and transient errors retry with backoff, others fail at once; requests are paced', async () => {
    const waits = [];
    const sleep = async (ms) => { waits.push(ms); };
    let n = 0;
    const flaky = async () => { n++; if (n < 3) throw new SpeechError('busy', { code: 'TooManyRequests', retryable: true }); return 'ok'; };
    expect(await withRetries(flaky, { sleep, baseMs: 100 })).toBe('ok');
    expect(n).toBe(3);
    expect(waits.length).toBe(2);
    expect(waits[1]).toBeGreaterThan(waits[0]);
    n = 0;
    await expect(withRetries(async () => { n++; throw new SpeechError('bad key', { code: 'AuthenticationFailure' }); }, { sleep })).rejects.toThrow('bad key');
    expect(n).toBe(1);
    n = 0;
    await expect(withRetries(async () => { n++; throw new SpeechError('busy', { code: 'ServiceUnavailable', retryable: true }); }, { sleep, retries: 3 })).rejects.toThrow('busy');
    expect(n).toBe(4);
    let clock = 0;
    const slept = [];
    const wait = pacer(30, () => clock, async (ms) => { slept.push(ms); clock += ms; });
    await wait(); await wait(); await wait();
    expect(slept).toEqual([2000, 2000]);
  });
});
