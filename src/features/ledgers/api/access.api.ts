import type { SaldoClient } from '@/types/supabase.types'
import {
  type CreateInviteInput,
  createInviteInputSchema,
  type RemoveMemberInput,
  removeMemberInputSchema,
  type SetMemberRoleInput,
  type SetMyDisplayNameInput,
  setMemberRoleInputSchema,
  setMyDisplayNameInputSchema,
  type UpdateLedgerSettingsInput,
  updateLedgerSettingsInputSchema,
} from '../schemas/access.schema'

// Owner only (RLS). Create replays for the same id, so a retried submit makes one invite.
export async function createLedgerInvite(supabase: SaldoClient, input: CreateInviteInput) {
  const parsed = createInviteInputSchema.parse(input)
  const { error } = await supabase.rpc('create_ledger_invite', {
    p_id: parsed.id,
    p_ledger_id: parsed.ledgerId,
    p_email: parsed.email,
    p_role: parsed.role,
    p_token_hash: parsed.tokenHash,
  })

  if (error) {
    throw error
  }
}

// An invite is cancelled by revoking it: the row stays as history and its link stops working (accept: PT410)
export async function cancelLedgerInvite(supabase: SaldoClient, inviteId: string, now: Date) {
  const { error } = await supabase
    .from('ledger_invites')
    .update({ revoked_at: now.toISOString() })
    .eq('id', inviteId)
    .is('accepted_at', null)

  if (error) {
    throw error
  }
}

// Owner only, never the owner row: anything else is 42501
export async function setMemberRole(supabase: SaldoClient, input: SetMemberRoleInput) {
  const parsed = setMemberRoleInputSchema.parse(input)
  const { error } = await supabase.rpc('set_member_role', {
    p_ledger_id: parsed.ledgerId,
    p_user_id: parsed.userId,
    p_role: parsed.role,
  })

  if (error) {
    throw error
  }
}

// The owner removes anyone but themselves; everyone else removes only themselves (leave). The owner row is never removed.
export async function removeMember(supabase: SaldoClient, input: RemoveMemberInput) {
  const parsed = removeMemberInputSchema.parse(input)
  const { error } = await supabase.rpc('remove_member', {
    p_ledger_id: parsed.ledgerId,
    p_user_id: parsed.userId,
  })

  if (error) {
    throw error
  }
}

// Any member, the owner included, names themselves; the RPC writes only display_name of the caller's own row
export async function setMyDisplayName(supabase: SaldoClient, input: SetMyDisplayNameInput) {
  const parsed = setMyDisplayNameInputSchema.parse(input)
  const { error } = await supabase.rpc('set_my_display_name', {
    p_ledger_id: parsed.ledgerId,
    p_name: parsed.name,
  })

  if (error) {
    throw error
  }
}

export async function updateLedgerSettings(supabase: SaldoClient, input: UpdateLedgerSettingsInput) {
  const parsed = updateLedgerSettingsInputSchema.parse(input)
  const { data, error } = await supabase
    .from('ledgers')
    .update({
      name: parsed.name,
      base_currency: parsed.baseCurrency,
      time_zone: parsed.timeZone,
      week_starts_on: parsed.weekStartsOn,
      next_income_on: parsed.nextIncomeOn,
    })
    .eq('id', parsed.ledgerId)
    .eq('version', parsed.version)
    .select('version')

  if (error) {
    throw error
  }

  // a stale version (or a non-owner, whom RLS hides the row from) matches nothing: same answer as the RPCs' PT409
  if (data.length === 0) {
    throw {
      code: 'PT409',
      message: 'ledger changed elsewhere',
    }
  }
}

// «Reminders of this space for me» (§19): the member's own channels; the RPC is the only way to change them
export async function getMyNotifyChannels(supabase: SaldoClient, ledgerId: string, userId: string) {
  const { data, error } = await supabase
    .from('ledger_members')
    .select('notify_channels')
    .eq('ledger_id', ledgerId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.notify_channels ?? []
}

export async function setMyNotifyChannels(supabase: SaldoClient, ledgerId: string, channels: string[]) {
  const { error } = await supabase.rpc('set_my_notify_channels', {
    p_ledger_id: ledgerId,
    p_channels: channels,
  })

  if (error) {
    throw error
  }
}

// What a member entered in the space, for the revoke dialog (Figma 2:36442: operation and marked-payment counts): a transfer
// is two operation rows, its incoming leg is not counted again
export async function getMemberContributions(supabase: SaldoClient, ledgerId: string, userId: string) {
  const [operations, payments] = await Promise.all([
    supabase
      .from('operations')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('ledger_id', ledgerId)
      .eq('created_by', userId)
      .neq('kind', 'transfer_in'),
    supabase
      .from('obligation_payments')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('ledger_id', ledgerId)
      .eq('created_by', userId),
  ])

  if (operations.error) {
    throw operations.error
  }

  if (payments.error) {
    throw payments.error
  }

  return {
    operations: operations.count ?? 0,
    payments: payments.count ?? 0,
  }
}
