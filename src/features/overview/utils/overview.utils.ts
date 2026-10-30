import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns'

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
