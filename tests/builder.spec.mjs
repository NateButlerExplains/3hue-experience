// O15: the quote builder is the catalog of record. content/builder-names.json carries names only,
// pinned to the 2026-09-09 capture; every family, example, offer, package and program name the
// manifest uses is on it and not a draft; a held name stands only as a program; each door's starts
// cover its triggers plus "early", match the plan and obey the Builder's overlaps; nothing on an
// offer or program is price-, rate- or hour-shaped; Learn more opens only the allowlisted 3hue.net
// pages; and the lint (manifest and tour) refuses each broken rule. No browser.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { manifest as m, geometry as g, readJson, DOORS, doorById } from './helpers.mjs';
import { lintManifest, lintBuilder, lintTour, figures, learnMoreProblem, LEARN_MORE_PATHS, PRICEY, BUILDER_NAMES } from '../tools/check-manifest.js';
import { offerId, buildNames, formatNames, DEFAULT_DIR, CAPTURE } from '../tools/builder-names.mjs';

const B = readJson(BUILDER_NAMES);
const TOUR = readJson(m.tour.manifest);
const clone = (x) => structuredClone(x);
const SERVICES = new Map(B.services.map((s) => [s.name, s]));
const PACKAGES = new Set(B.packages.map((p) => p.name));
const CATEGORIES = new Set(B.categories);
const DRAFT = new Set([...B.draft.services, ...B.draft.categories]);
const HELD = new Set(B.services.filter((s) => s.held).map((s) => s.name));
const offerByName = new Map(Object.entries(m.offers).map(([id, o]) => [o.name, id]));
const CODE = /\b[A-Z]{2,}(?:-[A-Z0-9]+){2,}\b/;   // a Builder code such as ISG-GRC-RMP-IRA-26-S01

// The ids the tour script names offers by (agreed with the tour's author), and the Builder item each
// one is. The tour writes {offer:<id>}, so these must not drift.
const CONTRACT = {
  'soc-2-readiness': 'SOC 2 Readiness', 'iso-27001-readiness': 'ISO 27001 Certification Readiness', 'iso-27701-readiness': 'ISO 27701 Privacy Readiness', 'pci-dss-readiness': 'PCI-DSS Readiness', 'ir-fast-start': 'Incident Response Fast Start', 'privacy-leadership-launch': 'Privacy Leadership Launch', 'mxdr-complete': 'MXDR Complete Protection',
  'initial-risk-assessment': 'Initial Risk Assessment', 'controls-gap-assessment': 'Periodic Controls Gap Assessment', 'risk-register-poam': 'Manage Risk Register & POA&M', 'rfp-response': 'RFP Response Services', 'ai-governance-advisory': 'AI Governance & Privacy Advisory', 'bod-reporting': 'BOD / Investor Performance Reporting', 'risk-committee-update': 'Risk Committee Posture Update',
  'managed-rmp': 'Managed Risk Management Program', 'managed-isp': 'Managed Information Security & Privacy Management', 'managed-cirp': 'Managed Cyber-Incident Response Program', 'managed-vcp': 'Managed Vendor Compliance Program (VCP)', 'bcp-development': 'Business Continuity Plan Development', 'incident-command': 'Incident Command & Emergency Response Leadership', 'security-engineering': 'Security Engineering Services', 'ciso-support': 'CISO Support',
  'is-program-review': 'IS Program CONOPS Review & Update', 'soa-review': 'SoA Review & Update', 'rmp-review': 'RMP CONOPS Review & Update', 'annual-risk-update': 'Annual Risk Assessment Update', 'cirp-review': 'CIRP Review & Update', 'bcp-review': 'BCP Review & Updates',
  'ir-plan': 'Cyber-Incident Response Plan Development', 'ir-playbook': 'IR Playbook Development', 'ir-ttx': 'Cyber-IR Tabletop Exercise (TTX)', 'ir-ops-command': 'Cyber-IR Operations Command', 'privacy-maturity': 'Privacy Program Maturity & Risk Assessment', 'cpo-service': 'CPO-as-a-Service', 'managed-privacy': 'Managed Privacy Program', 'written-policies': 'Written IS Policies & Standards', 'audit-support': 'Audit Support & Liaison Services', 'security-analytics': 'Security Data Analytics & Reporting Development', 'contract-reviews': 'Security Terms & Conditions Contract Reviews',
};
const PROGRAM_IDS = ['isp', 'rmp', 'cirp', 'vcp', 'vciso', 'sea', 'soc', 'grc', 'scs'];
const PAGE_KEYS = ['about', 'contact', 'security-compliance', 'isg-programs', 'operations', 'cirp', 'risk-posture', 'cloudsignals', 'frameworks', 'saas', 'private-equity', 'financial-services', 'transit-story', 'bank-story', 'ai-governance'];

