// T-16 and T-17: motion in the tour (O10; P4-D02/P4-D06 carried over to the tour).
//   T-16 under reduced motion every tour step completes with document.getAnimations() empty, no
//        chapter title card shows, and the guide's sphere draws one still frame per state (a new
//        line in the same state draws nothing) with no drawing loop.
//   T-17 otherwise only transform and opacity animate during the tour (keyframes and transitions
//        alike), nothing keeps will-change once the camera has settled, and the sphere's loop runs
//        only while the card is on screen: it stops when the tab is hidden and when the tour ends,
//        and with the voice off it settles to a still frame a few seconds after each change, so no
//        motion runs past five seconds without the visitor doing something (WCAG 2.2.2).
// Runs on tests/fixtures/tour-min.json with ?tour=1.
import { test, expect } from '@playwright/test';
import { doorsShown, settled, isReduced, annotate } from './helpers.mjs';
import { tour, openTour, startTour, atNode, toLast, pick, cont } from './tour-helpers.mjs';

const ALLOWED = new Set(['transform', '-webkit-transform', 'opacity', 'offset', 'easing', 'composite', 'computedOffset']);
// Every running animation with the properties it changes: a transition's property, or the
// properties named in an animation's keyframes.
const ANIMS = () => document.getAnimations().map((a) => {
  const t = a.effect?.target;
  const target = t ? (t.id || (typeof t.className === 'string' ? t.className : '') || t.tagName) : null;
  const props = a.transitionProperty ? [a.transitionProperty] : [...new Set((a.effect?.getKeyframes?.() || []).flatMap((k) => Object.keys(k)))];
  return { type: a.constructor.name, name: a.animationName || a.transitionProperty || null, target, pseudo: a.effect?.pseudoElement || null, props, state: a.playState };
});
const WILL_CHANGE = () => [...document.querySelectorAll('*')].filter((el) => getComputedStyle(el).willChange !== 'auto').map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}: ${getComputedStyle(el).willChange}`);
const guide = (page) => page.evaluate(() => window.__tour.guide);
const hideTab = (page, hidden) => page.evaluate((h) => {
  if (h) {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  } else { delete document.hidden; delete document.visibilityState; }
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

test('T-16 reduced motion: every tour step completes with no animation, no title card, and one still frame of the sphere per state', async ({ page }, testInfo) => {
  test.skip(!isReduced(testInfo), 'the reduced-motion project covers this');
  await openTour(page);
  await doorsShown(page);
  const log = [];
  const check = async (at) => {
    await page.waitForTimeout(150);
    const s = await page.evaluate(() => ({ anims: document.getAnimations().length, title: (() => { const t = document.getElementById('tour-titlecard'); return !t.hidden && getComputedStyle(t).display !== 'none'; })(), g: window.__tour.guide, phase: window.__tour.phase, dialog: window.__tour.dialog }));
    log.push({ at, anims: s.anims, frames: s.g.frames, mode: s.g.mode, running: s.g.running, title: s.title });
    expect(s.anims, `${at}: animations`).toBe(0);
    expect(s.title, `${at}: title card`).toBe(false);
    expect(s.g.running, `${at}: no drawing loop`).toBe(false);
    return s;
  };
  await startTour(page);
  let s = await check('start');
  expect(s.g.frames, 'one still frame for the first state').toBe(1);
  expect(s.g.mode).toBe('idle');
  // The last line brings the choice: a new state, one more frame.
  await toLast(page);
  s = await check('arrive choice');
  expect([s.g.mode, s.g.frames]).toEqual(['choice', 2]);
  await pick(page, 'win-trust');
  await atNode(page, 'wt');
  await settled(page);
  s = await check('door');
  expect([s.g.mode, s.g.frames]).toEqual(['idle', 3]);
  // More lines in the same state draw nothing new.
  await page.keyboard.press('ArrowRight');
  await atNode(page, 'wt', 1);
  s = await check('door line 2');
  expect(s.g.frames).toBe(3);
  await page.keyboard.press('ArrowRight');
  await atNode(page, 'wt', 2);
  s = await check('door line 3');
  expect(s.g.frames).toBe(3);
  await cont(page);
  await atNode(page, 'wt-proof');
  s = await check('station');
  expect(s.g.frames, 'a new node in the same state draws nothing new').toBe(3);
  await page.click('#tour-map-btn');
  s = await check('map open');
  await page.keyboard.press('Escape');
  await page.click('#tour-ask-btn');
  await page.fill('#tour-ask-q', 'where do we start');
  await page.keyboard.press('Enter');
  s = await check('ask answered');
  await page.keyboard.press('Escape');
  await pick(page, 'onward');
  await atNode(page, 'lens');
  s = await check('keep');
  await pick(page, 'path');
  await atNode(page, 'path');
  await settled(page);
  s = await check('path');
  await page.click('#tour-end');
  await page.waitForFunction(() => location.hash === '#/experience', null, { polling: 50 });
  s = await check('ended');
  expect(s.g.mode).toBe('off');
  annotate(testInfo, log);
});

test('T-17 only transform and opacity animate through the tour, its dialogs and its scenes; nothing keeps will-change once settled', async ({ page }, testInfo) => {
  test.skip(isReduced(testInfo), 'no animations under reduced motion (T-16)');
  await openTour(page);
  await doorsShown(page);
  // Keyboard only, so no pointer hover starts a button's colour transition mid-sample.
  const press = async (sel) => { await page.focus(sel); await page.keyboard.press('Enter'); };
  const seen = [];
  const sample = async (at, n = 4) => {
    for (let i = 0; i < n; i++) { seen.push(...(await page.evaluate(ANIMS)).map((a) => ({ at, ...a }))); await page.waitForTimeout(90); }
  };
  await press('#walk-btn');
  await sample('start');
  await atNode(page, 'arrive');
  await page.keyboard.press('ArrowRight');
  await sample('line');
  await toLast(page);
  await sample('choice');
  await pick(page, 'gain-control');
  await sample('door', 8);
  await atNode(page, 'gc');
  await page.keyboard.press('ArrowRight');
  await sample('station cue', 6);
  await press('#tour-map-btn');
  await sample('map open', 3);
  await page.keyboard.press('Escape');
  await press('#tour-ask-btn');
  await sample('ask open', 3);
  await page.keyboard.press('Escape');
  await page.focus('#tour-next');   // Escape returned focus to Ask in the header
  await toLast(page);
  await pick(page, 'onward');
  await atNode(page, 'lens');
  await pick(page, 'path');
  await sample('path', 8);
  const bad = seen.filter((a) => a.props.some((p) => !ALLOWED.has(p)));
  annotate(testInfo, { kinds: [...new Set(seen.map((a) => `${a.at}: ${a.type} ${a.name} on ${a.target}${a.pseudo || ''} [${a.props.join(',')}]`))].slice(0, 60), bad });
  expect(seen.length, 'something animated').toBeGreaterThan(0);
  expect(bad, `animations on other properties: ${JSON.stringify(bad.slice(0, 5))}`).toEqual([]);
  await settled(page);
  await page.waitForTimeout(1600);
  expect(await page.evaluate(WILL_CHANGE), 'no will-change once the camera has settled').toEqual([]);
});

test('T-17 the sphere draws while the card is on screen, stops when the tab is hidden and starts again when it returns, settles a few seconds after the last change with the voice off, and stops for good when the tour ends', async ({ page }, testInfo) => {
  test.skip(isReduced(testInfo), 'no drawing loop under reduced motion (T-16)');
  await openTour(page);
  await doorsShown(page);
  await startTour(page);
  let g = await guide(page);
  expect(g.running).toBe(true);
  const f0 = g.frames;
  await page.waitForTimeout(600);
  g = await guide(page);
  const rate = (g.frames - f0) / 0.6;
  expect(rate, `${rate.toFixed(1)} frames a second`).toBeGreaterThan(5);
  expect(rate, `${rate.toFixed(1)} frames a second`).toBeLessThan(40);
  await hideTab(page, true);
  g = await guide(page);
  expect(g.running).toBe(false);
  const f1 = g.frames;
  await page.waitForTimeout(500);
  expect((await guide(page)).frames, 'no frames while hidden').toBe(f1);
  await hideTab(page, false);
  expect((await guide(page)).running, 'back on screen, the sphere draws again').toBe(true);
  expect((await tour(page)).pausedBy, 'the tour itself stays paused until the visitor moves it').toEqual(['hidden']);
  // Nothing changes (the voice is off, so the tour waits for Next): the sphere settles into a still
  // frame within five seconds and stays still; the visitor's next step brings it back.
  await page.waitForFunction(() => !window.__tour.guide.running, null, { polling: 100, timeout: 5000 });
  const fs = (await guide(page)).frames;
  await page.waitForTimeout(800);
  expect((await guide(page)).frames, 'still: no frames while the tour waits').toBe(fs);
  await page.focus('#tour-next');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => window.__tour.guide.running, null, { polling: 30 });
  await page.click('#tour-end');
  await page.waitForFunction(() => location.hash === '#/experience', null, { polling: 50 });
  g = await guide(page);
  expect([g.running, g.mode]).toEqual([false, 'off']);
  const f2 = g.frames;
  await page.waitForTimeout(500);
  expect((await guide(page)).frames, 'no frames after the end').toBe(f2);
  annotate(testInfo, { rate, frames: f2 });
});
