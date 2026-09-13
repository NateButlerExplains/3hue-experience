// T-12 and T-13: the tour's dialogs and its close (O10, O2, no data collected).
//   T-12 Tour map and Ask AiVRIC are native modal dialogs named by their headings; Escape closes
//        only the dialog and focus returns to the button (or option) that opened it; Tab stays in
//        the dialog; opening pauses the tour (map, ask, mic) and closing lifts it. The map lists
//        every chapter by its lobby landmark with Now and Visited; a row jumps (history holds, focus
//        on Next); Replay forgets everything. Ask has one unnamed text field in a form that submits
//        nowhere; it shows "Answering: {q}" with the approved lines and their sources; the mail draft
//        has no recipient and none of the visitor's words; Talk meets O2; related questions; a near
//        miss offers a choice and no match says so. The microphone appears only with speech
//        recognition and shows the manifest's disclosure before anything listens.
//   T-13 the close: Talk is a new-tab link to the booking page; the summary is a mail draft with no
//        recipient, at most 1800 characters, lines broken with CRLF (RFC 6068), naming the chapters
//        visited, plus Copy; Replay clears the answers; each room the visitor entered is listed with
//        the answer they gave in that room. Nothing leaves the page: only same-origin GET requests,
//        no cookies, nothing in localStorage, and sessionStorage holds only the tour's key.
// The engine flows run on tests/fixtures/tour-min.json; Ask runs on the real content/tour.json.
import { test, expect } from '@playwright/test';
import { open, doorsShown, settled, pressTab, manifest as m, S, fill, vp, annotate } from './helpers.mjs';
import { FX, TQ, tour, card, openTour, startTour, atNode, toLast, pick, cont, chapterTitle, fillFx } from './tour-helpers.mjs';
import { fillTemplate, resolveLine, matches as matchesWhen } from '../js/tourtext.js';
import { buildIndex, match } from '../js/ask-match.js';
import { readJson } from './helpers.mjs';

const REAL = readJson('content/tour.json');
const RQ = 'debug=1&tour=1';
const KEY = '3hue-experience:tour';
const ctx0 = (T) => ({ tour: T, answers: {}, chosen: {}, visited: [], door: null });
// An approved question as Ask shows it.
const Q = (id, T = REAL) => {
  const x = T.ask.questions.find((q) => q.id === id);
  const lines = x.lines.map((l) => { const r = resolveLine(l, m, ctx0(T)); if (r && !r.source && x.source) r.source = x.source; return r; }).filter((r) => r?.text);
  return { id, label: fillTemplate(x.q, m, ctx0(T)), goto: x.goto || null, lines };
};
const newTab = () => fill(S.newTab, { host: new URL(m.site.bookingUrl).host });
// What the matcher makes of a text (tests/ask-match.spec.mjs checks its judgement; here, that the
// dialog shows exactly what it found).
const IX = buildIndex(REAL.ask.questions.map((x) => { const q = Q(x.id); return { id: x.id, q: q.label, keys: x.keys, text: q.lines.map((l) => l.text).join(' ') }; }), { names: Object.values(m.guide.guides).map((x) => x.name) });
const M = (text) => match(IX, text);

const DIALOG = (id) => {
  const d = document.getElementById(id);
  const a = document.activeElement;
  return {
    open: d.open, modal: (() => { try { return d.matches(':modal'); } catch { return null; } })(),
    name: document.getElementById(d.getAttribute('aria-labelledby'))?.textContent ?? null,
    active: a?.id || a?.dataset?.chapter || a?.dataset?.q || a?.dataset?.option || a?.tagName, inside: !!a && d.contains(a),
    touring: window.__tour.touring, dialog: window.__tour.dialog, pausedBy: window.__tour.pausedBy, hash: location.hash, len: history.length,
  };
};
const dialog = (page, id) => page.evaluate(DIALOG, id);
const MAP_ROWS = () => [...document.querySelectorAll('#tour-map-list .tour-map-row')].map((b) => ({
  id: b.dataset.chapter, where: b.querySelector('.tour-map-where')?.textContent ?? null, title: b.querySelector('.tour-map-title')?.textContent,
  tags: [...b.querySelectorAll('.tour-tag')].map((t) => t.textContent), h: b.getBoundingClientRect().height,
}));
const ASK = () => {
  const d = document.getElementById('tour-ask');
  const txt = (s) => d.querySelector(s)?.textContent ?? null;
  const a = (s) => { const e = d.querySelector(s); return e && { href: e.getAttribute('href'), target: e.getAttribute('target'), rel: e.getAttribute('rel'), aria: e.getAttribute('aria-label'), text: e.textContent }; };
  // The conversation keeps earlier answers; the newest entry is the one on screen.
  const last = d.querySelector('.ask-log > section:last-of-type') || d;
  return {
    intro: txt('#tour-ask-intro'), answering: txt('#tour-ask-answering'), you: last.querySelector('.ask-you-t')?.textContent ?? null,
    lines: [...last.querySelectorAll('.ask-line')].map((p) => p.textContent), sources: [...last.querySelectorAll('.ask-src')].map((p) => p.textContent),
    suggested: [...d.querySelectorAll('#tour-ask-suggested + .ask-chips .ask-chip')].map((b) => b.dataset.q),
    related: [...d.querySelectorAll('#tour-ask-related + .ask-chips .ask-chip')].map((b) => b.dataset.q),
    choose: [...d.querySelectorAll('#tour-ask-choose + .ask-chips .ask-chip')].map((b) => b.dataset.q),
    all: txt('.ask-all > summary'), none: txt('#tour-ask-none'), goto: txt('#tour-ask-goto'),
    mail: a('#tour-ask-mail'), talk: a('.ask-foot-talk'), live: txt('#tour-ask-live'), status: txt('#tour-ask-status'),
    input: document.getElementById('tour-ask-q')?.value ?? null,
    mic: (() => { const b = document.getElementById('tour-ask-mic'); return b ? { hidden: b.hidden || getComputedStyle(b).display === 'none', pressed: b.getAttribute('aria-pressed'), name: b.textContent } : null; })(),
    note: (() => { const n = document.getElementById('tour-ask-mic-note'); return n && !n.hidden ? n.querySelector('.ask-mic-text')?.textContent : null; })(),
  };
};
const ask = (page) => page.evaluate(ASK);
const mailParts = (href) => { const q = new URLSearchParams(href.slice('mailto:?'.length)); return { subject: q.get('subject'), body: q.get('body') }; };

