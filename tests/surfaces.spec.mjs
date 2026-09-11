// S-01..S-06: the rooms' own surfaces (O14, js/surfaces.js), measured on each 2560x1440 master
// (content/surfaces.json, merged into geometry.rooms.<door>.surfaces) and drawn in perspective over whichever render
// derivative is on screen. The door view carries them only while the tour is on (?tour=1 here);
// without it the pins stay (rooms.spec R-04).
//   S-01 every surface's corners land within 2 px of its measured quad projected through the room's
//        fit, at 1280x720, 1440x900 and 2560x1440 (three render sizes) and after the camera pans.
//   S-02 in the door view a surface opens its station: #/door/<id>/<station>, focus on the station's
//        heading, as a pin did; each station's first surface carries its label from the manifest.
//   S-03 surfaces are aria-hidden and pointer-only (no focus stop, nothing in the accessibility
//        tree); ?room-preview= and the tour off keep the pins.
//   S-04 type on a surface is at least 12 CSS px on screen, or hidden.
//   S-05 a surface takes the pointer only when it projects to 44x44 CSS px or more (and its centre is
//        in the frame); where it does, the pointer reaches it.
//   S-06 the occluder redraw sits above the back surfaces: a lit panel lights its glass, not the
//        monitor in front of it; on a phone a cued surface fills the room strip (past fitRoom's 1.6x),
//        its type legible where the strip allows.
import { test, expect } from '@playwright/test';
import { open, panelOpen, roomVisible, manifest as m, S, vp, annotate, r1, doorById, pressTab } from './helpers.mjs';
import { FX, TQ, atNode } from './tour-helpers.mjs';
import { roomSettled, withSegment, CORNERS, EFF, G as g } from './surface-helpers.mjs';

const DOORS = m.doors.filter((d) => g.rooms?.[d.id]?.surfaces).map((d) => d.id);
const Q = 'debug=1&tour=1';
const surfs = (page) => page.evaluate(() => window.__lobby.surfaces);
async function openDoor(page, id, viewport = vp(1440, 900), query = Q) {
  await open(page, { viewport, hash: `#/door/${id}`, query });
  await panelOpen(page);
  await roomSettled(page);
  await page.waitForFunction((d) => window.__lobby.surfaces?.door === d, id, { polling: 50 });
}

// The measured quads through the room's fit: master px x (Wr / 2560) x fit.s + fit offset.
function expected(fit, door) {
  const room = g.rooms[door], k = fit.Wr / (room.width || 2560);
  return Object.fromEntries(Object.entries(room.surfaces).map(([id, s]) => [id, s.quad.map(([x, y]) => [fit.ox + x * k * fit.s, fit.oy + y * k * fit.s])]));
}
function compare(got, want, label) {
  let worst = 0, where = '';
  for (const [id, pts] of Object.entries(want)) {
    expect(got[id], `${label}: ${id} is drawn`).toBeTruthy();
    pts.forEach(([x, y], i) => { const d = Math.hypot(got[id][i][0] - x, got[id][i][1] - y); if (d > worst) { worst = d; where = `${id} corner ${i}`; } });
  }
  expect(worst, `${label}: the worst corner (${where}) is ${r1(worst)} px from its measured quad`).toBeLessThanOrEqual(2);
  return r1(worst);
}

test.describe('S-01 surfaces land on their measured quads', () => {
  for (const [w, h] of [[1280, 720], [1440, 900], [2560, 1440]]) {
    test(`S-01 at ${w}x${h} every surface of every room is within 2 px of its measured quad`, async ({ page }, testInfo) => {
      const log = {};
      for (const id of DOORS) {
        await openDoor(page, id, vp(w, h));
        const fit = await page.evaluate(() => window.__lobby.roomFit);
        log[id] = { Wr: fit.Wr, s: Math.round(fit.s * 1000) / 1000, worst: compare(await page.evaluate(CORNERS), expected(fit, id), `${id} at ${w}x${h}`) };
      }
      annotate(testInfo, log);
    });
  }
  test('S-01 after the camera pans and zooms to a cued surface, every surface still sits on its quad', async ({ page }, testInfo) => {
    await withSegment(page, 'win-trust');
    await open(page, { viewport: vp(1440, 900), hash: '#/tour/room', query: TQ });
    await atNode(page, 'room');
    await roomSettled(page);
    const fit0 = await page.evaluate(() => window.__lobby.roomFit);
    compare(await page.evaluate(CORNERS), expected(fit0, 'win-trust'), 'the door\'s own fit');
    // Step on to the line that cues a surface: the camera frames it (animated, except for reduced motion).
    const cue = FX.nodes.room.lines.find((l) => l.cue?.surface);
    const at = (await page.evaluate(() => window.__tour.lineIds)).indexOf(cue.id);
    expect(at).toBeGreaterThan(0);
    for (let i = 0; i < at; i++) await page.keyboard.press('ArrowRight');
    await page.waitForFunction((id) => window.__tour.room?.active.includes(id), cue.cue.surface, { polling: 50 });
    await roomSettled(page);
    const fit = await page.evaluate(() => window.__lobby.roomFit);
    expect(fit.ox !== fit0.ox || fit.oy !== fit0.oy || fit.s !== fit0.s, 'the camera moved').toBe(true);
    const worst = compare(await page.evaluate(CORNERS), expected(fit, 'win-trust'), 'after the pan');
    annotate(testInfo, { before: fit0, after: fit, worst });
  });
});

