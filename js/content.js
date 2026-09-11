// Manifest loading and the few helpers every module shares. Content is data: nothing here knows
// what a door says, only where to find it.

let manifest = null;
let geometry = null;

const params = new URLSearchParams(location.search);

// `?manifest=tests/fixtures/renamed.json` swaps the content manifest for a fixture so the rename
// check (P2a-D03) can prove every label follows the file. Relative paths only: a fixture is
// something in this repo, never a URL.
// A repo-relative path only: same origin, under this page's directory, plain characters. Anything
// else (scheme, protocol-relative, backslash, whitespace, dot segments) falls back to the default.
export function safeRelative(p) {
  if (!p || !/^[\w./-]+$/.test(p) || /(^|\/)\.\.(\/|$)/.test(p) || p.startsWith('/')) return null;
  try {
    const u = new URL(p, location.href), base = new URL('.', location.href);
    if (u.origin !== location.origin || !u.pathname.startsWith(base.pathname)) return null;
  } catch { return null; }
  return p;
}
function manifestPath() { return safeRelative(params.get('manifest')) || 'content/experience.json'; }

export async function loadContent() {
  const [m, g] = await Promise.all([
    fetch(manifestPath(), { cache: 'no-cache' }).then((r) => r.json()),
    fetch('content/geometry.json', { cache: 'no-cache' }).then((r) => r.json()),
  ]);
  manifest = m; geometry = g;
  return { manifest, geometry };
}
export function getManifest() { return manifest; }
export function getGeometry() { return geometry; }
export function getParams() { return params; }

export const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// "{door}: {promise}" → text. Missing keys stay visible so a typo in the manifest shows up.
export function fmt(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

export function str(key, vars) { return fmt(manifest?.strings?.[key] ?? key, vars || {}); }

export function door(id) { return (manifest?.doors || []).find((d) => d.id === id) || null; }
export function stage(id) { return (manifest?.stages || []).find((s) => s.id === id) || null; }
export function stageName(id) { return stage(id)?.name || id; }

// The guides (O12). guideName(id): that guide's name, or the lead's for an unknown id; a manifest
// with one guide (guide.name) answers with it for any id.
export function guideName(id) {
  const g = manifest?.guide;
  if (!g?.guides) return g?.name || '';
  return g.guides[id]?.name || g.guides[g.lead]?.name || Object.values(g.guides)[0]?.name || '';
}
export function guideNames() { const g = manifest?.guide; return g?.guides ? Object.values(g.guides).map((x) => x.name) : [g?.name].filter(Boolean); }

// Every "Talk to our team" resolves through here (O2). No other module knows the URL.
export function resolveHref(key) {
  if (key === 'booking') return manifest.site.bookingUrl;
  if (key === 'logo') return manifest.site.logoHref;
  throw new Error(`unknown href key ${key}`);
}

// Kiosk lines are counts derived from this manifest, never retyped (O9).
export function kioskLines() {
  const m = manifest;
  const derive = { doors: () => m.doors.length, stages: () => m.stages.length, families: () => new Set(m.doors.flatMap((d) => d.serviceFamilies.map((f) => f.name))).size };
  return (m.kiosk?.lines || []).map((l) => ({ label: l.label, value: derive[l.derive] ? derive[l.derive]() : '' }));
}

export function reducedMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
