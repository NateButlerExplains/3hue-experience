// T-04, T-05, T-06, T-11: the guided tour's engine (O10/O11) against the fixture, captions only (no
// ?voice= here and guide.voice.required is false, so every line waits for Next and nothing runs on a
// timer; the voiced pacing is T-14/T-15 in tour-voice.spec.mjs).
//   T-04 behind the gate the walk button starts the tour: #/tour/<start>, one history entry, focus on
//        Next, the lobby inert, 30 Tabs on visible controls only; gate pending or ?tour=0: the walk.
//   T-05 with the voice off the live region speaks each line once, with the chapter when it
//        changes and the choice when one waits; focus stays on Next as the lines run out.
//   T-06 choices: manifest labels, 44 px, hit-testable, arrows move focus, digits commit, answers
//        stored, when / Suggested / hideWhen / Visited, history length held; every action; one
//        press commits one choice (the second click of a double-click, and an auto-repeated digit
//        or Enter, commit nothing).
//   T-11 keys act only inside the card (no global Space); a hidden tab moves nothing; Escape, End
//        tour, the end action, a terminal node and browser Back all land on the lobby, with focus on
//        the walk button of the layout on screen then (after a rotation too).
import { test, expect } from '@playwright/test';
import { open, doorsShown, settled, pressTab, manifest as m, S, fill, vp, annotate } from './helpers.mjs';
import { FX, FIXTURE, TQ, tour, card, openTour, startTour, atNode, toLast, pick, cont, linesOf, fillFx, chapterTitle, chapterLabel, isComposed, tourRequest } from './tour-helpers.mjs';

const INERT = ['#doors', '#intro', '#hud-actions', '#floor-rows', '#floor-foot'];
const liveLog = (page) => page.evaluate(() => {
  window.__ann = [];
  new MutationObserver(() => { const t = document.getElementById('tour-live').textContent; if (t) window.__ann.push(t); }).observe(document.getElementById('tour-live'), { childList: true, characterData: true, subtree: true });
});
const ann = (page) => page.evaluate(() => window.__ann.slice());
const TAB_PROBE = () => {
  const a = document.activeElement;
  if (!a || a === document.body) return { key: 'body', ok: true };
  let hidden = false;
  for (let e = a; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.visibility === 'hidden' || c.display === 'none' || e.hidden) hidden = true; }
  const key = a.id || (a.dataset.door ? `door:${a.dataset.door}` : a.dataset.option ? `option:${a.dataset.option}` : a.className || a.tagName);
  return { key, inert: !!a.closest('[inert]'), hidden, ok: !a.closest('[inert]') && !hidden };
};

