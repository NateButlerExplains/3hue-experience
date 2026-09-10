// Screenshot helper for gates: node tools/shots.mjs <url-suffix> <out.png> [w h] [waitMs]
//   node tools/shots.mjs "?room-preview=art/rooms/win-trust/candidate-01.master-2560.png#/door/win-trust" art/rooms/win-trust/preview-1440.png 1440 900
import { chromium } from '@playwright/test';
const [suffix, out, w = '1440', h = '900', wait = '3200'] = process.argv.slice(2);
const base = process.env.CHECK_BASE || 'http://127.0.0.1:8770/3hue-experience/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await page.goto(base + suffix, { waitUntil: 'load' });
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log(out);
await browser.close();
