// P3-D01/02/03/06/07: the composed layout on phones, portrait tablets and short screens.
import { test, expect } from '@playwright/test';
import { open, ready, settled, panelOpen, atRest, active, tabSequence, tabTo, manifest as m, S, DOORS, doorById, doorH2, fill, vp, annotate, r1, inside, frameToRect } from './helpers.mjs';

const VPS = [[390, 844], [768, 1024], [844, 390], [1024, 1366], [320, 640]];

const layoutState = (page) => page.evaluate((ids) => {
  const cs = (el) => getComputedStyle(el);
  const accName = (b) => b.getAttribute('aria-label') || [...b.querySelectorAll('*')].filter((e) => !e.closest('[aria-hidden="true"]') && !e.children.length).map((e) => e.textContent.trim()).join(' ');
  const rows = [...document.querySelectorAll('#floor-rows .row-btn')].map((b) => { const r = b.getBoundingClientRect(); return { tag: b.tagName, door: b.dataset.door, label: accName(b), height: r.height, width: r.width, text: b.textContent.trim() }; });
  const rings = ids.map((id) => { const ring = document.querySelector(`#doors .door[data-door="${id}"] .ring`); const r = ring.getBoundingClientRect(); return { id, n: ring.dataset.n, size: [r.width, r.height], after: getComputedStyle(ring, '::after').content, chipDisplay: cs(ring.parentElement.querySelector('.chip')).display, plateDisplay: cs(ring.parentElement.querySelector('.plate')).display }; });
  const hud = document.getElementById('hud').getBoundingClientRect();
  return {
    composed: document.body.classList.contains('composed'), short: document.body.classList.contains('short'), stageComposed: window.__lobby.stage.composed,
    vw: innerWidth, vh: innerHeight, docScrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth, hudRight: hud.right, hudBottom: hud.bottom,
    rows, rings, labelsDisplay: cs(document.getElementById('labels')).display, pathChipDisplay: cs(document.querySelector('#doors .path-chip')).display,
    h1: parseFloat(cs(document.getElementById('h1')).fontSize), sub: parseFloat(cs(document.getElementById('sub')).fontSize),
    hudActionsDisplay: cs(document.getElementById('hud-actions')).display,
    foot: [...document.querySelectorAll('#floor-foot .btn')].map((b) => ({ tag: b.tagName, text: b.textContent.trim(), width: b.getBoundingClientRect().width })),
    legend: document.querySelector('#floor-foot .legend')?.textContent.trim(),
    band: (() => { const b = document.getElementById('floor-band').getBoundingClientRect(); return { top: b.top, height: b.height, width: b.width }; })(),
  };
}, DOORS);

// Visible controls that intersect the viewport, with their smallest dimension.
const CONTROLS = () => {
  const out = [];
  for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')) {
    let hidden = false;
    for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || e.hidden || parseFloat(c.opacity) === 0) { hidden = true; break; } }
    if (hidden) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
    out.push({ key: el.id || (el.dataset.door ? `${el.className.split(' ')[0]}:${el.dataset.door}` : el.className || el.tagName), text: el.textContent.trim().slice(0, 30), width: r.width, height: r.height, min: Math.min(r.width, r.height) });
  }
  return out.sort((a, b) => a.min - b.min);
};

