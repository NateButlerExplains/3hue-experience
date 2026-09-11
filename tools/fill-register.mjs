// Fill the Candidate (local) or Published column of docs/acceptance-standalone.md from Playwright
// JSON reports plus optional manual evidence. Each spec title (or the title of a describe block
// around it) starts with the check IDs it proves ("P2a-D01/P3-D04 …", "R-05 …", "T-14 …"); a check
// passes when every test naming it passed in every run. R rows (rooms, O5) and T rows (the guided
// tour, O10/O11) sit outside the 43: the P4-D08 and P6-D06 roll-ups leave them out, and T rows are
// tallied on their own summary lines ("Tour, candidate (local)", "Tour, published").
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
  const walk = (s, parents = '') => {
    const chain = `${parents} ${s.title || ''}`;
    for (const sp of s.specs || []) {
      const titled = `${chain} ${sp.title}`;
      // "P2b-D01/D06", "P3-D01/02/03/06/07" and "P4-D02/D06/D07" name several checks of one phase.
      const ids = [];
      const pre = (phase) => (phase === 'R' || phase === 'T' ? '' : 'D');
      for (const m of titled.matchAll(/\b(P\d[ab]?|R|T)-D?(\d\d)((?:\/D?\d\d)+)?/g)) {
        const phase = m[1]; ids.push(`${phase}-${pre(phase)}${m[2]}`);
        for (const extra of (m[3] || '').match(/\d\d/g) || []) ids.push(`${phase}-${pre(phase)}${extra}`);
      }
      // A test inherits its describe block's IDs, so name each ID once per test.
      ids.splice(0, ids.length, ...new Set(ids));
      for (const t of sp.tests || []) for (const x of t.results || []) { if (x.status === 'skipped') continue; for (const id of ids) add(id, x.status === 'passed', t.projectName); }
    }
    for (const c of s.suites || []) walk(c, chain);
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
  const h = lines[i].match(/^#### (P\d[ab]?-D\d\d|R-\d\d|T-\d\d)\b/);
  if (h) { current = h[1]; continue; }
  if (current && /^\| (applies|re-scoped|dropped|new)/.test(lines[i])) {
    const cells = lines[i].split('|').map((c) => c.trim());   // ['', disposition, candidate, published, proof, '']
    if (cells[1].startsWith('dropped')) { current = null; continue; }
    if (verdicts[current]) { cells[col + 1] = verdicts[current]; changed++; }
    lines[i] = `| ${cells.slice(1, -1).join(' | ')} |`;
    for (const [k, idx] of [['candidate', 2], ['published', 3]]) { const v = cells[idx]; tally[k][v.startsWith('Pass') ? 'pass' : v.startsWith('Fail') ? 'fail' : 'notrun']++; }
    current = null;
  }
}
// P4-D08 and P6-D06 re-run every earlier row: they pass when every other filled row in this column passes.
for (const meta of ['P4-D08', 'P6-D06']) {
  const others = []; let cur = null;
  for (const l of lines) { const h = l.match(/^#### (P\d[ab]?-D\d\d|R-\d\d|T-\d\d)\b/); if (h) { cur = h[1]; continue; } if (cur && /^\| (applies|re-scoped|new)/.test(l)) { const c = l.split('|').map((x) => x.trim()); if (cur !== meta && !['P4-D08', 'P6-D06'].includes(cur) && !cur.startsWith('R-') && !cur.startsWith('T-')) others.push([cur, c[col + 1]]); cur = null; } }
  const failed = others.filter(([, v]) => v.startsWith('Fail')).map(([id]) => id), notrun = others.filter(([, v]) => !v.startsWith('Pass') && !v.startsWith('Fail')).map(([id]) => id);
  const verdict = failed.length ? `Fail (${failed.join(', ')} fail)` : notrun.length ? `Not run (${notrun.length} rows not run: ${notrun.join(', ')})` : `Pass (every other row passes)`;
  let c2 = null;
  for (let i = 0; i < lines.length; i++) { const h = lines[i].match(/^#### (P\d[ab]?-D\d\d)\b/); if (h) { c2 = h[1]; continue; } if (c2 === meta && /^\| (applies|re-scoped)/.test(lines[i])) { const c = lines[i].split('|').map((x) => x.trim()); c[col + 1] = verdict; lines[i] = `| ${c.slice(1, -1).join(' | ')} |`; c2 = null; } }
}
// Recount after the meta rows so the summary reflects the final columns.
// T rows (the tour) are tallied apart from the 43 and the rooms.
const blank = () => ({ pass: 0, fail: 0, notrun: 0 });
for (const k of Object.keys(tally)) tally[k] = blank();
const tourTally = { candidate: blank(), published: blank() };
{ let cur = null; for (const l of lines) { const h = l.match(/^#### (P\d[ab]?-D\d\d|R-\d\d|T-\d\d)\b/); if (h) { cur = h[1]; continue; } if (cur && /^\| (applies|re-scoped|new)/.test(l)) { const c = l.split('|').map((x) => x.trim()); const into = cur.startsWith('T-') ? tourTally : tally; for (const [k, idx] of [['candidate', 2], ['published', 3]]) { const v = c[idx]; into[k][v.startsWith('Pass') ? 'pass' : v.startsWith('Fail') ? 'fail' : 'notrun']++; } cur = null; } } }
// Summary rows: "| Candidate (local) | 0 | 0 | 48 |", "| Tour, candidate (local) | 0 | 0 | 23 |"
for (let i = 0; i < lines.length; i++) {
  for (const [t, k, label] of [[tally, 'candidate', 'Candidate (local)'], [tally, 'published', 'Published'], [tourTally, 'candidate', 'Tour, candidate (local)'], [tourTally, 'published', 'Tour, published']]) {
    if (lines[i].startsWith(`| ${label} |`)) lines[i] = `| ${label} | ${t[k].pass} | ${t[k].fail} | ${t[k].notrun} |`;
  }
}
let md = lines.join('\n').replace(/\n*<!-- (Candidate \(local\)|Published) column filled [^\n]* -->\n*$/g, '');
md += `\n\n<!-- ${column === 'candidate' ? 'Candidate (local)' : 'Published'} column filled ${new Date().toISOString()} from ${files.join(', ')}${process.env.MANUAL ? ' + ' + process.env.MANUAL : ''} -->\n`;
fs.writeFileSync(path, md);
console.log(`${column}: ${changed} rows filled; tally`, JSON.stringify(tally), 'tour', JSON.stringify(tourTally));
for (const [id, r] of Object.entries(results).sort()) if (r.fail) console.log('  FAIL', id, r.fail, 'of', r.pass + r.fail);
