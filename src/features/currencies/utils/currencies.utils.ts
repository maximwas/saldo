import { CURRENCIES } from '@/constants/currencies.constants'
import { type FxRate, findRate } from '@/lib/money/fx.utils'

export type CurrentRate = {
  currency: string
  /** units of the base currency per 1 unit of `currency` on the date, rule A; null = no rate, never 0 */
  rate: string | null
}

/** for every currency except the base: the rate that applies on `today` (latest rate_on <= today, manual wins a tie) */
export const currentRates = (rates: readonly FxRate[], baseCurrency: string, today: string): CurrentRate[] =>
  CURRENCIES.filter((currency) => currency !== baseCurrency).map((currency) => ({
    currency,
    rate: findRate([...rates], currency, baseCurrency, today)?.toFixed() ?? null,
  }))
