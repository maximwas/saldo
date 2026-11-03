import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from '@/types/database.types'
import type { SaldoClient } from '@/types/supabase.types'

// MCP (phase 10): supabase-js as the token's user, so RLS and the role checks of the RPCs apply exactly as in the app
export function createTokenSupabase(accessToken: string): SaldoClient {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
