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

/** the columns of `fx_rates` the app reads */
export type FxRateRow = {
  base_currency: string
  quote_currency: string
  rate: string | number
  rate_on: string
  source: string
}

export const toFxRate = (row: FxRateRow): FxRate => ({
  baseCurrency: row.base_currency,
  quoteCurrency: row.quote_currency,
  rate: row.rate,
  rateOn: row.rate_on,
  source: row.source as FxRate['source'],
})

/** the same names as the rounding column of tax rules; half_up rounds half away from zero, like Postgres round() */
export type RoundingMode = 'half_up' | 'half_even' | 'down'

const DECIMAL_ROUNDING: Record<RoundingMode, Decimal.Rounding> = {
  half_up: Decimal.ROUND_HALF_UP,
  half_even: Decimal.ROUND_HALF_EVEN,
  down: Decimal.ROUND_DOWN,
}

// enough significant digits for numeric(20,10) multiplied twice (cross rate) and a bigint amount
const Exact = Decimal.clone({ precision: 60 })

function isPair(row: FxRate, from: string, target: string, date: string) {
  return row.baseCurrency === from && row.quoteCurrency === target && row.rateOn <= date
}

/** a candidate beats the best so far when it is newer, or equally new and manual */
function beats(candidate: FxRate, best: FxRate | null) {
  if (best === null || candidate.rateOn > best.rateOn) {
    return true
  }

  return candidate.rateOn === best.rateOn && candidate.source === 'manual'
}

/** the newest row of the exact pair on or before `date`; manual beats reference on the same day (rule A) */
export function findRateRow(rates: readonly FxRate[], from: string, target: string, date: string): FxRate | null {
  let best: FxRate | null = null

  for (const row of rates) {
    if (isPair(row, from, target, date) && beats(row, best)) {
      best = row
    }
  }

  return best
}

function directRate(rates: readonly FxRate[], from: string, target: string, date: string): Decimal | null {
  const best = findRateRow(rates, from, target, date)

  return best ? new Exact(best.rate) : null
}

function pairRate(rates: readonly FxRate[], from: string, target: string, date: string): Decimal | null {
  const direct = directRate(rates, from, target, date)

  if (direct) {
    return direct
  }

  const inverse = directRate(rates, target, from, date)

  return inverse ? new Exact(1).dividedBy(inverse) : null
}

/** units of `target` per unit of `from` on the date: direct, inverted or crossed through one shared currency; null = unknown */
export function findRate(rates: readonly FxRate[], from: string, target: string, date: string): Decimal | null {
  if (from === target) {
    return new Exact(1)
  }

  const direct = pairRate(rates, from, target, date)

  if (direct) {
    return direct
  }

  return crossRate(rates, from, target, date)
}

/** from → bridge → target through the first currency both legs are known for */
function crossRate(rates: readonly FxRate[], from: string, target: string, date: string): Decimal | null {
  const bridges = new Set(rates.flatMap((row) => [row.baseCurrency, row.quoteCurrency]))

  for (const bridge of bridges) {
    const first = pairRate(rates, from, bridge, date)
    const second = first && pairRate(rates, bridge, target, date)

    if (bridge !== from && bridge !== target && first && second) {
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

/** amountMinor × numerator ÷ denominator in the same currency, rounded once with the given mode (installments, monthly averages) */
export function scaleMinor(
  amountMinor: bigint | number,
  numerator: Decimal.Value,
  denominator: Decimal.Value,
  rounding: RoundingMode,
): number {
  const divisor = new Exact(denominator)

  if (divisor.isZero()) {
    throw new RangeError('scaleMinor: the denominator is 0')
  }

  return new Exact(amountMinor.toString())
    .times(numerator)
    .dividedBy(divisor)
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

type Exchange = {
  fromAmountMinor: number
  fromCurrency: string
  toAmountMinor: number
  toCurrency: string
}

export type ExchangeRate = {
  rate: Decimal
  /** the currency of the «1» the rate is per */
  unit: string
}

/**
 * The rate an exchange implies, read the way every rate on screen reads: how much of the base currency one unit of the
 * other costs (₴ per 1 €), whichever way the money went. Without the base currency on either side, the target per unit
 * of the source. `unit` is the currency of that «1». null = one currency, or an amount is missing.
 */
export function exchangeRate(exchange: Exchange, baseCurrency: string): ExchangeRate | null {
  if (exchange.fromCurrency === exchange.toCurrency) {
    return null
  }

  const fromBase = exchange.fromCurrency === baseCurrency
  const rate = fromBase
    ? impliedRate(exchange.toAmountMinor, exchange.toCurrency, exchange.fromAmountMinor, exchange.fromCurrency)
    : impliedRate(exchange.fromAmountMinor, exchange.fromCurrency, exchange.toAmountMinor, exchange.toCurrency)

  return rate
    ? {
        rate,
        unit: fromBase ? exchange.toCurrency : exchange.fromCurrency,
      }
    : null
}

/** «41,50»: at least two and at most `maxDigits` decimals, in the active locale; Intl gets a decimal string, no float */
export const formatRate = (rate: Decimal.Value, locale: string, maxDigits = 4) =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDigits,
  }).format(new Decimal(rate).toFixed() as Intl.StringNumericLiteral)

/** a day's change of a rate: «+0,12», «−0,03», «0,00» with the digits of formatRate and a real minus sign */
export const formatRateChange = (change: Decimal.Value, locale: string, maxDigits = 4) =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDigits,
    signDisplay: 'exceptZero',
  })
    .format(new Decimal(change).toFixed() as Intl.StringNumericLiteral)
    .replace('-', '\u2212')
