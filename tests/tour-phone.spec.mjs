// T-19: the tour on phones, portrait tablets and short screens (the composed layout). The card takes
// the sheet's place (from --sheet-top, or from the header when the screen is short and the band
// hides), full width, with no horizontal overflow; every control in it is at least 44x44 and each
// choice at least 56 px tall; no panel opens; callouts print their text and source from the
// manifest; a rotation re-applies the scene and keeps the line. On a short screen (a phone on its
// side, a desktop at 400% zoom) the whole card scrolls with Previous / Next held on screen, so the
// caption, the option Choose focuses and the map's Replay can all be reached (WCAG 1.4.10); at 320 px
// the summary's tiles wrap inside the card.
import { test, expect } from '@playwright/test';
import { open, settled, manifest as m, S, vp, annotate, r1, kioskLines } from './helpers.mjs';
import { FX, TQ, tour, card, atNode, startTour, toLast, pick, cont } from './tour-helpers.mjs';

const VPS = [[390, 844], [768, 1024], [844, 390], [320, 640]];

const LAYOUT = () => {
  const rr = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
  const cardEl = document.getElementById('tour');
  const band = document.getElementById('floor-band');
  const controls = [];
  for (const el of cardEl.querySelectorAll('button, a[href]')) {
    let hidden = false;
    for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || e.hidden) { hidden = true; break; } }
    if (hidden) continue;
    el.scrollIntoView({ block: 'nearest' });   // the card's body scrolls; a choice below the fold is reached by scrolling
    const b = el.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    controls.push({ key: el.id || el.dataset.option || el.className, opt: el.classList.contains('tour-opt'), width: b.width, height: b.height, bottom: b.bottom, hit: !!hit && (hit === el || el.contains(hit)) });
  }
  return {
    composed: document.body.classList.contains('composed'), short: document.body.classList.contains('short'),
    vw: innerWidth, vh: innerHeight, docScrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth,
    card: rr(cardEl), hudBottom: document.getElementById('hud').getBoundingClientRect().bottom,
    bandDisplay: getComputedStyle(band).display, band: rr(band),
    panelHidden: document.getElementById('panel').hidden, controls,
  };
};
const layout = (page) => page.evaluate(LAYOUT);

function checkLayout(s, label) {
  expect(s.composed, label).toBe(true);
  expect(s.docScrollWidth, `${label}: no horizontal overflow`).toBeLessThanOrEqual(s.vw);
  expect(s.bodyScrollWidth).toBeLessThanOrEqual(s.vw);
  expect(s.card.left).toBeCloseTo(0, 0);
  expect(s.card.right).toBeCloseTo(s.vw, 0);
  expect(s.card.bottom).toBeCloseTo(s.vh, 0);
  if (s.short) {
    expect(s.card.top, `${label}: the card starts at the header on a short screen`).toBeCloseTo(s.hudBottom, 0);
    expect(s.bandDisplay).toBe('none');
  } else {
    expect(s.card.top, `${label}: the card sits at the sheet top (39%)`).toBeCloseTo(s.vh * 0.39, 0);
    expect(s.bandDisplay).not.toBe('none');
    expect(s.band.bottom).toBeLessThanOrEqual(s.card.top + 1);
  }
  expect(s.panelHidden, `${label}: no panel`).toBe(true);
  for (const c of s.controls) {
    expect(Math.min(c.width, c.height), `${label}: ${c.key} is ${r1(c.width)}x${r1(c.height)}`).toBeGreaterThanOrEqual(44);
    if (c.opt) expect(c.height, `${label}: choice ${c.key} >= 56 tall`).toBeGreaterThanOrEqual(56);
    if (c.bottom <= s.vh) expect(c.hit, `${label}: ${c.key} is hit-testable`).toBe(true);
  }
}

