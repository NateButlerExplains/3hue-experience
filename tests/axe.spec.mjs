// P6-D05: axe (WCAG 2.1 AA) at 1280x720 and 390x844 on the resting lobby, every door panel, the
// path overview, a lit stage, Where to start and the open walk: 0 violations. Results are
// written to tests/results/axe-<state>-<w>x<h>[-<project>].json.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { open, doorsShown, panelOpen, settled, DOORS, STAGES, vp, record, annotate } from './helpers.mjs';

const STATES = [
  { id: 'lobby', hash: '#/experience' },
  ...DOORS.map((id) => ({ id: `door-${id}`, hash: `#/door/${id}` })),
  { id: 'path', hash: '#/path' },
  { id: `path-${STAGES[0]}`, hash: `#/path/${STAGES[0]}` },
  { id: 'path-where-to-start', hash: '#/path/where-to-start' },
  { id: 'walk', hash: '#/experience', walk: true },
];

for (const [w, h] of [[1280, 720], [390, 844]]) {
  for (const st of STATES) {
    test(`P6-D05 axe WCAG 2.1 AA: ${st.id} at ${w}x${h}`, async ({ page }, testInfo) => {
      await open(page, { viewport: vp(w, h), hash: st.hash });
      if (st.walk) {
        const composed = await page.evaluate(() => document.body.classList.contains('composed'));
        await doorsShown(page);
        await page.click(composed ? '#floor-foot button' : '#walk-btn');
        await page.waitForFunction(() => document.activeElement?.id === 'walk-next', null, { polling: 50 });
      } else if (st.id !== 'lobby') await panelOpen(page); else await doorsShown(page);
      await settled(page);
      await page.waitForTimeout(700);
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const suffix = testInfo.project.name === 'chromium' ? '' : `-${testInfo.project.name}`;
      record(`axe-${st.id}-${w}x${h}${suffix}`, { url: page.url(), viewport: `${w}x${h}`, project: testInfo.project.name, violations: res.violations, incomplete: res.incomplete.map((i) => ({ id: i.id, nodes: i.nodes.length })), passes: res.passes.length });
      const summary = res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(' '), summary: n.failureSummary?.split('\n')[1]?.trim() })) }));
      annotate(testInfo, { violations: summary, passes: res.passes.length, incomplete: res.incomplete.map((i) => i.id) });
      expect(summary, `axe violations in ${st.id} at ${w}x${h}: ${JSON.stringify(summary)}`).toEqual([]);
    });
  }
}
