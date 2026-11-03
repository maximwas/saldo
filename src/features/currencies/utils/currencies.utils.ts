import type { CategoryColor } from '@/constants/category-colors.constants'
import { CURRENCIES } from '@/constants/currencies.constants'
import { type FxRate, findRate, findRateRow } from '@/lib/money/fx.utils'

export type BoardRate = {
  currency: string
  /** units of the base currency per 1 unit of `currency` today by rule A; null = no rate, never 0 */
  rate: string | null
  /** the day of that rate; null when it is unknown or crossed through another currency */
  rateOn: string | null
  /** the member's own rate of that day beats NBU's */
  manual: boolean
  /** NBU's rate of the same day beside a manual one; null without it */
  nbuRate: string | null
  /** the rate minus the one of the latest earlier day; null without an earlier rate (never 0) */
  change: string | null
}

/** NBU's rate of the day a manual rate applies, shown beside it; null without one */
function nbuBeside(rates: readonly FxRate[], manual: FxRate) {
  const nbu = rates.find(
    (candidate) =>
      candidate.source === 'reference' &&
      candidate.baseCurrency === manual.baseCurrency &&
      candidate.quoteCurrency === manual.quoteCurrency &&
      candidate.rateOn === manual.rateOn,
  )

  return nbu ? String(nbu.rate) : null
}

function boardRow(rates: readonly FxRate[], currency: string, baseCurrency: string, today: string): BoardRate {
  const row = findRateRow(rates, currency, baseCurrency, today)
  const current = findRate(rates, currency, baseCurrency, today)
  const rate = current?.toFixed() ?? null

  if (row === null || current === null) {
    return {
      currency,
      rate,
      rateOn: null,
      manual: false,
      nbuRate: null,
      change: null,
    }
  }

  const earlier = findRate(
    rates.filter((candidate) => candidate.rateOn < row.rateOn),
    currency,
    baseCurrency,
    row.rateOn,
  )
  const manual = row.source === 'manual'

  return {
    currency,
    rate,
    rateOn: row.rateOn,
    manual,
    nbuRate: manual ? nbuBeside(rates, row) : null,
    change: earlier ? current.minus(earlier).toFixed() : null,
  }
}

/**
 * Every currency except the base with the rate that applies `today`: the ones an account may hold, every one with a
 * stored rate (the daily NBU rows) and the `pinned` ones, A→Z by code. The day's change compares with the rate rule A
 * gives for the day before the current rate's day, so a manual rate of today is compared with yesterday's NBU rate.
 */
export function rateBoard(
  rates: readonly FxRate[],
  baseCurrency: string,
  today: string,
  pinned: readonly string[] = [],
): BoardRate[] {
  const currencies = new Set([
    ...CURRENCIES,
    ...pinned,
    ...rates.flatMap((row) => [row.baseCurrency, row.quoteCurrency]),
  ])

  currencies.delete(baseCurrency)

  return [...currencies].sort().map((currency) => boardRow(rates, currency, baseCurrency, today))
}

// the LetterAvatar colours of rate rows by their place, as Figma draws them (50:122598: USD green, EUR blue, PLN red …)
const RATE_COLORS = [
  'green',
  'blue',
  'red',
  'purple',
  'orange',
  'teal',
  'pink',
] as const satisfies readonly CategoryColor[]

export const rateColor = (index: number) => RATE_COLORS[index % RATE_COLORS.length]

/** digits of a rate on the rates views: two («41,60»), four below 1 («0,3356»), where two would hide the rate */
export const boardDigits = (rate: string) => (Number(rate) < 1 ? 4 : 2)

/** the pinned currencies first, in the member's order, then the others A→Z by name; the base is never pinned */
export function splitBoard(
  board: readonly BoardRate[],
  pinned: readonly string[],
  nameOf: (currency: string) => string,
) {
  const shown = pinned.flatMap((currency) => board.filter((row) => row.currency === currency))
  const others = board
    .filter((row) => !pinned.includes(row.currency))
    .sort((left, right) => nameOf(left.currency).localeCompare(nameOf(right.currency)))

  return {
    shown,
    others,
  }
}
