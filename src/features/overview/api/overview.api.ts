import {
  type AvailableMoney,
  computeAvailableMoney,
  monthEndOf,
  plannedToMonthEnd,
} from '@/lib/finance/available-money.utils'
import { getLedgerRates } from '@/lib/finance/ledger-fx.api'
import { type LedgerCategoryOption, listCategoryOptions } from '@/lib/finance/ledger-options.api'
import { localDate } from '@/lib/utils/clock.utils'
import type { SaldoClient } from '@/types/supabase.types'
import {
  type MonthTotals,
  monthRange,
  type OpenDebts,
  type OverviewAccount,
  type OverviewObligation,
  sumMonth,
  sumOpenDebts,
  toAvailableAccount,
  toAvailableObligation,
  toOverviewAccount,
  topCategories,
  toUpcoming,
  withBalances,
} from '../utils/overview.utils'

type OverviewParams = {
  ledgerId: string
  now: Date
  timeZone: string
}

export type Overview = {
  baseCurrency: string
  /** YYYY-MM-DD in the ledger time zone */
  today: string
  /** ledgers.next_income_on; null = not set, and then "Available" is not shown (§3: never invent the date) */
  untilOn: string | null
  /** ledgers.version: the «Change» income date writes against it */
  ledgerVersion: number
  /** the current month in the ledger time zone, in the base currency */
  month: MonthTotals
  /** the month's result minus the outgoing plans left to the month end, past unconfirmed ones included; null = unknown */
  monthWithPlanMinor: number | null
  accounts: OverviewAccount[]
  /** balancesMinor is always filled; the other parts mean something only when untilOn is set */
  available: AvailableMoney
  upcoming: OverviewObligation[]
  overdueCount: number
  /** open personal debts, apart from the month's result and the shortfall of «Available» (§3) */
  openDebts: OpenDebts
  /** names, icons and colours of the month's top categories */
  categories: LedgerCategoryOption[]
}

const PAGE = 1000
const OPEN_STATES = ['plan', 'partial', 'unconfirmed']
const UPCOMING_LIMIT = 4

type MonthRow = {
  kind: string
  base_amount_minor: number | null
  category_id: string | null
}

const toMonthOperation = (row: MonthRow) => ({
  kind: row.kind,
  baseAmountMinor: row.base_amount_minor,
  categoryId: row.category_id,
})

/** income / expense rows of the current month; PostgREST caps a response, so it is read page by page */
async function getMonthTotals(supabase: SaldoClient, ledgerId: string, today: string): Promise<MonthTotals> {
  const { from, to } = monthRange(today)
  const rows: ReturnType<typeof toMonthOperation>[] = []

  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supabase
      .from('operations')
      .select('kind, base_amount_minor, category_id')
      .eq('ledger_id', ledgerId)
      .in('kind', ['income', 'expense', 'refund'])
      .gte('occurred_on', from)
      .lte('occurred_on', to)
      .order('id')
      .range(start, start + PAGE - 1)

    if (error) {
      throw error
    }

    rows.push(...data.map(toMonthOperation))

    if (data.length < PAGE) {
      return {
        ...sumMonth(rows),
        top: topCategories(rows),
      }
    }
  }
}

type LedgerHead = {
  baseCurrency: string
  untilOn: string | null
  version: number
}

async function getLedgerHead(supabase: SaldoClient, ledgerId: string): Promise<LedgerHead> {
  const { data, error } = await supabase
    .from('ledgers')
    .select('base_currency, next_income_on, version')
    .eq('id', ledgerId)
    .single()

  if (error) {
    throw error
  }

  return {
    baseCurrency: data.base_currency,
    untilOn: data.next_income_on,
    version: data.version,
  }
}

type SourceParams = {
  ledgerId: string
  today: string
  /** every open obligation up to this date counts, not the first few */
  horizon: string
}

const accountsQuery = (supabase: SaldoClient, ledgerId: string) =>
  supabase
    .from('accounts')
    .select('id, name, kind, color, currency, include_in_available, opening_balance_minor')
    .eq('ledger_id', ledgerId)
    .is('archived_at', null)
    .order('sort_order')

const dueQuery = (supabase: SaldoClient, ledgerId: string, horizon: string) =>
  supabase
    .from('obligation_states')
    .select('obligation_id, direction, due_on, remaining_minor, currency, state')
    .eq('ledger_id', ledgerId)
    .in('state', OPEN_STATES)
    .lte('due_on', horizon)

const upcomingQuery = (supabase: SaldoClient, ledgerId: string) =>
  supabase
    .from('obligation_states')
    .select(
      'obligation_id, title, source_type, source_id, sequence_no, account_id, direction, due_on, remaining_minor, currency, state',
    )
    .eq('ledger_id', ledgerId)
    .in('state', OPEN_STATES)
    .order('due_on')
    .limit(UPCOMING_LIMIT)

const overdueQuery = (supabase: SaldoClient, ledgerId: string) =>
  supabase
    .from('obligation_states')
    .select('obligation_id', {
      count: 'exact',
      head: true,
    })
    .eq('ledger_id', ledgerId)
    .eq('state', 'unconfirmed')

