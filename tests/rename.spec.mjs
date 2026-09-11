// P2a-D03: renaming a door in the manifest renames it everywhere. The fixture is the live
// manifest with the first door's title suffixed " Two"; nothing else differs. Also: the header
// shows the 3HUE logo as a real 240 px PNG, never base64.
import { test, expect } from '@playwright/test';
import { open, panelOpen, manifest as m, S, fill, doorH2, annotate, active } from './helpers.mjs';
import { buildRenamed, FIXTURE } from './fixtures/build-renamed.mjs';

const D = m.doors[0];
let OLD, NEW;
test.beforeAll(() => { ({ OLD, NEW } = buildRenamed()); });

const QUERY = `debug=1&manifest=${FIXTURE}`;

// Every place the old title could survive: text nodes (head included), aria-labels, titles, alts,
// document.title. Occurrences inside the new title are stripped first, since NEW contains OLD.
const scan = (page) => page.evaluate(({ OLD, NEW }) => {
  const strip = (s) => String(s).split(NEW).join('');
  const hits = [];
  const where = (el) => (el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + String(el.className).split(' ').filter(Boolean).join('.') : ''}` : '?');
  const walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) if (strip(n.nodeValue).includes(OLD)) hits.push({ kind: 'text', in: where(n.parentElement), text: n.nodeValue.trim().slice(0, 80) });
  for (const el of document.querySelectorAll('*')) for (const a of ['aria-label', 'title', 'alt', 'aria-description', 'placeholder']) { const v = el.getAttribute(a); if (v && strip(v).includes(OLD)) hits.push({ kind: a, in: where(el), text: v }); }
  if (strip(document.title).includes(OLD)) hits.push({ kind: 'document.title', text: document.title });
  return hits;
}, { OLD, NEW });

test('P2a-D03 the renamed title follows the manifest into chip, sign, tab, h2, aria-label, rows and document.title', async ({ page }, testInfo) => {
  await open(page, { hash: `#/door/${D.id}`, query: QUERY });
  await panelOpen(page);
  const got = await page.evaluate((id) => ({
    chip: document.querySelector(`#doors .door[data-door="${id}"] .chip`)?.textContent.trim(),
    plateB: document.querySelector(`#doors .door[data-door="${id}"] .plate b`)?.textContent.trim(),
    ariaLabel: document.querySelector(`#doors .door[data-door="${id}"]`)?.getAttribute('aria-label'),
    sign: [...document.querySelectorAll('.scene-labels .sign')].map((e) => e.textContent.trim()),
    tab: document.querySelector(`#panel .tabs .tab[data-door="${id}"]`)?.textContent.trim(),
    tabPressed: document.querySelector(`#panel .tabs .tab[data-door="${id}"]`)?.getAttribute('aria-pressed'),
    h2: document.getElementById('panel-h2')?.textContent.trim(),
    panelLabel: document.getElementById('panel')?.getAttribute('aria-label'),
    row: document.querySelector(`#floor-rows .row-btn[data-door="${id}"]`)?.textContent.trim(),
    rowName: (() => { const b = document.querySelector(`#floor-rows .row-btn[data-door="${id}"]`); if (!b) return null; return b.getAttribute('aria-label') || [...b.querySelectorAll('*')].filter((e) => !e.closest('[aria-hidden="true"]') && !e.children.length).map((e) => e.textContent.trim()).join(' '); })(),
    title: document.title,
    manifestTitle: window.__lobby.manifest.doors[0].title,
  }), D.id);
  annotate(testInfo, got);
  expect(got.manifestTitle).toBe(NEW);
  expect(got.chip).toBe(fill(S.explore, { door: NEW }));
  expect(got.plateB).toBe(fill(S.explore, { door: NEW }));
  expect(got.ariaLabel).toBe(fill(S.accessibleName, { door: NEW, promise: D.promise }));
  expect(got.sign).toContain(NEW);
  expect(got.tab).toBe(NEW);
  expect(got.tabPressed).toBe('true');
  expect(got.h2).toBe(doorH2({ title: NEW, promise: D.promise }));
  expect(got.panelLabel).toBe(doorH2({ title: NEW, promise: D.promise }));
  expect(got.row).toContain(fill(S.explore, { door: NEW }));
  expect(got.rowName).toContain(NEW);
  expect(got.rowName).toContain(D.promise);
  expect(got.title).toBe(`${NEW} · ${m.site.name}`);
  const hits = await scan(page);
  expect(hits, `old title "${OLD}" must not survive anywhere`).toEqual([]);
});

test('P2a-D03 the old title appears nowhere at rest, in the path panel, or in a walk caption', async ({ page }) => {
  await open(page, { query: QUERY });
  expect(await scan(page)).toEqual([]);
  await open(page, { hash: '#/path/where-to-start', query: QUERY });
  await panelOpen(page);
  const startButtons = await page.evaluate(() => [...document.querySelectorAll('#panel [data-door]')].map((b) => b.textContent.trim()));
  expect(startButtons).toContain(NEW);
  expect(startButtons.filter((t) => t === OLD)).toEqual([]);
  expect(await scan(page)).toEqual([]);
  // The walk's first door step (index 1) is the renamed door.
  await open(page, { hash: '#/walk/1', query: QUERY });
  await page.waitForSelector('#walk .caption');
  const caption = await page.evaluate(() => document.querySelector('#walk .caption').textContent);
  expect(caption).toBe(fill(m.walk.captions.door, { title: NEW, promise: D.promise, icp: D.icp, audience: D.audience }));
  expect(await scan(page)).toEqual([]);
});

test('P2a-D03 / P3-D05 the header logo is the 240 px PNG, not base64', async ({ page }, testInfo) => {
  await open(page);
  const logo = await page.evaluate(() => {
    const img = document.getElementById('brand-img');
    const a = document.getElementById('brand');
    const dataImgs = [...document.querySelectorAll('img')].filter((i) => /^data:/.test(i.getAttribute('src') || '') || /^data:/.test(i.currentSrc || '')).map((i) => i.id || i.className);
    const r = img.getBoundingClientRect();
    return { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, currentSrc: img.currentSrc, srcAttr: img.getAttribute('src'), width: img.getAttribute('width'), height: img.getAttribute('height'), alt: img.alt, href: a.getAttribute('href'), target: a.target, rel: a.rel, rendered: [r.width, r.height], visible: r.width > 0 && r.height > 0, dataImgs };
  });
  annotate(testInfo, logo);
  expect(logo.naturalWidth).toBe(240);
  expect(logo.naturalHeight).toBe(94);
  expect(logo.width).toBe('240');
  expect(logo.height).toBe('94');
  expect(logo.currentSrc).toMatch(/media\/brand\/3hue-logo-240\.png$/);
  expect(logo.srcAttr).not.toMatch(/^data:/);
  expect(logo.dataImgs).toEqual([]);
  expect(logo.alt).toBe(m.site.logo.alt);
  expect(logo.href).toBe(m.site.logoHref);
  expect(logo.target).toBe('_blank');
  expect(logo.rel).toContain('noopener');
  expect(logo.visible).toBe(true);
});
