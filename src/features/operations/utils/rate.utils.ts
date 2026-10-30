import Decimal from 'decimal.js'
import { minorDigits } from '@/lib/money/money.utils'

/** units of `toCurrency` per 1 unit of `fromCurrency` that two real amounts imply (800 € → 33 200 ₴ is 41.5); null for zero */
export function impliedRate(
  fromMinor: number,
  fromCurrency: string,
  toMinor: number,
  toCurrency: string,
): Decimal | null {
  if (fromMinor <= 0 || toMinor <= 0) {
    return null
  }

  const fromUnits = new Decimal(fromMinor).dividedBy(Decimal.pow(10, minorDigits(fromCurrency)))
  const toUnits = new Decimal(toMinor).dividedBy(Decimal.pow(10, minorDigits(toCurrency)))

  return toUnits.dividedBy(fromUnits)
}

/** «41,50»: at least two and at most four decimals, in the active locale, from a decimal string */
export const formatRate = (rate: Decimal, locale: string) =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(rate.toString() as Intl.StringNumericLiteral)
