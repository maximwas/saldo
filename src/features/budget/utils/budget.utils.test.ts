import { describe, expect, it } from 'vitest'
import { type BudgetFact, budgetTotals, limitProgress, resolveMonth, shiftMonth } from './budget.utils'

const fact = (patch: Partial<BudgetFact>): BudgetFact => ({
  kind: 'expense',
  categoryId: 'c',
  limitId: 'l',
  limitMinor: 10_000,
  carriedInMinor: 0,
  warnAtPct: 80,
  carryMode: 'reset',
  factMinor: 0,
  unknownCount: 0,
  remainingMinor: null,
  limitVersion: 1,
  ...patch,
})

describe('limitProgress', () => {
  it('is none without a limit', () => {
    expect(
      limitProgress(
        fact({
          limitId: null,
          limitMinor: null,
          factMinor: 5000,
        }),
      ).state,
    ).toBe('none')
  })

  it('warns at the threshold, not before', () => {
    expect(limitProgress(fact({ factMinor: 7999 })).state).toBe('ok')
    expect(limitProgress(fact({ factMinor: 8000 })).state).toBe('warning')
  })

  it('is over only above the limit, and counts the carried-in remainder', () => {
    expect(limitProgress(fact({ factMinor: 10_000 })).state).toBe('warning')
    expect(limitProgress(fact({ factMinor: 12_000 }))).toMatchObject({
      state: 'over',
      overMinor: 2000,
      barPercent: 100,
    })
    expect(
      limitProgress(
        fact({
          factMinor: 12_000,
          carriedInMinor: 3000,
        }),
      ).state,
    ).toBe('warning')
  })

  it('treats an unknown carry as nothing carried', () => {
    expect(
      limitProgress(
        fact({
          factMinor: 10_000,
          carriedInMinor: null,
        }),
      ).state,
    ).toBe('warning')
  })
})

describe('budgetTotals', () => {
  it('splits income and expense, sums the limits', () => {
    const totals = budgetTotals([
      fact({
        kind: 'income',
        limitId: null,
        limitMinor: null,
        factMinor: 50_000,
      }),
      fact({ factMinor: 3000 }),
      fact({
        limitMinor: 5000,
        factMinor: 1000,
      }),
    ])

    expect(totals).toEqual({
      incomeFactMinor: 50_000,
      expenseFactMinor: 4000,
      limitsMinor: 15_000,
      resultMinor: 46_000,
    })
  })
})

describe('months', () => {
  it('shifts across a year edge', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })

  it('falls back to the month of today for a bad param', () => {
    expect(resolveMonth('2026-13', '2026-10-30')).toBe('2026-10')
    expect(resolveMonth('2026-09', '2026-10-30')).toBe('2026-09')
  })
})
