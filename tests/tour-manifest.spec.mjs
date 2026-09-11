// T-01..T-03: the guided tour's script (content/tour.json) and the engine fixture
// (tests/fixtures/tour-min.json), checked against the manifest they quote. No browser.
//   T-01 the tour is gated off in the manifest; graph and schema rules hold for both files.
//   T-02 tools/check-manifest.js passes both files and refuses every broken rule.
//   T-03 the arrival choice resolves to the O1 labels in door order; refs, tokens, conditions,
//        next targets, caption tokens and the line hash behave as js/tourtext.js documents.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { manifest as m, geometry as g, ROOT, readJson, DOORS, STAGES, doorById } from './helpers.mjs';
import { lintTour, lintManifest, figures } from '../tools/check-manifest.js';
import { resolveRef, resolveLine, fillTemplate, templateTokens, matches, resolveNext, tokens, hashLine, sceneOf, optionValue, SCENES, ACTIONS, STATUSES } from '../js/tourtext.js';

const TOUR_FILE = m.tour.manifest;
const FIXTURE_FILE = 'tests/fixtures/tour-min.json';
const TOUR = readJson(TOUR_FILE);
const FIXTURE = readJson(FIXTURE_FILE);
const FILES = [[TOUR_FILE, TOUR], [FIXTURE_FILE, FIXTURE]];
const O1 = ['SaaS & AI vendors', 'Portfolio owners', 'Regulated operators'];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOOR_CTXS = DOORS.map((door) => ({ door }));
const clone = (x) => structuredClone(x);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const node = (cmd) => spawnSync(process.execPath, cmd, { cwd: ROOT, encoding: 'utf8' });

// Every line in a tour file, with where it sits.
function allLines(t) {
  const out = [];
  for (const [id, n] of Object.entries(t.nodes)) n.lines.forEach((line, i) => out.push({ where: `nodes.${id}.lines[${i}]`, line, node: n }));
  if (t.ask?.intro) out.push({ where: 'ask.intro', line: t.ask.intro });
  for (const q of t.ask?.questions || []) q.lines.forEach((line, i) => out.push({ where: `ask.${q.id}.lines[${i}]`, line, question: q }));
  (t.summary?.lines || []).forEach((line, i) => out.push({ where: `summary.lines[${i}]`, line }));
  return out;
}
// Every visitor-readable template (text lines, labels, prompts, titles), with where it sits.
function allTemplates(t) {
  const out = [];
  for (const c of t.chapters) { out.push([`chapters.${c.id}.title`, c.title]); if (c.eyebrow) out.push([`chapters.${c.id}.eyebrow`, c.eyebrow]); }
  for (const [id, n] of Object.entries(t.nodes)) {
    if (!n.choice) continue;
    out.push([`nodes.${id}.choice.prompt`, n.choice.prompt]);
    for (const o of n.choice.options) { out.push([`nodes.${id}.${o.id}.label`, o.label ?? '{str:talk}']); if (o.sub) out.push([`nodes.${id}.${o.id}.sub`, o.sub]); }
  }
  for (const q of t.ask?.questions || []) out.push([`ask.${q.id}.q`, q.q]);
  if (t.summary?.subject) out.push(['summary.subject', t.summary.subject]);
  for (const { where, line } of allLines(t)) { if (line.text) out.push([`${where}.text`, line.text]); if (line.say) out.push([`${where}.say`, line.say]); }
  return out;
}
// The node ids a Next can reach, routes expanded (written here independently of the lint).
function targetsOf(t, n, seen = new Set()) {
  if (n == null) return [];
  if (typeof n === 'string') {
    if (!n.startsWith('=')) return [n];
    if (seen.has(n)) return [];
    seen.add(n);
    return targetsOf(t, t.routes?.[n.slice(1)], seen);
  }
  return Array.isArray(n) ? n.flatMap((b) => targetsOf(t, b.go, seen)) : [];
}
const edgesOf = (t, n) => [...targetsOf(t, n.next), ...(n.choice?.options || []).flatMap((o) => targetsOf(t, o.next))];
// Every Next written anywhere in the file, with where it sits.
function allNexts(t) {
  const out = [];
  for (const [id, n] of Object.entries(t.nodes)) {
    if (n.next != null) out.push([`nodes.${id}.next`, n.next]);
    for (const o of n.choice?.options || []) if (o.next !== undefined) out.push([`nodes.${id}.${o.id}.next`, o.next]);
  }
  for (const [name, r] of Object.entries(t.routes || {})) out.push([`routes.${name}`, r]);
  for (const q of t.ask?.questions || []) if (q.goto) out.push([`ask.${q.id}.goto`, q.goto]);
  return out;
}

