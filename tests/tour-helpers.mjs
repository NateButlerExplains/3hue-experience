// Shared helpers for the tour engine specs (T-04..T-11, T-19). They run against the fixture
// tests/fixtures/tour-min.json with ?tour=1, so they hold while content/tour.json changes. Every
// expected string is resolved from the fixture and the manifest through js/tourtext.js (itself
// checked in tests/tour-manifest.spec.mjs); nothing here invents copy.
import { expect } from '@playwright/test';
import { open, settled, manifest as m, readJson } from './helpers.mjs';
import { resolveLine, fillTemplate, matches } from '../js/tourtext.js';

export const FIXTURE = 'tests/fixtures/tour-min.json';
export const FX = readJson(FIXTURE);
export const TQ = `debug=1&tour=1&tour-manifest=${FIXTURE}`;

export const tour = (page) => page.evaluate(() => window.__tour);
// A request for the tour script or the voice (by path; the page URL's own query names the fixture).
export const tourRequest = (u) => /(tour-min\.json|content\/tour\.json)$|\/media\/voice\//.test(new URL(u).pathname);
export const isComposed = (page) => page.evaluate(() => document.body.classList.contains('composed'));
export const walkSelector = (composed) => (composed ? '#floor-foot button' : '#walk-btn');

export async function openTour(page, opts = {}) { await open(page, { query: TQ, ...opts }); }

// Start from the walk button (click, or Enter with key: true) and wait for the first line.
export async function startTour(page, { key = false } = {}) {
  const sel = walkSelector(await isComposed(page));
  if (key) { await page.focus(sel); await page.keyboard.press('Enter'); } else await page.click(sel);
  await atNode(page, FX.start);
  await page.waitForFunction(() => document.activeElement?.id === 'tour-next', null, { polling: 50 });
}

export async function atNode(page, id, line = 0) {
  await page.waitForFunction(([id, line]) => window.__tour?.node === id && window.__tour.line === line && window.__tour.frame === 'node', [id, line], { polling: 50, timeout: 15_000 });
}

// Press → until the node's lines run out (a choice waits, or Continue / End tour remains).
export async function toLast(page) {
  for (let i = 0; i < 24; i++) {
    const t = await tour(page);
    if (t.phase !== 'lines') return t;
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction((li) => window.__tour.line !== li, t.line, { polling: 30 });
  }
  throw new Error('the lines never ran out');
}

// Pick an option of the waiting choice by its id, with its digit key.
export async function pick(page, id) {
  const t = await toLast(page);
  const i = t.options.findIndex((o) => o.id === id);
  expect(i, `option ${id} among ${t.options.map((o) => o.id).join(', ')}`).toBeGreaterThanOrEqual(0);
  await page.keyboard.press(String(i + 1));
}

// Continue past a node without a choice.
export async function cont(page) {
  const t = await toLast(page);
  expect(t.phase).toBe('continue');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((n) => window.__tour.node !== n, t.node, { polling: 30 });
}

// The camera has stopped and the room (if any) has faded in.
export async function sceneSettled(page) {
  await settled(page);
  await page.waitForTimeout(900);
}

const C = (ctx) => ({ tour: FX, answers: {}, visited: [], ...ctx });
export const fillFx = (tpl, ctx = {}) => fillTemplate(tpl, m, C(ctx));
export const chapterOf = (id) => FX.chapters.find((c) => c.id === id);
export const chapterTitle = (id, ctx) => fillFx(chapterOf(id).title, ctx);
export const chapterLabel = (id, ctx) => [chapterOf(id).eyebrow ? fillFx(chapterOf(id).eyebrow, ctx) : '', chapterTitle(id, ctx)].filter(Boolean).join(' · ');
// A node's lines as shown for ctx: {id, text, source, ref}.
export function linesOf(nodeId, ctx = {}) {
  return FX.nodes[nodeId].lines.filter((l) => matches(l.when, C(ctx))).map((l) => ({ ...resolveLine(l, m, C(ctx)), cue: l.cue || null, callout: l.callout || [] })).filter((l) => l.text);
}

// What the card shows now.
export const CARD = () => {
  const card = document.getElementById('tour');
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
  const cap = document.getElementById('tour-caption');
  return {
    hidden: card.hidden, rect: r(card), label: card.getAttribute('aria-label'),
    state: document.getElementById('tour-state')?.textContent, chapter: document.getElementById('tour-chapter')?.textContent,
    caption: cap && !cap.hidden ? cap.querySelector('.sr')?.textContent : null,
    words: cap && !cap.hidden ? cap.querySelector('.tour-words')?.textContent : null,
    src: document.getElementById('tour-src')?.hidden ? null : document.getElementById('tour-src')?.textContent,
    callouts: [...document.querySelectorAll('#tour-callouts .tour-callout')].map((c) => ({ text: c.querySelector('.tour-callout-text')?.textContent, source: c.querySelector('.src')?.textContent ?? null })),
    // Previous is aria-disabled on a first line (never `disabled`, so it keeps focus).
    next: document.getElementById('tour-next')?.textContent, prevDisabled: document.getElementById('tour-prev')?.getAttribute('aria-disabled') === 'true',
    prompt: document.getElementById('tour-choice')?.hidden ? null : document.getElementById('tour-prompt')?.textContent,
    options: [...document.querySelectorAll('#tour-options .tour-opt')].map((o) => ({ id: o.dataset.option, tag: o.tagName, label: o.querySelector('.tour-opt-label')?.textContent, sub: o.querySelector('.tour-opt-sub')?.textContent ?? null, tags: [...o.querySelectorAll('.tour-tag')].map((t) => t.textContent), href: o.getAttribute('href'), target: o.getAttribute('target'), rel: o.getAttribute('rel'), aria: o.getAttribute('aria-label'), rect: r(o) })),
    active: document.activeElement?.id || document.activeElement?.dataset?.option || document.activeElement?.tagName,
  };
};
export const card = (page) => page.evaluate(CARD);