test.describe('T-04 starting the tour', () => {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    test(`T-04 Enter on the walk button at ${w}x${h}: #/tour/${FX.start}, one history entry, focus on Next, the lobby inert, 30 Tabs on visible controls`, async ({ page }, testInfo) => {
      const reqs = [];
      page.on('request', (r) => reqs.push(r.url()));
      await open(page, { viewport: vp(w, h), query: TQ });
      await doorsShown(page);
      expect(reqs.filter(tourRequest), 'nothing tour-related is fetched before the start').toEqual([]);
      const composed = await isComposed(page);
      const len0 = await page.evaluate(() => history.length);
      await startTour(page, { key: true });
      const st = await page.evaluate((sels) => ({
        hash: location.hash, len: history.length, title: document.title,
        inert: sels.map((s) => document.querySelector(s)?.hasAttribute('inert')),
        touring: document.body.classList.contains('touring'), layerOpen: document.body.classList.contains('layer-open'),
        dock: window.__lobby.stage.dock, panelHidden: document.getElementById('panel').hidden, walkHidden: document.getElementById('walk').hidden,
        role: document.getElementById('tour').tagName,
      }), INERT);
      const c = await card(page);
      annotate(testInfo, { composed, st, card: c.rect });
      expect(st.hash).toBe(`#/tour/${FX.start}`);
      expect(st.len, 'the start pushes exactly one entry').toBe(len0 + 1);
      expect(st.inert).toEqual(INERT.map(() => true));
      expect(st.touring && st.layerOpen).toBe(true);
      expect(st.dock, 'a layer with no panel').toBe('none');
      expect(st.panelHidden, 'no panel opens during the tour').toBe(true);
      expect(st.walkHidden).toBe(true);
      expect(st.title).toBe(fill(S.tourDocTitle, { chapter: chapterTitle(FX.chapters.find((x) => x.entry === FX.start).id), site: m.site.name }));
      expect(c.hidden).toBe(false);
      expect(st.role).toBe('SECTION');
      expect(c.label).toBe(`${m.guide.guides[m.guide.lead].name}, ${m.guide.title}`);
      expect(c.active).toBe('tour-next');
      expect(c.caption).toBe(linesOf(FX.start)[0].text);
      expect(c.state).toBe(S.tourSpeaking);
      expect(reqs.filter(tourRequest).map((u) => new URL(u).pathname.split('/').pop()), 'the script is fetched once, on start; no voice').toEqual(['tour-min.json']);
      // 30 Tabs never land on anything inert or hidden, and never on a door.
      const seq = [];
      for (let i = 0; i < 30; i++) { await pressTab(page); seq.push(await page.evaluate(TAB_PROBE)); }
      annotate(testInfo, { seq: seq.map((s) => s.key) });
      expect(seq.filter((s) => !s.ok)).toEqual([]);
      expect(seq.some((s) => s.key === 'tour-next')).toBe(true);
      expect(seq.some((s) => s.key === 'tour-end')).toBe(true);
      expect(seq.some((s) => s.key.startsWith('door:') || s.key.startsWith('row-btn'))).toBe(false);
    });
  }

  test('T-04 the gate: pending (or ?tour=0) keeps the silent walk and fetches no script; ?tour=1 previews the tour', async ({ page }, testInfo) => {
    const log = [];
    const cases = [
      { query: 'debug=1', tour: m.tour.gate === 'approved' },
      { query: `debug=1&tour=0&tour-manifest=${FIXTURE}`, tour: false },
      { query: TQ, tour: true },
    ];
    for (const c of cases) {
      const reqs = [];
      const onReq = (r) => reqs.push(r.url());
      page.on('request', onReq);
      await open(page, { query: c.query });
      await doorsShown(page);
      await page.click('#walk-btn');
      if (c.tour) await page.waitForFunction(() => /^#\/tour\//.test(location.hash) && window.__tour?.touring, null, { polling: 50 });
      else await page.waitForFunction(() => location.hash === '#/walk/0' && document.activeElement?.id === 'walk-next', null, { polling: 50 });
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => ({ hash: location.hash, tourHidden: document.getElementById('tour').hidden, walkHidden: document.getElementById('walk').hidden }));
      page.off('request', onReq);
      const scripts = reqs.filter(tourRequest);
      log.push({ ...c, ...st, scripts: scripts.map((u) => u.split('/').pop()) });
      if (c.tour) { expect(st.tourHidden).toBe(false); expect(st.walkHidden).toBe(true); }
      else { expect(st.hash).toBe('#/walk/0'); expect(st.tourHidden).toBe(true); expect(st.walkHidden).toBe(false); expect(scripts, `${c.query}: no script, no voice`).toEqual([]); }
    }
    annotate(testInfo, log);
  });
});

