// T-18: axe (WCAG 2.1 AA) on the tour at 1280x720 and 390x844: 0 violations while the guide
// speaks at rest, while a choice waits, in a door, at a station, on the path, at the kiosk, at the
// close and its summary, with the Tour map open, with Ask open (its first view with every question
// shown, an answer, and the microphone's disclosure). The engine states run on the fixture; Ask
// runs on the real content/tour.json, and so do the real script's longest lines at 1280x720 (an
// opening line citing the room's statistic, a proof line, and the tower with its Where to start
// tile), with the voice off and on (the synthetic-voice disclosure shown): 0 violations, and every
// printed source, tile and the disclosure whole inside the card. Results go to
// tests/results/axe-tour-<state>-<w>x<h>[-<project>].json.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { open, settled, vp, record, annotate, readJson } from './helpers.mjs';
import { TQ, atNode, toLast, pick } from './tour-helpers.mjs';
import { buildVoice } from './voice-fixture.mjs';

const RQ = 'debug=1&tour=1';
const waitOpen = (page, id) => page.waitForFunction((id) => document.getElementById(id).open, id, { polling: 30 });
// A stand-in speech recogniser, so the microphone's disclosure can be shown on every engine.
const FAKE_SR = () => { class R { start() {} stop() {} abort() {} } for (const k of ['SpeechRecognition', 'webkitSpeechRecognition']) Object.defineProperty(window, k, { value: R, configurable: true, writable: true }); };

const STATES = [
  { id: 'speaking', hash: '#/tour/arrive', q: TQ, node: 'arrive' },
  { id: 'choice', hash: '#/tour/arrive', q: TQ, node: 'arrive', go: (page) => toLast(page) },
  { id: 'door', hash: '#/tour/wt', q: TQ, node: 'wt' },
  { id: 'station', hash: '#/tour/wt-proof', q: TQ, node: 'wt-proof' },
  { id: 'path', hash: '#/tour/path', q: TQ, node: 'path', go: (page) => toLast(page) },
  { id: 'kiosk', hash: '#/tour/kiosk', q: TQ, node: 'kiosk' },
  { id: 'close', hash: '#/tour/close', q: TQ, node: 'close', go: (page) => toLast(page) },
  { id: 'summary', hash: '#/tour/close', q: TQ, node: 'close', go: async (page) => { await pick(page, 'summary'); await page.waitForFunction(() => window.__tour.frame === 'summary', null, { polling: 30 }); } },
  { id: 'map', hash: '#/tour/wt', q: TQ, node: 'wt', go: async (page) => { await page.click('#tour-map-btn'); await waitOpen(page, 'tour-map'); } },
  { id: 'ask', hash: '#/tour/arrive', q: RQ, node: 'arrive', go: async (page) => { await page.click('#tour-ask-btn'); await waitOpen(page, 'tour-ask'); await page.click('.ask-all > summary'); } },
  { id: 'ask-answer', hash: '#/tour/path', q: RQ, node: 'path', go: async (page) => { await page.click('#tour-ask-btn'); await waitOpen(page, 'tour-ask'); await page.fill('#tour-ask-q', 'what proof do you have'); await page.keyboard.press('Enter'); await page.waitForFunction(() => !!document.getElementById('tour-ask-answering'), null, { polling: 30 }); } },
  { id: 'ask-mic', hash: '#/tour/arrive', q: RQ, node: 'arrive', init: FAKE_SR, go: async (page) => { await page.click('#tour-ask-btn'); await waitOpen(page, 'tour-ask'); await page.click('#tour-ask-mic'); await page.waitForFunction(() => !document.getElementById('tour-ask-mic-note').hidden, null, { polling: 30 }); } },
];

