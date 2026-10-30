import { describe, expect, it } from 'vitest'
import {
  filterCounts,
  horizonEnd,
  matchesFilter,
  nextPaymentOn,
  type SeriesSource,
  seriesRows,
  shownPrice,
} from './subscription-series.utils'

const monthly: SeriesSource = {
  unit: 'month',
  count: 1,
  firstOn: '2026-01-31',
  shortMonthRule: 'last_day',
  status: 'active',
  archivedAt: null,
}

const TODAY = '2026-10-30'

describe('seriesRows', () => {
  it('plans from today to 13 months ahead, never the past', () => {
    const rows = seriesRows(monthly, TODAY)

    expect(rows[0]).toEqual({
      occurrence_on: '2026-10-31',
      due_on: '2026-10-31',
    })
    expect(rows.at(-1)?.occurrence_on).toBe('2027-11-30')
    expect(rows).toHaveLength(14)
  })

  it('keeps the short-month rule of the series', () => {
    const skipping: SeriesSource = {
      ...monthly,
      shortMonthRule: 'skip',
    }

    expect(
      seriesRows(skipping, '2027-01-01')
        .slice(0, 3)
        .map((row) => row.occurrence_on),
    ).toEqual(['2027-01-31', '2027-03-31', '2027-05-31'])
  })

  it.each([
    {
      status: 'paused' as const,
      archivedAt: null,
    },
    {
      status: 'cancelled' as const,
      archivedAt: null,
    },
    {
      status: 'active' as const,
      archivedAt: '2026-10-30T10:00:00Z',
    },
  ])('plans nothing for $status, archived $archivedAt', (change) => {
    expect(
      seriesRows(
        {
          ...monthly,
          ...change,
        },
        TODAY,
      ),
    ).toEqual([])
  })

  it('still plans while the cancellation is only intended', () => {
    const intended: SeriesSource = {
      ...monthly,
      status: 'cancel_intended',
    }

    expect(nextPaymentOn(intended, TODAY)).toBe('2026-10-31')
  })
})

describe('shownPrice', () => {
  const priced = {
    ...monthly,
    currency: 'UAH',
    prices: [
      {
        effectiveOn: '2026-01-31',
        amountMinor: 10_000,
        currency: 'UAH',
      },
      {
        effectiveOn: '2026-10-31',
        amountMinor: 12_000,
        currency: 'UAH',
      },
    ],
  }

  it('shows the price of the next payment', () => {
    expect(shownPrice(priced, TODAY).amountMinor).toBe(12_000)
  })

  it('shows the first price before the subscription starts', () => {
    const paused = {
      ...priced,
      status: 'paused' as const,
    }

    expect(shownPrice(paused, '2025-12-01').amountMinor).toBe(10_000)
  })
})

describe('horizonEnd', () => {
  it('clamps to the end of a short month', () => {
    expect(horizonEnd('2026-01-31')).toBe('2027-02-28')
  })
})

describe('filters', () => {
  const items = [
    {
      status: 'active' as const,
      verdict: 'review' as const,
      archivedAt: null,
    },
    {
      status: 'cancel_intended' as const,
      verdict: null,
      archivedAt: null,
    },
    {
      status: 'active' as const,
      verdict: null,
      archivedAt: '2026-10-01T00:00:00Z',
    },
  ]

  it('counts archived ones only under «archive»', () => {
    expect(filterCounts(items)).toEqual({
      all: 2,
      active: 1,
      trial: 0,
      paused: 0,
      cancelled: 1,
      review: 1,
      archived: 1,
    })
  })

  it('puts the intent to cancel under «cancelled»', () => {
    expect(matchesFilter(items[1], 'cancelled')).toBe(true)
  })
})
