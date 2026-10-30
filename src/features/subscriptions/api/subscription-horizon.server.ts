import 'server-only'
import type { Logger } from 'pino'
import type { RecurrenceUnit, ShortMonthRule } from '@/lib/recurrence/recurrence.utils'
import { logPgError } from '@/lib/supabase/pg-error.server'
import { localDate } from '@/lib/utils/clock.utils'
import type { SaldoClient } from '@/types/supabase.types'
import { type SubscriptionStatus, seriesRows } from '../utils/subscription-series.utils'
import { priceOn, type SubscriptionPrice } from '../utils/subscriptions.utils'

const HORIZON_COLUMNS =
  'id, ledger_id, name, account_id, category_id, currency, interval_unit, interval_count, first_on, short_month_rule, status, ledgers(time_zone), subscription_prices(effective_on, amount_minor, currency)'

type HorizonRow = {
  id: string
  ledger_id: string
  name: string
  account_id: string | null
  category_id: string | null
  currency: string
  interval_unit: string
  interval_count: number
  first_on: string
  short_month_rule: string
  status: string
  ledgers: { time_zone: string } | null
  subscription_prices: {
    effective_on: string
    amount_minor: number | null
    currency: string
  }[]
}

export type HorizonResult = {
  subscriptions: number
  inserted: number
  failed: number
}

// shortcut: one page of PostgREST rows (1000 subscriptions over every space); page by id once there are more
async function listPlanningSubscriptions(admin: SaldoClient): Promise<HorizonRow[]> {
  const { data, error } = await admin
    .from('subscriptions')
    .select(HORIZON_COLUMNS)
    .is('archived_at', null)
    .in('status', ['trial', 'active', 'cancel_intended'])

  if (error) {
    throw error
  }

  return data as unknown as HorizonRow[]
}

/** the dates that already have a live obligation: they are skipped, as upsert_series_obligations skips them */
async function plannedDates(admin: SaldoClient, subscriptionId: string, from: string): Promise<Set<string>> {
  const { data, error } = await admin
    .from('obligations')
    .select('occurrence_on')
    .eq('source_type', 'subscription')
    .eq('source_id', subscriptionId)
    .eq('lifecycle', 'active')
    .gte('occurrence_on', from)

  if (error) {
    throw error
  }

  return new Set(data.map((row) => row.occurrence_on))
}

const toPrices = (row: HorizonRow): SubscriptionPrice[] =>
  row.subscription_prices.map((price) => ({
    effectiveOn: price.effective_on,
    amountMinor: price.amount_minor,
    currency: price.currency,
  }))

/** the missing dates of one series from today to the horizon, each at the price in force on its own date (the rule of
 * private.subscription_price), with the subscription's title, account and category */
function missingObligations(row: HorizonRow, today: string, planned: Set<string>) {
  const prices = toPrices(row)
  const dates = seriesRows(
    {
      unit: row.interval_unit as RecurrenceUnit,
      count: row.interval_count,
      firstOn: row.first_on,
      shortMonthRule: row.short_month_rule as ShortMonthRule,
      status: row.status as SubscriptionStatus,
      archivedAt: null,
    },
    today,
  ).filter((date) => !planned.has(date.occurrence_on))

  return dates.map((date) => {
    const price = priceOn(prices, date.occurrence_on)

    return {
      ledger_id: row.ledger_id,
      direction: 'out',
      source_type: 'subscription',
      source_id: row.id,
      title: row.name,
      occurrence_on: date.occurrence_on,
      due_on: date.due_on,
      planned_amount_minor: price?.amountMinor ?? null,
      currency: price?.currency ?? row.currency,
      account_id: row.account_id,
      category_id: row.category_id,
    }
  })
}

async function extendOne(admin: SaldoClient, row: HorizonRow, now: Date): Promise<number> {
  const today = localDate(now, row.ledgers?.time_zone ?? 'UTC')
  const rows = missingObligations(row, today, await plannedDates(admin, row.id, today))

  if (rows.length === 0) {
    return 0
  }

  const { error } = await admin.from('obligations').insert(rows)

  if (error) {
    throw error
  }

  return rows.length
}

/**
 * Plan 2.6: keeps every planning subscription (trial, active, cancel intended; not archived) materialised 13 months
 * ahead. upsert_series_obligations cannot run here — it checks the caller's membership (auth.uid()), which the
 * secret key does not have — so the cron inserts the missing dates itself with the same pricing rule. It only adds
 * dates: paid ones, earlier ones and the unpaid ones a settings change already rewrote stay as they are. One
 * subscription failing (a concurrent edit took the date: 23505) does not stop the others; the next run retries it.
 */
export async function extendSubscriptionHorizons(admin: SaldoClient, now: Date, log: Logger): Promise<HorizonResult> {
  const subscriptions = await listPlanningSubscriptions(admin)
  let inserted = 0
  let failed = 0

  for (const row of subscriptions) {
    try {
      inserted += await extendOne(admin, row, now)
    } catch (error) {
      failed += 1
      logPgError(log.child({ subscriptionId: row.id }), error as { code?: string }, 'cron/daily: subscription horizon')
    }
  }

  return {
    subscriptions: subscriptions.length,
    inserted,
    failed,
  }
}
