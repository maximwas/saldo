import { describe, expect, it } from 'vitest'
import { isoToDate, monthRange, sumMonth } from './overview.utils'

describe('isoToDate', () => {
  it('keeps the calendar day in UTC', () => {
    expect(isoToDate('2026-11-14').toISOString()).toBe('2026-11-14T12:00:00.000Z')
  })
})

describe('monthRange', () => {
  it('spans the whole month of the date', () => {
    expect(monthRange('2026-02-10')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
    expect(monthRange('2026-10-31')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    })
  })
})

describe('sumMonth', () => {
  it('counts income and expense, takes refunds off the expense, skips transfers, debts and adjustments', () => {
    const totals = sumMonth([
      {
        kind: 'income',
        baseAmountMinor: 100_000,
      },
      {
        kind: 'expense',
        baseAmountMinor: 30_000,
      },
      {
        kind: 'refund',
        baseAmountMinor: 5_000,
      },
      {
        kind: 'transfer_out',
        baseAmountMinor: 90_000,
      },
      {
        kind: 'transfer_in',
        baseAmountMinor: 90_000,
      },
      {
        kind: 'debt_out',
        baseAmountMinor: 7_000,
      },
      {
        kind: 'adjustment',
        baseAmountMinor: 1_000,
      },
    ])

    expect(totals).toEqual({
      incomeMinor: 100_000,
      expenseMinor: 25_000,
      resultMinor: 75_000,
      unknownCount: 0,
    })
  })

  it('an operation without a rate is counted as unknown, not as 0', () => {
    expect(
      sumMonth([
        {
          kind: 'expense',
          baseAmountMinor: null,
        },
      ]).unknownCount,
    ).toBe(1)
  })
})
