// P2b-D04/D05 and P5-D01: no visible text under 12 px on screen, one filled Talk per door panel
// above the fold, every Talk points at the booking URL in a new tab, and no forbidden or
// retired word on any surface.
import { test, expect } from '@playwright/test';
import { open, panelOpen, doorsShown, manifest as m, S, DOORS, doorById, doorH2, vp, annotate, r1 } from './helpers.mjs';

const STATES = [
  { id: 'lobby', hash: '#/experience' },
  ...DOORS.map((id) => ({ id: `door-${id}`, hash: `#/door/${id}` })),
  { id: 'path', hash: '#/path' },
  { id: 'where-to-start', hash: '#/path/where-to-start' },
];

// Every rendered text node with its on-screen font size: computed font-size times the scale the
// element's box actually shows at (transformed ancestors included).
const COLLECT = () => {
  const out = [];
  const where = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).join('.') : ''}`;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,.sr')) continue;
    let hidden = false;
    for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) === 0 || e.hidden) { hidden = true; break; } }
    if (hidden) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rr = range.getBoundingClientRect();
    if (rr.width === 0 || rr.height === 0) continue;
    const cs = getComputedStyle(el);
    const font = parseFloat(cs.fontSize);
    const er = el.getBoundingClientRect();
    const scale = el.offsetHeight > 0 && er.height > 0 ? er.height / el.offsetHeight : 1;
    out.push({ text: t.slice(0, 48), font, screen: font * scale, scale, el: where(el) });
  }
  return out;
};

for (const [w, h] of [[1440, 900], [390, 844]]) {
  test(`P2b-D04 no visible text under 12 px at ${w}x${h} (lobby and every panel); h2 > h3`, async ({ page }, testInfo) => {
    const summary = {};
    for (const st of STATES) {
      await open(page, { viewport: vp(w, h), hash: st.hash });
      if (st.id === 'lobby') await doorsShown(page); else await panelOpen(page);
      await page.waitForTimeout(400);
      const nodes = await page.evaluate(COLLECT);
      nodes.sort((a, b) => a.screen - b.screen);
      summary[st.id] = { count: nodes.length, smallest: nodes.slice(0, 3).map((x) => ({ screen: r1(x.screen), font: x.font, el: x.el, text: x.text })) };
      expect(nodes.length).toBeGreaterThan(5);
      const small = nodes.filter((x) => x.screen < 11.95);
      expect(small, `${st.id} at ${w}x${h}: text under 12 px: ${JSON.stringify(small.slice(0, 5))}`).toEqual([]);
      if (st.id !== 'lobby') {
        const sizes = await page.evaluate(() => ({ h2: parseFloat(getComputedStyle(document.querySelector('#panel h2')).fontSize), h3: [...document.querySelectorAll('#panel h3')].map((e) => parseFloat(getComputedStyle(e).fontSize)), body: parseFloat(getComputedStyle(document.querySelector('#panel p') || document.body).fontSize) }));
        summary[st.id].outline = sizes;
        if (sizes.h3.length) { expect(sizes.h2).toBeGreaterThan(Math.max(...sizes.h3)); expect(Math.min(...sizes.h3)).toBeGreaterThan(sizes.body); }
        if (st.id.startsWith('door-')) { expect(sizes.h2).toBeGreaterThanOrEqual(30); expect(sizes.h2).toBeLessThanOrEqual(32); }
      }
    }
    annotate(testInfo, summary);
  });
}

test('P2b-D04 Talk is each door panel\'s only filled button, above the fold at 1280x720', async ({ page }, testInfo) => {
  const log = {};
  for (const id of DOORS) {
    await open(page, { viewport: vp(1280, 720), hash: `#/door/${id}` });
    await panelOpen(page);
    const r = await page.evaluate(() => {
      const inPanel = [...document.querySelectorAll('#panel .btn.primary')].map((el) => { const b = el.getBoundingClientRect(); return { tag: el.tagName, text: el.textContent.trim(), top: b.top, bottom: b.bottom, href: el.getAttribute('href') }; });
      const visibleFilled = [...document.querySelectorAll('.btn.primary')].filter((el) => { let ok = true; for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || e.hidden) ok = false; } return ok; }).map((el) => el.id || el.textContent.trim());
      const outlined = [...document.querySelectorAll('#panel .btn.outline')].map((el) => el.textContent.trim());
      return { inPanel, visibleFilled, outlined, vh: innerHeight, h2: document.getElementById('panel-h2').textContent.trim() };
    });
    log[id] = r;
    expect(r.h2).toBe(doorH2(doorById(id)));
    expect(r.inPanel, `${id}: exactly one filled button in the panel`).toHaveLength(1);
    expect(r.inPanel[0].tag).toBe('A');
    expect(r.inPanel[0].text).toBe(S.talk);
    expect(r.inPanel[0].href).toBe(m.site.bookingUrl);
    expect(r.inPanel[0].bottom, `${id}: filled Talk bottom ${r1(r.inPanel[0].bottom)} above the fold`).toBeLessThanOrEqual(720);
    expect(r.inPanel[0].top).toBeGreaterThanOrEqual(0);
    expect(r.visibleFilled, `${id}: the only visible filled button on the page is the panel's Talk`).toEqual([S.talk]);
    expect(r.outlined).toContain(S.talk); // the closing Talk is outlined
    expect(r.outlined).toContain(S.back);
  }
  annotate(testInfo, log);
});

