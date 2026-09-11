// P5-D02 and P5-D04: the kiosk is hidden or fully on its screen with every line 12 px or more;
// its mounted corners sit within 2 px of the projected quad, at rest and through the Stay Ready
// dolly; it is a display only (no tab stop, no click effect), showing manifest-derived counts.
import { test, expect } from '@playwright/test';
import { open, doorsShown, panelOpen, manifest as m, DOORS, kioskLines, vp, annotate, r1, hash } from './helpers.mjs';

const VPS = [[1280, 720], [1366, 657], [1440, 900], [1920, 1080], [2560, 1440]];

// Four 1x1 probes at the kiosk's unwarped corners; their projected positions are the corners the
// matrix3d actually puts on screen. Probes are test-side DOM only and are removed afterwards.
const MEASURE = () => {
  const L = window.__lobby;
  const el = document.querySelector('.kiosk');
  if (!el) return { mounted: false };
  const hidden = el.hidden || getComputedStyle(el).display === 'none';
  const out = { mounted: true, hidden, vw: innerWidth, vh: innerHeight, s: L.stage.s, z: L.stage.z, projected: L.rects.kiosk, tabindex: el.getAttribute('tabindex'), ariaHidden: el.getAttribute('aria-hidden'), pointerEvents: getComputedStyle(el).pointerEvents, focusables: el.querySelectorAll('a,button,input,select,textarea,[tabindex]').length, text: [...el.querySelectorAll('p')].map((p) => p.textContent.trim()) };
  if (hidden) return out;
  const w = el.offsetWidth, h = el.offsetHeight;
  const probes = [[0, 0, 'lt'], [w - 1, 0, 'rt'], [w - 1, h - 1, 'rb'], [0, h - 1, 'lb']].map(([x, y, k]) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:1px;height:1px;pointer-events:none;`; el.appendChild(d); const r = d.getBoundingClientRect(); d.remove(); return { x: k[0] === 'l' ? r.left : r.right, y: k[1] === 't' ? r.top : r.bottom }; });
  out.mountedCorners = probes;
  out.cornerDelta = probes.map((p, i) => Math.hypot(p.x - L.rects.kiosk[i].x, p.y - L.rects.kiosk[i].y));
  out.lines = [...el.querySelectorAll('p')].map((p) => { const r = p.getBoundingClientRect(); const font = parseFloat(getComputedStyle(p).fontSize); const scale = p.offsetHeight ? r.height / p.offsetHeight : 1; return { text: p.textContent.trim(), font, screenHeight: r.height, effectiveFont: font * scale, left: r.left, right: r.right, top: r.top, bottom: r.bottom, color: getComputedStyle(p).color }; });
  const b = el.getBoundingClientRect();
  out.box = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
  return out;
};

function expectedLines() { return [m.kiosk.header, ...kioskLines().map((l) => `${l.value} ${l.label}`), m.kiosk.tag]; }

for (const [w, h] of VPS) {
  test(`P5-D02 kiosk at ${w}x${h}: hidden, or every line >= 12 px with corners on screen`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    await doorsShown(page);
    const k = await page.evaluate(MEASURE);
    annotate(testInfo, { viewport: `${w}x${h}`, hidden: k.hidden, lines: k.lines?.map((l) => ({ text: l.text, eff: r1(l.effectiveFont) })), cornerDelta: k.cornerDelta?.map(r1), projected: k.projected?.map((p) => [r1(p.x), r1(p.y)]) });
    expect(k.mounted, 'kiosk is mounted (quad measured twice)').toBe(true);
    expect(k.text).toEqual(expectedLines());
    if (k.hidden) return;
    for (const l of k.lines) expect(l.effectiveFont, `"${l.text}" renders at ${r1(l.effectiveFont)} px`).toBeGreaterThanOrEqual(12);
    // Left corners on screen (the right edge is the plate's own edge), every corner vertically on screen, all within 2 px.
    for (const [i, p] of k.projected.entries()) {
      if (i === 0 || i === 3) expect(p.x, `corner ${i} x`).toBeGreaterThanOrEqual(-2);
      expect(p.y, `corner ${i} y`).toBeGreaterThanOrEqual(-2);
      expect(p.y, `corner ${i} y`).toBeLessThanOrEqual(k.vh + 2);
    }
    for (const [i, d] of k.cornerDelta.entries()) expect(d, `mounted corner ${i} within 2 px of the projected quad (${r1(d)})`).toBeLessThanOrEqual(2);
    // Every line sits inside the kiosk's own screen box.
    for (const l of k.lines) { expect(l.left).toBeGreaterThanOrEqual(k.box.left - 1); expect(l.right).toBeLessThanOrEqual(Math.max(k.box.right, k.vw) + 1); expect(l.top).toBeGreaterThanOrEqual(k.box.top - 1); expect(l.bottom).toBeLessThanOrEqual(k.box.bottom + 1); }
  });
}

test('P5-D04 at 2560x1440 the kiosk corners stay within 2 px of the screen quad at rest and through the Stay Ready dolly', async ({ page }, testInfo) => {
  await open(page, { viewport: vp(2560, 1440) });
  await doorsShown(page);
  const rest = await page.evaluate(MEASURE);
  expect(rest.hidden, 'kiosk visible at 2560x1440').toBe(false);
  for (const d of rest.cornerDelta) expect(d).toBeLessThanOrEqual(2);
  const stayReady = DOORS[DOORS.length - 1];
  await page.click(`#doors .door[data-door="${stayReady}"]`);
  await panelOpen(page);
  await page.waitForTimeout(300);
  const dolly = await page.evaluate(MEASURE);
  annotate(testInfo, { rest: { deltas: rest.cornerDelta.map(r1), lines: rest.lines.map((l) => r1(l.effectiveFont)) }, dolly: { hidden: dolly.hidden, z: dolly.z, deltas: dolly.cornerDelta?.map(r1), projected: dolly.projected?.map((p) => [r1(p.x), r1(p.y)]) } });
  expect(dolly.z).toBeCloseTo(1.3, 5);
  if (!dolly.hidden) {
    for (const d of dolly.cornerDelta) expect(d, 'mounted corner within 2 px mid-dolly').toBeLessThanOrEqual(2);
    for (const l of dolly.lines) expect(l.effectiveFont).toBeGreaterThanOrEqual(12);
  } else {
    // Hidden only because a corner left the frame or a line fell under 12 px.
    const outside = dolly.projected.some((p, i) => ((i === 0 || i === 3) && p.x < -2) || p.y < -2 || p.y > dolly.vh + 2);
    expect(outside, 'hidden mid-dolly only when a corner leaves the frame').toBe(true);
  }
});

