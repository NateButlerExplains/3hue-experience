// P4-D03: from #/path, Next stage lights the rings bottom to top, each arc directly above its
// stage's name and fully visible beside the panel, then Where to start.
import { test, expect } from '@playwright/test';
import { open, panelOpen, manifest as m, S, STAGES, DOORS, stageById, doorById, annotate, r1, frameToRect, inside, intersects } from './helpers.mjs';

const measureLit = (page, st) => page.evaluate((st) => {
  const L = window.__lobby;
  const lit = [...document.querySelectorAll('#arcs path.lit')];
  const p = lit[0];
  const r = p ? p.getBoundingClientRect() : null;
  const lab = document.querySelector(`.scene-labels .stage-name[data-stage="${st}"]`).getBoundingClientRect();
  const li = document.querySelector('#stage-list li[aria-current="step"]');
  const panel = document.getElementById('panel').getBoundingClientRect();
  return {
    litStages: lit.map((x) => x.dataset.stage),
    bbox: r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 } : null,
    opacity: p ? getComputedStyle(p).opacity : null,
    label: { x: lab.left + lab.width / 2, y: lab.top + lab.height / 2, top: lab.top, text: document.querySelector(`.scene-labels .stage-name[data-stage="${st}"]`).textContent },
    ring: L.rects.rings[st], R: L.frame(), z: L.stage.z,
    panel: { left: panel.left, top: panel.top, right: panel.right, bottom: panel.bottom },
    current: li ? { name: li.querySelector('b').textContent.trim(), tag: li.querySelector('.current')?.textContent.trim() ?? null } : null,
    listCount: document.querySelectorAll('#stage-list > li').length,
    next: document.querySelector('#stage-next').textContent.trim(), nextDisabled: document.querySelector('#stage-next').disabled,
    prevDisabled: document.querySelector('#stage-prev').disabled,
    hash: location.hash, vw: innerWidth, vh: innerHeight,
  };
}, st);

test('P4-D03 Next stage lights Assess → Advance bottom to top, then Where to start', async ({ page }, testInfo) => {
  await open(page, { hash: '#/path' });
  await panelOpen(page);
  const start = await page.evaluate(() => ({ lit: document.querySelectorAll('#arcs path.lit').length, arcs: document.querySelectorAll('#arcs path').length, next: document.querySelector('#stage-next').textContent.trim(), prevDisabled: document.querySelector('#stage-prev').disabled, li: document.querySelectorAll('#stage-list > li').length, current: document.querySelectorAll('#stage-list li[aria-current="step"]').length }));
  expect(start.lit).toBe(0);
  expect(start.arcs).toBe(STAGES.length);
  expect(start.li).toBe(STAGES.length);
  expect(start.current).toBe(0);
  expect(start.next).toBe(S.next);
  expect(start.prevDisabled).toBe(true);

  const log = [];
  let prevY = Infinity;
  for (const [i, st] of STAGES.entries()) {
    await page.click('#stage-next');
    await page.waitForFunction((st) => { const l = document.querySelectorAll('#arcs path.lit'); return l.length === 1 && l[0].dataset.stage === st; }, st, { polling: 50 });
    await page.waitForTimeout(600); // the glow's 500 ms opacity transition
    const r = await measureLit(page, st);
    log.push({ stage: st, cy: r1(r.bbox.cy), cx: r1(r.bbox.cx), labelY: r1(r.label.y), labelX: r1(r.label.x), opacity: r.opacity, R: r.R });
    expect(r.litStages).toEqual([st]);
    expect(r.hash).toBe(`#/path/${st}`);
    expect(parseFloat(r.opacity)).toBeGreaterThan(0.5);
    expect(r.bbox.cy, `${st} arc centre y ${r1(r.bbox.cy)} above the previous ${r1(prevY)}`).toBeLessThan(prevY);
    prevY = r.bbox.cy;
    expect(r.bbox.bottom, `${st} arc bottom ${r1(r.bbox.bottom)} above its label top ${r1(r.label.top)}`).toBeLessThanOrEqual(r.label.top + 1);
    expect(Math.abs(r.bbox.cx - r.label.x), `${st} arc centred over its label (dx ${r1(r.bbox.cx - r.label.x)})`).toBeLessThan(40);
    expect(r.label.text.toLowerCase()).toBe(stageById(st).name.toLowerCase());
    expect(inside(r.bbox, frameToRect(r.R), 1), `${st} arc ${JSON.stringify(r.bbox)} fully inside R ${JSON.stringify(r.R)}`).toBe(true);
    expect(intersects(r.bbox, r.panel), `${st} arc clear of the panel`).toBe(false);
    expect(r.current).toEqual({ name: stageById(st).name, tag: S.current });
    expect(r.listCount).toBe(STAGES.length);
    expect(r.z).toBeCloseTo(1.3, 5);
    expect(r.prevDisabled, 'Previous is enabled once past the first stage').toBe(i === 0);
    expect(r.next).toBe(i === STAGES.length - 1 ? S.whereToStart : S.next);
    expect(r.nextDisabled).toBe(false);
  }
  // Previous steps back one stage, Next returns.
  await page.click('#stage-prev');
  await page.waitForFunction((st) => location.hash === `#/path/${st}` && document.querySelector('#arcs path.lit')?.dataset.stage === st, STAGES[STAGES.length - 2], { polling: 50 });
  await page.click('#stage-next');
  await page.waitForFunction((st) => location.hash === `#/path/${st}`, STAGES[STAGES.length - 1], { polling: 50 });
  // Where to start.
  await page.click('#stage-next');
  await page.waitForSelector('#where-to-start');
  const end = await page.evaluate(() => ({
    hash: location.hash, h3: document.getElementById('where-to-start').textContent.trim(),
    lead: document.getElementById('where-to-start').nextElementSibling?.textContent.trim(),
    lit: document.querySelectorAll('#arcs path.lit').length, nextDisabled: document.querySelector('#stage-next').disabled,
    buttons: [...document.querySelectorAll('#where-to-start ~ ul button[data-door]')].map((b) => ({ id: b.dataset.door, text: b.textContent.trim(), stages: b.parentElement.textContent.replace(b.textContent, '').trim() })),
    talk: [...document.querySelectorAll('#panel .btn.primary')].map((a) => a.textContent.trim()),
    current: document.querySelectorAll('#stage-list li[aria-current="step"]').length,
  }));
  log.push({ whereToStart: end });
  annotate(testInfo, log);
  expect(end.hash).toBe('#/path/where-to-start');
  expect(end.h3).toBe(S.whereToStart);
  expect(end.lead).toContain(m.path.whereToStart.lead);
  expect(end.lead).toContain(m.path.whereToStart.source);
  expect(end.nextDisabled).toBe(true);
  expect(end.buttons.map((b) => b.id)).toEqual(DOORS);
  for (const b of end.buttons) {
    const d = doorById(b.id);
    expect(b.text).toBe(d.title);
    expect(b.stages).toBe(d.maturityEmphasis.map((s) => stageById(s).name).join(', '));
  }
  expect(end.talk, 'a filled Talk ends the Where to start panel').toContain(S.talk);
  // A door button under Where to start opens that door.
  await page.click(`#where-to-start ~ ul button[data-door="${DOORS[2]}"]`);
  await page.waitForFunction((h) => location.hash === h, `#/door/${DOORS[2]}`, { polling: 50 });
  await panelOpen(page);
  expect(await page.evaluate(() => document.getElementById('panel-h2').textContent.trim())).toBe(`${doorById(DOORS[2]).title}: ${doorById(DOORS[2]).promise}`);
});
