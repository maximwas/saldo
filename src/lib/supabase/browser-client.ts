import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'
import type { Database } from '@/types/database.types'
import type { SaldoClient } from '@/types/supabase.types'

let client: SaldoClient | undefined

export function getBrowserSupabase(): SaldoClient {
  client ??= createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

  return client
}
