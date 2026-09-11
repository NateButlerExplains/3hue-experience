// P4-D02 and P4-D06: only transform and opacity animate during a door open, will-change is
// absent at rest; under reduced motion every flow completes with document.getAnimations() empty.
import { test, expect } from '@playwright/test';
import { open, doorsShown, panelOpen, atRest, settled, isReduced, DOORS, STAGES, S, annotate } from './helpers.mjs';

const WILL_CHANGE = () => [...document.querySelectorAll('*')].filter((el) => getComputedStyle(el).willChange !== 'auto').map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}: ${getComputedStyle(el).willChange}`);
const ANIMS = () => document.getAnimations().map((a) => ({ type: a.constructor.name, prop: a.transitionProperty || a.animationName || null, target: a.effect?.target ? (a.effect.target.id || a.effect.target.className || a.effect.target.tagName) : null, state: a.playState }));

test('P4-D02 during a door open only transform and opacity change on #plate; will-change only while moving', async ({ page }, testInfo) => {
  test.skip(isReduced(testInfo), 'transitions are disabled under reduced motion; covered by the P4-D06 test');
  await open(page);
  await doorsShown(page);
  const wcRest = await page.evaluate(WILL_CHANGE);
  expect(wcRest, 'no will-change at rest').toEqual([]);

  // Sample #plate's computed style every ~16 ms for 300 ms while the dolly starts, plus the
  // running animations mid-move.
  const sampling = page.evaluate(() => new Promise((res) => {
    const el = document.getElementById('plate');
    const skip = new Set(['transition', 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay', 'transition-behavior', 'will-change']);
    const grab = () => { const cs = getComputedStyle(el); const o = {}; for (const p of cs) if (!skip.has(p)) o[p] = cs.getPropertyValue(p); return o; };
    const snaps = []; let anims = null; const t0 = performance.now();
    const tick = () => {
      const t = performance.now() - t0;
      snaps.push({ t, s: grab(), wc: getComputedStyle(el).willChange, moving: el.classList.contains('moving') });
      if (t > 140 && !anims) anims = document.getAnimations().map((a) => ({ type: a.constructor.name, prop: a.transitionProperty || a.animationName || null, target: a.effect?.target ? (a.effect.target.id || a.effect.target.className || a.effect.target.tagName) : null }));
      if (t < 300) setTimeout(tick, 16); else res({ snaps, anims });
    };
    tick();
  }));
  await page.waitForTimeout(30);
  await page.click(`#doors .door[data-door="${DOORS[0]}"]`);
  const { snaps, anims } = await sampling;
  const changed = new Set();
  const first = snaps[0].s;
  for (const sn of snaps.slice(1)) for (const [k, v] of Object.entries(sn.s)) if (v !== first[k]) changed.add(k);
  const transforms = snaps.map((s) => s.s.transform);
  annotate(testInfo, { samples: snaps.length, changed: [...changed], transformsDistinct: new Set(transforms).size, movingSamples: snaps.filter((s) => s.moving).length, willChangeDuring: [...new Set(snaps.map((s) => s.wc))], anims });
  const allowed = new Set(['transform', '-webkit-transform', 'opacity']);
  const custom = [...changed].filter((k) => k.startsWith('--')); // --counter/--k: set once per placement, inherited, not animated
  expect([...changed].filter((k) => !allowed.has(k) && !k.startsWith('--')), `properties other than transform/opacity changed on #plate during the move: ${[...changed].join(', ')} (custom: ${custom.join(', ')})`).toEqual([]);
  expect(new Set(transforms).size, 'the transform actually moved during the sample window').toBeGreaterThan(3);
  expect(snaps.some((s) => s.wc === 'transform'), 'will-change: transform during the move').toBe(true);
  expect((anims || []).length).toBeGreaterThan(0);
  expect((anims || []).some((a) => a.prop === 'transform' && a.target === 'plate'), 'the plate transform transition is running mid-move').toBe(true);

  await panelOpen(page);
  await page.waitForTimeout(2200); // room settle (1600 ms) after its 400 ms delay
  const wcOpen = await page.evaluate(WILL_CHANGE);
  expect(wcOpen, 'no will-change once the move has settled').toEqual([]);
  await page.keyboard.press('Escape');
  await atRest(page);
  await page.waitForTimeout(300);
  expect(await page.evaluate(WILL_CHANGE), 'no will-change at rest after closing').toEqual([]);
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('plate')).willChange)).toBe('auto');
});

