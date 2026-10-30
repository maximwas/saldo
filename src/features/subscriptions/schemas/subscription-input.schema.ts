import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { SUBSCRIPTION_STATUSES, SUBSCRIPTION_VERDICTS } from '../utils/subscription-series.utils'

export const RECURRENCE_UNITS = ['day', 'month', 'year'] as const
export const SHORT_MONTH_RULES = ['last_day', 'next_month_first', 'skip'] as const

/** the series from `from` on (null on create: nothing to cancel yet); the server prices every date */
const seriesInputSchema = z.object({
  rows: z.array(
    z.object({
      occurrence_on: z.iso.date(),
      due_on: z.iso.date(),
    }),
  ),
  from: z.iso.date().nullable(),
})

export type SeriesInput = z.infer<typeof seriesInputSchema>

/** a row of subscription_prices; amount null = unknown (§7), never 0 */
export const setSubscriptionPriceInputSchema = z.object({
  id: z.uuid(),
  subscription_id: z.uuid(),
  effective_on: z.iso.date(),
  amount_minor: z.int().positive().nullable(),
  currency: z.enum(CURRENCIES),
})

export type SetSubscriptionPriceInput = z.infer<typeof setSubscriptionPriceInputSchema>

const subscriptionFieldsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category_id: z.uuid().nullable(),
  account_id: z.uuid().nullable(),
  interval_unit: z.enum(RECURRENCE_UNITS),
  interval_count: z.int().positive(),
  first_on: z.iso.date(),
  short_month_rule: z.enum(SHORT_MONTH_RULES),
  status: z.enum(SUBSCRIPTION_STATUSES),
  trial_ends_on: z.iso.date().nullable(),
  service_url: z.string().max(500).nullable(),
  note: z.string().max(500).nullable(),
})

/** the row, its first price and its dates: three idempotent calls with client ids (subscriptions.api) */
export const createSubscriptionInputSchema = z.object({
  subscription: subscriptionFieldsSchema.extend({
    id: z.uuid(),
    ledger_id: z.uuid(),
    currency: z.enum(CURRENCIES),
  }),
  price: setSubscriptionPriceInputSchema,
  series: seriesInputSchema,
})

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionInputSchema>

/** a versioned row edit; `series` is null when the change moves no date (a verdict) */
export const updateSubscriptionInputSchema = z.object({
  id: z.uuid(),
  expectedVersion: z.int().positive(),
  patch: subscriptionFieldsSchema
    .extend({
      verdict: z.enum(SUBSCRIPTION_VERDICTS).nullable(),
      access_ends_on: z.iso.date().nullable(),
      cancelled_on: z.iso.date().nullable(),
      archived_at: z.iso.datetime({ offset: true }).nullable(),
    })
    .partial(),
  series: seriesInputSchema.nullable(),
})

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionInputSchema>

/** ledgers.subscription_defaults: what a new subscription starts with; existing ones never change with it (§8) */
export const subscriptionDefaultsSchema = z.object({
  account_id: z.uuid().nullable(),
})

export type SubscriptionDefaults = z.infer<typeof subscriptionDefaultsSchema>

export const setSubscriptionDefaultsInputSchema = z.object({
  ledgerId: z.uuid(),
  expectedVersion: z.int().positive(),
  defaults: subscriptionDefaultsSchema,
})

export type SetSubscriptionDefaultsInput = z.infer<typeof setSubscriptionDefaultsInputSchema>
