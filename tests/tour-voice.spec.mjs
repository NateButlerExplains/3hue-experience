// T-14 and T-15: the guides' voices (O10, O12, O13, js/voice.js) on the tour fixture, with voice
// files written at test time by tests/voice-fixture.mjs so their hashes always match the copy under
// test. The manifest has two guides, so the voice manifest is v2 and each file sits in its guide's
// folder; the lead (Avi) says every unpinned line, so every request here is under avi/.
//   T-14 the simulated back end (?voice=sim&rate=N: the real fetches and checks, a clock instead
//        of sound): nothing under the voice folder before the start; after it the voice manifest
//        and each line's timing file with ?h=; lines move at the voice's pace (350 ms after a line
//        ends), a choice waits for the visitor; the highlighted word moves forward; only the next
//        line of the node is preloaded; the live region never reads a voiced line; a line without
//        usable audio (no entry, the script changed, a 404, stale timing text) runs captions for
//        that line only and waits for Next; Pause, a hidden tab, the map and Ask hold the voice
//        where it is; Next skips, Previous says the earlier line again; a deep link opens locked, and
//        so does Forward after a tour the visitor turned the voice on in; Ask (the real script) says
//        its intro and answers on its own element while the tour is held, and still does after the
//        tab was hidden; a chapter's announcement comes a second or more before its first voiced
//        line (with or without reduced motion) and is not lost when the visitor steps on before the
//        voice was ready; a pick or a jump lifts Pause and a hidden tab's hold so the new node is
//        heard; Previous keeps focus while the voice carries the tour into the next node.
//   T-15 the controls and the audio back end: the Voice toggle (aria-pressed, described by the
//        synthetic-voice disclosure) and Pause meet 44 px and axe; voice off mid-line reads the line
//        out once and waits for Next; the choice survives a reload in localStorage and nothing is
//        fetched while muted; a refused play() locks the voice without storing anything; a real
//        one-second MP3 plays through <audio id="tour-audio"> after a silent unlock inside the
//        start click, its successor preloads as a blob, and a 404 MP3 falls back for that line;
//        a refused play() while Pause has focus hands it to Voice; an Ask answer whose MP3 will not
//        load is read out in Ask's live region; guide.voice.required turns the voice on by default
//        and ?voice=0 always turns it off.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { open, doorsShown, settled, vp, manifest as m, S, fill, annotate, ROOT } from './helpers.mjs';
import { FX, FIXTURE, TQ, tour, startTour, atNode, linesOf, chapterTitle, fillFx } from './tour-helpers.mjs';
import { buildVoice, voiceFiles, leadKey } from './voice-fixture.mjs';
import { fillTemplate } from '../js/tourtext.js';

const STORE = '3hue-experience:voice';
const vq = (base, { back = 'sim', rate = 3 } = {}) => `${TQ}&voice=${back}${back === 'sim' ? `&rate=${rate}` : ''}&voice-base=${base}`;
const vs = (page) => page.evaluate(() => window.__tour.voiceState);
const name = (testInfo, tag) => `${tag}-${testInfo.project.name}-${testInfo.workerIndex}`;
// A line's file in the lead's voice: "avi/<id>", its hash, and the request for it with ?h=.
const LEAD = leadKey('');
const hashOf = (v, id) => v.items[leadKey(id)].hash;
const vf = (v, id, ext = 'json') => `${leadKey(id)}.${ext}?h=${hashOf(v, id)}`;

// Page probes, installed before the page's own scripts: live-region announcements, the words the
// caption lit (token index and text, in order), the voice's signals to the sphere, and every
// media play() with the element, its source and whether the page had a live user activation.
const PROBES = () => {
  window.__ann = []; window.__lit = []; window.__vev = []; window.__plays = []; window.__annT = []; window.__vevT = [];
  document.addEventListener('lobby:voice', (e) => { window.__vev.push(e.detail.type); window.__vevT.push({ t: performance.now(), type: e.detail.type }); });
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...a) {
    window.__plays.push({ id: this.id, src: String(this.getAttribute('src') || '').slice(0, 24), active: navigator.userActivation ? navigator.userActivation.isActive : null });
    if (window.__blockPlay) return Promise.reject(new DOMException('The request is not allowed by the user agent.', 'NotAllowedError'));
    return play.apply(this, a);
  };
  addEventListener('DOMContentLoaded', () => {
    new MutationObserver(() => { const t = document.getElementById('tour-live').textContent; if (t) { window.__ann.push(t); window.__annT.push({ t: performance.now(), text: t }); } }).observe(document.getElementById('tour-live'), { childList: true, characterData: true, subtree: true });
    new MutationObserver((recs) => {
      for (const r of recs) if (r.type === 'attributes' && r.target.classList?.contains('now')) window.__lit.push({ line: r.target.closest('#tour-caption')?.dataset.line, i: +r.target.dataset.i, text: r.target.textContent });
    }).observe(document.getElementById('tour'), { attributes: true, attributeFilter: ['class'], subtree: true });
  });
};
const probe = (page) => page.addInitScript(PROBES);
const got = (page) => page.evaluate(() => ({ ann: window.__ann.slice(), lit: window.__lit.slice(), vev: window.__vev.slice(), plays: window.__plays.slice() }));
const playing = (page, line) => page.waitForFunction((l) => { const v = window.__tour.voiceState; return v.state === 'playing' && v.line === l; }, line, { polling: 20, timeout: 15_000 });
const waitingFor = (page, st) => page.waitForFunction((s) => document.getElementById('tour-state').textContent === s, st, { polling: 30 });
// Nothing moves for ms: same node and line, voice not playing.
async function still(page, ms = 1200) {
  const a = await tour(page);
  await page.waitForTimeout(ms);
  const b = await tour(page);
  expect([b.node, b.line], 'nothing stepped on by itself').toEqual([a.node, a.line]);
  return b;
}