// The plan's starts (tour v2 plan, step 2), by door and trigger key: what each start leads with.
const PLAN = {
  'win-trust': {
    deal: { trigger: 0, lead: 'soc-2-readiness', alt: 'iso-27001-readiness', then: ['managed-isp'] },
    evidence: { trigger: 1, lead: 'initial-risk-assessment', with: ['rfp-response'], then: ['managed-isp'] },
    scope: { trigger: 2, lead: 'isms-scope-soa-development', alt: 'iso-27001-readiness', with: ['system-security-privacy-plan-sspp-development'], then: ['managed-isp'] },
    early: { trigger: null, lead: 'initial-risk-assessment' },
  },
  'gain-control': {
    crossing: { trigger: 0, lead: 'privacy-leadership-launch', with: ['data-mapping-data-inventory', 'regulator-liaison-dsar-escalation-support'] },
    ai: { trigger: 1, lead: 'ai-governance-advisory', with: ['security-architecture-reviews', 'secure-sdlc-program-development', 'vulnerability-management-program-development'], then: ['security-engineering'] },
    vendors: { trigger: 2, lead: 'managed-vcp', with: ['asset-governance-program-development', 'audit-support'], then: ['vcp-additional-vendor-monitoring-5-vendor-block'] },
    early: { trigger: null, lead: 'data-mapping-data-inventory' },
  },
  'stay-ready': {
    exam: { trigger: 0, lead: 'controls-gap-assessment', with: ['risk-register-poam'], then: ['managed-rmp'] },
    incident: { trigger: 1, lead: 'ir-fast-start', with: ['bcp-development'], live: 'incident-command', then: ['managed-cirp', 'mxdr-complete'] },
    detect: { trigger: 2, lead: 'mxdr-complete', alt: 'mxdr-starter' },
    early: { trigger: null, lead: 'controls-gap-assessment' },
  },
};
const RINGS = { 'win-trust': { deal: ['assess', 'strengthen'], evidence: ['assess'], scope: ['strengthen'] }, 'gain-control': { crossing: ['assess', 'operate'], ai: ['strengthen'], vendors: ['operate'] }, 'stay-ready': { exam: ['operate'], incident: ['strengthen'], detect: ['operate'] } };

