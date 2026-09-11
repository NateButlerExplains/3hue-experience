// T-07, T-08: what each tour node does to the lobby, driven through the scene API in js/main.js.
//   T-07 rest (z 1, the doors on screen but inert, a door pointed at), door (z 1.3, the room up, no
//        panel, focus still in the card), station (its pin marked and inside the frame, the source
//        under the caption), path (the tower, its stage lit, the chip current), kiosk (framed when
//        legible, otherwise the lobby plus a tile of its derived counts under its tag), keep, and
//        the same with ?rooms=0; and on the real script at 1280x720 and 320x568, every line that
//        carries a figure keeps a printed source inside the card's body without scrolling.
//   T-08 while the card speaks at 1280x720, 1440x900 and 1920x1080 it covers no door frame (at
//        rest), no lit ring, no kiosk, no active pin and no panel; the frame the camera aims into
//        ends above the card's reserve (--tour-h), and a card taller than that shows its whole body.
import { test, expect } from '@playwright/test';
import { open, settled, roomVisible, manifest as m, geometry as g, S, vp, annotate, intersects, r1, kioskLines, readJson } from './helpers.mjs';
import { FX, TQ, tour, card, atNode, toLast, pick, sceneSettled } from './tour-helpers.mjs';
import { figures } from '../tools/check-manifest.js';

const deep = async (page, node, { viewport = vp(1440, 900), query = TQ } = {}) => {
  await open(page, { viewport, hash: `#/tour/${node}`, query });
  await atNode(page, node);
  await sceneSettled(page);
};
const SCENE = () => {
  const rr = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; };
  const L = window.__lobby;
  const pins = [...document.querySelectorAll('.room-pin')];
  const kiosk = document.querySelector('.kiosk');
  return {
    z: L.stage.z, dock: L.stage.dock, inRoom: L.stage.inRoom, frame: L.frame(),
    room: parseFloat(getComputedStyle(document.getElementById('room')).opacity),
    panelHidden: document.getElementById('panel').hidden,
    doorsHidden: document.getElementById('doors').classList.contains('hidden'), doorsInert: document.getElementById('doors').hasAttribute('inert'),
    current: [...document.querySelectorAll('#doors [aria-current="true"]')].map((e) => e.dataset.door || (e.classList.contains('path-chip') ? 'path' : e.className)),
    lit: [...document.querySelectorAll('#arcs path.lit')].map((p) => p.dataset.stage),
    litBox: rr(document.querySelector('#arcs path.lit')),
    kioskBox: kiosk && !kiosk.hidden ? rr(kiosk) : null,
    pins: pins.length, active: pins.filter((p) => p.classList.contains('is-active')).map((p) => ({ station: p.dataset.station, hidden: p.hidden, box: rr(p) })),
    frames: Object.fromEntries(Object.entries(L.rects.doors).map(([id, d]) => [id, d.frame])),
    card: rr(document.getElementById('tour')), vw: innerWidth, vh: innerHeight,
    focusInCard: document.getElementById('tour').contains(document.activeElement),
    titlecard: !document.getElementById('tour-titlecard').hidden,
  };
};
const scene = (page) => page.evaluate(SCENE);