test('P5-D02 the kiosk is a display: no tabindex, no focusable child, pointer-events none, a click does nothing', async ({ page }, testInfo) => {
  await open(page, { viewport: vp(2560, 1440) });
  await doorsShown(page);
  const k = await page.evaluate(MEASURE);
  expect(k.tabindex).toBeNull();
  expect(k.focusables).toBe(0);
  expect(k.ariaHidden).toBe('true');
  expect(k.pointerEvents).toBe('none');
  const centre = { x: (k.projected[0].x + k.projected[3].x + Math.min(k.projected[1].x, k.vw) + Math.min(k.projected[2].x, k.vw)) / 4, y: (k.projected[0].y + k.projected[1].y + k.projected[2].y + k.projected[3].y) / 4 };
  const before = await page.evaluate(() => ({ hash: location.hash, len: history.length, panel: document.getElementById('panel').hidden }));
  await page.mouse.click(centre.x, centre.y);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ hash: location.hash, len: history.length, panel: document.getElementById('panel').hidden, moving: document.getElementById('plate').classList.contains('moving'), hit: (() => { return null; })() }));
  const hit = await page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className || e.tagName) + (e.closest('.kiosk') ? ' (inside kiosk)' : '') : null; }, centre);
  annotate(testInfo, { centre: { x: r1(centre.x), y: r1(centre.y) }, hit, before, after });
  expect(after.hash).toBe(before.hash);
  expect(after.len).toBe(before.len);
  expect(after.panel).toBe(true);
  expect(after.moving).toBe(false);
  expect(hit).not.toContain('inside kiosk');
});

test('P5-D02 kiosk lines are derived from the manifest under the Representative data tag', async ({ page }) => {
  await open(page, { viewport: vp(2560, 1440) });
  const k = await page.evaluate(MEASURE);
  expect(k.text[0]).toBe(m.kiosk.header);
  expect(k.text[k.text.length - 1]).toBe(m.kiosk.tag);
  expect(k.text.slice(1, -1)).toEqual(kioskLines().map((l) => `${l.value} ${l.label}`));
  expect(kioskLines().map((l) => l.value)).toEqual([m.doors.length, m.stages.length, new Set(m.doors.flatMap((d) => d.serviceFamilies.map((f) => f.name))).size]);
});
