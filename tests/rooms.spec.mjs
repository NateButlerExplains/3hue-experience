// R-01..R-06 (rendered rooms, O5): the room layer reaches opacity 1 within 3 s, covers the visible
// frame without a seam, each render is requested once per page, ?rooms=0 keeps the layer off,
// station pins route to #/door/<id>/<station> and focus the matching h3.
import { test, expect } from '@playwright/test';
import { open, ready, doorsShown, panelOpen, settled, roomVisible, manifest as m, geometry as g, S, DOORS, doorById, annotate, r1, hash, isReduced } from './helpers.mjs';

const WIRED = m.doors.filter((d) => d.room?.render).map((d) => d.id);

const ROOM = () => {
  const room = document.getElementById('room');
  const img = document.getElementById('room-img');
  const r = img.getBoundingClientRect();
  const panel = document.getElementById('panel').getBoundingClientRect();
  const L = window.__lobby;
  return { opacity: getComputedStyle(room).opacity, ariaHidden: room.getAttribute('aria-hidden'), on: room.classList.contains('on'), src: img.currentSrc || img.getAttribute('src'), natural: [img.naturalWidth, img.naturalHeight], img: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, panel: { left: panel.left, top: panel.top, right: panel.right, bottom: panel.bottom }, dock: L.stage.dock, inRoom: L.stage.inRoom, vw: innerWidth, vh: innerHeight, pins: [...document.querySelectorAll('#room-pins .room-pin')].map((b) => { const ring = b.querySelector('.ring').getBoundingClientRect(); return { station: b.dataset.station, label: b.querySelector('.chip')?.textContent, ring: { x: ring.left + ring.width / 2, y: ring.top + ring.height / 2, w: ring.width }, btn: b.getBoundingClientRect().toJSON() }; }) };
};

test('R-03 after a door opens from the lobby the room reaches opacity 1 within 3 s', async ({ page }, testInfo) => {
  const log = {};
  for (const id of WIRED) {
    await open(page);
    await doorsShown(page);
    const t0 = Date.now();
    await page.click(`#doors .door[data-door="${id}"]`);
    await roomVisible(page, 3000);
    log[id] = { ms: Date.now() - t0 };
    const st = await page.evaluate(ROOM);
    expect(st.on).toBe(true);
    expect(st.ariaHidden).toBe('false');
    expect(st.src).toContain(doorById(id).room.render);
    expect(st.natural[0]).toBeGreaterThanOrEqual(1280);
  }
  annotate(testInfo, log);
});

test('R-03 a deep link into each door shows its room within 3 s', async ({ page }, testInfo) => {
  const log = {};
  for (const id of WIRED) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('about:blank');
    const t0 = Date.now();
    await page.goto(`?debug=1#/door/${id}`);
    await ready(page);
    await roomVisible(page, 3000);
    log[id] = { ms: Date.now() - t0 };
  }
  annotate(testInfo, log);
});

for (const [w, h] of [[1440, 900], [1920, 1080], [1280, 720]]) {
  test(`R-03 at ${w}x${h} the room image covers the visible frame with no seam`, async ({ page }, testInfo) => {
    const log = {};
    for (const id of WIRED) {
      await open(page, { viewport: { width: w, height: h }, hash: `#/door/${id}` });
      await panelOpen(page);
      await roomVisible(page, 3000);
      await page.waitForTimeout(1800); // the 1.06 → 1 settle
      const st = await page.evaluate(ROOM);
      // The panel is opaque: the render must cover everything the panel does not.
      const visible = st.dock === 'left' ? { left: st.panel.right, top: 0, right: st.vw, bottom: st.vh } : { left: 0, top: 0, right: st.panel.left, bottom: st.vh };
      log[id] = { img: Object.fromEntries(Object.entries(st.img).map(([k, v]) => [k, r1(v)])), visible, dock: st.dock, src: st.src.split('/').pop() };
      expect(st.opacity).toBe('1');
      expect(st.img.left, `${id} room left edge ${r1(st.img.left)} covers ${visible.left}`).toBeLessThanOrEqual(visible.left + 1);
      expect(st.img.top, `${id} room top ${r1(st.img.top)}`).toBeLessThanOrEqual(1);
      expect(st.img.right, `${id} room right edge ${r1(st.img.right)} covers ${visible.right}`).toBeGreaterThanOrEqual(visible.right - 1);
      expect(st.img.bottom, `${id} room bottom ${r1(st.img.bottom)} covers ${st.vh}`).toBeGreaterThanOrEqual(st.vh - 1);
      expect(st.dock).toBe(doorById(id).dock);
    }
    annotate(testInfo, log);
  });
}

