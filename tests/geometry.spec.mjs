// P2a-D01 and P3-D04: every ring sits on its doorway (within 4 px of the projected centre), the
// door button is what elementFromPoint returns there, Assess labels the lowest band, and
// landscape tablets keep the desktop scene.
import { test, expect } from '@playwright/test';
import { open, doorsShown, DOORS, STAGES, vp, annotate, r1 } from './helpers.mjs';

const DESKTOP = [[1024, 768], [1280, 800], [1440, 900], [1512, 982], [1920, 1080], [2560, 1440]];
const TABLETS = [[1024, 768], [1180, 820], [1366, 1024]];

async function measure(page) {
  return page.evaluate((ids) => {
    const L = window.__lobby;
    const name = (el) => (el ? (el.id ? `#${el.id}` : el.tagName.toLowerCase() + (el.className ? `.${String(el.className).split(' ').filter(Boolean).join('.')}` : '') + (el.dataset?.door ? `[data-door=${el.dataset.door}]` : '')) : null);
    const out = { composed: L.stage.composed, bodyComposed: document.body.classList.contains('composed'), s: L.stage.s, doors: {}, rings: L.rects.rings, labels: {} };
    for (const id of ids) {
      const btn = document.querySelector(`#doors .door[data-door="${id}"]`);
      const ring = btn.querySelector('.marker .ring');
      const r = ring.getBoundingClientRect();
      const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const exp = L.rects.doors[id].center;
      const hit = document.elementFromPoint(c.x, c.y);
      const f = L.rects.doors[id].frame;
      out.doors[id] = {
        ring: c, expected: exp, dist: Math.hypot(c.x - exp.x, c.y - exp.y),
        ringSize: [r.width, r.height], hit: name(hit), hitIsButton: hit === btn,
        inFrame: c.x > f.left && c.x < f.right && c.y > f.top && c.y < f.bottom,
        onScreen: c.x >= 0 && c.x <= innerWidth && c.y >= 0 && c.y <= innerHeight,
      };
    }
    for (const el of document.querySelectorAll('.scene-labels .stage-name')) {
      const r = el.getBoundingClientRect();
      out.labels[el.dataset.stage] = { y: r.top + r.height / 2, screenFont: parseFloat(getComputedStyle(el).fontSize) * L.stage.s, text: el.textContent };
    }
    return out;
  }, DOORS);
}

function assertRings(m, w, h) {
  expect(m.composed, `${w}x${h} is a desktop scene`).toBe(false);
  expect(m.bodyComposed).toBe(false);
  for (const id of DOORS) {
    const d = m.doors[id];
    expect(d.dist, `${id} ring vs projected doorway centre at ${w}x${h}: ${r1(d.dist)} px`).toBeLessThanOrEqual(4);
    expect(d.inFrame, `${id} ring inside its door frame`).toBe(true);
    expect(d.onScreen, `${id} ring on screen`).toBe(true);
    expect(d.hitIsButton, `elementFromPoint at ${id} ring centre is ${d.hit}, expected the door button`).toBe(true);
    expect(Math.abs(d.ringSize[0] - 30), `${id} ring is 30 px on screen (got ${r1(d.ringSize[0])})`).toBeLessThanOrEqual(1);
  }
  // Assess labels the lowest band: largest y among the ring labels, in both the projection and the DOM.
  const first = STAGES[0];
  for (const st of STAGES.slice(1)) {
    expect(m.rings[first].y, `${first} projected label below ${st}`).toBeGreaterThan(m.rings[st].y);
    expect(m.labels[first].y, `${first} DOM label below ${st}`).toBeGreaterThan(m.labels[st].y);
  }
  for (const st of STAGES) expect(m.labels[st].screenFont, `${st} label >= 12 px on screen`).toBeGreaterThanOrEqual(11.95);
}

for (const [w, h] of DESKTOP) {
  test(`P2a-D01 rings on their doorways at ${w}x${h}`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    await doorsShown(page);
    const m = await measure(page);
    annotate(testInfo, { viewport: `${w}x${h}`, doors: Object.fromEntries(DOORS.map((id) => [id, { dist: r1(m.doors[id].dist), hit: m.doors[id].hit }])), rings: Object.fromEntries(STAGES.map((s) => [s, r1(m.rings[s].y)])) });
    assertRings(m, w, h);
  });
}

for (const [w, h] of TABLETS) {
  test(`P3-D04 landscape tablet ${w}x${h} keeps the desktop scene, rings within 4 px`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    await doorsShown(page);
    const m = await measure(page);
    annotate(testInfo, { viewport: `${w}x${h}`, composed: m.composed, doors: Object.fromEntries(DOORS.map((id) => [id, r1(m.doors[id].dist)])) });
    assertRings(m, w, h);
  });
}

test('P2a-D01 hover and focus change only the ring and chip (door button and frame stay put)', async ({ page }) => {
  await open(page);
  await doorsShown(page);
  for (const id of DOORS) {
    const before = await page.evaluate((id) => { const b = document.querySelector(`#doors .door[data-door="${id}"]`); const r = b.getBoundingClientRect(); const ring = b.querySelector('.ring').getBoundingClientRect(); return { btn: [r.left, r.top, r.width, r.height], ring: [ring.left + ring.width / 2, ring.top + ring.height / 2] }; }, id);
    const c = await page.evaluate((id) => window.__lobby.rects.doors[id].center, id);
    await page.mouse.move(c.x, c.y);
    await page.waitForTimeout(200);
    const after = await page.evaluate((id) => { const b = document.querySelector(`#doors .door[data-door="${id}"]`); const r = b.getBoundingClientRect(); const ring = b.querySelector('.ring').getBoundingClientRect(); return { btn: [r.left, r.top, r.width, r.height], ring: [ring.left + ring.width / 2, ring.top + ring.height / 2], hover: b.matches(':hover') }; }, id);
    expect(after.hover).toBe(true);
    expect(after.btn).toEqual(before.btn);
    expect(Math.abs(after.ring[0] - before.ring[0])).toBeLessThan(1);
    expect(Math.abs(after.ring[1] - before.ring[1])).toBeLessThan(1);
  }
});
