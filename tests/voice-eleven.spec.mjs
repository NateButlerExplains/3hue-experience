// The ElevenLabs voice build (O12, O13, tools/voice/): no browser, no key, no network. The real
// alignment fixture (saved by build.mjs --check) to word events to the timing file; plain text with
// aliases and its map back to the caption; PCM to WAV; errors, retries, the MP3 fallback and
// redaction; items per guide (a pinned line once, every other line and every Ask line in both
// voices); the v2 hash; the dry run's characters and credits per guide; a render through the
// adapter with an injected fetch that the voice lint then passes, and the quota and a refused key
// stopping it; --check, in process with an injected fetch and as a command without a key; the A/B
// listening test. Every file a test writes goes under its own test-results output directory.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, manifest as m, readJson } from './helpers.mjs';
import { buildPlain, plainBillable } from '../tools/voice/plain.mjs';
import { lexiconSpans, timingJson } from '../tools/voice/ssml.mjs';
import { alignmentEvents, httpError, synthesize, getVoice, getSubscription, creditsFor, FALLBACK_FORMAT } from '../tools/voice/elevenlabs.mjs';
import { pcmToWav, makeWav, wavInfo, parseMp3, toolVersion, ffmpeg } from '../tools/voice/audio.mjs';
import { voiceItems, guideVoices, voiceSettings } from '../tools/voice/items.mjs';
import { speechHash, audioHash } from '../tools/voice/hash.mjs';
import { redact, readEnvFile, loadElevenCredentials, describe as describeCreds, ELEVEN_KEY, ELEVEN_KEY_ALT, KEY, REGION } from '../tools/voice/env.mjs';
import { parseArgs, dryRun, render, check, abTest, loadScript, writeVoiceManifest, readVoiceManifest, AB_LINES, AB_AVI } from '../tools/voice/build.mjs';
import { lintVoice, checkTiming, loudnessSpread } from '../tools/voice/lint.mjs';
import { withRetries } from '../tools/voice/azure.mjs';
import { providerOf } from '../tools/voice/providers.mjs';

const FX = 'tests/fixtures/voice/eleven-alignment.json';
const MP3 = path.join(ROOT, 'tests/fixtures/voice/one-second.mp3');
const clone = (x) => structuredClone(x);
const hasFfmpeg = !!(await toolVersion(ffmpeg()));
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 1)); return f; };
// A throwaway home, so the run never reads the developer's own ~/.env. os.homedir() prefers
// USERPROFILE on Windows and HOME elsewhere, and falls back to HOMEDRIVE+HOMEPATH, so all of them
// have to point at the temporary directory or the test passes or fails by whose machine it is on.
const cleanEnv = (home, extra = {}) => {
  const e = { ...process.env, HOME: home, USERPROFILE: home, ...extra };
  delete e.HOMEDRIVE; delete e.HOMEPATH;
  for (const n of [KEY, REGION, ELEVEN_KEY, ELEVEN_KEY_ALT]) if (!(n in extra)) delete e[n];
  return e;
};
const SECRET = 'sk_test_0123456789abcdef0123456789abcdef01234567';   // a stand-in key, never a real one
const noWait = { pace: async () => {}, sleep: async () => {} };

// A Response-shaped reply.
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)), headers: { get: (n) => (n === 'request-id' ? 'req-test' : null) } });

// A stand-in for the ElevenLabs API: /with-timestamps answers with raw 24 kHz 16-bit PCM (a tone
// burst per character, silence for spaces) and the character alignment of exactly the text sent;
// /voices and /user/subscription answer as the real service does. `fail(n, url, body)` may
// return {status, body} to answer the n-th call with an error instead.
function fakeEleven(calls, { fail = () => null, used = () => 1000 } = {}) {
  return async (url, init = {}) => {
    const u = new URL(url);
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: u.href, path: u.pathname, query: Object.fromEntries(u.searchParams), method: init.method, headers: init.headers, body });
    const f = fail(calls.length, u, body);
    if (f) return reply(f.status, f.body);
    if (u.pathname === '/v1/user/subscription') return reply(200, { tier: 'starter', status: 'active', character_count: used(), character_limit: 40000, next_character_count_reset_unix: 1791763200 });
    if (u.pathname.startsWith('/v1/voices/')) return reply(200, { voice_id: decodeURIComponent(u.pathname.split('/').pop()), name: 'Stand-in voice', category: 'generated' });
    const chars = [...body.text], sr = 24000, lead = 0.25, tail = 0.3;
    const starts = [], ends = [];
    let t = lead;
    for (const c of chars) { const d = /\s/.test(c) ? 0.03 : 0.055; starts.push(Math.round(t * 1000) / 1000); t += d; ends.push(Math.round(t * 1000) / 1000); }
    const s = new Float32Array(Math.round((t + tail) * sr));
    chars.forEach((c, k) => { if (/\s/.test(c)) return; const a = Math.round(starts[k] * sr), b = Math.round(ends[k] * sr); for (let i = a; i < b; i++) s[i] = 0.25 * Math.sin((2 * Math.PI * 200 * i) / sr); });
    const pcm = makeWav(s, sr).subarray(44);
    return reply(200, { audio_base64: pcm.toString('base64'), alignment: { characters: chars, character_start_times_seconds: starts, character_end_times_seconds: ends }, normalized_alignment: null });
  };
}

