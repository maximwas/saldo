import type Decimal from 'decimal.js'
import { convertMinor, type FxRate, findRate } from '@/lib/money/fx.utils'

type RateParams = {
  currency: string
  baseCurrency: string
  rates: FxRate[]
  /** YYYY-MM-DD: the day whose rate converts */
  date: string
}

/** the rate behind a base-currency value (rule A); null for the base currency itself or when no rate links the currencies */
export function accountRate({ currency, baseCurrency, rates, date }: RateParams): Decimal | null {
  return currency === baseCurrency ? null : findRate(rates, currency, baseCurrency, date)
}

type BaseMinorParams = {
  balanceMinor: number
  currency: string
  baseCurrency: string
  rate: Decimal | null
}

/** a balance in the base currency; null when no rate links the currencies, never 0 */
export function accountBaseMinor({ balanceMinor, currency, baseCurrency, rate }: BaseMinorParams): number | null {
  if (currency === baseCurrency) {
    return balanceMinor
  }

  return rate ? convertMinor(balanceMinor, currency, baseCurrency, rate, 'half_up') : null
}
