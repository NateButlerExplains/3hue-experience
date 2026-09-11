// T-23: a renamed door follows the manifest through the tour (P2a-D03 carried over; O1 labels stay
// single-sourced). The manifest is the live one with the first door's title suffixed " Two" (the
// same rename as tests/fixtures/build-renamed.mjs, written to a file of this spec's own so the
// specs never race on one fixture).
//   Captions (the fixture script): the arrival options, the chapter label, the chapter title card,
//   the document title, the Tour map, and the summary with its mail draft show the new title, and
//   the old one appears nowhere: text, aria-label, title, alt, placeholder or document.title.
//   Voice (the real script): voice files rendered before the rename are never played for a line
//   the rename changed. That line runs captions (the new title), and nothing is fetched for it;
//   a line the rename did not touch is still voiced.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { open, doorsShown, settled, manifest as m, ROOT, readJson, annotate, isReduced } from './helpers.mjs';
import { FX, FIXTURE, tour, startTour, atNode, toLast, pick } from './tour-helpers.mjs';
import { buildVoice, voiceFiles } from './voice-fixture.mjs';
import { voiceItems, usesDoor } from '../tools/voice/items.mjs';
import { sceneOf, matches } from '../js/tourtext.js';

const D = m.doors[0];
function renamed(file) {
  const OLD = D.title, NEW = `${OLD} Two`;
  const walk = (v, key) => {
    if (typeof v === 'string') return key === 'title' && v.includes(OLD) ? v.split(OLD).join(NEW) : v;
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = walk(v[k], k); return o; }
    return v;
  };
  const out = walk(JSON.parse(fs.readFileSync(path.join(ROOT, 'content/experience.json'), 'utf8')), '');
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(out));
  return { OLD, NEW, manifest: out };
}

// Every place the old title could survive (the new title contains the old, so it is stripped first).
const scan = (page, { OLD, NEW }) => page.evaluate(({ OLD, NEW }) => {
  const strip = (s) => String(s).split(NEW).join('');
  const hits = [];
  const where = (el) => (el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}` : '?');
  const walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) if (strip(n.nodeValue).includes(OLD)) hits.push({ kind: 'text', in: where(n.parentElement), text: n.nodeValue.trim().slice(0, 80) });
  for (const el of document.querySelectorAll('*')) for (const a of ['aria-label', 'title', 'alt', 'aria-description', 'placeholder', 'href']) { const v = el.getAttribute(a); if (v && strip(a === 'href' ? decodeURIComponent(v) : v).includes(OLD)) hits.push({ kind: a, in: where(el), text: v.slice(0, 80) }); }
  if (strip(document.title).includes(OLD)) hits.push({ kind: 'document.title', text: document.title });
  return hits;
}, { OLD, NEW });

test('T-23 the renamed door follows the manifest through the tour: arrival options, chapter label and title card, document title, the Tour map, the summary and its mail draft; the old title appears nowhere', async ({ page }, testInfo) => {
  const file = `tests/results/tour-rename/renamed-${testInfo.project.name}-${testInfo.workerIndex}.json`;
  const R = renamed(file);
  const q = `debug=1&manifest=${file}&tour=1&tour-manifest=${FIXTURE}`;
  const log = [];
  const clean = async (at) => { const hits = await scan(page, R); log.push({ at, hits }); expect(hits, `${at}: "${R.OLD}" survives`).toEqual([]); };
  await open(page, { query: q });
  await doorsShown(page);
  expect(await page.evaluate(() => window.__lobby.manifest.doors[0].title)).toBe(R.NEW);
  await startTour(page);
  const t = await toLast(page);
  const opt = await page.evaluate((id) => { const o = document.querySelector(`#tour-options .tour-opt[data-option="${id}"]`); return { sub: o?.querySelector('.tour-opt-sub')?.textContent, label: o?.querySelector('.tour-opt-label')?.textContent }; }, D.id);
  expect(opt.sub).toContain(R.NEW);
  expect(opt.label).toBe(D.icp);
  await clean('arrival choice');
  await pick(page, D.id);
  await atNode(page, FX.nodes.arrive.choice.options.find((o) => o.id === D.id).next);
  const head = await page.evaluate(() => ({ chapter: document.getElementById('tour-chapter').textContent, title: document.title, card: document.getElementById('tour-titlecard').textContent }));
  expect(head.chapter).toContain(R.NEW);
  expect(head.title.startsWith(`${R.NEW} · `)).toBe(true);
  if (!isReduced(testInfo)) expect(head.card).toContain(R.NEW);
  await clean('door chapter');
  await settled(page);
  await page.click('#tour-map-btn');
  await page.waitForFunction(() => document.getElementById('tour-map').open, null, { polling: 30 });
  const rows = await page.evaluate(() => [...document.querySelectorAll('#tour-map-list .tour-map-title')].map((e) => e.textContent));
  expect(rows).toContain(R.NEW);
  await clean('map');
  // The close, reached from the map, and its summary: the visited chapters are listed by title.
  await page.click('#tour-map-list .tour-map-row[data-chapter="close"]');
  await atNode(page, 'close');
  await pick(page, 'summary');
  await page.waitForFunction(() => window.__tour.frame === 'summary', null, { polling: 30 });
  const sum = await page.evaluate(() => ({ tiles: [...document.querySelectorAll('#tour-callouts .tour-callout-text')].map((e) => e.textContent), mail: document.querySelector('#tour-options .tour-opt[data-option="email"]')?.getAttribute('href') }));
  expect(sum.tiles.join(' ')).toContain(R.NEW);
  const body = new URLSearchParams(sum.mail.slice('mailto:?'.length)).get('body');
  expect(body).toContain(R.NEW);
  expect(body.split(R.NEW).join('')).not.toContain(R.OLD);
  await clean('summary');
  annotate(testInfo, { OLD: R.OLD, NEW: R.NEW, phase: t.phase, log });
});

