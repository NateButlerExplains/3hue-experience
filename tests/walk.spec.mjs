// P6-D01/D02: the captioned walk by keyboard at 1440x900 and 390x844. Focus stays on Next,
// every step is announced once with its manifest caption, door steps select their door, stage
// steps light their arc, Escape returns to #/experience focusing Take the walk, and the bar never
// covers a door frame, the panel, a lit ring or the kiosk.
import { test, expect } from '@playwright/test';
import { open, doorsShown, settled, atRest, active, tabSequence, pressTab, manifest as m, S, DOORS, STAGES, doorById, stageById, fill, kioskLines, vp, annotate, r1, intersects } from './helpers.mjs';

const c = m.walk.captions;
function expectedSteps(withKiosk) {
  const steps = [{ id: 'lobby', caption: fill(c.lobby, { eyebrow: m.lobby.eyebrow, heading: m.lobby.heading.join(' '), subline: m.lobby.subline.join(' ') }) }];
  for (const d of m.doors) steps.push({ id: `door-${d.id}`, door: d.id, caption: fill(c.door, { title: d.title, promise: d.promise, icp: d.icp, audience: d.audience }) });
  for (const s of m.stages) steps.push({ id: `stage-${s.id}`, stage: s.id, caption: fill(c.stage, { stage: s.name, doors: m.doors.filter((d) => d.maturityEmphasis.includes(s.id)).map((d) => d.title).join(', ') }) });
  if (withKiosk) steps.push({ id: 'kiosk', caption: fill(c.kiosk, { lines: kioskLines().map((l) => `${l.value} ${l.label.toLowerCase()}`).join(', ') }) });
  steps.push({ id: 'talk', caption: c.talk });
  steps.push({ id: 'end', caption: c.end });
  return steps;
}

