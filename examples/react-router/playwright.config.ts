import {defineConfig, devices} from '@playwright/test'

const PORT = 3100
const LAKE_PORT = 4999

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: {baseURL: `http://localhost:${PORT}`},
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
  webServer: [
    {
      command: 'node e2e/fake-lake.mjs',
      url: `http://127.0.0.1:${LAKE_PORT}/health`,
      env: {FAKE_LAKE_PORT: String(LAKE_PORT)},
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm build && pnpm start',
      url: `http://localhost:${PORT}`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        PORT: String(PORT),
        NODE_ENV: 'production',
        SANITY_PROJECT_ID: 'p1',
        SANITY_DATASET: 'production',
        SANITY_API_HOST: `http://127.0.0.1:${LAKE_PORT}`,
        SANITY_VIEWER_TOKEN: 'sk-e2e-viewer',
        SANITY_STUDIO_URL: 'https://studio.example.com',
        SANITY_PREVIEW_SECRET: 'e2e-session-secret',
        SANITY_LIVE_SECRET: 'e2e-live-secret',
      },
    },
  ],
})
