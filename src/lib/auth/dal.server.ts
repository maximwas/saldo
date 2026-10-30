import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { ActiveLedger } from '@/contexts/ledger.context'
import { getServerSupabase } from '@/lib/supabase/server-client'
import type { LedgerRole } from '@/types/supabase.types'

export const LEDGER_COOKIE = 'saldo-ledger'

// getClaims verifies the JWT (JWKS for asymmetric keys, Auth for the legacy secret); getSession is never trusted on the server
const getSession = cache(async () => {
  const supabase = await getServerSupabase()
  const { data } = await supabase.auth.getClaims()

  return data?.claims ? { userId: data.claims.sub, email: data.claims.email ?? null } : null
})

export async function verifySession() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return session
}

// Active space: cookie saldo-ledger → user_settings.last_ledger_id → own space; only a space the user is a member of
export const getActiveLedger = cache(async (): Promise<ActiveLedger | null> => {
  const session = await getSession()

  if (!session) {
    return null
  }

  const supabase = await getServerSupabase()
  const [cookieStore, memberships, settings] = await Promise.all([
    cookies(),
    supabase.from('ledger_members').select('ledger_id, role, ledgers(name, time_zone)').eq('user_id', session.userId),
    supabase.from('user_settings').select('last_ledger_id').eq('user_id', session.userId).maybeSingle(),
  ])
  const rows = memberships.data ?? []
  const preferred = [cookieStore.get(LEDGER_COOKIE)?.value, settings.data?.last_ledger_id]
  const membership =
    preferred.map((ledgerId) => rows.find((row) => row.ledger_id === ledgerId)).find(Boolean) ??
    rows.find((row) => row.role === 'owner') ??
    rows[0]

  if (!membership) {
    return null
  }

  return {
    ledgerId: membership.ledger_id,
    role: membership.role as LedgerRole,
    timeZone: membership.ledgers?.time_zone ?? 'Europe/Kyiv',
    ledgers: rows.map((row) => ({ id: row.ledger_id, name: row.ledgers?.name ?? '', role: row.role as LedgerRole })),
  }
})
