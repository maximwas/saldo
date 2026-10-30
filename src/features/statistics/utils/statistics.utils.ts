import { CATEGORY_COLORS, type CategoryColor } from '@/constants/category-colors.constants'
import type { CashflowRow, CategoryRow, PlanDay } from '../api/statistics.api'

export type CategoryShare = {
  id: string | null
  /** null = operations without a category */
  name: string | null
  /** a CSS colour from a theme token */
  fill: string
  factMinor: number
  /** 0..100, of the categories that spent more than they got back */
  share: number
  unknownCount: number
  operationsCount: number
}

type CategoryInfo = {
  name: string
  color: string | null
}

/** a category colour is a token name; anything else (null, an old value) is the neutral token */
const categoryFill = (color: string | null) =>
  CATEGORY_COLORS.includes(color as CategoryColor) ? `var(--color-cat-${color})` : 'var(--color-neutral)'

/**
 * expense categories, biggest first. totalMinor is the sum of every row, so it equals the cashflow expense net of
 * refunds; a share only counts the rows with a positive fact (a category refunded in full has none).
 */
export function categoryShares(rows: CategoryRow[], categories: Record<string, CategoryInfo>) {
  const expense = rows.filter((row) => row.category_kind === 'expense')
  const positive = expense.reduce((sum, row) => sum + Math.max(row.fact_minor, 0), 0)
  const shares: CategoryShare[] = expense
    .map((row) => {
      const info = row.category_id ? categories[row.category_id] : undefined

      return {
        id: row.category_id,
        name: info?.name ?? null,
        fill: categoryFill(info?.color ?? null),
        factMinor: row.fact_minor,
        share: positive > 0 && row.fact_minor > 0 ? (row.fact_minor / positive) * 100 : 0,
        unknownCount: row.unknown_count,
        operationsCount: row.operations_count,
      }
    })
    .sort((left, right) => right.factMinor - left.factMinor)

  return {
    shares,
    totalMinor: expense.reduce((sum, row) => sum + row.fact_minor, 0),
    unknownCount: expense.reduce((sum, row) => sum + row.unknown_count, 0),
  }
}

export type CashflowTotals = {
  incomeMinor: number
  /** expenses minus refunds */
  expenseMinor: number
  resultMinor: number
  unknownCount: number
  operationsCount: number
}

/** a refund reduces the expense it points to (§20); result = income - expense */
export const netExpense = (row: CashflowRow) => row.expense_minor - row.refund_minor

export function cashflowTotals(rows: CashflowRow[]): CashflowTotals {
  const incomeMinor = rows.reduce((sum, row) => sum + row.income_minor, 0)
  const expenseMinor = rows.reduce((sum, row) => sum + netExpense(row), 0)

  return {
    incomeMinor,
    expenseMinor,
    resultMinor: incomeMinor - expenseMinor,
    unknownCount: rows.reduce((sum, row) => sum + row.unknown_count, 0),
    operationsCount: rows.reduce((sum, row) => sum + row.operations_count, 0),
  }
}

export type ForecastMonth = {
  month: string
  outMinor: number
  inMinor: number
  unknownCount: number
}

/** the planned days of the calendar added up by month; a month without a plan stays, as zero plans */
export function forecastMonths(days: PlanDay[], months: string[]): ForecastMonth[] {
  return months.map((month) => {
    const own = days.filter((day) => day.day.startsWith(month))

    return {
      month,
      outMinor: own.reduce((sum, day) => sum + day.plan_out_minor, 0),
      inMinor: own.reduce((sum, day) => sum + day.plan_in_minor, 0),
      unknownCount: own.reduce((sum, day) => sum + day.unknown_count, 0),
    }
  })
}

export type CardStatus = 'pending' | 'offline' | 'error' | 'empty' | 'ready'

type QueryLike = {
  data: unknown
  isError: boolean
  fetchStatus: 'fetching' | 'paused' | 'idle'
}

/** what a card shows: paused with no data = the device is offline and nothing was loaded yet */
export function cardStatus(query: QueryLike, empty: boolean): CardStatus {
  if (query.data === undefined) {
    if (query.isError) {
      return 'error'
    }

    return query.fetchStatus === 'paused' ? 'offline' : 'pending'
  }

  return empty ? 'empty' : 'ready'
}
