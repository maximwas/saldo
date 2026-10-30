import {
  type LedgerAccountOption,
  type LedgerCategoryOption,
  listAccountOptions,
  listCategoryOptions,
} from '@/lib/finance/ledger-options.api'
import type { RecurrenceUnit, ShortMonthRule } from '@/lib/recurrence/recurrence.utils'
import { versionConflict } from '@/lib/supabase/version-conflict.utils'
import type { Database } from '@/types/database.types'
import type { SaldoClient } from '@/types/supabase.types'
import {
  type CreateSubscriptionInput,
  createSubscriptionInputSchema,
  type SeriesInput,
  type SetSubscriptionDefaultsInput,
  type SetSubscriptionPriceInput,
  type SubscriptionDefaults,
  setSubscriptionDefaultsInputSchema,
  setSubscriptionPriceInputSchema,
  subscriptionDefaultsSchema,
  type UpdateSubscriptionInput,
  updateSubscriptionInputSchema,
} from '../schemas/subscription-input.schema'
import type { SubscriptionStatus, SubscriptionVerdict } from '../utils/subscription-series.utils'
import type { Subscription } from '../utils/subscriptions.utils'

export type SubscriptionView = Subscription & {
  id: string
  name: string
  categoryId: string | null
  accountId: string | null
  shortMonthRule: ShortMonthRule
  status: SubscriptionStatus
  trialEndsOn: string | null
  accessEndsOn: string | null
  cancelledOn: string | null
  serviceUrl: string | null
  note: string | null
  verdict: SubscriptionVerdict | null
  archivedAt: string | null
  version: number
}

/** an obligation of the series as «History» shows it */
export type SubscriptionPayment = {
  id: string
  dueOn: string
  /** null = unknown amount (§7) */
  plannedMinor: number | null
  paidMinor: number
  currency: string
  state: 'plan' | 'partial' | 'unconfirmed' | 'paid'
}

export type SubscriptionOptions = {
  accounts: LedgerAccountOption[]
  categories: LedgerCategoryOption[]
}

export type SubscriptionDefaultsView = {
  defaults: SubscriptionDefaults
  /** ledgers.version: the defaults are a versioned ledger edit */
  version: number
}

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'] & {
  subscription_prices: Pick<
    Database['public']['Tables']['subscription_prices']['Row'],
    'effective_on' | 'amount_minor' | 'currency'
  >[]
}

const SUBSCRIPTION_COLUMNS = '*, subscription_prices(effective_on, amount_minor, currency)'

function toSubscriptionView(row: SubscriptionRow): SubscriptionView {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    accountId: row.account_id,
    currency: row.currency,
    unit: row.interval_unit as RecurrenceUnit,
    count: row.interval_count,
    firstOn: row.first_on,
    shortMonthRule: row.short_month_rule as ShortMonthRule,
    status: row.status as SubscriptionStatus,
    trialEndsOn: row.trial_ends_on,
    accessEndsOn: row.access_ends_on,
    cancelledOn: row.cancelled_on,
    serviceUrl: row.service_url,
    note: row.note,
    verdict: row.verdict as SubscriptionVerdict | null,
    archivedAt: row.archived_at,
    version: row.version,
    prices: row.subscription_prices
      .map((price) => ({
        effectiveOn: price.effective_on,
        amountMinor: price.amount_minor,
        currency: price.currency,
      }))
      .sort((left, right) => left.effectiveOn.localeCompare(right.effectiveOn)),
  }
}

/** every subscription of the space with its price history, archived ones too (the «Archive» filter) */
export async function listSubscriptions(supabase: SaldoClient, ledgerId: string): Promise<SubscriptionView[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_COLUMNS)
    .eq('ledger_id', ledgerId)
    .order('name')

  if (error) {
    throw error
  }

  return (data as SubscriptionRow[]).map(toSubscriptionView)
}

type PaymentRow = {
  obligation_id: string
  due_on: string
  planned_amount_minor: number | null
  paid_minor: number
  currency: string
  state: string
}

const toPayment = (row: PaymentRow): SubscriptionPayment => ({
  id: row.obligation_id,
  dueOn: row.due_on,
  plannedMinor: row.planned_amount_minor,
  paidMinor: row.paid_minor,
  currency: row.currency,
  state: row.state as SubscriptionPayment['state'],
})