test('T-05 voice off: the live region speaks each line exactly once, with the chapter when it changes and the choice when one waits; focus stays on Next', async ({ page }, testInfo) => {
  await openTour(page);
  await doorsShown(page);
  await liveLog(page);
  await startTour(page);
  const t0 = await tour(page);
  expect(t0.voice).toBe(false);
  expect(t0.mode).toBe('captions');
  const lines = linesOf(FX.start);
  await page.waitForFunction(() => window.__ann.length >= 1, null, { polling: 30 });
  let a = await ann(page);
  expect(a, 'one announcement for the first line').toHaveLength(1);
  expect(a[0]).toContain(chapterTitle('arrival'));
  expect(a[0]).toContain(lines[0].text);
  let c = await card(page);
  expect(c.caption).toBe(lines[0].text);
  expect(c.words, 'the word spans reproduce the line exactly').toBe(lines[0].text);
  expect(c.chapter).toBe(chapterLabel('arrival'));
  expect(c.prevDisabled).toBe(true);
  for (let i = 1; i < lines.length; i++) {
    await page.keyboard.press('ArrowRight');
    await atNode(page, FX.start, i);
    await page.waitForFunction((n) => window.__ann.length >= n, i + 1, { polling: 30 });
    await page.waitForTimeout(150);
    a = await ann(page);
    expect(a, `line ${i} announced once`).toHaveLength(i + 1);
    expect(a[i]).toContain(lines[i].text);
    expect(a[i]).not.toContain(chapterTitle('arrival'));
    c = await card(page);
    expect(c.caption).toBe(lines[i].text);
    expect(c.active, 'focus stays on Next').toBe('tour-next');
  }
  // The lines have run out and a choice waits: one announcement carried the prompt, the count and
  // how to reach it; focus did not move, and nothing moves on its own.
  const choice = FX.nodes[FX.start].choice;
  const last = a.at(-1);
  expect(last).toContain(fillFx(choice.prompt));
  expect(last).toContain(fill(S.tourChoicesLive, { count: choice.options.length }));
  expect(last).toContain(fill(S.tourChooseLive, { choose: S.tourChoose }));
  c = await card(page);
  expect(c.state).toBe(S.tourYourCall);
  expect(c.next).toBe(S.tourChoose);
  expect(c.active).toBe('tour-next');
  await page.waitForTimeout(2500);
  expect(await ann(page), 'no timer speaks again').toHaveLength(lines.length);
  expect((await tour(page)).line).toBe(lines.length - 1);
  expect((await card(page)).active).toBe('tour-next');
  // Choose (the visitor's move) focuses the first option; picking one announces the new chapter and
  // its first line once, with focus back on Next.
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((id) => document.activeElement?.dataset?.option === id, choice.options[0].id, { polling: 30 });
  expect((await ann(page)).length, 'moving focus announces nothing').toBe(lines.length);
  await page.keyboard.press('Enter');
  await atNode(page, 'wt');
  await page.waitForFunction(() => document.activeElement?.id === 'tour-next', null, { polling: 30 });
  await page.waitForFunction((n) => window.__ann.length > n, lines.length, { polling: 30 });
  await page.waitForTimeout(150);
  a = await ann(page);
  const wt = linesOf('wt', { answers: { segment: 'win-trust' } });
  expect(a).toHaveLength(lines.length + 1);
  expect(a.at(-1)).toContain(`${fillFx(FX.chapters.find((x) => x.id === 'door-win-trust').eyebrow)}, ${chapterTitle('door-win-trust')}`);
  expect(a.at(-1)).toContain(wt[0].text);
  // Previous speaks the earlier line again, once.
  await page.keyboard.press('ArrowRight');
  await atNode(page, 'wt', 1);
  await page.waitForFunction((n) => window.__ann.length > n, lines.length + 1, { polling: 30 });
  await page.keyboard.press('ArrowLeft');
  await atNode(page, 'wt', 0);
  await page.waitForTimeout(200);
  a = await ann(page);
  expect(a).toHaveLength(lines.length + 3);
  expect(a.at(-1)).toContain(wt[0].text);
  annotate(testInfo, { announcements: a });
});

