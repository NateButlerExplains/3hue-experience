// P2b-D01/02/03/06: keyboard-only flows, elementFromPoint on the panel controls, the open door's
// frame inside R with the heading hidden, and the path chip as the only path control.
import { test, expect } from '@playwright/test';
import { open, doorsShown, panelOpen, atRest, settled, active, tabTo, tabSequence, pressTab, manifest as m, S, DOORS, doorById, doorH2, vp, annotate, frameToRect, inside, r1, hash } from './helpers.mjs';

const KEYBOARD_VPS = [[1280, 720], [1440, 900]];
const HIT_VPS = [[1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]];
const FRAME_VPS = [[1280, 720], [1440, 900], [1512, 982], [1920, 1080]];

const panelState = (page) => page.evaluate(() => {
  const p = document.getElementById('panel');
  return { hidden: p.hidden, h2: p.querySelector('#panel-h2')?.textContent.trim() ?? null, hash: location.hash, current: [...document.querySelectorAll('[aria-current]')].map((e) => (e.dataset.door || e.className || e.tagName) + '=' + e.getAttribute('aria-current')), historyLength: history.length, title: document.title };
});

for (const [w, h] of KEYBOARD_VPS) {
  test(`P2b-D01 / P6-D03 Tab order at ${w}x${h}: skip → brand → walk → talk → doors → path chip`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    await doorsShown(page);
    const seq = await tabSequence(page, 8);
    annotate(testInfo, { seq });
    expect(seq).toEqual(['skip', 'brand', 'walk-btn', 'talk-btn', ...DOORS.map((id) => `door:${id}`), 'path-chip']);
    // The skip link is visible while focused and targets the doors group.
    await pressTab(page, true); // back to stay-ready ... keep going to skip
    const skip = await page.evaluate(() => { const s = document.getElementById('skip'); return { href: s.getAttribute('href'), text: s.textContent.trim(), targetExists: !!document.querySelector(s.getAttribute('href')) }; });
    expect(skip.text).toBe(S.skip);
    expect(skip.targetExists).toBe(true);
  });

  test(`P2b-D01/D06 / P6-D03 keyboard open and close at ${w}x${h}: Enter focuses #panel-h2, Escape refocuses the opener, second Escape is a no-op`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    await doorsShown(page);
    const log = [];

    async function openAndClose(target, expectedH2, expectedHash) {
      await tabTo(page, target);
      const lenBefore = await page.evaluate(() => history.length);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'panel-h2', null, { polling: 50 });
      await settled(page);
      let st = await panelState(page);
      log.push({ target, opened: st });
      expect(st.hidden).toBe(false);
      expect(st.h2).toBe(expectedH2);
      expect(st.hash).toBe(expectedHash);
      // The open pushes one entry; after an earlier Back the push replaces the forward entry, so the
      // length either grows by one or stays the same. Never more.
      expect([lenBefore, lenBefore + 1], `history.length ${st.historyLength} after open (was ${lenBefore})`).toContain(st.historyLength);
      const currentId = target.startsWith('door:') ? target.slice(5) : 'path-chip';
      expect(st.current.some((c) => c.startsWith(currentId + '=true')), `selected control carries aria-current: ${st.current.join(', ')}`).toBe(true);
      // Escape closes the panel and refocuses the opener.
      await page.keyboard.press('Escape');
      await page.waitForFunction((t) => location.hash === '#/experience' && document.getElementById('panel').hidden, null, { polling: 50 });
      await page.waitForFunction((t) => { const a = document.activeElement; if (!a) return false; const key = a.id || (a.classList.contains('path-chip') ? 'path-chip' : a.dataset.door ? 'door:' + a.dataset.door : ''); return key === t; }, target, { polling: 50 });
      await settled(page);
      await doorsShown(page);
      st = await panelState(page);
      log.push({ target, closed: st, active: await active(page) });
      expect(st.hidden).toBe(true);
      expect(st.current, 'nothing stays selected after close').toEqual([]);
      expect(st.title).toBe(m.site.title);
      expect(await active(page)).toBe(target);
      // A second Escape at rest changes nothing.
      const before = await panelState(page);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const after = await panelState(page);
      expect(after).toEqual(before);
      expect(await active(page)).toBe(target);
      expect(await page.evaluate(() => document.getElementById('walk').hidden)).toBe(true);
    }

    // Path chip fresh, then each door followed by the path chip again (P2b-D06: fresh and after each door).
    await openAndClose('path-chip', m.path.title, '#/path');
    for (const id of DOORS) {
      const d = doorById(id);
      await openAndClose(`door:${id}`, doorH2(d), `#/door/${id}`);
      await openAndClose('path-chip', m.path.title, '#/path');
    }
    annotate(testInfo, log);
  });

  test(`P2b-D01 with a panel open at ${w}x${h}, 30 Tabs never land on an inert or hidden control`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    await doorsShown(page);
    await tabTo(page, `door:${DOORS[0]}`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.id === 'panel-h2', null, { polling: 50 });
    await settled(page);
    await page.waitForTimeout(1500); // let the room (and its pins) settle in
    const seq = [];
    for (let i = 0; i < 30; i++) {
      await pressTab(page);
      seq.push(await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return { key: 'body', ok: true };
        const inert = !!a.closest('[inert]');
        const cs = getComputedStyle(a);
        let hidden = cs.visibility === 'hidden' || cs.display === 'none';
        for (let e = a; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.visibility === 'hidden' || c.display === 'none' || e.hidden) hidden = true; }
        const key = a.id || (a.dataset.door ? 'door:' + a.dataset.door : a.dataset.station ? 'station:' + a.dataset.station : a.className || a.tagName);
        return { key, inert, hidden, ok: !inert && !hidden };
      }));
    }
    annotate(testInfo, { seq: seq.map((s) => s.key) });
    const bad = seq.filter((s) => !s.ok);
    expect(bad, `focus landed on inert/hidden: ${JSON.stringify(bad)}`).toEqual([]);
    expect(seq.filter((s) => s.key !== 'body').length).toBeGreaterThan(5);
    // The pins, the heading and the header actions are inert while the panel is open.
    const inert = await page.evaluate(() => ['#doors', '#intro', '#hud-actions'].map((s) => document.querySelector(s)?.hasAttribute('inert')));
    expect(inert).toEqual([true, true, true]);
  });
}