for (const [w, h] of VPS) {
  test(`T-19 at ${w}x${h}: the card in the sheet's place, full width, no overflow, controls >= 44 px, choices >= 56 px, no panel, callouts with their sources`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h), query: TQ });
    await startTour(page);
    const log = [];
    let s = await layout(page);
    log.push({ at: 'arrive/0', card: [r1(s.card.top), r1(s.card.height)], controls: s.controls.length });
    checkLayout(s, 'arrive/0');
    expect(s.controls.map((c) => c.key)).toEqual(expect.arrayContaining(['tour-end', 'tour-next']));
    await toLast(page);
    s = await layout(page);
    log.push({ at: 'arrive choice', options: s.controls.filter((c) => c.opt).map((c) => [c.key, r1(c.height)]) });
    checkLayout(s, 'arrive choice');
    expect(s.controls.filter((c) => c.opt)).toHaveLength(FX.nodes.arrive.choice.options.length);
    await pick(page, 'win-trust');
    await atNode(page, 'wt');
    await settled(page);
    const t = await toLast(page);
    expect(t.lineId).toBe('wt-3');
    const stat = m.doors[0].stat;
    let c = await card(page);
    expect(c.caption).toBe(stat.text);
    expect(c.src).toBe(stat.source);
    s = await layout(page);
    checkLayout(s, 'wt-3');
    await cont(page);
    await atNode(page, 'wt-proof');
    await settled(page);
    c = await card(page);
    expect(c.src).toBe(m.doors[0].proof[0].basis);
    s = await layout(page);
    checkLayout(s, 'wt-proof');
    // The kiosk is never legible on a composed layout: the lobby with a tile of its counts and tag.
    await open(page, { viewport: vp(w, h), query: TQ, hash: '#/tour/kiosk' });
    await atNode(page, 'kiosk');
    expect((await tour(page)).scene.kiosk).toBe(false);
    c = await card(page);
    expect(c.callouts).toEqual([{ text: `${m.kiosk.header}: ${kioskLines().map((l) => `${l.value} ${l.label}`).join(' · ')}`, source: m.kiosk.tag }]);
    s = await layout(page);
    checkLayout(s, 'kiosk');
    log.push({ at: 'kiosk', card: [r1(s.card.top), r1(s.card.height)] });
    annotate(testInfo, log);
  });
}

