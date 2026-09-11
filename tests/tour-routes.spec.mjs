// T-09, T-10: the tour in history (O3).
//   T-09 #/tour/<node> pasted into a fresh tab opens that node with exactly the lobby beneath it,
//        without a dolly; Back closes it onto #/experience; Forward and reload restore it, with the
//        session's answers; an unknown node, or #/tour alone, becomes the start; with the tour off a
//        tour link opens the lobby (one lobby entry, as before the tour existed) and fetches no script.
//        Storage: one sessionStorage key, nothing else.
//   T-10 See the details hands the scene on screen to its route by replacing the tour's entry: the
//        door with the station last narrated (focus on that station's heading; the room never fades
//        again) or the path at its stage (focus on the heading); Escape or Back then lands on the lobby.
//        A door or path hash edited by hand mid-tour takes the scene over the same way: its own layer
//        (the lobby inert), focus in the panel, Escape closes it.
import { test, expect } from '@playwright/test';
import { ready, settled, panelOpen, roomVisible, manifest as m, S, fill, annotate } from './helpers.mjs';
import { FX, FIXTURE, TQ, tour, atNode, openTour, startTour, toLast, pick, cont, chapterTitle, tourRequest } from './tour-helpers.mjs';

const SNAP = () => ({
  hash: location.hash, len: history.length, title: document.title,
  touring: !!window.__tour?.touring, node: window.__tour?.node, answers: window.__tour?.answers,
  cardHidden: document.getElementById('tour').hidden, panelHidden: document.getElementById('panel').hidden,
  layerOpen: document.body.classList.contains('layer-open'), boot: document.documentElement.hasAttribute('data-lobby-boot'),
  active: document.activeElement?.id || document.activeElement?.tagName, moving: document.getElementById('plate').classList.contains('moving'),
});
const snap = (page) => page.evaluate(SNAP);
const titleOf = (node) => fill(S.tourDocTitle, { chapter: chapterTitle(FX.nodes[node].chapter), site: m.site.name });

// history.length of a plain #/experience load in a fresh context (Playwright's fresh page has an
// about:blank entry a real fresh tab does not; every deep link is measured against this, as in routes.spec).
let BASE = null;
test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`?${TQ}#/experience`); await ready(page);
  BASE = await page.evaluate(() => history.length);
  await ctx.close();
});

for (const node of ['arrive', 'wt', 'wt-proof', 'lens', 'path', 'stage-operate', 'kiosk', 'close']) {
  test(`T-09 #/tour/${node} in a fresh context: that node over exactly the lobby, no dolly; Back → lobby; Forward and reload restore`, async ({ browser }, testInfo) => {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    const log = {};
    try {
      await page.goto(`?${TQ}#/tour/${node}`);
      await ready(page);
      await atNode(page, node);
      expect((await snap(page)).moving, 'a deep link opens without a dolly').toBe(false);
      await page.waitForFunction(() => document.activeElement?.id === 'tour-next', null, { polling: 50 });
      await settled(page);
      let s = log.fresh = await snap(page);
      expect(s.hash).toBe(`#/tour/${node}`);
      expect(s.len - BASE + 1, `exactly the lobby beneath (length ${s.len}, plain lobby ${BASE})`).toBe(2);
      expect(s.boot, 'boot cover cleared').toBe(false);
      expect(s.title).toBe(titleOf(node));
      expect(s.panelHidden).toBe(true);
      expect(s.cardHidden).toBe(false);
      await page.goBack();
      await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('tour').hidden, null, { polling: 50 });
      await settled(page);
      s = log.back = await snap(page);
      expect(s.touring).toBe(false);
      expect(s.layerOpen).toBe(false);
      expect(s.title).toBe(m.site.title);
      await page.goForward();
      await atNode(page, node);
      await settled(page);
      s = log.forward = await snap(page);
      expect(s.hash).toBe(`#/tour/${node}`);
      expect(s.touring && !s.cardHidden && s.layerOpen).toBe(true);
      expect(s.title).toBe(titleOf(node));
      await page.reload();
      await ready(page);
      await atNode(page, node);
      await page.waitForFunction(() => document.activeElement?.id === 'tour-next', null, { polling: 50 });
      s = log.reload = await snap(page);
      expect(s.hash).toBe(`#/tour/${node}`);
      expect(s.touring).toBe(true);
      expect(s.title).toBe(titleOf(node));
      annotate(testInfo, log);
    } finally { await ctx.close(); }
  });
}

