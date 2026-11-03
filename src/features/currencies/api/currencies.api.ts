import type { SaldoClient } from '@/types/supabase.types'
import { type SaveRateInput, saveRateInputSchema } from '../schemas/rate-input.schema'

/**
 * A manual rate with its date. The same pair, day and source replaces the rate (fx_rates_unique), so a repeated request
 * is not a second row; there is no client id because an upsert on that key is already idempotent. Old operations keep
 * the base amount they were saved with: a new rate changes only what is converted from now on (spec §21).
 */
export async function saveRate(supabase: SaldoClient, input: SaveRateInput): Promise<void> {
  const row = saveRateInputSchema.parse(input)
  const { error } = await supabase.from('fx_rates').upsert(row, {
    onConflict: 'ledger_id,base_currency,quote_currency,rate_on,source',
  })

  if (error) {
    throw error
  }
}

/** the rates the member sees on the Overview, in their order (ledger_members.pinned_currencies, default USD and EUR) */
export async function getMyPinnedCurrencies(supabase: SaldoClient, ledgerId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('my_pinned_currencies', { p_ledger_id: ledgerId })

  if (error) {
    throw error
  }

  return data ?? []
}

type MyPinnedCurrenciesInput = {
  ledgerId: string
  currencies: string[]
}

/** the member's own pins, at most three; the RPC is the only way to change them, a viewer included */
export async function setMyPinnedCurrencies(supabase: SaldoClient, input: MyPinnedCurrenciesInput) {
  const { error } = await supabase.rpc('set_my_pinned_currencies', {
    p_ledger_id: input.ledgerId,
    p_currencies: input.currencies,
  })

  if (error) {
    throw error
  }
}
