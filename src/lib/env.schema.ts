import { z } from 'zod'

// Supabase API keys: a secret key in a NEXT_PUBLIC_ variable would ship to every browser, so the prefixes are checked
export const serverEnvSchema = {
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_'),
  CRON_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(), // default: debug in dev, info in prod
  VAPID_PRIVATE_KEY: z.string().optional(), // phase 3: Web Push
  GOOGLE_CLIENT_ID: z.string().optional(), // phase 9: Google Calendar
  GOOGLE_CLIENT_SECRET: z.string().optional(),
}

export const clientEnvSchema = {
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(), // phase 3: Web Push
}
