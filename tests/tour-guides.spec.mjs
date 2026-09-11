// T-25 two guides (O12) and T-26 Ask's console, on tests/fixtures/tour-guides.json with ?tour=1.
//   T-25 a pinned line names its guide in the card and tints the sphere; a line nobody pinned is the
//        lead's; picking the lead turns the accent, the card's name and the header's Ask to that
//        guide; with the voice off the live region names a guide when the speaker changes; a
//        reload keeps the lead and Replay starts over with the manifest's lead.
//   T-26 Ask lives in the header's top right: a native modal console with two tabs (the ARIA tabs
//        pattern), suggestions per step answered by id, a conversation that keeps earlier answers,
//        a minimise pill that holds the tour, nothing cut off between 901 and 1440 px, the whole
//        screen on phones, no unfilled token anywhere, and it opens outside the tour too.
// Every expected string comes from the manifest and the fixture through js/tourtext.js.
import { test, expect } from '@playwright/test';
import { open, manifest as m, S, fill, vp, annotate, readJson } from './helpers.mjs';
import { fillTemplate } from '../js/tourtext.js';

const FIX = 'tests/fixtures/tour-guides.json';
const FX = readJson(FIX);
const Q = `debug=1&tour=1&tour-manifest=${FIX}`;
const G = m.guide.guides, LEAD = m.guide.lead;
const OTHER = Object.keys(G).find((k) => k !== LEAD);
const name = (id) => G[id].name;
const f = (tpl, guide = LEAD) => fillTemplate(tpl, m, { guide, tour: FX, answers: {}, visited: [] });
const tour = (page) => page.evaluate(() => window.__tour);
const atLine = (page, node, line = 0) => page.waitForFunction(([n, l]) => window.__tour?.node === n && window.__tour.line === l && window.__tour.frame === 'node', [node, line], { polling: 30, timeout: 15000 });
const HEAD = () => {
  const card = document.getElementById('tour');
  const orb = document.getElementById('tour-guide');
  return {
    name: card.querySelector('.tour-name')?.textContent, guide: card.dataset.guide, label: card.getAttribute('aria-label'),
    lead: document.body.dataset.lead ?? null, ask: document.querySelector('#tour-ask-btn .hud-ask-label')?.textContent,
    caption: document.querySelector('#tour-caption .sr')?.textContent, live: document.getElementById('tour-live').textContent,
    accent: getComputedStyle(document.body).getPropertyValue('--guide').trim(), orb: orb.dataset.guide, tint: getComputedStyle(orb).getPropertyValue('--orb-a').trim(),
  };
};
const head = (page) => page.evaluate(HEAD);
const TINT = { avi: '31 182 255', huey: '46 229 157' };