const STEP = () => {
  const L = window.__lobby;
  const bar = document.getElementById('walk').getBoundingClientRect();
  const rr = (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  const lit = document.querySelector('#arcs path.lit');
  const kiosk = document.querySelector('.kiosk');
  const panel = document.getElementById('panel');
  return {
    hash: location.hash, count: document.querySelector('#walk .count')?.textContent.trim(), caption: document.querySelector('#walk .caption')?.textContent.trim(),
    live: document.getElementById('walk-live').textContent, ann: window.__ann.slice(),
    active: document.activeElement?.id || document.activeElement?.tagName,
    current: [...document.querySelectorAll('#doors .door[aria-current="true"]')].map((b) => b.dataset.door),
    lit: [...document.querySelectorAll('#arcs path.lit')].map((p) => p.dataset.stage),
    bar: rr(bar), barVisible: !document.getElementById('walk').hidden,
    frames: Object.fromEntries(Object.entries(L.rects.doors).map(([id, d]) => [id, d.frame])),
    litBox: lit ? rr(lit.getBoundingClientRect()) : null,
    kioskBox: kiosk && !kiosk.hidden ? rr(kiosk.getBoundingClientRect()) : null,
    panelBox: panel.hidden ? null : rr(panel.getBoundingClientRect()),
    z: L.stage.z, vw: innerWidth, vh: innerHeight, prevDisabled: document.getElementById('walk-prev')?.disabled, nextDisabled: document.getElementById('walk-next')?.disabled,
    hudActionsVisibility: getComputedStyle(document.getElementById('hud-actions')).visibility,
  };
};

for (const [w, h] of [[1440, 900], [390, 844]]) {
  test(`P6-D01/D02 the walk by keyboard at ${w}x${h}`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    await doorsShown(page);
    const composed = await page.evaluate(() => document.body.classList.contains('composed'));
    const walkSel = composed ? '#floor-foot button' : '#walk-btn';
    expect(await page.evaluate((s) => document.querySelector(s)?.textContent.trim(), walkSel)).toBe(S.walk);
    await page.evaluate(() => { window.__ann = []; new MutationObserver(() => { const t = document.getElementById('walk-live').textContent; if (t) window.__ann.push(t); }).observe(document.getElementById('walk-live'), { childList: true, characterData: true, subtree: true }); });
    // Keyboard: focus the walk button and press Enter.
    await page.focus(walkSel);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.id === 'walk-next', null, { polling: 50 });
    await settled(page);
    await page.waitForTimeout(150);
    let st = await page.evaluate(STEP);
    const total = +st.count.split('/')[1];
    const withKiosk = total === DOORS.length + STAGES.length + 4;
    const steps = expectedSteps(withKiosk);
    expect(total, `step count ${st.count}`).toBe(steps.length);
    expect(st.hash).toBe('#/walk/0');
    expect(st.caption).toBe(steps[0].caption);
    expect(st.ann).toEqual([steps[0].caption]);
    expect(st.prevDisabled).toBe(true);
    if (!composed) expect(st.hudActionsVisibility).toBe('hidden');
    const log = [{ i: 0, ann: st.ann.length, active: st.active }];
    const checkBar = (st, label) => {
      expect(st.barVisible).toBe(true);
      expect(st.bar.bottom).toBeLessThanOrEqual(st.vh + 0.5);
      expect(st.bar.left).toBeGreaterThanOrEqual(-0.5);
      expect(st.bar.right).toBeLessThanOrEqual(st.vw + 0.5);
      expect(st.panelBox, `${label}: no panel during the walk`).toBeNull();
      for (const [id, f] of Object.entries(st.frames)) expect(intersects(st.bar, f), `${label}: bar covers the ${id} frame ${JSON.stringify(f)} (bar ${JSON.stringify(st.bar)})`).toBe(false);
      if (st.litBox) expect(intersects(st.bar, st.litBox), `${label}: bar covers the lit ring`).toBe(false);
      if (st.kioskBox) expect(intersects(st.bar, st.kioskBox), `${label}: bar covers the kiosk screen`).toBe(false);
    };
    checkBar(st, 'step 0');
    for (let i = 1; i < steps.length; i++) {
      const before = st.ann.length;
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction((i) => document.querySelector('#walk .count')?.textContent.trim().startsWith(`${i + 1} /`), i, { polling: 50 });
      await settled(page);
      await page.waitForTimeout(650); // arc glow, pin fade, live-region refill
      st = await page.evaluate(STEP);
      log.push({ i, id: steps[i].id, ann: st.ann.length, active: st.active, current: st.current, lit: st.lit, z: st.z });
      const label = `step ${i} (${steps[i].id})`;
      expect(st.hash, label).toBe(`#/walk/${i}`);
      expect(st.caption, label).toBe(steps[i].caption);
      expect(st.live, label).toBe(steps[i].caption);
      expect(st.ann.length - before, `${label} announced exactly once`).toBe(1);
      expect(st.active, label).toBe(i === steps.length - 1 ? 'walk-end' : 'walk-next');
      expect(st.nextDisabled).toBe(i === steps.length - 1);
      if (steps[i].door) expect(st.current, `${label} selects its door`).toEqual([steps[i].door]); else expect(st.current, label).toEqual([]);
      if (steps[i].stage) expect(st.lit, `${label} lights its arc`).toEqual([steps[i].stage]); else expect(st.lit, label).toEqual([]);
      if (steps[i].door || steps[i].stage || steps[i].id === 'kiosk') expect(st.z).toBeCloseTo(1.3, 5); else expect(st.z).toBe(1);
      checkBar(st, label);
    }
    // Escape ends the walk at rest with focus on Take the walk.
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('walk').hidden, null, { polling: 50 });
    await page.waitForFunction((s) => document.activeElement === document.querySelector(s), walkSel, { polling: 50 });
    await atRest(page);
    const end = await page.evaluate(() => ({ current: document.querySelectorAll('[aria-current]').length, lit: document.querySelectorAll('#arcs path.lit').length, z: window.__lobby.stage.z, title: document.title, walking: document.body.classList.contains('walking') }));
    expect(end).toEqual({ current: 0, lit: 0, z: 1, title: m.site.title, walking: false });
    annotate(testInfo, { composed, total, withKiosk, log });
  });

  test(`P6-D01 at ${w}x${h} ArrowRight on the last step keeps #/walk/<last>; ArrowLeft steps back`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    await doorsShown(page);
    const composed = await page.evaluate(() => document.body.classList.contains('composed'));
    await page.click(composed ? '#floor-foot button' : '#walk-btn');
    await page.waitForFunction(() => document.activeElement?.id === 'walk-next', null, { polling: 50 });
    const total = +(await page.evaluate(() => document.querySelector('#walk .count').textContent.split('/')[1]));
    const last = total - 1;
    for (let i = 1; i <= last; i++) { await page.keyboard.press('ArrowRight'); await page.waitForFunction((i) => location.hash === `#/walk/${i}`, i, { polling: 50 }); }
    await page.waitForFunction(() => document.activeElement?.id === 'walk-end', null, { polling: 50 });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({ hash: location.hash, count: document.querySelector('#walk .count').textContent.trim(), nextDisabled: document.getElementById('walk-next').disabled }));
    annotate(testInfo, { total, ...st });
    expect(st.count.startsWith(`${total} /`)).toBe(true);
    expect(st.hash, `ArrowRight on the last step must not push the hash past the last step (${st.count})`).toBe(`#/walk/${last}`);
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction((n) => location.hash === `#/walk/${n}`, last - 1, { polling: 50 });
  });

  test(`P6-D01 during the walk at ${w}x${h}, 30 Tabs stay on visible, non-inert controls`, async ({ page }, testInfo) => {
    await open(page, { viewport: vp(w, h) });
    await doorsShown(page);
    const composed = await page.evaluate(() => document.body.classList.contains('composed'));
    await page.click(composed ? '#floor-foot button' : '#walk-btn');
    await page.waitForFunction(() => document.activeElement?.id === 'walk-next', null, { polling: 50 });
    await settled(page);
    const seq = [];
    for (let i = 0; i < 30; i++) {
      await pressTab(page);
      seq.push(await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return { key: 'body', ok: true };
        let hidden = false;
        for (let e = a; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.visibility === 'hidden' || c.display === 'none' || e.hidden) hidden = true; }
        const key = a.id || (a.dataset.door ? 'door:' + a.dataset.door : a.className || a.tagName);
        return { key, inert: !!a.closest('[inert]'), hidden, ok: !a.closest('[inert]') && !hidden };
      }));
    }
    annotate(testInfo, { seq: seq.map((s) => s.key) });
    expect(seq.filter((s) => !s.ok)).toEqual([]);
    expect(seq.some((s) => s.key === 'walk-next')).toBe(true);
    expect(seq.some((s) => s.key.startsWith('door:'))).toBe(false);
  });
}