test.describe('T-06 choices', () => {
  test('T-06 labels, subs and the prompt come from the manifest; every option >= 44 px and hit-testable; arrows move focus, a digit commits; the answer is stored; history length holds', async ({ page }, testInfo) => {
    await openTour(page, { viewport: vp(1280, 720) });
    await doorsShown(page);
    await startTour(page);
    const len = await page.evaluate(() => history.length);
    await toLast(page);
    const choice = FX.nodes[FX.start].choice;
    const c = await card(page);
    const group = await page.evaluate(() => { const g = document.getElementById('tour-choice'); return { role: g.getAttribute('role'), by: document.getElementById(g.getAttribute('aria-labelledby'))?.textContent, badges: [...g.querySelectorAll('.tour-opt .n')].map((n) => n.getAttribute('aria-hidden')) }; });
    const hits = await page.evaluate(() => [...document.querySelectorAll('#tour-options .tour-opt')].map((o) => { const b = o.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!e && (e === o || o.contains(e)); }));
    annotate(testInfo, { options: c.options.map((o) => ({ id: o.id, w: Math.round(o.rect.width), h: Math.round(o.rect.height) })), group });
    expect(group.role).toBe('group');
    expect(group.by).toBe(fillFx(choice.prompt));
    expect(group.badges.every((x) => x === 'true')).toBe(true);
    expect(c.options.map((o) => o.id)).toEqual(choice.options.map((o) => o.id));
    expect(c.options.map((o) => o.label)).toEqual(choice.options.map((o) => fillFx(o.label)));
    expect(c.options.map((o) => o.sub)).toEqual(choice.options.map((o) => (o.sub ? fillFx(o.sub) : null)));
    expect(c.options.slice(0, 3).map((o) => o.label), 'the O1 buyer labels in door order').toEqual(m.doors.map((d) => d.icp));
    for (const o of c.options) { expect(o.rect.width).toBeGreaterThanOrEqual(44); expect(o.rect.height).toBeGreaterThanOrEqual(44); }
    expect(hits).toEqual(c.options.map(() => true));
    // Arrows move focus only (wrapping); Home and End jump; nothing is chosen until a key commits.
    const focused = () => page.evaluate(() => document.activeElement?.dataset?.option || document.activeElement?.id);
    await page.keyboard.press('ArrowRight');
    expect(await focused()).toBe(choice.options[0].id);
    await page.keyboard.press('ArrowRight'); expect(await focused()).toBe(choice.options[1].id);
    await page.keyboard.press('ArrowLeft'); expect(await focused()).toBe(choice.options[0].id);
    await page.keyboard.press('ArrowLeft'); expect(await focused()).toBe(choice.options.at(-1).id);
    await page.keyboard.press('Home'); expect(await focused()).toBe(choice.options[0].id);
    await page.keyboard.press('End'); expect(await focused()).toBe(choice.options.at(-1).id);
    expect((await tour(page)).node).toBe(FX.start);
    expect((await tour(page)).answers).toEqual({});
    await page.keyboard.press('2');
    await atNode(page, choice.options[1].next);
    const t = await tour(page);
    expect(t.answers.segment).toBe(choice.options[1].id);
    expect(t.chosen.segment).toBe(fillFx(choice.options[1].label));
    expect(t.answers.door, 'a door scene records the door').toBe(choice.options[1].id);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tour-next');
    expect(await page.evaluate(() => location.hash)).toBe(`#/tour/${choice.options[1].next}`);
    expect(await page.evaluate(() => history.length), 'a node change replaces the entry').toBe(len);
  });

  test('T-06 when filters lines; Suggested marks the first matching option; hideWhen hides; Visited marks a chapter already seen; the chapter on screen is not offered', async ({ page }, testInfo) => {
    await openTour(page);
    await doorsShown(page);
    await startTour(page);
    const len = await page.evaluate(() => history.length);
    const log = [];
    await pick(page, 'win-trust');
    await atNode(page, 'wt');
    let t = await tour(page);
    expect(t.lineIds, 'the segment line shows for its segment').toEqual(linesOf('wt', { answers: { segment: 'win-trust' } }).map((l) => l.id));
    expect(t.lineIds).toContain('wt-2');
    await cont(page);
    await atNode(page, 'wt-proof');
    t = await toLast(page);
    log.push({ node: t.node, options: t.options });
    expect(t.options.map((o) => o.id), 'the option back into the chapter on screen is hidden').toEqual(['onward', 'explore', 'ask']);
    await pick(page, 'onward');
    await atNode(page, 'lens');
    let c = await card(page);
    expect(c.caption, '@ is the door whose scene is up').toBe(m.doors.find((d) => d.id === 'win-trust').decision);
    t = await toLast(page);
    log.push({ node: t.node, options: t.options });
    expect(t.options.map((o) => o.id)).toEqual(['path', 'more', 'end', 'bye']);
    c = await card(page);
    expect(c.options.find((o) => o.id === 'path').tags).toEqual([S.tourSuggested]);
    expect(c.options.filter((o) => o.tags.includes(S.tourSuggested))).toHaveLength(1);
    await pick(page, 'more');
    await atNode(page, 'gc');
    t = await toLast(page);
    c = await card(page);
    log.push({ node: t.node, options: t.options });
    expect(c.options.find((o) => o.id === 'to-wt').tags, 'a chapter already seen').toEqual([S.tourVisited]);
    expect(c.options.find((o) => o.id === 'onward').tags, 'onward leads to the lens chapter, already seen').toEqual([S.tourVisited]);
    expect(c.options.find((o) => o.id === 'explore').tags).toEqual([]);
    await pick(page, 'onward');
    await atNode(page, 'lens');
    await pick(page, 'more');
    await atNode(page, 'sr');
    await pick(page, 'onward');
    await atNode(page, 'lens');
    t = await toLast(page);
    log.push({ node: t.node, options: t.options, visited: t.visited });
    expect(t.visited).toEqual(expect.arrayContaining(['door-win-trust', 'door-gain-control', 'door-stay-ready']));
    expect(t.options.map((o) => o.id), 'hideWhen: every door seen').toEqual(['path', 'end', 'bye']);
    expect(await page.evaluate(() => history.length), 'eight node changes, still one entry').toBe(len);
    // Segment "all": the segment line is filtered out.
    await openTour(page);
    await doorsShown(page);
    await startTour(page);
    await pick(page, 'all');
    await atNode(page, 'wt');
    t = await tour(page);
    expect(t.answers.segment).toBe('all');
    expect(t.lineIds).toEqual(linesOf('wt', { answers: { segment: 'all' } }).map((l) => l.id));
    expect(t.lineIds).not.toContain('wt-2');
    annotate(testInfo, log);
  });

  test('T-06 actions: Talk is a new-tab link to the booking page (O2); the summary is a mail draft with no recipient plus Copy; Ask opens its dialog; replay starts over', async ({ page, browserName }, testInfo) => {
    if (browserName === 'chromium') await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await openTour(page, { hash: '#/tour/close' });
    await atNode(page, 'close');
    let c = await card(page);
    const talk = c.options.find((o) => o.id === 'talk');
    expect(talk.tag).toBe('A');
    expect(talk.href).toBe(m.site.bookingUrl);
    expect(talk.target).toBe('_blank');
    expect(talk.rel).toBe('noopener noreferrer');
    expect(talk.label).toBe(S.talk);
    expect(talk.aria).toBe(`${S.talk}, ${fill(S.newTab, { host: new URL(m.site.bookingUrl).host })}`);
    // Summary: the card turns into the mail draft and Copy; focus goes to the first action, inside
    // the group its prompt labels, so the live region does not say the prompt a second time.
    await liveLog(page);
    await pick(page, 'summary');
    await page.waitForFunction(() => window.__tour.frame === 'summary', null, { polling: 30 });
    c = await card(page);
    expect(c.prompt).toBe(S.tourSummaryTitle);
    expect(c.options.map((o) => o.label)).toEqual([S.tourEmail, S.tourCopy, S.tourBack]);
    expect(c.active).toBe('email');
    await page.waitForTimeout(200);
    expect((await ann(page)).filter((a) => a.includes(S.tourSummaryTitle)), 'the summary opens without a live announcement').toEqual([]);
    const mail = c.options[0].href;
    expect(mail.startsWith('mailto:?subject=')).toBe(true);
    const q = new URLSearchParams(mail.slice('mailto:?'.length));
    const body = q.get('body');
    expect(q.get('subject')).toBe(m.site.title);
    expect(body.length).toBeLessThanOrEqual(1800);
    expect(body).toContain(chapterTitle('close'));
    expect(body).toContain(m.path.whereToStart.lead);
    expect(body, 'a quoted figure keeps its source').toContain(m.path.whereToStart.source);
    expect(c.callouts.map((x) => x.text)).toContain(m.path.whereToStart.lead);
    expect(c.callouts.find((x) => x.text === m.path.whereToStart.lead).source).toBe(m.path.whereToStart.source);
    await liveLog(page);
    await page.focus('#tour-options .tour-opt[data-option="copy"]');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__ann.length > 0, null, { polling: 30 });
    const said = (await ann(page)).at(-1);
    expect([S.tourCopied, S.tourCopyFailed]).toContain(said);
    if (browserName === 'chromium') {
      expect(said).toBe(S.tourCopied);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(m.path.whereToStart.lead);
    }
    expect((await card(page)).active, 'Copy keeps focus').toBe('copy');
    await page.keyboard.press('3');
    await page.waitForFunction(() => window.__tour.frame === 'node', null, { polling: 30 });
    expect((await card(page)).options.map((o) => o.id)).toEqual(FX.nodes.close.choice.options.map((o) => o.id));
    // Ask: the option opens the Ask dialog (js/ask.js; T-12 checks it in full) with focus in its
    // question field; Escape closes only the dialog and focus returns to the option.
    await pick(page, 'ask');
    await page.waitForFunction(() => document.getElementById('tour-ask')?.open && document.activeElement?.id === 'tour-ask-q', null, { polling: 30 });
    expect((await tour(page)).dialog).toBe('ask');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('tour-ask').open && document.activeElement?.dataset?.option === 'ask', null, { polling: 30 });
    expect((await tour(page)).node).toBe('close');
    // Replay: back to the start with nothing remembered.
    await openTour(page, { hash: '#/tour/close' });
    await atNode(page, 'close');
    await pick(page, 'replay');
    await atNode(page, FX.start);
    const t = await tour(page);
    expect(t.answers).toEqual({});
    expect(t.visited).toEqual([FX.chapters.find((x) => x.entry === FX.start).id]);
    expect(await page.evaluate(() => location.hash)).toBe(`#/tour/${FX.start}`);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tour-next');
    annotate(testInfo, { mail: decodeURIComponent(mail).slice(0, 300), said });
  });
});