// Tab 16 times inside an open dialog: focus never leaves it (the page behind is inert).
async function tabsStayIn(page, id) {
  const seen = [];
  for (let i = 0; i < 16; i++) {
    await pressTab(page, i % 5 === 4);
    const s = await page.evaluate((id) => { const a = document.activeElement; return { key: a?.id || a?.dataset?.chapter || a?.dataset?.q || a?.tagName, inside: !!a && document.getElementById(id).contains(a), body: !a || a === document.body }; }, id);
    seen.push(s.key);
    expect(s.inside || s.body, `Tab ${i + 1} left the dialog for ${s.key}: ${seen.join(' → ')}`).toBe(true);
  }
  return seen;
}

test.describe('T-12 Tour map', () => {
  test('T-12 the map: a modal dialog named by its heading, every chapter by its lobby landmark with Now and Visited; Escape closes only the map and focus returns to Tour map; Tab stays inside; the tour pauses while it is open', async ({ page }, testInfo) => {
    await openTour(page);
    await doorsShown(page);
    await startTour(page);
    await pick(page, 'win-trust');
    await atNode(page, 'wt');
    const len0 = await page.evaluate(() => history.length);
    await page.focus('#tour-map-btn');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('tour-map').open, null, { polling: 30 });
    await page.waitForFunction(() => document.activeElement?.dataset?.chapter === 'door-win-trust', null, { polling: 30 });
    let d = await dialog(page, 'tour-map');
    expect(d.modal === null ? true : d.modal, ':modal').toBe(true);
    expect(d.name).toBe(S.tourMap);
    expect(d.dialog).toBe('map');
    expect(d.pausedBy).toContain('map');
    const rows = await page.evaluate(MAP_ROWS);
    const want = FX.chapters.map((c) => {
      const l = c.landmark || '';
      const where = l === 'lobby' ? S.tourMapLobby : l === 'tower' ? S.tourMapTower : l === 'kiosk' ? S.tourMapKiosk : l.startsWith('door:') ? fill(S.tourMapDoor, { number: m.doors.find((x) => x.id === l.slice(5)).number }) : null;
      const tags = c.id === 'door-win-trust' ? [S.tourMapNow] : c.id === 'arrival' ? [S.tourVisited] : [];
      return { id: c.id, where, title: chapterTitle(c.id), tags };
    });
    expect(rows.map(({ h, ...r }) => r)).toEqual(want);
    for (const r of rows) expect(r.h, `${r.id} row height`).toBeGreaterThanOrEqual(44);
    const seen = await tabsStayIn(page, 'tour-map');
    // Escape closes only the map: the tour goes on at the same node, focus back on Tour map.
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('tour-map').open && document.activeElement?.id === 'tour-map-btn', null, { polling: 30 });
    d = await dialog(page, 'tour-map');
    expect([d.touring, d.dialog, d.hash, d.len]).toEqual([true, null, '#/tour/wt', len0]);
    expect(d.pausedBy).not.toContain('map');
    // A second Escape is the tour's own: it ends on the lobby.
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => location.hash === '#/experience' && document.activeElement?.id === 'walk-btn', null, { polling: 30 });
    annotate(testInfo, { rows: rows.map((r) => `${r.where ?? ''} · ${r.title} ${r.tags.join(' ')}`), tabs: seen });
  });

  test('T-12 the map: a row jumps to its chapter (history holds, focus on Next); Replay from the start forgets every answer; Back with the map open ends the tour and closes the map', async ({ page }) => {
    await openTour(page);
    await doorsShown(page);
    await startTour(page);
    await pick(page, 'gain-control');
    await atNode(page, 'gc');
    const len0 = await page.evaluate(() => history.length);
    await page.click('#tour-map-btn');
    await page.waitForFunction(() => document.getElementById('tour-map').open, null, { polling: 30 });
    await page.click('#tour-map-list .tour-map-row[data-chapter="path"]');
    await atNode(page, 'path');
    await page.waitForFunction(() => document.activeElement?.id === 'tour-next', null, { polling: 30 });
    let d = await dialog(page, 'tour-map');
    expect([d.open, d.hash, d.len, d.dialog]).toEqual([false, '#/tour/path', len0, null]);
    expect(d.pausedBy).not.toContain('map');
    let t = await tour(page);
    expect(t.answers.segment).toBe('gain-control');
    expect(t.visited).toEqual(['arrival', 'door-gain-control', 'path']);
    // Replay: back to the start with nothing remembered.
    await page.click('#tour-map-btn');
    await page.waitForFunction(() => document.getElementById('tour-map').open, null, { polling: 30 });
    await page.click('#tour-map-replay');
    await atNode(page, FX.start);
    await page.waitForFunction(() => document.activeElement?.id === 'tour-next', null, { polling: 30 });
    t = await tour(page);
    expect(t.answers).toEqual({});
    expect(t.visited).toEqual(['arrival']);
    expect(await page.evaluate(() => history.length)).toBe(len0);
    // Back while the map is open: the tour ends, the dialog closes, the lobby has the walk button.
    await page.click('#tour-map-btn');
    await page.waitForFunction(() => document.getElementById('tour-map').open, null, { polling: 30 });
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#/experience' && !document.getElementById('tour-map').open && document.getElementById('tour').hidden, null, { polling: 30 });
    await page.waitForFunction(() => document.activeElement?.id === 'walk-btn', null, { polling: 50 });
    d = await dialog(page, 'tour-map');
    expect([d.open, d.touring]).toEqual([false, false]);
  });
});

