// Shared helpers for the acceptance specs. Every string a test compares against comes from the
// manifest (content/experience.json); nothing here invents copy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RESULTS = path.join(ROOT, 'tests', 'results');
export const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
export const manifest = readJson('content/experience.json');
export const geometry = readJson('content/geometry.json');
export const S = manifest.strings;
export const DOORS = manifest.doors.map((d) => d.id);
export const STAGES = manifest.stages.map((s) => s.id);
export const doorById = (id) => manifest.doors.find((d) => d.id === id);
export const stageById = (id) => manifest.stages.find((s) => s.id === id);
export const fill = (t, vars) => String(t ?? '').replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
export const doorH2 = (d) => `${d.title}: ${d.promise}`;
export const doorTitle = (d) => `${d.title} · ${manifest.site.name}`;
export const pathTitle = () => `${manifest.path.title} · ${manifest.site.name}`;
export const siteTitle = () => manifest.site.title;
export const vp = (width, height) => ({ width, height });

// Kiosk lines exactly as js/content.js derives them (O9).
export function kioskLines() {
  const m = manifest;
  const derive = { doors: () => m.doors.length, stages: () => m.stages.length, families: () => new Set(m.doors.flatMap((d) => d.serviceFamilies.map((f) => f.name))).size };
  return (m.kiosk?.lines || []).map((l) => ({ label: l.label, value: derive[l.derive] ? derive[l.derive]() : '' }));
}

export function record(name, data) {
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(path.join(RESULTS, `${name}.json`), JSON.stringify(data, null, 2));
}
export function annotate(testInfo, data) {
  testInfo.annotations.push({ type: 'measured', description: JSON.stringify(data) });
}
export const isReduced = (testInfo) => /reduced/.test(testInfo.project.name);

// Geometry helpers on DOMRect-like objects {left, top, right, bottom}.
export const intersects = (a, b, pad = 0) => !(a.right <= b.left + pad || a.left >= b.right - pad || a.bottom <= b.top + pad || a.top >= b.bottom - pad);
export const inside = (a, b, tol = 0.5) => a.left >= b.left - tol && a.top >= b.top - tol && a.right <= b.right + tol && a.bottom <= b.bottom + tol;
export const frameToRect = (R) => ({ left: R.x, top: R.y, right: R.x + R.w, bottom: R.y + R.h });
export const r1 = (n) => Math.round(n * 10) / 10;

// ---- Page state ----
// A full navigation every time: about:blank first so a hash-only change never becomes a
// same-document navigation that skips boot.
export async function open(page, { hash = '#/experience', query = 'debug=1', viewport = null, settle = true } = {}) {
  if (viewport) await page.setViewportSize(viewport);
  await page.goto('about:blank');
  await page.goto(`?${query}${hash}`);
  await ready(page);
  if (settle) await settled(page);
}
export async function ready(page) {
  await page.waitForFunction(() => document.documentElement.dataset.plateReady === '1', null, { polling: 100, timeout: 30_000 });
  // The plate fades up over 600 ms once decoded (instant under reduced motion).
  await page.waitForFunction(() => getComputedStyle(document.getElementById('plate')).opacity === '1', null, { polling: 50, timeout: 5000 });
}
// The plate has stopped travelling (the `moving` class lasts the dolly plus 50 ms).
export async function settled(page, extra = 150) {
  await page.waitForFunction(() => !document.getElementById('plate').classList.contains('moving'), null, { polling: 100 });
  await page.waitForTimeout(extra);
}
// Door pins are revealed (no hidden class, no tabindex=-1 on a door).
export async function doorsShown(page) {
  await page.waitForFunction(() => {
    const h = document.getElementById('doors');
    // Composed viewports keep the band's rings out of the Tab order by design (rows are the controls).
    const composed = document.body.classList.contains('composed');
    return h && !h.classList.contains('hidden') && (composed || !h.querySelector('.door[tabindex="-1"]'));
  }, null, { polling: 100 });
}
export async function panelOpen(page) {
  await page.waitForFunction(() => { const p = document.getElementById('panel'); return p && !p.hidden && !!p.querySelector('#panel-h2'); }, null, { polling: 100 });
  await settled(page);
}
export async function atRest(page) {
  await page.waitForFunction(() => location.hash === '#/experience' && document.getElementById('panel').hidden, null, { polling: 100 });
  await settled(page);
  await doorsShown(page);
}
export async function roomVisible(page, timeout = 3000) {
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.getElementById('room')).opacity) === 1, null, { polling: 50, timeout });
}

// A short description of the active element: id, or door:<id>, or row:<id>, or the class name.
export const ACTIVE = () => {
  const a = document.activeElement;
  if (!a || a === document.body || a === document.documentElement) return 'body';
  if (a.id) return a.id;
  if (a.classList.contains('row-btn') && a.dataset.door) return `row:${a.dataset.door}`;
  if (a.dataset.door) return `door:${a.dataset.door}`;
  if (a.dataset.station) return `station:${a.dataset.station}`;
  if (a.dataset.stage) return `stage:${a.dataset.stage}`;
  return a.className || a.tagName;
};
export const active = (page) => page.evaluate(ACTIVE);
// WebKit follows Safari's convention: plain Tab stops at form fields only and Option+Tab walks every
// focusable element, so the keyboard-only checks press Alt+Tab there. Chromium takes plain Tab.
export const isWebKit = (page) => page.context().browser()?.browserType().name() === 'webkit';
export async function pressTab(page, shift = false) {
  const key = (isWebKit(page) ? 'Alt+' : '') + (shift ? 'Shift+Tab' : 'Tab');
  await page.keyboard.press(key);
}
export async function tabTo(page, target, max = 24) {
  const seen = [];
  for (let i = 0; i < max; i++) {
    await pressTab(page);
    const a = await active(page);
    seen.push(a);
    if (a === target) return seen;
  }
  throw new Error(`Tab never reached ${target}; sequence: ${seen.join(' → ')}`);
}
export async function tabSequence(page, n) {
  const seq = [];
  for (let i = 0; i < n; i++) { await pressTab(page); seq.push(await active(page)); }
  return seq;
}
export const composed = (page) => page.evaluate(() => document.body.classList.contains('composed'));
export const hash = (page) => page.evaluate(() => location.hash);
export const rect = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; }, sel);
export const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent.trim() ?? null, sel);