/** the live obligations of one subscription, oldest first: paid ones keep the amount they were paid at (§8) */
export async function listSubscriptionPayments(
  supabase: SaldoClient,
  subscriptionId: string,
): Promise<SubscriptionPayment[]> {
  const { data, error } = await supabase
    .from('obligation_states')
    .select('obligation_id, due_on, planned_amount_minor, paid_minor, currency, state')
    .eq('source_type', 'subscription')
    .eq('source_id', subscriptionId)
    .eq('lifecycle', 'active')
    .order('due_on')

  if (error) {
    throw error
  }

  return (data as PaymentRow[]).map(toPayment)
}

/** pick lists of the form: live accounts and expense categories */
export async function listSubscriptionOptions(supabase: SaldoClient, ledgerId: string): Promise<SubscriptionOptions> {
  const [accounts, categories] = await Promise.all([
    listAccountOptions(supabase, ledgerId),
    listCategoryOptions(supabase, ledgerId),
  ])

  return {
    accounts: accounts.filter((account) => !account.archived),
    categories: categories.filter((category) => !category.archived && category.kind === 'expense'),
  }
}

const NO_DEFAULTS: SubscriptionDefaults = { account_id: null }

export async function getSubscriptionDefaults(
  supabase: SaldoClient,
  ledgerId: string,
): Promise<SubscriptionDefaultsView> {
  const { data, error } = await supabase
    .from('ledgers')
    .select('subscription_defaults, version')
    .eq('id', ledgerId)
    .single()

  if (error) {
    throw error
  }

  const parsed = subscriptionDefaultsSchema.safeParse(data.subscription_defaults)

  return {
    defaults: parsed.success ? parsed.data : NO_DEFAULTS,
    version: data.version,
  }
}

/** materialises the dates; with `from` the series from that date on becomes exactly these rows */
async function upsertSeries(supabase: SaldoClient, subscriptionId: string, series: SeriesInput) {
  const { error } = await supabase.rpc('upsert_series_obligations', {
    p_source_type: 'subscription',
    p_source_id: subscriptionId,
    p_rows: series.rows,
    p_from: series.from ?? undefined,
  })

  if (error) {
    throw error
  }
}

async function callSetPrice(supabase: SaldoClient, price: SetSubscriptionPriceInput) {
  const { error } = await supabase.rpc('set_subscription_price', { p_price: price })

  if (error) {
    throw error
  }
}

/** row → first price → dates. Every step is idempotent (client ids, occurrence_on as the series key), so a replay
 * after a failure in the middle finishes the job. shortcut: three calls, not one transaction; a save_subscription
 * RPC would make it atomic */
export async function createSubscription(supabase: SaldoClient, rawInput: CreateSubscriptionInput) {
  const input = createSubscriptionInputSchema.parse(rawInput)
  const { error } = await supabase.from('subscriptions').upsert(input.subscription, {
    onConflict: 'id',
    ignoreDuplicates: true,
  })

  if (error) {
    throw error
  }

  await callSetPrice(supabase, input.price)
  await upsertSeries(supabase, input.subscription.id, input.series)
}

/** versioned row edit (PT409 when stale), then the unpaid dates from today follow the new settings */
export async function updateSubscription(supabase: SaldoClient, rawInput: UpdateSubscriptionInput) {
  const input = updateSubscriptionInputSchema.parse(rawInput)
  const { data, error } = await supabase
    .from('subscriptions')
    .update(input.patch)
    .eq('id', input.id)
    .eq('version', input.expectedVersion)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw versionConflict()
  }

  if (input.series) {
    await upsertSeries(supabase, input.id, input.series)
  }
}

/** a new price from a date: only unpaid obligations from that date take it (the RPC keeps paid ones as they were) */
export async function setSubscriptionPrice(supabase: SaldoClient, input: SetSubscriptionPriceInput) {
  await callSetPrice(supabase, setSubscriptionPriceInputSchema.parse(input))
}

/** owner only (ledgers RLS); existing subscriptions keep their own settings (§8) */
export async function setSubscriptionDefaults(supabase: SaldoClient, rawInput: SetSubscriptionDefaultsInput) {
  const input = setSubscriptionDefaultsInputSchema.parse(rawInput)
  const { data, error } = await supabase
    .from('ledgers')
    .update({ subscription_defaults: input.defaults })
    .eq('id', input.ledgerId)
    .eq('version', input.expectedVersion)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw versionConflict()
  }
}
