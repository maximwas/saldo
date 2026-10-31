import { z } from 'zod'
import { SERVICE_CHOICES } from '@/components/ui/service-logo.utils'
import { CURRENCIES } from '@/constants/currencies.constants'
import type { SubscriptionView } from '../api/subscriptions.api'
import { type SeriesSource, SUBSCRIPTION_STATUSES, seriesRows } from '../utils/subscription-series.utils'
import { priceOn } from '../utils/subscriptions.utils'
import {
  type CreateSubscriptionInput,
  RECURRENCE_UNITS,
  type SetSubscriptionPriceInput,
  SHORT_MONTH_RULES,
  type UpdateSubscriptionInput,
} from './subscription-input.schema'

/** messages are keys of the errors namespace; FormField translates them */
export const subscriptionFormSchema = z.object({
  /** the picker: a catalog service name (it fills `name`), 'custom' (the user types `name`), null = nothing chosen */
  service: z
    .string()
    .nullable()
    .refine((service) => service !== null, 'subscriptionServiceRequired'),
  name: z.string().trim().min(1, 'nameRequired').max(80, 'nameTooLong'),
  /** MoneyInput minor units; empty = an unknown amount (§7), never 0. Create only: later prices have a date */
  amountMinor: z.number().int().positive('amountOptionalInvalid').nullable(),
  currency: z.enum(CURRENCIES),
  accountId: z
    .uuid()
    .nullable()
    .refine((id) => id !== null, 'subscriptionAccountRequired'),
  categoryId: z.uuid().nullable(),
  unit: z.enum(RECURRENCE_UNITS),
  /** «every N»: typed as text, 1–999 */
  count: z
    .string()
    .trim()
    .regex(/^[1-9]\d{0,2}$/, 'countInvalid'),
  firstOn: z.iso.date('dateInvalid'),
  shortMonthRule: z.enum(SHORT_MONTH_RULES),
  status: z.enum(SUBSCRIPTION_STATUSES),
  trialEndsOn: z.iso.date().nullable(),
  serviceUrl: z.string().trim().max(500),
  note: z.string().trim().max(500),
})

export type SubscriptionFormInput = z.input<typeof subscriptionFormSchema>
export type SubscriptionFormValues = z.output<typeof subscriptionFormSchema>

type NewFormContext = {
  today: string
  currency: string
  /** the space default (§8) or the first account */
  accountId: string | null
}

/** a new subscription: monthly from today, active, the last day of a short month (the column default) */
export const newSubscriptionFormInput = (context: NewFormContext): SubscriptionFormInput => ({
  service: null,
  name: '',
  amountMinor: null,
  currency: context.currency as SubscriptionFormInput['currency'],
  accountId: context.accountId,
  categoryId: null,
  unit: 'month',
  count: '1',
  firstOn: context.today,
  shortMonthRule: 'last_day',
  status: 'active',
  trialEndsOn: null,
  serviceUrl: '',
  note: '',
})

/** the settings tab starts from the row; the amount is not edited there (prices have dates) */
export const subscriptionFormInput = (subscription: SubscriptionView): SubscriptionFormInput => ({
  service: SERVICE_CHOICES.find((service) => service.name === subscription.name)?.name ?? 'custom',
  name: subscription.name,
  amountMinor: null,
  currency: subscription.currency as SubscriptionFormInput['currency'],
  accountId: subscription.accountId,
  categoryId: subscription.categoryId,
  unit: subscription.unit,
  count: String(subscription.count),
  firstOn: subscription.firstOn,
  shortMonthRule: subscription.shortMonthRule,
  status: subscription.status,
  trialEndsOn: subscription.trialEndsOn,
  serviceUrl: subscription.serviceUrl ?? '',
  note: subscription.note ?? '',
})

const toSeriesSource = (values: SubscriptionFormValues, archivedAt: string | null): SeriesSource => ({
  unit: values.unit,
  count: Number(values.count),
  firstOn: values.firstOn,
  shortMonthRule: values.shortMonthRule,
  status: values.status,
  archivedAt,
})

function toFields(values: SubscriptionFormValues) {
  return {
    name: values.name.trim(),
    category_id: values.categoryId,
    account_id: values.accountId,
    interval_unit: values.unit,
    interval_count: Number(values.count),
    first_on: values.firstOn,
    short_month_rule: values.shortMonthRule,
    status: values.status,
    trial_ends_on: values.status === 'trial' ? values.trialEndsOn : null,
    service_url: values.serviceUrl || null,
    note: values.note || null,
  }
}

