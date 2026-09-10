#!/usr/bin/env node
// Refuse to build a manifest that could put the wrong words on a public surface.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || 'content/experience.json';
const m = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/geometry.json'), 'utf8'));
const errors = [], warnings = [];
const err = (s) => errors.push(s);
const warn = (s) => warnings.push(s);

// Walk every string except vocabulary lists and provenance refs.
const strings = [];
(function walk(v, p) {
  if (typeof v === 'string') strings.push([p, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) {
    if (p === '' && (k === 'vocabulary' || k === 'sources' || k === 'note')) continue;
    walk(v[k], p ? `${p}.${k}` : k);
  }
})(m, '');
const visible = strings.filter(([p]) => !/\.(source|basis|provenance|ref|placeholder|src|srcset2x|card|url|bookingUrl|logoHref|route|derive)$/.test(p) && !/^plate\./.test(p));

const v = m.vocabulary || {};
for (const [p, s] of visible) {
  for (const w of v.forbidden || []) if (s.toLowerCase().includes(w.toLowerCase())) err(`forbidden "${w}" in ${p}: ${s}`);
  for (const w of v.retired || []) if (s.includes(w)) err(`retired name "${w}" in ${p}: ${s}`);
  for (const w of v.avoid || []) if (s.toLowerCase().includes(w.toLowerCase())) warn(`avoid "${w}" in ${p}`);
  if (/\$\s?\d/.test(s) && !/\.(stat|statSecondary|opening)\.text$/.test(p)) err(`currency figure outside a sourced field in ${p}: ${s}`);
  if (/\d+(\.\d+)?%/.test(s) && !/\.(stat|statSecondary|opening)\.text$/.test(p)) err(`percentage outside a sourced field in ${p}: ${s}`);
  if (/\b3hue\b|\b3Hue\b|3-HUE|3 HUE/.test(s) && !/3hue\.net/.test(s)) err(`brand must be written 3HUE in ${p}: ${s}`);
  if (/\bAIVRIC\b|\bAivric\b|\baivric\b/.test(s) && !/aivric\.com/.test(s)) err(`brand must be written AiVRIC in ${p}: ${s}`);
}
// Customer names: anything that looks like a proper-noun customer must be on the allowlist.
const allowed = (v.allowedCustomers || []).map((x) => x.toLowerCase());
for (const d of m.doors || []) for (const pr of d.proof || []) {
  const basis = (pr.basis || '').toLowerCase();
  if (!allowed.some((a) => basis.includes(a)) && !/boilerplate/.test(basis)) err(`proof basis not on allowedCustomers: ${d.id}: ${pr.basis}`);
}
// Sourced fields.
const needSource = (obj, p) => { if (!obj) return; if (!obj.source || !obj.status) err(`${p} needs source and status`); };
for (const d of m.doors || []) {
  needSource(d.opening, `${d.id}.opening`); needSource(d.stat, `${d.id}.stat`); needSource(d.statSecondary, `${d.id}.statSecondary`); needSource(d.program, `${d.id}.program`);
  for (const [i, pr] of (d.proof || []).entries()) if (!pr.basis || !pr.status) err(`${d.id}.proof[${i}] needs basis and status`);
  if ((d.serviceFamilies || []).length !== 4) err(`${d.id} must list exactly four service families`);
  if (!['left', 'right'].includes(d.dock)) err(`${d.id}.dock must be left or right`);
  for (const s of d.maturityEmphasis || []) if (!m.stages.find((x) => x.id === s)) err(`${d.id} emphasises unknown stage ${s}`);
  if (!g.doorways?.[d.id]) err(`geometry has no doorway for ${d.id}`);
}
needSource(m.path?.whereToStart, 'path.whereToStart');
if (m.lobby && !m.lobby.heading[1].includes(m.lobby.headingAccent.text)) err('headingAccent.text must be a substring of heading[1]');
if (m.stages?.[0]?.id !== 'assess') err('stages must be Assess-first (lowest ring)');
if ((m.doors || []).length !== 3) err('exactly three doors');
const icps = (m.doors || []).map((d) => d.icp);
const O1 = ['SaaS & AI vendors', 'Portfolio owners', 'Regulated operators'];
if (JSON.stringify(icps) !== JSON.stringify(O1)) err(`O1 buyer labels must be ${O1.join(' / ')}, got ${icps.join(' / ')}`);
if (m.site?.bookingUrl !== 'https://3hue.net/contact.html') err('O2 booking URL must be https://3hue.net/contact.html');
// Kiosk double measurement.
const km = g.kiosk?.measurements;
if (km?.a && km?.b) {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if (Math.abs(km.a[i][j] - km.b[i][j]) > 2) err(`kiosk corner ${i} axis ${j} disagrees by ${Math.abs(km.a[i][j] - km.b[i][j])} px between passes`);
  if (!g.kiosk.quad) err('kiosk quad missing although both measurements exist');
}
// Rooms that are wired must have geometry.
for (const d of m.doors || []) if (d.room?.render && !g.rooms?.[d.id]) err(`${d.id}.room.render set but geometry.rooms.${d.id} missing`);

for (const w of warnings) console.warn('warn:', w);
for (const e of errors) console.error('error:', e);
console.log(`${file}: ${errors.length} errors, ${warnings.length} warnings, ${visible.length} visible strings checked`);
process.exit(errors.length ? 1 : 0);
