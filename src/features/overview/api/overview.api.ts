import {
  type AvailableMoney,
  type AvailableMoneyInput,
  computeAvailableMoney,
} from '@/lib/finance/available-money.utils'
import { getLedgerRates } from '@/lib/finance/ledger-fx.api'
import { convertAt } from '@/lib/money/fx.utils'
import { localDate } from '@/lib/utils/clock.utils'
import type { SaldoClient } from '@/types/supabase.types'
import { type MonthTotals, monthRange, sumMonth } from '../utils/overview.utils'

type OverviewParams = {
  ledgerId: string
  now: Date
  timeZone: string
}

type OverviewAccount = {
  id: string
  name: string
  kind: 'bank' | 'cash' | 'savings'
  currency: string
  balanceMinor: number
  includeInAvailable: boolean
  /** balance in the base currency on today's rate; null when no rate links the currencies */
  baseMinor: number | null
}

type OverviewObligation = {
  id: string
  title: string
  sourceType: string
  direction: 'in' | 'out'
  dueOn: string
  /** null = the amount is unknown (§7) */
  remainingMinor: number | null
  currency: string
  state: 'plan' | 'partial' | 'unconfirmed'
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

    rows.push(
      ...data.map((row) => ({
        kind: row.kind,
        baseAmountMinor: row.base_amount_minor,
      })),
    )

    if (data.length < PAGE) {
      return sumMonth(rows)
    }
  }
}

/** Overview + "Available" (plan 1.16): the same numbers for the browser and the MCP server, no React */
export async function getOverview(
  supabase: SaldoClient,
  { ledgerId, now, timeZone }: OverviewParams,
): Promise<Overview> {
  const today = localDate(now, timeZone)
  const ledger = await supabase
    .from('ledgers')
    .select('base_currency, next_income_on, version')
    .eq('id', ledgerId)
    .single()

  if (ledger.error) {
    throw ledger.error
  }

  const untilOn = ledger.data.next_income_on
  // every open obligation to the chosen date counts, not the first few; without a date only today's horizon is read
  const horizon = untilOn ?? today
  const [accounts, balances, rates, due, upcoming, overdue, month] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, kind, currency, include_in_available, opening_balance_minor')
      .eq('ledger_id', ledgerId)
      .is('archived_at', null)
      .order('sort_order'),
    supabase.from('account_balances').select('account_id, balance_minor').eq('ledger_id', ledgerId),
    getLedgerRates(supabase, ledgerId),
    supabase
      .from('obligation_states')
      .select('obligation_id, direction, due_on, remaining_minor, currency, state')
      .eq('ledger_id', ledgerId)
      .in('state', OPEN_STATES)
      .lte('due_on', horizon),
    supabase
      .from('obligation_states')
      .select('obligation_id, title, source_type, direction, due_on, remaining_minor, currency, state')
      .eq('ledger_id', ledgerId)
      .in('state', OPEN_STATES)
      .order('due_on')
      .limit(UPCOMING_LIMIT),
    supabase
      .from('obligation_states')
      .select('obligation_id', {
        count: 'exact',
        head: true,
      })
      .eq('ledger_id', ledgerId)
      .eq('state', 'unconfirmed'),
    getMonthTotals(supabase, ledgerId, today),
  ])

  for (const result of [accounts, balances, due, upcoming, overdue]) {
    if (result.error) {
      throw result.error
    }
  }

  const baseCurrency = ledger.data.base_currency
  const fxRates = rates
  const balanceOf = new Map((balances.data ?? []).map((row) => [row.account_id, row.balance_minor]))
  // account_balances has a row for every visible account; the opening balance is what it holds before any operation
  const rows = (accounts.data ?? []).map((account) => ({
    ...account,
    balanceMinor: balanceOf.get(account.id) ?? account.opening_balance_minor,
  }))

  return {
    baseCurrency,
    today,
    untilOn,
    ledgerVersion: ledger.data.version,
    month,
    accounts: rows.map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind as OverviewAccount['kind'],
      currency: row.currency,
      balanceMinor: row.balanceMinor,
      includeInAvailable: row.include_in_available,
      baseMinor:
        row.currency === baseCurrency
          ? row.balanceMinor
          : convertAt(row.balanceMinor, row.currency, baseCurrency, fxRates, today, 'half_up'),
    })),
    available: computeAvailableMoney({
      baseCurrency,
      untilOn: horizon,
      accounts: rows
        .filter((row) => row.include_in_available)
        .map((row) => ({
          accountId: row.id,
          balanceMinor: row.balanceMinor,
          currency: row.currency,
        })),
      obligations: (due.data ?? []).map((row) => ({
        id: row.obligation_id,
        direction: row.direction as 'in' | 'out',
        dueOn: row.due_on,
        remainingMinor: row.remaining_minor,
        currency: row.currency,
        state: row.state as AvailableMoneyInput['obligations'][number]['state'],
      })),
      rates: fxRates,
      now,
      timeZone,
    }),
    upcoming: (upcoming.data ?? []).map((row) => ({
      id: row.obligation_id,
      title: row.title,
      sourceType: row.source_type,
      direction: row.direction as 'in' | 'out',
      dueOn: row.due_on,
      remainingMinor: row.remaining_minor,
      currency: row.currency,
      state: row.state as OverviewObligation['state'],
    })),
    overdueCount: overdue.count ?? 0,
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