test.describe('S-02 in the door view a surface opens its station', () => {
  test('S-02 each station\'s first surface carries its label; a click on a surface routes to #/door/<id>/<station> and focuses its heading', async ({ page }, testInfo) => {
    const log = {};
    for (const id of DOORS) {
      await openDoor(page, id);
      const st = await surfs(page);
      expect(st.mode).toBe('door');
      // Labels: from the manifest, one per station, on the first surface of that station that takes type.
      const want = {};
      for (const [sid, s] of Object.entries(g.rooms[id].surfaces)) if (s.station && s.text && !want[s.station]) want[s.station] = sid;
      for (const [station, sid] of Object.entries(want)) expect(st.surfaces.find((x) => x.id === sid).label, `${id}/${sid}`).toBe(S[station]);
      expect(st.surfaces.filter((x) => x.label).length).toBe(Object.keys(want).length);
      for (const x of st.surfaces) if (x.station) expect(doorById(id).stations).toContain(x.station);
      // A pointer click at the centre of the first surface that takes the pointer.
      const pick = st.surfaces.find((x) => x.hit && x.station);
      expect(pick, `${id}: a surface takes the pointer at 1440x900`).toBeTruthy();
      const c = pick.corners.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
      await page.mouse.click(c[0], c[1]);
      await page.waitForFunction((h) => location.hash === h, `#/door/${id}/${pick.station}`, { polling: 50 });
      await page.waitForFunction((s) => document.activeElement?.id === `st-${s}`, pick.station, { polling: 50 });
      expect(await page.evaluate((s) => document.getElementById(`st-${s}`).textContent.trim(), pick.station)).toBe(S[pick.station]);
      log[id] = { picked: pick.id, station: pick.station, labels: want };
    }
    annotate(testInfo, log);
  });
});

test.describe('S-03 aria-hidden and pointer-only', () => {
  test('S-03 the surfaces are aria-hidden with no focus stop and nothing in the accessibility tree; the tour off and ?room-preview= keep the pins', async ({ page }, testInfo) => {
    await openDoor(page, 'win-trust');
    const a = await page.evaluate(() => {
      const host = document.getElementById('room-surfaces');
      return { hidden: host.getAttribute('aria-hidden'), focusable: host.querySelectorAll('a, button, input, [tabindex]').length, pins: document.querySelectorAll('.room-pin').length, text: host.textContent.trim().length > 0 };
    });
    expect(a).toMatchObject({ hidden: 'true', focusable: 0, pins: 0, text: true });
    const snap = await page.locator('#room').ariaSnapshot();
    for (const st of doorById('win-trust').stations) expect(snap, 'no surface label reaches the accessibility tree').not.toContain(S[st]);
    // Tab from the panel heading never lands inside the room.
    const stops = [];
    for (let i = 0; i < 12; i++) { await pressTab(page); stops.push(await page.evaluate(() => !!document.activeElement?.closest('#room'))); }
    expect(stops.every((x) => !x)).toBe(true);
    // The tour off: the approved pins, no surfaces.
    await open(page, { viewport: vp(1440, 900), hash: '#/door/win-trust', query: 'debug=1' });
    await panelOpen(page);
    await roomVisible(page, 4000);
    await page.waitForTimeout(400);
    const off = await page.evaluate(() => ({ pins: document.querySelectorAll('.room-pin').length, surfaces: !!document.getElementById('room-surfaces') }));
    expect(off).toEqual({ pins: Object.keys(g.rooms['win-trust'].stations).length, surfaces: false });
    // A render candidate under ?room-preview= has no measured surfaces: pins again.
    await open(page, { viewport: vp(1440, 900), hash: '#/door/win-trust', query: `${Q}&room-preview=media/rooms/win-trust-1280.jpg` });
    await panelOpen(page);
    await roomVisible(page, 4000);
    await page.waitForTimeout(400);
    const prev = await page.evaluate(() => ({ pins: document.querySelectorAll('.room-pin').length, surfaces: !!document.getElementById('room-surfaces') }));
    expect(prev).toEqual({ pins: Object.keys(g.rooms['win-trust'].stations).length, surfaces: false });
    annotate(testInfo, { a, off, prev });
  });
});

