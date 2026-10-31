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

type MemberRow = {
  user_id: string
  role: string
  display_name: string | null
  joined_at: string
}

const toMember = (row: MemberRow, email: string | null): Member => ({
  userId: row.user_id,
  name: row.display_name,
  email,
  role: row.role as LedgerRole,
  joinedAt: row.joined_at,
})

type PendingInviteRow = {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
}

const toPendingInvite = (row: PendingInviteRow): PendingInvite => ({
  id: row.id,
  email: row.email,
  role: row.role as PendingInvite['role'],
  createdAt: row.created_at,
  expiresAt: row.expires_at,
})

type LedgerSettingsRow = {
  id: string
  version: number
  name: string
  base_currency: string
  time_zone: string
  week_starts_on: number
  next_income_on: string | null
}

const toLedgerSettings = (row: LedgerSettingsRow): LedgerSettings => ({
  id: row.id,
  version: row.version,
  name: row.name,
  baseCurrency: row.base_currency,
  timeZone: row.time_zone,
  weekStartsOn: row.week_starts_on,
  nextIncomeOn: row.next_income_on,
})

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

  return data.map((row, index) => toMember(row, users[index].data.user?.email ?? null))
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

  return data.map(toPendingInvite)
}

// The signed-in member's own name in the space; null = not set (the access list falls back to the email prefix)
export async function getMyDisplayName(ledgerId: string, userId: string): Promise<string | null> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('ledger_members')
    .select('display_name')
    .eq('ledger_id', ledgerId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    logPgError(log, error, 'own display name lookup failed')

    throw new Error('Own display name lookup failed')
  }

  return data?.display_name ?? null
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

  return toLedgerSettings(data)
}
