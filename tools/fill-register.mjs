// Fill the Candidate (local) or Published column of docs/acceptance-standalone.md from Playwright
// JSON reports plus optional manual evidence. Each spec title starts with the check IDs it proves
// ("P2a-D01/P3-D04 …", "R-05 …"); a check passes when every test naming it passed in every run.
//
//   node tools/fill-register.mjs candidate tests/results/report.json [more.json ...]
//   node tools/fill-register.mjs published tests/results/live.json
//   MANUAL=docs/evidence/manual.json node tools/fill-register.mjs candidate …   ({"P1-D04":"Pass (2880x1621 …)"})
import fs from 'node:fs';

const [column, ...files] = process.argv.slice(2);
if (!['candidate', 'published'].includes(column) || !files.length) { console.error('usage: fill-register.mjs candidate|published report.json...'); process.exit(1); }
const results = {};
const add = (id, ok, project) => { const r = results[id] || (results[id] = { pass: 0, fail: 0, projects: new Set() }); ok ? r.pass++ : r.fail++; r.projects.add(project); };
for (const f of files) {
  const rep = JSON.parse(fs.readFileSync(f, 'utf8'));
  const walk = (s) => {
    for (const sp of s.specs || []) {
      const ids = [...(sp.title.match(/\b(P\d[ab]?-D\d\d|R-\d\d)\b/g) || [])];
      for (const t of sp.tests || []) for (const x of t.results || []) { if (x.status === 'skipped') continue; for (const id of ids) add(id, x.status === 'passed', t.projectName); }
    }
    for (const c of s.suites || []) walk(c);
  };
  for (const s of rep.suites) walk(s);
}
const verdicts = {};
for (const [id, r] of Object.entries(results)) verdicts[id] = r.fail ? `Fail (${r.fail} of ${r.pass + r.fail} runs; ${[...r.projects].join(', ')})` : `Pass (${r.pass} runs; ${[...r.projects].join(', ')})`;
if (process.env.MANUAL) for (const [id, v] of Object.entries(JSON.parse(fs.readFileSync(process.env.MANUAL, 'utf8')))) verdicts[id] = v;

const path = 'docs/acceptance-standalone.md';
const lines = fs.readFileSync(path, 'utf8').split('\n');
const col = column === 'candidate' ? 1 : 2;
let current = null, changed = 0;
const tally = { candidate: { pass: 0, fail: 0, notrun: 0 }, published: { pass: 0, fail: 0, notrun: 0 } };
for (let i = 0; i < lines.length; i++) {
  const h = lines[i].match(/^#### (P\d[ab]?-D\d\d|R-\d\d)\b/);
  if (h) { current = h[1]; continue; }
  if (current && /^\| (applies|re-scoped|dropped)/.test(lines[i])) {
    const cells = lines[i].split('|').map((c) => c.trim());   // ['', disposition, candidate, published, proof, '']
    if (cells[1].startsWith('dropped')) { current = null; continue; }
    if (verdicts[current]) { cells[col + 1] = verdicts[current]; changed++; }
    lines[i] = `| ${cells.slice(1, -1).join(' | ')} |`;
    for (const [k, idx] of [['candidate', 2], ['published', 3]]) { const v = cells[idx]; tally[k][v.startsWith('Pass') ? 'pass' : v.startsWith('Fail') ? 'fail' : 'notrun']++; }
    current = null;
  }
}
// Summary rows: "| Candidate (local) | 0 | 0 | 42 + 6 rooms |"
for (let i = 0; i < lines.length; i++) {
  for (const [k, label] of [['candidate', 'Candidate (local)'], ['published', 'Published']]) {
    if (lines[i].startsWith(`| ${label} |`)) lines[i] = `| ${label} | ${tally[k].pass} | ${tally[k].fail} | ${tally[k].notrun} |`;
  }
}
let md = lines.join('\n').replace(/\n*<!-- (Candidate \(local\)|Published) column filled [^\n]* -->\n*$/g, '');
md += `\n\n<!-- ${column === 'candidate' ? 'Candidate (local)' : 'Published'} column filled ${new Date().toISOString()} from ${files.join(', ')}${process.env.MANUAL ? ' + ' + process.env.MANUAL : ''} -->\n`;
fs.writeFileSync(path, md);
console.log(`${column}: ${changed} rows filled; tally`, JSON.stringify(tally));
for (const [id, r] of Object.entries(results).sort()) if (r.fail) console.log('  FAIL', id, r.fail, 'of', r.pass + r.fail);