test.describe('S-04 type is legible or hidden', () => {
  for (const [w, h] of [[1280, 720], [1440, 900], [2560, 1440]]) {
    test(`S-04 at ${w}x${h}: every line on a surface is at least 12 CSS px on screen, or hidden (door labels, and the tour's writes)`, async ({ page }, testInfo) => {
      const log = [];
      const check = (e, label) => {
        for (const [id, x] of Object.entries(e)) {
          if (!x.visible) continue;
          expect(x.font * x.eff, `${label} ${id}: ${r1(x.font)} px x ${Math.round(x.eff * 1000) / 1000}`).toBeGreaterThanOrEqual(12 - 0.05);
          for (const s of x.src) if (s.shown) expect(s.px * x.eff, `${label} ${id} source`).toBeGreaterThanOrEqual(12 - 0.05);
          log.push(`${label}:${id}=${r1(x.font * x.eff)}`);
        }
      };
      for (const id of DOORS) { await openDoor(page, id, vp(w, h)); check(await page.evaluate(EFF), id); }
      await withSegment(page, 'win-trust');
      await open(page, { viewport: vp(w, h), hash: '#/tour/room', query: TQ });
      await atNode(page, 'room');
      await roomSettled(page);
      for (let i = 0; i < 4; i++) {
        check(await page.evaluate(EFF), `room/${await page.evaluate(() => window.__tour.lineId)}`);
        if ((await page.evaluate(() => window.__tour.phase)) !== 'lines') break;
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(400);
        await roomSettled(page);
      }
      annotate(testInfo, log);
    });
  }
});

test.describe('S-05 hit areas', () => {
  for (const [w, h] of [[1280, 720], [1440, 900]]) {
    test(`S-05 at ${w}x${h}: a surface takes the pointer only when it projects to 44x44 CSS px or more, and the pointer reaches it there`, async ({ page }, testInfo) => {
      const log = {};
      for (const id of DOORS) {
        await openDoor(page, id, vp(w, h));
        const e = await page.evaluate(EFF);
        const st = await surfs(page);
        for (const x of st.surfaces) {
          const d = e[x.id];
          if (!d) continue;
          if (x.hit) {
            expect(Math.min(d.w, d.h), `${id}/${x.id} takes the pointer at ${r1(d.w)}x${r1(d.h)}`).toBeGreaterThanOrEqual(44 - 0.5);
            const c = x.corners.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
            const hit = await page.evaluate(([cx, cy]) => { const t = document.elementFromPoint(cx, cy); return t?.closest?.('.surf-hit')?.dataset.surface ?? t?.id ?? t?.tagName; }, c);
            // Another surface's target may lie over this one's centre (a monitor on its panel); a hit is a hit.
            expect(hit === x.id || st.surfaces.some((y) => y.id === hit && y.hit), `${id}/${x.id}: the pointer at its centre reaches a surface (${hit})`).toBe(true);
          } else if (x.target && x.station) {
            expect(Math.min(d.w, d.h) < 44 || !x.inside, `${id}/${x.id} (${r1(d.w)}x${r1(d.h)}) is small or off the frame when it takes no pointer`).toBe(true);
          }
        }
        log[id] = st.surfaces.map((x) => `${x.id}:${x.hit ? 'hit' : '-'} ${x.w}x${x.h}`);
      }
      annotate(testInfo, log);
    });
  }
});