test.describe('T-12 Ask', () => {
  test('T-12 Ask: a modal dialog with one unnamed text field in a form that submits nowhere; suggestions from the script; a typed question shows Answering: {q}, the approved lines with their sources, a mail draft with no recipient and none of the visitor\'s words, Talk (O2) and related questions', async ({ page }, testInfo) => {
    await open(page, { query: RQ, hash: '#/tour/arrive' });
    await atNode(page, 'arrive');
    await page.click('#tour-ask-btn');
    await page.waitForFunction(() => document.getElementById('tour-ask').open && document.activeElement?.id === 'tour-ask-q', null, { polling: 30 });
    let d = await dialog(page, 'tour-ask');
    expect(d.modal === null ? true : d.modal, ':modal').toBe(true);
    expect(d.name).toBe(fill(S.tourAsk, { guide: m.guide.guides[m.guide.lead].name }));
    expect(d.dialog).toBe('ask');
    expect(d.pausedBy).toContain('ask');
    // The one field: text, no name, no autocomplete, in a form with no action; nothing else to fill.
    const fields = await page.evaluate(() => {
      const dl = document.getElementById('tour-ask');
      return {
        inDialog: [...dl.querySelectorAll('input, textarea, select, [contenteditable]')].map((e) => ({ tag: e.tagName, type: e.getAttribute('type'), name: e.getAttribute('name'), autocomplete: e.getAttribute('autocomplete'), label: e.labels?.[0]?.textContent })),
        forms: [...document.querySelectorAll('form')].map((f) => ({ action: f.getAttribute('action'), method: f.getAttribute('method') })),
        personal: document.querySelectorAll('input[type="email"], input[type="tel"], input[type="password"], input[name], input[autocomplete]:not([autocomplete="off"]), textarea').length,
      };
    });
    expect(fields.inDialog).toEqual([{ tag: 'INPUT', type: 'text', name: null, autocomplete: 'off', label: S.tourAskLabel }]);
    expect(fields.forms).toEqual([{ action: null, method: null }]);
    expect(fields.personal).toBe(0);
    let a = await ask(page);
    const intro = resolveLine(REAL.ask.intro, m, ctx0(REAL)).text;
    expect(a.intro).toBe(intro);
    // The step's own suggestions (O12): the node's `ask` list, in its order.
    expect(a.suggested).toEqual(REAL.nodes[REAL.start].ask);
    expect(a.all).toBe(fill(S.tourAskAll, { count: REAL.ask.questions.length }));
    // A typed question: the approved answer, named, with its sources.
    const typed = 'how much does it cost';
    await page.fill('#tour-ask-q', typed);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.getElementById('tour-ask-answering'), null, { polling: 30 });
    expect(M(typed)).toMatchObject({ kind: 'answer', id: 'pricing' });
    const P = Q('pricing');
    a = await ask(page);
    expect(a.answering).toBe(fill(S.tourAskAnswering, { question: P.label }));
    expect(a.lines).toEqual(P.lines.map((l) => l.text));
    expect(a.sources).toEqual([...new Set(P.lines.map((l) => l.source))]);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tour-ask-q');
    await page.waitForFunction(() => document.getElementById('tour-ask-live').textContent.length > 0, null, { polling: 30 });
    expect((await ask(page)).live).toBe(`${fill(S.tourAskAnswering, { question: P.label })} ${P.lines.map((l) => l.text).join(' ')}`);
    // The mail draft: no recipient, the approved words only, at most 1800 characters.
    expect(a.mail.text).toBe(S.tourAskSend);
    expect(a.mail.href.startsWith('mailto:?subject=')).toBe(true);
    const mail = mailParts(a.mail.href);
    expect(mail.subject).toBe(fill(S.tourAskMailSubject, { question: P.label, site: m.site.name }));
    expect(mail.body.length).toBeLessThanOrEqual(1800);
    expect(mail.body.startsWith(P.label)).toBe(true);
    for (const l of P.lines) { expect(mail.body).toContain(l.text); expect(mail.body).toContain(`(${l.source})`); }
    expect(mail.body).toContain(m.site.bookingUrl);
    expect(mail.body.toLowerCase()).not.toContain(typed);
    // Talk: O2.
    expect(a.talk).toEqual({ href: m.site.bookingUrl, target: '_blank', rel: 'noopener noreferrer', aria: `${S.talk}, ${newTab()}`, text: S.talk });
    // Related questions: other approved questions; picking one answers it and focus goes to its name.
    expect(a.related.length).toBeGreaterThan(0);
    expect(a.related.length).toBeLessThanOrEqual(3);
    expect(a.related).not.toContain('pricing');
    const rel = Q(a.related[0]);
    await page.click(`#tour-ask-related + .ask-chips .ask-chip[data-q="${rel.id}"]`);
    await page.waitForFunction((t) => document.getElementById('tour-ask-answering')?.textContent === t && document.activeElement?.id === 'tour-ask-answering', fill(S.tourAskAnswering, { question: rel.label }), { polling: 30 });
    expect((await ask(page)).lines).toEqual(rel.lines.map((l) => l.text));
    // A question that points at a chapter: Take me there closes Ask and goes there, focus on Next.
    const len0 = await page.evaluate(() => history.length);
    await page.fill('#tour-ask-q', 'do you work with PE funds');
    await page.keyboard.press('Enter');
    expect(M('do you work with PE funds')).toMatchObject({ kind: 'answer', id: 'private-equity' });
    const PE = Q('private-equity');
    await page.waitForFunction((t) => document.getElementById('tour-ask-answering')?.textContent === t, fill(S.tourAskAnswering, { question: PE.label }), { polling: 30 });
    expect((await ask(page)).goto).toBe(S.tourTakeMeThere);
    await page.click('#tour-ask-goto');
    await atNode(page, PE.goto);
    await page.waitForFunction(() => document.activeElement?.id === 'tour-next', null, { polling: 30 });
    d = await dialog(page, 'tour-ask');
    expect([d.open, d.dialog, d.len, d.hash]).toEqual([false, null, len0, `#/tour/${PE.goto}`]);
    expect(d.pausedBy).not.toContain('ask');
    annotate(testInfo, { suggested: a.suggested, related: a.related, mail: mail.body.slice(0, 200) });
  });

  test('T-12 Ask: a near miss offers "Did you mean", no match says so with Talk and suggestions, empty input does nothing; Escape closes only Ask, Tab stays inside, and focus returns to the opener (the Ask button, or the close\'s ask option)', async ({ page }) => {
    await open(page, { query: RQ, hash: '#/tour/arrive' });
    await atNode(page, 'arrive');
    await page.click('#tour-ask-btn');
    await page.waitForFunction(() => document.activeElement?.id === 'tour-ask-q', null, { polling: 30 });
    await page.fill('#tour-ask-q', 'what about risk');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.getElementById('tour-ask-choose'), null, { polling: 30 });
    let a = await ask(page);
    const near = M('what about risk');
    expect(near.kind).toBe('choose');
    expect(a.choose).toEqual(near.ids);
    expect(await page.textContent('#tour-ask-choose')).toBe(S.tourAskChoose);
    await page.fill('#tour-ask-q', 'what is the weather in Paris');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.getElementById('tour-ask-none'), null, { polling: 30 });
    a = await ask(page);
    expect(M('what is the weather in Paris').kind).toBe('none');
    expect(a.none).toBe(S.tourAskNone);
    expect(a.talk).toEqual({ href: m.site.bookingUrl, target: '_blank', rel: 'noopener noreferrer', aria: `${S.talk}, ${newTab()}`, text: S.talk });
    expect(a.suggested).toHaveLength(4);
    await page.fill('#tour-ask-q', '   ');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect((await ask(page)).none, 'an empty question changes nothing').toBe(S.tourAskNone);
    await tabsStayIn(page, 'tour-ask');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('tour-ask').open && document.activeElement?.id === 'tour-ask-btn', null, { polling: 30 });
    let d = await dialog(page, 'tour-ask');
    expect([d.touring, d.dialog, d.hash]).toEqual([true, null, '#/tour/arrive']);
    expect(d.pausedBy).toEqual([]);
    // The close's ask option opens the same dialog; Escape returns focus to the option.
    await openTour(page, { hash: '#/tour/close' });
    await atNode(page, 'close');
    await pick(page, 'ask');
    await page.waitForFunction(() => document.getElementById('tour-ask').open && document.activeElement?.id === 'tour-ask-q', null, { polling: 30 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('tour-ask').open && document.activeElement?.dataset?.option === 'ask', null, { polling: 30 });
    d = await dialog(page, 'tour-ask');
    expect([d.touring, d.hash]).toEqual([true, '#/tour/close']);
  });

  test('T-12 the microphone: not offered without speech recognition', async ({ page }) => {
    await page.addInitScript(() => {
      for (const k of ['SpeechRecognition', 'webkitSpeechRecognition']) { try { Object.defineProperty(window, k, { value: undefined, configurable: true, writable: true }); } catch { /* not there */ } }
    });
    await open(page, { query: RQ, hash: '#/tour/arrive' });
    await atNode(page, 'arrive');
    await page.click('#tour-ask-btn');
    await page.waitForFunction(() => document.getElementById('tour-ask').open, null, { polling: 30 });
    expect((await ask(page)).mic.hidden).toBe(true);
  });

  test('T-12 the microphone: the manifest\'s disclosure shows before anything listens; Not now listens to nothing; Use the microphone listens, pauses the tour and matches the transcript; errors read from the manifest; nothing is stored', async ({ page }) => {
    await page.addInitScript(() => {
      window.__sr = { starts: 0, stops: 0, aborts: 0, all: [] };
      class FakeRecognition {
        constructor() { window.__sr.all.push(this); }
        start() { window.__sr.starts++; }
        stop() { window.__sr.stops++; setTimeout(() => this.onend?.(), 0); }
        abort() { window.__sr.aborts++; setTimeout(() => { this.onerror?.({ error: 'aborted' }); this.onend?.(); }, 0); }
      }
      for (const k of ['SpeechRecognition', 'webkitSpeechRecognition']) Object.defineProperty(window, k, { value: FakeRecognition, configurable: true, writable: true });
      window.__say = (text) => { const r = window.__sr.all.at(-1); const res = [{ transcript: text }]; res.isFinal = true; r.onresult?.({ results: [res] }); };
      window.__fail = (error) => { const r = window.__sr.all.at(-1); r.onerror?.({ error }); r.onend?.(); };
    });
    await open(page, { query: RQ, hash: '#/tour/arrive' });
    await atNode(page, 'arrive');
    await page.click('#tour-ask-btn');
    await page.waitForFunction(() => document.getElementById('tour-ask').open, null, { polling: 30 });
    let a = await ask(page);
    expect(a.mic).toEqual({ hidden: false, pressed: 'false', name: S.tourAskMic });
    await page.click('#tour-ask-mic');
    a = await ask(page);
    expect(a.note).toBe(S.tourMicDisclosure);
    expect(await page.evaluate(() => [window.__sr.starts, document.activeElement?.id])).toEqual([0, 'tour-ask-mic-ok']);
    await page.click('#tour-ask-mic-no');
    expect(await page.evaluate(() => [window.__sr.starts, document.activeElement?.id, document.getElementById('tour-ask-mic-note').hidden])).toEqual([0, 'tour-ask-mic', true]);
    // Not now is not an acknowledgement: the next press shows the disclosure again.
    await page.click('#tour-ask-mic');
    expect((await ask(page)).note).toBe(S.tourMicDisclosure);
    await page.click('#tour-ask-mic-ok');
    await page.waitForFunction(() => window.__sr.starts === 1, null, { polling: 30 });
    expect(await page.evaluate(() => document.activeElement?.id), 'focus goes back to the microphone button').toBe('tour-ask-mic');
    a = await ask(page);
    expect([a.note, a.mic.pressed, a.status]).toEqual([null, 'true', S.tourAskListening]);
    expect((await tour(page)).pausedBy).toEqual(expect.arrayContaining(['ask', 'mic']));
    await page.evaluate(() => window.__say('how much does it cost'));
    const P = Q('pricing');
    await page.waitForFunction((t) => document.getElementById('tour-ask-answering')?.textContent === t, fill(S.tourAskAnswering, { question: P.label }), { polling: 30 });
    await page.waitForFunction(() => document.getElementById('tour-ask-mic').getAttribute('aria-pressed') === 'false', null, { polling: 30 });
    a = await ask(page);
    expect(a.you, 'the transcript shows as the visitor\'s own words, and the field is ready for the next').toBe('how much does it cost');
    expect(a.input).toBe('');
    expect((await tour(page)).pausedBy).not.toContain('mic');
    // Acknowledged for this page: the next press listens straight away; a blocked microphone says so.
    await page.click('#tour-ask-mic');
    await page.waitForFunction(() => window.__sr.starts === 2, null, { polling: 30 });
    expect((await ask(page)).note).toBe(null);
    await page.evaluate(() => window.__fail('not-allowed'));
    await page.waitForFunction((t) => document.getElementById('tour-ask-status').textContent === t, S.tourMicBlocked, { polling: 30 });
    // Closing Ask while listening stops the recogniser.
    await page.click('#tour-ask-mic');
    await page.waitForFunction(() => window.__sr.starts === 3, null, { polling: 30 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('tour-ask').open && window.__sr.aborts === 1, null, { polling: 30 });
    expect((await tour(page)).pausedBy).toEqual([]);
    const stored = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    expect(stored.local).toEqual([]);
    expect(stored.session.filter((k) => k !== '3hue-experience:tour')).toEqual([]);
    // A fresh page asks again.
    await page.reload();
    await atNode(page, 'arrive');
    await page.click('#tour-ask-btn');
    await page.waitForFunction(() => document.getElementById('tour-ask').open, null, { polling: 30 });
    await page.click('#tour-ask-mic');
    expect((await ask(page)).note).toBe(S.tourMicDisclosure);
    expect(await page.evaluate(() => window.__sr.starts)).toBe(0);
  });
});