test.describe('T-07 scenes', () => {
  test('T-07 rest: the lobby at rest, the doors on screen but inert, a door cue marks its door', async ({ page }) => {
    await deep(page, 'arrive');
    let s = await scene(page);
    expect(s.z).toBe(1);
    expect(s.dock).toBe('none');
    expect(s.doorsHidden).toBe(false);
    expect(s.doorsInert).toBe(true);
    expect(s.panelHidden).toBe(true);
    expect(s.current).toEqual([]);
    expect(s.focusInCard).toBe(true);
    await page.keyboard.press('ArrowRight');
    await atNode(page, 'arrive', 1);
    s = await scene(page);
    expect(s.current, 'the line points at its door').toEqual([FX.nodes.arrive.lines[1].cue.door]);
    // Focusing an option previews where it leads; leaving it restores the cue.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    s = await scene(page);
    expect(s.current).toEqual([FX.nodes.arrive.choice.options[1].id]);
    await page.focus('#tour-next');
    s = await scene(page);
    expect(s.current).toEqual([FX.nodes.arrive.lines[1].cue.door]);
  });

  test('T-07 door: the dolly (z 1.3), the room up with its pins, no panel, focus in the card, the callout prints its source', async ({ page }) => {
    await deep(page, 'wt');
    await roomVisible(page);
    let s = await scene(page);
    expect(s.z).toBeCloseTo(g.layout.dolly.zoom, 5);
    expect(s.room).toBe(1);
    expect(s.inRoom).toBe(true);
    expect(s.pins).toBe(Object.keys(g.rooms['win-trust'].stations).length);
    expect(s.panelHidden).toBe(true);
    expect(s.dock).toBe('none');
    expect(s.current).toEqual(['win-trust']);
    expect(s.focusInCard).toBe(true);
    const stat = m.doors.find((d) => d.id === 'win-trust').stat;
    const t = await toLast(page);
    expect(t.lineId).toBe('wt-3');
    const c = await card(page);
    expect(c.caption).toBe(stat.text);
    expect(c.src, 'the stat prints its source under the caption').toBe(stat.source);
  });

  test('T-07 station: the scene\'s station pin is marked and inside the frame; a station cue moves the mark; pins stay pointer-only', async ({ page }, testInfo) => {
    await deep(page, 'wt-proof');
    await roomVisible(page);
    let s = await scene(page);
    const proof = m.doors.find((d) => d.id === 'win-trust').proof[0];
    expect(s.active.map((a) => a.station)).toEqual(['proof']);
    expect(s.active[0].hidden, 'the narrated pin is inside the frame').toBe(false);
    let c = await card(page);
    expect(c.caption).toBe(proof.text);
    expect(c.src).toBe(proof.basis);
    await page.keyboard.press('ArrowRight');
    await atNode(page, 'wt-proof', 1);
    await page.waitForTimeout(1200);
    s = await scene(page);
    expect(s.active.map((a) => a.station)).toEqual([FX.nodes['wt-proof'].lines[1].cue.station]);
    expect(s.active[0].hidden).toBe(false);
    const pinAttrs = await page.evaluate(() => [...document.querySelectorAll('.room-pin')].map((p) => [p.getAttribute('aria-hidden'), p.tabIndex]));
    expect(pinAttrs.every(([a, ti]) => a === 'true' && ti === -1)).toBe(true);
    // A pin the tour points at elsewhere in the node brings that line back.
    await page.evaluate(() => document.querySelector('.room-pin[data-station="proof"]').click());
    await atNode(page, 'wt-proof', 0);
    annotate(testInfo, { active: s.active });
  });

  // The pan grows until the narrated pin clears the frame's edges. One case cannot: at 720 px tall a
  // station 82% of the way down its room (the decision stations) stays under the card's reserve even
  // with the room at the largest zoom the fit allows and its bottom edge on the viewport's; the pin
  // is marked but hidden, as rooms.js hides any pin outside the frame. From 1440x900 it fits.
  for (const [w, h, cases] of [[1280, 720, [['wt-proof', 0], ['wt-proof', 1], ['sr', 1]]], [1440, 900, [['wt-proof', 0], ['wt-proof', 1], ['gc', 1], ['sr', 1]]]]) test(`T-07 at ${w}x${h} the narrated station pin sits inside the frame: ${cases.map((c) => c.join('/')).join(', ')}`, async ({ page }, testInfo) => {
    const log = [];
    for (const [node, line] of cases) {
      await deep(page, node, { viewport: vp(w, h) });
      await roomVisible(page);
      for (let i = 0; i < line; i++) { await page.keyboard.press('ArrowRight'); }
      await atNode(page, node, line);
      await page.waitForTimeout(1200);
      const s = await scene(page);
      log.push({ node, line, active: s.active, frameBottom: r1(s.frame.y + s.frame.h) });
      expect(s.active).toHaveLength(1);
      expect(s.active[0].hidden, `${node}/${line}: ${s.active[0].station} pin inside the frame`).toBe(false);
    }
    annotate(testInfo, log);
  });

  test('T-07 path: the tower at dolly zoom, the chip current, a stage cue and a stage scene light their ring', async ({ page }) => {
    await deep(page, 'path');
    let s = await scene(page);
    expect(s.z).toBeCloseTo(g.layout.dolly.zoom, 5);
    expect(s.current).toEqual(['path']);
    expect(s.panelHidden).toBe(true);
    expect(s.lit, 'the first line cues its stage').toEqual([FX.nodes.path.lines[0].cue.stage]);
    await deep(page, 'stage-operate');
    s = await scene(page);
    expect(s.lit).toEqual(['operate']);
    await page.keyboard.press('ArrowRight');
    await atNode(page, 'stage-operate', 1);
    s = await scene(page);
    expect(s.lit).toEqual([FX.nodes['stage-operate'].lines[1].cue.stage]);
    await deep(page, 'start-here');
    s = await scene(page);
    expect(s.lit, 'where to start lights no ring').toEqual([]);
  });

  for (const [w, h] of [[1280, 720], [2560, 1440]]) {
    test(`T-07 kiosk at ${w}x${h}: framed at dolly zoom when legible there, otherwise the lobby with a tile of its derived counts under its tag (O9)`, async ({ page }, testInfo) => {
      await deep(page, 'kiosk', { viewport: vp(w, h) });
      const s = await scene(page);
      const t = await tour(page);
      const c = await card(page);
      annotate(testInfo, { framed: t.scene.kiosk, z: s.z, kiosk: s.kioskBox, callouts: c.callouts });
      const tile = { text: `${m.kiosk.header}: ${kioskLines().map((l) => `${l.value} ${l.label}`).join(' · ')}`, source: m.kiosk.tag };
      if (t.scene.kiosk) {
        expect(s.z).toBeCloseTo(g.layout.dolly.zoom, 5);
        expect(s.kioskBox).not.toBeNull();
        expect(c.callouts).toEqual([]);
      } else {
        expect(s.z).toBe(1);
        expect(c.callouts).toEqual([tile]);
      }
      if (w === 1280) expect(t.scene.kiosk, 'the kiosk is not legible at 1280x720').toBe(false);
    });
  }

  test('T-07 keep: a keep node leaves the scene on screen; opened by a deep link it stands on the lobby at rest', async ({ page }) => {
    await deep(page, 'lens');
    let s = await scene(page);
    expect(s.z).toBe(1);
    expect(s.doorsHidden).toBe(false);
    expect((await tour(page)).scene.kind).toBe('rest');
    // From a door, the keep node keeps the room.
    await deep(page, 'gc');
    await roomVisible(page);
    await pick(page, 'onward');   // after-door → lens (no segment chosen)
    await atNode(page, 'lens');
    await page.waitForTimeout(600);
    s = await scene(page);
    expect(s.z).toBeCloseTo(g.layout.dolly.zoom, 5);
    expect(s.room).toBe(1);
    expect(s.current).toEqual(['gain-control']);
    expect((await card(page)).caption).toBe(m.doors.find((d) => d.id === 'gain-control').decision);
  });

  test('T-07 with ?rooms=0: a door and a station node dolly to the door with no room and no pins', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await deep(page, 'wt-proof', { query: `${TQ}&rooms=0` });
    let s = await scene(page);
    expect(s.z).toBeCloseTo(g.layout.dolly.zoom, 5);
    expect(s.room).toBe(0);
    expect(s.pins).toBe(0);
    expect(s.current).toEqual(['win-trust']);
    await page.keyboard.press('ArrowRight');
    await atNode(page, 'wt-proof', 1);
    s = await scene(page);
    expect(s.pins).toBe(0);
    expect(errors).toEqual([]);
  });
});

