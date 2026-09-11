// Acceptance suite for the 3HUE Experience. Three projects: chromium, webkit and chromium under
// prefers-reduced-motion. CHECK_BASE points the suite at the published site.
import { defineConfig } from '@playwright/test';

const baseURL = process.env.CHECK_BASE || 'http://127.0.0.1:8770/3hue-experience/';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.mjs$/,
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: 'tests/results/report.json' }]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
    { name: 'chromium-reduced', use: { browserName: 'chromium', reducedMotion: 'reduce' } },
  ],
});
