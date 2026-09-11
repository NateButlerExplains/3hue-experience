// P4-D05: at 1440x900 a hovered (or focused) door plate stays inside the viewport and never
// covers another door's ring; its text comes from the manifest, and each service family (a quote-
// builder category name, O15) fits in two lines.
import { test, expect } from '@playwright/test';
import { open, doorsShown, tabTo, manifest as m, S, DOORS, doorById, fill, annotate, r1, intersects } from './helpers.mjs';

const measure = (page, id) => page.evaluate((id) => {
  const btn = document.querySelector(`#doors .door[data-door="${id}"]`);
  const plate = btn.querySelector('.plate');
  const p = plate.getBoundingClientRect();
  const rings = {};
  for (const b of document.querySelectorAll('#doors .door')) { const r = b.querySelector('.ring').getBoundingClientRect(); rings[b.dataset.door] = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; }
  return {
    plate: { left: p.left, top: p.top, right: p.right, bottom: p.bottom, width: p.width, height: p.height },
    opacity: getComputedStyle(plate).opacity, flip: btn.querySelector('.marker').classList.contains('flip'),
    rings, vw: innerWidth, vh: innerHeight,
    text: { b: plate.querySelector('b').textContent.trim(), i: plate.querySelector('i').textContent.trim(), spans: [...plate.querySelectorAll('span')].map((s) => s.textContent.trim()) },
    lines: [...plate.querySelectorAll('span')].map((s) => Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight))),
    pointerEvents: getComputedStyle(plate).pointerEvents,
  };
}, id);

test('P4-D05 hovered plates stay on screen and clear of every other ring at 1440x900', async ({ page }, testInfo) => {
  await open(page);
  await doorsShown(page);
  const log = {};
  for (const id of DOORS) {
    const c = await page.evaluate((id) => window.__lobby.rects.doors[id].center, id);
    await page.mouse.move(c.x, c.y);
    await page.waitForFunction((id) => parseFloat(getComputedStyle(document.querySelector(`#doors .door[data-door="${id}"] .plate`)).opacity) === 1, id, { polling: 50 });
    const r = await measure(page, id);
    log[id] = { plate: Object.fromEntries(Object.entries(r.plate).map(([k, v]) => [k, r1(v)])), flip: r.flip };
    expect(r.plate.left, `${id} plate left`).toBeGreaterThanOrEqual(0);
    expect(r.plate.top, `${id} plate top`).toBeGreaterThanOrEqual(0);
    expect(r.plate.right, `${id} plate right ${r1(r.plate.right)} within ${r.vw}`).toBeLessThanOrEqual(r.vw);
    expect(r.plate.bottom, `${id} plate bottom ${r1(r.plate.bottom)} within ${r.vh}`).toBeLessThanOrEqual(r.vh);
    for (const other of DOORS) if (other !== id) expect(intersects(r.plate, r.rings[other]), `${id} plate covers the ${other} ring`).toBe(false);
    // Hoverable per WCAG 1.4.13: the plate accepts the pointer while the door is hovered (clicks bubble to the door).
    expect(['auto', 'none']).toContain(r.pointerEvents);
    const d = doorById(id);
    expect(r.text.b).toBe(fill(S.explore, { door: d.title }));
    expect(r.text.i).toBe(fill(S.for, { icp: d.icp }));
    expect(r.text.spans).toEqual(d.serviceFamilies.map((f) => f.name));
    // The families are Builder category names (O15), some long: each fits the plate in two lines at most.
    for (const [k, n] of r.lines.entries()) expect(n, `${id}: "${r.text.spans[k]}" runs to ${n} lines`).toBeLessThanOrEqual(2);
    log[id].lines = r.lines;
    // Moving away fades it out.
    await page.mouse.move(8, r.vh - 8);
    await page.waitForFunction((id) => parseFloat(getComputedStyle(document.querySelector(`#doors .door[data-door="${id}"] .plate`)).opacity) === 0, id, { polling: 50 });
  }
  annotate(testInfo, log);
});

test('P4-D05 keyboard focus shows the plate with the same constraints', async ({ page }) => {
  await open(page);
  await doorsShown(page);
  await page.mouse.move(8, 892);
  for (const id of DOORS) {
    await tabTo(page, `door:${id}`);
    await page.waitForFunction((id) => parseFloat(getComputedStyle(document.querySelector(`#doors .door[data-door="${id}"] .plate`)).opacity) === 1, id, { polling: 50 });
    const r = await measure(page, id);
    expect(r.plate.left).toBeGreaterThanOrEqual(0);
    expect(r.plate.right).toBeLessThanOrEqual(r.vw);
    expect(r.plate.bottom).toBeLessThanOrEqual(r.vh);
    for (const other of DOORS) if (other !== id) expect(intersects(r.plate, r.rings[other]), `${id} plate covers the ${other} ring`).toBe(false);
  }
});
