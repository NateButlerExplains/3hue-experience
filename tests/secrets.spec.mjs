// No credential is ever committed (O10, O13). The voice build's keys (ElevenLabs, read as
// ELEVENLABS_API_KEY or the misspelt ELEVNLABS_API_KEY, and the optional Azure Speech key) live only
// in ~/.env or the environment. GitHub Pages serves the whole repository, so every file git tracks is
// checked, and every untracked file git would pick up (anything not ignored). No browser. Secret
// values are compared as true or false and never printed: a failure names the variable and the file.
import { test, expect } from '@playwright/test';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { ROOT } from './helpers.mjs';

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const repoFiles = () => [...new Set([...git('ls-files', '-z').split('\0'), ...git('ls-files', '-z', '--others', '--exclude-standard').split('\0')])]
  .filter(Boolean).filter((f) => { try { return fs.statSync(path.join(ROOT, f)).isFile(); } catch { return false; } }).sort();
const TEXT = /\.(m?js|json|html?|css|md|txt|sh|py|ya?ml|svg|xml|webmanifest|csv)$|(^|\/)[^./]+$|(^|\/)\.[^/]+$/i;
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// The credential names may be written only by the voice tools that read them, the docs that explain
// them and the specs that check them; never by anything the site itself loads.
const NAMES = /AZURE_SPEECH_(KEY|REGION)|ELEVE?NLABS_API_KEY|Ocp-Apim-Subscription-Key|xi-api-key/i;
const MAY_NAME = [/^tools\/voice\//, /^docs\//, /^README\.md$/, /^tests\/(secrets|voice-tool|voice-eleven)\.spec\.mjs$/];
// A name followed by something that looks like a real key (16 or more key characters), in any
// assignment or header form. Placeholders such as %s, <key>, … or $(…) never match.
const LITERAL = [
  /AZURE_SPEECH_KEY["']?\s*[:=]\s*["']?([A-Za-z0-9+/_-]{16,})/g,
  /ELEVE?NLABS_API_KEY["']?\s*[:=]\s*["']?([A-Za-z0-9+/_-]{16,})/g,
  /Ocp-Apim-Subscription-Key["']?\s*[:=,]\s*["']?([A-Za-z0-9+/_-]{16,})/gi,
  /xi-api-key["']?\s*[:=,]\s*["']?([A-Za-z0-9+/_-]{16,})/gi,
];

test.describe('T-02 secrets: the speech keys never enter the repo (no browser)', () => {
  test('.env is ignored by git and no .env file is tracked or waiting to be', () => {
    for (const f of ['.env', '.env.local', 'tools/voice/.env']) {
      const r = spawnSync('git', ['check-ignore', '-q', f], { cwd: ROOT });
      expect(r.status, `${f} must be ignored`).toBe(0);
    }
    expect(repoFiles().filter((f) => /(^|\/)\.env(\.|$)/.test(f))).toEqual([]);
  });

  test('the credential names appear only in the voice tools, the docs and these specs', () => {
    const hits = repoFiles().filter((f) => TEXT.test(f) && !MAY_NAME.some((r) => r.test(f)) && NAMES.test(read(f)));
    expect(hits, 'files that name the speech credentials outside tools/voice/, docs/ and the specs').toEqual([]);
    // The modules that read and send them do name them (so this check is looking at the right thing).
    for (const [f, re] of [['tools/voice/env.mjs', /AZURE_SPEECH_KEY/], ['tools/voice/env.mjs', /ELEVENLABS_API_KEY/], ['tools/voice/env.mjs', /ELEVNLABS_API_KEY/], ['tools/voice/elevenlabs.mjs', /xi-api-key/]]) expect(re.test(read(f)), `${f} names ${re.source}`).toBe(true);
  });

  test('the literal checks catch a key under each name and in each header form, and pass placeholders', () => {
    const fake = 'sk_0123456789abcdef0123456789abcdef';   // shaped like a key, assembled here so no file carries one
    const caught = (s) => LITERAL.some((re) => { re.lastIndex = 0; return re.test(s); });
    for (const s of [`ELEVENLABS_API_KEY=${fake}`, `export ELEVNLABS_API_KEY="${fake}"`, `AZURE_SPEECH_KEY: ${fake}`, `{"xi-api-key": "${fake}"}`, `curl -H 'xi-api-key: ${fake}'`, `Ocp-Apim-Subscription-Key=${fake}`]) expect(caught(s), s.replace(fake, '<fake>')).toBe(true);
    for (const s of ['ELEVENLABS_API_KEY=<key>', "headers: { 'xi-api-key': key }", 'ELEVNLABS_API_KEY=$(pbpaste)', 'xi-api-key: [redacted]']) expect(caught(s), s).toBe(false);
  });

  test('no file assigns a literal key or sends a literal subscription-key header', () => {
    const hits = [];
    for (const f of repoFiles().filter((x) => TEXT.test(x))) {
      const s = read(f);
      for (const re of LITERAL) for (const m of s.matchAll(re)) hits.push(`${f}: ${m[0].slice(0, m[0].length - m[1].length)}… (${m[1].length} characters)`);
    }
    expect(hits).toEqual([]);
  });

  test('no file carries the value of a secret from ~/.env or the environment', () => {
    const values = [];
    const add = (name, v, from) => { if (typeof v === 'string' && v.trim().length >= 12) values.push({ name, from, value: v.trim() }); };
    let text = '';
    try { text = fs.readFileSync(path.join(os.homedir(), '.env'), 'utf8'); } catch { /* no ~/.env */ }
    if (text) { try { for (const [k, v] of Object.entries(parseEnv(text))) if (/KEY|SECRET|TOKEN|PASSWORD/i.test(k)) add(k, v, '~/.env'); } catch { /* unparseable */ } }
    for (const n of ['AZURE_SPEECH_KEY', 'ELEVENLABS_API_KEY', 'ELEVNLABS_API_KEY']) add(n, process.env[n], 'the environment');
    test.info().annotations.push({ type: 'compared', description: values.length ? `${values.length} secret value(s): ${[...new Set(values.map((v) => v.name))].join(', ')}` : 'no secret values present to compare' });
    const hits = [];
    for (const f of repoFiles()) {
      const buf = fs.readFileSync(path.join(ROOT, f));
      for (const v of values) if (buf.includes(v.value)) hits.push(`${f} contains the value of ${v.name} (from ${v.from})`);
    }
    expect(hits).toEqual([]);
  });
});
