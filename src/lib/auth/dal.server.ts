import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { AppTheme } from '@/constants/theme.constants'
import { pickMembership, toActiveLedger } from '@/lib/auth/active-ledger.utils'
import { logger } from '@/lib/logger/logger.server'
import { logPgError } from '@/lib/supabase/pg-error.server'
import { getServerSupabase } from '@/lib/supabase/server-client'
import type { ActiveLedger } from '@/store/ledger.store'

export const LEDGER_COOKIE = 'saldo-ledger'

const log = logger.child({
  module: 'dal',
})

// getClaims verifies the JWT (JWKS for asymmetric keys, Auth for the legacy secret); getSession is never trusted on the server
export const getSession = cache(async () => {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase.auth.getClaims()

  // no session is not an error; a token that fails verification or an unreachable Auth is
  if (error) {
    log.warn(
      {
        code: error.code ?? error.name,
      },
      'session claims check failed',
    )
  }

  return data?.claims
    ? {
        userId: data.claims.sub,
        email: data.claims.email ?? null,
      }
    : null
})

export async function verifySession() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return session
}

// One user_settings read per request, shared by the active space, the locale (src/i18n/request.ts) and the theme
const getUserSettings = cache(async () => {
  const session = await getSession()

  if (!session) {
    return null
  }

  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('user_settings')
    .select('last_ledger_id, locale, theme')
    .eq('user_id', session.userId)
    .maybeSingle()

  if (error) {
    logPgError(log, error, 'user_settings lookup failed')
  }

  return data
})

export const getUserLocale = async () => (await getUserSettings())?.locale ?? null

export const getUserTheme = async () => ((await getUserSettings())?.theme as AppTheme | undefined) ?? null

// Active space: cookie saldo-ledger → user_settings.last_ledger_id → own space; only a space the user is a member of
export const getActiveLedger = cache(async (): Promise<ActiveLedger | null> => {
  const session = await getSession()

  if (!session) {
    return null
  }

  const supabase = await getServerSupabase()
  const [cookieStore, memberships, settings] = await Promise.all([
    cookies(),
    supabase
      .from('ledger_members')
      .select('ledger_id, role, ledgers(name, time_zone, base_currency)')
      .eq('user_id', session.userId),
    getUserSettings(),
  ])

  if (memberships.error) {
    logPgError(log, memberships.error, 'ledger_members lookup failed')
  }

  const rows = memberships.data ?? []
  const membership = pickMembership(rows, [cookieStore.get(LEDGER_COOKIE)?.value, settings?.last_ledger_id])

  return membership ? toActiveLedger(membership, rows) : null
})
