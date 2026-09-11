// P2a-D02: the heading block is fully visible, below the header, and clears every door frame by
// at least 8 px at nine viewports; at 1440x900 the h1 is 48 px or more on two lines.
import { test, expect } from '@playwright/test';
import { open, DOORS, vp, annotate, r1, intersects } from './helpers.mjs';

const VPS = [[1024, 768], [1280, 720], [1280, 800], [1366, 768], [1440, 900], [1512, 982], [1536, 864], [1920, 1080], [2560, 1440]];

async function measure(page) {
  return page.evaluate((ids) => {
    const L = window.__lobby;
    const intro = document.getElementById('intro');
    const h1 = document.getElementById('h1');
    const r = intro.getBoundingClientRect();
    const cs = getComputedStyle(intro);
    const hud = document.getElementById('hud').getBoundingClientRect();
    const hudH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-h'));
    const range = document.createRange(); range.selectNodeContents(h1);
    const tops = new Set([...range.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top / 6)));
    const h1cs = getComputedStyle(h1);
    const frames = {}; for (const id of ids) frames[id] = L.rects.doors[id].frame;
    const first = frames[ids[0]];
    return {
      vw: innerWidth, vh: innerHeight, hudH, hudBottom: hud.bottom,
      intro: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, visibility: cs.visibility, opacity: cs.opacity },
      h1: { font: parseFloat(h1cs.fontSize), lines: tops.size, height: h1.getBoundingClientRect().height, lineHeight: parseFloat(h1cs.lineHeight), maxWidth: cs.maxWidth },
      k: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--k')), h1Rule: L.geometry.layout.heading,
      sub: parseFloat(getComputedStyle(document.getElementById('sub')).fontSize),
      firstFrameTop: first.top, frames, composed: L.stage.composed,
    };
  }, DOORS);
}

for (const [w, h] of VPS) {
  test(`P2a-D02 heading block at ${w}x${h}`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    const m = await measure(page);
    annotate(testInfo, { viewport: `${w}x${h}`, k: r1(m.k), wanted56k: r1(m.h1Rule.h1 * m.k), maxWidth: m.h1.maxWidth, intro: { top: r1(m.intro.top), bottom: r1(m.intro.bottom), left: r1(m.intro.left), right: r1(m.intro.right) }, hudH: m.hudH, firstFrameTop: r1(m.firstFrameTop), gap: r1(m.firstFrameTop - m.intro.bottom), h1: m.h1.font, lines: m.h1.lines, sub: m.sub });
    expect(m.composed).toBe(false);
    expect(m.intro.visibility).toBe('visible');
    expect(parseFloat(m.intro.opacity)).toBe(1);
    expect(m.intro.left, 'intro left edge inside the viewport').toBeGreaterThanOrEqual(0);
    expect(m.intro.top, 'intro top inside the viewport').toBeGreaterThanOrEqual(0);
    expect(m.intro.right, 'intro right edge inside the viewport').toBeLessThanOrEqual(m.vw);
    expect(m.intro.bottom, 'intro bottom inside the viewport').toBeLessThanOrEqual(m.vh);
    expect(m.intro.top, `intro top (${r1(m.intro.top)}) below the header (${m.hudH})`).toBeGreaterThanOrEqual(m.hudH);
    // Clear of every door frame. The 2a rule shrinks the h1 toward its 30 px floor until the block
    // clears the first frame by 8 px; once at the floor the block only has to be clear (no overlap).
    const gap = m.firstFrameTop - m.intro.bottom;
    const atFloor = m.h1.font <= m.h1Rule.h1Min + 0.01;
    for (const id of DOORS) expect(intersects(m.intro, m.frames[id]), `intro overlaps the ${id} frame`).toBe(false);
    if (!atFloor) expect(gap, `intro bottom ${r1(m.intro.bottom)} clears the ${DOORS[0]} frame top ${r1(m.firstFrameTop)} by 8 px (gap ${r1(gap)})`).toBeGreaterThanOrEqual(m.h1Rule.clearance - 0.5);
    expect(m.h1.font).toBeGreaterThanOrEqual(m.h1Rule.h1Min);
    expect(m.sub).toBeGreaterThanOrEqual(m.h1Rule.subMin);
    // The rule: h1 = 56k px, shrunk only when needed to clear the frame. With more than the 8 px
    // clearance to spare, the h1 must still be at 56k (within 1 px).
    const wanted = m.h1Rule.h1 * m.k;
    if (gap > m.h1Rule.clearance + 4 && m.h1.font < wanted - 1) expect(m.h1.font, `h1 ${r1(m.h1.font)} px shrunk although ${r1(gap)} px remain above the frame; the 2a rule wants 56k = ${r1(wanted)} px (k ${r1(m.k)}, intro max-width ${m.h1.maxWidth})`).toBeGreaterThanOrEqual(wanted - 1);
    if (w === 1440 && h === 900) {
      expect(m.h1.font, `h1 ${m.h1.font} px at 1440x900`).toBeGreaterThanOrEqual(48);
      expect(m.h1.lines, 'h1 on two lines').toBe(2);
      expect(Math.round(m.h1.height / m.h1.lineHeight)).toBe(2);
    }
  });
}
