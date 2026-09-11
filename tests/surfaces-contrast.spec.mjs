// S-07: type on the rooms' surfaces (O14) keeps WCAG 1.4.3 contrast against the render beneath it:
// at least 4.5:1, or 3:1 for large type (18.66 px bold, 24 px regular, as it renders on screen). The
// check samples the 2560 master's own pixels under every text box on show (the door labels of each
// room, and every write of the fixture's room node) and blends the type over them as the stylesheet
// does: ink multiplied into glass at its opacity, emissive type screened over a display's lit ground,
// light type over the rack's dark plate. The 5th-percentile sample must pass, so a bright fleck under
// a line cannot carry a box that fails.
import { test, expect } from '@playwright/test';
import { open, panelOpen, vp, annotate } from './helpers.mjs';
import { TQ, atNode } from './tour-helpers.mjs';
import { roomSettled, withSegment, G as g } from './surface-helpers.mjs';

const DOORS = Object.keys(g.rooms).filter((d) => g.rooms[d].surfaces);

// In the page: the contrast of each shown text box, from the master's pixels.
const MEASURE = async () => {
  const L = window.__lobby, st = L.surfaces, room = L.geometry.rooms[st.door];
  const img = new Image(); img.src = room.measuredOn.file; await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const screen = (a, b) => a.map((v, i) => 1 - (1 - v) * (1 - b[i]));
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  // Unit square → the quad, projectively (the same mapping the surface's matrix draws).
  const toQuad = (q) => { const [p0, p1, p2, p3] = q; return (u, v) => { const top = [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u], bot = [p3[0] + (p2[0] - p3[0]) * u, p3[1] + (p2[1] - p3[1]) * u]; return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v]; }; };
  const out = [];
  for (const s of st.surfaces) {
    if (!s.shown) continue;
    const geo = room.surfaces[s.id], t = geo.text, at = toQuad(geo.quad);
    const part = document.querySelector(`#room-surfaces .surf-ink[data-surface="${s.id}"], #room-surfaces .surf-emit[data-surface="${s.id}"], #room-surfaces .surf-plate[data-surface="${s.id}"]`);
    const cs = getComputedStyle(part), txt = part.querySelector('.surf-t');
    const color = cs.color.match(/[\d.]+/g).slice(0, 3).map((v) => +v / 255);
    const weight = +getComputedStyle(txt).fontWeight;
    const alpha = +cs.opacity;
    // Glass lights a feathered backlight behind its type (color-dodge: the glass / (1 - grey)).
    const bl = document.querySelector(`#room-surfaces .surf-lift[data-surface="${s.id}"] .surf-backlight`);
    const lift = bl && +getComputedStyle(bl).opacity === 1 ? +getComputedStyle(bl).backgroundColor.match(/[\d.]+/g)[0] / 255 : 0;
    const large = s.px >= (weight >= 600 ? 18.66 : 24);
    // Only where the type is: the box's width, down to the foot of its last block.
    const box = part.querySelector('.surf-box'), last = box.lastElementChild;
    const tall = Math.min(1 - t.top - t.bottom, (last.offsetTop + last.offsetHeight) / part.offsetHeight);
    const vals = [];
    for (let i = 0; i < 24; i++) for (let j = 0; j < 12; j++) {
      const [x, y] = at(t.left + (1 - t.left - t.right) * (i + 0.5) / 24, t.top + tall * (j + 0.5) / 12);
      const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      let bg = [d[0] / 255, d[1] / 255, d[2] / 255], fg;
      if (lift) bg = bg.map((v) => Math.min(1, v / (1 - lift)));
      if (part.classList.contains('surf-ink')) fg = bg.map((v, k) => v * (1 - alpha + alpha * color[k]));
      else if (part.classList.contains('surf-plate')) { bg = bg.map((v, k) => v * 0.2 + hex('#050c15')[k] * 0.8); fg = color; }
      else { if (s.role === 'screen') bg = screen(bg, hex('#091522')); fg = screen(bg, color); }   // a display's lit ground (its mid tone)
      vals.push(ratio(fg, bg));
    }
    vals.sort((a, b) => a - b);
    out.push({ id: s.id, kind: s.kind, px: s.px, large, need: large ? 3 : 4.5, p5: Math.round(vals[Math.floor(vals.length * 0.05)] * 100) / 100, median: Math.round(vals[vals.length >> 1] * 100) / 100 });
  }
  return out;
};

test('S-07 door labels on every room keep 4.5:1 (3:1 large) against the render under them', async ({ page }, testInfo) => {
  const log = {};
  for (const id of DOORS) {
    await open(page, { viewport: vp(1440, 900), hash: `#/door/${id}`, query: 'debug=1&tour=1' });
    await panelOpen(page);
    await roomSettled(page);
    const r = await page.evaluate(MEASURE);
    log[id] = r;
    expect(r.length, `${id}: labels on show`).toBeGreaterThan(0);
    for (const x of r) expect(x.p5, `${id}/${x.id} ${x.kind} at ${x.px} px: ${x.p5}:1 (needs ${x.need}:1)`).toBeGreaterThanOrEqual(x.need);
  }
  annotate(testInfo, log);
});

test('S-07 every write of the fixture\'s room keeps 4.5:1 (3:1 large) against the render under it', async ({ page }, testInfo) => {
  const log = [];
  for (const seg of ['win-trust', 'all']) {
    await withSegment(page, seg);
    await open(page, { viewport: vp(1440, 900), hash: '#/tour/room', query: TQ });
    await atNode(page, 'room');
    for (let i = 0; i < 4; i++) {
      await roomSettled(page);
      const r = await page.evaluate(MEASURE);
      const line = await page.evaluate(() => window.__tour.lineId);
      log.push({ seg, line, r });
      for (const x of r) expect(x.p5, `${seg}/${line}: ${x.id} ${x.kind} at ${x.px} px: ${x.p5}:1 (needs ${x.need}:1)`).toBeGreaterThanOrEqual(x.need);
      if ((await page.evaluate(() => window.__tour.phase)) !== 'lines') break;
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
    }
  }
  annotate(testInfo, log);
});