type CreateContext = {
  id: string
  priceId: string
  ledgerId: string
  /** YYYY-MM-DD in the ledger zone: the series starts here, never in the past */
  today: string
}

/** ids are made before mutate, so a replay after reload carries the same keys; the first price runs from first_on */
export function toCreateSubscriptionInput(
  values: SubscriptionFormValues,
  context: CreateContext,
): CreateSubscriptionInput {
  return {
    subscription: {
      ...toFields(values),
      id: context.id,
      ledger_id: context.ledgerId,
      currency: values.currency,
    },
    price: {
      id: context.priceId,
      subscription_id: context.id,
      effective_on: values.firstOn,
      amount_minor: values.amountMinor,
      currency: values.currency,
    },
    series: {
      rows: seriesRows(toSeriesSource(values, null), context.today),
      from: null,
    },
  }
}

/** settings edit: the unpaid dates from today follow the new settings; paid and earlier ones stay (§8) */
export function toUpdateSubscriptionInput(
  values: SubscriptionFormValues,
  subscription: SubscriptionView,
  today: string,
): UpdateSubscriptionInput {
  return {
    id: subscription.id,
    expectedVersion: subscription.version,
    patch: toFields(values),
    series: {
      rows: seriesRows(toSeriesSource(values, subscription.archivedAt), today),
      from: today,
    },
  }
}

export type StatusChange = Partial<Pick<SubscriptionView, 'status' | 'archivedAt' | 'cancelledOn' | 'accessEndsOn'>>

/** pause, resume, cancel, archive, restore: the state changes and the series from today follows it */
export function toStatusChangeInput(
  subscription: SubscriptionView,
  change: StatusChange,
  today: string,
): UpdateSubscriptionInput {
  const next = {
    ...subscription,
    ...change,
  }

  return {
    id: subscription.id,
    expectedVersion: subscription.version,
    patch: {
      status: next.status,
      archived_at: next.archivedAt,
      cancelled_on: next.cancelledOn,
      access_ends_on: next.accessEndsOn,
    },
    series: {
      rows: seriesRows(next, today),
      from: today,
    },
  }
}

/** the «keep / review / cancel» assessment moves no date */
export const toVerdictInput = (
  subscription: SubscriptionView,
  verdict: SubscriptionView['verdict'],
): UpdateSubscriptionInput => ({
  id: subscription.id,
  expectedVersion: subscription.version,
  patch: { verdict },
  series: null,
})

export const priceFormSchema = z.object({
  amountMinor: z
    .number()
    .int()
    .nullable()
    .refine((minor) => minor !== null && minor > 0, 'amountInvalid'),
  effectiveOn: z.iso.date('dateInvalid'),
})

export type PriceFormInput = z.input<typeof priceFormSchema>
export type PriceFormValues = z.output<typeof priceFormSchema>

/** the new price keeps the currency in force on its date (a currency change is a new subscription) */
export function toSetPriceInput(
  values: PriceFormValues,
  subscription: SubscriptionView,
  id: string,
): SetSubscriptionPriceInput {
  return {
    id,
    subscription_id: subscription.id,
    effective_on: values.effectiveOn,
    amount_minor: values.amountMinor,
    currency: (priceOn(subscription.prices, values.effectiveOn)?.currency ??
      subscription.currency) as SetSubscriptionPriceInput['currency'],
  }
}

export const CANCEL_OUTCOMES = ['cancelled', 'cancel_intended'] as const

export const cancelFormSchema = z.object({
  outcome: z.enum(CANCEL_OUTCOMES),
  accessEndsOn: z.iso.date().nullable(),
})

export type CancelFormValues = z.infer<typeof cancelFormSchema>

/** cancelling in Saldo is not cancelling the service (§8): a confirmed one stops the plan from today, an intent
 * keeps paying until it is confirmed */
export const toCancelInput = (values: CancelFormValues, subscription: SubscriptionView, today: string) =>
  toStatusChangeInput(
    subscription,
    {
      status: values.outcome,
      cancelledOn: values.outcome === 'cancelled' ? today : null,
      accessEndsOn: values.accessEndsOn,
    },
    today,
  )
