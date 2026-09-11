// tools/serve.mjs serves audio the way GitHub Pages does: .mp3 as audio/mpeg, and byte ranges as
// 206 Partial Content (Safari will not play audio without them; it opens with bytes=0-1). The spec
// starts its own copy of the server on a free port, so it tests the code in the working tree
// whichever server is already running. No browser.
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.mjs';

const MP3 = 'tests/fixtures/voice/tiny.mp3';
const BYTES = fs.readFileSync(path.join(ROOT, MP3));
let server, base;

test.beforeAll(async () => {
  server = spawn(process.execPath, ['tools/serve.mjs'], { cwd: ROOT, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  base = await new Promise((resolve, reject) => {
    let out = '';
    const timer = setTimeout(() => reject(new Error(`tools/serve.mjs did not start: ${out}`)), 10_000);
    server.stdout.on('data', (d) => {
      out += d;
      const m = out.match(/at (http:\/\/127\.0\.0\.1:\d+\/3hue-experience\/)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    server.on('exit', (code) => { clearTimeout(timer); reject(new Error(`tools/serve.mjs exited (${code}): ${out}`)); });
  });
});
test.afterAll(() => { server?.kill(); });

const get = (rel, headers = {}, method = 'GET') => fetch(base + rel, { headers, method });
const body = async (r) => Buffer.from(await r.arrayBuffer());

test.describe('T-15 local server for the audio back end (no browser)', () => {
  test('.mp3 is audio/mpeg and says it takes byte ranges; a ?h= cache key is ignored', async () => {
    for (const rel of [MP3, `${MP3}?h=a19255b770d4`]) {
      const r = await get(rel);
      expect(r.status).toBe(200);
      expect(r.headers.get('content-type')).toBe('audio/mpeg');
      expect(r.headers.get('accept-ranges')).toBe('bytes');
      expect(Number(r.headers.get('content-length'))).toBe(BYTES.length);
      expect((await body(r)).equals(BYTES)).toBe(true);
    }
  });

  test('a Range request returns 206 with exactly the bytes asked for', async () => {
    const n = BYTES.length;
    for (const [range, start, end] of [['bytes=0-1', 0, 1], ['bytes=100-199', 100, 199], ['bytes=2000-', 2000, n - 1], ['bytes=-10', n - 10, n - 1], ['bytes=2300-9999', 2300, n - 1]]) {
      const r = await get(MP3, { Range: range });
      expect(r.status, range).toBe(206);
      expect(r.headers.get('content-type')).toBe('audio/mpeg');
      expect(r.headers.get('content-range'), range).toBe(`bytes ${start}-${end}/${n}`);
      expect(Number(r.headers.get('content-length'))).toBe(end - start + 1);
      expect((await body(r)).equals(BYTES.subarray(start, end + 1)), range).toBe(true);
    }
  });

  test('an unsatisfiable range is 416; a stale If-Range or several ranges get the whole file', async () => {
    const r416 = await get(MP3, { Range: `bytes=${BYTES.length}-` });
    expect(r416.status).toBe(416);
    expect(r416.headers.get('content-range')).toBe(`bytes */${BYTES.length}`);
    const stale = await get(MP3, { Range: 'bytes=0-1', 'If-Range': 'Thu, 01 Jan 1970 00:00:00 GMT' });
    expect(stale.status).toBe(200);
    expect((await body(stale)).length).toBe(BYTES.length);
    const lm = (await get(MP3, {}, 'HEAD')).headers.get('last-modified');
    const fresh = await get(MP3, { Range: 'bytes=0-1', 'If-Range': lm });
    expect(fresh.status).toBe(206);
    const multi = await get(MP3, { Range: 'bytes=0-1,4-5' });
    expect(multi.status).toBe(200);
  });

  test('HEAD sends headers only; other files keep their types; If-Modified-Since still gives 304; outside the base is 404', async () => {
    const head = await get(MP3, {}, 'HEAD');
    expect(head.status).toBe(200);
    expect(head.headers.get('content-length')).toBe(String(BYTES.length));
    expect((await body(head)).length).toBe(0);
    const headRange = await get(MP3, { Range: 'bytes=0-1' }, 'HEAD');
    expect(headRange.status).toBe(206);
    expect((await body(headRange)).length).toBe(0);
    expect((await get('content/experience.json')).headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect((await get('js/main.js')).headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    const html = await get('');
    expect(html.headers.get('content-type')).toBe('text/html; charset=utf-8');
    const again = await get('', { 'If-Modified-Since': html.headers.get('last-modified') });
    expect(again.status).toBe(304);
    expect((await fetch(base.replace('/3hue-experience/', '/elsewhere'))).status).toBe(404);
    expect((await get('no/such/file.mp3')).status).toBe(404);
  });
});
