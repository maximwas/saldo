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
  categoryId?: string | null
}

export type TopCategory = {
  categoryId: string
  /** spent in the base currency, refunds taken off */
  minor: number
  /** whole percent of the month's spending */
  percent: number
}

/** what an operation adds to the month's spending: an expense adds, a refund takes off, the rest (and no rate) nothing */
const spentMinor = (kind: string, baseAmountMinor: number | null) => {
  if (baseAmountMinor === null) {
    return 0
  }

  if (kind === 'expense') {
    return baseAmountMinor
  }

  return kind === 'refund' ? -baseAmountMinor : 0
}

/** the month's biggest expense categories (refunds net), largest first; uncategorised and unconverted rows skipped */
export function topCategories(operations: readonly MonthOperation[], limit = 3): TopCategory[] {
  const spent = new Map<string, number>()
  let total = 0

  for (const { kind, baseAmountMinor, categoryId } of operations) {
    const signed = spentMinor(kind, baseAmountMinor)

    total += signed

    if (categoryId && signed !== 0) {
      spent.set(categoryId, (spent.get(categoryId) ?? 0) + signed)
    }
  }

  return [...spent]
    .filter(([, minor]) => minor > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([categoryId, minor]) => ({
      categoryId,
      minor,
      percent: total > 0 ? Math.round((minor / total) * 100) : 0,
    }))
}

export type MonthTotals = {
  incomeMinor: number
  expenseMinor: number
  resultMinor: number
  /** Figma «top expense categories»: up to three */
  top?: TopCategory[]
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
  /** a CATEGORY_COLORS name or null */
  color: string | null
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
  /** a credit's installment number and count ; null for the other sources */
  installment: {
    number: number
    count: number
  } | null
  accountId: string | null
}

/** the columns the overview selects from `accounts`, with the balance from account_balances */
export type OverviewAccountRow = {
  id: string
  name: string
  kind: string
  color: string | null
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
    color: row.color,
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
  source_id: string | null
  sequence_no: number | null
  account_id: string | null
}

type OpenDebtRow = {
  id: string
  direction: string
  principal_minor: number
  currency: string
}

type RepaymentRow = {
  debt_id: string
  amount_minor: number
}

export type OpenDebts = {
  /** «owed to me» still to come back, in the base currency */
  owedToMeMinor: number
  /** «I owe» still to pay back, in the base currency */
  iOweMinor: number
  /** open debts in a currency without a rate: not added, said apart (null ≠ 0) */
  unknownCount: number
}

/** principal minus repayments per debt; an overpayment leaves 0, never a negative debt */
function remainingByDebt(debts: OpenDebtRow[], repayments: RepaymentRow[]) {
  const repaid = new Map<string, number>()

  for (const repayment of repayments) {
    repaid.set(repayment.debt_id, (repaid.get(repayment.debt_id) ?? 0) + repayment.amount_minor)
  }

  return debts.map((debt) => ({
    ...debt,
    leftMinor: Math.max(debt.principal_minor - (repaid.get(debt.id) ?? 0), 0),
  }))
}

/** what the open debts still ask for, by direction (§3: apart from the month's minus and the shortfall of «Available») */
export function sumOpenDebts(debts: OpenDebtRow[], repayments: RepaymentRow[], context: OverviewRates): OpenDebts {
  const sums: OpenDebts = {
    owedToMeMinor: 0,
    iOweMinor: 0,
    unknownCount: 0,
  }

  for (const debt of remainingByDebt(debts, repayments).filter((row) => row.leftMinor > 0)) {
    const baseMinor = accountBaseMinor({
      balanceMinor: debt.leftMinor,
      currency: debt.currency,
      baseCurrency: context.baseCurrency,
      rate: accountRate({
        currency: debt.currency,
        baseCurrency: context.baseCurrency,
        rates: context.rates,
        date: context.today,
      }),
    })

    if (baseMinor === null) {
      sums.unknownCount += 1
    } else if (debt.direction === 'owed_to_me') {
      sums.owedToMeMinor += baseMinor
    } else {
      sums.iOweMinor += baseMinor
    }
  }

  return sums
}

/** installmentsCount: credit id → its installments_count, for «installment N of M» */
export const toUpcoming = (
  row: UpcomingRow,
  installmentsCount: Readonly<Record<string, number>> = {},
): OverviewObligation => ({
  id: row.obligation_id,
  title: row.title,
  sourceType: row.source_type,
  direction: row.direction as 'in' | 'out',
  dueOn: row.due_on,
  remainingMinor: row.remaining_minor,
  currency: row.currency,
  state: row.state as OverviewObligation['state'],
  installment:
    row.source_type === 'credit' && row.source_id && row.sequence_no && installmentsCount[row.source_id]
      ? {
          number: row.sequence_no,
          count: installmentsCount[row.source_id],
        }
      : null,
  accountId: row.account_id,
})