// T-08: the speaking card against everything the scene shows.
const T08 = [
  { node: 'arrive', line: 0, rest: true },
  { node: 'wt', line: 0 },
  { node: 'wt-proof', line: 0, pin: true },
  { node: 'wt-proof', line: 1, pin: true },
  { node: 'gc', line: 1, pin: true },
  { node: 'sr', line: 1, pin: true },
  { node: 'path', line: 0, lit: true },
  { node: 'stage-operate', line: 1, lit: true },
  { node: 'kiosk', line: 0, rest: true },
];
// The camera aims above a card of --tour-h (js/tour.js reserve()); a longer line grows the card past
// that reserve, over the frame's lower edge, only as far as its content needs (at most min(52vh,
// 440 px)), so its sources are never cut; it still covers nothing the scene is showing.
const reserveOf = (vh) => Math.min(240, Math.max(176, vh * 0.24)) + 16;
for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080]]) {
  test(`T-08 at ${w}x${h} the speaking card covers no door frame at rest, lit ring, kiosk, active pin or panel; the frame ends above the card's reserve and the card grows only to fit its content`, async ({ page }, testInfo) => {
    const log = [];
    for (const st of T08) {
      await deep(page, st.node, { viewport: vp(w, h) });
      for (let i = 0; i < st.line; i++) await page.keyboard.press('ArrowRight');
      await atNode(page, st.node, st.line);
      await page.waitForTimeout(1200);
      await settled(page);
      const t = await tour(page);
      const s = await scene(page);
      const label = `${st.node}/${st.line}`;
      const phase = t.phase;
      log.push({ label, phase, card: s.card && [r1(s.card.top), r1(s.card.bottom - s.card.top)], frameBottom: r1(s.frame.y + s.frame.h), lit: s.lit, active: s.active.map((a) => a.station + (a.hidden ? '(hidden)' : '')) });
      if (phase === 'choice') continue;   // the card may grow over the scene while a choice waits
      expect(s.panelHidden, `${label}: no panel`).toBe(true);
      expect(s.frame.y + s.frame.h, `${label}: the frame ends above the card's reserve`).toBeLessThanOrEqual(s.vh - reserveOf(s.vh) + 0.5);
      const fit = await page.evaluate(() => { const b = document.getElementById('tour-body'); return b.scrollHeight <= b.clientHeight + 1; });
      if (s.card.top < s.frame.y + s.frame.h - 0.5) expect(fit, `${label}: a card taller than its reserve shows its whole body`).toBe(true);
      expect(s.card.bottom).toBeLessThanOrEqual(s.vh + 0.5);
      expect(s.card.left).toBeGreaterThanOrEqual(-0.5);
      expect(s.card.right).toBeLessThanOrEqual(s.vw + 0.5);
      if (st.rest && s.z === 1) for (const [id, f] of Object.entries(s.frames)) expect(intersects(s.card, f), `${label}: the card covers the ${id} door frame`).toBe(false);
      if (s.litBox) expect(intersects(s.card, s.litBox), `${label}: the card covers the lit ring`).toBe(false);
      if (s.kioskBox) expect(intersects(s.card, s.kioskBox), `${label}: the card covers the kiosk`).toBe(false);
      for (const a of s.active.filter((x) => !x.hidden)) expect(intersects(s.card, a.box), `${label}: the card covers the ${a.station} pin`).toBe(false);
      if (st.lit) expect(s.lit.length).toBe(1);
      if (st.pin) expect(s.active, `${label}: the narrated pin is marked`).toHaveLength(1);
    }
    annotate(testInfo, log);
    expect(log.filter((l) => l.phase !== 'choice').length, 'speaking states measured').toBeGreaterThanOrEqual(5);
  });
}