test.describe('T-25 two guides', () => {
  test('T-25 pinned lines speak as their guide, the rest as the lead; the pick turns the page to the lead; a reload keeps it; Replay starts over with the manifest\'s lead', async ({ page }, testInfo) => {
    const log = [];
    await open(page, { query: Q, hash: '#/tour/meet' });
    await atLine(page, 'meet', 0);
    let h = await head(page);
    log.push({ at: 'meet/0', ...h });
    expect([h.name, h.guide, h.orb, h.lead, h.caption]).toEqual([name('avi'), 'avi', 'avi', LEAD, name('avi')]);
    expect(h.tint).toBe(TINT.avi);
    expect(h.label).toBe(`${name(LEAD)}, ${m.guide.title}`);
    expect(h.ask).toBe(fill(S.tourAsk, { guide: name(LEAD) }));
    await page.waitForFunction(() => document.getElementById('tour-live').textContent.length > 0, null, { polling: 30 });
    expect((await head(page)).live, 'the live region names the first speaker').toContain(fill(S.tourSpeakerLive, { guide: name('avi') }));
    // Huey's pinned line: his name, his tint; the lead (and so the page's accent) stays.
    await page.keyboard.press('ArrowRight');
    await atLine(page, 'meet', 1);
    await page.waitForFunction(() => document.getElementById('tour-live').textContent.length > 0, null, { polling: 30 });
    h = await head(page);
    log.push({ at: 'meet/1', ...h });
    expect([h.name, h.guide, h.orb, h.lead, h.caption]).toEqual([name('huey'), 'huey', 'huey', LEAD, name('huey')]);
    expect(h.tint).toBe(TINT.huey);
    expect(h.live, 'a new speaker is named').toContain(fill(S.tourSpeakerLive, { guide: name('huey') }));
    expect((await tour(page)).speaker).toBe('huey');
    // A line nobody pinned: the lead says it, and {guide} is the lead.
    await page.keyboard.press('ArrowRight');
    await atLine(page, 'meet', 2);
    h = await head(page);
    expect([h.name, h.guide, h.caption]).toEqual([name(LEAD), LEAD, f('{guide} · {guide:title}', LEAD)]);
    // The pick: Huey leads from here on.
    await page.keyboard.press('ArrowRight');
    const t0 = await tour(page);
    expect(t0.options.map((o) => o.id)).toEqual(['huey', 'avi']);
    await page.keyboard.press('1');
    await atLine(page, 'wt', 0);
    h = await head(page);
    log.push({ at: 'wt/0', ...h });
    expect([h.lead, h.name, h.guide, h.caption]).toEqual([OTHER, name(OTHER), OTHER, f('{door:win-trust.title} · {guide}', OTHER)]);
    expect(h.label).toBe(`${name(OTHER)}, ${m.guide.title}`);
    expect(h.ask).toBe(fill(S.tourAsk, { guide: name(OTHER) }));
    expect(h.accent.toLowerCase(), 'the accent turns teal while Huey leads').toBe('#2ee59d');
    let t = await tour(page);
    expect([t.lead, t.speaker, t.answers.lead]).toEqual([OTHER, OTHER, OTHER]);
    // A reload restores the lead with the rest of the tour's state.
    await page.reload();
    await atLine(page, 'wt', 0);
    h = await head(page);
    expect([h.lead, h.name, h.ask]).toEqual([OTHER, name(OTHER), fill(S.tourAsk, { guide: name(OTHER) })]);
    // Replay: nothing remembered, so the manifest's lead again.
    await page.click('#tour-map-btn');
    await page.waitForFunction(() => document.getElementById('tour-map').open, null, { polling: 30 });
    await page.click('#tour-map-replay');
    await atLine(page, 'meet', 0);
    h = await head(page);
    t = await tour(page);
    expect([h.lead, h.ask, t.lead, t.answers.lead ?? null]).toEqual([LEAD, fill(S.tourAsk, { guide: name(LEAD) }), LEAD, null]);
    annotate(testInfo, log);
  });
});

// ---- T-26 Ask's console ----
const CONSOLE = () => {
  const d = document.getElementById('tour-ask');
  const r = d.getBoundingClientRect();
  const tabs = [...d.querySelectorAll('[role="tab"]')].map((b) => ({ id: b.dataset.tab, selected: b.getAttribute('aria-selected'), tabindex: b.tabIndex, controls: b.getAttribute('aria-controls') }));
  const panels = [...d.querySelectorAll('[role="tabpanel"]')].map((p) => ({ id: p.id, hidden: p.hidden, labelledby: p.getAttribute('aria-labelledby') }));
  const last = d.querySelector('.ask-log > section:last-of-type');
  return {
    open: d.open, modal: (() => { try { return d.matches(':modal'); } catch { return null; } })(), name: document.getElementById(d.getAttribute('aria-labelledby'))?.textContent,
    rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }, vw: innerWidth, vh: innerHeight,
    overflowX: Math.max(d.scrollWidth - d.clientWidth, ...[...d.querySelectorAll('.ask-panel, .ask-form, .ask-head, .ask-tabs, .ask-foot')].map((e) => e.scrollWidth - e.clientWidth)),
    tabs, panels, entries: d.querySelectorAll('.ask-log > .ask-entry').length,
    answering: last?.querySelector('.ask-answering')?.textContent ?? null,
    suggested: [...d.querySelectorAll('#tour-ask-suggested + .ask-chips .ask-chip')].map((b) => b.dataset.q),
    rows: [...d.querySelectorAll('#tour-ask-explore .tour-map-row')].map((b) => b.dataset.chapter),
    text: d.textContent, active: document.activeElement?.id || document.activeElement?.dataset?.q || document.activeElement?.tagName,
    pill: (() => { const p = document.getElementById('ask-pill'); const b = p.getBoundingClientRect(); return { hidden: p.hidden, w: b.width, h: b.height, label: p.getAttribute('aria-label'), right: b.right, top: b.top }; })(),
  };
};
const cons = (page) => page.evaluate(CONSOLE);
const UNFILLED = /\{[a-z]+(?::[^{}\s]+)?\}/;
async function openConsole(page) {
  await page.click('#tour-ask-btn');
  await page.waitForFunction(() => document.getElementById('tour-ask').open && document.activeElement?.id === 'tour-ask-q', null, { polling: 30 });
  await page.evaluate(() => Promise.all(document.getElementById('tour-ask').getAnimations().map((x) => x.finished)));   // measured where it rests
}

