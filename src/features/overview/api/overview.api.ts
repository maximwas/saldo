import { type AvailableMoney, computeAvailableMoney } from '@/lib/finance/available-money.utils'
import { getLedgerRates } from '@/lib/finance/ledger-fx.api'
import { localDate } from '@/lib/utils/clock.utils'
import type { SaldoClient } from '@/types/supabase.types'
import {
  type MonthTotals,
  monthRange,
  type OverviewAccount,
  type OverviewObligation,
  sumMonth,
  toAvailableAccount,
  toAvailableObligation,
  toOverviewAccount,
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
  accounts: OverviewAccount[]
  /** balancesMinor is always filled; the other parts mean something only when untilOn is set */
  available: AvailableMoney
  upcoming: OverviewObligation[]
  overdueCount: number
}

const PAGE = 1000
const OPEN_STATES = ['plan', 'partial', 'unconfirmed']
const UPCOMING_LIMIT = 4

type MonthRow = {
  kind: string
  base_amount_minor: number | null
}

const toMonthOperation = (row: MonthRow) => ({
  kind: row.kind,
  baseAmountMinor: row.base_amount_minor,
})

/** income / expense rows of the current month; PostgREST caps a response, so it is read page by page */
async function getMonthTotals(supabase: SaldoClient, ledgerId: string, today: string): Promise<MonthTotals> {
  const { from, to } = monthRange(today)
  const rows: {
    kind: string
    baseAmountMinor: number | null
  }[] = []

  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supabase
      .from('operations')
      .select('kind, base_amount_minor')
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
      return sumMonth(rows)
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
    .select('id, name, kind, currency, include_in_available, opening_balance_minor')
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
    .select('obligation_id, title, source_type, direction, due_on, remaining_minor, currency, state')
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

/** the reads behind the screen, in parallel; any error throws */
async function getSources(supabase: SaldoClient, { ledgerId, today, horizon }: SourceParams) {
  const [accounts, balances, rates, due, upcoming, overdue, month] = await Promise.all([
    accountsQuery(supabase, ledgerId),
    supabase.from('account_balances').select('account_id, balance_minor').eq('ledger_id', ledgerId),
    getLedgerRates(supabase, ledgerId),
    dueQuery(supabase, ledgerId, horizon),
    upcomingQuery(supabase, ledgerId),
    overdueQuery(supabase, ledgerId),
    getMonthTotals(supabase, ledgerId, today),
  ])

  for (const result of [accounts, balances, due, upcoming, overdue]) {
    if (result.error) {
      throw result.error
    }
  }

  return {
    accounts: withBalances(accounts.data ?? [], balances.data ?? []),
    rates,
    due: due.data ?? [],
    upcoming: upcoming.data ?? [],
    overdueCount: overdue.count ?? 0,
    month,
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

/** Overview + "Available" (plan 1.16): the same numbers for the browser and the MCP server, no React */
export async function getOverview(
  supabase: SaldoClient,
  { ledgerId, now, timeZone }: OverviewParams,
): Promise<Overview> {
  const today = localDate(now, timeZone)
  const ledger = await getLedgerHead(supabase, ledgerId)
  // without a date only today's horizon is read
  const horizon = ledger.untilOn ?? today
  const sources = await getSources(supabase, {
    ledgerId,
    today,
    horizon,
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
    accounts: sources.accounts.map((row) => toOverviewAccount(row, rateContext)),
    available: getAvailable({
      sources,
      baseCurrency: ledger.baseCurrency,
      horizon,
      now,
      timeZone,
    }),
    upcoming: sources.upcoming.map(toUpcoming),
    overdueCount: sources.overdueCount,
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