test('T-19 a rotation re-applies the scene without animation and keeps the line; the card follows the layout', async ({ page }, testInfo) => {
  await open(page, { viewport: vp(390, 844), query: TQ, hash: '#/tour/wt' });
  await atNode(page, 'wt');
  await page.keyboard.press('ArrowRight');
  await atNode(page, 'wt', 1);
  const before = await tour(page);
  const log = [];
  for (const [w, h] of [[844, 390], [390, 844], [1280, 720], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    await settled(page);
    const t = await tour(page);
    const s = await page.evaluate(() => ({ z: window.__lobby.stage.z, composed: document.body.classList.contains('composed'), card: document.getElementById('tour').getBoundingClientRect().toJSON(), dock: window.__lobby.stage.dock, frame: window.__lobby.frame(), vh: innerHeight }));
    log.push({ w, h, node: t.node, line: t.line, z: s.z, composed: s.composed, cardTop: r1(s.card.top) });
    expect([t.node, t.line], `${w}x${h}`).toEqual([before.node, before.line]);
    expect(t.touring).toBe(true);
    expect(s.z).toBeCloseTo(1.3, 5);
    expect(s.dock).toBe('none');
    if (!s.composed) expect(s.frame.y + s.frame.h, 'desktop: the frame ends above the card').toBeLessThanOrEqual(s.card.top + 0.5);
  }
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('tour-next');
  annotate(testInfo, log);
});

for (const [w, h] of [[320, 256], [640, 360]]) {
  test(`T-19 at ${w}x${h} (a desktop at 400% zoom) the whole card scrolls with Previous / Next held on screen; the caption, the option Choose focuses and the map's Replay can all be reached`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h), query: TQ });
    await startTour(page);
    const s = await page.evaluate(() => {
      const c = document.getElementById('tour'), bar = document.getElementById('tour-bar'), cap = document.getElementById('tour-caption');
      const b = bar.getBoundingClientRect();
      cap.scrollIntoView({ block: 'end' });
      const x = cap.getBoundingClientRect(), b2 = bar.getBoundingClientRect();
      return { short: document.body.classList.contains('short'), overflowY: getComputedStyle(c).overflowY, barTop: b.top, barBottom: b.bottom, vh: innerHeight, capTop: x.top, capBottom: x.bottom, barTop2: b2.top, cardTop: c.getBoundingClientRect().top };
    });
    expect(s.short).toBe(true);
    expect(s.overflowY, 'the card scrolls as a whole').toBe('auto');
    expect(s.barBottom, 'Previous / Next inside the viewport').toBeLessThanOrEqual(s.vh + 0.5);
    expect(s.barTop).toBeGreaterThanOrEqual(s.cardTop);
    expect(s.capBottom, 'the caption scrolls clear of the bar').toBeLessThanOrEqual(s.barTop2 + 0.5);
    expect(s.capTop).toBeGreaterThanOrEqual(s.cardTop - 0.5);
    // Choose: the first option takes focus inside the visible part of the card, above the bar.
    await page.evaluate(() => { document.getElementById('tour').scrollTop = 0; });
    await toLast(page);
    await page.focus('#tour-next');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.activeElement?.dataset?.option, null, { polling: 30 });
    await page.waitForTimeout(150);
    const o = await page.evaluate(() => { const a = document.activeElement.getBoundingClientRect(), b = document.getElementById('tour-bar').getBoundingClientRect(), c = document.getElementById('tour').getBoundingClientRect(); return { top: a.top, bottom: a.bottom, barTop: b.top, cardTop: c.top }; });
    expect(o.top, 'the focused option below the card top').toBeGreaterThanOrEqual(o.cardTop - 0.5);
    expect(o.bottom, 'the focused option above Previous / Next').toBeLessThanOrEqual(o.barTop + 0.5);
    // The map: its foot (Replay from the start) can be scrolled to.
    await page.click('#tour-map-btn');
    await page.waitForFunction(() => document.getElementById('tour-map').open, null, { polling: 30 });
    await page.evaluate(() => Promise.all(document.getElementById('tour-map').getAnimations().map((a) => a.finished)));   // it slides in 10 px
    const r = await page.evaluate(() => { const d = document.getElementById('tour-map'), b = document.getElementById('tour-map-replay'); b.scrollIntoView({ block: 'nearest' }); const x = b.getBoundingClientRect(); return { overflowY: getComputedStyle(d).overflowY, top: x.top, bottom: x.bottom, vh: innerHeight }; });
    annotate(testInfo, { card: s, option: o, replay: r });
    expect(r.overflowY, 'the whole dialog scrolls').toBe('auto');
    expect(r.top).toBeGreaterThanOrEqual(0);
    expect(r.bottom, 'Replay can be scrolled into view').toBeLessThanOrEqual(r.vh + 0.5);
  });
}

test('T-19 at 320x568 the summary fits the width: its tiles wrap inside the card body, the lobby address included', async ({ page }, testInfo) => {
  await open(page, { viewport: vp(320, 568), query: 'debug=1&tour=1', hash: '#/tour/close' });
  await atNode(page, 'close');
  await toLast(page);
  await pick(page, 'summary');
  await page.waitForFunction(() => window.__tour.frame === 'summary', null, { polling: 30 });
  const s = await page.evaluate(() => {
    const b = document.getElementById('tour-body'), br = b.getBoundingClientRect();
    return { sw: b.scrollWidth, cw: b.clientWidth, wide: [...b.querySelectorAll('.tour-callout')].filter((t) => t.getBoundingClientRect().right > br.right + 0.5).map((t) => t.textContent.slice(0, 40)), doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, tiles: b.querySelectorAll('.tour-callout').length };
  });
  annotate(testInfo, s);
  expect(s.tiles).toBeGreaterThan(0);
  expect(s.sw, 'the body does not scroll sideways').toBeLessThanOrEqual(s.cw);
  expect(s.wide).toEqual([]);
  expect(s.doc).toBeLessThanOrEqual(0);
});