for (const [w, h] of VPS) {
  test(`P3-D01 composed layout at ${w}x${h}: no horizontal overflow, labelled rows >= 56 px, numbered rings only`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    const s = await layoutState(page);
    annotate(testInfo, { viewport: `${w}x${h}`, composed: s.composed, short: s.short, docScrollWidth: s.docScrollWidth, rows: s.rows.map((r) => [r.door, r1(r.height)]), rings: s.rings.map((r) => [r.n, r.size.map(r1)]), h1: s.h1, band: s.band });
    expect(s.composed).toBe(true);
    expect(s.stageComposed).toBe(true);
    expect(s.short).toBe(h < 500);
    expect(s.docScrollWidth, `documentElement.scrollWidth ${s.docScrollWidth} <= ${s.vw}`).toBeLessThanOrEqual(s.vw);
    expect(s.bodyScrollWidth, `body.scrollWidth ${s.bodyScrollWidth} <= ${s.vw}`).toBeLessThanOrEqual(s.vw);
    expect(s.hudRight).toBeLessThanOrEqual(s.vw + 0.5);
    expect(s.hudActionsDisplay).toBe('none');
    // Rows: the three doors then the path, each a labelled button at least 56 px tall.
    expect(s.rows).toHaveLength(DOORS.length + 1);
    expect(s.rows.map((r) => r.door)).toEqual([...DOORS, 'path']);
    for (const r of s.rows) {
      expect(r.tag).toBe('BUTTON');
      expect(r.label && r.label.length > 0, `row ${r.door} is labelled`).toBe(true);
      expect(r.height, `row ${r.door} height ${r1(r.height)} >= 56`).toBeGreaterThanOrEqual(56);
      expect(r.width).toBeLessThanOrEqual(s.vw);
    }
    for (const id of DOORS) { const d = doorById(id); const name = s.rows.find((r) => r.door === id).label; expect(name, `row ${id} named by door and promise`).toContain(fill(S.explore, { door: d.title })); expect(name).toContain(d.promise); }
    expect(s.rows.find((r) => r.door === 'path').label.startsWith(S.pathChip)).toBe(true);
    // Band: numbered rings only, no chip, no sign or stage names, no path chip, no plates.
    expect(s.labelsDisplay).toBe('none');
    expect(s.pathChipDisplay).toBe('none');
    for (const r of s.rings) {
      expect(r.n).toBe(String(doorById(r.id).number));
      expect(r.chipDisplay).toBe('none');
      expect(r.plateDisplay).toBe('none');
      expect(/attr\(data-n\)|"\d"/.test(r.after), `ring ${r.id} shows its number (${r.after})`).toBe(true);
      expect(Math.abs(r.size[0] - 44)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.size[1] - 44)).toBeLessThanOrEqual(1);
    }
    expect(s.h1).toBeGreaterThanOrEqual(28);
    expect(s.sub).toBeGreaterThanOrEqual(15);
    expect(s.foot.map((b) => b.text)).toEqual([S.walk, S.talk]);
    expect(s.legend).toBe(S.legend);
    expect(s.band.height).toBeLessThanOrEqual(s.vh * 0.6 + 1);
  });

  test(`P3-D01/D06 each row opens its door at ${w}x${h}; #panel-h2 focused; Escape returns focus to the row`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    const log = [];
    for (const id of [...DOORS, 'path']) {
      await page.click(`#floor-rows .row-btn[data-door="${id}"]`);
      await page.waitForFunction(() => document.activeElement?.id === 'panel-h2', null, { polling: 50 });
      await panelOpen(page);
      const st = await page.evaluate(() => { const p = document.getElementById('panel'); const r = p.getBoundingClientRect(); const hud = document.getElementById('hud').getBoundingClientRect(); const band = document.getElementById('floor-band'); const bcs = getComputedStyle(band); return { hash: location.hash, h2: p.querySelector('#panel-h2').textContent.trim(), dock: p.dataset.dock, panelTop: r.top, panelLeft: r.left, panelRight: r.right, hudBottom: hud.bottom, bandDisplay: bcs.display, bandRect: band.getBoundingClientRect().toJSON(), headVisibility: getComputedStyle(document.getElementById('floor-head')).visibility, rowsVisibility: getComputedStyle(document.getElementById('floor-rows')).visibility, vw: innerWidth, vh: innerHeight, docScrollWidth: document.documentElement.scrollWidth }; });
      log.push({ id, ...st });
      expect(st.hash).toBe(id === 'path' ? '#/path' : `#/door/${id}`);
      expect(st.h2).toBe(id === 'path' ? m.path.title : doorH2(doorById(id)));
      expect(st.dock).toBe('sheet');
      expect(st.panelLeft).toBe(0);
      expect(st.panelRight).toBe(st.vw);
      expect(st.headVisibility).toBe('hidden');
      expect(st.rowsVisibility).toBe('hidden');
      expect(st.docScrollWidth).toBeLessThanOrEqual(st.vw);
      if (h < 500) {
        // Under 500 px tall the sheet fills the screen below the header and the band hides.
        expect(st.panelTop, `sheet top ${r1(st.panelTop)} equals header bottom ${r1(st.hudBottom)}`).toBeCloseTo(st.hudBottom, 0);
        expect(st.bandDisplay).toBe('none');
      } else {
        expect(st.panelTop, `sheet top at 39% of ${st.vh}`).toBeCloseTo(st.vh * 0.39, 0);
        expect(st.bandDisplay).not.toBe('none');
      }
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('panel').hidden, null, { polling: 50 });
      await page.waitForFunction((id) => document.activeElement === document.querySelector(`#floor-rows .row-btn[data-door="${id}"]`), id, { polling: 50 });
      await settled(page);
      expect(await active(page)).toBe(`row:${id}`);
    }
    annotate(testInfo, log.map((l) => ({ id: l.id, panelTop: r1(l.panelTop), hudBottom: r1(l.hudBottom), bandDisplay: l.bandDisplay })));
  });
}

