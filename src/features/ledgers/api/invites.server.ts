import 'server-only'
import { createHash } from 'node:crypto'
import { logger } from '@/lib/logger/logger.server'
import { getAdminSupabase } from '@/lib/supabase/admin-client.server'
import { logPgError } from '@/lib/supabase/pg-error.server'
import type { LedgerRole } from '@/types/supabase.types'
import type { InviteFacts, InviteView } from '../utils/invite.utils'

const log = logger.child({
  module: 'invites',
})

export type InviteRecord = InviteView & InviteFacts

// The hash accept_ledger_invite computes: SHA-256 of the token's UTF-8 bytes, sent to PostgREST as bytea hex
const tokenHash = (token: string) => `\\x${createHash('sha256').update(token, 'utf8').digest('hex')}`

// The invitee is not a member yet, so RLS hides the invite: the secret key reads the one row whose hash matches.
// Callers check the token's format first (isInviteToken), so garbage never costs a query.
export async function findInvite(token: string): Promise<InviteRecord | null> {
  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('ledger_invites')
    .select('email, role, expires_at, accepted_at, accepted_by, revoked_at, created_by, ledger_id, ledgers(name)')
    .eq('token_hash', tokenHash(token))
    .maybeSingle()

  if (error) {
    logPgError(log, error, 'invite lookup failed')

    throw new Error('Invite lookup failed')
  }

  if (!data) {
    return null
  }

  const [member, inviter] = await Promise.all([
    admin
      .from('ledger_members')
      .select('display_name')
      .eq('ledger_id', data.ledger_id)
      .eq('user_id', data.created_by)
      .maybeSingle(),
    admin.auth.admin.getUserById(data.created_by),
  ])

  return toInviteRecord(data, {
    inviterName: member.data?.display_name ?? null,
    inviterEmail: inviter.data.user?.email ?? null,
  })
}

type InviteRow = {
  ledger_id: string
  ledgers: { name: string } | null
  role: string
  email: string
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  revoked_at: string | null
}

type Inviter = {
  inviterName: string | null
  inviterEmail: string | null
}

const toInviteRecord = (row: InviteRow, inviter: Inviter): InviteRecord => ({
  ledgerId: row.ledger_id,
  ledgerName: row.ledgers?.name ?? '',
  role: row.role as LedgerRole,
  email: row.email,
  ...inviter,
  expiresAt: row.expires_at,
  acceptedAt: row.accepted_at,
  acceptedBy: row.accepted_by,
  revokedAt: row.revoked_at,
})