test.describe('T-26 Ask console', () => {
  test('T-26 a modal console in the header\'s corner: tabs by keyboard, suggestions for the step answered by id, the conversation kept, Explore goes to a chapter', async ({ page }, testInfo) => {
    const requests = [];
    page.on('request', (r) => requests.push(r.url()));
    await open(page, { query: Q, hash: '#/tour/meet' });
    await atLine(page, 'meet', 0);
    const b = await page.evaluate(() => { const r = document.getElementById('tour-ask-btn').getBoundingClientRect(); return { right: r.right, top: r.top, h: r.height, vw: innerWidth }; });
    expect(b.vw - b.right, 'Ask sits in the top-right corner').toBeLessThan(40);
    expect(b.h).toBeGreaterThanOrEqual(44);
    await openConsole(page);
    let c = await cons(page);
    expect(c.modal === null ? true : c.modal, ':modal').toBe(true);
    expect(c.name).toBe(fill(S.tourAsk, { guide: name(LEAD) }));
    expect((await tour(page)).pausedBy).toContain('ask');
    expect(c.tabs).toEqual([
      { id: 'conv', selected: 'true', tabindex: 0, controls: 'tour-ask-panel-conv' },
      { id: 'explore', selected: 'false', tabindex: -1, controls: 'tour-ask-panel-explore' },
    ]);
    expect(c.panels.map((p) => [p.id, p.hidden, p.labelledby])).toEqual([['tour-ask-panel-conv', false, 'tour-ask-tab-conv'], ['tour-ask-panel-explore', true, 'tour-ask-tab-explore']]);
    // The step's own suggestions first, in its order; then the rest.
    expect(c.suggested.slice(0, 2)).toEqual(FX.nodes.meet.ask);
    // A chip answers its own question.
    await page.click('#tour-ask-suggested + .ask-chips .ask-chip[data-q="q-b"]');
    await page.waitForFunction(() => document.activeElement?.id === 'tour-ask-answering', null, { polling: 30 });
    c = await cons(page);
    expect(c.answering).toBe(fill(S.tourAskAnswering, { question: f(FX.ask.questions[1].q) }));
    expect(c.text).toContain(f(FX.ask.questions[1].lines[0].text, LEAD));
    expect(c.entries).toBe(1);
    await page.fill('#tour-ask-q', 'stay ready');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('#tour-ask .ask-log > .ask-entry').length === 2, null, { polling: 30 });
    c = await cons(page);
    expect(c.answering).toBe(fill(S.tourAskAnswering, { question: f(FX.ask.questions[2].q) }));
    expect(c.text, 'the first answer is still in the conversation').toContain(f(FX.ask.questions[1].lines[0].text, LEAD));
    expect(c.text).not.toMatch(UNFILLED);
    // Tabs: arrow keys move between them and show the panel; Explore lists the chapters.
    await page.focus('#tour-ask-tab-conv');
    await page.keyboard.press('ArrowRight');
    c = await cons(page);
    expect([c.active, c.tabs[1].selected, c.panels[1].hidden, c.panels[0].hidden]).toEqual(['tour-ask-tab-explore', 'true', false, true]);
    expect(c.rows).toEqual(FX.chapters.map((x) => x.id));
    await page.keyboard.press('Home');
    expect((await cons(page)).active).toBe('tour-ask-tab-conv');
    await page.keyboard.press('End');
    await page.click('#tour-ask-explore .tour-map-row[data-chapter="door-win-trust"]');
    await atLine(page, 'wt', 0);
    c = await cons(page);
    expect(c.open).toBe(false);
    expect((await tour(page)).pausedBy).not.toContain('ask');
    const foreign = requests.filter((u) => new URL(u).origin !== new URL(page.url()).origin);
    expect(foreign, 'nothing leaves the page').toEqual([]);
    annotate(testInfo, { requests: requests.length });
  });

  test('T-26 Minimise: the pill under the corner keeps the conversation and holds the tour; it opens again as it was; Close resumes the tour and returns focus to Ask', async ({ page }) => {
    await open(page, { query: Q, hash: '#/tour/meet' });
    await atLine(page, 'meet', 0);
    await openConsole(page);
    await page.click('#tour-ask-suggested + .ask-chips .ask-chip[data-q="q-a"]');
    await page.waitForFunction(() => document.activeElement?.id === 'tour-ask-answering', null, { polling: 30 });
    await page.click('#tour-ask-min');
    await page.waitForFunction(() => !document.getElementById('tour-ask').open && document.activeElement?.id === 'ask-pill', null, { polling: 30 });
    let c = await cons(page);
    expect(c.pill.hidden).toBe(false);
    expect(Math.min(c.pill.w, c.pill.h)).toBeGreaterThanOrEqual(44);
    expect(c.pill.label).toBe(fill(S.tourAskPill, { guide: name(LEAD) }));
    let t = await tour(page);
    expect(t.pausedBy, 'the tour stays held').toContain('user');
    expect(t.pausedBy).not.toContain('ask');
    await page.click('#ask-pill');
    await page.waitForFunction(() => document.getElementById('tour-ask').open, null, { polling: 30 });
    c = await cons(page);
    expect([c.pill.hidden, c.entries]).toEqual([true, 1]);
    await page.click('#tour-ask-x');
    await page.waitForFunction(() => !document.getElementById('tour-ask').open, null, { polling: 30 });
    await page.waitForFunction(() => document.activeElement?.id === 'tour-ask-btn', null, { polling: 30 });
    t = await tour(page);
    expect(t.pausedBy.filter((r) => ['user', 'ask'].includes(r))).toEqual([]);
    // The tour ends: the conversation goes with it.
    await page.focus('#tour-next');
    await page.click('#tour-end');
    await page.waitForFunction(() => !window.__tour.touring, null, { polling: 30 });
    expect(await page.evaluate(() => document.querySelectorAll('#tour-ask .ask-log > .ask-entry').length)).toBe(0);
  });

  for (const [w, h] of [[901, 700], [1024, 768], [1100, 800], [1200, 800], [1440, 900]]) {
    test(`T-26 at ${w}x${h} the console fits the viewport and nothing in it scrolls sideways`, async ({ page }) => {
      await open(page, { viewport: vp(w, h), query: Q, hash: '#/tour/meet' });
      await atLine(page, 'meet', 0);
      await openConsole(page);
      await page.click('#tour-ask-suggested + .ask-chips .ask-chip[data-q="q-b"]');
      await page.waitForFunction(() => document.activeElement?.id === 'tour-ask-answering', null, { polling: 30 });
      const c = await cons(page);
      expect(c.rect.left).toBeGreaterThanOrEqual(-0.5);
      expect(c.rect.right).toBeLessThanOrEqual(c.vw + 0.5);
      expect(c.rect.bottom).toBeLessThanOrEqual(c.vh + 0.5);
      expect(c.rect.top).toBeGreaterThanOrEqual(-0.5);
      expect(c.overflowX, 'no sideways scroll inside').toBeLessThanOrEqual(1);
      const pageX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(pageX).toBeLessThanOrEqual(0);
    });
  }

  for (const [w, h] of [[390, 844], [320, 640], [844, 390]]) {
    test(`T-26 at ${w}x${h} the console takes the whole screen`, async ({ page }) => {
      await open(page, { viewport: vp(w, h), query: Q, hash: '#/tour/meet' });
      await atLine(page, 'meet', 0);
      await openConsole(page);
      const c = await cons(page);
      expect([Math.round(c.rect.left), Math.round(c.rect.top), Math.round(c.rect.width), Math.round(c.rect.height)]).toEqual([0, 0, c.vw, c.vh]);
      expect(c.overflowX).toBeLessThanOrEqual(1);
    });
  }

  test('T-26 outside the tour: the header\'s Ask opens the console, and an Explore row starts the tour at that chapter', async ({ page }) => {
    await open(page, { query: Q });
    await page.waitForFunction(() => getComputedStyle(document.getElementById('tour-ask-btn')).display !== 'none', null, { polling: 30 });
    expect(await page.evaluate(() => window.__tour.touring)).toBe(false);
    await openConsole(page);
    const c = await cons(page);
    expect(c.name).toBe(fill(S.tourAsk, { guide: name(LEAD) }));
    await page.click('#tour-ask-tab-explore');
    await page.click('#tour-ask-explore .tour-map-row[data-chapter="door-win-trust"]');
    await atLine(page, 'wt', 0);
    expect((await tour(page)).touring).toBe(true);
  });

  test('T-26 with the tour off the header shows no Ask, and nothing of the tour is fetched', async ({ page }) => {
    const requests = [];
    page.on('request', (r) => requests.push(new URL(r.url()).pathname));
    await open(page, { query: `debug=1&tour=0&tour-manifest=${FIX}` });
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('tour-ask-btn')).display)).toBe('none');
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-tour-on'))).toBe(false);
    expect(requests.filter((p) => /tour-guides\.json|tour\.css/.test(p))).toEqual([]);
  });
});
