import { describe, expect, it } from 'vitest'
import type { CashflowRow, CategoryRow, PlanDay } from '../api/statistics.api'
import { cashflowTotals, categoryShares, forecastMonths } from './statistics.utils'
import { forecastRange, linkPeriod, operationsHref, periodValue, resolvePeriod } from './statistics-period.utils'

const category = (id: string | null, fact: number, unknown = 0) =>
  ({
    category_kind: 'expense',
    category_id: id,
    gross_minor: fact,
    refund_minor: 0,
    fact_minor: fact,
    unknown_count: unknown,
    operations_count: 1,
  }) satisfies CategoryRow

describe('periods', () => {
  it('turns a month, rolling months and a year into a range', () => {
    expect(resolvePeriod('2026-02', '2026-10-30')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
      bucket: 'week',
    })
    expect(resolvePeriod('3m', '2026-10-30')).toMatchObject({
      from: '2026-08-01',
      to: '2026-10-31',
      bucket: 'month',
    })
    expect(resolvePeriod('2026', '2026-10-30')).toMatchObject({
      from: '2026-01-01',
      to: '2026-12-31',
    })
  })

  it('falls back to the current month for a bad value and links only an exact month', () => {
    expect(periodValue('constructor', '2026-10-30')).toBe('2026-10')
    expect(linkPeriod('2026-10')).toBe('2026-10')
    expect(linkPeriod('6m')).toBe('all')
    expect(
      operationsHref({
        period: '2026-10',
        category: 'c1',
        type: 'expense',
      }),
    ).toBe('/operations?period=2026-10&category=c1&type=expense')
    expect(forecastRange('2026-11-15').months).toEqual(['2026-12', '2027-01', '2027-02'])
  })
})

describe('categoryShares', () => {
  it('sorts by fact, totals every row and counts unknown amounts', () => {
    const result = categoryShares([category('a', 1000), category(null, 3000, 2), category('b', -500)], {
      a: {
        name: 'Їжа',
        color: 'green',
      },
    })

    expect(result.shares.map((row) => row.id)).toEqual([null, 'a', 'b'])
    expect(result.totalMinor).toBe(3500)
    expect(result.unknownCount).toBe(2)
    expect(result.shares[1]).toMatchObject({
      name: 'Їжа',
      fill: 'var(--color-cat-green)',
      share: 25,
    })
    expect(result.shares[2].share).toBe(0)
  })
})

describe('cashflowTotals', () => {
  it('nets refunds off the expense and keeps income apart', () => {
    const row = (income: number, expense: number, refund: number) =>
      ({
        period_start: '2026-10-01',
        income_minor: income,
        expense_minor: expense,
        refund_minor: refund,
        result_minor: 0,
        unknown_count: 1,
        operations_count: 2,
      }) satisfies CashflowRow

    expect(cashflowTotals([row(5000, 3000, 500), row(0, 1000, 0)])).toEqual({
      incomeMinor: 5000,
      expenseMinor: 3500,
      resultMinor: 1500,
      unknownCount: 2,
      operationsCount: 4,
    })
  })
})

describe('forecastMonths', () => {
  it('adds the planned days by month and keeps empty months', () => {
    const day = (date: string, out: number): PlanDay => ({
      day: date,
      fact_income_minor: 0,
      fact_expense_minor: 0,
      plan_in_minor: 0,
      plan_out_minor: out,
      unknown_count: 0,
      entries_count: 1,
    })

    expect(forecastMonths([day('2026-11-05', 100), day('2026-11-20', 50)], ['2026-11', '2026-12'])).toEqual([
      {
        month: '2026-11',
        outMinor: 150,
        inMinor: 0,
        unknownCount: 0,
      },
      {
        month: '2026-12',
        outMinor: 0,
        inMinor: 0,
        unknownCount: 0,
      },
    ])
  })
})
