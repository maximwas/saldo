import { convertAt, type FxRate, scaleMinor } from '@/lib/money/fx.utils'
import { generateOccurrences, type RecurrenceUnit, type Series } from '@/lib/recurrence/recurrence.utils'

/** a row of subscription_prices; amountMinor null = unknown, never 0 */
export type SubscriptionPrice = {
  /** YYYY-MM-DD: the price applies to occurrences on and after this date */
  effectiveOn: string
  amountMinor: number | null
  currency: string
}

export type Subscription = Series & {
  /** subscriptions.currency, used while no price is known */
  currency: string
  prices: SubscriptionPrice[]
}

/** an amount in its currency; null = unknown */
export type Money = {
  amountMinor: number | null
  currency: string
}

export type PlannedOccurrence = Money & {
  occurrenceOn: string
}

export type Total = {
  totalMinor: number
  /** amounts left out of the total: unknown, or no rate to the base currency */
  unknownCount: number
}

/** the price in force on a date: the latest effectiveOn on or before it; null before the first price */
export function priceOn(prices: SubscriptionPrice[], date: string): SubscriptionPrice | null {
  let current: SubscriptionPrice | null = null

  for (const price of prices) {
    if (price.effectiveOn <= date && (current === null || price.effectiveOn > current.effectiveOn)) {
      current = price
    }
  }

  return current
}

function moneyOn(subscription: Subscription, date: string): Money {
  const price = priceOn(subscription.prices, date)

  return {
    amountMinor: price?.amountMinor ?? null,
    currency: price?.currency ?? subscription.currency,
  }
}

/** occurrences in [from, until], each at the price in force on its own date, so a new price never reaches earlier ones */
export function plannedOccurrences(subscription: Subscription, from: string, until: string): PlannedOccurrence[] {
  return generateOccurrences({
    ...subscription,
    from,
    until,
  }).map((occurrenceOn) => ({
    occurrenceOn,
    ...moneyOn(subscription, occurrenceOn),
  }))
}

/** the obligation columns a price change looks at */
export type PricedObligation = {
  occurrenceOn: string
  paidMinor: number
}

/** a planned obligation takes a new price only from the effective date on and only while nothing is paid on it (§8) */
export const takesNewPrice = (obligation: PricedObligation, effectiveOn: string) =>
  obligation.occurrenceOn >= effectiveOn && obligation.paidMinor === 0

// the mean Gregorian year, so «every N days» costs price × 365.2425 / 12 / N a month
const DAYS_PER_YEAR = '365.2425'

/** numerator and denominator that turn one price per `count` units into a monthly amount */
const PER_MONTH: Record<RecurrenceUnit, (count: number) => [string | number, number]> = {
  day: (count) => [DAYS_PER_YEAR, 12 * count],
  month: (count) => [1, count],
  year: (count) => [1, 12 * count],
}

/** the normalized monthly cost at the price in force on a date (half_up): a yearly price is not a monthly expense (§8) */
export function monthlyCost(subscription: Subscription, date: string): Money {
  const money = moneyOn(subscription, date)

  if (money.amountMinor === null) {
    return money
  }

  const [numerator, denominator] = PER_MONTH[subscription.unit](subscription.count)

  return {
    ...money,
    amountMinor: scaleMinor(money.amountMinor, numerator, denominator, 'half_up'),
  }
}

type TotalsInput = {
  subscriptions: Subscription[]
  /** YYYY-MM */
  month: string
  /** YYYY-MM-DD: the day whose prices and rates count (today in the ledger zone) */
  date: string
  baseCurrency: string
  rates: FxRate[]
}

/** a sum in the base currency (half_up); an unknown amount or a missing rate is counted apart, never added as 0 */
function totalInBase(items: Money[], { baseCurrency, rates, date }: TotalsInput): Total {
  let totalMinor = 0
  let unknownCount = 0

  for (const { amountMinor, currency } of items) {
    const baseMinor =
      amountMinor === null ? null : convertAt(amountMinor, currency, baseCurrency, rates, date, 'half_up')

    if (baseMinor === null) {
      unknownCount += 1
    } else {
      totalMinor += baseMinor
    }
  }

  return {
    totalMinor,
    unknownCount,
  }
}

/** the two totals of §8: the payments the month plans, and the normalized monthly average */
export function subscriptionTotals(input: TotalsInput): {
  planned: Total
  normalized: Total
} {
  // as strings every day of a month sorts between its -01 and -31, whatever the month's length
  const planned = input.subscriptions.flatMap((subscription) =>
    plannedOccurrences(subscription, `${input.month}-01`, `${input.month}-31`),
  )
  const normalized = input.subscriptions.map((subscription) => monthlyCost(subscription, input.date))

  return {
    planned: totalInBase(planned, input),
    normalized: totalInBase(normalized, input),
  }
}