test('T-23 voice rendered before a rename is never played for a line the rename changed: that line runs captions with the new title and nothing is fetched for it; a line the rename left alone is still voiced', async ({ page }, testInfo) => {
  const file = `tests/results/tour-rename/renamed-voice-${testInfo.project.name}-${testInfo.workerIndex}.json`;
  const R = renamed(file);
  const REAL = readJson('content/tour.json');
  const [was, now] = await Promise.all([voiceItems(REAL, m), voiceItems(REAL, R.manifest)]);
  const before = new Map(was.items.map((x) => [x.key, x]));
  const changed = now.items.filter((x) => before.has(x.key) && before.get(x.key).lineHash !== x.lineHash);
  expect(changed.length, 'the script names the renamed door in at least one spoken line').toBeGreaterThan(0);
  for (const x of changed) { expect(x.text).toContain(R.NEW); expect(before.get(x.key).text).toContain(R.OLD); }
  const changedKeys = new Set(changed.map((x) => x.key));
  // A node whose first line (on a fresh deep link) is one the rename changed.
  let target = null;
  for (const [id, n] of Object.entries(REAL.nodes)) {
    const sc = sceneOf(n);
    const door = ['door', 'station'].includes(sc.kind) ? sc.door : null;
    const first = (n.lines || []).find((l) => matches(l.when, { answers: {}, visited: [n.chapter] }));
    if (!first) continue;
    const key = usesDoor(first) ? (door ? `${first.id}--${door}` : null) : first.id;
    if (key && changedKeys.has(key)) { target = { node: id, key, text: now.items.find((x) => x.key === key).text }; break; }
  }
  expect(target, 'a node opens on a line the rename changed').not.toBe(null);
  const unchanged = now.items.find((x) => x.key === `${REAL.nodes[REAL.start].lines[0].id}`);
  expect(before.get(unchanged.key).lineHash, 'the first line of the tour does not name the door').toBe(unchanged.lineHash);
  // The voice files, rendered from the manifest as it was before the rename.
  const v = await buildVoice(`rename-${testInfo.project.name}-${testInfo.workerIndex}`, { tour: REAL, m });
  const q = `debug=1&manifest=${file}&tour=1&voice=sim&rate=3&voice-base=${v.base}`;
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  await open(page, { query: q });
  await doorsShown(page);
  await page.click('#walk-btn');
  await page.waitForFunction((l) => { const s = window.__tour?.voiceState; return s?.state === 'playing' && s.line === l; }, unchanged.id, { polling: 20, timeout: 15_000 });
  // The changed line, on a deep link (locked), then the voice turned on by the visitor.
  await page.evaluate(() => sessionStorage.clear());
  reqs.length = 0;
  await open(page, { query: q, hash: `#/tour/${target.node}` });
  await atNode(page, target.node);
  await settled(page);
  await page.click('#tour-voice');
  await page.waitForFunction(() => window.__tour.voiceState.loaded && document.getElementById('tour-voice').getAttribute('aria-pressed') === 'true', null, { polling: 30 });
  await page.waitForTimeout(900);
  const t = await tour(page);
  const cap = await page.evaluate(() => document.querySelector('#tour-caption .sr')?.textContent);
  const files = voiceFiles(reqs, v.base);
  annotate(testInfo, { target, changed: changed.map((x) => x.key), files });
  expect([t.node, t.line, t.speaking, t.voice]).toEqual([target.node, 0, false, true]);
  expect(cap).toBe(target.text);
  expect(files).toContain('manifest.json');
  expect(files.some((f) => f.startsWith(`${target.key}.`)), 'nothing is fetched for a line the rename changed').toBe(false);
  expect(await scan(page, R)).toEqual([]);
});
