import { addMonths, format, parse } from 'date-fns'

export const CARRY_MODES = ['carry', 'reset'] as const
export type CarryMode = (typeof CARRY_MODES)[number]

/** the default warning threshold of a new limit, in percent (the column default of budget_limits) */
export const DEFAULT_WARN_PCT = 80

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

export type BudgetFact = {
  kind: 'income' | 'expense'
  categoryId: string | null
  limitId: string | null
  limitMinor: number | null
  /** null = the remainder carried in is unknown */
  carriedInMinor: number | null
  warnAtPct: number
  carryMode: CarryMode
  factMinor: number
  unknownCount: number
  /** limit + carried − fact; null without a limit or with an unknown carry */
  remainingMinor: number | null
  /** version of the limit row, for the update */
  limitVersion: number | null
}

type LimitState = 'none' | 'ok' | 'warning' | 'over'

export type LimitProgress = {
  state: LimitState
  /** 0–100 for the bar; the real share can be higher, see `overMinor` */
  barPercent: number
  /** the whole-percent share of the limit spent (can pass 100) */
  percent: number
  overMinor: number
}

/** the month of the URL (YYYY-MM) or the month of `today` when the URL has nothing usable */
export const resolveMonth = (month: string | null, today: string) =>
  month !== null && MONTH.test(month) ? month : today.slice(0, 7)

export const monthStart = (month: string) => `${month}-01`

export const shiftMonth = (month: string, delta: number) =>
  format(addMonths(parse(monthStart(month), 'yyyy-MM-dd', new Date()), delta), 'yyyy-MM')

/** share of the limit (with the carried-in remainder) already spent, and what state that is */
export function limitProgress(row: BudgetFact): LimitProgress {
  if (row.limitId === null || row.limitMinor === null) {
    return {
      state: 'none',
      barPercent: 0,
      percent: 0,
      overMinor: 0,
    }
  }

  const budget = row.limitMinor + (row.carriedInMinor ?? 0)
  const overMinor = Math.max(row.factMinor - budget, 0)
  const percent = budget > 0 ? Math.floor((row.factMinor * 100) / budget) : Number(row.factMinor > 0) * 100
  const barPercent = Math.min(Math.max(percent, 0), 100)

  if (overMinor > 0) {
    return {
      state: 'over',
      barPercent,
      percent,
      overMinor,
    }
  }

  return {
    state: percent >= row.warnAtPct ? 'warning' : 'ok',
    barPercent,
    percent,
    overMinor,
  }
}

export type BudgetTotals = {
  incomeFactMinor: number
  expenseFactMinor: number
  /** sum of the limits of the month, without carried-in remainders */
  limitsMinor: number
  resultMinor: number
}

const sum = (rows: readonly BudgetFact[], pick: (row: BudgetFact) => number | null) =>
  rows.reduce((total, row) => total + (pick(row) ?? 0), 0)

export function budgetTotals(rows: readonly BudgetFact[]): BudgetTotals {
  const expenses = rows.filter((row) => row.kind === 'expense')
  const incomeFactMinor = sum(
    rows.filter((row) => row.kind === 'income'),
    (row) => row.factMinor,
  )
  const expenseFactMinor = sum(expenses, (row) => row.factMinor)

  return {
    incomeFactMinor,
    expenseFactMinor,
    limitsMinor: sum(expenses, (row) => row.limitMinor),
    resultMinor: incomeFactMinor - expenseFactMinor,
  }
}

/** limited categories first (the fullest on top), then the ones that only have a fact, the biggest first */
export function sortFacts(rows: readonly BudgetFact[]): BudgetFact[] {
  return [...rows].sort((first, second) => {
    const limited = Number(second.limitId !== null) - Number(first.limitId !== null)

    if (limited !== 0) {
      return limited
    }

    return first.limitId === null
      ? second.factMinor - first.factMinor
      : limitProgress(second).percent - limitProgress(first).percent
  })
}
