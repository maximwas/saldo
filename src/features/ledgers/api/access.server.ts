import 'server-only'
import { logger } from '@/lib/logger/logger.server'
import { getAdminSupabase } from '@/lib/supabase/admin-client.server'
import { logPgError } from '@/lib/supabase/pg-error.server'
import { getServerSupabase } from '@/lib/supabase/server-client'
import type { LedgerRole } from '@/types/supabase.types'

const log = logger.child({
  module: 'access',
})

export type Member = {
  userId: string
  name: string | null
  email: string | null
  role: LedgerRole
  joinedAt: string
}

export type PendingInvite = {
  id: string
  email: string
  role: 'editor' | 'viewer'
  createdAt: string
  expiresAt: string
}

export type LedgerSettings = {
  id: string
  version: number
  name: string
  baseCurrency: string
  timeZone: string
  weekStartsOn: number
  nextIncomeOn: string | null
}

// Members come through RLS (only a member sees them); emails live in auth.users, so the secret key reads them for
// exactly those ids. Members already see each other in the space, so this exposes nothing new.
export async function getMembers(ledgerId: string): Promise<Member[]> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('ledger_members')
    .select('user_id, role, display_name, joined_at')
    .eq('ledger_id', ledgerId)
    .order('joined_at')

  if (error) {
    logPgError(log, error, 'members lookup failed')

    throw new Error('Members lookup failed')
  }

  const admin = getAdminSupabase()
  const users = await Promise.all(data.map((row) => admin.auth.admin.getUserById(row.user_id)))

  return data.map((row, index) => ({
    userId: row.user_id,
    name: row.display_name,
    email: users[index].data.user?.email ?? null,
    role: row.role as LedgerRole,
    joinedAt: row.joined_at,
  }))
}

// ledger_invites RLS is owner-only: for anyone else this is simply empty, so callers gate the section by role too
export async function getPendingInvites(ledgerId: string, now: Date): Promise<PendingInvite[]> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('ledger_invites')
    .select('id, email, role, created_at, expires_at')
    .eq('ledger_id', ledgerId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', now.toISOString())
    .order('created_at')

  if (error) {
    logPgError(log, error, 'invites lookup failed')

    throw new Error('Invites lookup failed')
  }

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as PendingInvite['role'],
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }))
}

export async function getLedgerSettings(ledgerId: string): Promise<LedgerSettings> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('ledgers')
    .select('id, version, name, base_currency, time_zone, week_starts_on, next_income_on')
    .eq('id', ledgerId)
    .single()

  if (error) {
    logPgError(log, error, 'ledger settings lookup failed')

    throw new Error('Ledger settings lookup failed')
  }

  return {
    id: data.id,
    version: data.version,
    name: data.name,
    baseCurrency: data.base_currency,
    timeZone: data.time_zone,
    weekStartsOn: data.week_starts_on,
    nextIncomeOn: data.next_income_on,
  }
}