/** open debts and every repayment of the space: what is left of each debt is principal minus its repayments */
async function getDebtRows(supabase: SaldoClient, ledgerId: string) {
  const [debts, repayments] = await Promise.all([
    supabase
      .from('debts')
      .select('id, direction, principal_minor, currency')
      .eq('ledger_id', ledgerId)
      .eq('status', 'open'),
    supabase.from('debt_movements').select('debt_id, amount_minor').eq('ledger_id', ledgerId).eq('kind', 'repayment'),
  ])

  for (const result of [debts, repayments]) {
    if (result.error) {
      throw result.error
    }
  }

  return {
    debts: debts.data ?? [],
    repayments: repayments.data ?? [],
  }
}

/** credit id → installments_count */
const countsById = (
  rows:
    | {
        id: string
        installments_count: number
      }[]
    | null,
) => Object.fromEntries((rows ?? []).map((row) => [row.id, row.installments_count]))

/** the reads behind the screen, in parallel; any error throws */
async function getSources(supabase: SaldoClient, { ledgerId, today, horizon }: SourceParams) {
  const [accounts, balances, rates, due, upcoming, overdue, month, debtRows, credits, categories] = await Promise.all([
    accountsQuery(supabase, ledgerId),
    supabase.from('account_balances').select('account_id, balance_minor').eq('ledger_id', ledgerId),
    getLedgerRates(supabase, ledgerId),
    dueQuery(supabase, ledgerId, horizon),
    upcomingQuery(supabase, ledgerId),
    overdueQuery(supabase, ledgerId),
    getMonthTotals(supabase, ledgerId, today),
    getDebtRows(supabase, ledgerId),
    supabase.from('credits').select('id, installments_count').eq('ledger_id', ledgerId),
    listCategoryOptions(supabase, ledgerId),
  ])

  for (const result of [accounts, balances, due, upcoming, overdue, credits]) {
    if (result.error) {
      throw result.error
    }
  }

  return {
    accounts: withBalances(accounts.data ?? [], balances.data ?? []),
    rates,
    due: due.data ?? [],
    upcoming: upcoming.data ?? [],
    categories,
    installmentsCount: countsById(credits.data),
    overdueCount: overdue.count ?? 0,
    month,
    ...debtRows,
  }
}

type Sources = Awaited<ReturnType<typeof getSources>>

type AvailableParams = {
  sources: Sources
  baseCurrency: string
  horizon: string
  now: Date
  timeZone: string
}

function getAvailable({ sources, baseCurrency, horizon, now, timeZone }: AvailableParams): AvailableMoney {
  return computeAvailableMoney({
    baseCurrency,
    untilOn: horizon,
    accounts: sources.accounts.filter((row) => row.include_in_available).map(toAvailableAccount),
    obligations: sources.due.map(toAvailableObligation),
    rates: sources.rates,
    now,
    timeZone,
  })
}

/** the month's result minus the outgoing plans left to the month end; null = an amount or a rate is unknown */
function monthWithPlan(sources: Sources, baseCurrency: string, now: Date, timeZone: string) {
  const planned = plannedToMonthEnd({
    baseCurrency,
    obligations: sources.due.map(toAvailableObligation),
    rates: sources.rates,
    now,
    timeZone,
  })

  return planned === null ? null : sources.month.resultMinor - planned
}

/** Overview + "Available" (plan 1.16): the same numbers for the browser and the MCP server, no React */
export async function getOverview(
  supabase: SaldoClient,
  { ledgerId, now, timeZone }: OverviewParams,
): Promise<Overview> {
  const today = localDate(now, timeZone)
  const ledger = await getLedgerHead(supabase, ledgerId)
  // without a date only today's horizon is read
  const horizon = ledger.untilOn ?? today
  const monthEnd = monthEndOf(today)
  // one read serves «Available» (to horizon) and the month result with its plan (to the month end)
  const sources = await getSources(supabase, {
    ledgerId,
    today,
    horizon: horizon > monthEnd ? horizon : monthEnd,
  })

  const rateContext = {
    baseCurrency: ledger.baseCurrency,
    rates: sources.rates,
    today,
  }

  return {
    baseCurrency: ledger.baseCurrency,
    today,
    untilOn: ledger.untilOn,
    ledgerVersion: ledger.version,
    month: sources.month,
    monthWithPlanMinor: monthWithPlan(sources, ledger.baseCurrency, now, timeZone),
    accounts: sources.accounts.map((row) => toOverviewAccount(row, rateContext)),
    available: getAvailable({
      sources,
      baseCurrency: ledger.baseCurrency,
      horizon,
      now,
      timeZone,
    }),
    upcoming: sources.upcoming.map((row) => toUpcoming(row, sources.installmentsCount)),
    overdueCount: sources.overdueCount,
    openDebts: sumOpenDebts(sources.debts, sources.repayments, rateContext),
    categories: sources.categories,
  }
}

type IncomeDateParams = {
  ledgerId: string
  /** null clears the date: «Available» is then not computed (§3) */
  nextIncomeOn: string | null
  expectedVersion: number
}

/** ledgers.next_income_on, versioned; RLS lets only the owner update, so nothing matched = changed or no right (PT409) */
export async function setNextIncomeOn(supabase: SaldoClient, params: IncomeDateParams) {
  const { data, error } = await supabase
    .from('ledgers')
    .update({ next_income_on: params.nextIncomeOn })
    .eq('id', params.ledgerId)
    .eq('version', params.expectedVersion)
    .select('id')

  if (error) {
    throw error
  }

  if (data.length === 0) {
    throw {
      code: 'PT409',
      message: 'ledger was changed by someone else',
    }
  }
}