test.describe('S-06 occluders and phone framing', () => {
  test('S-06 the occluder redraw sits above the back surfaces: a cued panel lights its glass, not the monitor standing in front of it', async ({ page }, testInfo) => {
    await open(page, { viewport: vp(1440, 900), hash: '#/tour/room', query: TQ });
    await atNode(page, 'room');
    const cue = FX.nodes.room.lines.find((l) => l.cue?.surface).cue.surface;
    await page.waitForFunction((id) => window.__tour.room?.active.includes(id), cue, { polling: 50 });
    await roomSettled(page);
    const order = await page.evaluate(() => [...document.getElementById('room-surfaces').children].map((c) => c.className));
    expect(order).toEqual(['surf-layer back', 'surf-occ', 'surf-layer front', 'surf-layer hits']);
    // The cued panel is lit (its own light turned up); the desk monitor in front of it is one of its
    // occluders. With the surfaces and without them, at the same camera: the glass above the type is
    // brighter, the monitor is untouched.
    const s = g.rooms['win-trust'].surfaces[cue];
    expect(s.occluders.length, `${cue} has an occluder`).toBeGreaterThan(0);
    const occ = s.occluders[0];
    const inOcc = occ.reduce((a, p) => [a[0] + p[0] / occ.length, a[1] + p[1] / occ.length], [0, 0]);
    const glass = [(s.quad[0][0] + s.quad[1][0]) / 2, s.quad[0][1] + 0.12 * (s.quad[3][1] - s.quad[0][1])];
    const px = async (buf, [x, y]) => page.evaluate(async ({ b64, x, y }) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(Math.round(x) - 2, Math.round(y) - 2, 5, 5).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3; return sum / 25;
    }, { b64: buf.toString('base64'), x, y });
    const fit = await page.evaluate(() => window.__lobby.roomFit);
    const k = fit.Wr / 2560, scr = ([x, y]) => [fit.ox + x * k * fit.s, fit.oy + y * k * fit.s];
    const lit = await page.screenshot();
    await page.evaluate(() => { document.getElementById('room-surfaces').style.display = 'none'; });
    await page.waitForTimeout(150);
    const bare = await page.screenshot();
    const v = { glass: [await px(bare, scr(glass)), await px(lit, scr(glass))], occluder: [await px(bare, scr(inOcc)), await px(lit, scr(inOcc))] };
    annotate(testInfo, { v, glass: scr(glass), occluder: scr(inOcc) });
    expect(v.glass[1] - v.glass[0], 'the lit glass is brighter').toBeGreaterThan(8);
    expect(Math.abs(v.occluder[1] - v.occluder[0]), 'the monitor in front of it is unchanged').toBeLessThan(3);
  });

  for (const [w, h] of [[390, 844], [320, 640]]) {
    test(`S-06 on a phone (${w}x${h}) a cued surface fills the room strip, past fitRoom's 1.6x`, async ({ page }, testInfo) => {
      await open(page, { viewport: vp(w, h), hash: '#/tour/room', query: TQ });
      await atNode(page, 'room');
      const cue = FX.nodes.room.lines.find((l) => l.cue?.surface).cue.surface;
      await page.waitForFunction((id) => window.__tour.room?.active.includes(id), cue, { polling: 50 });
      await roomSettled(page);
      const r = await page.evaluate((id) => {
        const L = window.__lobby, band = document.getElementById('floor-band').getBoundingClientRect();
        return { f: L.roomFit, band: { top: band.top, bottom: band.bottom, left: band.left, right: band.right }, s: L.surfaces.surfaces.find((x) => x.id === id), frame: L.frame() };
      }, cue);
      // The cover scale of the strip: the room covers the band plus the 18 px bleed under the sheet.
      const base = Math.max((r.band.right - r.band.left) / r.f.Wr, (r.band.bottom - r.band.top + 18) / r.f.Hr);
      const xs = r.s.corners.map((p) => p[0]), ys = r.s.corners.map((p) => p[1]);
      annotate(testInfo, { zoom: Math.round((r.f.s / base) * 100) / 100, s: r.s, frame: r.frame });
      expect(r.f.s / base, 'the room zoomed past fitRoom\'s 1.6x cap').toBeGreaterThan(1.6);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(r.frame.y - 1);
      expect(Math.max(...ys)).toBeLessThanOrEqual(r.frame.y + r.frame.h + 1);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(r.frame.x - 1);
      expect(Math.max(...xs)).toBeLessThanOrEqual(r.frame.x + r.frame.w + 1);
      expect(Math.max(Math.max(...ys) - Math.min(...ys), Math.max(...xs) - Math.min(...xs)), 'the surface fills the strip along its longer side').toBeGreaterThan(Math.min(r.frame.h, r.frame.w) * 0.7);
      // Legible where the strip allows it (a 390 px phone); on a 320x640 screen the strip is too short
      // for the card's type, which then hides rather than shrink (the caption and the card's list say it).
      if (w >= 390) { expect(r.s.shown, `its type is legible: ${r.s.px} px`).toBe(true); expect(r.s.px).toBeGreaterThanOrEqual(12); }
      else if (r.s.shown) expect(r.s.px).toBeGreaterThanOrEqual(12);
    });
  }
});