test.describe('T-13 the close', () => {
  test('T-13 through five chapters to the close: Talk is a new-tab link to the booking page; the summary is a mail draft with no recipient, at most 1800 characters, naming every chapter visited, plus Copy; Replay forgets everything', async ({ page, browserName }, testInfo) => {
    if (browserName === 'chromium') await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await openTour(page);
    await doorsShown(page);
    await startTour(page);
    await pick(page, 'win-trust');
    await atNode(page, 'wt');
    await cont(page);
    await atNode(page, 'wt-proof');
    await pick(page, 'onward');
    await atNode(page, 'lens');
    await pick(page, 'path');
    await atNode(page, 'path');
    await pick(page, 'assess');
    await atNode(page, 'stage-assess');
    await cont(page);
    await atNode(page, 'close');
    let t = await tour(page);
    const visited = ['arrival', 'door-win-trust', 'decision', 'path', 'close'];
    expect(t.visited).toEqual(visited);
    let c = await card(page);
    const talk = c.options.find((o) => o.id === 'talk');
    expect({ tag: talk.tag, href: talk.href, target: talk.target, rel: talk.rel, label: talk.label, aria: talk.aria }).toEqual({ tag: 'A', href: m.site.bookingUrl, target: '_blank', rel: 'noopener noreferrer', label: S.talk, aria: `${S.talk}, ${S.tourSuggested}, ${newTab()}` });
    expect(talk.tags).toEqual([S.tourSuggested]);
    await pick(page, 'summary');
    await page.waitForFunction(() => window.__tour.frame === 'summary', null, { polling: 30 });
    c = await card(page);
    const mail = c.options.find((o) => o.id === 'email');
    expect(mail.tag).toBe('A');
    expect(mail.href.startsWith('mailto:?subject=')).toBe(true);
    expect(mail.href, 'line breaks in a mailto body are CRLF').toContain('%0D%0A');
    expect(mail.href.replace(/%0D%0A/g, ''), 'no bare LF').not.toContain('%0A');
    const { subject, body } = mailParts(mail.href);
    expect(subject).toBe(fillFx(FX.summary.subject));
    expect(body.length).toBeLessThanOrEqual(1800);
    const titles = visited.map((id) => chapterTitle(id));
    expect(body).toContain(titles.join(', '));
    expect(body).toContain(m.site.bookingUrl);
    expect(c.options.map((o) => o.label)).toEqual([S.tourEmail, S.tourCopy, S.tourBack]);
    await page.focus('#tour-options .tour-opt[data-option="copy"]');
    await page.keyboard.press('Enter');
    await page.waitForFunction((w) => w.includes(document.getElementById('tour-live').textContent), [S.tourCopied, S.tourCopyFailed], { polling: 30 });
    if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(titles.join(', '));
    await page.keyboard.press('3');
    await page.waitForFunction(() => window.__tour.frame === 'node', null, { polling: 30 });
    await pick(page, 'replay');
    await atNode(page, FX.start);
    t = await tour(page);
    expect([t.answers, t.chosen, t.visited]).toEqual([{}, {}, ['arrival']]);
    const store = await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)), KEY);
    expect(store).toEqual({ node: FX.start, answers: {}, chosen: {}, visited: ['arrival'], door: null });
    annotate(testInfo, { subject, body: body.slice(0, 400), length: body.length });
  });

  test('T-13 the real close: Talk, Ask, the summary and Walk it again as the script words them; the summary draft fits and lists only the rooms this visitor entered', async ({ page }, testInfo) => {
    // A visitor who chose Regulated operators and saw only that room (restored from the tour's
    // session key, as a reload or deep link restores it): the summary's `when` lines hold back the
    // other two rooms and the questions never answered.
    const SR = m.doors.find((d) => d.id === 'stay-ready');
    const trigger = fillTemplate(REAL.nodes.sr.choice.options[0].label, m, ctx0(REAL));
    const seen = { node: 'close', answers: { lead: m.guide.lead, segment: 'stay-ready', door: 'stay-ready', 'trigger-stay-ready': REAL.nodes.sr.choice.options[0].id }, chosen: { segment: SR.icp, 'trigger-stay-ready': trigger }, visited: ['arrival', 'lobby', 'door-stay-ready'], door: 'stay-ready' };
    await page.addInitScript(([k, v]) => { try { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, v); } catch { /* storage blocked */ } }, [KEY, JSON.stringify(seen)]);
    await open(page, { query: RQ, hash: '#/tour/close' });
    await atNode(page, 'close');
    await toLast(page);
    const c = await card(page);
    const ctx = { ...ctx0(REAL), answers: seen.answers, chosen: seen.chosen, visited: [...seen.visited, 'close'], door: 'stay-ready' };
    expect(c.options.map((o) => o.id)).toEqual(REAL.nodes.close.choice.options.map((o) => o.id));
    expect(c.options.map((o) => o.label)).toEqual(REAL.nodes.close.choice.options.map((o) => (o.action === 'talk' && !o.label ? S.talk : fillTemplate(o.label, m, ctx))));
    const talk = c.options.find((o) => o.id === 'talk');
    expect([talk.tag, talk.href, talk.target, talk.rel]).toEqual(['A', m.site.bookingUrl, '_blank', 'noopener noreferrer']);
    await pick(page, 'summary');
    await page.waitForFunction(() => window.__tour.frame === 'summary', null, { polling: 30 });
    const s = await card(page);
    const { subject, body } = mailParts(s.options.find((o) => o.id === 'email').href);
    annotate(testInfo, { body: body.slice(0, 600), length: body.length });
    expect(subject).toBe(fillTemplate(REAL.summary.subject, m, ctx));
    expect(body.length).toBeLessThanOrEqual(1800);
    expect(body).toContain(m.site.bookingUrl);
    // Each room the visitor entered is named by its title and promise (the summary quotes no figure,
    // so nothing in the draft needs a printed source).
    const roomLine = (d) => `${d.title}: ${d.promise}`;
    for (const d of m.doors) {
      if (d.id === 'stay-ready') expect(body, 'the room entered is listed').toContain(roomLine(d));
      else expect(body, `${d.id} was never entered`).not.toContain(roomLine(d));
    }
    expect(body, 'the answer the visitor gave in that room').toContain(trigger);
    // Lines whose `when` names an answer never given (another room, another trigger) do not appear.
    // A held line whose words are all inside a line that is shown (the same label with its runtime
    // answer empty) proves nothing, so only the lines that carry something of their own are checked.
    const shown = REAL.summary.lines.filter((l) => matchesWhen(l.when, ctx)).map((l) => resolveLine(l, m, ctx)?.text).filter(Boolean);
    const held = REAL.summary.lines.filter((l) => l.when && !matchesWhen(l.when, ctx)).map((l) => resolveLine(l, m, ctx)?.text)
      .filter((t) => t && !shown.some((s) => s.includes(t)));
    expect(held.length).toBeGreaterThan(0);
    for (const t of held) expect(body).not.toContain(t);
  });

  test('T-13 the real summary lists each room the visitor entered with the answer they gave in that room, never another room\'s', async ({ page }, testInfo) => {
    // A visitor who saw two rooms and answered "What's pressing?" differently in each (restored from
    // the tour's session key): each answer sits after its own room, and the room never entered and
    // its triggers are absent.
    const D = (id) => m.doors.find((d) => d.id === id);
    const optLabel = (node, id) => fillTemplate(REAL.nodes[node].choice.options.find((o) => o.id === id).label, m, ctx0(REAL));
    const chosen = { segment: D('win-trust').icp, 'trigger-win-trust': optLabel('wt', 'deal'), 'trigger-gain-control': optLabel('gc', 'reporting') };
    const seen = { node: 'close', answers: { lead: m.guide.lead, segment: 'win-trust', door: 'gain-control', 'trigger-win-trust': 'deal', 'trigger-gain-control': 'reporting' }, chosen, visited: ['arrival', 'lobby', 'door-win-trust', 'door-gain-control', 'path'], door: 'gain-control' };
    await page.addInitScript(([k, v]) => { try { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, v); } catch { /* storage blocked */ } }, [KEY, JSON.stringify(seen)]);
    await open(page, { query: RQ, hash: '#/tour/close' });
    await atNode(page, 'close');
    await toLast(page);
    await pick(page, 'summary');
    await page.waitForFunction(() => window.__tour.frame === 'summary', null, { polling: 30 });
    const href = (await card(page)).options.find((o) => o.id === 'email').href;
    const { body } = mailParts(href);
    const ctx = { ...ctx0(REAL), answers: seen.answers, chosen, visited: [...seen.visited, 'close'], door: 'gain-control' };
    const line = (id) => fillTemplate(REAL.summary.lines.find((l) => l.id === id).text, m, ctx);
    const at = (t) => body.indexOf(t);
    annotate(testInfo, { body: body.slice(0, 900) });
    // Per room: the room, the answer given in it, and the start that answer leads to.
    const order = [line('sum-wt'), line('sum-wt-trigger'), line('sum-wt-deal'), line('sum-gc'), line('sum-gc-trigger'), line('sum-gc-reporting')];
    for (const t of order) expect(at(t), `in the summary: ${t}`).toBeGreaterThanOrEqual(0);
    expect(order.map(at), 'each answer follows its own room').toEqual([...order.map(at)].sort((a, b) => a - b));
    expect(line('sum-wt-trigger')).toContain(chosen['trigger-win-trust']);
    expect(line('sum-gc-trigger')).toContain(chosen['trigger-gain-control']);
    expect(body, 'the room never entered is not listed').not.toContain(`${D('stay-ready').title}: ${D('stay-ready').promise}`);
    expect(body.split(chosen['trigger-win-trust']).length - 1, 'each answer once').toBe(1);
    expect(body.split(chosen['trigger-gain-control']).length - 1).toBe(1);
  });

  test('T-13 nothing leaves the page: through the tour, the map, Ask (typed and picked) and the summary, every request is a same-origin GET; no cookies; localStorage stays empty; sessionStorage holds only the tour\'s key', async ({ page, context, baseURL }, testInfo) => {
    const origin = new URL(baseURL).origin;
    const requests = [];
    page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));
    await open(page, { query: RQ });
    await doorsShown(page);
    await page.click('#walk-btn');
    await atNode(page, REAL.start);
    await page.waitForFunction(() => document.activeElement?.id === 'tour-next', null, { polling: 30 });
    // The arrival picks who leads (O12); the hand-over carries on to the lobby's door choice.
    await pick(page, m.guide.lead);
    await cont(page);
    await atNode(page, 'lobby');
    await pick(page, 'stay-ready');
    await page.waitForFunction(() => window.__tour.node === 'sr', null, { polling: 30 });
    await settled(page);
    await page.click('#tour-map-btn');
    await page.waitForFunction(() => document.getElementById('tour-map').open, null, { polling: 30 });
    await page.click('#tour-map-list .tour-map-row[data-chapter="close"]');
    await atNode(page, 'close');
    await page.click('#tour-ask-btn');
    await page.waitForFunction(() => document.activeElement?.id === 'tour-ask-q', null, { polling: 30 });
    await page.fill('#tour-ask-q', 'what happens to my answers?');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.getElementById('tour-ask-answering'), null, { polling: 30 });
    await page.click('#tour-ask-related + .ask-chips .ask-chip');
    await page.waitForFunction(() => document.activeElement?.id === 'tour-ask-answering', null, { polling: 30 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('tour-ask').open, null, { polling: 30 });
    // Focus went back to Ask in the header (the browser hands it back as the dialog closes, and the
    // layer places it again on the next tick: both land before the card is used again).
    await page.waitForFunction(() => document.activeElement?.id === 'tour-ask-btn', null, { polling: 30 });
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tour-ask-btn');
    // The card's keys work from inside the card.
    await page.focus('#tour-next');
    await page.waitForFunction(() => document.activeElement?.id === 'tour-next', null, { polling: 30 });
    await pick(page, 'summary');
    await page.waitForFunction(() => window.__tour.frame === 'summary', null, { polling: 30 });
    await page.waitForTimeout(300);
    const cookies = await context.cookies();
    const stored = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    const off = requests.filter((r) => new URL(r.url).origin !== origin || r.method !== 'GET');
    annotate(testInfo, { requests: requests.length, off, stored, cookies: cookies.length });
    expect(off, `requests that are not same-origin GETs: ${JSON.stringify(off)}`).toEqual([]);
    expect(cookies).toEqual([]);
    expect(stored.local).toEqual([]);
    expect(stored.session).toEqual([KEY]);
  });
});
