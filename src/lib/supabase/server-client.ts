import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { env } from '@/lib/env'
import type { Database } from '@/types/database.types'
import type { SaldoClient } from '@/types/supabase.types'

export async function getServerSupabase(): Promise<SaldoClient> {
  // The client reads Date.now() while it loads the session (onAuthStateChange from @supabase/ssr). Under
  // cacheComponents + partialPrefetching the App Shell prefetch resolves cookies() but still forbids Date.now(),
  // so every Supabase read on the server waits for the real request.
  await connection()
  const cookieStore = await cookies()

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot set cookies; src/proxy.ts refreshes the session instead
        }
      },
    },
  })
}