test.describe('T-14 the voice sets the pace (simulated back end)', () => {
  test('T-14 nothing under the voice folder before the start; then the manifest and each line\'s timing with ?h=; lines step on after the voice, a choice waits; the lit word moves forward; only the next line is preloaded; the live region never reads a voiced line', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'pace'), { tour: FX });
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await probe(page);
    await open(page, { query: vq(v.base, { rate: 2 }) });
    await doorsShown(page);
    await page.waitForTimeout(400);
    expect(voiceFiles(reqs, v.base), 'nothing under the voice folder before the start').toEqual([]);
    const len = await page.evaluate(() => history.length);
    await startTour(page);
    const lines = linesOf('arrive');
    expect(lines.map((l) => l.id)).toEqual(['arrive-1', 'arrive-2']);
    await playing(page, 'arrive-1');
    let s = await vs(page);
    expect(s).toMatchObject({ backend: 'sim', on: true, muted: false, locked: false, loaded: true });
    expect((await tour(page)).mode).toBe('voice');
    // While the first line plays, the second (same node) is fetched ahead; nothing further is.
    await page.waitForFunction(() => window.__tour.voiceState.preloaded === 'arrive-2', null, { polling: 20 });
    const early = voiceFiles(reqs, v.base);
    expect(early).toEqual(['manifest.json', vf(v, 'arrive-1'), vf(v, 'arrive-2')]);
    // The voice moves the tour on without a key: the second line, then "Your call".
    await playing(page, 'arrive-2');
    expect((await tour(page)).line).toBe(1);
    await waitingFor(page, S.tourYourCall);
    const t = await still(page, 900);
    expect([t.phase, t.speaking, t.line]).toEqual(['choice', false, 1]);
    expect(await page.evaluate(() => document.activeElement?.id), 'focus never moved').toBe('tour-next');
    const g = await got(page);
    annotate(testInfo, { requests: voiceFiles(reqs, v.base), ann: g.ann, lit: g.lit.map((x) => `${x.line}:${x.i}`).join(' '), signals: [...new Set(g.vev)] });
    // The lit words: for each line, token indexes in order, each the caption's own token.
    for (const l of lines) {
      const mine = g.lit.filter((x) => x.line === l.id);
      const idx = mine.map((x) => x.i);
      expect(idx.length, `${l.id}: words lit`).toBeGreaterThanOrEqual(Math.min(3, l.text.split(/\s+/).length - 1));
      expect(idx, `${l.id}: the lit word only moves forward`).toEqual([...idx].sort((a, b) => a - b));
      const toks = l.text.split(/\s+/);
      for (const x of mine) expect(x.text).toBe(toks[x.i]);
    }
    // One announcement for the chapter, one for the waiting choice; no voiced line is ever read out.
    expect(g.ann).toHaveLength(2);
    expect(g.ann[0]).toContain(chapterTitle('arrival'));
    for (const l of lines) for (const a of g.ann) expect(a, 'a voiced line is not read out').not.toContain(l.text);
    expect(g.ann[1]).toContain(fillFx(FX.nodes.arrive.choice.prompt));
    expect(g.ann[1]).toContain(fill(S.tourChoicesLive, { count: FX.nodes.arrive.choice.options.length }));
    // The sphere heard the voice: play, a word at a time, stop.
    expect(g.vev).toEqual(expect.arrayContaining(['play', 'word', 'stop']));
    expect(g.vev.filter((x) => x === 'word').length).toBeGreaterThanOrEqual(6);
    // A pick: the door's lines (→ skips the first two), and the last continues to the next node by
    // the voice; one history entry throughout.
    await page.keyboard.press('1');
    await atNode(page, 'wt');
    const wt = linesOf('wt', { answers: { segment: 'win-trust' } }).map((l) => l.id);
    for (const [i, id] of wt.entries()) { await playing(page, id); if (i < wt.length - 1) await page.keyboard.press('ArrowRight'); }
    await atNode(page, 'wt-proof');
    await playing(page, 'wt-4');
    expect(await page.evaluate(() => history.length)).toBe(len + 1);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tour-next');
    const files = voiceFiles(reqs, v.base);
    expect(files.filter((f) => f === 'manifest.json'), 'the manifest is read once').toHaveLength(1);
    for (const f of files) if (f !== 'manifest.json') expect(f, 'timing files only (no audio in the simulation), in the lead\'s folder, each with its hash').toMatch(new RegExp(`^${LEAD}[\\w-]+\\.json\\?h=[0-9a-f]{12}$`));
  });

  test('T-14 a line without usable audio runs captions for that line only and waits for Next: no entry, the script changed after the render, a 404 timing file, stale timing text', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'fallback'), { tour: FX, badHash: ['arrive-2'], noJson: ['wt-1'], staleText: ['wt-2'], drop: ['wt-3'] });
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await probe(page);
    await open(page, { query: vq(v.base) });
    await doorsShown(page);
    await startTour(page);
    await playing(page, 'arrive-1');
    // arrive-2: the script changed after the render (lineHash): nothing is fetched for it, it is read
    // out with the waiting choice, and the voice stays on for the lines that follow.
    await atNode(page, 'arrive', 1);
    await page.waitForFunction(() => window.__ann.length >= 2, null, { polling: 30 });
    let t = await still(page, 900);
    expect([t.speaking, t.voice]).toEqual([false, true]);
    let g = await got(page);
    const arrive = linesOf('arrive');
    expect(g.ann.at(-1)).toContain(arrive[1].text);
    expect(g.ann.at(-1)).toContain(fillFx(FX.nodes.arrive.choice.prompt));
    expect(voiceFiles(reqs, v.base).some((f) => f.startsWith(`${LEAD}arrive-2.`)), 'nothing fetched for a line whose script changed').toBe(false);
    // wt-1 (404 timing), wt-2 (stale timing text) and wt-3 (no entry): each waits for Next and is read out once.
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.activeElement?.dataset?.option, null, { polling: 30 });
    await page.keyboard.press('1');
    await atNode(page, 'wt');
    const wt = linesOf('wt', { answers: { segment: 'win-trust' } });
    for (let i = 0; i < wt.length; i++) {
      await atNode(page, 'wt', i);
      await page.waitForFunction((txt) => window.__ann.some((a) => a.includes(txt)), wt[i].text, { polling: 30 });
      t = await still(page, 800);
      expect([t.line, t.speaking, t.voice], `${wt[i].id} waits for Next with the voice still on`).toEqual([i, false, true]);
      await page.keyboard.press('ArrowRight');
    }
    await atNode(page, 'wt-proof');
    await playing(page, 'wt-4');
    g = await got(page);
    const files = voiceFiles(reqs, v.base);
    annotate(testInfo, { files, ann: g.ann });
    expect(files).toContain(vf(v, 'wt-1'));
    expect(files).toContain(vf(v, 'wt-2'));
    expect(files.some((f) => f.startsWith(`${LEAD}wt-3.`)), 'no entry, no request').toBe(false);
    for (const l of wt) expect(g.ann.filter((a) => a.includes(l.text)), `${l.id} read out once`).toHaveLength(1);
    expect(g.ann.some((a) => a.includes(linesOf('wt-proof')[0].text)), 'the voiced line after them is not read out').toBe(false);
  });

  test('T-14 Pause holds the voice where it is and nothing steps on, Resume carries on; a hidden tab holds it until the visitor resumes; the map and Ask hold it while open', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'pause'), { tour: FX });
    await probe(page);
    await open(page, { query: vq(v.base, { rate: 0.2 }) });
    await doorsShown(page);
    await startTour(page);
    await playing(page, 'arrive-1');
    await page.waitForFunction(() => window.__tour.voiceState.word >= 1, null, { polling: 20 });
    const pauseBtn = await page.evaluate(() => { const b = document.getElementById('tour-pause'); const r = b.getBoundingClientRect(); return { hidden: b.hidden, text: b.textContent, w: r.width, h: r.height }; });
    expect(pauseBtn).toMatchObject({ hidden: false, text: S.tourPause });
    expect(Math.min(pauseBtn.w, pauseBtn.h)).toBeGreaterThanOrEqual(44);
    const log = [];
    const frozen = async (why, reasons) => {
      const a = await vs(page);
      await page.waitForTimeout(700);
      const b = await vs(page);
      const t = await tour(page);
      log.push({ why, a: a.time, b: b.time, state: b.state, pausedBy: t.pausedBy });
      expect(b.state, why).toBe('paused');
      expect(b.time, `${why}: the clock stands still`).toBe(a.time);
      expect([t.node, t.line], why).toEqual(['arrive', 0]);
      expect(t.pausedBy.sort()).toEqual(reasons.sort());
      expect(await page.evaluate(() => document.getElementById('tour-state').textContent)).toBe(S.tourPaused);
    };
    const moving = async (why) => {
      await playing(page, 'arrive-1');
      const a = await vs(page);
      await page.waitForTimeout(250);
      const b = await vs(page);
      log.push({ why, a: a.time, b: b.time });
      expect(b.time, `${why}: the clock runs again`).toBeGreaterThan(a.time);
      expect((await tour(page)).pausedBy).toEqual([]);
    };
    // Pause / Resume.
    await page.click('#tour-pause');
    await frozen('Pause', ['user']);
    expect(await page.evaluate(() => document.getElementById('tour-pause').textContent)).toBe(S.tourResume);
    await page.click('#tour-pause');
    await moving('Resume');
    // A hidden tab: held, and still held when the tab comes back, until Resume.
    const hide = (h) => page.evaluate((h) => {
      if (h) { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); }
      else { delete document.hidden; delete document.visibilityState; }
      document.dispatchEvent(new Event('visibilitychange'));
    }, h);
    await hide(true);
    await hide(false);
    await frozen('hidden tab, back again', ['hidden']);
    await page.click('#tour-pause');
    await moving('Resume after the tab came back');
    // The map, then Ask: held while open, carrying on when closed.
    await page.click('#tour-map-btn');
    await page.waitForFunction(() => document.getElementById('tour-map').open, null, { polling: 30 });
    await frozen('map open', ['map']);
    await page.keyboard.press('Escape');
    await moving('map closed');
    await page.click('#tour-ask-btn');
    await page.waitForFunction(() => document.getElementById('tour-ask').open, null, { polling: 30 });
    await frozen('Ask open', ['ask']);
    await page.keyboard.press('Escape');
    await moving('Ask closed');
    annotate(testInfo, log);
  });

  test('T-14 Ask (the real script) says its intro and each answer on its own element while the tour holds its place; an answer without audio is read out in Ask\'s live region instead; closing Ask hushes it', async ({ page }, testInfo) => {
    const REAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/tour.json'), 'utf8'));
    const said = REAL.ask.questions.find((q) => q.id === 'aivric');
    const unsaid = REAL.ask.questions.find((q) => q.id === 'pricing');
    const v = await buildVoice(name(testInfo, 'ask'), { tour: REAL, drop: unsaid.lines.map((l) => l.id) });
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await probe(page);
    await open(page, { query: `debug=1&tour=1&voice=sim&rate=2&voice-base=${v.base}` });
    await doorsShown(page);
    await page.click('#walk-btn');
    await page.waitForFunction((n) => window.__tour?.node === n && window.__tour.voiceState.state === 'playing', REAL.start, { polling: 20, timeout: 15_000 });
    await page.click('#tour-ask-btn');
    await page.waitForFunction(() => document.getElementById('tour-ask').open, null, { polling: 30 });
    // The intro, on Ask's own element; the tour is held for Ask where it was.
    await page.waitForFunction(() => window.__tour.voiceState.asking, null, { polling: 20 });
    const held = await tour(page);
    expect(held.pausedBy).toEqual(['ask']);
    await page.waitForFunction((f) => performance.getEntriesByType('resource').some((e) => e.name.includes(f)), vf(v, REAL.ask.intro.id), { polling: 30 });
    // A typed question with audio: said, and not read out.
    const ask = async (q) => { await page.fill('#tour-ask-q', fillTemplate(q.q, m, {})); await page.keyboard.press('Enter'); await page.waitForFunction((t) => document.getElementById('tour-ask-answering')?.textContent.includes(t), fillTemplate(q.q, m, {}), { polling: 30 }); };
    await ask(said);
    await page.waitForFunction((f) => performance.getEntriesByType('resource').some((e) => e.name.includes(f)), vf(v, said.lines[0].id), { polling: 30 });
    await page.waitForFunction(() => window.__tour.voiceState.asking, null, { polling: 20 });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.getElementById('tour-ask-live').textContent), 'a voiced answer is not read out').toBe('');
    // A typed question whose answer has no audio: read out in Ask's own live region.
    await ask(unsaid);
    const first = fillTemplate(unsaid.lines[0].text ?? '', m, {});
    await page.waitForFunction((t) => document.getElementById('tour-ask-live').textContent.includes(t), first.slice(0, 40), { polling: 30 });
    expect(voiceFiles(reqs, v.base).some((f) => f.startsWith(`${LEAD}${unsaid.lines[0].id}.`)), 'no entry, no request').toBe(false);
    // Closing Ask hushes it; the tour carries on from where it was held.
    await ask(said);
    await page.waitForFunction(() => window.__tour.voiceState.asking, null, { polling: 20 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('tour-ask').open, null, { polling: 30 });
    const after = await tour(page);
    annotate(testInfo, { held: held.pausedBy, after: after.pausedBy, files: voiceFiles(reqs, v.base).filter((f) => f.startsWith(`${LEAD}ask-`)) });
    expect(after.voiceState.asking).toBe(false);
    expect(after.pausedBy).toEqual([]);
    expect(after.node).toBe(held.node);
  });

  test('T-14 Next skips what the voice is saying and Previous says the earlier line again; at a choice Next gives way to the options without reading the choice out', async ({ page }) => {
    const v = await buildVoice(name(test.info(), 'skip'), { tour: FX });
    await probe(page);
    await open(page, { query: vq(v.base, { rate: 0.5 }) });
    await doorsShown(page);
    await startTour(page);
    await playing(page, 'arrive-1');
    await page.keyboard.press('ArrowRight');
    await playing(page, 'arrive-2');
    expect((await tour(page)).line).toBe(1);
    await page.keyboard.press('ArrowLeft');
    await playing(page, 'arrive-1');
    expect((await tour(page)).line).toBe(0);
    await page.keyboard.press('ArrowRight');
    await playing(page, 'arrive-2');
    expect(await page.evaluate(() => document.getElementById('tour-state').textContent), 'the options are up, but the voice still has the line').toBe(S.tourSpeaking);
    const before = (await got(page)).ann.length;
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !!document.activeElement?.dataset?.option, null, { polling: 30 });
    await waitingFor(page, S.tourYourCall);
    const s = await vs(page);
    expect(s.state, 'the voice stopped').toBe(null);
    await page.waitForTimeout(300);
    expect((await got(page)).ann.length, 'focus in the group names the choice; nothing is read out').toBe(before);
  });

  test('T-14 a deep link opens with the voice locked: captions and Next, the Voice toggle off, nothing under the voice folder; turning it on says the line on screen and the voice sets the pace', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'deep'), { tour: FX });
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await probe(page);
    await open(page, { query: vq(v.base), hash: '#/tour/wt' });
    await atNode(page, 'wt');
    await settled(page);
    let t = await still(page, 900);
    const wt = linesOf('wt');
    expect(t).toMatchObject({ mode: 'captions', voice: false, speaking: false });
    expect(t.voiceState).toMatchObject({ backend: 'sim', locked: true, on: false });
    const ctl = await page.evaluate(() => ({ pressed: document.getElementById('tour-voice').getAttribute('aria-pressed'), voiceHidden: document.getElementById('tour-voice').hidden, pauseHidden: document.getElementById('tour-pause').hidden, noteHidden: document.getElementById('tour-voice-note').hidden }));
    expect(ctl).toEqual({ pressed: 'false', voiceHidden: false, pauseHidden: true, noteHidden: true });
    expect(voiceFiles(reqs, v.base), 'a locked voice fetches nothing').toEqual([]);
    expect((await got(page)).ann.some((a) => a.includes(wt[0].text)), 'the line is read out').toBe(true);
    await page.click('#tour-voice');
    await playing(page, wt[0].id);
    expect(await page.evaluate(() => document.getElementById('tour-voice').getAttribute('aria-pressed'))).toBe('true');
    await playing(page, wt[1].id);
    expect(voiceFiles(reqs, v.base)[0]).toBe('manifest.json');
    expect(await page.evaluate((k) => localStorage.getItem(k), STORE), 'turning it on stores nothing').toBe(null);
    // End, then Forward: that gesture belonged to the tour that ended, so the tour Forward opens
    // starts locked again, captions and Next, until the visitor turns the voice on.
    await page.click('#tour-end');
    await page.waitForFunction(() => location.hash === '#/experience' && !window.__tour.touring, null, { polling: 30 });
    await page.goForward();
    await atNode(page, 'wt');
    t = await still(page, 900);
    expect(t).toMatchObject({ mode: 'captions', voice: false, speaking: false });
    expect(t.voiceState).toMatchObject({ locked: true, on: false });
  });

  test('T-14 a new chapter is announced a second or more before the voice starts its first line, whether the camera moves or not (reduced motion)', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'chapter'), { tour: FX });
    await probe(page);
    await open(page, { query: vq(v.base, { rate: 3 }) });
    await doorsShown(page);
    await startTour(page);
    await playing(page, 'arrive-1');
    await page.keyboard.press('ArrowRight');
    await playing(page, 'arrive-2');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !!document.activeElement?.dataset?.option, null, { polling: 30 });
    await page.keyboard.press('1');
    await atNode(page, 'wt');
    await playing(page, 'wt-1');
    const g = await page.evaluate(() => ({ ann: window.__annT.slice(), vev: window.__vevT.slice() }));
    const gaps = [];
    for (const id of ['arrival', 'door-win-trust']) {
      const a = g.ann.find((x) => x.text.includes(chapterTitle(id)));
      expect(a, `${id} announced`).toBeTruthy();
      const play = g.vev.find((x) => x.type === 'play' && x.t >= a.t);
      expect(play, `a line voiced after the ${id} announcement`).toBeTruthy();
      gaps.push({ id, gap: Math.round(play.t - a.t) });
      expect(play.t - a.t, `${id}: the voice waits for the announcement`).toBeGreaterThanOrEqual(1000);
    }
    annotate(testInfo, gaps);
  });

  test('T-14 a chapter is still announced when the visitor steps on before its first line was ready', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'carry'), { tour: FX });
    await probe(page);
    // The first line's timing file arrives late, so the visitor's Next comes before the voice was ready.
    await page.route((u) => u.pathname.includes(`/${v.base}`) && u.pathname.endsWith('/wt-1.json'), async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
    await open(page, { query: vq(v.base, { rate: 3 }) });
    await doorsShown(page);
    await startTour(page);
    await playing(page, 'arrive-1');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !!document.activeElement?.dataset?.option, null, { polling: 30 });
    await page.keyboard.press('1');
    await atNode(page, 'wt');
    await page.waitForTimeout(250);
    await page.keyboard.press('ArrowRight');
    await atNode(page, 'wt', 1);
    const title = chapterTitle('door-win-trust');
    await page.waitForFunction((t) => window.__ann.some((a) => a.includes(t)), title, { polling: 30, timeout: 5000 });
    expect((await got(page)).ann.filter((a) => a.includes(title)), 'announced once').toHaveLength(1);
  });

  test('T-14 a pick or a jump moves the tour as Next does: a hidden tab\'s hold and Pause go, and the new node\'s first line is heard', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'lift'), { tour: FX });
    await probe(page);
    await open(page, { query: vq(v.base, { rate: 3 }) });
    await doorsShown(page);
    await startTour(page);
    await waitingFor(page, S.tourYourCall);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect((await tour(page)).pausedBy).toEqual(['hidden']);
    await page.keyboard.press('1');
    await atNode(page, 'wt');
    await playing(page, 'wt-1');
    expect((await tour(page)).pausedBy, 'the pick lifted the hold').toEqual([]);
    // Pause, then a jump from the map: the entry's first line is heard.
    await page.click('#tour-pause');
    expect((await tour(page)).pausedBy).toEqual(['user']);
    await page.click('#tour-map-btn');
    await page.waitForFunction(() => document.getElementById('tour-map').open, null, { polling: 30 });
    await page.click('#tour-map-list .tour-map-row[data-chapter="door-gain-control"]');
    await atNode(page, 'gc');
    await playing(page, 'gc-1');
    const t = await tour(page);
    expect([t.pausedBy, t.voiceState.state]).toEqual([[], 'playing']);
    expect(await page.evaluate(() => document.getElementById('tour-state').textContent)).toBe(S.tourSpeaking);
  });

  test('T-14 Previous keeps focus while the voice carries the tour into the next node: it is marked unavailable, never disabled', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'prev'), { tour: FX });
    await probe(page);
    await open(page, { query: vq(v.base, { rate: 3 }) });
    await doorsShown(page);
    await startTour(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !!document.activeElement?.dataset?.option, null, { polling: 30 });
    await page.keyboard.press('1');
    await atNode(page, 'wt');
    await page.keyboard.press('ArrowRight');
    await atNode(page, 'wt', 1);
    await page.focus('#tour-prev');
    const focusins = await page.evaluate(() => { window.__fi = []; document.addEventListener('focusin', (e) => window.__fi.push(e.target.id || e.target.tagName)); return true; });
    expect(focusins).toBe(true);
    await atNode(page, 'wt-proof');
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => ({ active: document.activeElement?.id, aria: document.getElementById('tour-prev').getAttribute('aria-disabled'), disabled: document.getElementById('tour-prev').disabled, moved: window.__fi.slice() }));
    expect(s).toEqual({ active: 'tour-prev', aria: 'true', disabled: false, moved: [] });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect((await tour(page)).line, 'Previous on a first line does nothing').toBe(0);
  });

  test('T-14 a line\'s who picks its guide\'s folder (O12): who: huey is fetched from huey/, a guide with no audio gets captions, a line without who falls back from the lead to the guide who has it', async ({ page }, testInfo) => {
    // arrive-2 has no Avi file here, as if pinned to Huey: without a who it must still find Huey's.
    const v = await buildVoice(name(testInfo, 'who'), { tour: FX, drop: ['avi/arrive-2'] });
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await open(page, { query: vq(v.base, { rate: 3 }) });
    await doorsShown(page);
    await startTour(page);
    await playing(page, 'arrive-1');
    await page.click('#tour-pause');
    // The page's own copy of js/voice.js (the same module the tour uses), then speak() on Ask's element.
    const said = await page.evaluate(async (lines) => {
      const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/js\/voice\.js(\?|$)/.test(n));
      const voice = await import(url);
      const out = [];
      for (const l of lines) { const h = voice.speak(l, { channel: 'ask' }); out.push(await h.ready); voice.hushAsk(); }
      return out;
    }, [
      { id: 'arrive-1', text: v.lines.find((l) => l.key === 'huey/arrive-1').text, who: 'huey' },
      { id: 'arrive-1', text: v.lines.find((l) => l.key === 'huey/arrive-1').text, who: 'nobody' },
      { id: 'arrive-2', text: v.lines.find((l) => l.key === 'huey/arrive-2').text },
    ]);
    const files = voiceFiles(reqs, v.base);
    annotate(testInfo, { said, files });
    expect(said).toEqual([{ voiced: true, reason: null }, { voiced: false, reason: 'no-audio' }, { voiced: true, reason: null }]);
    expect(files).toContain(`huey/arrive-1.json?h=${v.items['huey/arrive-1'].hash}`);
    expect(files).toContain(`huey/arrive-2.json?h=${v.items['huey/arrive-2'].hash}`);
    expect(files.some((f) => f.startsWith('nobody/')), 'no guide, no request').toBe(false);
    expect(files.some((f) => f.startsWith('avi/arrive-2.')), 'no Avi entry, no Avi request').toBe(false);
  });

  test('T-14 Ask still speaks after the tab was hidden and came back: asking lifts the hidden tab\'s hold on Ask, while the tour stays held for Ask', async ({ page }, testInfo) => {
    const REAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/tour.json'), 'utf8'));
    const q = REAL.ask.questions.find((x) => x.id === 'aivric');
    const v = await buildVoice(name(testInfo, 'askhidden'), { tour: REAL });
    await probe(page);
    await open(page, { query: `debug=1&tour=1&voice=sim&rate=2&voice-base=${v.base}` });
    await doorsShown(page);
    await page.click('#walk-btn');
    await page.waitForFunction((n) => window.__tour?.node === n && window.__tour.voiceState.state === 'playing', REAL.start, { polling: 20, timeout: 15_000 });
    await page.click('#tour-ask-btn');
    await page.waitForFunction(() => document.getElementById('tour-ask').open, null, { polling: 30 });
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect((await tour(page)).pausedBy.sort()).toEqual(['ask', 'hidden']);
    const n0 = await page.evaluate(() => window.__vev.filter((x) => x === 'play').length);
    const label = fillTemplate(q.q, m, {});
    await page.fill('#tour-ask-q', label);
    await page.keyboard.press('Enter');
    await page.waitForFunction((t) => document.getElementById('tour-ask-answering')?.textContent.includes(t), label, { polling: 30 });
    await page.waitForFunction((n) => window.__vev.filter((x) => x === 'play').length > n, n0, { polling: 30, timeout: 5000 });
    const t = await tour(page);
    expect(t.pausedBy, 'the tour stays held for Ask').toEqual(['ask']);
    expect(t.voiceState.asking).toBe(true);
    expect(await page.evaluate(() => document.getElementById('tour-ask-live').textContent), 'a voiced answer is not read out').toBe('');
  });
});

