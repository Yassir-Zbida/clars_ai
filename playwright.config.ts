import { defineConfig, devices } from "@playwright/test"

/**
 * Smoke tests against the running app.
 * - Local: Playwright starts `next dev` (fast refresh).
 * - CI: set PLAYWRIGHT_USE_NEXT_START=1 after `npm run build` — runs the standalone
 *   server (`output: 'standalone'`); `next start` is not supported for that mode.
 */
const useNextStart = process.env.PLAYWRIGHT_USE_NEXT_START === "1"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : useNextStart
      ? {
          command: "node server.js",
          cwd: ".next/standalone",
          url: "http://127.0.0.1:3000",
          env: {
            ...process.env,
            HOSTNAME: "127.0.0.1",
            PORT: "3000",
            NODE_ENV: "production",
          },
          reuseExistingServer: false,
          timeout: 120_000,
        }
      : {
          command: "npm run dev",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: !process.env.CI,
          timeout: process.env.CI ? 180_000 : 120_000,
        },
})
