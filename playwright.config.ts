import { execSync } from 'node:child_process'
import { defineConfig, devices } from '@playwright/test'

// Local stack keys come from `supabase status`, never from files: production keys cannot reach an e2e run
const localStack = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8' })) as Record<string, string>

if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(localStack.API_URL)) {
  throw new Error('e2e runs only against the local Supabase stack')
}

const PORT = 3100 // not 3000: a running `pnpm dev` with another env must never be reused
const env = {
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  NEXT_PUBLIC_SUPABASE_URL: localStack.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localStack.PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: localStack.SECRET_KEY,
  CRON_SECRET: 'e2e-local-cron-secret-0123456789abcdef',
  // a public key made for tests only (its private half is not kept): it just turns the «Enable push» button on
  NEXT_PUBLIC_VAPID_PUBLIC_KEY:
    'BBmLRIpb4CoqxU_xQg2VJ9VCIhKgro4i1pLJGxlMmCqRuSv7VwjmDou5MMC70TIAU5pyH9imDfDC8J45WL0vfxM',
}

Object.assign(process.env, env) // global setup and fixtures read the same values

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1, // one database per run: parallel workers are not worth the isolation work
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: env.NEXT_PUBLIC_SITE_URL,
    locale: 'uk-UA',
    timezoneId: 'Europe/Kyiv',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/*.setup.ts',
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      grep: /@mobile/,
      dependencies: ['setup'],
    },
    {
      // pixel comparison with Figma frames (`pnpm test:visual`, conventions §6.3); `pnpm test:e2e` leaves it out
      name: 'visual',
      testDir: 'e2e/visual',
      testMatch: '**/*.visual.ts',
      snapshotPathTemplate: '{testDir}/figma/{arg}{ext}',
      expect: {
        toHaveScreenshot: {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.02,
          threshold: 0.2,
        },
      },
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    // production build: the service worker exists only there, and there is no cold dev compilation
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: env.NEXT_PUBLIC_SITE_URL,
    env,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
})