test.describe('T-15 the voice controls and the audio back end', () => {
  test('T-15 Voice is a toggle (aria-pressed) described by the synthetic-voice disclosure; off mid-line stops, reads the line out once and waits for Next; the choice survives a reload, where nothing under the voice folder is fetched; on again forgets it', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'mute'), { tour: FX });
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await probe(page);
    await open(page, { query: vq(v.base, { rate: 0.5 }) });
    await doorsShown(page);
    await startTour(page);
    await playing(page, 'arrive-1');
    const ctl = await page.evaluate(() => {
      const b = document.getElementById('tour-voice'), n = document.getElementById(b.getAttribute('aria-describedby'));
      const r = b.getBoundingClientRect();
      return { pressed: b.getAttribute('aria-pressed'), label: b.querySelector('.tour-tool-label')?.textContent, note: n?.textContent, noteHidden: n?.hidden, w: r.width, h: r.height, tag: b.tagName, type: b.type };
    });
    expect(ctl).toMatchObject({ pressed: 'true', label: S.tourVoice, note: m.guide.disclosure, noteHidden: false, tag: 'BUTTON', type: 'button' });
    expect(Math.min(ctl.w, ctl.h)).toBeGreaterThanOrEqual(44);
    // Off, mid-line.
    const n0 = (await got(page)).ann.length;
    await page.click('#tour-voice');
    await page.waitForFunction(() => window.__ann.length > 0 && window.__tour.voiceState.state === null, null, { polling: 30 });
    let t = await still(page, 1000);
    expect([t.node, t.line, t.mode, t.voice]).toEqual(['arrive', 0, 'captions', false]);
    const g = await got(page);
    expect(g.ann.slice(n0).filter((a) => a.includes(linesOf('arrive')[0].text)), 'the line is read out once').toHaveLength(1);
    expect(await page.evaluate(() => ({ pressed: document.getElementById('tour-voice').getAttribute('aria-pressed'), pause: document.getElementById('tour-pause').hidden, note: document.getElementById('tour-voice-note').hidden }))).toEqual({ pressed: 'false', pause: true, note: true });
    expect(await page.evaluate((k) => localStorage.getItem(k), STORE)).toBe('off');
    await page.focus('#tour-next');   // WebKit does not focus a clicked button; keys act only inside the card
    await page.keyboard.press('ArrowRight');
    await atNode(page, 'arrive', 1);
    // A reload, and a fresh start: still off, and nothing under the voice folder is asked for.
    reqs.length = 0;
    await open(page, { query: vq(v.base, { rate: 0.5 }) });
    await doorsShown(page);
    await startTour(page);
    t = await still(page, 900);
    expect([t.mode, t.voiceState.muted, t.voiceState.locked]).toEqual(['captions', true, false]);
    expect(voiceFiles(reqs, v.base), 'nothing fetched while muted').toEqual([]);
    expect(await page.evaluate(() => document.getElementById('tour-voice').getAttribute('aria-pressed'))).toBe('false');
    // On again: the line on screen is said, and the stored choice goes.
    await page.click('#tour-voice');
    await playing(page, 'arrive-1');
    expect(await page.evaluate((k) => localStorage.getItem(k), STORE)).toBe(null);
    expect(voiceFiles(reqs, v.base)[0]).toBe('manifest.json');
  });

  test('T-15 a refused play() locks the voice: that line is read out as a caption, the toggle shows off, nothing is stored; turning it on plays the real audio', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'blocked'), { tour: FX, mp3: ['arrive-1', 'arrive-2'] });
    await probe(page);
    await page.addInitScript(() => { window.__blockPlay = true; });
    await open(page, { query: vq(v.base, { back: '1' }) });
    await doorsShown(page);
    await startTour(page);
    await page.waitForFunction(() => window.__tour.voiceState.locked && window.__ann.length > 0, null, { polling: 30 });
    let t = await still(page, 900);
    expect([t.line, t.mode, t.speaking]).toEqual([0, 'captions', false]);
    const g = await got(page);
    expect(g.ann.at(-1)).toContain(linesOf('arrive')[0].text);
    expect(await page.evaluate(() => ({ pressed: document.getElementById('tour-voice').getAttribute('aria-pressed'), pause: document.getElementById('tour-pause').hidden }))).toEqual({ pressed: 'false', pause: true });
    expect(await page.evaluate(() => Object.keys(localStorage)), 'a refused play stores nothing').toEqual([]);
    await page.evaluate(() => { window.__blockPlay = false; });
    await page.click('#tour-voice');
    await playing(page, 'arrive-1');
    t = await tour(page);
    expect([t.mode, t.voiceState.backend]).toEqual(['voice', 'audio']);
  });

  test('T-15 the audio back end: a silent unlock inside the start click, then a real one-second MP3 with ?h=, the words lit in order, its successor preloaded as a blob, the hand-over 350 ms after the end, and a 404 MP3 falls back for that line only', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'mp3'), { tour: FX, mp3: ['arrive-1', 'arrive-2', 'wt-1'], noMp3: ['wt-1'] });
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await probe(page);
    await open(page, { query: vq(v.base, { back: '1' }) });
    await doorsShown(page);
    await startTour(page);
    await playing(page, 'arrive-1');
    const t0 = Date.now();
    await playing(page, 'arrive-2');
    const handover = Date.now() - t0;
    const a2 = await page.evaluate(() => { const a = document.getElementById('tour-audio'); return { src: a.currentSrc.slice(0, 5), paused: a.paused }; });
    await waitingFor(page, S.tourYourCall);
    const g = await got(page);
    const files = voiceFiles(reqs, v.base);
    annotate(testInfo, { handover, files, plays: g.plays, lit: g.lit.map((x) => `${x.line}:${x.i}`).join(' ') });
    // The unlock: the first play() is the silent clip on the tour's element, inside the click.
    expect(g.plays[0].id).toBe('tour-audio');
    expect(g.plays[0].src.startsWith('data:audio/mpeg')).toBe(true);
    if (g.plays[0].active !== null) expect(g.plays[0].active, 'called with the click still active').toBe(true);
    expect(g.plays.some((p) => p.id === 'ask-audio' && p.src.startsWith('data:audio/mpeg')), 'Ask\'s element is unlocked too').toBe(true);
    // The first line from its ?h= URL, the second from the blob fetched while the first played.
    expect(files).toEqual(expect.arrayContaining(['manifest.json', vf(v, 'arrive-1'), vf(v, 'arrive-1', 'mp3'), vf(v, 'arrive-2'), vf(v, 'arrive-2', 'mp3')]));
    expect(files.filter((f) => f.startsWith(`${LEAD}arrive-2.mp3`)), 'the preloaded MP3 is fetched once').toHaveLength(1);
    expect(a2.src).toBe('blob:');
    expect(handover, 'one second of audio, then the 350 ms gap').toBeGreaterThanOrEqual(1000);
    const lit1 = g.lit.filter((x) => x.line === 'arrive-1').map((x) => x.i);
    expect(lit1.length).toBeGreaterThanOrEqual(2);
    expect(lit1).toEqual([...lit1].sort((a, b) => a - b));
    // wt-1: its timing is there but its MP3 is a 404: read out, and Next moves on; the voice stays on.
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !!document.activeElement?.dataset?.option, null, { polling: 30 });
    await page.keyboard.press('1');
    await atNode(page, 'wt');
    const wt1 = linesOf('wt', { answers: { segment: 'win-trust' } })[0];
    await page.waitForFunction((txt) => window.__ann.some((a) => a.includes(txt)), wt1.text, { polling: 30, timeout: 15_000 });
    const t = await still(page, 900);
    expect([t.line, t.speaking, t.voice]).toEqual([0, false, true]);
    expect(voiceFiles(reqs, v.base)).toContain(vf(v, 'wt-1', 'mp3'));
  });

  test('T-15 a refused play() while Pause has focus hands focus to the Voice toggle, the way back on', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'pausefocus'), { tour: FX, mp3: ['arrive-1', 'arrive-2'] });
    await probe(page);
    await open(page, { query: vq(v.base, { back: '1' }) });
    await doorsShown(page);
    await startTour(page);
    await playing(page, 'arrive-1');
    await page.focus('#tour-pause');
    await page.evaluate(() => { window.__blockPlay = true; });
    // arrive-1 ends (one second of audio), the voice steps on and arrive-2's play() is refused.
    await page.waitForFunction(() => window.__tour.voiceState.locked, null, { polling: 30, timeout: 15_000 });
    await page.waitForTimeout(200);
    const s = await page.evaluate(() => ({ active: document.activeElement?.id, pause: document.getElementById('tour-pause').hidden, pressed: document.getElementById('tour-voice').getAttribute('aria-pressed') }));
    expect(s).toEqual({ active: 'tour-voice', pause: true, pressed: 'false' });
  });

  test('T-15 Ask with the audio back end: an answer whose MP3 will not load is read out in Ask\'s own live region', async ({ page }, testInfo) => {
    const REAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/tour.json'), 'utf8'));
    const q = REAL.ask.questions.find((x) => x.id === 'aivric');
    const keys = q.lines.map((l) => l.id);
    const v = await buildVoice(name(testInfo, 'ask404'), { tour: REAL, mp3: [...REAL.nodes[REAL.start].lines.map((l) => l.id), REAL.ask.intro.id, ...keys], noMp3: keys });
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await probe(page);
    await open(page, { query: `debug=1&tour=1&voice=1&voice-base=${v.base}` });
    await doorsShown(page);
    await page.click('#walk-btn');
    await page.waitForFunction((n) => window.__tour?.node === n, REAL.start, { polling: 30 });
    await page.click('#tour-ask-btn');
    await page.waitForFunction(() => document.getElementById('tour-ask').open, null, { polling: 30 });
    const label = fillTemplate(q.q, m, {});
    await page.fill('#tour-ask-q', label);
    await page.keyboard.press('Enter');
    const first = fillTemplate(q.lines[0].text, m, {});
    await page.waitForFunction((t) => document.getElementById('tour-ask-live').textContent.includes(t), first.slice(0, 40), { polling: 30, timeout: 10_000 });
    const files = voiceFiles(reqs, v.base);
    annotate(testInfo, files.filter((f) => f.startsWith(`${LEAD}ask-`)));
    expect(files, 'the answer\'s MP3 was asked for (and is missing)').toContain(vf(v, keys[0], 'mp3'));
    expect(await page.evaluate(() => document.getElementById('tour-ask-live').textContent)).toContain(fillTemplate(q.lines[1].text, m, {}));
  });

  test('T-15 guide.voice.required turns the voice on by default (the audio back end); ?voice=0 always gives captions, no Voice control and no voice request', async ({ page }, testInfo) => {
    const v = await buildVoice(name(testInfo, 'required'), { tour: FX, mp3: ['arrive-1', 'arrive-2'] });
    const live = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/experience.json'), 'utf8'));
    live.guide.voice.required = true;
    live.tour.voiceBase = v.base;
    const mf = `${v.base}experience.json`;
    fs.writeFileSync(path.join(ROOT, mf), JSON.stringify(live));
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await open(page, { query: `debug=1&manifest=${mf}&tour=1&tour-manifest=${FIXTURE}` });
    await doorsShown(page);
    await startTour(page);
    await playing(page, 'arrive-1');
    expect((await vs(page)).backend).toBe('audio');
    expect(await page.evaluate(() => document.getElementById('tour-voice').getAttribute('aria-pressed'))).toBe('true');
    // Let this page's own fetches (the first clip, the next one preloaded as it starts) finish, so
    // none of them is counted against the next page.
    await page.waitForFunction(() => window.__tour.voiceState.time >= 0.5, null, { polling: 30 });
    reqs.length = 0;
    await open(page, { query: `debug=1&manifest=${mf}&tour=1&tour-manifest=${FIXTURE}&voice=0` });
    await doorsShown(page);
    await startTour(page);
    const t = await still(page, 900);
    expect([t.mode, t.voiceState.backend]).toEqual(['captions', 'off']);
    expect(await page.evaluate(() => [document.getElementById('tour-voice').hidden, document.getElementById('tour-pause').hidden])).toEqual([true, true]);
    expect(voiceFiles(reqs, v.base).filter((f) => f !== 'experience.json')).toEqual([]);
  });

  for (const [w, h] of [[1280, 720], [390, 844]]) {
    test(`T-15 axe WCAG 2.1 AA with the voice on, a word lit and the disclosure shown, at ${w}x${h}; every voice control >= 44 px and inside the card`, async ({ page }, testInfo) => {
      const v = await buildVoice(name(testInfo, `axe-${w}`), { tour: FX });
      await open(page, { viewport: vp(w, h), query: vq(v.base, { rate: 0.2 }) });
      await doorsShown(page);
      await startTour(page);
      await playing(page, 'arrive-1');
      await page.waitForFunction(() => !!document.querySelector('#tour-caption .w.now'), null, { polling: 20 });
      const box = await page.evaluate(() => {
        const c = document.getElementById('tour').getBoundingClientRect();
        return ['tour-voice', 'tour-pause', 'tour-map-btn', 'tour-end', 'tour-prev', 'tour-next'].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { id, w: r.width, h: r.height, inside: r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5 }; });
      });
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const summary = res.violations.map((x) => ({ id: x.id, nodes: x.nodes.map((n) => n.target.join(' ')) }));
      annotate(testInfo, { box, scroll, violations: summary });
      for (const b of box) { expect(Math.min(b.w, b.h), b.id).toBeGreaterThanOrEqual(44); expect(b.inside, `${b.id} inside the card`).toBe(true); }
      expect(scroll, 'no horizontal overflow').toBeLessThanOrEqual(0);
      expect(summary).toEqual([]);
    });
  }
});