for (const [w, h] of [[1280, 720], [390, 844]]) {
  for (const st of STATES) {
    test(`T-18 axe WCAG 2.1 AA: tour ${st.id} at ${w}x${h}`, async ({ page }, testInfo) => {
      if (st.init) await page.addInitScript(st.init);
      await open(page, { viewport: vp(w, h), query: st.q, hash: st.hash });
      await atNode(page, st.node);
      await settled(page);
      await page.waitForTimeout(600);
      if (st.go) await st.go(page);
      await page.waitForTimeout(500);
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const suffix = testInfo.project.name === 'chromium' ? '' : `-${testInfo.project.name}`;
      record(`axe-tour-${st.id}-${w}x${h}${suffix}`, { url: page.url(), viewport: `${w}x${h}`, project: testInfo.project.name, violations: res.violations, incomplete: res.incomplete.map((i) => ({ id: i.id, nodes: i.nodes.length })), passes: res.passes.length });
      const summary = res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(' '), summary: n.failureSummary?.split('\n')[1]?.trim() })) }));
      annotate(testInfo, { violations: summary, passes: res.passes.length, incomplete: res.incomplete.map((i) => i.id) });
      expect(summary, `axe violations in tour ${st.id} at ${w}x${h}: ${JSON.stringify(summary)}`).toEqual([]);
    });
  }
}

// The real script's longest lines at a common laptop size: nothing a visitor must read is cut off
// below the card's text (the card grows to fit up to its cap), and axe finds nothing, with the
// voice off and on.
const REAL = readJson('content/tour.json');
const CUT = () => {
  const b = document.getElementById('tour-body'), c = document.getElementById('tour');
  const br = b.getBoundingClientRect(), cr = c.getBoundingClientRect();
  const out = [];
  for (const e of b.querySelectorAll('#tour-caption, #tour-src:not([hidden]), .tour-callout')) { const x = e.getBoundingClientRect(); if (x.bottom > br.bottom + 1) out.push(`${e.id || e.className} ends at ${Math.round(x.bottom)}, the body at ${Math.round(br.bottom)}`); }
  const n = document.getElementById('tour-voice-note');
  if (n && !n.hidden) { const x = n.getBoundingClientRect(); if (x.height < 1 || x.bottom > cr.bottom + 1 || b.contains(n)) out.push(`the disclosure at ${Math.round(x.top)}-${Math.round(x.bottom)}, the card to ${Math.round(cr.bottom)}`); }
  return { out, over: b.scrollHeight > b.clientHeight + 1, region: b.getAttribute('tabindex') === '0' && b.getAttribute('role') === 'region', note: !!n && !n.hidden };
};
for (const voice of [false, true]) {
  for (const node of ['gc', 'sr-proof', 'path']) {
    test(`T-18 axe WCAG 2.1 AA and nothing cut off: the real script at ${node}, 1280x720, voice ${voice ? 'on' : 'off'}`, async ({ page }, testInfo) => {
      let q = 'debug=1&tour=1';
      if (voice) { const v = await buildVoice(`axe-real-${node}-${testInfo.project.name}-${testInfo.workerIndex}`, { tour: REAL }); q += `&voice=sim&rate=0.05&voice-base=${v.base}`; }
      await open(page, { viewport: vp(1280, 720), query: q, hash: `#/tour/${node}` });
      await atNode(page, node);
      await settled(page);
      // A deep link opens with the voice locked: the Voice toggle turns it on (and shows the disclosure).
      if (voice) { await page.click('#tour-voice'); await page.waitForFunction(() => !document.getElementById('tour-voice-note').hidden && window.__tour.voiceState.on, null, { polling: 30 }); }
      await page.waitForTimeout(500);
      const lines = [];
      for (let i = 0; i < 6; i++) {
        const t = await page.evaluate(() => window.__tour);
        const cut = await page.evaluate(CUT);
        lines.push({ line: t.lineId, ...cut });
        expect(cut.out, `${t.lineId}: cut off`).toEqual([]);
        if (cut.over) expect(cut.region, `${t.lineId}: a body that scrolls is a focusable region`).toBe(true);
        if (voice) expect(cut.note, `${t.lineId}: the disclosure shows while the voice is on`).toBe(true);
        if (i === 0) {
          const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
          const suffix = testInfo.project.name === 'chromium' ? '' : `-${testInfo.project.name}`;
          record(`axe-tour-real-${node}${voice ? '-voice' : ''}-1280x720${suffix}`, { url: page.url(), project: testInfo.project.name, violations: res.violations, passes: res.passes.length });
          const summary = res.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }));
          expect(summary, `axe violations at ${node}: ${JSON.stringify(summary)}`).toEqual([]);
        }
        if (t.phase !== 'lines') break;
        await page.focus('#tour-next');
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction((li) => window.__tour.line !== li, t.line, { polling: 30 });
        await page.waitForTimeout(300);
      }
      annotate(testInfo, lines);
    });
  }
}
