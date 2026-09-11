// T-27: the rooms talk back under the tour (O14). On the fixture's room node (tests/fixtures/
// tour-min.json: a base write, line writes in two `when` versions, a surface cue, a ref card, a glow,
// a clear and an `at` word; every word a token or a ref):
//   - what the surfaces show is the fold of the node's writes up to the line on screen, for each
//     trigger version, in window.__tour and in the room itself, and nothing carries into the next node;
//   - with the voice on (?voice=sim) an entry with `at` shows when the voice reaches that word, not
//     before; captions-only, it shows as its line starts;
//   - Previous, a deep link (a reload) and a resize come back to the same state;
//   - a click on a lit surface goes back to the line that lit it;
//   - the card's screen-reader list says what every lit surface shows;
//   - the lint (tools/check-manifest.js) refuses writes and surface cues that break the contract, and
//     js/tourtext.js foldWrites folds as the contract says (no browser).
import { test, expect } from '@playwright/test';
import { open, vp, annotate, manifest as m, S } from './helpers.mjs';
import { FX, FIXTURE, TQ, tour, atNode, startTour } from './tour-helpers.mjs';
import { buildVoice } from './voice-fixture.mjs';
import { roomSettled, withSegment, roomLines, roomState, reported, listed, ROOM, G as g } from './surface-helpers.mjs';
import { foldWrites, atIndex, tokens } from '../js/tourtext.js';
import { lintTour } from '../tools/check-manifest.js';

const DOOR = FX.nodes[ROOM].scene.door;
const ORDER = Object.keys(g.rooms[DOOR].surfaces);
const AT = FX.nodes[ROOM].lines.find((l) => Object.values(l.write || {}).some((e) => e?.at));
const AT_ID = Object.entries(AT.write).find(([, e]) => e?.at)[0];
const CUE = FX.nodes[ROOM].lines.find((l) => l.cue?.surface);
const snapshot = (page) => page.evaluate(() => ({ t: window.__tour, list: [...document.querySelectorAll('#tour-room li')].map((li) => li.textContent), listHidden: document.getElementById('tour-room').hidden, head: document.getElementById('tour-room-h')?.textContent, inCard: document.getElementById('tour').contains(document.getElementById('tour-room')), sr: document.getElementById('tour-room').classList.contains('sr') }));
const drawn = (t) => Object.fromEntries((t.room?.surfaces || []).filter((x) => x.written).map((x) => [x.id, x.text || x.kind]));

async function checkLine(page, answers, li, label) {
  const want = roomState(answers, li);
  await page.waitForFunction((w) => JSON.stringify(window.__tour.surfaces) === JSON.stringify(w), reported(want), { polling: 50, timeout: 5000 }).catch(() => {});
  const s = await snapshot(page);
  expect(s.t.surfaces, `${label}: window.__tour.surfaces is the fold`).toEqual(reported(want));
  expect(drawn(s.t), `${label}: the room draws the fold`).toEqual(reported(want));
  expect(s.list, `${label}: the card's list mirrors the room`).toEqual(listed(want, ORDER));
  expect(s.listHidden).toBe(!s.list.length);
  return s;
}