test('P2b-D04 the path panel: Talk is its only filled button', async ({ page }, testInfo) => {
  const log = {};
  for (const h of ['#/path', `#/path/${m.stages[0].id}`, '#/path/where-to-start']) {
    await open(page, { viewport: vp(1280, 720), hash: h });
    await panelOpen(page);
    const filled = await page.evaluate(() => [...document.querySelectorAll('#panel .btn.primary')].map((el) => ({ tag: el.tagName, id: el.id || null, text: el.textContent.trim(), disabled: !!el.disabled })));
    log[h] = filled;
    expect(filled.map((f) => f.text), `${h}: filled buttons in the path panel`).toEqual([S.talk]);
  }
  annotate(testInfo, log);
});

test('P2b-D05 / O2 every Talk is a link to the booking URL, new tab, noopener; no Talk is a button', async ({ page }, testInfo) => {
  const log = {};
  for (const st of STATES) {
    await open(page, { hash: st.hash });
    if (st.id !== 'lobby') await panelOpen(page);
    const r = await page.evaluate((talk) => {
      const els = [...document.querySelectorAll('a, button')].filter((el) => el.textContent.trim() === talk);
      return els.map((el) => ({ tag: el.tagName, id: el.id || null, href: el.getAttribute('href'), target: el.getAttribute('target'), rel: el.getAttribute('rel'), inPanel: !!el.closest('#panel') }));
    }, S.talk);
    log[st.id] = r;
    expect(r.length).toBeGreaterThanOrEqual(2);
    for (const t of r) {
      expect(t.tag, `Talk is a link (${JSON.stringify(t)})`).toBe('A');
      expect(t.href).toBe(m.site.bookingUrl);
      expect(t.target).toBe('_blank');
      expect(t.rel || '').toContain('noopener');
      expect(t.rel || '').toContain('noreferrer');
    }
    if (st.id !== 'lobby') expect(r.filter((t) => t.inPanel).length).toBeGreaterThanOrEqual(1);
  }
  annotate(testInfo, log);
});

test('P5-D01 no forbidden or retired vocabulary in the body text of any state', async ({ page }, testInfo) => {
  const v = m.vocabulary;
  const log = {};
  for (const st of STATES) {
    await open(page, { hash: st.hash });
    if (st.id !== 'lobby') await panelOpen(page); else await doorsShown(page);
    const txt = await page.evaluate(() => document.body.innerText);
    const hits = [];
    for (const w of v.forbidden) if (txt.toLowerCase().includes(w.toLowerCase())) hits.push(`forbidden "${w}"`);
    for (const w of v.retired) if (txt.includes(w)) hits.push(`retired "${w}"`);
    log[st.id] = { chars: txt.length, hits };
    expect(hits, `${st.id}: ${hits.join(', ')}`).toEqual([]);
    expect(txt.length).toBeGreaterThan(100);
  }
  annotate(testInfo, log);
});

test('P5-D01 share pages carry no forbidden or retired vocabulary and redirect into the lobby', async ({ request, baseURL }, testInfo) => {
  const v = m.vocabulary;
  const ids = ['lobby', ...DOORS, 'path'];
  const log = {};
  for (const id of ids) {
    const res = await request.get(new URL(`s/${id}.html`, baseURL).href);
    expect(res.status(), `s/${id}.html`).toBe(200);
    const html = await res.text();
    const hits = [];
    for (const w of v.forbidden) if (html.toLowerCase().includes(w.toLowerCase())) hits.push(`forbidden "${w}"`);
    for (const w of v.retired) if (html.includes(w)) hits.push(`retired "${w}"`);
    log[id] = { bytes: html.length, hits };
    expect(hits, `s/${id}.html: ${hits.join(', ')}`).toEqual([]);
    expect(html).toContain('location.replace(');
    expect(html).not.toMatch(/http-equiv=["']?refresh/i);
    expect(html).toContain(S.openLobby);
    const title = id === 'lobby' ? m.share.lobby.title : id === 'path' ? m.path.share.title : doorById(id).share.title;
    expect(html).toContain(`<title>${title}</title>`);
  }
  annotate(testInfo, log);
});
