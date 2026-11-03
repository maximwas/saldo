import { CURRENCIES } from '@/constants/currencies.constants'
import { type FxRate, toFxRate } from '@/lib/money/fx.utils'
import type { SaldoClient } from '@/types/supabase.types'

export type LedgerFx = {
  baseCurrency: string
  rates: FxRate[]
}

/** the space's FX rates, newest first; findRate (rule A) picks from them. Only pairs of `currencies`, by default the ones
 * an account may hold: the daily rows of every NBU currency would push their older rates out of the window; null
 * reads every currency (the rates views) */
export async function getLedgerRates(
  supabase: SaldoClient,
  ledgerId: string,
  currencies: readonly string[] | null = CURRENCIES,
): Promise<FxRate[]> {
  const rows = supabase
    .from('fx_rates')
    .select('base_currency, quote_currency, rate, rate_on, source')
    .eq('ledger_id', ledgerId)
  const scoped = currencies ? rows.in('base_currency', [...currencies]).in('quote_currency', [...currencies]) : rows
  // shortcut: the newest 1000 rates of the space; page by currency pair once a space has more
  const { data, error } = await scoped.order('rate_on', { ascending: false }).limit(1000)

  if (error) {
    throw error
  }

  return data.map(toFxRate)
}

/** the space's base currency and its FX rates (of `currencies`, as getLedgerRates) */
export async function getLedgerFx(
  supabase: SaldoClient,
  ledgerId: string,
  currencies?: readonly string[] | null,
): Promise<LedgerFx> {
  const [ledger, rates] = await Promise.all([
    supabase.from('ledgers').select('base_currency').eq('id', ledgerId).single(),
    getLedgerRates(supabase, ledgerId, currencies),
  ])

  if (ledger.error) {
    throw ledger.error
  }

  return {
    baseCurrency: ledger.data.base_currency,
    rates,
  }
}
