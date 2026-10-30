import { versionConflict } from '@/lib/supabase/version-conflict.utils'
import type { SaldoClient } from '@/types/supabase.types'
import {
  type CopyMonthInput,
  copyMonthInputSchema,
  type DeleteLimitInput,
  deleteLimitInputSchema,
  type SaveLimitInput,
  type SetIncomePlanInput,
  saveLimitInputSchema,
  setIncomePlanInputSchema,
} from '../schemas/budget-input.schema'
import { type BudgetFact, type CarryMode, DEFAULT_WARN_PCT, monthStart } from '../utils/budget.utils'

export type BudgetMonth = {
  /** null = the month has no budget row yet */
  monthId: string | null
  monthVersion: number | null
  incomePlanMinor: number | null
  facts: BudgetFact[]
}

type FactRow = {
  category_kind: string
  category_id: string | null
  limit_id: string | null
  limit_minor: number | null
  carried_in_minor: number | null
  warn_at_pct: number | null
  carry_mode: string | null
  fact_minor: number
  unknown_count: number
  remaining_minor: number | null
}

const toFact = (row: FactRow, versions: Map<string, number>): BudgetFact => ({
  kind: row.category_kind === 'income' ? 'income' : 'expense',
  categoryId: row.category_id,
  limitId: row.limit_id,
  limitMinor: row.limit_minor,
  carriedInMinor: row.carried_in_minor,
  warnAtPct: row.warn_at_pct ?? DEFAULT_WARN_PCT,
  carryMode: row.carry_mode === 'carry' ? 'carry' : 'reset',
  factMinor: row.fact_minor,
  unknownCount: row.unknown_count,
  remainingMinor: row.remaining_minor,
  limitVersion: row.limit_id ? (versions.get(row.limit_id) ?? null) : null,
})

type MonthParams = {
  ledgerId: string
  month: string
}

type MonthRow = {
  id: string
  income_plan_minor: number | null
  version: number
  budget_limits: {
    id: string
    version: number
  }[]
}

const EMPTY_MONTH = {
  monthId: null,
  monthVersion: null,
  incomePlanMinor: null,
}

function toBudgetMonth(row: MonthRow | null, facts: FactRow[]): BudgetMonth {
  const versions = new Map((row?.budget_limits ?? []).map((limit) => [limit.id, limit.version]))
  const head = row
    ? {
        monthId: row.id,
        monthVersion: row.version,
        incomePlanMinor: row.income_plan_minor,
      }
    : EMPTY_MONTH

  return {
    ...head,
    facts: facts.map((fact) => toFact(fact, versions)),
  }
}

/** the month row with its limit versions, and the facts of the month (budget_month_facts: expenses minus refunds) */
export async function getBudgetMonth(supabase: SaldoClient, { ledgerId, month }: MonthParams): Promise<BudgetMonth> {
  const [monthResult, factsResult] = await Promise.all([
    supabase
      .from('budget_months')
      .select('id, income_plan_minor, version, budget_limits(id, version)')
      .eq('ledger_id', ledgerId)
      .eq('month', monthStart(month))
      .maybeSingle(),
    supabase.rpc('budget_month_facts', {
      p_ledger_id: ledgerId,
      p_month: monthStart(month),
    }),
  ])

  if (monthResult.error ?? factsResult.error) {
    throw monthResult.error ?? factsResult.error
  }

  return toBudgetMonth(monthResult.data, factsResult.data as FactRow[])
}

export type BudgetCategory = {
  id: string
  name: string
  color: string | null
  icon: string | null
}

/** active expense categories: the names and icons of the limit rows and the choice for a new limit */
export async function getBudgetCategories(supabase: SaldoClient, ledgerId: string): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, color, icon')
    .eq('ledger_id', ledgerId)
    .eq('kind', 'expense')
    .is('archived_at', null)
    .order('sort_order')

  if (error) {
    throw error
  }

  return data
}

/** the id of the month row, created first when the month has none; a repeated id (replayed offline write) is a no-op */
type EnsureMonthRow = MonthParams & {
  monthId: string
  incomePlanMinor?: number | null
}

async function ensureMonth(supabase: SaldoClient, row: EnsureMonthRow): Promise<string> {
  const { error } = await supabase.from('budget_months').upsert(
    {
      id: row.monthId,
      ledger_id: row.ledgerId,
      month: monthStart(row.month),
      income_plan_minor: row.incomePlanMinor ?? null,
    },
    {
      onConflict: 'ledger_id,month',
      ignoreDuplicates: true,
    },
  )

  if (error) {
    throw error
  }

  const { data, error: readError } = await supabase
    .from('budget_months')
    .select('id')
    .eq('ledger_id', row.ledgerId)
    .eq('month', monthStart(row.month))
    .single()

  if (readError) {
    throw readError
  }

  return data.id
}

type LimitPatch = {
  limit_minor: number
  carry_mode: CarryMode
}

async function updateLimit(supabase: SaldoClient, value: SaveLimitInput, patch: LimitPatch) {
  const { data, error } = await supabase
    .from('budget_limits')
    .update(patch)
    .eq('id', value.limitId)
    .eq('version', value.expectedVersion ?? 0)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw versionConflict()
  }
}

/**
 * shortcut: the month row and the limit are two requests, there is no RPC for it. A failure between them leaves an
 * empty month row, which shows as "no budget yet"; move to an RPC when a limit write must be atomic.
 */
export async function saveLimit(supabase: SaldoClient, input: SaveLimitInput): Promise<void> {
  const value = saveLimitInputSchema.parse(input)
  const budgetMonthId = await ensureMonth(supabase, value)
  const patch = {
    limit_minor: value.limitMinor,
    carry_mode: value.carryMode,
  }

  if (value.expectedVersion !== null) {
    return updateLimit(supabase, value, patch)
  }

  const { error } = await supabase.from('budget_limits').upsert(
    {
      id: value.limitId,
      ledger_id: value.ledgerId,
      budget_month_id: budgetMonthId,
      category_id: value.categoryId,
      ...patch,
    },
    {
      onConflict: 'id',
      ignoreDuplicates: true,
    },
  )

  if (error) {
    throw error
  }
}

export async function setIncomePlan(supabase: SaldoClient, input: SetIncomePlanInput): Promise<void> {
  const value = setIncomePlanInputSchema.parse(input)

  if (value.expectedVersion === null) {
    await ensureMonth(supabase, value)

    return
  }

  const { data, error } = await supabase
    .from('budget_months')
    .update({ income_plan_minor: value.incomePlanMinor })
    .eq('id', value.monthId)
    .eq('version', value.expectedVersion)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw versionConflict()
  }
}

export async function deleteLimit(supabase: SaldoClient, input: DeleteLimitInput): Promise<void> {
  const { limitId } = deleteLimitInputSchema.parse(input)
  const { error } = await supabase.from('budget_limits').delete().eq('id', limitId)

  if (error) {
    throw error
  }
}

/** limits and income plan of `from` go to `to`; a limit the target has already is kept (replay is a no-op) */
export async function copyBudgetMonth(supabase: SaldoClient, input: CopyMonthInput): Promise<number> {
  const value = copyMonthInputSchema.parse(input)
  const { data, error } = await supabase.rpc('copy_budget_month', {
    p_ledger_id: value.ledgerId,
    p_from: monthStart(value.from),
    p_to: monthStart(value.to),
  })

  if (error) {
    throw error
  }

  return data
}
