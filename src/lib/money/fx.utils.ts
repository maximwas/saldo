import Decimal from 'decimal.js'
import { minorDigits } from './money.utils'

/** a row of fx_rates: 1 unit of baseCurrency costs `rate` units of quoteCurrency (EUR/UAH 41.5) */
export type FxRate = {
  baseCurrency: string
  quoteCurrency: string
  /** numeric(20,10) as PostgREST returns it; a string keeps every digit */
  rate: string | number
  /** YYYY-MM-DD */
  rateOn: string
  source: 'manual' | 'reference'
}

/** the same names as the rounding column of tax rules; half_up rounds half away from zero, like Postgres round() */
export type RoundingMode = 'half_up' | 'half_even' | 'down'

const DECIMAL_ROUNDING: Record<RoundingMode, Decimal.Rounding> = {
  half_up: Decimal.ROUND_HALF_UP,
  half_even: Decimal.ROUND_HALF_EVEN,
  down: Decimal.ROUND_DOWN,
}

// enough significant digits for numeric(20,10) multiplied twice (cross rate) and a bigint amount
const Exact = Decimal.clone({ precision: 60 })

/** the newest rate of the exact pair on or before `on`; manual beats reference on the same day */
function directRate(rates: FxRate[], from: string, target: string, date: string): Decimal | null {
  let best: FxRate | null = null

  for (const row of rates) {
    if (row.baseCurrency !== from || row.quoteCurrency !== target || row.rateOn > date) {
      continue
    }

    const newer = best === null || row.rateOn > best.rateOn
    const manualSameDay = best !== null && row.rateOn === best.rateOn && row.source === 'manual'

    if (newer || manualSameDay) {
      best = row
    }
  }

  return best ? new Exact(best.rate) : null
}

function pairRate(rates: FxRate[], from: string, target: string, date: string): Decimal | null {
  const direct = directRate(rates, from, target, date)

  if (direct) {
    return direct
  }

  const inverse = directRate(rates, target, from, date)

  return inverse ? new Exact(1).dividedBy(inverse) : null
}

/** units of `target` per unit of `from` on the date: direct, inverted or crossed through one shared currency; null = unknown */
export function findRate(rates: FxRate[], from: string, target: string, date: string): Decimal | null {
  if (from === target) {
    return new Exact(1)
  }

  const direct = pairRate(rates, from, target, date)

  if (direct) {
    return direct
  }

  const bridges = new Set(rates.flatMap((row) => [row.baseCurrency, row.quoteCurrency]))

  for (const bridge of bridges) {
    if (bridge === from || bridge === target) {
      continue
    }

    const first = pairRate(rates, from, bridge, date)
    const second = first && pairRate(rates, bridge, target, date)

    if (first && second) {
      return first.times(second)
    }
  }

  return null
}

/** minor units of `from` → minor units of `target`, rounded once at the end with the given mode */
export function convertMinor(
  amountMinor: bigint | number,
  from: string,
  target: string,
  rate: Decimal.Value,
  rounding: RoundingMode,
): number {
  const scale = minorDigits(target) - minorDigits(from)

  return new Exact(amountMinor.toString())
    .times(rate)
    .times(Exact.pow(10, scale))
    .toDecimalPlaces(0, DECIMAL_ROUNDING[rounding])
    .toNumber()
}

/** convert with the rate known on the date; null when no rate links the currencies, never 0 */
export function convertAt(
  amountMinor: bigint | number,
  from: string,
  target: string,
  rates: FxRate[],
  date: string,
  rounding: RoundingMode,
): number | null {
  const rate = findRate(rates, from, target, date)

  return rate ? convertMinor(amountMinor, from, target, rate, rounding) : null
}