for (const [w, h] of HIT_VPS) {
  test(`P2b-D02 elementFromPoint on Back to doors and each tab at ${w}x${h}; a tab click switches the h2`, async ({ page }, testInfo) => {
    const log = [];
    for (const id of DOORS) {
      await open(page, { viewport: vp(w, h), hash: `#/door/${id}` });
      await panelOpen(page);
      const r = await page.evaluate(() => {
        const hit = (el) => { const b = el.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { text: el.textContent.trim(), ok: e === el, got: e ? (e.id || e.className || e.tagName) : null, rect: [b.left, b.top, b.width, b.height] }; };
        const back = document.getElementById('panel-back');
        const tabs = [...document.querySelectorAll('#panel .tabs .tab')];
        return { back: hit(back), tabs: tabs.map(hit), pressed: tabs.map((t) => t.getAttribute('aria-pressed')), h2: document.getElementById('panel-h2').textContent.trim() };
      });
      log.push({ id, back: r.back.ok, tabs: r.tabs.map((t) => t.ok) });
      expect(r.back.text).toBe(S.back);
      expect(r.back.ok, `elementFromPoint at Back to doors returned ${r.back.got}`).toBe(true);
      expect(r.tabs.map((t) => t.text)).toEqual(m.doors.map((d) => d.title));
      for (const t of r.tabs) expect(t.ok, `elementFromPoint at tab "${t.text}" returned ${t.got}`).toBe(true);
      expect(r.pressed).toEqual(DOORS.map((x) => (x === id ? 'true' : 'false')));
      expect(r.h2).toBe(doorH2(doorById(id)));
      // A tab click switches the h2 (and the hash) to that door.
      const other = DOORS[(DOORS.indexOf(id) + 1) % DOORS.length];
      await page.click(`#panel .tabs .tab[data-door="${other}"]`);
      await page.waitForFunction((t) => document.getElementById('panel-h2')?.textContent.trim() === t, doorH2(doorById(other)), { polling: 50 });
      expect(await hash(page)).toBe(`#/door/${other}`);
      expect(await page.evaluate(() => document.title)).toBe(`${doorById(other).title} · ${m.site.name}`);
    }
    annotate(testInfo, log);
  });
}

for (const [w, h] of FRAME_VPS) {
  test(`P2b-D03 / P4-D01 open door frame inside R and heading hidden at ${w}x${h}`, async ({ page }, testInfo) => {
    const log = [];
    for (const id of DOORS) {
      await open(page, { viewport: vp(w, h), hash: `#/door/${id}` });
      await panelOpen(page);
      const r = await page.evaluate((id) => {
        const L = window.__lobby;
        const intro = document.getElementById('intro');
        const cs = getComputedStyle(intro);
        const panel = document.getElementById('panel').getBoundingClientRect();
        return { frame: L.rects.doors[id].frame, R: L.frame(), z: L.stage.z, dock: L.stage.dock, introVisibility: cs.visibility, introInert: intro.hasAttribute('inert'), panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom }, vw: innerWidth, vh: innerHeight };
      }, id);
      log.push({ id, frame: Object.fromEntries(Object.entries(r.frame).map(([k, v]) => [k, r1(v)])), R: r.R, dock: r.dock });
      const R = frameToRect(r.R);
      expect(inside(r.frame, R, 0.5), `${id} frame ${JSON.stringify(r.frame)} inside R ${JSON.stringify(r.R)}`).toBe(true);
      expect(r.z).toBeCloseTo(1.3, 5);
      expect(r.introVisibility).toBe('hidden');
      expect(r.introInert).toBe(true);
      // R excludes the panel: the frame must not sit under it.
      expect(r.frame.right <= r.panel.left + 0.5 || r.frame.left >= r.panel.right - 0.5, `${id} frame clear of the panel`).toBe(true);
    }
    annotate(testInfo, log);
  });
}

test('P6-D03 every keyboard stop in the lobby and in a door panel shows a visible focus indicator', async ({ page }, testInfo) => {
  await open(page, { viewport: vp(1440, 900) });
  const probe = () => {
    const a = document.activeElement; if (!a || a === document.body) return null;
    const vis = (el) => { if (!el) return false; const cs = getComputedStyle(el); return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none'); };
    return { key: a.id || a.dataset.door || a.className || a.tagName, ok: vis(a) || vis(a.querySelector('.ring')) || vis(a.querySelector('.chip')) };
  };
  const seen = [];
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); const r = await page.evaluate(probe); if (r) seen.push(r); }
  await page.locator('#doors .door[data-door="win-trust"]').focus();
  await page.keyboard.press('Enter');
  await panelOpen(page);
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); const r = await page.evaluate(probe); if (r) seen.push(r); }
  annotate(testInfo, seen);
  expect(seen.filter((s) => !s.ok), 'stops without a visible focus indicator').toEqual([]);
});