test.describe('T-27 the rooms talk back', () => {
  for (const seg of ['win-trust', 'all', null]) {
    test(`T-27 the fold of the node's writes, line by line, for the ${seg ? `"${seg}"` : 'unanswered'} version; the card's list mirrors it; nothing carries into the next node`, async ({ page }, testInfo) => {
      await withSegment(page, seg);
      await open(page, { viewport: vp(1440, 900), hash: `#/tour/${ROOM}`, query: TQ });
      await atNode(page, ROOM);
      await roomSettled(page);
      const answers = seg ? { segment: seg } : {};
      const lines = roomLines(answers);
      expect((await tour(page)).lineIds).toEqual(lines.map((l) => l.id));
      const log = [];
      for (let li = 0; li < lines.length; li++) {
        const s = await checkLine(page, answers, li, `${seg}/${lines[li].id}`);
        if (li === 0) { expect(s.head).toBe(S.tourRoomShows); expect(s.inCard && s.sr).toBe(true); }
        log.push({ line: lines[li].id, surfaces: s.t.surfaces });
        if (li < lines.length - 1) { await page.keyboard.press('ArrowRight'); await atNode(page, ROOM, li + 1); }
      }
      // The two trigger versions differ in what the room shows.
      if (seg) expect(reported(roomState({ segment: 'win-trust' }, 0))).not.toEqual(reported(roomState({ segment: 'all' }, 0)));
      // Continue: the next node shows only its own writes (none), the list goes.
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction((n) => window.__tour.node === n, FX.nodes[ROOM].next, { polling: 50 });
      await page.waitForTimeout(300);
      const after = await snapshot(page);
      expect(after.t.surfaces).toEqual({});
      expect(after.listHidden).toBe(true);
      expect(drawn(after.t)).toEqual({});
      annotate(testInfo, log);
    });
  }

  test('T-27 with the voice on (?voice=sim) an entry with `at` shows when the voice says that word, not before; the word events carry {line, index, word}', async ({ page }, testInfo) => {
    const v = await buildVoice(`t27-at-${testInfo.project.name}-${testInfo.workerIndex}`, { tour: FX });
    await page.addInitScript(() => { window.__words = []; document.addEventListener('lobby:voice', (e) => { if (e.detail.type === 'word') window.__words.push({ ...e.detail, t: performance.now() }); }); });
    await open(page, { viewport: vp(1440, 900), query: `${TQ}&voice=sim&rate=1&voice-base=${v.base}` });
    await startTour(page);
    await page.evaluate((n) => { location.hash = `#/tour/${n}`; }, ROOM);
    await atNode(page, ROOM);
    const at = AT.write[AT_ID].at;
    const idx = atIndex(roomLines({}).find((l) => l.id === AT.id).text, at);
    expect(idx).toBeGreaterThan(0);
    // The voice carries the tour to the line with the `at` write; while it has not reached the word
    // the surface stays dark, and it lights once the voice has.
    await page.waitForFunction((id) => { const s = window.__tour.voiceState; return s.line === id && s.state === 'playing'; }, AT.id, { polling: 20, timeout: 20_000 });
    const early = await page.evaluate(() => ({ word: window.__tour.voiceState.word, surfaces: window.__tour.surfaces, said: window.__tour.said }));
    expect(early.word, 'caught before the word').toBeLessThan(idx);
    expect(early.surfaces[AT_ID], `${AT_ID} waits for "${at}"`).toBeUndefined();
    await page.waitForFunction((id) => !!window.__tour.surfaces[id], AT_ID, { polling: 20, timeout: 10_000 });
    const lit = await page.evaluate(() => ({ word: window.__tour.voiceState.word, token: window.__tour.voiceState.token, line: window.__tour.lineId, said: window.__tour.said, words: window.__words.filter((w) => w.line === window.__tour.lineId) }));
    expect(lit.line).toBe(AT.id);
    expect(lit.said, 'the voice had reached the word').toBeGreaterThanOrEqual(idx);
    const ev = lit.words.find((w) => w.index === idx);
    expect(ev, 'a word event names the line, the caption token and the word').toMatchObject({ line: AT.id, index: idx });
    expect(ev.word.toLowerCase()).toBe(tokens(roomLines({}).find((l) => l.id === AT.id).text)[idx].word.toLowerCase());
    expect(lit.words.filter((w) => w.index < idx).every((w) => w.t < ev.t), 'the words before it came first').toBe(true);
    annotate(testInfo, { at, idx, early, lit: { word: lit.word, said: lit.said } });
  });

  test('T-27 captions only (?voice=0), an entry with `at` shows as its line starts', async ({ page }) => {
    await open(page, { viewport: vp(1440, 900), hash: `#/tour/${ROOM}`, query: `${TQ}&voice=0` });
    await atNode(page, ROOM);
    const at = roomLines({}).findIndex((l) => l.id === AT.id);
    for (let i = 0; i < at; i++) await page.keyboard.press('ArrowRight');
    await atNode(page, ROOM, at);
    const t = await tour(page);
    expect(t.surfaces[AT_ID]).toBe(reported(roomState({}, at))[AT_ID]);
    expect(t.said).toBeNull();
  });

  test('T-27 Previous, a deep link (a reload) and a resize come back to the same state', async ({ page }, testInfo) => {
    await withSegment(page, 'all');
    await open(page, { viewport: vp(1440, 900), hash: `#/tour/${ROOM}`, query: TQ });
    await atNode(page, ROOM);
    await roomSettled(page);
    const answers = { segment: 'all' };
    const last = roomLines(answers).length - 1;
    for (let i = 0; i < last; i++) await page.keyboard.press('ArrowRight');
    await atNode(page, ROOM, last);
    await checkLine(page, answers, last, 'the last line');
    await page.keyboard.press('ArrowLeft');
    await atNode(page, ROOM, last - 1);
    await checkLine(page, answers, last - 1, 'Previous');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(800);
    await roomSettled(page);
    await checkLine(page, answers, last - 1, 'after a resize');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    await roomSettled(page);
    await checkLine(page, answers, last - 1, 'after a rotation to a phone');
    // A reload: the deep link opens the node's first line with the session's answers restored.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    await atNode(page, ROOM, 0);
    await roomSettled(page);
    const s = await checkLine(page, answers, 0, 'a reload');
    annotate(testInfo, { reload: s.t.surfaces });
  });

  test('T-27 a click on a lit surface goes back to the line that wrote or cued it', async ({ page }, testInfo) => {
    await open(page, { viewport: vp(1440, 900), hash: `#/tour/${ROOM}`, query: TQ });
    await atNode(page, ROOM);
    const lines = roomLines({});
    const last = lines.length - 1;
    for (let i = 0; i < last; i++) await page.keyboard.press('ArrowRight');
    await atNode(page, ROOM, last);
    await roomSettled(page);
    const target = CUE.cue.surface;
    const s = await page.evaluate((id) => window.__tour.room.surfaces.find((x) => x.id === id), target);
    expect(s.hit, `${target} takes the pointer (${s.w}x${s.h})`).toBe(true);
    const c = s.corners.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
    await page.mouse.click(c[0], c[1]);
    const want = lines.findIndex((l) => Object.prototype.hasOwnProperty.call(l.write || {}, target) || l.cue?.surface === target);
    await atNode(page, ROOM, want);
    // A surface only the node's base writes is lit too, but no line writes or cues it: nothing moves.
    const base = Object.keys(FX.nodes[ROOM].write).find((id) => !lines.some((l) => Object.prototype.hasOwnProperty.call(l.write || {}, id)));
    const b = await page.evaluate((id) => window.__tour.room.surfaces.find((x) => x.id === id), base);
    if (b.hit) {
      const cb = b.corners.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
      await page.mouse.click(cb[0], cb[1]);
      await page.waitForTimeout(300);
      expect((await tour(page)).line).toBe(want);
    }
    // An unlit surface takes no pointer during the tour.
    const dark = await page.evaluate(() => window.__tour.room.surfaces.filter((x) => !x.written && !x.active).map((x) => x.hit));
    expect(dark.every((h) => !h)).toBe(true);
    annotate(testInfo, { target, want, base });
  });
});

