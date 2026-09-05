import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4574',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // E2E runs against the production build: deterministic, no dev-server
    // transform latency, and it tests the artifact users actually receive.
    command: 'pnpm build && pnpm preview',
    url: 'http://localhost:4574',
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
  },
});