test('T-09 an unknown node, or #/tour alone, opens the start with exactly the lobby beneath', async ({ browser }) => {
  for (const hash of ['#/tour/nope', '#/tour']) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    try {
      await page.goto(`?${TQ}${hash}`);
      await ready(page);
      await atNode(page, FX.start);
      const s = await snap(page);
      expect(s.hash, hash).toBe(`#/tour/${FX.start}`);
      expect(s.len - BASE + 1, `${hash}: the start replaced it`).toBe(2);
    } finally { await ctx.close(); }
  }
});

test('T-09 with the tour off (?tour=0, or the gate pending) a tour link opens the lobby and fetches no script', async ({ browser }, testInfo) => {
  const queries = [`debug=1&tour=0&tour-manifest=${FIXTURE}`];
  if (m.tour.gate !== 'approved') queries.push(`debug=1&tour-manifest=${FIXTURE}`);
  const log = [];
  for (const q of queries) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    try {
      await page.goto(`?${q}#/tour/wt`);
      await ready(page);
      await page.waitForFunction(() => location.hash === '#/experience', null, { polling: 50 });
      await settled(page);
      await page.waitForTimeout(500);
      const s = await snap(page);
      const base = await page.evaluate(() => !!history.state?.lobbyBase);
      const scripts = reqs.filter(tourRequest);
      log.push({ q, hash: s.hash, len: s.len, base, scripts });
      expect(s.cardHidden).toBe(true);
      expect(s.boot).toBe(false);
      expect(s.layerOpen).toBe(false);
      expect(s.len, `one lobby entry, as a plain lobby load has (${BASE})`).toBe(BASE);
      expect(base, 'the entry is the lobby base, so Back leaves the site').toBe(true);
      expect(scripts).toEqual([]);
    } finally { await ctx.close(); }
  }
  annotate(testInfo, log);
});

test('T-09 the session keeps answers and visited chapters across a reload; a fresh start forgets them; only one sessionStorage key, no localStorage, no cookies', async ({ page }) => {
  await openTour(page);
  await startTour(page);
  await pick(page, 'win-trust');
  await atNode(page, 'wt');
  await page.reload();
  await ready(page);
  await atNode(page, 'wt');
  let t = await tour(page);
  expect(t.answers.segment).toBe('win-trust');
  expect(t.lineIds).toContain('wt-2');
  expect(t.visited).toEqual(expect.arrayContaining(['arrival', 'door-win-trust']));
  const storage = await page.evaluate(() => ({ session: Object.keys(sessionStorage), local: Object.keys(localStorage), cookie: document.cookie }));
  expect(storage).toEqual({ session: ['3hue-experience:tour'], local: [], cookie: '' });
  expect((await page.context().cookies()).length).toBe(0);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => location.hash === '#/experience' && document.activeElement?.id === 'walk-btn', null, { polling: 50 });
  await startTour(page);
  t = await tour(page);
  expect(t.answers).toEqual({});
  expect(t.visited).toEqual(['arrival']);
});

