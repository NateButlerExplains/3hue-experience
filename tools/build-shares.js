// Share cards and share stubs.
//
// The lobby is hash-routed on static hosting: #/door/win-trust never reaches a crawler, so a
// door link cannot carry its own Open Graph card from index.html. One small real file per route
// under s/ carries its own title, description and card, then bounces into the hash route with
// location.replace (never a meta refresh). Cards are screenshots of the page itself at that
// route, 1200x630, captured at 2x and downsampled, JPEG under 300 KB.
//
//   node tools/build-shares.js [siteUrl]     siteUrl defaults to the manifest's site.url
//   LOCAL=http://127.0.0.1:8770/3hue-experience/ node tools/build-shares.js   (capture source)
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/experience.json'), 'utf8'));
const SITE = (process.argv[2] || m.site.url).replace(/\/?$/, '/');
const LOCAL = (process.env.LOCAL || SITE).replace(/\/?$/, '/');
const CARDS = path.join(ROOT, 'media/share');
const STUBS = path.join(ROOT, 's');
fs.mkdirSync(CARDS, { recursive: true }); fs.mkdirSync(STUBS, { recursive: true });

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const routes = [
  { id: 'lobby', hash: '#/experience', title: m.share.lobby.title, description: m.share.lobby.description, card: 'lobby.jpg' },
  ...m.doors.map((d) => ({ id: d.id, hash: `#/door/${d.id}`, title: d.share.title, description: d.share.description, card: `${d.id}.jpg` })),
  { id: 'path', hash: '#/path', title: m.path.share.title, description: m.path.share.description, card: 'path.jpg' },
];

function stub(r) {
  const url = `${SITE}s/${r.id}.html`;
  const img = `${SITE}media/share/${r.card}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(r.title)}</title>
<meta name="description" content="${esc(r.description)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(m.site.name)}">
<meta property="og:title" content="${esc(r.title)}">
<meta property="og:description" content="${esc(r.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(r.title)}">
<meta name="twitter:description" content="${esc(r.description)}">
<meta name="twitter:image" content="${img}">
<meta name="theme-color" content="${esc(m.site.themeColor)}">
<style>html{background:#0b1118;color:#e2e8f0;font:16px/1.5 system-ui,sans-serif}body{margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px}a{color:#52cce3}</style>
<script>location.replace('../${r.hash}');</script>
</head>
<body><p><a href="../${r.hash}">${esc(m.strings.openLobby)}</a></p></body>
</html>
`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const record = [];
for (const r of routes) {
  await page.goto(LOCAL + r.hash, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.documentElement.dataset.plateReady === '1', null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const raw = path.join(CARDS, `${r.id}.raw.png`);
  await page.screenshot({ path: raw });
  const out = path.join(CARDS, r.card);
  let q = 4;
  do {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf', 'scale=1200:630:flags=lanczos', '-q:v', String(q), out]);
    q += 1;
  } while (fs.statSync(out).size > 300 * 1024 && q < 12);
  fs.unlinkSync(raw);
  const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
  record.push({ id: r.id, route: r.hash, url: LOCAL + r.hash, capturedAt: new Date().toISOString(), bytes: fs.statSync(out).size, innerText: text });
  fs.writeFileSync(path.join(STUBS, `${r.id}.html`), stub(r));
  console.log(`${r.card} ${Math.round(fs.statSync(out).size / 1024)} KB, s/${r.id}.html`);
}
await browser.close();
fs.writeFileSync(path.join(CARDS, 'cards.json'), JSON.stringify(record, null, 2) + '\n');
console.log('media/share/cards.json');