test.describe('T-02 ElevenLabs voices (O13, no browser)', () => {
  test('the real alignment fixture: characters to word events to the timing file, every word placed, each alias on its term', () => {
    const fx = readJson(FX);
    expect(fx.cases.map((c) => c.guide).sort()).toEqual(Object.keys(m.guide.guides).sort());
    for (const c of fx.cases) {
      expect(JSON.stringify(c), 'the fixture carries text and timings only').not.toMatch(/xi-api-key|sk_[a-z0-9]{20,}/i);
      const b = buildPlain(c.caption, { lexicon: c.lexicon });
      expect(b.request, c.guide).toBe(c.request);
      expect(c.alignment.characters.join(''), 'the alignment is over exactly the text sent').toBe(c.request);
      const ev = alignmentEvents(c.alignment, b);
      expect(ev.every((e) => e.type === 'WordBoundary' && Number.isInteger(e.offset) && e.duration >= 0)).toBe(true);
      expect(ev.map((e) => e.offset)).toEqual([...ev.map((e) => e.offset)].sort((x, y) => x - y));
      const { json, coverage } = timingJson({ id: `check-${c.guide}`, hash: 'abcdefabcdef', voice: c.voice, text: c.caption, built: b, events: ev, duration: c.duration });
      expect(coverage, c.guide).toBeGreaterThanOrEqual(0.9);
      expect(checkTiming(json, { key: `check-${c.guide}`, text: c.caption })).toEqual([]);
      const on = (word) => json.words.filter((w) => w[2] === word).map((w) => c.caption.slice(w[3], w[4]));
      // Each replaced term is one word, timed from its alias's first sound to its last, on the term.
      for (const term of Object.keys(c.lexicon)) expect(on(term), term).toEqual([term]);
      expect(on(m.guide.guides[c.guide].name)).toEqual([m.guide.guides[c.guide].name]);
      expect(json.words.map((w) => w[2])).toEqual(["I'm", m.guide.guides[c.guide].name, '3HUE', 'runs', 'on', 'AiVRIC', 'and', 'SOC 2', 'starts', 'here']);
      const last = json.words.at(-1);
      expect(last[0] + last[1]).toBeLessThanOrEqual(c.duration + 0.05);
      // Without the alias map (or when the characters are not the text sent), words are still found by their letters.
      const loose = timingJson({ id: 'x', hash: 'h', voice: 'v', text: c.caption, built: b, events: alignmentEvents(c.alignment), duration: c.duration });
      expect(loose.coverage).toBeGreaterThanOrEqual(0.9);
    }
  });

  test('plain text: whole-word aliases, every request character maps back to the caption, billed in code points', () => {
    const lex = { '3HUE': 'three hue', 'SOC 2': 'sock two', AiVRIC: 'av-RICK' };
    const text = `3HUE's SOC 2 plan runs on AiVRIC; x3HUE and SOC 20 stay${String.fromCharCode(7)}put.`;
    const b = buildPlain(text, { lexicon: lex });
    expect(b.request).toBe("three hue's sock two plan runs on av-RICK; x3HUE and SOC 20 stay put.");
    expect(b.used).toEqual({ '3HUE': 'three hue', 'SOC 2': 'sock two', AiVRIC: 'av-RICK' });
    expect(b.spans).toEqual(lexiconSpans(text, lex));   // the same terms the SSML path replaces
    for (const a of b.aliases) {
      expect(b.request.slice(a.start, a.end)).toBe(a.alias);
      expect(b.plainRange(a.start, a.end)).toEqual([a.span.start, a.span.end]);
      for (let k = a.start; k < a.end; k++) expect(b.toPlain(k)).toBe(a.span.start);
    }
    // Outside the aliases every character is itself.
    const tail = b.request.indexOf(' plan');
    for (let k = tail; k < tail + 5; k++) expect(text[b.toPlain(k)]).toBe(b.request[k]);
    expect(b.plainRange(b.request.indexOf('hue\'s'), b.request.indexOf('hue\'s') + 5)).toEqual([0, 6]);
    expect(b.toPlain(-1)).toBe(-1);
    expect(b.toPlain(b.request.length)).toBe(-1);
    expect(b.billable).toBe([...b.request].length);
    expect(plainBillable(String.fromCodePoint(0x1f600))).toBe(1);
    expect(buildPlain('No terms here.', { lexicon: lex }).request).toBe('No terms here.');
  });

  test('PCM to WAV: the same samples under a 24 kHz 16-bit mono header; a half sample is dropped', () => {
    const s = Float32Array.from({ length: 2400 }, (_, i) => Math.sin(i / 10) * 0.5);
    const pcm = makeWav(s).subarray(44);
    const wav = pcmToWav(pcm);
    expect(wavInfo(wav)).toMatchObject({ audioFormat: 1, channels: 1, sampleRate: 24000, bitsPerSample: 16, samples: 2400, dataOffset: 44, dataBytes: 4800 });
    expect(wavInfo(wav).duration).toBeCloseTo(0.1, 6);
    expect(wav.subarray(44).equals(pcm)).toBe(true);
    expect(wav.equals(makeWav(s)), 'byte for byte what makeWav writes').toBe(true);
    expect(wavInfo(pcmToWav(Buffer.concat([pcm, Buffer.from([1])]))).dataBytes).toBe(4800);
    expect(wavInfo(pcmToWav(pcm, { sampleRate: 16000 })).sampleRate).toBe(16000);
  });

  test('errors: 429 and 5xx retry, the quota and the key stop, the format falls back to MP3; no message ever carries the key', async () => {
    const e = (status, body) => httpError(status, typeof body === 'string' ? body : JSON.stringify(body), { key: SECRET, what: 'text-to-speech' });
    expect(e(429, { detail: { status: 'too_many_concurrent_requests', message: 'busy' } })).toMatchObject({ code: 'TooManyRequests', retryable: true, status: 429 });
    expect(e(503, 'upstream down')).toMatchObject({ code: 'ServiceError', retryable: true });
    expect(e(401, { detail: { status: 'quota_exceeded', message: 'This request exceeds your quota of 40000. You have 12 credits remaining.' } })).toMatchObject({ code: 'QuotaExceeded', retryable: false });
    expect(e(429, { detail: { status: 'quota_exceeded', message: 'quota' } }).code).toBe('QuotaExceeded');
    expect(e(401, { detail: { status: 'invalid_api_key', message: 'Invalid API key' } })).toMatchObject({ code: 'AuthenticationFailure', retryable: false });
    expect(e(401, { detail: { status: 'missing_permissions', message: 'The API key you used is missing the permission user_read' } }).code).toBe('PermissionDenied');
    expect(e(403, { detail: { status: 'output_format_not_allowed', message: 'pcm_24000 is not available on your plan' } }).code).toBe('FormatNotAllowed');
    const v = e(422, { detail: [{ loc: ['body', 'voice_settings', 'stability'], msg: 'must be 0.0, 0.5 or 1.0' }] });
    expect(v).toMatchObject({ code: 'BadRequest', retryable: false });
    expect(v.message).toContain('body.voice_settings.stability: must be 0.0, 0.5 or 1.0');
    // The key, echoed anywhere or sent as a header, never reaches a message.
    const leak = e(400, `bad request for ${SECRET}; headers {"xi-api-key": "${SECRET}", "xi-api-key":"zzzzzzzz"}`);
    expect(leak.message).not.toContain(SECRET);
    expect(leak.message).not.toContain('zzzzzzzz');
    expect(redact(`xi-api-key: abcdefgh1234; XI-API-KEY=qwerty5678`)).toBe('xi-api-key: [redacted]; XI-API-KEY=[redacted]');
    // A network failure names no key and retries.
    const down = await synthesize({ text: 'Hi.', voiceId: 'v', modelId: 'eleven_multilingual_v2', key: SECRET, fetchImpl: async () => { throw new Error(`connect ECONNREFUSED (key ${SECRET})`); } }).catch((x) => x);
    expect(down).toMatchObject({ code: 'ConnectionFailure', retryable: true });
    expect(down.message).not.toContain(SECRET);
    // Throttled twice, then through, by withRetries.
    const calls = [];
    const ok = fakeEleven(calls, { fail: (n) => (n <= 2 ? { status: 429, body: { detail: { status: 'system_busy', message: 'busy' } } } : null) });
    const waits = [];
    const res = await withRetries(() => synthesize({ text: 'Hello there.', voiceId: 'voice-a', modelId: 'eleven_multilingual_v2', voiceSettings: { stability: 0.5 }, seed: 7, key: SECRET, fetchImpl: ok }), { sleep: async (ms) => waits.push(ms), baseMs: 10 });
    expect(calls).toHaveLength(3);
    expect(waits).toHaveLength(2);
    expect(wavInfo(res.audio)).toMatchObject({ sampleRate: 24000, channels: 1, bitsPerSample: 16 });
    expect(res).toMatchObject({ format: 'pcm_24000', fellBack: false, requestId: 'req-test' });
    // The request: the documented endpoint and query, the key as xi-api-key, only what is set in the body.
    const c = calls.at(-1);
    expect(c).toMatchObject({ method: 'POST', path: '/v1/text-to-speech/voice-a/with-timestamps', query: { output_format: 'pcm_24000' } });
    expect(c.headers['xi-api-key']).toBe(SECRET);
    expect(c.body).toEqual({ text: 'Hello there.', model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5 }, seed: 7 });
    // Voice and plan lookups: a key limited to text-to-speech is not an error; a bad key is.
    const limited = async () => reply(401, { detail: { status: 'missing_permissions', message: 'missing voices_read' } });
    expect(await getVoice('voice-a', { key: SECRET, fetchImpl: limited })).toMatchObject({ ok: false, permitted: false });
    expect(await getSubscription({ key: SECRET, fetchImpl: limited })).toMatchObject({ ok: false, permitted: false });
    await expect(getSubscription({ key: SECRET, fetchImpl: async () => reply(401, { detail: { status: 'invalid_api_key', message: 'no' } }) })).rejects.toMatchObject({ code: 'AuthenticationFailure' });
    expect(await getVoice('voice-a', { key: SECRET, fetchImpl: fakeEleven([]) })).toMatchObject({ ok: true, name: 'Stand-in voice', category: 'generated' });
  });

  test('the MP3 fallback: a plan that refuses PCM gets mp3_44100_128, decoded with ffmpeg to the same WAV, and says so', async ({}, testInfo) => {
    test.skip(!hasFfmpeg, 'ffmpeg is not installed');
    const calls = [];
    const mp3 = fs.readFileSync(MP3);
    const fetchImpl = async (url, init) => {
      const u = new URL(url);
      calls.push(u.searchParams.get('output_format'));
      if (u.searchParams.get('output_format') === 'pcm_24000') return reply(403, { detail: { status: 'output_format_not_allowed', message: 'pcm_24000 requires a higher tier' } });
      return reply(200, { audio_base64: mp3.toString('base64'), alignment: { characters: [...'Hi.'], character_start_times_seconds: [0.1, 0.2, 0.3], character_end_times_seconds: [0.2, 0.3, 0.35] } });
    };
    const res = await synthesize({ text: 'Hi.', voiceId: 'v', modelId: 'eleven_multilingual_v2', key: SECRET, fetchImpl, tmpDir: testInfo.outputPath('tmp') });
    expect(calls).toEqual(['pcm_24000', FALLBACK_FORMAT]);
    expect(res).toMatchObject({ format: FALLBACK_FORMAT, fellBack: true });
    const info = wavInfo(res.audio);
    expect(info).toMatchObject({ sampleRate: 24000, channels: 1, bitsPerSample: 16 });
    expect(info.duration).toBeGreaterThan(0.9);
  });

  test('items per guide: a pinned line once in its guide\'s voice, every other line and every Ask line in both, {guide} naming the speaker', async () => {
    const t = {
      version: 1, start: 'a', chapters: [{ id: 'c', entry: 'a', title: 'C' }],
      nodes: { a: { chapter: 'c', scene: 'rest', end: true, lines: [
        { id: 'p-huey', who: 'huey', text: 'Hi, I am {guide}.', source: 's', status: 'approved-copy' },
        { id: 'p-avi', who: 'avi', text: 'This is {guide:huey}.', source: 's', status: 'approved-copy' },
        { id: 'u-lead', text: '{guide} will take it from here.', source: 's', status: 'approved-copy' },
        { id: 'u-door', ref: 'doors.@.promise' },
        { id: 'p-door', who: 'huey', ref: 'doors.@.title' },
      ] } },
      ask: { intro: { id: 'ask-intro', who: 'huey', text: 'Ask {guide} anything.', source: 's', status: 'approved-copy' }, questions: [{ id: 'q', q: 'Q?', lines: [{ id: 'q-1', text: 'An answer from {guide}.', source: 's', status: 'approved-copy' }] }] },
    };
    const { items, problems } = await voiceItems(t, m);
    expect(problems).toEqual([]);
    const by = Object.fromEntries(items.map((i) => [i.key, i]));
    const doors = m.doors.map((d) => d.id);
    expect(items.map((i) => i.key)).toEqual([
      'huey/p-huey', 'avi/p-avi', 'avi/u-lead', 'huey/u-lead',
      ...doors.map((d) => `avi/u-door--${d}`), ...doors.map((d) => `huey/u-door--${d}`), ...doors.map((d) => `huey/p-door--${d}`),
      'avi/ask-intro', 'huey/ask-intro', 'avi/q-1', 'huey/q-1',
    ]);
    expect(by['huey/p-huey']).toMatchObject({ guide: 'huey', who: 'huey', text: 'Hi, I am Huey.' });
    expect(by['avi/p-avi']).toMatchObject({ guide: 'avi', who: 'avi', text: 'This is Huey.' });
    expect([by['avi/u-lead'].text, by['huey/u-lead'].text]).toEqual(['Avi will take it from here.', 'Huey will take it from here.']);
    expect(by['avi/u-lead'].lineHash).not.toBe(by['huey/u-lead'].lineHash);
    expect(by[`avi/u-door--${doors[0]}`].lineHash, 'no {guide}: the same words, the same line hash').toBe(by[`huey/u-door--${doors[0]}`].lineHash);
    expect([by['avi/ask-intro'].text, by['huey/ask-intro'].text], 'Ask speaks in the lead\'s voice, so it is never pinned').toEqual(['Ask Avi anything.', 'Ask Huey anything.']);
    expect([by['avi/q-1'].kind, by['huey/q-1'].kind]).toEqual(['faq', 'faq']);
    // A pin to no guide is a problem, not a silent miss.
    const bad = clone(t); bad.nodes.a.lines[0].who = 'ava';
    expect((await voiceItems(bad, m)).problems.map((p) => p.message)).toEqual(['who is "ava", not a guide (avi, huey)']);
    // Each guide's settings: its own voice, model, settings and seed over what both share.
    const { ids, byGuide } = guideVoices(m);
    expect(ids).toEqual(['avi', 'huey']);
    for (const g of ids) expect(byGuide[g]).toMatchObject({ guide: g, provider: 'elevenlabs', voice: m.guide.guides[g].voice.name, model: m.guide.guides[g].voice.model, voiceSettings: m.guide.guides[g].voice.settings, seed: m.guide.guides[g].voice.seed, format: 'pcm_24000', lexicon: m.guide.voice.say, locale: 'en-US' });
    expect(voiceSettings(m).guide, 'no id: the lead').toBe('avi');
  });

  test('speechHash v2: provider, voice, model, settings, seed, format, normalisation, the aliases used and the text sent', () => {
    const base = { provider: 'elevenlabs', voice: 'PAdXflgOFROGTlJEdlSu', model: 'eleven_multilingual_v2', settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1 }, seed: 7, format: 'pcm_24000', normalization: null, lexicon: { '3HUE': 'three hue' }, text: 'Welcome to 3HUE.' };
    const s0 = speechHash(base);
    // Golden values: if these move, every ElevenLabs take is asked for again. Change HASH_VERSION_2 on purpose only.
    expect(s0).toBe('c0522899b6e2268074b7df618767b704d7240ae3616ee570b1a9ba92459136e5');
    expect(audioHash(s0, { mp3: { sampleRate: 24000, bitrate: 48, channels: 1 }, loudness: { I: -18, TP: -1.5, LRA: 11 } })).toBe('cf246d029a18');
    for (const change of [{ voice: 'd9DA0yC1x1RCfpwZPDMM' }, { model: 'eleven_v3' }, { settings: { ...base.settings, stability: 0.6 } }, { seed: 8 }, { seed: null }, { format: 'mp3_44100_128' }, { normalization: 'off' }, { lexicon: { '3HUE': 'three hues' } }, { text: 'Welcome to 3HUE!' }]) {
      expect(speechHash({ ...base, ...change }), JSON.stringify(change)).not.toBe(s0);
    }
    // Key order, an entry the text does not use, Azure-only fields and 'auto' normalisation change nothing.
    expect(speechHash({ ...base, settings: { speed: 1, use_speaker_boost: true, style: 0, similarity_boost: 0.75, stability: 0.5 } })).toBe(s0);
    expect(speechHash({ ...base, lexicon: { ...base.lexicon, vCISO: 'vee-see-so' } })).toBe(s0);
    expect(speechHash({ ...base, locale: 'en-GB', rate: 10, normalization: 'auto' })).toBe(s0);
  });

  test('dry run: billable characters and credits per guide, a pinned line counted once, the plan\'s month as the yardstick', async ({}, testInfo) => {
    const t = { version: 1, start: 'a', chapters: [{ id: 'c', entry: 'a', title: 'C' }], nodes: { a: { chapter: 'c', scene: 'rest', end: true, lines: [
      { id: 'one', who: 'huey', text: 'Only Huey says 3HUE here.', source: 's', status: 'approved-copy' },
      { id: 'two', text: 'Both of us say SOC 2.', source: 's', status: 'approved-copy' },
    ] } }, ask: { questions: [] } };
    const tfile = writeJson(testInfo.outputPath('tour.json'), t);
    const out = testInfo.outputPath('voice'), cache = testInfo.outputPath('cache');
    const res = await dryRun(parseArgs(['--dry-run', '--tour', tfile, '--out', out, '--cache', cache]));
    const bill = (s) => buildPlain(s, { lexicon: m.guide.voice.say }).billable;
    expect(res.summary.guides.avi).toMatchObject({ provider: 'elevenlabs', model: 'eleven_multilingual_v2', files: 1, render: { items: 1, requests: 1, billable: bill('Both of us say SOC 2.'), credits: bill('Both of us say SOC 2.') } });
    expect(res.summary.guides.huey.render).toMatchObject({ items: 2, billable: bill('Only Huey says 3HUE here.') + bill('Both of us say SOC 2.') });
    expect(res.summary.render.credits).toBe(res.summary.guides.avi.render.credits + res.summary.guides.huey.render.credits);
    // A half-price model halves that guide's credits.
    const flash = clone(m); flash.guide.guides.huey.voice.model = 'eleven_flash_v2_5';
    const r2 = await dryRun(parseArgs(['--dry-run', '--manifest', writeJson(testInfo.outputPath('m-flash.json'), flash), '--tour', tfile, '--out', out, '--cache', cache]));
    expect(r2.summary.guides.huey.render.credits).toBe(creditsFor(bill('Only Huey says 3HUE here.'), 'eleven_flash_v2_5') + creditsFor(bill('Both of us say SOC 2.'), 'eleven_flash_v2_5'));
    expect(creditsFor(25, 'eleven_flash_v2_5')).toBe(13);
    // The command: a line per guide, the credits against the plan's month, a warning past it.
    const tiny = clone(m); tiny.guide.voice.budget = { credits: 10 };
    const cli = spawnSync(process.execPath, ['tools/voice/build.mjs', '--dry-run', '--manifest', writeJson(testInfo.outputPath('m-tiny.json'), tiny), '--tour', tfile, '--out', out, '--cache', cache], { cwd: ROOT, env: cleanEnv(testInfo.outputPath('home')), encoding: 'utf8' });
    expect(cli.status, cli.stdout + cli.stderr).toBe(0);
    expect(cli.stdout).toMatch(/^ {2}avi\s+1 file; to render 1 file, \d+ billable characters = \d+ credits/m);
    expect(cli.stdout).toMatch(/^ {2}huey\s+2 files; to render 2 files/m);
    expect(cli.stdout).toMatch(/To render: 3 files, 3 requests to the speech service, \d+ billable characters, \d+ ElevenLabs credits \([\d.]+% of the plan's 10 a month\)/);
    expect(cli.stdout).toMatch(/budget warning: this render needs \d+ ElevenLabs credits, more than the plan's 10 a month/);
    // --guide narrows the render to one voice.
    const one = await dryRun(parseArgs(['--dry-run', '--tour', tfile, '--out', out, '--cache', cache, '--guide', 'huey']));
    expect(one.scoped.map((r) => r.key)).toEqual(['huey/one', 'huey/two']);
  });

  test('render: the ElevenLabs adapter with an injected fetch writes per-guide files and a v2 manifest that the voice lint passes; a re-run asks for nothing', async ({}, testInfo) => {
    test.skip(!hasFfmpeg, 'ffmpeg is not installed');
    const out = testInfo.outputPath('voice'), cache = testInfo.outputPath('cache');
    const t = { version: 1, start: 'a', chapters: [{ id: 'c', entry: 'a', title: 'C' }], nodes: { a: { chapter: 'c', scene: 'rest', end: true, lines: [
      { id: 'hello', who: 'avi', text: "Welcome to 3HUE. I'm {guide}.", source: 's', status: 'approved-copy' },
      { id: 'both', text: '{guide} runs this on AiVRIC, SOC 2 first.', source: 's', status: 'approved-copy' },
      { id: 'door', ref: 'doors.@.promise' },
    ] } }, ask: { intro: { id: 'ask-intro', text: 'Ask {guide}.', source: 's', status: 'approved-copy' }, questions: [] } };
    const tfile = writeJson(testInfo.outputPath('tour.json'), t);
    const calls = [], logs = [];
    const deps = { fetchImpl: fakeEleven(calls), credentials: { key: SECRET, missing: [] }, ...noWait, log: (x) => logs.push(x), err: (x) => logs.push(x) };
    const opts = (...extra) => parseArgs(['--tour', tfile, '--out', out, '--cache', cache, ...extra]);
    const doors = m.doors.map((d) => d.id);
    const keys = ['avi/hello', 'avi/both', 'huey/both', ...doors.map((d) => `avi/door--${d}`), ...doors.map((d) => `huey/door--${d}`), 'avi/ask-intro', 'huey/ask-intro'].sort();
    expect(await render(opts(), deps), logs.join('\n')).toBe(0);
    expect(calls).toHaveLength(keys.length);
    for (const c of calls) { expect(c.headers['xi-api-key']).toBe(SECRET); expect(c.query.output_format).toBe('pcm_24000'); expect(c.body).toMatchObject({ model_id: 'eleven_multilingual_v2', seed: 7, voice_settings: m.guide.guides.avi.voice.settings }); }
    // Each guide's lines went to its own voice, with the aliases in the text sent.
    const sent = (voice) => calls.filter((c) => c.path.includes(`/${voice}/`)).map((c) => c.body.text);
    expect(sent(m.guide.guides.avi.voice.name)).toContain("Welcome to three hue. I'm Avi.");
    expect(sent(m.guide.guides.huey.voice.name)).toContain('Huey runs this on av-RICK, sock two first.');
    expect(sent(m.guide.guides.huey.voice.name).some((x) => x.includes("I'm Avi")), 'the pinned line is Avi\'s alone').toBe(false);
    const vm = readVoiceManifest(out);
    expect(vm).toMatchObject({ v: 2, locale: 'en-US', format: { codec: 'mp3', sampleRate: 24000, bitrate: 48, channels: 1 } });
    expect(Object.keys(vm.guides)).toEqual(['avi', 'huey']);
    for (const g of ['avi', 'huey']) expect(vm.guides[g]).toEqual({ name: m.guide.guides[g].name, provider: 'elevenlabs', voice: m.guide.guides[g].voice.name, model: 'eleven_multilingual_v2', settings: m.guide.guides[g].voice.settings, seed: 7, format: 'pcm_24000' });
    expect(Object.keys(vm.items)).toEqual(keys);
    expect(vm.totals.guides.avi.items + vm.totals.guides.huey.items).toBe(keys.length);
    for (const k of keys) {
      expect(vm.items[k].guide).toBe(k.split('/')[0]);
      expect(fs.existsSync(path.join(out, `${k}.mp3`)) && fs.existsSync(path.join(out, `${k}.json`)), k).toBe(true);
      expect(parseMp3(fs.readFileSync(path.join(out, `${k}.mp3`)))).toMatchObject({ sampleRate: 24000, channels: 1, bitrate: 48, cbr: true });
    }
    // A term said through its alias is timed on the caption's term.
    const j = JSON.parse(fs.readFileSync(path.join(out, 'huey/both.json'), 'utf8'));
    expect(j.text).toBe('Huey runs this on AiVRIC, SOC 2 first.');
    expect(j.words.filter((w) => ['AiVRIC', 'SOC 2'].includes(w[2])).map((w) => j.text.slice(w[3], w[4]))).toEqual(['AiVRIC', 'SOC 2']);
    // The raw take and its alignment are cached by speech hash.
    const ctx = await loadScript({ tour: tfile, out, cache });
    for (const it of ctx.items) { expect(fs.existsSync(path.join(cache, `${it.speechHash}.wav`))).toBe(true); expect(readJson(path.relative(ROOT, path.join(cache, `${it.speechHash}.events.json`)))).toMatchObject({ provider: 'elevenlabs', format: 'pcm_24000', request: it.request, alignment: { characters: [...it.request] } }); }
    const lint = await lintVoice({ tour: tfile, voiceDir: out });
    expect(lint.errors).toEqual([]);
    expect(lint.counts).toMatchObject({ expected: keys.length, current: keys.length, stale: 0, missing: 0, orphans: 0 });
    // A re-run asks for nothing and rewrites nothing; one guide's new seed asks again for that guide only.
    const before = fs.readFileSync(path.join(out, 'manifest.json'), 'utf8');
    calls.length = 0;
    expect(await render(opts(), deps)).toBe(0);
    expect(calls).toHaveLength(0);
    expect(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')).toBe(before);
    const seeded = clone(m); seeded.guide.guides.huey.voice.seed = 8;
    expect(await render({ ...opts(), manifest: writeJson(testInfo.outputPath('m-seed.json'), seeded) }, deps)).toBe(0);
    expect(calls.length).toBe(keys.filter((k) => k.startsWith('huey/')).length);
    expect(logs.join('\n')).not.toContain(SECRET);
  });

  test('render: the quota running out stops the run (exit 2) and keeps what rendered; a refused key stops it (exit 3); neither prints the key', async ({}, testInfo) => {
    test.skip(!hasFfmpeg, 'ffmpeg is not installed');
    const t = { version: 1, start: 'a', chapters: [{ id: 'c', entry: 'a', title: 'C' }], nodes: { a: { chapter: 'c', scene: 'rest', end: true, lines: ['One.', 'Two.', 'Three.', 'Four.', 'Five.'].map((x, i) => ({ id: `l${i}`, text: x, source: 's', status: 'approved-copy' })) } }, ask: { questions: [] } };
    const tfile = writeJson(testInfo.outputPath('tour.json'), t);
    const run = async (tag, fail) => {
      const calls = [], logs = [];
      const out = testInfo.outputPath(`voice-${tag}`);
      const code = await render(parseArgs(['--tour', tfile, '--out', out, '--cache', testInfo.outputPath(`cache-${tag}`), '--concurrency', '1']), { fetchImpl: fakeEleven(calls, { fail }), credentials: { key: SECRET, missing: [] }, ...noWait, log: (x) => logs.push(x), err: (x) => logs.push(x) });
      return { code, calls, logs: logs.join('\n'), vm: readVoiceManifest(out) };
    };
    const quota = await run('quota', (n) => (n >= 3 ? { status: 401, body: { detail: { status: 'quota_exceeded', message: `This request exceeds your quota. key ${SECRET}` } } } : null));
    expect(quota.code).toBe(2);
    expect(quota.calls, 'nothing is asked for after the quota runs out').toHaveLength(3);
    expect(Object.keys(quota.vm.items)).toHaveLength(2);
    expect(quota.logs).toMatch(/quota ran out, so the run stopped/);
    expect(quota.logs).not.toContain(SECRET);
    const refused = await run('auth', () => ({ status: 401, body: { detail: { status: 'invalid_api_key', message: 'Invalid API key' } } }));
    expect(refused.code).toBe(3);
    expect(refused.calls).toHaveLength(1);
    expect(refused.logs).toMatch(/key was refused/);
    expect(refused.logs).not.toContain(SECRET);
  });

  test('the lint warns when the guides\' median loudness is more than 1 LU apart', () => {
    const e = (guide, lufs, duration = 4) => ({ guide, lufs, duration });
    expect(loudnessSpread([['avi/a', e('avi', -18.2)], ['avi/b', e('avi', -17.9)], ['huey/a', e('huey', -18.6)]])).toBeNull();
    const w = loudnessSpread([['avi/a', e('avi', -17.6)], ['avi/b', e('avi', -17.8)], ['avi/c', e('avi', -25, 1)], ['huey/a', e('huey', -18.9)], ['huey/b', e('huey', -19.1)]]);
    expect(w).toMatch(/median loudness is 1\.3 LU apart \(avi -17\.7 LUFS, huey -19 LUFS; at most 1 LU\)/);
    expect(loudnessSpread([['a', { lufs: -10, duration: 4 }], ['b', { lufs: -30, duration: 4 }]]), 'one voice: nothing to compare').toBeNull();
  });

  test('writeVoiceManifest v2: a guides map, totals per guide, one item per line', ({}, testInfo) => {
    const dir = testInfo.outputPath('vm');
    fs.mkdirSync(dir, { recursive: true });
    const { byGuide, shared } = guideVoices(m);
    const items = { 'avi/a': { guide: 'avi', kind: 'tour', line: 'a', hash: 'aaaaaaaaaaaa', lineHash: '1'.repeat(16), chars: 10, duration: 1.5, bytes: 9000, lufs: -18, tp: -3 }, 'huey/a': { guide: 'huey', kind: 'tour', line: 'a', hash: 'bbbbbbbbbbbb', lineHash: '2'.repeat(16), chars: 11, duration: 1.25, bytes: 8000, lufs: -18.2, tp: -3.1 } };
    writeVoiceManifest(dir, shared, items, byGuide);
    const text = fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8');
    const vm = JSON.parse(text);
    expect(vm).toMatchObject({ v: 2, totals: { items: 2, bytes: 17000, chars: 21, seconds: 2.75, guides: { avi: { items: 1, bytes: 9000 }, huey: { items: 1, bytes: 8000 } } } });
    expect(vm.guides.huey).toMatchObject({ provider: 'elevenlabs', voice: 'd9DA0yC1x1RCfpwZPDMM' });
    expect(text.split('\n').filter((l) => /^ {4}"(avi|huey)\/a": \{/.test(l))).toHaveLength(2);
    expect(text.split('\n').filter((l) => /^ {4}"(avi|huey)": \{/.test(l)), 'one line per guide').toHaveLength(2);
  });

  test('credentials: ELEVENLABS_API_KEY, else ELEVNLABS_API_KEY; the environment before ~/.env; only those names read; no value printed', async ({}, testInfo) => {
    const file = testInfo.outputPath('.env');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const other = 'sk-openai-must-never-load-0123456789';
    fs.writeFileSync(file, `OPENAI_API_KEY=${other}\nexport ${ELEVEN_KEY_ALT}="${SECRET}"\n`);
    expect(readEnvFile(file, [ELEVEN_KEY, ELEVEN_KEY_ALT])).toEqual({ [ELEVEN_KEY_ALT]: SECRET });
    const c = loadElevenCredentials({ env: {}, file });
    expect(c).toMatchObject({ provider: 'elevenlabs', key: SECRET, as: ELEVEN_KEY_ALT, missing: [] });
    expect(describeCreds(c)).toEqual([`${ELEVEN_KEY}: set (from ${file}, as ${ELEVEN_KEY_ALT})`]);
    expect(JSON.stringify(describeCreds(c))).not.toContain(SECRET);
    expect(JSON.stringify(c)).not.toContain(other);
    fs.appendFileSync(file, `${ELEVEN_KEY}=sk_correct_spelling_wins_0123456789\n`);
    expect(loadElevenCredentials({ env: {}, file })).toMatchObject({ key: 'sk_correct_spelling_wins_0123456789', as: ELEVEN_KEY });
    expect(loadElevenCredentials({ env: { [ELEVEN_KEY_ALT]: 'sk_from_the_environment_0123' }, file })).toMatchObject({ key: 'sk_from_the_environment_0123', as: ELEVEN_KEY_ALT, from: { [ELEVEN_KEY]: 'the environment' } });
    const none = loadElevenCredentials({ env: {}, file: testInfo.outputPath('missing.env') });
    expect(none).toMatchObject({ key: null, missing: [ELEVEN_KEY] });
    expect(describeCreds(none)[0]).toContain(`not set (looked for ${ELEVEN_KEY} and ${ELEVEN_KEY_ALT}`);
  });

  test('--check without a key names it, exits 3 and prints no value', async ({}, testInfo) => {
    const home = testInfo.outputPath('home');
    fs.mkdirSync(home, { recursive: true });
    const r = spawnSync(process.execPath, ['tools/voice/build.mjs', '--check'], { cwd: ROOT, env: cleanEnv(home), encoding: 'utf8' });
    const all = r.stdout + r.stderr;
    expect(r.status, all).toBe(3);
    expect(all).toContain(`${ELEVEN_KEY}: not set (looked for ${ELEVEN_KEY} and ${ELEVEN_KEY_ALT} in the environment and ~/.env)`);
    expect(all).toContain(`Missing credential: ${ELEVEN_KEY}.`);
    expect(all).not.toMatch(/speech service/);
    // With the key under the other spelling in ~/.env: it is found, named and never shown, and a
    // key the service refuses exits 3 as well (in process, through an injected fetch).
    fs.writeFileSync(path.join(home, '.env'), `${ELEVEN_KEY_ALT}=${SECRET}\n`);
    const logs = [];
    const code = await check(parseArgs(['--check', '--cache', testInfo.outputPath('cache'), '--fixture', path.relative(ROOT, testInfo.outputPath('fx.json'))]), (x) => logs.push(x), { envFile: path.join(home, '.env'), env: {}, err: (x) => logs.push(x), fetchImpl: async () => reply(401, { detail: { status: 'invalid_api_key', message: `bad key ${SECRET}` } }), ...noWait });
    expect(code).toBe(3);
    expect(logs.join('\n')).toContain(`${ELEVEN_KEY}: set (from ${path.join(home, '.env')}, as ${ELEVEN_KEY_ALT})`);
    expect(logs.join('\n')).not.toContain(SECRET);
    expect(fs.existsSync(testInfo.outputPath('fx.json'))).toBe(false);
  });

  test('--check through an injected fetch: the plan, each voice\'s name and category, one line per guide through the whole pipeline, the alignment saved', async ({}, testInfo) => {
    test.skip(!hasFfmpeg, 'ffmpeg is not installed');
    const calls = [], logs = [];
    let used = 1000;
    const fx = testInfo.outputPath('fx.json');
    const code = await check(parseArgs(['--check', '--cache', testInfo.outputPath('cache'), '--fixture', path.relative(ROOT, fx)]), (x) => logs.push(x), { credentials: { elevenlabs: { provider: 'elevenlabs', key: SECRET, from: { [ELEVEN_KEY]: 'the environment' }, as: ELEVEN_KEY, missing: [], file: '~/.env' } }, err: (x) => logs.push(x), fetchImpl: fakeEleven(calls, { used: () => (used += 30) }), ...noWait });
    const out = logs.join('\n');
    expect(code, out).toBe(0);
    expect(out).toMatch(/ElevenLabs plan: starter \(active\), [\d,]+ of 40,000 characters used this period, resets \d{4}-\d\d-\d\d/);
    for (const g of ['avi', 'huey']) {
      expect(out).toContain(`${g}: voice "Stand-in voice" (${m.guide.guides[g].voice.name}), category generated`);
      expect(out).toMatch(new RegExp(`${g}: "I'm ${m.guide.guides[g].name}\\. 3HUE runs on AiVRIC, and SOC 2 starts here\\." came back as [\\d.]+ s of 24 kHz 16-bit mono \\(pcm_24000\\); 10 of 10 words placed on the caption`));
    }
    expect(out).toMatch(/speech service: OK/);
    expect(out).not.toContain(SECRET);
    const saved = JSON.parse(fs.readFileSync(fx, 'utf8'));
    expect(saved.cases.map((c) => c.guide)).toEqual(['avi', 'huey']);
    for (const c of saved.cases) expect(c.alignment.characters.join('')).toBe(c.request);
    expect(fs.readFileSync(fx, 'utf8')).not.toContain(SECRET);
    expect(calls.filter((c) => c.path.endsWith('/with-timestamps'))).toHaveLength(2);
  });

  test('--ab through an injected fetch: every line and the Avi strip in both voices, the published pipeline, a listening report', async ({}, testInfo) => {
    test.skip(!hasFfmpeg, 'ffmpeg is not installed');
    const calls = [], logs = [];
    const dir = testInfo.outputPath('ab');
    const deps = { credentials: { key: SECRET, missing: [] }, err: (x) => logs.push(x), fetchImpl: fakeEleven(calls), ...noWait };
    const o = parseArgs(['--ab', 'eleven_multilingual_v2', '--ab-out', dir, '--concurrency', '3']);
    expect(await abTest(o, (x) => logs.push(x), deps), logs.join('\n')).toBe(0);
    const n = 2 * (AB_LINES.length + AB_AVI.length);
    expect(calls.filter((c) => c.path.endsWith('/with-timestamps'))).toHaveLength(n);
    const ab = JSON.parse(fs.readFileSync(path.join(dir, 'ab.json'), 'utf8'));
    expect(ab.takes).toHaveLength(n);
    for (const tk of ab.takes) { expect(tk.error, tk.line).toBeUndefined(); expect(tk.coverage).toBeGreaterThanOrEqual(0.9); expect(fs.existsSync(path.join(dir, tk.file))).toBe(true); }
    expect(ab.takes.filter((tk) => tk.line === 'avi-ah').map((tk) => tk.request)).toEqual(['This is AH-vee.', 'This is AH-vee.']);
    expect(ab.takes.find((tk) => tk.line === 'names').request).toContain('av-RICK');
    const html = fs.readFileSync(path.join(dir, 'report.html'), 'utf8');
    expect(html.match(/<audio /g)).toHaveLength(n);
    expect(html).toContain('This is Avi.');
    expect(html).not.toContain(SECRET);
    // A second run takes every take from its own cache: nothing is asked for twice.
    calls.length = 0;
    expect(await abTest(o, () => {}, deps)).toBe(0);
    expect(calls.filter((c) => c.path.endsWith('/with-timestamps'))).toHaveLength(0);
  });

  test('providers: ElevenLabs and Azure by name, anything else refused', () => {
    expect(providerOf('elevenlabs').label).toBe('ElevenLabs');
    expect(providerOf('azure').label).toBe('Azure AI Speech');
    expect(() => providerOf('other')).toThrow(/unknown voice provider "other"/);
    expect(() => providerOf('toString')).toThrow(/unknown voice provider/);
    const s = voiceSettings(m, 'huey');
    expect(providerOf('elevenlabs').build('3HUE and SOC 2.', s).request).toBe('three hue and sock two.');
  });
});
