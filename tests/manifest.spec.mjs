// Manifest schema, vocabulary, the O1/O2 overrides and the kiosk double measurement. No browser.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { manifest as m, geometry as g, ROOT, kioskLines } from './helpers.mjs';

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const stageIds = m.stages.map((s) => s.id);

test.describe('manifest (no browser)', () => {
  test('schema: site, plate, lobby, strings', () => {
    const s = m.site;
    for (const k of ['name', 'title', 'description', 'url', 'bookingUrl', 'logoHref', 'robots', 'themeColor']) expect(isStr(s[k]), `site.${k}`).toBe(true);
    expect(s.url).toMatch(/^https:\/\//);
    expect(s.bookingUrl).toMatch(/^https:\/\//);
    expect(s.logoHref).toMatch(/^https:\/\//);
    expect(s.robots).toBe('noindex');
    expect(s.logo).toMatchObject({ width: 240, height: 94 });
    expect(isStr(s.logo.src) && isStr(s.logo.srcset2x) && isStr(s.logo.alt)).toBe(true);
    expect(s.logo.src).not.toMatch(/^data:/);

    const p = m.plate;
    expect(p.width).toBe(g.plate.width); expect(p.height).toBe(g.plate.height); expect(p.reference).toBe(g.plate.reference);
    expect(Math.abs(p.height - p.width * 9 / 16)).toBeLessThanOrEqual(1); // 16:9 within a pixel of height (P1-D04)
    for (const fmt of ['avif', 'webp', 'jpeg']) {
      expect(Array.isArray(p.sources[fmt]) && p.sources[fmt].length === 4, `plate.sources.${fmt}`).toBe(true);
      for (const e of p.sources[fmt]) expect(e).toMatch(/^media\/plate\/lobby-plate-\d+\.(avif|webp|jpg) \d+w$/);
    }
    expect(p.fallback).toMatch(/^media\/plate\/lobby-plate-1920\.jpg$/);
    expect(p.placeholder).toMatch(/^data:image\/jpeg;base64,/);
    expect(p.placeholder.length).toBeLessThanOrEqual(4096);
    expect(isStr(p.sizes.desktop) && isStr(p.sizes.composed)).toBe(true);

    const L = m.lobby;
    expect(isStr(L.eyebrow)).toBe(true);
    expect(L.heading).toHaveLength(2);
    expect(L.subline).toHaveLength(2);
    expect(L.heading[1].includes(L.headingAccent.text), 'headingAccent.text is a substring of heading[1]').toBe(true);
    expect(L.headingAccent.color).toMatch(/^#[0-9a-f]{6}$/i);

    const need = ['explore', 'accessibleName', 'for', 'walk', 'talk', 'back', 'pathChip', 'loading', 'representative', 'skip', 'doorsGroup', 'urgency', 'gap', 'services', 'proof', 'program', 'route', 'inPath', 'decision', 'current', 'next', 'prev', 'whereToStart', 'endWalk', 'openLobby', 'stagesGroup', 'emphasisedBy', 'stations', 'legend', 'nextStep', 'prevStep'];
    for (const k of need) expect(isStr(m.strings[k]), `strings.${k}`).toBe(true);
    expect(m.strings.explore).toContain('{door}');
    expect(m.strings.accessibleName).toContain('{door}');
    expect(m.strings.accessibleName).toContain('{promise}');
    expect(m.strings.for).toContain('{icp}');
  });

  test('schema: stages Assess-first, three doors with every field, path, kiosk, walk, vocabulary, sources', () => {
    expect(m.stages).toHaveLength(4);
    expect(m.stages[0].id).toBe('assess');
    expect(new Set(stageIds).size).toBe(4);
    for (const s of m.stages) { expect(isStr(s.id) && isStr(s.name)).toBe(true); expect(s.summary).toBeNull(); }

    expect(m.doors).toHaveLength(3);
    expect(new Set(m.doors.map((d) => d.id)).size).toBe(3);
    expect(m.doors.map((d) => d.number)).toEqual([1, 2, 3]);
    for (const d of m.doors) {
      for (const k of ['id', 'title', 'promise', 'icp', 'color', 'dock', 'audience', 'tension', 'gap', 'decision']) expect(isStr(d[k]), `${d.id}.${k}`).toBe(true);
      expect(['cyan', 'orange', 'navy']).toContain(d.color);
      expect(['left', 'right']).toContain(d.dock);
      expect(d.triggers.length).toBeGreaterThan(0);
      expect(d.maturityEmphasis.length).toBeGreaterThan(0);
      for (const s of d.maturityEmphasis) expect(stageIds, `${d.id} emphasises ${s}`).toContain(s);
      for (const k of ['opening', 'stat', 'statSecondary', 'program']) { expect(isStr(d[k].source), `${d.id}.${k}.source`).toBe(true); expect(isStr(d[k].status), `${d.id}.${k}.status`).toBe(true); }
      expect(isStr(d.opening.text) && isStr(d.stat.text)).toBe(true);
      expect(isStr(d.program.snapshot) && isStr(d.program.build) && isStr(d.program.operate)).toBe(true);
      expect(d.serviceFamilies, `${d.id} has four service families`).toHaveLength(4);
      for (const f of d.serviceFamilies) { expect(isStr(f.name)).toBe(true); expect(Array.isArray(f.examples)).toBe(true); }
      expect(d.proof.length).toBeGreaterThan(0);
      for (const p of d.proof) expect(isStr(p.text) && isStr(p.basis) && isStr(p.status), `${d.id}.proof`).toBe(true);
      expect(d.stations.length).toBeGreaterThan(0);
      for (const st of d.stations) expect(isStr(m.strings[st]), `strings.${st} names station ${st}`).toBe(true);
      expect(isStr(d.share.title) && isStr(d.share.description) && isStr(d.share.card)).toBe(true);
      expect(d.share.title).toContain(d.title);
      if (d.room?.render) {
        const geo = g.rooms?.[d.id];
        expect(geo, `geometry.rooms.${d.id}`).toBeTruthy();
        expect(isNum(geo.width) && isNum(geo.height)).toBe(true);
        expect(geo.focus.x).toBeGreaterThan(0); expect(geo.focus.x).toBeLessThan(1);
        expect(geo.focus.y).toBeGreaterThan(0); expect(geo.focus.y).toBeLessThan(1);
        for (const [st, [x, y]] of Object.entries(geo.stations)) { expect(d.stations, `${d.id} room station ${st}`).toContain(st); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(1); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(1); }
      }
    }
    expect(isStr(m.path.title) && isStr(m.path.intro)).toBe(true);
    expect(isStr(m.path.whereToStart.lead) && isStr(m.path.whereToStart.source) && isStr(m.path.whereToStart.status)).toBe(true);
    expect(isStr(m.path.share.title) && isStr(m.path.share.card)).toBe(true);
    expect(m.arc).toHaveLength(3);
    expect(m.pillars.length).toBeGreaterThan(0);

    expect(isStr(m.kiosk.header) && isStr(m.kiosk.tag)).toBe(true);
    expect(m.kiosk.tag).toBe(m.strings.representative);
    expect(m.kiosk.lines).toHaveLength(3);
    for (const l of m.kiosk.lines) { expect(isStr(l.label) && isStr(l.provenance)).toBe(true); expect(['doors', 'stages', 'families']).toContain(l.derive); }
    for (const l of kioskLines()) expect(isNum(l.value) && l.value > 0, `kiosk ${l.label} derives a count`).toBe(true);

    for (const k of ['lobby', 'door', 'stage', 'kiosk', 'talk', 'end']) expect(isStr(m.walk.captions[k]), `walk.captions.${k}`).toBe(true);
    expect(m.walk.captions.kiosk.trim().endsWith(`${m.kiosk.tag}.`), 'kiosk caption ends with the Representative data tag').toBe(true);

    for (const k of ['forbidden', 'retired', 'avoid', 'allowedCustomers']) expect(Array.isArray(m.vocabulary[k]) && m.vocabulary[k].length > 0, `vocabulary.${k}`).toBe(true);
    expect(m.sources.length).toBeGreaterThan(0);
    for (const s of m.sources) expect(isStr(s.id) && isStr(s.ref)).toBe(true);
    expect(isStr(m.share.lobby.route) && isStr(m.share.lobby.title) && isStr(m.share.lobby.card)).toBe(true);
  });

  test('geometry: a doorway per door, a ring per stage (Assess lowest), tower, stair pill, phone band, layout', () => {
    for (const d of m.doors) {
      const dw = g.doorways[d.id];
      expect(dw, `doorway ${d.id}`).toBeTruthy();
      const [l, t, r, b] = dw.frame;
      expect(l).toBeLessThan(r); expect(t).toBeLessThan(b);
      expect(dw.center[0]).toBeGreaterThan(l); expect(dw.center[0]).toBeLessThan(r);
      expect(dw.center[1]).toBeGreaterThan(t); expect(dw.center[1]).toBeLessThan(b);
      expect(isNum(dw.sign.x) && isNum(dw.sign.y) && isNum(dw.sign.capPx)).toBe(true);
    }
    expect(g.rings.map((r) => r.stage)).toEqual(stageIds);
    const ys = g.rings.map((r) => r.label[1]);
    for (let i = 1; i < ys.length; i++) expect(ys[i], `${g.rings[i].stage} sits above ${g.rings[i - 1].stage}`).toBeLessThan(ys[i - 1]);
    for (const r of g.rings) expect(r.arc).toMatch(/^M [\d.]+ [\d.]+ Q [\d.]+ [\d.]+ [\d.]+ [\d.]+$/);
    expect(g.tower).toHaveLength(2);
    expect(g.stairPill).toHaveLength(4);
    expect(g.phoneBand.left).toBeLessThan(g.phoneBand.right);
    for (const k of ['headerH', 'sheetTop', 'composedMaxWidth', 'textFloor', 'ringSize', 'kioskBaseFontPx']) expect(isNum(g.layout[k]), `layout.${k}`).toBe(true);
    expect(g.layout.textFloor).toBe(12);
    expect(g.layout.ringSize).toBe(30);
    expect(g.layout.dolly).toMatchObject({ zoom: 1.3, ms: 1100 });
  });

  test('vocabulary: no forbidden or retired word on a visible string; customers on the allowlist; figures only in sourced fields', () => {
    const strings = [];
    (function walk(v, p) {
      if (typeof v === 'string') strings.push([p, v]);
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
      else if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (p === '' && ['vocabulary', 'sources', 'note'].includes(k)) continue; walk(v[k], p ? `${p}.${k}` : k); }
    })(m, '');
    const visible = strings.filter(([p]) => !/\.(source|basis|provenance|ref|placeholder|src|srcset2x|card|url|bookingUrl|logoHref|route|derive)$/.test(p) && !/^plate\./.test(p));
    const v = m.vocabulary;
    const problems = [];
    for (const [p, s] of visible) {
      for (const w of v.forbidden) if (s.toLowerCase().includes(w.toLowerCase())) problems.push(`forbidden "${w}" in ${p}`);
      for (const w of v.retired) if (s.includes(w)) problems.push(`retired "${w}" in ${p}`);
      if (/\$\s?\d/.test(s) && !/\.(stat|statSecondary|opening)\.text$/.test(p)) problems.push(`currency outside a sourced field in ${p}`);
      if (/\d+(\.\d+)?%/.test(s) && !/\.(stat|statSecondary|opening)\.text$/.test(p)) problems.push(`percentage outside a sourced field in ${p}`);
    }
    const allowed = v.allowedCustomers.map((x) => x.toLowerCase());
    for (const d of m.doors) for (const pr of d.proof) { const b = pr.basis.toLowerCase(); if (!allowed.some((a) => b.includes(a)) && !/boilerplate/.test(b)) problems.push(`proof basis off the allowlist: ${d.id}: ${pr.basis}`); }
    expect(problems).toEqual([]);
    expect(visible.length).toBeGreaterThan(100);
  });

  test('tools/check-manifest.js passes on the live manifest', () => {
    const out = execFileSync('node', [path.join(ROOT, 'tools/check-manifest.js')], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/ 0 errors/);
  });

  test('O1 buyer labels and O2 booking destination, O8 logo destination', () => {
    expect(m.doors.map((d) => d.icp)).toEqual(['SaaS & AI vendors', 'Portfolio owners', 'Regulated operators']);
    expect(m.site.bookingUrl).toBe('https://3hue.net/contact.html');
    expect(m.site.logoHref).toBe('https://3hue.net');
  });

  test('kiosk: measurements a and b agree within 2 px on every corner and the quad is their mean', () => {
    const { a, b } = g.kiosk.measurements;
    const q = g.kiosk.quad;
    expect(a).toHaveLength(4); expect(b).toHaveLength(4); expect(q).toHaveLength(4);
    const diffs = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const d = Math.abs(a[i][j] - b[i][j]);
      diffs.push(d);
      expect(d, `corner ${i} axis ${j} a/b disagreement`).toBeLessThanOrEqual(2);
      expect(Math.abs(q[i][j] - (a[i][j] + b[i][j]) / 2), `quad corner ${i} axis ${j} is the mean`).toBeLessThanOrEqual(0.11);
    }
    // The right edge is the plate edge (the kiosk runs off frame).
    expect(q[1][0]).toBeGreaterThanOrEqual(g.plate.width - 1);
    expect(q[2][0]).toBeGreaterThanOrEqual(g.plate.width - 1);
    test.info().annotations.push({ type: 'measured', description: `a/b corner deltas px: ${diffs.join(', ')}` });
  });
});
