import { tz } from '@date-fns/tz'
import { addMonths, format, parseISO } from 'date-fns'
import { generateOccurrences, type Series } from '@/lib/recurrence/recurrence.utils'
import { type Money, priceOn, type Subscription } from './subscriptions.utils'

export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'paused', 'cancel_intended', 'cancelled'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const SUBSCRIPTION_VERDICTS = ['keep', 'review', 'cancel'] as const
export type SubscriptionVerdict = (typeof SUBSCRIPTION_VERDICTS)[number]

/** how far ahead the dates of a series exist as obligations (plan 2.6: the daily cron keeps it there) */
const HORIZON_MONTHS = 13

export type SeriesSource = Series & {
  status: SubscriptionStatus
  archivedAt: string | null
}

/** a row of upsert_series_obligations: the nominal date is the idempotency key, the server prices it */
export type SeriesRow = {
  occurrence_on: string
  due_on: string
}

const utc = tz('UTC')

/** trial, active and «going to cancel» still get charged; paused, cancelled and archived ones plan nothing (§8) */
export const plansPayments = (source: Pick<SeriesSource, 'status' | 'archivedAt'>) =>
  source.archivedAt === null && ['trial', 'active', 'cancel_intended'].includes(source.status)

/** the last day (YYYY-MM-DD) a series is planned to, HORIZON_MONTHS after today */
export const horizonEnd = (today: string) =>
  format(addMonths(parseISO(today, { in: utc }), HORIZON_MONTHS, { in: utc }), 'yyyy-MM-dd')

const toSeriesRow = (date: string): SeriesRow => ({
  occurrence_on: date,
  due_on: date,
})

/** the dates a subscription plans from today to the horizon; none while it plans nothing. Past dates are never
 * generated: a subscription entered with an old first date does not fill «Upcoming» with unconfirmed payments */
export function seriesRows(source: SeriesSource, today: string): SeriesRow[] {
  if (!plansPayments(source)) {
    return []
  }

  return generateOccurrences({
    unit: source.unit,
    count: source.count,
    firstOn: source.firstOn,
    shortMonthRule: source.shortMonthRule,
    from: today,
    until: horizonEnd(today),
  }).map(toSeriesRow)
}

/** the next planned payment date within the horizon; null when there is none */
export const nextPaymentOn = (source: SeriesSource, today: string) =>
  seriesRows(source, today)[0]?.occurrence_on ?? null

/** the price of the next payment (today's while nothing is planned, the first one before it starts): what a row and
 * the card header show */
export function shownPrice(subscription: SeriesSource & Subscription, today: string): Money {
  const price =
    priceOn(subscription.prices, nextPaymentOn(subscription, today) ?? today) ?? subscription.prices[0] ?? null

  return {
    amountMinor: price?.amountMinor ?? null,
    currency: price?.currency ?? subscription.currency,
  }
}

export const SUBSCRIPTION_FILTERS = ['all', 'active', 'trial', 'paused', 'cancelled', 'review', 'archived'] as const
export type SubscriptionFilter = (typeof SUBSCRIPTION_FILTERS)[number]

type FilterItem = {
  status: SubscriptionStatus
  verdict: SubscriptionVerdict | null
  archivedAt: string | null
}

const live = (item: FilterItem) => item.archivedAt === null

// «cancelled» holds both cancellation states (§8): the intent and the confirmed one
const FILTER_MATCH: Record<SubscriptionFilter, (item: FilterItem) => boolean> = {
  all: live,
  active: (item) => live(item) && item.status === 'active',
  trial: (item) => live(item) && item.status === 'trial',
  paused: (item) => live(item) && item.status === 'paused',
  cancelled: (item) => live(item) && (item.status === 'cancelled' || item.status === 'cancel_intended'),
  review: (item) => live(item) && item.verdict === 'review',
  archived: (item) => !live(item),
}

export const matchesFilter = (item: FilterItem, filter: SubscriptionFilter) => FILTER_MATCH[filter](item)

export const filterCounts = (items: FilterItem[]) =>
  Object.fromEntries(
    SUBSCRIPTION_FILTERS.map((filter) => [filter, items.filter(FILTER_MATCH[filter]).length]),
  ) as Record<SubscriptionFilter, number>