// The real script: a line that carries a figure prints a source the visitor reads with it, inside the
// card's body and without scrolling (a ref line's own source, or, when the figure's source sits in a
// tile for another field, that tile's source under the caption). The engine specs above run on the
// fixture, which has no such line.
const REAL = readJson('content/tour.json');
for (const [w, h] of [[1280, 720], [320, 568]]) {
  test(`T-07 the real script at ${w}x${h}: every line carrying a figure keeps a printed source inside the card's body, unscrolled`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h), query: 'debug=1&tour=1', hash: `#/tour/${REAL.start}` });
    await atNode(page, REAL.start);
    const seen = [];
    for (const id of Object.keys(REAL.nodes)) {
      await page.evaluate((id) => { location.hash = `#/tour/${id}`; }, id);
      await atNode(page, id);
      for (let i = 0; i < 24; i++) {
        const t = await tour(page);
        await page.waitForTimeout(250);
        const s = await page.evaluate(() => {
          const b = document.getElementById('tour-body'), br = b.getBoundingClientRect();
          const inside = (e) => { const x = e.getBoundingClientRect(); return x.height > 0 && x.top >= br.top - 1 && x.bottom <= br.bottom + 1; };
          const srcs = [...b.querySelectorAll('#tour-src:not([hidden]), .tour-callout .src')].filter((e) => e.textContent.trim());
          return { caption: document.querySelector('#tour-caption .sr')?.textContent || '', scrollTop: b.scrollTop, shown: srcs.filter(inside).map((e) => e.textContent), all: srcs.map((e) => e.textContent) };
        });
        if (figures(s.caption).length) {
          seen.push({ line: t.lineId, shown: s.shown });
          expect(s.scrollTop, `${t.lineId}: the body starts at its top`).toBe(0);
          expect(s.shown.length, `${t.lineId}: "${s.caption}" shows a source inside the body (${JSON.stringify(s.all)})`).toBeGreaterThan(0);
        }
        if (t.phase !== 'lines') break;
        await page.focus('#tour-next');
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction((li) => window.__tour.line !== li, t.line, { polling: 30 });
      }
    }
    annotate(testInfo, seen);
    expect(seen.map((x) => x.line), 'the opening line that cites the room\'s statistic is among them').toContain('gc-why-1');
    expect(seen.find((x) => x.line === 'gc-why-1').shown).toContain(m.doors.find((d) => d.id === 'gain-control').stat.source);
  });
}