test('P4-D02 every animation running during a door open is a transform or opacity animation', async ({ page }, testInfo) => {
  test.skip(isReduced(testInfo), 'no animations under reduced motion');
  await open(page);
  await doorsShown(page);
  await page.waitForTimeout(400);
  await page.click(`#doors .door[data-door="${DOORS[1]}"]`);
  await page.waitForTimeout(60);
  const anims = await page.evaluate(ANIMS);
  await page.waitForTimeout(500);
  const later = await page.evaluate(ANIMS);
  const all = [...anims, ...later];
  annotate(testInfo, { at60ms: anims, at560ms: later });
  const others = all.filter((a) => !(a.prop === 'transform' || a.prop === 'opacity' || a.prop === '-webkit-transform' || a.prop === 'pulse'));
  expect(others, `animations on properties other than transform/opacity during a door open: ${JSON.stringify(others)}`).toEqual([]);
});

test('P4-D02 the resting pulse is the only rest-state animation and it animates opacity only', async ({ page }, testInfo) => {
  test.skip(isReduced(testInfo), 'no pulse under reduced motion');
  await open(page);
  await doorsShown(page);
  await page.waitForTimeout(800);
  const anims = await page.evaluate(ANIMS);
  annotate(testInfo, anims);
  const others = anims.filter((a) => !(a.prop === 'pulse' || a.prop === 'opacity'));
  expect(others).toEqual([]);
});

test('P4-D06 / P2a-D04 reduced motion: every flow completes and document.getAnimations() is empty after each step', async ({ page }, testInfo) => {
  test.skip(!isReduced(testInfo), 'runs under the chromium-reduced project only');
  const log = [];
  const check = async (label, extra = {}) => {
    const r = await page.evaluate(() => ({ anims: document.getAnimations().map((a) => ({ type: a.constructor.name, prop: a.transitionProperty || a.animationName || null, target: a.effect?.target?.id || a.effect?.target?.className || null })), moving: document.getElementById('plate').classList.contains('moving'), hash: location.hash, plateTransition: getComputedStyle(document.getElementById('plate')).transitionDuration, roomOpacity: getComputedStyle(document.getElementById('room')).opacity, placeholderOpacity: getComputedStyle(document.getElementById('placeholder')).opacity, plateOpacity: getComputedStyle(document.getElementById('plate')).opacity }));
    log.push({ label, ...r, ...extra });
    expect(r.anims, `${label}: getAnimations() empty`).toEqual([]);
    expect(r.moving, `${label}: no moving class`).toBe(false);
    expect(r.plateTransition.split(',').every((d) => parseFloat(d) === 0), `${label}: plate transition duration is 0 (${r.plateTransition})`).toBe(true);
    return r;
  };
  await open(page, { settle: false });
  // P2a-D04: the fade is instant.
  const boot = await check('boot');
  expect(boot.placeholderOpacity).toBe('0');
  expect(boot.plateOpacity).toBe('1');
  await doorsShown(page);
  await check('rest');

  // Door open.
  await page.click(`#doors .door[data-door="${DOORS[0]}"]`);
  await page.waitForFunction(() => document.activeElement?.id === 'panel-h2', null, { polling: 50 });
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.getElementById('room')).opacity) === 1, null, { polling: 50, timeout: 3000 });
  const opened = await check('door open');
  expect(opened.hash).toBe(`#/door/${DOORS[0]}`);
  // Tab switch.
  await page.click(`#panel .tabs .tab[data-door="${DOORS[1]}"]`);
  await page.waitForFunction((h) => location.hash === h, `#/door/${DOORS[1]}`, { polling: 50 });
  await page.waitForTimeout(300);
  await check('tab switch');
  // Close.
  await page.keyboard.press('Escape');
  await atRest(page);
  const closed = await check('close');
  expect(closed.roomOpacity).toBe('0');
  // Path, four stages.
  await page.click('#doors .path-chip');
  await panelOpen(page);
  await check('#/path');
  for (const st of STAGES) {
    await page.click('#stage-next');
    await page.waitForFunction((st) => location.hash === `#/path/${st}` && document.querySelectorAll('#arcs path.lit').length === 1 && document.querySelector('#arcs path.lit').dataset.stage === st, st, { polling: 50 });
    await page.waitForTimeout(150);
    await check(`stage ${st}`);
  }
  expect(await page.evaluate(() => document.querySelector('#stage-next').textContent.trim())).toBe(S.whereToStart);
  await page.keyboard.press('Escape');
  await atRest(page);
  await check('close path');
  // Walk, three steps.
  await page.click('#walk-btn');
  await page.waitForFunction(() => document.activeElement?.id === 'walk-next', null, { polling: 50 });
  await check('walk start');
  for (let i = 1; i <= 3; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction((i) => location.hash === `#/walk/${i}`, i, { polling: 50 });
    await page.waitForTimeout(150);
    await check(`walk step ${i}`);
  }
  await page.keyboard.press('Escape');
  await atRest(page);
  await check('walk end');
  annotate(testInfo, log.map((l) => ({ label: l.label, hash: l.hash, anims: l.anims.length })));
});
