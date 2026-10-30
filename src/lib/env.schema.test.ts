import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { clientEnvSchema, serverEnvSchema } from '@/lib/env.schema'

const server = z.object(serverEnvSchema)
const client = z.object(clientEnvSchema)

const validServer = { SUPABASE_SECRET_KEY: 'sb_secret_abc', CRON_SECRET: 'x'.repeat(32) }
const validClient = {
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
}

describe('env schema', () => {
  it('accepts the required variables, later-phase ones are optional', () => {
    expect(server.safeParse(validServer).success).toBe(true)
    expect(client.safeParse(validClient).success).toBe(true)
  })

  it('rejects a secret key in the public variable', () => {
    const leaked = { ...validClient, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' }
    expect(client.safeParse(leaked).success).toBe(false)
  })

  it('rejects a missing secret, a short cron secret and a non-URL', () => {
    expect(server.safeParse({ CRON_SECRET: validServer.CRON_SECRET }).success).toBe(false)
    expect(server.safeParse({ ...validServer, CRON_SECRET: 'short' }).success).toBe(false)
    expect(client.safeParse({ ...validClient, NEXT_PUBLIC_SITE_URL: 'localhost' }).success).toBe(false)
  })
})