test.describe('T-06 one press, one choice', () => {
  test('T-06 the second click of a double-click and an auto-repeated digit or Enter commit nothing: the node that follows shows its choice where the last one was', async ({ page }, testInfo) => {
    // wt-proof's "onward" leads to lens, whose one line brings its choice straight away.
    const lens = FX.nodes.lens.choice.options.map((o) => o.id);
    await openTour(page, { hash: '#/tour/wt-proof' });
    await atNode(page, 'wt-proof');
    await toLast(page);
    const box = await page.locator('#tour-options .tour-opt[data-option="onward"]').boundingBox();
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await atNode(page, 'lens');
    await page.waitForTimeout(400);
    let t = await tour(page);
    expect([t.node, t.phase], 'the double-click chose once').toEqual(['lens', 'choice']);
    expect(t.options.map((o) => o.id)).toEqual(expect.arrayContaining([lens[0]]));
    // A second click (detail 2) straight on an option picks nothing.
    await page.evaluate(() => document.querySelector('#tour-options .tour-opt').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 2 })));
    await page.waitForTimeout(200);
    expect((await tour(page)).node).toBe('lens');
    // A held digit: the first keydown picks, the repeats land on the next choice and commit nothing.
    await openTour(page, { hash: '#/tour/wt-proof' });
    await atNode(page, 'wt-proof');
    await toLast(page);
    await page.keyboard.down('1');
    await atNode(page, 'lens');
    await page.keyboard.down('1');
    await page.keyboard.down('1');
    await page.keyboard.up('1');
    await page.waitForTimeout(300);
    expect((await tour(page)).node, 'the repeats chose nothing').toBe('lens');
    // A held Enter on Choose: focus goes to the first option, and the repeats do not pick it.
    await page.focus('#tour-next');
    await page.keyboard.down('Enter');
    await page.waitForFunction((id) => document.activeElement?.dataset?.option === id, lens[0], { polling: 30 });
    await page.keyboard.down('Enter');
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    await page.waitForTimeout(300);
    t = await tour(page);
    expect([t.node, await page.evaluate(() => document.activeElement?.dataset?.option)]).toEqual(['lens', lens[0]]);
    annotate(testInfo, { options: t.options.map((o) => o.id) });
  });
});

