// T-22: the tour costs the lobby's boot nothing (O10/O11; P2a-D05 and P4-D07 carried over). With the
// tour and a voice switched on, nothing of either is fetched before the visitor starts it: no
// script, no tour stylesheet, nothing under the voice folder, and the two <audio preload="none">
// elements hold no source. The click brings the script first, then the voice manifest, then the
// first line's timing. Layout does not shift from navigation through the first voiced line (CLS 0,
// Chromium's layout-shift entries), and the plate is still one file. With the gate pending (the
// default) even ?voice=sim fetches nothing of the tour or its voice, and the walk button walks.
import { test, expect } from '@playwright/test';
import { open, doorsShown, annotate, manifest as m } from './helpers.mjs';
import { FX, TQ } from './tour-helpers.mjs';
import { buildVoice } from './voice-fixture.mjs';

const CLS = () => {
  window.__cls = 0; window.__shifts = [];
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls += e.value;
        window.__shifts.push({ at: Math.round(e.startTime), value: e.value, nodes: (e.sources || []).map((s) => s.node?.id || s.node?.className || s.node?.nodeName || '?') });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { window.__cls = null; }   // WebKit has no layout-shift entries
};
const at = (page) => page.evaluate(() => ({ cls: window.__cls, shifts: window.__shifts, plate: [...new Set(performance.getEntriesByType('resource').filter((e) => /media\/plate\//.test(e.name)).map((e) => e.name.split('/').pop().split('?')[0]))] }));
const AUDIO = () => ['tour-audio', 'ask-audio'].map((id) => { const a = document.getElementById(id); return { id, src: a.getAttribute('src'), preload: a.getAttribute('preload'), network: a.networkState, shown: getComputedStyle(a).display !== 'none' }; });

test('T-22 before the start nothing of the tour or its voice is fetched and the audio elements hold no source; the click brings the script, then the voice manifest, then the first line\'s timing; CLS 0 through the first voiced line; one plate file', async ({ page }, testInfo) => {
  const v = await buildVoice(`boot-${testInfo.project.name}-${testInfo.workerIndex}`, { tour: FX });
  const tourish = (u) => { const p = new URL(u).pathname; return /(tour-min\.json|content\/tour\.json|css\/tour\.css)$/.test(p) || p.includes(`/${v.base}`) || p.includes('/media/voice/'); };
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  await page.addInitScript(CLS);
  await open(page, { query: `${TQ}&voice=sim&rate=1&voice-base=${v.base}` });
  await doorsShown(page);
  await page.waitForTimeout(1500);   // the lobby idles (its rooms warm); nothing of the tour loads
  const before = reqs.filter(tourish);
  const audio = await page.evaluate(AUDIO);
  const boot = await at(page);
  expect(before, 'nothing of the tour or its voice before the start').toEqual([]);
  for (const a of audio) expect(a, `${a.id} holds no source and loads nothing`).toEqual({ id: a.id, src: null, preload: 'none', network: 0, shown: false });
  await page.click('#walk-btn');
  await page.waitForFunction(() => { const v = window.__tour?.voiceState; return v?.state === 'playing' && v.line === 'arrive-1'; }, null, { polling: 20, timeout: 15_000 });
  await page.waitForTimeout(800);
  const after = reqs.filter(tourish).map((u) => { const x = new URL(u); return x.pathname.split('/').pop() + x.search; });
  const end = await at(page);
  annotate(testInfo, { after, boot: boot.cls, cls: end.cls, shifts: end.shifts, plate: end.plate });
  const i = (f) => after.findIndex((x) => x.startsWith(f));
  for (const f of ['tour-min.json', 'tour.css', 'manifest.json', 'arrive-1.json?h=']) expect(i(f), `${f} after the click`).toBeGreaterThanOrEqual(0);
  expect(i('tour-min.json')).toBeLessThan(i('manifest.json'));
  expect(i('manifest.json')).toBeLessThan(i('arrive-1.json?h='));
  expect(after.filter((f) => f === 'tour-min.json'), 'the script is read once').toHaveLength(1);
  expect(end.plate, 'still exactly one plate file').toHaveLength(1);
  if (end.cls !== null) expect(end.cls, `layout shifts: ${JSON.stringify(end.shifts)}`).toBe(0);
});

test('T-22 with the tour off (the gate pending, or ?tour=0 once it is open) even ?voice=sim fetches nothing of the tour or its voice, and the walk button starts the silent walk', async ({ page }, testInfo) => {
  const v = await buildVoice(`gate-${testInfo.project.name}-${testInfo.workerIndex}`, { tour: FX });
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  // Once the gate is approved the walk button starts the tour, so ?tour=0 is what reproduces the off
  // state this check is about (index.html:33). Before that, the gate alone holds it off.
  const off = m.tour.gate === 'approved' ? 'tour=0&' : '';
  await open(page, { query: `debug=1&${off}voice=sim&voice-base=${v.base}` });
  await doorsShown(page);
  await page.click('#walk-btn');
  await page.waitForFunction(() => location.hash === '#/walk/0' && document.activeElement?.id === 'walk-next', null, { polling: 50 });
  await page.waitForTimeout(500);
  const bad = reqs.filter((u) => { const p = new URL(u).pathname; return /(content\/tour\.json|css\/tour\.css)$/.test(p) || p.includes(`/${v.base}`) || p.includes('/media/voice/'); });
  expect(bad).toEqual([]);
  expect(await page.evaluate(AUDIO)).toEqual([{ id: 'tour-audio', src: null, preload: 'none', network: 0, shown: false }, { id: 'ask-audio', src: null, preload: 'none', network: 0, shown: false }]);
  expect(await page.evaluate(() => document.getElementById('tour').hidden)).toBe(true);
});