test.describe('quote builder names (O15, no browser)', () => {
  test('content/builder-names.json is names only, pinned to the 2026-09-09 capture', () => {
    expect(B.capture).toBe(CAPTURE);
    expect(B.source).toMatch(/solution-builder-catalog-2026-09-09\/catalog\.json sha256:[0-9a-f]{64}$/);
    expect(B.packagesSource).toMatch(/solution-builder-catalog-2026-09-09\/packages\.md sha256:[0-9a-f]{64}$/);
    expect(B.packages.map((p) => p.name)).toEqual(['SOC 2 Readiness', 'ISO 27001 Certification Readiness', 'ISO 27701 Privacy Readiness', 'PCI-DSS Readiness', 'Incident Response Fast Start', 'Privacy Leadership Launch', 'MXDR Complete Protection']);
    expect([...HELD].sort(), 'the [Confirm price] items are held').toEqual(['Fractional DPO — SOW & Retainer', 'Virtual CISO — Fractional', 'Virtual CISO — Support']);
    for (const s of B.services) {
      expect(Object.keys(s).every((k) => ['name', 'category', 'draft', 'held'].includes(k)), `${s.name}: names and category only`).toBe(true);
      expect(s.draft).toBe(false);
      expect(CATEGORIES.has(s.category)).toBe(true);
    }
    for (const p of B.packages) expect(Object.keys(p)).toEqual(['name']);
    expect(B.draft.services.length).toBeGreaterThan(0);
    for (const n of B.draft.services) expect(SERVICES.has(n), `${n} is a draft, so it is not on the services list`).toBe(false);
    for (const c of B.draft.categories) expect(CATEGORIES.has(c)).toBe(false);
    // No price, hour count or Builder code in any name, and none anywhere in the file. (A Builder name
    // may contain a word like "Rate", as in the unused category Standard Rate Card Services; the names
    // the site uses are held to the stricter word rule in the next tests.)
    const PRICE_VALUE = /[$€£]\s?\d|\b\d{1,3}(?:,\d{3})+\b|\b\d+(?:\.\d+)?\s*(?:hours?|hrs?)\b|\/\s?(?:hr|hour|mo|month|yr|year|node)\b/i;
    const names = [...B.categories, ...B.services.map((s) => s.name), ...B.packages.map((p) => p.name), ...B.draft.services, ...B.draft.categories];
    for (const n of names) { expect(PRICE_VALUE.test(n), `${n} carries a price or hours`).toBe(false); expect(CODE.test(n), `${n} looks like a code`).toBe(false); }
    const text = fs.readFileSync(path.resolve(BUILDER_NAMES), 'utf8');
    expect(text).not.toMatch(/[$€£]\s?\d|\b\d{1,3}(?:,\d{3})+\b|\bnode·/);
    expect(text).not.toMatch(CODE);
    // Every id made from a name is unique, so {offer:<id>} can never be ambiguous.
    const ids = [...B.services.map((s) => s.name), ...B.packages.map((p) => p.name)].map(offerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('the committed names match a fresh read of the capture (when the Market Intel checkout is present)', () => {
    test.skip(!fs.existsSync(path.join(DEFAULT_DIR, 'catalog.json')), `no capture at ${DEFAULT_DIR} (set BUILDER_CAPTURE)`);
    expect(fs.readFileSync(path.resolve(BUILDER_NAMES), 'utf8')).toBe(formatNames(buildNames(DEFAULT_DIR)));
  });

  test('every family, example, offer and program name is on the list, filed in its Builder category, and not a draft', () => {
    for (const d of m.doors) {
      // Three or four (tools/check-manifest.js:175): under the corrected shelf Win Trust and Gain
      // Control hold three distinctive families each, Stay Ready four.
      expect(d.serviceFamilies.length, `${d.id} lists three or four service families`).toBeGreaterThanOrEqual(3);
      expect(d.serviceFamilies.length, `${d.id} lists three or four service families`).toBeLessThanOrEqual(4);
      for (const f of d.serviceFamilies) {
        expect(CATEGORIES.has(f.name), `${d.id}: family "${f.name}" is a Builder category`).toBe(true);
        expect(DRAFT.has(f.name)).toBe(false);
        for (const e of f.examples) {
          expect(SERVICES.get(e)?.category, `${d.id}: "${e}" is a Builder item of ${f.name}`).toBe(f.name);
          expect(DRAFT.has(e) || HELD.has(e), `${d.id}: "${e}" is neither draft nor held`).toBe(false);
          expect(offerByName.has(e), `${d.id}: "${e}" has an offers entry`).toBe(true);
        }
      }
    }
    expect(offerByName.size, 'one offer per Builder name').toBe(Object.keys(m.offers).length);
    for (const [id, o] of Object.entries(m.offers)) {
      expect(DRAFT.has(o.name) || HELD.has(o.name), `offers.${id}: "${o.name}" is neither draft nor held`).toBe(false);
      if (o.kind === 'package') { expect(PACKAGES.has(o.name), `"${o.name}" is a Builder package`).toBe(true); expect(o.category).toBeUndefined(); }
      else { expect(o.kind).toBe('service'); expect(SERVICES.get(o.name)?.category, `"${o.name}" is a Builder service in ${o.category}`).toBe(o.category); }
      for (const c of o.contains || []) expect(m.offers[c]?.kind, `${id} contains ${c}`).toBe('service');
      if (o.contains) expect(typeof o.provenance === 'string' && o.provenance.length > 0, `${id}: inferred contents carry a note`).toBe(true);
    }
    for (const [id, p] of Object.entries(m.programs)) {
      if (p.name === null) { expect(p.held, `programs.${id}: no Builder item yet, so held`).toBe(true); continue; }
      expect(SERVICES.has(p.name) || PACKAGES.has(p.name) || CATEGORIES.has(p.name), `programs.${id}: "${p.name}" is a Builder name`).toBe(true);
      expect(DRAFT.has(p.name)).toBe(false);
      expect(CATEGORIES.has(p.category), `programs.${id}.category`).toBe(true);
      for (const x of [...p.build, ...p.run]) expect(m.offers[x], `programs.${id}: ${x} is an offer`).toBeTruthy();
    }
    // The site uses a name only through the offers list, so each door's panel names are all offers.
    for (const d of m.doors) for (const x of [...d.packages, ...d.programs.flatMap((p) => [...m.programs[p].build, ...m.programs[p].run])]) expect(m.offers[x], `${d.id}: ${x}`).toBeTruthy();
  });

  test('the ids the tour names offers, programs and pages by are the agreed ones, each on its Builder item', () => {
    for (const [id, name] of Object.entries(CONTRACT)) {
      expect(m.offers[id]?.name, `offers.${id}`).toBe(name);
      expect(SERVICES.has(name) || PACKAGES.has(name), `${name} is a non-draft Builder name`).toBe(true);
    }
    expect(Object.keys(m.programs).sort()).toEqual([...PROGRAM_IDS].sort());
    expect(Object.keys(m.site.learnMore.pages).sort()).toEqual([...PAGE_KEYS].sort());
    for (const d of m.doors) expect(Object.keys(d.starts).sort(), d.id).toEqual(Object.keys(PLAN[d.id]).sort());
  });

  test('held names stand only as program names, and the held programs are vCISO and Security Compliance Services', () => {
    for (const o of Object.values(m.offers)) expect(HELD.has(o.name), o.name).toBe(false);
    for (const d of m.doors) for (const f of d.serviceFamilies) for (const e of f.examples) expect(HELD.has(e), e).toBe(false);
    for (const p of Object.values(m.programs)) if (HELD.has(p.name)) expect(p.held).toBe(true);
    expect(Object.entries(m.programs).filter(([, p]) => p.held).map(([id]) => id).sort()).toEqual(['scs', 'vciso']);
    expect(HELD.has(m.programs.vciso.name), 'vCISO is named by a held Builder item').toBe(true);
    expect(m.programs.vciso.run).toContain('ciso-support');
    expect(m.programs.scs.name, 'no Builder item, so no name to show or voice').toBeNull();
  });

  test('nothing price-, rate- or hour-shaped in offers, programs, packages or Learn more labels', () => {
    const seen = [];
    const check = (where, s) => { if (typeof s !== 'string') return; seen.push(where); expect(figures(s), `${where}: ${s}`).toEqual([]); expect(PRICEY.test(s), `${where}: ${s}`).toBe(false); expect(CODE.test(s), `${where}: ${s}`).toBe(false); };
    for (const [id, o] of Object.entries(m.offers)) { check(`offers.${id}.name`, o.name); check(`offers.${id}.summary`, o.summary?.text); }
    for (const [id, p] of Object.entries(m.programs)) check(`programs.${id}.name`, p.name);
    for (const [k, p] of Object.entries(m.site.learnMore.pages)) check(`learnMore.${k}.label`, p.label);
    for (const k of ['packages', 'starts', 'programs', 'learnMore']) check(`strings.${k}`, m.strings[k]);
    for (const d of m.doors) for (const id of d.packages) expect(m.offers[id].summary?.text, `${d.id}: ${id} has a summary`).toBeTruthy();
    expect(seen.length).toBeGreaterThan(60);
  });

  test('each door starts every trigger plus "early", as planned, in its own panel lists, and within its emphasis', () => {
    expect(DOORS).toEqual(Object.keys(PLAN));
    for (const d of m.doors) {
      expect(Object.keys(d.starts).sort()).toEqual(Object.keys(PLAN[d.id]).sort());
      expect(Object.values(d.starts).filter((s) => s.trigger !== null).map((s) => s.trigger).sort()).toEqual(d.triggers.map((_, i) => i));
      const listed = new Set([...d.serviceFamilies.flatMap((f) => f.examples.map((e) => offerByName.get(e))), ...d.packages, ...d.programs.flatMap((p) => [...m.programs[p].build, ...m.programs[p].run]), ...d.programs]);
      for (const [key, s] of Object.entries(d.starts)) {
        const want = PLAN[d.id][key];
        expect({ trigger: s.trigger, lead: s.lead, with: s.with, alt: s.alt, live: s.live, then: s.then }, `${d.id}.${key}`).toEqual({ trigger: want.trigger, lead: want.lead, with: want.with, alt: want.alt, live: want.live, then: want.then });
        expect(s.ring, `${d.id}.${key} ring`).toEqual(RINGS[d.id][key] || []);
        for (const r of s.ring) expect(d.maturityEmphasis, `${d.id}.${key} lights ${r}`).toContain(r);
        for (const v of [s.lead, s.alt, ...(s.with || [])].filter(Boolean)) expect(listed.has(v), `${d.id}.${key}: ${v} is in the door's panel lists`).toBe(true);
        expect(s.status).toBe('proposed');
        expect(typeof s.source === 'string' && s.source.length > 0).toBe(true);
      }
    }
    // Under the corrected shelf every door carries at least one package: Gain Control gained
    // Privacy Leadership Launch, so no door exercises the panel's hidden-list state any more.
    for (const d of m.doors) expect(d.packages.length, `${d.id} carries at least one package`).toBeGreaterThan(0);
  });

  test('the overlaps hold: never SOC 2 with ISO 27001, no standalone risk assessment beside either, VCP base first, Fast Start is not live command', () => {
    const O = m.offers;
    for (const d of m.doors) for (const [key, s] of Object.entries(d.starts)) {
      for (const set of [[s.lead, ...(s.with || []), ...(s.then || [])], ...(s.alt ? [[s.alt, ...(s.with || []), ...(s.then || [])]] : [])]) {
        expect(set.includes('soc-2-readiness') && set.includes('iso-27001-readiness'), `${d.id}.${key}`).toBe(false);
        if (set.includes('soc-2-readiness') || set.includes('iso-27001-readiness')) expect(set, `${d.id}.${key}`).not.toContain('initial-risk-assessment');
        const flat = set.flatMap((v) => [v, ...(O[v]?.contains || [])]);
        expect(new Set(flat).size, `${d.id}.${key}: nothing bought twice`).toBe(flat.length);
      }
    }
    // Both certification packages carry the risk assessment the rule keeps from being bought twice.
    expect(O['soc-2-readiness'].contains).toContain('initial-risk-assessment');
    expect(O['iso-27001-readiness'].contains).toContain('initial-risk-assessment');
    const run = m.programs.vcp.run;
    expect(run.indexOf('managed-vcp')).toBeGreaterThanOrEqual(0);
    expect(run.indexOf('managed-vcp')).toBeLessThan(run.indexOf('vcp-additional-vendor-monitoring-5-vendor-block'));
    expect(O['ir-fast-start'].contains).not.toContain('incident-command');
    expect(O['ir-fast-start'].contains).toContain('ir-ops-command');
    expect(doorById('stay-ready').starts.incident.live).toBe('incident-command');
  });

  test('Learn more opens only the allowlisted https://3hue.net pages', () => {
    const lm = m.site.learnMore;
    expect(lm.hosts).toEqual(['3hue.net']);
    for (const [k, p] of Object.entries(lm.pages)) {
      expect(learnMoreProblem(p.url), `${k}: ${p.url}`).toBeNull();
      expect(LEARN_MORE_PATHS).toContain(new URL(p.url).pathname);
      expect(typeof p.label === 'string' && p.label.length > 0).toBe(true);
    }
    for (const o of [...Object.values(m.offers), ...Object.values(m.programs)]) if (o.learnMore !== undefined) expect(lm.pages[o.learnMore], `learnMore ${o.learnMore}`).toBeTruthy();
    for (const p of Object.values(m.programs)) expect(lm.pages[p.learnMore], `every program has a page`).toBeTruthy();
    for (const bad of ['https://www.3hue.net/about.html', 'http://3hue.net/about.html', 'https://3hue.net/about.html?utm_source=x', 'https://3hue.net/about.html#top', 'https://3hue.net/isg/pricing.html', 'https://3hue.net/experience/', 'https://3hue.net:8443/about.html', 'https://3hue.net.example.com/about.html', 'https://example.com/about.html', '//3hue.net/about.html', 'javascript:alert(1)']) {
      expect(learnMoreProblem(bad), bad).not.toBeNull();
    }
  });

  test('the live manifest and tour lint clean with the quote builder section', () => {
    expect(lintManifest(m, g).errors).toEqual([]);
    expect(lintBuilder(m).errors).toEqual([]);
    expect(lintTour(TOUR, m).errors).toEqual([]);
  });

  test('the lint refuses every broken quote-builder rule', () => {
    const wt = (x) => x.doors.find((d) => d.id === 'win-trust');
    const gc = (x) => x.doors.find((d) => d.id === 'gain-control');
    const sr = (x) => x.doors.find((d) => d.id === 'stay-ready');
    const cases = [
      ['a draft family', (x) => { wt(x).serviceFamilies[0].name = B.draft.categories[0]; }, /draft category/],
      ['a family that is not a Builder category', (x) => { wt(x).serviceFamilies[0].name = 'Risk assessment and risk management'; }, /not a Builder category/],
      ['a draft example', (x) => { wt(x).serviceFamilies[0].examples.push(B.draft.services[0]); }, /draft catalog/],
      ['an example filed under the wrong family', (x) => { wt(x).serviceFamilies[0].examples.push('RFP Response Services'); }, /is in Information Security Program & Governance, not Risk Assessment & Risk Management/],
      ['an example with no offers entry', (x) => { wt(x).serviceFamilies[0].examples.push('Annual Risk Assessment Update'); delete x.offers['annual-risk-update']; }, /has no offers entry/],
      ['a misspelt offer name', (x) => { x.offers['initial-risk-assessment'].name = 'Initial Risk Assesment'; }, /not a Builder name/],
      ['two offers for one Builder name', (x) => { x.offers.ira = { ...x.offers['initial-risk-assessment'] }; }, /is already offers\.initial-risk-assessment; one offer per Builder name/],
      ['an offer id that is not plain', (x) => { x.offers['IRA_2'] = { name: 'Cyber-Risk Advisory', kind: 'service', category: 'Risk Assessment & Risk Management' }; }, /an offer id must match/],
      ['a held name as an offer', (x) => { x.offers['virtual-ciso-support'] = { name: 'Virtual CISO — Support', kind: 'service', category: 'Fractional Executive & Retainer Services' }; }, /held \(\[Confirm price\]\); a held name stands only as a program name/],
      ['a held program name left unheld', (x) => { delete x.programs.vciso.held; }, /is held \(\[Confirm price\]\), so the program is held/],
      ['an unnamed program that is not held', (x) => { delete x.programs.scs.held; }, /only a held program may go without a Builder name/],
      ['an offer filed in the wrong category', (x) => { x.offers['initial-risk-assessment'].category = 'Managed GRC Programs'; }, /category must be "Risk Assessment & Risk Management"/],
      ['SOC 2 with ISO 27001 in one start', (x) => { const s = wt(x).starts.deal; delete s.alt; s.with = ['iso-27001-readiness']; }, /never SOC 2 Readiness with ISO 27001 Certification Readiness/],
      ['a standalone risk assessment beside SOC 2', (x) => { wt(x).starts.deal.with = ['initial-risk-assessment']; }, /no standalone Initial Risk Assessment beside/],
      ['an item bought twice through a package', (x) => { sr(x).starts.incident.with = ['ir-playbook']; }, /IR Playbook Development would be bought twice/],
      ['the 5-vendor block before the VCP base', (x) => { x.programs.vcp.run.reverse(); }, /needs Managed Vendor Compliance Program \(VCP\) before it/],
      ['the 5-vendor block without the base', (x) => { const s = gc(x).starts.vendors; s.lead = 'asset-governance-program-development'; s.with = ['vcp-additional-vendor-monitoring-5-vendor-block']; delete s.then; }, /needs Managed Vendor Compliance Program \(VCP\) before it/],
      ['Fast Start as live incident command', (x) => { sr(x).starts.incident.live = 'ir-fast-start'; }, /live incident command is Incident Command & Emergency Response Leadership/],
      ['Fast Start with no live command named', (x) => { delete sr(x).starts.incident.live; }, /Incident Response Fast Start is not live incident command/],
      ['live command inside Fast Start', (x) => { x.offers['ir-fast-start'].contains.push('incident-command'); }, /carries standing incident command/],
      ['a start the door does not list', (x) => { gc(x).starts.crossing.lead = 'soc-2-readiness'; }, /is in none of gain-control's service families, packages or programs/],
      ['a runs-as the door does not run', (x) => { gc(x).starts.vendors.then = ['managed-cirp']; }, /neither a package of gain-control nor run by one of its programs/],
      ['a program in a start that is not the door\'s', (x) => { wt(x).starts.evidence.with = ['vciso']; }, /program vciso is not in win-trust\.programs/],
      ['a trigger with no start', (x) => { delete wt(x).starts.scope; }, /no start for trigger 2/],
      ['no early start', (x) => { delete gc(x).starts.early; }, /no early start/],
      ['a trigger started twice', (x) => { sr(x).starts.detect.trigger = 1; }, /trigger 1 already starts at/],
      ['an early start with a trigger', (x) => { sr(x).starts.early.trigger = 0; }, /the early start answers no trigger/],
      ['a ring with an unknown stage', (x) => { sr(x).starts.exam.ring = ['audit']; }, /unknown stage audit/],
      ['a start with no ring', (x) => { sr(x).starts.exam.ring = []; }, /name the stage the tower lights/],
      ['a price in a summary', (x) => { x.offers['soc-2-readiness'].summary.text += ' From $51,470 in the first year.'; }, /figure "\$5|price- or hour-shaped/],
      ['hours in a summary', (x) => { x.offers['mxdr-complete'].summary.text = 'About forty hours a year of endpoint validation.'; }, /figure "forty|price- or hour-shaped/],
      ['a rate in a summary', (x) => { x.offers['pci-dss-readiness'].summary.text = 'Billed at an hourly rate.'; }, /price- or hour-shaped/],
      ['inferred contents with no note', (x) => { delete x.offers['soc-2-readiness'].provenance; }, /contents are inferred/],
      ['a Learn more key that does not exist', (x) => { x.offers['soc-2-readiness'].learnMore = 'nope'; }, /no site\.learnMore\.pages\.nope/],
      ['a program with no Learn more', (x) => { delete x.programs.rmp.learnMore; }, /programs\.rmp\.learnMore must name/],
      ['www.', (x) => { x.site.learnMore.pages.about.url = 'https://www.3hue.net/about.html'; }, /on 3hue\.net exactly/],
      ['the pricing page', (x) => { x.site.learnMore.pages.about.url = 'https://3hue.net/isg/pricing.html'; }, /never open the pricing page/],
      ['a query string', (x) => { x.site.learnMore.pages.about.url = 'https://3hue.net/about.html?utm_source=tour'; }, /no query or fragment/],
      ['a page off the allowlist', (x) => { x.site.learnMore.pages.about.url = 'https://3hue.net/services/index.html'; }, /not on the Learn more allowlist/],
      ['a second host', (x) => { x.site.learnMore.hosts.push('www.3hue.net'); }, /hosts must be \["3hue\.net"\]/],
      ['the Snapshot back in a visible string', (x) => { x.path.whereToStart.lead = 'Every path starts with a Snapshot.'; }, /the Snapshot is not a Builder item/],
      ['program.snapshot back', (x) => { wt(x).program.snapshot = wt(x).program.start; delete wt(x).program.start; }, /the first step is program\.start/],
      ['a missing interface string', (x) => { delete x.strings.learnMore; }, /strings\.learnMore must be a non-empty string/],
    ];
    expect(lintManifest(clone(m), g).errors, 'the unmodified manifest').toEqual([]);
    const missed = [];
    for (const [name, mutate, re] of cases) {
      const x = clone(m);
      mutate(x);
      const { errors } = lintManifest(x, g);
      if (!errors.some((e) => re.test(e))) missed.push(`${name}: expected ${re}, got ${JSON.stringify(errors)}`);
    }
    expect(missed).toEqual([]);
    // Allowed: a door with no packages. Emptying them un-lists every package id the door's starts
    // name, so `deal` and `scope` both lose the readiness package they fall back to.
    const none = clone(m);
    wt(none).packages = [];
    wt(none).starts.deal = { ...wt(none).starts.deal, lead: 'initial-risk-assessment' };
    delete wt(none).starts.deal.alt;
    delete wt(none).starts.scope.alt;
    expect(lintManifest(none, g).errors).toEqual([]);
    // Three or four families is the rule now (tools/check-manifest.js:175); two is still refused.
    const two = clone(m); wt(two).serviceFamilies.pop();
    expect(lintManifest(two, g).errors.some((e) => /three or four service families/.test(e))).toBe(true);
  });

  test('the tour lint refuses a Builder name typed into the script instead of a token', () => {
    const say = (text) => { const t = clone(TOUR); t.nodes[t.start].lines.push({ id: 'probe', text, source: 'probe source', status: 'proposed' }); return lintTour(t, m, { file: 'probe.json' }).errors; };
    expect(say('Start with the Initial Risk Assessment.').some((e) => /typed Builder name "Initial Risk Assessment"; use a token/.test(e))).toBe(true);
    expect(say('Ask about SOC 2 Readiness.').some((e) => /typed Builder name "SOC 2 Readiness"/.test(e))).toBe(true);
    expect(say(`A draft: ${B.draft.services[0]}.`).some((e) => /typed draft Builder name/.test(e))).toBe(true);
    expect(say('Later, the Virtual CISO — Support.').some((e) => /typed program name "Virtual CISO — Support"/.test(e))).toBe(true);
    expect(say('Start with the {offer:initial-risk-assessment}, then the {program:rmp}.')).toEqual([]);
    expect(say('Then {program:scs}.').some((e) => /\{program:scs\} does not resolve/.test(e)), 'a held program with no Builder item cannot be voiced').toBe(true);
    expect(say('Then {offer:nope}.').some((e) => /\{offer:nope\} does not resolve/.test(e))).toBe(true);
  });
});