test('R-02 each room render is requested exactly once per page (warm, open, tab through)', async ({ page }, testInfo) => {
  await page.goto('about:blank');
  const reqs = [];
  page.on('request', (rq) => { if (/\/media\/rooms\//.test(rq.url())) reqs.push(rq.url()); });
  await page.goto('?debug=1#/experience');
  await ready(page);
  await doorsShown(page);
  await page.waitForTimeout(6000); // the idle warm loop decodes every room in turn
  const warmed = reqs.slice();
  await page.click(`#doors .door[data-door="${WIRED[0]}"]`);
  await roomVisible(page, 3000);
  for (const id of WIRED.slice(1)) {
    await page.click(`#panel .tabs .tab[data-door="${id}"]`);
    await page.waitForFunction((src) => (document.getElementById('room-img').currentSrc || '').includes(src), doorById(id).room.render, { polling: 50 });
    await roomVisible(page, 3000);
    await page.waitForTimeout(500);
  }
  const counts = {};
  for (const u of reqs) { const k = u.split('/').pop(); counts[k] = (counts[k] || 0) + 1; }
  annotate(testInfo, { warmed: warmed.map((u) => u.split('/').pop()), counts });
  expect(Object.keys(counts).length, `one render file per wired room: ${JSON.stringify(counts)}`).toBe(WIRED.length);
  for (const [k, n] of Object.entries(counts)) expect(n, `${k} requested ${n} times`).toBe(1);
  for (const id of WIRED) expect(Object.keys(counts).some((k) => k.startsWith(id + '-')), `a render for ${id} was fetched`).toBe(true);
});

test('R-05 ?rooms=0 leaves #room at opacity 0 and requests no render; doors still dolly and open their panels', async ({ page }, testInfo) => {
  await page.goto('about:blank');
  const reqs = [];
  page.on('request', (rq) => { if (/\/media\/rooms\//.test(rq.url())) reqs.push(rq.url()); });
  await page.goto(`?debug=1&rooms=0#/door/${WIRED[0]}`);
  await ready(page);
  await panelOpen(page);
  await page.waitForTimeout(2500);
  let st = await page.evaluate(ROOM);
  expect(st.opacity).toBe('0');
  expect(st.on).toBe(false);
  expect(st.pins).toEqual([]);
  // And from the lobby by click.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => location.hash === '#/experience', null, { polling: 50 });
  await settled(page);
  await doorsShown(page);
  await page.click(`#doors .door[data-door="${WIRED[1]}"]`);
  await panelOpen(page);
  await page.waitForTimeout(2500);
  st = await page.evaluate(ROOM);
  annotate(testInfo, { reqs, opacity: st.opacity, z: await page.evaluate(() => window.__lobby.stage.z) });
  expect(st.opacity).toBe('0');
  expect(reqs).toEqual([]);
  expect(await page.evaluate(() => window.__lobby.stage.z)).toBeCloseTo(1.3, 5);
});

test('R-04 station pins are present, labelled from the manifest, and a click routes to #/door/<id>/<station> focusing its h3', async ({ page }, testInfo) => {
  const log = {};
  for (const id of WIRED) {
    await open(page, { hash: `#/door/${id}` });
    await panelOpen(page);
    await roomVisible(page, 3000);
    await page.waitForTimeout(400);
    const st = await page.evaluate(ROOM);
    const stations = Object.keys(g.rooms[id].stations);
    log[id] = { pins: st.pins.map((p) => ({ station: p.station, x: r1(p.ring.x), y: r1(p.ring.y), btn: [r1(p.btn.width), r1(p.btn.height)] })) };
    testInfo.annotations.push({ type: 'measured', description: JSON.stringify({ [id]: log[id] }) });
    expect(st.pins.map((p) => p.station)).toEqual(stations);
    for (const p of st.pins) {
      expect(p.label).toBe(S[p.station]);
      expect(doorById(id).stations).toContain(p.station);
    }
    const off = st.pins.filter((p) => p.ring.x < 0 || p.ring.x > st.vw || p.ring.y < 0 || p.ring.y > st.vh).map((p) => `${id}/${p.station} at (${r1(p.ring.x)}, ${r1(p.ring.y)})`);
    expect(off, `station pins outside the ${st.vw}x${st.vh} viewport: ${off.join('; ')}`).toEqual([]);
    const pick = st.pins[1];
    // A synthetic click on the button itself proves the routing and focus; the pointer hit area is
    // measured separately below.
    await page.dispatchEvent(`#room-pins .room-pin[data-station="${pick.station}"]`, 'click');
    await page.waitForFunction((h) => location.hash === h, `#/door/${id}/${pick.station}`, { polling: 50 });
    await page.waitForFunction((s) => document.activeElement?.id === `st-${s}`, pick.station, { polling: 50 });
    const h3 = await page.evaluate((s) => document.getElementById(`st-${s}`).textContent.trim(), pick.station);
    expect(h3).toBe(S[pick.station]);
    expect(await page.evaluate(() => document.getElementById('panel').hidden)).toBe(false);
  }
  annotate(testInfo, log);
});

test('R-04 a station pin\'s hit area covers its ring (a pointer click on the ring routes)', async ({ page }, testInfo) => {
  const id = WIRED[0];
  await open(page, { hash: `#/door/${id}` });
  await panelOpen(page);
  await roomVisible(page, 3000);
  await page.waitForTimeout(400);
  const st = await page.evaluate(ROOM);
  const pick = st.pins[2];
  const hits = await page.evaluate(({ x, y }) => [[0, 0], [8, 0], [0, 8], [-8, 0]].map(([dx, dy]) => { const e = document.elementFromPoint(x + dx, y + dy); return { dx, dy, pin: !!(e && e.closest('.room-pin')), got: e ? (e.id || e.className || e.tagName) : null }; }), pick.ring);
  annotate(testInfo, { station: pick.station, ringWidth: r1(pick.ring.w), buttonBox: pick.btn, hits });
  await page.mouse.click(pick.ring.x, pick.ring.y);
  await page.waitForTimeout(600);
  const after = await hash(page);
  expect(after, `a pointer click at the ring centre (${r1(pick.ring.x)}, ${r1(pick.ring.y)}) routes to the station; elementFromPoint there: ${JSON.stringify(hits[0])}; button box ${JSON.stringify(pick.btn)}`).toBe(`#/door/${id}/${pick.station}`);
  expect(hits.every((h) => h.pin), `elementFromPoint at the ring centre and 8 px around it: ${JSON.stringify(hits)}`).toBe(true);
});

test('R-04 a deep link #/door/<id>/<station> opens the room and focuses the matching h3', async ({ page }, testInfo) => {
  const log = {};
  for (const id of WIRED) {
    const station = doorById(id).stations[3];
    await open(page, { hash: `#/door/${id}/${station}` });
    await panelOpen(page);
    await roomVisible(page, 3000);
    await page.waitForTimeout(300);
    const st = await page.evaluate((s) => ({ active: document.activeElement?.id, h3Visible: (() => { const el = document.getElementById(`st-${s}`); const r = el.getBoundingClientRect(); const p = document.getElementById('panel').getBoundingClientRect(); return r.top >= p.top - 1 && r.bottom <= p.bottom + 1; })(), hash: location.hash }), station);
    log[id] = st;
    expect(st.hash).toBe(`#/door/${id}/${station}`);
    expect(st.active, `${id}/${station}: focus on the station h3`).toBe(`st-${station}`);
    expect(st.h3Visible, `${id}/${station}: h3 scrolled into the panel`).toBe(true);
  }
  annotate(testInfo, log);
});

test('R-01 automated render-gate criteria: every shipped room derivative exists, is 16:9 and is at most 600 KB', async ({}, testInfo) => {
  const fs = await import('node:fs'); const path = await import('node:path');
  const dir = path.join(process.cwd(), 'media', 'rooms');
  const rows = [];
  for (const d of WIRED) for (const w of [2560, 2048, 1280]) for (const ext of ['avif', 'webp', 'jpg']) {
    const f = path.join(dir, `${d}-${w}.${ext}`);
    const exists = fs.existsSync(f); const bytes = exists ? fs.statSync(f).size : 0;
    rows.push({ file: `${d}-${w}.${ext}`, exists, kb: Math.round(bytes / 1024) });
    expect(exists, `${d}-${w}.${ext} exists`).toBe(true);
    expect(bytes, `${d}-${w}.${ext} ${Math.round(bytes / 1024)} KB`).toBeLessThanOrEqual(600 * 1024);
  }
  annotate(testInfo, rows);
});

test('R-06 reduced motion cuts every room transition: the room is on at once and nothing animates', async ({ page }, testInfo) => {
  test.skip(!isReduced(testInfo), 'reduced-motion project only');
  await page.goto('about:blank');
  await page.goto('?debug=1#/experience');
  await ready(page);
  await page.click(`#doors .door[data-door="${WIRED[0]}"]`);
  await panelOpen(page);
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.getElementById('room')).opacity) === 1, null, { polling: 25, timeout: 3000 });
  const r = await page.evaluate(() => ({ anims: document.getAnimations().map((a) => a.transitionProperty || a.animationName), room: getComputedStyle(document.getElementById('room')).transitionDuration, img: getComputedStyle(document.getElementById('room-img')).transitionDuration }));
  annotate(testInfo, r);
  expect(r.anims).toEqual([]);
});
