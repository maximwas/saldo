import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import type { AvailableMoneyInput } from '@/lib/finance/available-money.utils'
import { accountBaseMinor, accountRate } from '@/lib/finance/base-balance.utils'
import type { FxRate } from '@/lib/money/fx.utils'

/** YYYY-MM-DD as noon UTC: formatted with timeZone «UTC» it is the same calendar day in any browser zone */
export function isoToDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, day, 12))
}

/** first and last day of the month of a ledger-local date, YYYY-MM-DD */
export function monthRange(today: string): {
  from: string
  to: string
} {
  const date = parseISO(today)

  return {
    from: format(startOfMonth(date), 'yyyy-MM-dd'),
    to: format(endOfMonth(date), 'yyyy-MM-dd'),
  }
}

type MonthOperation = {
  kind: string
  /** operation in the base currency; null = no rate (§20) */
  baseAmountMinor: number | null
}

export type MonthTotals = {
  incomeMinor: number
  expenseMinor: number
  resultMinor: number
  /** operations that could not be converted: the totals are incomplete, never padded with 0 */
  unknownCount: number
}

/**
 * Month block (§3, architecture stats): income = income; expense = expense − refund (a refund is not income);
 * transfers, debts and adjustments are neither. Result = income − expense.
 */
export function sumMonth(operations: readonly MonthOperation[]): MonthTotals {
  let incomeMinor = 0
  let expenseMinor = 0
  let unknownCount = 0

  for (const operation of operations) {
    if (operation.kind !== 'income' && operation.kind !== 'expense' && operation.kind !== 'refund') {
      continue
    }

    if (operation.baseAmountMinor === null) {
      unknownCount += 1
      continue
    }

    if (operation.kind === 'income') {
      incomeMinor += operation.baseAmountMinor
    } else {
      expenseMinor += operation.kind === 'expense' ? operation.baseAmountMinor : -operation.baseAmountMinor
    }
  }

  return {
    incomeMinor,
    expenseMinor,
    resultMinor: incomeMinor - expenseMinor,
    unknownCount,
  }
}

export type OverviewAccount = {
  id: string
  name: string
  kind: 'bank' | 'cash' | 'savings'
  currency: string
  balanceMinor: number
  includeInAvailable: boolean
  /** balance in the base currency on today's rate; null when no rate links the currencies */
  baseMinor: number | null
}

export type OverviewObligation = {
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

/** the columns the overview selects from `accounts`, with the balance from account_balances */
export type OverviewAccountRow = {
  id: string
  name: string
  kind: string
  currency: string
  include_in_available: boolean
  opening_balance_minor: number
  balanceMinor: number
}

type BalanceRow = {
  account_id: string
  balance_minor: number | null
}

/** account_balances has a row for every visible account; the opening balance is what it holds before any operation */
export function withBalances(
  accounts: readonly Omit<OverviewAccountRow, 'balanceMinor'>[],
  balances: readonly BalanceRow[],
): OverviewAccountRow[] {
  const balanceOf = new Map(balances.map((row) => [row.account_id, row.balance_minor]))

  return accounts.map((account) => ({
    ...account,
    balanceMinor: balanceOf.get(account.id) ?? account.opening_balance_minor,
  }))
}

export type OverviewRates = {
  baseCurrency: string
  rates: FxRate[]
  /** YYYY-MM-DD in the ledger time zone */
  today: string
}

export function toOverviewAccount(
  row: OverviewAccountRow,
  { baseCurrency, rates, today }: OverviewRates,
): OverviewAccount {
  const rate = accountRate({
    currency: row.currency,
    baseCurrency,
    rates,
    date: today,
  })

  return {
    id: row.id,
    name: row.name,
    kind: row.kind as OverviewAccount['kind'],
    currency: row.currency,
    balanceMinor: row.balanceMinor,
    includeInAvailable: row.include_in_available,
    baseMinor: accountBaseMinor({
      balanceMinor: row.balanceMinor,
      currency: row.currency,
      baseCurrency,
      rate,
    }),
  }
}

export const toAvailableAccount = (row: OverviewAccountRow): AvailableMoneyInput['accounts'][number] => ({
  accountId: row.id,
  balanceMinor: row.balanceMinor,
  currency: row.currency,
})

/** the obligation_states columns of the «due by the date» query */
export type DueRow = {
  obligation_id: string
  direction: string
  due_on: string
  remaining_minor: number | null
  currency: string
  state: string | null
}

export const toAvailableObligation = (row: DueRow): AvailableMoneyInput['obligations'][number] => ({
  id: row.obligation_id,
  direction: row.direction as 'in' | 'out',
  dueOn: row.due_on,
  remainingMinor: row.remaining_minor,
  currency: row.currency,
  state: row.state as AvailableMoneyInput['obligations'][number]['state'],
})

export type UpcomingRow = DueRow & {
  title: string
  source_type: string
}

export const toUpcoming = (row: UpcomingRow): OverviewObligation => ({
  id: row.obligation_id,
  title: row.title,
  sourceType: row.source_type,
  direction: row.direction as 'in' | 'out',
  dueOn: row.due_on,
  remainingMinor: row.remaining_minor,
  currency: row.currency,
  state: row.state as OverviewObligation['state'],
})
