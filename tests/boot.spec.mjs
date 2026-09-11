// P2a-D04/D05 and P4-D07: boot behaviour on a Fast 4G cold cache, one plate download, warm reopen,
// CLS 0, and a deep link that never shows the resting lobby on the way in.
import { test, expect } from '@playwright/test';
import { manifest, annotate } from './helpers.mjs';

const m = manifest;
const FAST_4G = { offline: false, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8, latency: 20 };

async function cdp(page) {
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Network.emulateNetworkConditions', FAST_4G);
  return session;
}

test.describe('P2a-D05 boot on Fast 4G, cold cache, 1440x900', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP throttling is Chromium only');
  test('placeholder or plate paints within 350 ms of navigation start; exactly one plate file, <= 500 KB; CLS 0', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await cdp(page);
    const plateRequests = [];
    page.on('response', (r) => { if (/media\/plate\//.test(r.url())) plateRequests.push({ url: r.url().split('/').pop(), status: r.status() }); });
    await page.addInitScript(() => {
      window.__cls = 0; window.__firstPaint = null;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      const check = () => { const ph = document.getElementById('placeholder'); if (ph && getComputedStyle(ph).backgroundImage !== 'none' && window.__firstPaint === null) window.__firstPaint = performance.now(); if (window.__firstPaint === null) requestAnimationFrame(check); };
      requestAnimationFrame(check);
    });
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForFunction(() => document.documentElement.dataset.plateReady === '1', null, { timeout: 30_000 });
    await page.waitForTimeout(800);
    const r = await page.evaluate(async () => {
      const nav = performance.getEntriesByType('navigation')[0];
      const res = performance.getEntriesByType('resource').filter((e) => /media\/plate\//.test(e.name)).map((e) => ({ name: e.name.split('/').pop(), bytes: e.transferSize || e.encodedBodySize, at: Math.round(e.responseEnd) }));
      return { firstPaintMs: Math.round(window.__firstPaint), plateReadyAt: Math.round(performance.now()), cls: +window.__cls.toFixed(4), plate: res, ttfb: Math.round(nav.responseStart) };
    });
    annotate(testInfo, r);
    expect(r.firstPaintMs, `placeholder painted at ${r.firstPaintMs} ms`).toBeLessThanOrEqual(350);
    expect(r.plate.length, `plate files fetched: ${r.plate.map((p) => p.name).join(', ')}`).toBe(1);
    expect(r.plate[0].bytes, `${r.plate[0].name} ${r.plate[0].bytes} bytes`).toBeLessThanOrEqual(500 * 1024);
    expect(r.cls, 'cumulative layout shift').toBe(0);
  });

  test('warm reopen skips the placeholder fade and re-fetches nothing', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.dataset.plateReady === '1');
    const before = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /media\/plate\//.test(e.name)).length);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.dataset.plateReady === '1');
    const r = await page.evaluate(() => ({ plateFetches: performance.getEntriesByType('resource').filter((e) => /media\/plate\//.test(e.name)).map((e) => ({ name: e.name.split('/').pop(), transfer: e.transferSize })), readyAt: Math.round(performance.now()) }));
    annotate(testInfo, { before, ...r });
    // A cached plate has transferSize 0 (or a 304-sized header) and the ready flag lands fast.
    for (const p of r.plateFetches) expect(p.transfer, `${p.name} re-downloaded (${p.transfer} bytes)`).toBeLessThan(2000);
    expect(r.readyAt).toBeLessThan(2500);
  });
});

test('P4-D07 a deep link never shows the resting lobby: no frame with the heading or pins before the door opens', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    window.__frames = [];
    const tick = () => { const intro = document.getElementById('intro'); const doors = document.getElementById('doors'); window.__frames.push({ t: Math.round(performance.now()), boot: document.documentElement.hasAttribute('data-lobby-boot'), introVisible: !!intro && getComputedStyle(intro).visibility === 'visible' && getComputedStyle(intro).opacity !== '0', doorsShown: !!doors && !doors.classList.contains('hidden') && getComputedStyle(doors).opacity !== '0' }); if (window.__frames.length < 400) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.goto('/#/door/gain-control', { waitUntil: 'load' });
  await page.waitForFunction(() => !document.getElementById('panel').hidden && document.documentElement.dataset.plateReady === '1');
  await page.waitForTimeout(1500);
  const frames = await page.evaluate(() => window.__frames);
  annotate(testInfo, { frames: frames.length, leaked: frames.filter((f) => f.introVisible || f.doorsShown).slice(0, 5) });
  expect(frames.filter((f) => f.introVisible).length, 'frames showing the resting heading').toBe(0);
  expect(frames.filter((f) => f.doorsShown).length, 'frames showing the door pins').toBe(0);
  expect(await page.evaluate(() => location.hash)).toBe('#/door/gain-control');
});