test.describe('tour manifest (no browser)', () => {
  test('T-01 the manifest carries the tour flag and the guide; the tour stays off until the gate is approved', () => {
    expect(m.tour.manifest).toBe('content/tour.json');
    expect(m.tour.voiceBase).toBe('media/voice/');
    expect(['pending', 'approved']).toContain(m.tour.gate);
    // Two guides (O12): Avi leads until the visitor picks; both voices are ElevenLabs voices.
    expect(Object.keys(m.guide.guides)).toEqual(['avi', 'huey']);
    expect(m.guide.lead).toBe('avi');
    expect(m.guide.guides.avi.name).toBe('Avi');
    expect(m.guide.guides.huey.name).toBe('Huey');
    expect(m.guide.guides.avi.voice).toMatchObject({ provider: 'elevenlabs', name: 'PAdXflgOFROGTlJEdlSu' });
    expect(m.guide.guides.huey.voice).toMatchObject({ provider: 'elevenlabs', name: 'd9DA0yC1x1RCfpwZPDMM' });
    expect(isStr(m.guide.title)).toBe(true);
    expect(m.guide.disclosure, 'the guides say their voices are synthetic').toMatch(/synthetic/i);
    expect(m.guide.voice).toEqual({ locale: 'en-US', rate: 0, required: m.guide.voice.required });
    expect(typeof m.guide.voice.required).toBe('boolean');
    if (!fs.existsSync(path.join(ROOT, m.tour.voiceBase, 'manifest.json'))) expect(m.guide.voice.required, 'no audio yet, so the voice cannot be required').toBe(false);
    // The tour and guide settings stay out of the visible-string checks; the guide's words do not.
    const r = lintManifest(m, g);
    expect(r.errors).toEqual([]);
  });

  for (const [file, t] of FILES) {
    test(`T-01 ${file}: start, chapter entries and every target resolve; every node is reachable; no loop without a choice`, () => {
      const ids = Object.keys(t.nodes);
      expect(t.nodes[t.start], 'start').toBeTruthy();
      const chapterIds = t.chapters.map((c) => c.id);
      for (const c of t.chapters) expect(t.nodes[c.entry], `chapter ${c.id} entry ${c.entry}`).toBeTruthy();
      for (const [id, n] of Object.entries(t.nodes)) expect(chapterIds, `node ${id} chapter`).toContain(n.chapter);
      for (const [where, n] of allNexts(t)) {
        for (const s of [].concat(Array.isArray(n) ? n.map((b) => b.go) : n)) {
          if (s.startsWith('=')) expect(t.routes?.[s.slice(1)], `${where} → ${s}`).toBeTruthy();
          else expect(t.nodes[s], `${where} → ${s}`).toBeTruthy();
        }
        if (Array.isArray(n)) expect(n.at(-1).when, `${where}: the last branch is unconditional`).toBeUndefined();
      }
      for (const [id, n] of Object.entries(t.nodes)) expect(!!n.choice || n.next != null || n.end === true, `node ${id} leads somewhere`).toBe(true);
      // Reachable from the start, the map (chapter entries) or an Ask goto.
      const reached = new Set();
      const queue = [t.start, ...t.chapters.map((c) => c.entry), ...(t.ask?.questions || []).map((q) => q.goto).filter(Boolean)];
      while (queue.length) { const id = queue.shift(); if (reached.has(id)) continue; reached.add(id); queue.push(...edgesOf(t, t.nodes[id])); }
      expect(ids.filter((id) => !reached.has(id)), 'unreachable nodes').toEqual([]);
      // Following `next` from any node without a choice must reach a choice or an end.
      for (const id of ids.filter((x) => !t.nodes[x].choice)) {
        const seen = new Set([id]);
        const walk = (x) => { for (const y of targetsOf(t, t.nodes[x].next)) { if (t.nodes[y].choice) continue; expect(seen.has(y), `a loop without a choice through ${id} and ${y}`).toBe(false); seen.add(y); walk(y); seen.delete(y); } };
        walk(id);
      }
    });

    test(`T-01 ${file}: scenes, cues, choices of at most 4 options, one of next or action, unique ids, allowed statuses`, () => {
      for (const [id, n] of Object.entries(t.nodes)) {
        expect(id).toMatch(ID);
        const sc = sceneOf(n);
        expect(SCENES, `${id} scene`).toContain(sc.kind);
        if (['door', 'station'].includes(sc.kind)) expect([...DOORS, '@'], `${id} door`).toContain(sc.door);
        // `@` is the door whose scene is up, so a station scene through it must exist in every door.
        const doorsOf = (d) => (d === '@' ? DOORS : [d]);
        if (sc.kind === 'station') for (const d of doorsOf(sc.door)) expect(doorById(d).stations, `${id} station (${d})`).toContain(sc.station);
        if (sc.kind === 'path' && sc.stage) expect([...STAGES, 'where-to-start'], `${id} stage`).toContain(sc.stage);
        for (const l of n.lines) {
          if (l.cue?.station) { expect(['door', 'station', 'keep'], `${id} station cue`).toContain(sc.kind); if (sc.kind !== 'keep') for (const d of doorsOf(sc.door)) expect(doorById(d).stations, `${id} station cue (${d})`).toContain(l.cue.station); }
          if (l.cue?.stage) { expect(['path', 'keep'], `${id} stage cue`).toContain(sc.kind); expect([...STAGES, 'where-to-start']).toContain(l.cue.stage); }
          if (l.cue?.door) { expect(['rest', 'keep'], `${id} door cue`).toContain(sc.kind); expect(DOORS).toContain(l.cue.door); }
        }
        if (!n.choice) continue;
        const opts = n.choice.options;
        expect(opts.length, `${id} options`).toBeGreaterThan(0);
        expect(opts.length, `${id} options`).toBeLessThanOrEqual(4);
        expect(new Set(opts.map((o) => o.id)).size, `${id} option ids`).toBe(opts.length);
        for (const o of opts) {
          expect(o.id).toMatch(ID);
          expect((o.next !== undefined) !== (o.action !== undefined), `${id}.${o.id}: one of next or action`).toBe(true);
          if (o.action) expect(ACTIONS).toContain(o.action);
          expect(isStr(o.label) || o.action === 'talk', `${id}.${o.id} label`).toBe(true);
        }
      }
      const lineIds = allLines(t).map(({ line }) => line.id);
      for (const lid of lineIds) expect(lid).toMatch(ID);
      expect(new Set(lineIds).size, 'line ids are unique across the file (voice files are named by them)').toBe(lineIds.length);
      for (const { where, line, question } of allLines(t)) {
        expect((line.ref !== undefined) !== (line.text !== undefined), `${where}: one of text or ref`).toBe(true);
        if (line.text !== undefined) {
          expect(isStr(line.source ?? question?.source), `${where} source`).toBe(true);
          expect(STATUSES, `${where} status`).toContain(line.status ?? question?.status);
        }
      }
      expect(t.ask.questions.length).toBeGreaterThanOrEqual(2);
      for (const q of t.ask.questions) {
        expect(q.id).toMatch(ID);
        for (const line of q.lines) {
          const r = resolveLine(line, m, {});
          expect(isStr(r?.source ?? line.source ?? q.source) && isStr(r?.status ?? line.status ?? q.status), `ask ${q.id}/${line.id} has a source and a status`).toBe(true);
        }
      }
    });
  }

  test('T-01 the fixture covers every scene kind, cue kind, when, suggest, hideWhen, routes, @ and every action; the skeleton covers every scene kind', () => {
    const kinds = (t) => new Set(Object.values(t.nodes).map((n) => sceneOf(n).kind));
    expect([...kinds(TOUR)].sort()).toEqual([...SCENES].sort());
    expect([...kinds(FIXTURE)].sort()).toEqual([...SCENES].sort());
    const nodes = Object.values(FIXTURE.nodes);
    const lines = nodes.flatMap((n) => n.lines);
    const opts = nodes.flatMap((n) => n.choice?.options || []);
    expect(new Set(lines.flatMap((l) => Object.keys(l.cue || {})))).toEqual(new Set(['station', 'stage', 'door']));
    expect(lines.some((l) => l.when), 'a line filtered by when').toBe(true);
    expect(lines.some((l) => l.callout), 'a callout').toBe(true);
    expect(lines.some((l) => /@/.test(l.ref || '')), 'a ref through @').toBe(true);
    expect(opts.some((o) => o.suggest), 'suggest').toBe(true);
    expect(opts.some((o) => o.hideWhen), 'hideWhen').toBe(true);
    expect(opts.some((o) => o.value === undefined && typeof o.next === 'string' && o.next.startsWith('=')), 'a route from an option').toBe(true);
    expect(nodes.some((n) => typeof n.next === 'string' && n.next.startsWith('=')), 'a route from next').toBe(true);
    expect(Object.values(FIXTURE.routes).some((r) => targetsOf(FIXTURE, r).length && JSON.stringify(r).includes('"go":"=')), 'a route chaining into another').toBe(true);
    expect(new Set(opts.map((o) => o.action).filter(Boolean))).toEqual(new Set(ACTIONS));
    expect(nodes.some((n) => sceneOf(n).kind === 'path' && !sceneOf(n).stage) && nodes.some((n) => sceneOf(n).stage === 'where-to-start'), 'path with no stage and at where-to-start').toBe(true);
    expect(FIXTURE.summary.lines.length).toBeGreaterThan(0);
  });

  test('T-02 tools/check-manifest.js reports 0 errors for the manifest and content/tour.json; lines without audio are a warning', () => {
    const r = node([path.join(ROOT, 'tools/check-manifest.js')]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/^content\/experience\.json: 0 errors/m);
    expect(r.stdout).toMatch(/^content\/tour\.json: 0 errors, \d+ warnings, \d+ visible strings checked, \d+ nodes, \d+ lines$/m);
    if (!fs.existsSync(path.join(ROOT, m.tour.voiceBase, 'manifest.json'))) expect(r.stderr).toMatch(/^warn: content\/tour\.json: voice: .*captions-only/m);
    expect(r.stderr).not.toMatch(/^error:/m);
  });

  test('T-02 the fixture lints clean against the live manifest (--tour)', () => {
    const r = node([path.join(ROOT, 'tools/check-manifest.js'), '--tour', FIXTURE_FILE]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/^tests\/fixtures\/tour-min\.json: 0 errors/m);
    expect(lintTour(FIXTURE, m, { file: FIXTURE_FILE }).errors).toEqual([]);
    expect(lintTour(TOUR, m).errors).toEqual([]);
  });

  test('T-02 the lint refuses a script that breaks a rule', () => {
    const say = (text, extra = {}) => (t) => t.nodes.arrive.lines.push({ id: 'probe', text, source: 'probe source', status: 'proposed', ...extra });
    const cases = [
      ['typed door title', say(`Welcome to ${m.doors[0].title}.`), /typed door title/],
      ['typed buyer label, any case', say(`This room is for ${m.doors[1].icp.toLowerCase()}.`), /typed buyer label/],
      ['typed stage name', say(`Start with ${m.stages[0].name}.`), /typed stage name/],
      ['a percentage typed in', say('Most teams cut prep by 60% or more.'), /figure "60%" typed/],
      ['a spelled-out percentage', say('Sixty-one percent were required to certify.'), /figure .* typed/],
      ['a spelled-out duration', say('The Snapshot answers them in ten business days.'), /figure "ten business days" typed/],
      ['a figure brought in by a token', say('{ref:doors.win-trust.stat}'), /figure .* enters through \{ref:doors\.win-trust\.stat\}/],
      ['an unknown token', say('{price:snapshot}'), /unknown token \{price:snapshot\}/],
      ['a token that does not resolve', say('{door:win-trust.nope}'), /\{door:win-trust\.nope\} does not resolve/],
      ['a text line with no source', (t) => t.nodes.arrive.lines.push({ id: 'probe', text: '{str:legend}' }), /needs a source and a status/],
      ['a status outside the list', say('{str:legend}', { status: 'owner-copy' }), /status "owner-copy"/],
      ['forbidden vocabulary', say(`Better than ${m.vocabulary.forbidden[0]}.`), /forbidden/],
      ['brand spelling', say('3Hue runs the program.'), /brand must be written 3HUE/],
      ['a ref that does not resolve', (t) => { t.nodes.wt.lines[0].ref = 'doors.win-trust.nope'; }, /ref doors\.win-trust\.nope does not resolve/],
      ['a ref no visitor reads', (t) => { t.nodes.wt.lines[0].ref = 'site.bookingUrl'; }, /which no visitor reads/],
      ['both text and ref', (t) => { t.nodes.wt.lines[0].text = '{str:legend}'; }, /exactly one of text or ref/],
      ['a duplicate line id', (t) => { t.nodes.gc.lines[0].id = 'wt-1'; }, /line id wt-1 is also used/],
      ['an unknown node', (t) => { t.nodes.wt.next = 'nowhere'; }, /unknown node nowhere/],
      ['an unknown route', (t) => { t.nodes.gc.choice.options[0].next = '=nope'; }, /unknown route =nope/],
      ['an unreachable node', (t) => { t.nodes.orphan = { chapter: 'close', scene: 'rest', lines: [{ id: 'orphan-1', ref: 'lobby.eyebrow' }], end: true }; }, /nodes\.orphan: unreachable/],
      ['a loop without a choice', (t) => { t.nodes.kiosk.next = 'stage-assess'; }, /a loop with no choice/],
      ['a dead end', (t) => { delete t.nodes.kiosk.next; }, /dead end/],
      ['five options', (t) => { t.nodes.close.choice.options.push({ id: 'fifth', label: '{str:legend}', next: 'arrive' }); }, /5 options; at most 4/],
      ['both next and action', (t) => { t.nodes.close.choice.options[1].next = 'arrive'; }, /exactly one of next or action/],
      ['an unknown action', (t) => { t.nodes.close.choice.options[1].action = 'buy'; }, /unknown action buy/],
      ['a label over 90 characters once filled', (t) => { t.nodes.close.choice.options[1].label = '{door:stay-ready.audience}'; }, /characters once filled; at most 90/],
      ['a sub-label over 60 characters once filled', (t) => { t.nodes.close.choice.options[1].sub = '{door:win-trust.triggers.1}'; }, /characters once filled; at most 60/],
      ['a conditional last branch', (t) => { t.routes['after-path'][1].when = { visited: ['path'] }; }, /last branch must have no when/],
      ['routes that lead back to themselves', (t) => { t.routes.a = '=b'; t.routes.b = '=a'; }, /routes lead back to themselves/],
      ['a condition on a value no option stores', (t) => { t.nodes.lens.choice.options[0].suggest = { answers: { segment: ['everyone'] } }; }, /no option stores "everyone"/],
      ['a condition on an unknown chapter', (t) => { t.nodes.lens.choice.options[1].hideWhen = { visited: ['door-nope'] }; }, /unknown chapter door-nope/],
      ['an unknown door', (t) => { t.nodes.wt.scene = { kind: 'door', door: 'nope' }; }, /unknown door nope/],
      ['a station the door does not have', (t) => { t.nodes['wt-proof'].scene.station = 'lobby'; }, /station lobby is not in win-trust/],
      ['a station cue on a path scene', (t) => { t.nodes.path.lines[0].cue = { station: 'proof' }; }, /station cue needs a door or station scene/],
      ['an Ask answer with no source', (t) => { t.ask.questions[1].lines.push({ id: 'ask-probe', ref: 'doors.win-trust.triggers.0' }); }, /Ask answer needs a source and a status/],
      ['UI strings in the tour file', (t) => { t.strings = { next: 'Next' }; }, /strings: lives in content\/experience\.json/],
    ];
    expect(lintTour(clone(FIXTURE), m).errors, 'the unmodified fixture').toEqual([]);
    const missed = [];
    for (const [name, mutate, re] of cases) {
      const t = clone(FIXTURE);
      mutate(t);
      const { errors } = lintTour(t, m, { file: 'probe.json' });
      if (!errors.some((e) => re.test(e))) missed.push(`${name}: expected ${re}, got ${JSON.stringify(errors)}`);
    }
    expect(missed).toEqual([]);
  });

  test('T-02 the lint refuses a malformed tour flag or guide', () => {
    const cases = [
      [(x) => { x.tour.gate = 'open'; }, /tour\.gate must be "pending" or "approved"/],
      [(x) => { x.tour.manifest = 'https://example.com/tour.json'; }, /tour\.manifest must be a repo-relative/],
      [(x) => { x.tour.voiceBase = 'media/voice'; }, /tour\.voiceBase must be a repo-relative directory/],
      [(x) => { x.guide.disclosure = ''; }, /guide\.disclosure must be a non-empty string/],
      [(x) => { x.guide.voice.required = 'no'; }, /guide\.voice\.required must be true or false/],
      [(x) => { delete x.guide; }, /tour needs a guide block/],
      [(x) => { x.guide.lead = 'ava'; }, /guide\.lead must name a guide/],
      [(x) => { x.guide.guides.huey.name = 'Avi'; }, /two guides share a name/],
      [(x) => { delete x.guide.guides.huey.voice.name; }, /guide\.guides\.huey\.voice\.name must be a non-empty string/],
      [(x) => { x.guide.guides.title = { name: 'X', voice: { provider: 'azure', name: 'x' } }; }, /cannot be a guide id/],
      [(x) => { x.guide.name = 'AiVRIC'; }, /each guide carries its own name/],
    ];
    for (const [mutate, re] of cases) {
      const x = clone(m);
      mutate(x);
      const { errors } = lintManifest(x, g);
      expect(errors.some((e) => re.test(e)), `${re} in ${JSON.stringify(errors)}`).toBe(true);
    }
  });

  test('T-02 figures: digits with a unit or symbol and spelled-out quantities count; counts on screen and framework names do not', () => {
    for (const s of ['61% were required', '$25B AUM', '1,000+ systems', 'up to 50+ tools', 'a 10-business-day diagnostic', 'in 6 months', 'sixty-one percent', 'in ten business days', 'under thirty minutes', 'nine hundred', 'one in five firms', 'half of boards', 'with zero findings', 'saves 3x']) {
      expect(figures(s), s).not.toEqual([]);
    }
    for (const s of ['Three doors, one path', 'It runs in three moves.', 'Four questions matter.', 'SOC 2 Type II', 'ISO 27001 and ISO 27701', 'NIST CSF 2.0, 800-53/171', '3HUE', 'https://3hue.net/contact.html', 'zero trust', 'the first real incident']) {
      expect(figures(s), s).toEqual([]);
    }
    // Every figure in the manifest sits in a field that prints its source, so a ref can carry it.
    for (const [file, t] of FILES) for (const { where, line } of allLines(t)) {
      if (!line.ref) continue;
      for (const ctx of line.ref.includes('@') ? DOOR_CTXS : [{}]) {
        const r = resolveRef(m, line.ref, ctx);
        if (figures(r.text).length) expect(isStr(r.source) && isStr(r.status), `${file} ${where}: ${line.ref} prints its source`).toBe(true);
      }
    }
  });

  for (const [file, t] of FILES) {
    test(`T-03 ${file}: the arrival choice resolves to the O1 buyer labels in door order, each leading to its own door`, () => {
      const arrive = t.nodes[t.start];
      expect(sceneOf(arrive).kind).toBe('rest');
      const opts = arrive.choice.options.slice(0, 3);
      expect(opts.map((o) => fillTemplate(o.label, m))).toEqual(O1);
      expect(opts.map((o) => fillTemplate(o.label, m))).toEqual(m.doors.map((d) => d.icp));
      expect(opts.map((o) => fillTemplate(o.sub, m))).toEqual(m.doors.map((d) => `${d.title} · ${d.promise}`));
      expect(opts.map((o) => sceneOf(t.nodes[o.next]))).toEqual(m.doors.map((d) => ({ kind: 'door', door: d.id })));
      expect(opts.map((o) => optionValue(o))).toEqual(DOORS);
      // No name is typed anywhere: every template filled for every door keeps no unresolved token.
      for (const [where, tpl] of allTemplates(t)) {
        for (const tk of templateTokens(tpl)) expect(tk.runtime || DOOR_CTXS.every((ctx) => fillTemplate(tk.raw, m, ctx) !== tk.raw), `${where}: ${tk.raw}`).toBe(true);
      }
      for (const { where, line } of allLines(t)) for (const ctx of DOOR_CTXS) expect(isStr(resolveLine(line, m, ctx)?.text) || /^\{(answer|chapters):/.test(line.text || ''), `${where} resolves for ${ctx.door}`).toBe(true);
    });
  }

  test('T-03 refs resolve with the source and status printed beside them; tokens fill from the manifest; @ follows the door', () => {
    const [wt, gc, sr] = m.doors;
    expect(resolveRef(m, 'doors.win-trust.stat')).toEqual({ text: wt.stat.text, source: wt.stat.source, status: wt.stat.status, path: 'doors.win-trust.stat' });
    expect(resolveRef(m, 'doors.win-trust.program.start')).toMatchObject({ text: wt.program.start, source: wt.program.source, status: wt.program.status });
    expect(resolveRef(m, 'doors.gain-control.proof[0]')).toMatchObject({ text: gc.proof[0].text, source: gc.proof[0].basis, status: gc.proof[0].status, path: 'doors.gain-control.proof.0' });
    expect(resolveRef(m, 'doors.win-trust.triggers.0')).toMatchObject({ text: wt.triggers[0], source: null, status: null });
    expect(resolveRef(m, 'path.whereToStart')).toMatchObject({ text: m.path.whereToStart.lead, source: m.path.whereToStart.source });
    expect(resolveRef(m, 'stages.assess')?.text).toBe(m.stages[0].name);
    expect(resolveRef(m, 'lobby.heading')?.text).toBe(m.lobby.heading.join(' '));
    expect(resolveRef(m, 'doors.win-trust.number')?.text).toBe(String(wt.number));
    expect(resolveRef(m, 'doors.@.title', { door: 'stay-ready' })).toMatchObject({ text: sr.title, path: 'doors.stay-ready.title' });
    expect(resolveRef(m, 'doors.@.title')).toBeNull();
    expect(resolveRef(m, 'doors.win-trust')).toBeNull();
    expect(resolveRef(m, 'nope.nothing')).toBeNull();

    expect(fillTemplate('{door:win-trust.title} · {door:win-trust.promise}', m)).toBe(`${wt.title} · ${wt.promise}`);
    expect(fillTemplate('{door:@.icp}', m, { door: 'gain-control' })).toBe(gc.icp);
    expect(fillTemplate('{stage:assess}', m)).toBe(m.stages[0].name);
    expect(fillTemplate('{stage:where-to-start}', m)).toBe(m.strings.whereToStart);
    expect(fillTemplate('{str:talk}', m)).toBe(m.strings.talk);
    expect(fillTemplate('{guide} · {guide:title}', m)).toBe(`Avi · ${m.guide.title}`);
    expect(fillTemplate('{guide} · {guide:title}', m, { guide: 'huey' }), 'the speaker').toBe(`Huey · ${m.guide.title}`);
    expect(fillTemplate('{guide:huey}, {guide:avi}', m, { guide: 'huey' }), 'a named guide').toBe('Huey, Avi');
    expect(fillTemplate('{guide:nobody.name}', m), 'an unknown guide stays visible').toBe('{guide:nobody.name}');
    expect(fillTemplate('{url:booking}', m)).toBe(m.site.bookingUrl);
    expect(fillTemplate('{ref:path.title}', m)).toBe(m.path.title);
    expect(fillTemplate('{door:nope.title}', m), 'a static token that does not resolve stays visible').toBe('{door:nope.title}');
    expect(fillTemplate('[{answer:segment}]', m), 'a runtime token with nothing to show is empty').toBe('[]');
    expect(fillTemplate('{answer:segment}', m, { answers: { segment: 'win-trust' } })).toBe('win-trust');
    expect(fillTemplate('{answer:segment}', m, { answers: { segment: 'win-trust' }, chosen: { segment: wt.icp } })).toBe(wt.icp);
    expect(fillTemplate('{chapters:visited}', m, { tour: FIXTURE, visited: ['arrival', 'door-win-trust'] })).toBe(`${m.strings.legend}, ${wt.title}`);
    expect(templateTokens('{str:talk} and {answer:today}')).toEqual([{ raw: '{str:talk}', kind: 'str', arg: 'talk', runtime: false }, { raw: '{answer:today}', kind: 'answer', arg: 'today', runtime: true }]);
    expect(resolveLine({ id: 'x', ref: 'doors.@.decision' }, m, { door: 'win-trust' })).toEqual({ id: 'x', text: wt.decision, source: null, status: null, ref: 'doors.win-trust.decision' });
    expect(resolveLine({ id: 'y', text: '{str:talk}: {url:booking}', source: 's', status: 'derived' }, m)).toEqual({ id: 'y', text: `${m.strings.talk}: ${m.site.bookingUrl}`, source: 's', status: 'derived', ref: null });
  });

  test('T-03 conditions and next targets', () => {
    expect(matches(undefined)).toBe(true);
    expect(matches({})).toBe(true);
    expect(matches({ answers: { segment: ['all'] } }, { answers: { segment: 'all' } })).toBe(true);
    expect(matches({ answers: { segment: 'all' } }, { answers: { segment: 'all' } })).toBe(true);
    expect(matches({ answers: { segment: ['all'] } }, { answers: { segment: 'win-trust' } })).toBe(false);
    expect(matches({ visited: ['a', 'b'] }, { visited: ['a'] })).toBe(false);
    expect(matches({ visited: ['a', 'b'] }, { visited: ['b', 'a'] })).toBe(true);
    expect(matches({ notVisited: ['a'] }, { visited: ['a'] })).toBe(false);
    expect(matches({ answers: { segment: ['all'] }, visited: ['a'] }, { answers: { segment: 'all' }, visited: [] }), 'every clause must hold').toBe(false);
    expect(matches([{ answers: { segment: ['x'] } }, { visited: ['a'] }], { visited: ['a'] }), 'a list matches when any one does').toBe(true);

    const T = FIXTURE;
    expect(resolveNext('close', {}, T)).toBe('close');
    expect(resolveNext('=next-door', { visited: [] }, T)).toBe('wt');
    expect(resolveNext('=next-door', { visited: ['door-win-trust'] }, T)).toBe('gc');
    expect(resolveNext('=next-door', { visited: ['door-win-trust', 'door-gain-control', 'door-stay-ready'] }, T)).toBe('path');
    expect(resolveNext('=after-door', { answers: { segment: 'all' }, visited: ['door-win-trust'] }, T), 'a route chaining into another').toBe('gc');
    expect(resolveNext('=after-door', { answers: { segment: 'win-trust' }, visited: ['door-win-trust'] }, T)).toBe('lens');
    expect(resolveNext('=after-door', { answers: { segment: 'all' }, visited: [] , tour: T })).toBe('wt');
    expect(resolveNext('=nope', {}, T)).toBeNull();
    expect(resolveNext('=a', {}, { routes: { a: '=b', b: '=a' } }), 'a route loop gives up').toBeNull();
    expect(resolveNext([{ when: { visited: ['x'] }, go: 'a' }], {}, T), 'no branch matched').toBeNull();
  });

  test('T-03 caption tokens carry character offsets; the line hash is SHA-256 of NFC text and say', async () => {
    const s = 'Hello, world — 3HUE.';
    const tk = tokens(s);
    expect(tk.map((x) => x.text)).toEqual(['Hello,', 'world', '—', '3HUE.']);
    expect(tk.map((x) => x.word)).toEqual(['Hello', 'world', '', '3HUE']);
    for (const x of tk) expect(s.slice(x.start, x.end)).toBe(x.text);
    expect(tokens('')).toEqual([]);

    const h = await hashLine('Proof by Friday.');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(h).toBe(createHash('sha256').update('Proof by Friday.\u0000').digest('hex').slice(0, 16));
    expect(await hashLine('Proof by Friday.')).toBe(h);
    expect(await hashLine('Proof by Friday.', 'Proof by Friday')).not.toBe(h);
    expect(await hashLine('Proof by Friday!')).not.toBe(h);
    expect(await hashLine('Cafe\u0301'), 'NFC: a decomposed accent hashes like the composed one').toBe(await hashLine('Caf\u00e9'));
  });

  test('T-03 a renamed door title follows the manifest into every tour label; the old title is typed nowhere', () => {
    const renamed = clone(m);
    const OLD = m.doors[0].title, NEW = `${OLD} Two`;
    renamed.doors[0].title = NEW;
    for (const [file, t] of FILES) {
      expect(lintTour(t, renamed, { file }).errors).toEqual([]);
      const shown = [];
      for (const [, tpl] of allTemplates(t)) for (const ctx of DOOR_CTXS) shown.push(fillTemplate(tpl, renamed, { ...ctx, tour: t }));
      for (const { line } of allLines(t)) for (const ctx of DOOR_CTXS) shown.push(resolveLine(line, renamed, ctx)?.text ?? '');
      expect(shown.some((x) => x.includes(NEW)), `${file} shows the new title`).toBe(true);
      expect(shown.filter((x) => x.split(NEW).join('').includes(OLD)), `${file}: the old title survives nowhere`).toEqual([]);
    }
  });
});