test.describe('T-11 keys, pauses and ending', () => {
  test('T-11 keys act only while focus is in the card: no global arrows, digits or Space; a hidden tab moves nothing', async ({ page }) => {
    await openTour(page);
    await doorsShown(page);
    await startTour(page);
    await page.evaluate(() => document.activeElement.blur());
    for (const k of ['ArrowRight', 'Space', '1', 'ArrowLeft']) await page.keyboard.press(k);
    await page.waitForTimeout(300);
    let t = await tour(page);
    expect([t.node, t.line]).toEqual([FX.start, 0]);
    await page.focus('#tour-next');
    await page.keyboard.press('ArrowRight');
    await atNode(page, FX.start, 1);
    // A hidden tab: the tour notes it, moves nothing and keeps focus; the next visitor step clears it.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(1200);
    t = await tour(page);
    expect(t.pausedBy).toEqual(['hidden']);
    expect(t.line).toBe(1);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tour-next');
    await page.evaluate(() => { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
    await page.keyboard.press('ArrowLeft');
    await atNode(page, FX.start, 0);
    await page.keyboard.press('ArrowRight');
    t = await tour(page);
    expect(t.pausedBy).toEqual([]);
  });

  const ENDINGS = ['Escape', 'End tour', 'the end action', 'a terminal node', 'browser Back'];
  for (const how of ENDINGS) {
    test(`T-11 ${how} ends the tour on the lobby with focus on the walk button`, async ({ page }, testInfo) => {
      await openTour(page);
      await doorsShown(page);
      const len0 = await page.evaluate(() => history.length);
      await startTour(page);
      if (how === 'Escape') await page.keyboard.press('Escape');
      else if (how === 'End tour') await page.click('#tour-end');
      else if (how === 'browser Back') await page.goBack();
      else {
        await pick(page, 'win-trust');
        await atNode(page, 'wt');
        await cont(page);
        await pick(page, 'onward');
        await atNode(page, 'lens');
        if (how === 'the end action') await pick(page, 'end');
        else {
          await pick(page, 'bye');
          await atNode(page, 'bye');
          const t = await toLast(page);
          expect(t.phase).toBe('end');
          expect((await card(page)).next).toBe(S.tourEnd);
          await page.keyboard.press('ArrowRight');
        }
      }
      await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('tour').hidden, null, { polling: 50 });
      await page.waitForFunction(() => document.activeElement?.id === 'walk-btn', null, { polling: 50 });
      await settled(page);
      const st = await page.evaluate((sels) => ({ len: history.length, title: document.title, touring: document.body.classList.contains('touring'), layerOpen: document.body.classList.contains('layer-open'), inert: sels.map((s) => document.querySelector(s)?.hasAttribute('inert')), z: window.__lobby.stage.z, tour: window.__tour.touring, current: document.querySelectorAll('#doors [aria-current]').length }), INERT);
      annotate(testInfo, st);
      expect(st.title).toBe(m.site.title);
      expect(st.touring || st.tour || st.layerOpen).toBe(false);
      expect(st.inert).toEqual(INERT.map(() => false));
      expect(st.z).toBe(1);
      expect(st.current).toBe(0);
      expect([len0, len0 + 1], 'Back popped the tour entry (forward history may remain)').toContain(st.len);
    });
  }

  for (const how of ['End tour', 'Escape', 'browser Back']) {
    test(`T-11 after the layout changes mid-tour (1024x768 to 768x1024), ${how} returns focus to the walk button on screen`, async ({ page }) => {
      await openTour(page, { viewport: vp(1024, 768) });
      await doorsShown(page);
      await startTour(page);
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForFunction(() => document.body.classList.contains('composed'), null, { polling: 50 });
      await page.waitForTimeout(400);
      if (how === 'End tour') await page.click('#tour-end');
      else if (how === 'Escape') { await page.focus('#tour-next'); await page.keyboard.press('Escape'); }
      else await page.goBack();
      await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('tour').hidden, null, { polling: 50 });
      await page.waitForFunction(() => document.activeElement === document.querySelector('#floor-foot button'), null, { polling: 50, timeout: 5000 });
    });
  }
});
