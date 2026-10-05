import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/e2e',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  reporter: [
    ['list'],
    ['json', { outputFile: '../tests/e2e/test-results.json' }],
    ['html', { outputFolder: '../tests/e2e/html-report', open: 'never' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    channel: 'chrome',
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
});
