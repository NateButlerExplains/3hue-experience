// T-07, T-08: what each tour node does to the lobby, driven through the scene API in js/main.js.
//   T-07 rest (z 1, the doors on screen but inert, a door pointed at), door (z 1.3, the room up with
//        its own surfaces in place of the pins (O14), no panel, focus still in the card), station (the
//        surfaces standing for it marked and inside the frame, the source under the caption; a station
//        no surface stands for marks nothing), path (the tower, its stage lit, the chip current), kiosk (framed when
//        legible, otherwise the lobby plus a tile of its derived counts under its tag), keep, and
//        the same with ?rooms=0; and on the real script at 1280x720 and 320x568, every line that
//        carries a figure keeps a printed source inside the card's body without scrolling.
//   T-08 while the card speaks at 1280x720, 1440x900 and 1920x1080 it covers no door frame (at
//        rest), no lit ring, no kiosk, no marked surface and no panel; the frame the camera aims into
//        ends above the card's reserve (--tour-h), and a card taller than that shows its whole body.
import { test, expect } from '@playwright/test';
import { open, settled, roomVisible, manifest as m, geometry as g, S, vp, annotate, intersects, r1, kioskLines, readJson } from './helpers.mjs';
import { FX, TQ, tour, card, atNode, toLast, pick, sceneSettled } from './tour-helpers.mjs';
import { figures } from '../tools/check-manifest.js';
import { G } from './surface-helpers.mjs';