test('P3-D02 at 390x844: h1 >= 28 px, smallest resting lobby control >= 44x44', async ({ page }, testInfo) => {
  await open(page, { viewport: vp(390, 844) });
  const h1 = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('h1')).fontSize));
  const controls = await page.evaluate(CONTROLS);
  annotate(testInfo, { h1, smallest: controls.slice(0, 4).map((c) => ({ key: c.key, w: r1(c.width), h: r1(c.height) })), count: controls.length });
  expect(h1).toBeGreaterThanOrEqual(28);
  expect(controls.length).toBeGreaterThanOrEqual(DOORS.length * 2 + 3);
  const small = controls.filter((c) => c.min < 44);
  expect(small, `controls under 44 px: ${JSON.stringify(small.map((c) => ({ key: c.key, w: r1(c.width), h: r1(c.height) })))}`).toEqual([]);
});

test('P3-D02 at 390x844 with a sheet open: every visible control >= 44x44', async ({ page }, testInfo) => {
  await open(page, { viewport: vp(390, 844), hash: `#/door/${DOORS[0]}` });
  await panelOpen(page);
  const controls = await page.evaluate(CONTROLS);
  annotate(testInfo, { smallest: controls.slice(0, 6).map((c) => ({ key: c.key, text: c.text, w: r1(c.width), h: r1(c.height) })) });
  const small = controls.filter((c) => c.min < 44);
  expect(small, `sheet controls under 44 px: ${JSON.stringify(small.map((c) => ({ key: c.key, text: c.text, w: r1(c.width), h: r1(c.height) })))}`).toEqual([]);
});

for (const [w, h] of [[390, 844], [768, 1024]]) {
  test(`P3-D03 sheet at ${w}x${h}: door fully visible above the sheet, Back and tabs hit-testable, tab click switches the h2`, async ({ page }, testInfo) => {
    const log = [];
    for (const id of DOORS) {
      await open(page, { viewport: vp(w, h), hash: `#/door/${id}` });
      await panelOpen(page);
      const r = await page.evaluate((id) => {
        const L = window.__lobby;
        const hit = (el) => { const b = el.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { text: el.textContent.trim(), ok: e === el, got: e ? (e.id || e.className || e.tagName) : null }; };
        const panel = document.getElementById('panel').getBoundingClientRect();
        const band = document.getElementById('floor-band').getBoundingClientRect();
        const hud = document.getElementById('hud').getBoundingClientRect();
        return { frame: L.rects.doors[id].frame, R: L.frame(), panelTop: panel.top, bandTop: band.top, bandBottom: band.bottom, hudBottom: hud.bottom, back: hit(document.getElementById('panel-back')), tabs: [...document.querySelectorAll('#panel .tabs .tab')].map(hit), vw: innerWidth };
      }, id);
      log.push({ id, frame: Object.fromEntries(Object.entries(r.frame).map(([k, v]) => [k, r1(v)])), panelTop: r1(r.panelTop), bandTop: r1(r.bandTop), bandBottom: r1(r.bandBottom) });
      expect(r.back.ok, `Back to doors hit-test returned ${r.back.got}`).toBe(true);
      expect(r.back.text).toBe(S.back);
      for (const t of r.tabs) expect(t.ok, `tab ${t.text} hit-test returned ${t.got}`).toBe(true);
      expect(r.frame.top, `${id} frame top ${r1(r.frame.top)} below the header ${r1(r.hudBottom)}`).toBeGreaterThanOrEqual(r.hudBottom - 0.5);
      expect(r.frame.bottom, `${id} frame bottom ${r1(r.frame.bottom)} above the sheet top ${r1(r.panelTop)}`).toBeLessThanOrEqual(r.panelTop + 0.5);
      expect(r.frame.left).toBeGreaterThanOrEqual(-0.5);
      expect(r.frame.right).toBeLessThanOrEqual(r.vw + 0.5);
      const other = DOORS[(DOORS.indexOf(id) + 1) % DOORS.length];
      await page.click(`#panel .tabs .tab[data-door="${other}"]`);
      await page.waitForFunction((t) => document.getElementById('panel-h2')?.textContent.trim() === t, doorH2(doorById(other)), { polling: 50 });
    }
    annotate(testInfo, log);
  });
}

