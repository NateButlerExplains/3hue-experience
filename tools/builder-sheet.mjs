// The quote-builder copy sheet (O15) is a change memo, not a projection: it tells the owner what
// moved since the 2026-09-10 approval and asks for a re-signature, so its prose and its "Old:"
// blocks are written by hand and stay written by hand. What it also carries, and what went stale
// unnoticed, are three kinds of table that the manifests already hold. Those live between
// <!-- gen:<kind>:<door> --> and <!-- /gen --> and are rewritten from the manifests here.
//
//   node tools/builder-sheet.mjs            rewrite the generated blocks in docs/copy-sheet-builder.md
//   node tools/builder-sheet.mjs --check    exit 1 if any block on disk is not what this would write
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const m = read('content/experience.json');
const FILE = 'docs/copy-sheet-builder.md';

const check = process.argv.includes('--check');
const door = (id) => m.doors.find((d) => d.id === id);
const offer = (id) => m.offers?.[id];
const program = (id) => m.programs?.[id];
// A name the visitor could be shown: held items ([Confirm price]) are never named on the site.
const oname = (id) => { const o = offer(id); return o && !o.held ? o.name : null; };
const stage = (id) => m.stages.find((s) => s.id === id)?.name || id;

// --- the three generated block kinds ------------------------------------------------------------

const families = (d) => ['', ...d.serviceFamilies.map((f) => `- **${f.name}**: ${(f.examples || []).join(' · ')}`)];

const panels = (d) => {
  const out = [''];
  if ((d.packages || []).length) {
    out.push(`**${m.strings.packages}**`, '');
    for (const id of d.packages) {
      const p = offer(id);
      if (!p) continue;
      const learn = p.learnMore && m.site?.learnMore?.pages?.[p.learnMore] ? ` · Learn more: ${m.site.learnMore.pages[p.learnMore].url}` : '';
      out.push(`- **${p.name}**: ${p.summary?.text ?? ''}${learn}`);
    }
    const src = d.packages.map((id) => offer(id)?.summary).find((s) => s?.source);
    if (src) out.push('', `*Source: ${src.source}${src.status ? ` (${src.status})` : ''}*`);
    out.push('');
  }
  if ((d.programs || []).length) {
    out.push(`**${m.strings.programs}**`, '');
    for (const id of d.programs) {
      const pr = program(id);
      if (!pr || !pr.name) continue;   // a held program has no Builder name, so nothing to show
      const carries = [...(pr.build || []), ...(pr.run || [])].map(oname).filter(Boolean);
      out.push(`- **${pr.name}**${carries.length ? `: ${carries.join(' · ')}` : ''}`);
    }
  }
  return out;
};

const starts = (d) => {
  const out = ['', '| Trigger | Shown | Then runs as (tour) | Tower ring |', '|---|---|---|---|'];
  const byTrigger = Object.entries(d.starts).filter(([, s]) => s.trigger !== null).sort((a, b) => a[1].trigger - b[1].trigger);
  const shown = (s) => {
    const lead = oname(s.lead) ?? program(s.lead)?.name ?? s.lead;
    const alt = s.alt ? oname(s.alt) : null;
    const withs = (s.with || []).map((x) => oname(x) ?? program(x)?.name).filter(Boolean);
    return `${lead}${alt ? ` / ${alt}` : ''}${withs.length ? ` + ${withs.join(' + ')}` : ''}`;
  };
  const then = (s) => ((s.then || []).map((x) => oname(x) ?? program(x)?.name).filter(Boolean).join(' · ') || '—');
  for (const [, s] of byTrigger) {
    out.push(`| ${d.triggers[s.trigger]} | ${shown(s)} | ${then(s)} | ${(s.ring || []).map(stage).join(' → ') || '—'} |`);
  }
  if (d.starts.early) out.push(`| *early: nobody is asking yet (tour only)* | ${shown(d.starts.early)} | — | — |`);
  const sources = [...new Set(Object.values(d.starts).map((s) => (s.source ? `${s.source}${s.status ? ` (${s.status})` : ''}` : null)).filter(Boolean))];
  if (sources.length) out.push('', `*Source: ${sources.join('; ')}*`);
  return out;
};

const BUILD = { families, panels, starts };

// --- fill every marked block --------------------------------------------------------------------

const src = fs.readFileSync(path.join(ROOT, FILE), 'utf8').replace(/\r\n/g, '\n');
const lines = src.split('\n');
const out = [];
let i = 0, filled = 0, stale = [];

while (i < lines.length) {
  const open = /^<!-- gen:([a-z]+):([a-z-]+) -->$/.exec(lines[i]);
  if (!open) { out.push(lines[i]); i++; continue; }
  const [, kind, id] = open;
  const close = lines.indexOf('<!-- /gen -->', i);
  if (close === -1) { console.error(`${FILE}: gen:${kind}:${id} has no closing marker`); process.exit(1); }
  const d = door(id);
  if (!d || !BUILD[kind]) { console.error(`${FILE}: gen:${kind}:${id} names no door or kind`); process.exit(1); }
  const had = lines.slice(i + 1, close);
  const want = BUILD[kind](d);
  if (had.join('\n').trimEnd() !== want.join('\n').trimEnd()) stale.push(`${kind}:${id}`);
  out.push(lines[i], ...want, lines[close]);
  filled++;
  i = close + 1;
}

if (check) {
  if (!stale.length) { console.log(`${FILE} is current (${filled} generated blocks)`); process.exit(0); }
  console.error(`${FILE} is stale in ${stale.length} block(s): ${stale.join(', ')} — run node tools/builder-sheet.mjs`);
  process.exit(1);
}

fs.writeFileSync(path.join(ROOT, FILE), out.join('\n'));
console.log(`wrote ${FILE}: ${filled} generated blocks, ${stale.length} updated${stale.length ? ` (${stale.join(', ')})` : ''}`);