// The surfaces of a door's room standing for a station (O14, content/surfaces.json merged into the
// geometry); the station a fixture line points at (its cue, else its node's station scene).
const stationSurfaces = (door, st) => Object.entries(G.rooms[door]?.surfaces || {}).filter(([, s]) => s.station === st).map(([id]) => id).sort();
const stationAt = (node, line) => FX.nodes[node].lines[line]?.cue?.station || FX.nodes[node].scene.station || null;

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
  const sf = L.surfaces;
  const bbox = (c) => ({ left: Math.min(...c.map((p) => p[0])), top: Math.min(...c.map((p) => p[1])), right: Math.max(...c.map((p) => p[0])), bottom: Math.max(...c.map((p) => p[1])) });
  return {
    z: L.stage.z, dock: L.stage.dock, inRoom: L.stage.inRoom, frame: L.frame(),
    room: parseFloat(getComputedStyle(document.getElementById('room')).opacity),
    panelHidden: document.getElementById('panel').hidden,
    doorsHidden: document.getElementById('doors').classList.contains('hidden'), doorsInert: document.getElementById('doors').hasAttribute('inert'),
    current: [...document.querySelectorAll('#doors [aria-current="true"]')].map((e) => e.dataset.door || (e.classList.contains('path-chip') ? 'path' : e.className)),
    lit: [...document.querySelectorAll('#arcs path.lit')].map((p) => p.dataset.stage),
    litBox: rr(document.querySelector('#arcs path.lit')),
    kioskBox: kiosk && !kiosk.hidden ? rr(kiosk) : null,
    pins: pins.length, surfaces: sf ? { mode: sf.mode, count: sf.surfaces.length, hidden: document.getElementById('room-surfaces').getAttribute('aria-hidden') } : null,
    active: sf ? sf.surfaces.filter((s) => s.active).map((s) => ({ id: s.id, station: s.station, hidden: !s.inside, box: bbox(s.corners) })) : [],
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

  test('T-07 door: the dolly (z 1.3), the room up with its own surfaces in place of the pins, no panel, focus in the card, the callout prints its source', async ({ page }) => {
    await deep(page, 'wt');
    await roomVisible(page);
    let s = await scene(page);
    expect(s.z).toBeCloseTo(g.layout.dolly.zoom, 5);
    expect(s.room).toBe(1);
    expect(s.inRoom).toBe(true);
    expect(s.pins).toBe(0);
    expect(s.surfaces).toEqual({ mode: 'tour', count: Object.keys(G.rooms['win-trust'].surfaces).length, hidden: 'true' });
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

  // O14: the station is the room's surfaces standing for it, marked and framed whole. A click on a lit
  // surface bringing its line back is T-27 (tour-surfaces.spec).
  test('T-07 station: the scene\'s station surfaces are marked and inside the frame; a station cue moves the mark; the surfaces stay aria-hidden', async ({ page }, testInfo) => {
    await deep(page, 'wt-proof');
    await roomVisible(page);
    let s = await scene(page);
    const proof = m.doors.find((d) => d.id === 'win-trust').proof[0];
    expect(s.active.map((a) => a.id).sort()).toEqual(stationSurfaces('win-trust', 'proof'));
    expect(s.active.every((a) => !a.hidden), 'the narrated surfaces are inside the frame').toBe(true);
    let c = await card(page);
    expect(c.caption).toBe(proof.text);
    expect(c.src).toBe(proof.basis);
    await page.keyboard.press('ArrowRight');
    await atNode(page, 'wt-proof', 1);
    await page.waitForTimeout(1200);
    s = await scene(page);
    expect(s.active.map((a) => a.id).sort()).toEqual(stationSurfaces('win-trust', FX.nodes['wt-proof'].lines[1].cue.station));
    expect(s.active.every((a) => !a.hidden)).toBe(true);
    expect(s.surfaces.hidden).toBe('true');
    expect(s.pins).toBe(0);
    annotate(testInfo, { active: s.active });
  });

  // The camera frames the surfaces standing for the narrated station whole, inside the frame (above
  // the card's reserve). A station no surface of that room stands for (Gain Control's decision) marks
  // nothing: the camera pans toward it as it did for a pin.
  for (const [w, h, cases] of [[1280, 720, [['wt-proof', 0], ['wt-proof', 1], ['gc', 1], ['sr', 1]]], [1440, 900, [['wt-proof', 0], ['wt-proof', 1], ['gc', 1], ['sr', 1]]]]) test(`T-07 at ${w}x${h} the narrated station's surfaces sit inside the frame: ${cases.map((c) => c.join('/')).join(', ')}`, async ({ page }, testInfo) => {
    const log = [];
    for (const [node, line] of cases) {
      await deep(page, node, { viewport: vp(w, h) });
      await roomVisible(page);
      for (let i = 0; i < line; i++) { await page.keyboard.press('ArrowRight'); }
      await atNode(page, node, line);
      await page.waitForTimeout(1200);
      const s = await scene(page);
      const want = stationSurfaces(FX.nodes[node].scene.door, stationAt(node, line));
      log.push({ node, line, station: stationAt(node, line), active: s.active, frameBottom: r1(s.frame.y + s.frame.h) });
      expect(s.active.map((a) => a.id).sort(), `${node}/${line}: the surfaces of ${stationAt(node, line)}`).toEqual(want);
      for (const a of s.active) expect(a.hidden, `${node}/${line}: ${a.id} inside the frame`).toBe(false);
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

  test('T-07 with ?rooms=0: a door and a station node dolly to the door with no room, no pins and no surfaces', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await deep(page, 'wt-proof', { query: `${TQ}&rooms=0` });
    let s = await scene(page);
    expect(s.z).toBeCloseTo(g.layout.dolly.zoom, 5);
    expect(s.room).toBe(0);
    expect(s.pins).toBe(0);
    expect(s.surfaces).toBeNull();
    expect(s.current).toEqual(['win-trust']);
    await page.keyboard.press('ArrowRight');
    await atNode(page, 'wt-proof', 1);
    s = await scene(page);
    expect(s.pins).toBe(0);
    expect(s.surfaces).toBeNull();
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
  test(`T-08 at ${w}x${h} the speaking card covers no door frame at rest, lit ring, kiosk, marked surface or panel; the frame ends above the card's reserve and the card grows only to fit its content`, async ({ page }, testInfo) => {
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
      for (const a of s.active.filter((x) => !x.hidden)) expect(intersects(s.card, a.box), `${label}: the card covers the ${a.id} surface`).toBe(false);
      if (st.lit) expect(s.lit.length).toBe(1);
      if (st.pin) expect(s.active.map((a) => a.id).sort(), `${label}: the narrated station's surfaces are marked`).toEqual(stationSurfaces(FX.nodes[st.node].scene.door, stationAt(st.node, st.line)));
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
    expect(seen.map((x) => x.line), 'the opening line that cites the room\'s statistic is among them').toContain('gc-2');
    expect(seen.find((x) => x.line === 'gc-2').shown).toContain(m.doors.find((d) => d.id === 'gain-control').stat.source);
  });
}
