import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from '@/types/database.types'
import type { SaldoClient } from '@/types/supabase.types'

// Secret key bypasses RLS: only Route Handlers that check their own input (invite accept, cron) use it
export function getAdminSupabase(): SaldoClient {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
