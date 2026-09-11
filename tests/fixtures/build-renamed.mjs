// Builds tests/fixtures/renamed.json: the live manifest with the first door's title renamed to
// "<title> Two" everywhere that title appears as a title (door title, share title). Nothing
// else changes, so the fixture proves every label follows the manifest (P2a-D03).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
export const FIXTURE = 'tests/fixtures/renamed.json';

export function buildRenamed() {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/experience.json'), 'utf8'));
  const OLD = m.doors[0].title;
  const NEW = `${OLD} Two`;
  const walk = (v, key) => {
    if (typeof v === 'string') return key === 'title' && v.includes(OLD) ? v.split(OLD).join(NEW) : v;
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = walk(v[k], k); return o; }
    return v;
  };
  const out = walk(m, '');
  fs.writeFileSync(path.join(ROOT, FIXTURE), JSON.stringify(out, null, 2) + '\n');
  return { OLD, NEW, fixture: out };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { OLD, NEW } = buildRenamed();
  console.log(`${FIXTURE}: "${OLD}" → "${NEW}"`);
}