test.describe('T-27 the contract, without a browser', () => {
  test('T-27 foldWrites: the base, then each shown line in order; null clears; `at` waits for its word', () => {
    const base = { a: { kind: 'sign', lines: ['{str:legend}'] } };
    const lines = [
      { text: 'one two three', write: { b: { kind: 'glow' } } },
      { text: 'four five six', write: { a: null, c: { kind: 'status', lines: ['{str:nextStep}'], at: 'five' } } },
    ];
    expect(Object.keys(foldWrites(base, lines, 0))).toEqual(['a', 'b']);
    expect(Object.keys(foldWrites(base, lines, 1))).toEqual(['b', 'c']);
    expect(Object.keys(foldWrites(base, lines, 1, 0)), 'the voice has not reached "five"').toEqual(['b']);
    expect(Object.keys(foldWrites(base, lines, 1, 1)), 'the voice said "five"').toEqual(['b', 'c']);
    expect(Object.keys(foldWrites(null, lines, 1, -1)), 'an earlier line applies whole').toEqual(['b']);
    expect(atIndex('Choose the evidence, then act.', 'EVIDENCE')).toBe(2);
    expect(atIndex('Choose the evidence.', 'nope')).toBe(-1);
  });

  test('T-27 the lint refuses writes and surface cues that break the contract', () => {
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const room = (t) => t.nodes[ROOM];
    const cueLine = (t) => room(t).lines.find((l) => l.cue?.surface);
    const atLine = (t) => room(t).lines.find((l) => l.id === AT.id);
    const other = Object.keys(g.rooms).find((d) => d !== DOOR);
    const otherSurface = Object.keys(g.rooms[other].surfaces)[0];
    const noText = Object.entries(g.rooms[DOOR].surfaces).find(([, s]) => s.text === null)[0];
    const cases = [
      ['a surface of another room', (t) => { cueLine(t).cue = { surface: otherSurface }; }, new RegExp(`surface "${otherSurface}" is not in ${DOOR}`)],
      ['a surface cue in a path scene', (t) => { t.nodes.path.lines[0].cue = { surface: CUE.cue.surface }; }, /a surface cue needs a door or station scene, not path/],
      ['a surface cue and writes under @', (t) => { room(t).scene = { kind: 'door', door: '@' }; }, /@ cannot carry/],
      ['a write in a keep scene', (t) => { t.nodes.lens.write = { [CUE.cue.surface]: { kind: 'glow' } }; }, /a write needs a door or station scene, not keep/],
      ['a write to a surface the room does not have', (t) => { room(t).write = { 'wt-nope': { kind: 'glow' } }; }, /wt-nope is not a surface of/],
      ['an unknown kind', (t) => { room(t).write[Object.keys(room(t).write)[0]].kind = 'banner'; }, /kind must be one of sign, list, card, status, glow/],
      ['a glow with lines', (t) => { room(t).write = { [CUE.cue.surface]: { kind: 'glow', lines: ['{str:legend}'] } }; }, /a glow has no lines/],
      ['a sign of three lines', (t) => { room(t).write[Object.keys(room(t).write)[0]].lines = ['{str:legend}', '{str:talk}', '{str:proof}']; }, /3 lines; a sign carries at most 2/],
      ['a list of five', (t) => { room(t).write = { [CUE.cue.surface]: { kind: 'list', lines: ['{str:legend}', '{str:talk}', '{str:proof}', '{str:gap}', '{str:urgency}'] } }; }, /5 lines; a list carries at most 4/],
      ['a figure typed into an item', (t) => { room(t).write[Object.keys(room(t).write)[0]].lines = ['61% of buyers ask']; }, /figure "61%" typed/],
      ['a figure brought in by a token', (t) => { room(t).write[Object.keys(room(t).write)[0]].lines = ['{ref:doors.win-trust.stat}']; }, /figure .* enters through \{ref:doors\.win-trust\.stat\}/],
      ['a typed door title', (t) => { room(t).write[Object.keys(room(t).write)[0]].lines = [`${m.doors[0].title}`]; }, /typed door title/],
      ['a ref item that does not resolve', (t) => { cueLine(t).write[CUE.cue.surface].lines = [{ ref: 'doors.win-trust.nope' }]; }, /ref doors\.win-trust\.nope does not resolve/],
      ['a card with no ref', (t) => { cueLine(t).write[CUE.cue.surface].lines = ['{str:proof}']; }, /a card carries a ref/],
      ['an item that is neither', (t) => { cueLine(t).write[CUE.cue.surface].lines = [{ text: '{str:proof}' }]; }, /an item is a template or \{ref\}/],
      ['at not a word of its line', (t) => { atLine(t).write[AT_ID].at = 'Friday'; }, /"Friday" is not a word of the line's caption/],
      ['at on the node\'s own write', (t) => { room(t).write[Object.keys(room(t).write)[0]].at = 'Trust'; }, /belongs on a line's write/],
      ['type on a surface that takes none', (t) => { room(t).write = { [noText]: { kind: 'sign', lines: ['{str:legend}'] } }; }, new RegExp(`${noText} carries no text`)],
      ['an unknown entry key', (t) => { room(t).write[Object.keys(room(t).write)[0]].color = 'red'; }, /unknown key color/],
      ['an Ask answer that writes', (t) => { t.ask.questions[0].lines[0].write = { [CUE.cue.surface]: { kind: 'glow' } }; }, /only a node's lines write on the room/],
    ];
    expect(lintTour(clone(FX), m, { file: FIXTURE, geometry: g }).errors, 'the unmodified fixture').toEqual([]);
    const missed = [];
    for (const [name, mutate, re] of cases) {
      const t = clone(FX);
      mutate(t);
      const { errors } = lintTour(t, m, { file: 'probe.json', geometry: g });
      if (!errors.some((e) => re.test(e))) missed.push(`${name}: expected ${re}, got ${JSON.stringify(errors)}`);
    }
    expect(missed).toEqual([]);
  });
});
