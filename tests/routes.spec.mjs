// P4-D04 (O3): every route pasted into a fresh tab opens its state with exactly the lobby beneath
// it; Back closes the panel onto #/experience; Forward and reload restore; document.title follows.
import { test, expect } from '@playwright/test';
import { open, ready, settled, panelOpen, manifest as m, S, DOORS, STAGES, doorById, stageById, doorH2, doorTitle, pathTitle, siteTitle, annotate } from './helpers.mjs';

const firstDoor = m.doors[0];
const ROUTES = [
  { hash: '#/experience', title: siteTitle(), panel: false, len: 1 },
  ...DOORS.map((id) => ({ hash: `#/door/${id}`, title: doorTitle(doorById(id)), panel: true, h2: doorH2(doorById(id)), current: id, len: 2 })),
  { hash: `#/door/${firstDoor.id}/${firstDoor.stations[2]}`, title: doorTitle(firstDoor), panel: true, h2: doorH2(firstDoor), current: firstDoor.id, station: firstDoor.stations[2], len: 2 },
  { hash: '#/path', title: pathTitle(), panel: true, h2: m.path.title, stage: null, len: 2 },
  ...STAGES.map((s) => ({ hash: `#/path/${s}`, title: pathTitle(), panel: true, h2: m.path.title, stage: s, len: 2 })),
  { hash: '#/path/where-to-start', title: pathTitle(), panel: true, h2: m.path.title, start: true, len: 2 },
  { hash: '#/walk/2', title: siteTitle(), panel: false, walk: 2, len: 2 },
];

const snapshot = (page) => page.evaluate(() => {
  const p = document.getElementById('panel');
  const li = document.querySelector('#stage-list li[aria-current="step"]');
  return {
    hash: location.hash, title: document.title, historyLength: history.length,
    panelHidden: p.hidden, h2: p.querySelector('#panel-h2')?.textContent.trim() ?? null,
    current: [...document.querySelectorAll('#doors [aria-current="true"]')].map((e) => e.dataset.door || e.className),
    lit: [...document.querySelectorAll('#arcs path.lit')].map((e) => e.dataset.stage),
    currentStage: li ? li.querySelector('b').textContent.trim() : null,
    whereToStart: !!document.getElementById('where-to-start'),
    walkHidden: document.getElementById('walk').hidden, walkCount: document.querySelector('#walk .count')?.textContent ?? null,
    active: document.activeElement?.id || document.activeElement?.tagName,
    moving: document.getElementById('plate').classList.contains('moving'),
    boot: document.documentElement.hasAttribute('data-lobby-boot'),
    layerOpen: document.body.classList.contains('layer-open'),
  };
});

async function assertState(page, r, phase) {
  await settled(page);
  if (r.panel) await panelOpen(page);
  if (r.walk !== undefined) await page.waitForSelector('#walk .count');
  await page.waitForTimeout(200);
  const s = await snapshot(page);
  const tag = `${r.hash} (${phase})`;
  expect(s.hash, tag).toBe(r.hash);
  expect(s.title, `${tag} document.title`).toBe(r.title);
  expect(s.panelHidden, `${tag} panel`).toBe(!r.panel);
  expect(s.boot, `${tag} boot cover cleared`).toBe(false);
  if (r.panel) expect(s.h2, `${tag} h2`).toBe(r.h2);
  if (r.current) expect(s.current, `${tag} aria-current`).toEqual([r.current]);
  if (r.stage) { expect(s.lit, `${tag} lit arc`).toEqual([r.stage]); expect(s.currentStage).toBe(stageById(r.stage).name); }
  if (r.stage === null) { expect(s.lit).toEqual([]); expect(s.currentStage).toBeNull(); }
  if (r.start) { expect(s.whereToStart).toBe(true); expect(s.lit).toEqual([]); }
  if (r.walk !== undefined) { expect(s.walkHidden).toBe(false); expect(s.walkCount.startsWith(`${r.walk + 1} /`)).toBe(true); expect(s.hash).toBe(`#/walk/${r.walk}`); }
  else expect(s.walkHidden).toBe(true);
  expect(s.layerOpen).toBe(!!(r.panel || r.walk !== undefined));
  return s;
}

// history.length of a plain #/experience load in a fresh context (Playwright's fresh page carries
// an about:blank entry that a real fresh tab does not; every route is measured against this base).
let BASE = null;
test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto('?debug=1#/experience'); await ready(page);
  BASE = await page.evaluate(() => history.length);
  await ctx.close();
});

for (const r of ROUTES) {
  test(`P4-D04 ${r.hash} in a fresh context: opens, Back → lobby, Forward and reload restore`, async ({ browser }, testInfo) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const log = {};
    try {
      await page.goto(`?debug=1${r.hash}`);
      await ready(page);
      // A deep link opens without animation (O3): the plate must not be travelling on boot.
      const movingOnBoot = await page.evaluate(() => document.getElementById('plate').classList.contains('moving'));
      expect(movingOnBoot, 'deep link opens without a dolly').toBe(false);
      const opened = await assertState(page, r, 'fresh');
      log.fresh = opened;
      log.base = BASE;
      expect(opened.historyLength - BASE + 1, `${r.hash}: history has exactly the lobby beneath it (length ${opened.historyLength}, plain lobby ${BASE})`).toBe(r.len);
      // A plain door or path link focuses the heading; a station link focuses that station's h3.
      const stationId = (r.hash.match(/^#\/door\/[\w-]+\/([\w-]+)/) || [])[1];
      if (r.panel) expect(opened.active, 'deep link focuses the panel heading (or the station h3)').toBe(stationId ? `st-${stationId}` : 'panel-h2');
      if (r.hash === '#/experience') { annotate(testInfo, log); return; }

      await page.goBack();
      await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('panel').hidden, null, { polling: 50 });
      await settled(page);
      const back = await snapshot(page);
      log.back = back;
      expect(back.hash).toBe('#/experience');
      expect(back.panelHidden).toBe(true);
      expect(back.walkHidden).toBe(true);
      expect(back.title).toBe(siteTitle());
      expect(back.current).toEqual([]);
      expect(back.lit).toEqual([]);
      expect(back.layerOpen).toBe(false);

      await page.goForward();
      await page.waitForFunction((h) => location.hash === h, r.hash, { polling: 50 });
      log.forward = await assertState(page, r, 'forward');

      await page.reload();
      await ready(page);
      log.reload = await assertState(page, r, 'reload');
      annotate(testInfo, log);
    } finally {
      await ctx.close();
    }
  });
}

test('P4-D04 Back from a door reached by clicking lands on the lobby, one entry per layer', async ({ page }) => {
  await open(page);
  const len0 = await page.evaluate(() => history.length);
  await page.click(`#doors .door[data-door="${DOORS[1]}"]`);
  await panelOpen(page);
  expect(await page.evaluate(() => history.length)).toBe(len0 + 1);
  // A tab switch replaces (no new entry); Back then closes the panel.
  await page.click(`#panel .tabs .tab[data-door="${DOORS[2]}"]`);
  await page.waitForFunction((h) => location.hash === h, `#/door/${DOORS[2]}`, { polling: 50 });
  expect(await page.evaluate(() => history.length)).toBe(len0 + 1);
  await page.click('#panel-back');
  await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('panel').hidden, null, { polling: 50 });
  expect(await page.evaluate(() => document.title)).toBe(siteTitle());
});
