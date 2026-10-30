import type { SaldoClient } from '@/types/supabase.types'
import type { CreateLedgerInput } from '../schemas/ledger.schema'

// create_ledger is idempotent for the same id and author, so a retried create returns the same space
export async function createLedger(supabase: SaldoClient, input: CreateLedgerInput) {
  const { data, error } = await supabase.rpc('create_ledger', {
    p_id: input.id,
    p_name: input.name,
    p_base_currency: input.baseCurrency,
  })

  if (error) {
    throw error
  }

  return data
}

// Returns the space's id; a repeat by the same person returns it again (architecture §5.10)
export async function acceptLedgerInvite(supabase: SaldoClient, token: string) {
  const { data, error } = await supabase.rpc('accept_ledger_invite', {
    p_token: token,
  })

  if (error) {
    throw error
  }

  return data
}
