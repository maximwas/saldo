import type { Database } from '@/types/database.types'
import type { SaldoClient } from '@/types/supabase.types'

export type StatsParams = {
  ledgerId: string
  from: string
  to: string
  /** ISO date of the first day of each bucket is returned, the grouping is chosen here */
  bucket: 'day' | 'week' | 'month' | 'year'
  /** «Who»: narrows the operations only, never plans or limits */
  createdBy: string | null
}

type Returns<Name extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][Name]['Returns'] extends (infer Row)[] ? Row : never
type Nullable<Row, Keys extends keyof Row> = Omit<Row, Keys> & { [Key in Keys]: Row[Key] | null }

export type CashflowRow = Returns<'stats_cashflow'>
export type CategoryRow = Nullable<Returns<'stats_by_category'>, 'category_id'>
export type BudgetRow = Nullable<Returns<'stats_budget'>, 'income_plan_minor' | 'limit_minor'>
export type SubscriptionRow = Nullable<Returns<'stats_subscriptions'>, 'plan_minor' | 'avg_month_minor'>
export type CreditRow = Nullable<
  Returns<'stats_credits'>,
  'remaining_minor' | 'remaining_base_minor' | 'next_due_on' | 'payoff_on' | 'lender'
>
export type PlanDay = Returns<'calendar_day_totals'>

const base = ({ ledgerId, from, to, createdBy }: StatsParams) => ({
  p_ledger_id: ledgerId,
  p_from: from,
  p_to: to,
  p_created_by: createdBy ?? undefined,
})

type RpcResult<Row> = {
  data: Row[] | null
  error: Error | null
}

function rowsOf<Row>(result: RpcResult<Row>): Row[] {
  if (result.error) {
    throw result.error
  }

  return result.data ?? []
}

export async function getCashflow(supabase: SaldoClient, params: StatsParams): Promise<CashflowRow[]> {
  return rowsOf(
    await supabase.rpc('stats_cashflow', {
      ...base(params),
      p_bucket: params.bucket,
    }),
  )
}

export async function getByCategory(supabase: SaldoClient, params: StatsParams): Promise<CategoryRow[]> {
  return rowsOf(await supabase.rpc('stats_by_category', base(params))) as CategoryRow[]
}

export async function getBudget(supabase: SaldoClient, params: StatsParams): Promise<BudgetRow[]> {
  return rowsOf(await supabase.rpc('stats_budget', base(params))) as BudgetRow[]
}

export async function getSubscriptions(supabase: SaldoClient, params: StatsParams): Promise<SubscriptionRow[]> {
  return rowsOf(await supabase.rpc('stats_subscriptions', base(params))) as SubscriptionRow[]
}

export async function getCredits(supabase: SaldoClient, params: StatsParams): Promise<CreditRow[]> {
  return rowsOf(await supabase.rpc('stats_credits', base(params))) as CreditRow[]
}

/** the forecast is only what the entered obligation schedules say (§20): plans of the calendar, no guesses */
type ForecastParams = Pick<StatsParams, 'ledgerId' | 'from' | 'to'>

export async function getForecast(supabase: SaldoClient, { ledgerId, from, to }: ForecastParams): Promise<PlanDay[]> {
  return rowsOf(
    await supabase.rpc('calendar_day_totals', {
      p_ledger_id: ledgerId,
      p_from: from,
      p_to: to,
      p_filter: { entry: 'plan' },
    }),
  )
}
