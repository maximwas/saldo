import type { FxRate } from '@/lib/money/fx.utils'
import type { SaldoClient } from '@/types/supabase.types'

export type LedgerFx = {
  baseCurrency: string
  rates: FxRate[]
}

/** the space's base currency and its FX rates, newest first; findRate (rule A) picks from them */
export async function getLedgerFx(supabase: SaldoClient, ledgerId: string): Promise<LedgerFx> {
  const [ledger, rates] = await Promise.all([
    supabase.from('ledgers').select('base_currency').eq('id', ledgerId).single(),
    // shortcut: the newest 1000 rates of the space; page by currency pair once a space has more
    supabase
      .from('fx_rates')
      .select('base_currency, quote_currency, rate, rate_on, source')
      .eq('ledger_id', ledgerId)
      .order('rate_on', { ascending: false })
      .limit(1000),
  ])

  if (ledger.error) {
    throw ledger.error
  }

  if (rates.error) {
    throw rates.error
  }

  return {
    baseCurrency: ledger.data.base_currency,
    rates: rates.data.map((row) => ({
      baseCurrency: row.base_currency,
      quoteCurrency: row.quote_currency,
      rate: row.rate,
      rateOn: row.rate_on,
      source: row.source as FxRate['source'],
    })),
  }
}