test('P3-D06 keyboard at 390x844: Tab reaches the four rows in order; Enter opens; Escape returns focus to the row', async ({ page }, testInfo) => {
  await open(page, { viewport: vp(390, 844) });
  const seq = await tabSequence(page, 10);   // skip, brand, four rows, walk, talk; band rings are tabindex=-1
  annotate(testInfo, { seq });
  const rowsInSeq = seq.filter((k) => k.startsWith('row:'));
  expect(rowsInSeq).toEqual([...DOORS, 'path'].map((id) => `row:${id}`));
  for (const id of [...DOORS, 'path']) {
    await open(page, { viewport: vp(390, 844) });
    await tabTo(page, `row:${id}`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.id === 'panel-h2', null, { polling: 50 });
    await page.keyboard.press('Escape');
    await page.waitForFunction((id) => location.hash === '#/experience' && document.activeElement === document.querySelector(`#floor-rows .row-btn[data-door="${id}"]`), id, { polling: 50 });
  }
});

test('P3-D01 band rings are tappable but not tab stops or accessible names when composed (rows carry the doors)', async ({ page }, testInfo) => {
  await open(page, { viewport: vp(390, 844) });
  const seq = await tabSequence(page, 14);
  const bandStops = seq.filter((k) => k.startsWith('door:'));
  annotate(testInfo, { seq, bandStops });
  expect(bandStops, 'composed band pins should be tabindex=-1 (the rows are the keyboard controls)').toEqual([]);
  // A tap on a band ring still opens the door.
  const c = await page.evaluate((id) => window.__lobby.rects.doors[id].center, DOORS[1]);
  await page.mouse.click(c.x, c.y);
  await page.waitForFunction((h) => location.hash === h, `#/door/${DOORS[1]}`, { polling: 50 });
});

for (const [w, h] of [[390, 844], [844, 390]]) {
  test(`P3-D07 at ${w}x${h} exactly one plate file is requested and it is 1920 px wide or less`, async ({ page }, testInfo) => {
    await page.setViewportSize(vp(w, h));
    await page.goto('about:blank');
    const plateReqs = [];
    page.on('request', (rq) => { if (/\/media\/plate\//.test(rq.url())) plateReqs.push(rq.url()); });
    await page.goto('?debug=1#/experience');
    await ready(page);
    await page.waitForTimeout(1500);
    const widths = plateReqs.map((u) => +(u.match(/lobby-plate-(\d+)\./)?.[1] || 0));
    const current = await page.evaluate(() => ({ currentSrc: document.getElementById('plate-img').currentSrc, sizes: document.getElementById('plate-img').sizes, dpr: devicePixelRatio, overflow: document.documentElement.scrollWidth <= innerWidth }));
    annotate(testInfo, { plateReqs, widths, ...current });
    expect(plateReqs, `plate requests: ${plateReqs.join(', ')}`).toHaveLength(1);
    expect(widths[0]).toBeLessThanOrEqual(1920);
    expect(current.currentSrc).toBe(plateReqs[0]);
    expect(current.overflow).toBe(true);
  });
}