test('T-10 See the details at a station replaces the tour with #/door/<id>/<station>: focus on that station, the room never fades, Escape → lobby', async ({ page }, testInfo) => {
  await openTour(page);
  await startTour(page);
  await pick(page, 'win-trust');
  await atNode(page, 'wt');
  await cont(page);
  await atNode(page, 'wt-proof');
  await roomVisible(page);
  const t = await toLast(page);
  const station = FX.nodes['wt-proof'].lines.at(-1).cue.station;
  expect(t.scene.station).toBe(station);
  await page.waitForTimeout(1000);
  const len = await page.evaluate(() => history.length);
  await page.evaluate(() => {
    window.__op = [];
    const room = document.getElementById('room');
    const tick = () => { window.__op.push(parseFloat(getComputedStyle(room).opacity)); if (window.__op.length < 150) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await pick(page, 'explore');
  await page.waitForFunction((h) => location.hash === h, `#/door/win-trust/${station}`, { polling: 30 });
  await page.waitForFunction((id) => document.activeElement?.id === id, `st-${station}`, { polling: 30 });
  await panelOpen(page);
  await page.waitForTimeout(1500);
  const s = await snap(page);
  const op = await page.evaluate(() => window.__op);
  annotate(testInfo, { s, minOpacity: Math.min(...op), frames: op.length });
  expect(s.len, 'the door replaced the tour entry').toBe(len);
  expect(s.touring).toBe(false);
  expect(s.cardHidden).toBe(true);
  expect(s.panelHidden).toBe(false);
  expect(s.title).toBe(`${m.doors[0].title} · ${m.site.name}`);
  expect(Math.min(...op), 'the room stayed up through the handover').toBe(1);
  expect(await page.evaluate(() => [...document.querySelectorAll('#panel .tabs .tab[aria-pressed="true"]')].map((b) => b.dataset.door))).toEqual(['win-trust']);
  // The room now belongs to the door route: with the tour on (?tour=1) its surfaces take the pins'
  // place (O14), carrying the station labels.
  const room = await page.evaluate(() => ({ pins: document.querySelectorAll('.room-pin').length, mode: window.__lobby.surfaces?.mode, labels: window.__lobby.surfaces?.surfaces.filter((x) => x.label).length }));
  expect(room.pins).toBe(0);
  expect(room.mode).toBe('door');
  expect(room.labels).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('panel').hidden, null, { polling: 50 });
  await settled(page);
  const end = await snap(page);
  expect(end.layerOpen).toBe(false);
  expect(end.title).toBe(m.site.title);
});

test('T-10 See the details on the path replaces the tour with #/path/<stage> and focuses its heading; Back → lobby', async ({ page }) => {
  await openTour(page, { hash: '#/tour/path' });
  await atNode(page, 'path');
  await settled(page);
  const t = await toLast(page);
  const stage = FX.nodes.path.lines[0].cue.stage;
  expect(t.scene.stage).toBe(stage);
  const len = await page.evaluate(() => history.length);
  await pick(page, 'explore');
  await page.waitForFunction((h) => location.hash === h, `#/path/${stage}`, { polling: 30 });
  await page.waitForFunction(() => document.activeElement?.id === 'panel-h2', null, { polling: 30 });
  await panelOpen(page);
  const s = await snap(page);
  expect(s.len).toBe(len);
  expect(s.touring).toBe(false);
  expect(await page.evaluate(() => [...document.querySelectorAll('#arcs path.lit')].map((p) => p.dataset.stage))).toEqual([stage]);
  await page.goBack();
  await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('panel').hidden, null, { polling: 50 });
});

test('T-10 a door or path hash edited by hand mid-tour opens its panel in a layer of its own: the lobby inert, focus in the panel, Escape closes it', async ({ page }, testInfo) => {
  const log = [];
  for (const hash of ['#/door/win-trust', '#/door/gain-control', '#/path']) {
    await openTour(page);
    await startTour(page);
    await pick(page, 'win-trust');
    await atNode(page, 'wt');
    await settled(page);
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.waitForFunction(() => !window.__tour.touring && !document.getElementById('panel').hidden, null, { polling: 30 });
    await panelOpen(page);
    await page.waitForFunction(() => document.getElementById('panel').contains(document.activeElement), null, { polling: 30, timeout: 5000 });
    const s = await page.evaluate(() => ({ hash: location.hash, inert: ['#doors', '#hud-actions'].map((q) => document.querySelector(q).hasAttribute('inert')), layerOpen: document.body.classList.contains('layer-open'), active: document.activeElement?.id || document.activeElement?.tagName }));
    log.push(s);
    expect(s.hash).toBe(hash);
    expect(s.inert, `${hash}: the lobby is inert under the panel`).toEqual([true, true]);
    expect(s.layerOpen).toBe(true);
    await page.keyboard.press('Escape');
    await page.waitForFunction((h) => location.hash !== h && document.getElementById('panel').hidden, hash, { polling: 30, timeout: 5000 });
  }
  annotate(testInfo, log);
});

// T-21: the captioned walk (P6) survives the tour. A #/walk/<n> link opens the silent walk at that
// step whether the tour is on (?tour=1), off (?tour=0) or at the manifest's default; nothing of the
// tour is fetched, its card stays hidden, and Escape lands on the lobby with focus on the walk button.
test('T-21 #/walk/<n> opens the captioned walk at that step with the tour on, off or at the default; no tour script, no card; Escape → lobby', async ({ browser }, testInfo) => {
  const log = [];
  for (const q of [TQ, `debug=1&tour=0&tour-manifest=${FIXTURE}`, 'debug=1']) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    try {
      await page.goto(`?${q}#/walk/2`);
      await ready(page);
      await page.waitForSelector('#walk .count');
      await settled(page);
      const s = await page.evaluate(() => ({
        hash: location.hash, walkHidden: document.getElementById('walk').hidden, count: document.querySelector('#walk .count')?.textContent.trim(),
        cardHidden: document.getElementById('tour').hidden, touring: !!window.__tour?.touring,
      }));
      const scripts = reqs.filter(tourRequest);
      log.push({ q, ...s, scripts });
      expect(s.hash).toBe('#/walk/2');
      expect(s.walkHidden).toBe(false);
      expect(s.count.startsWith('3 /'), `step 3 of the walk: ${s.count}`).toBe(true);
      expect(s.cardHidden).toBe(true);
      expect(s.touring).toBe(false);
      expect(scripts, `${q}: the walk fetches nothing of the tour`).toEqual([]);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('walk').hidden, null, { polling: 50 });
    } finally { await ctx.close(); }
  }
  annotate(testInfo, log);
});
