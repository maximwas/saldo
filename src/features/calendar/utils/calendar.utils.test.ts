import { describe, expect, it } from 'vitest'
import { monthGrid, periodRange, sourceHref, sumTotals } from './calendar.utils'
import { activeChips, activeQuickSet, fromFilter, toFilter } from './calendar-filters.utils'

describe('calendar filter', () => {
  it('turns the URL into p_filter without the unset keys and back', () => {
    const url = fromFilter({
      entry: 'fact',
      kinds: ['expense'],
      q: 'Megogo',
    })

    expect(url.category_ids).toBeNull()
    expect(
      toFilter({
        ...url,
        states: [],
        source_id: '',
      }),
    ).toEqual({
      entry: 'fact',
      kinds: ['expense'],
      q: 'Megogo',
    })
  })

  it('finds the quick set by its type keys, and refinements keep their own chips', () => {
    const filter = {
      kinds: ['expense'],
      entry: 'fact' as const,
      q: 'Сільпо',
    }

    expect(activeQuickSet(filter)).toBe('expenses')
    expect(activeChips(filter)).toEqual(['q'])
    expect(activeQuickSet({ kinds: ['transfer_out'] })).toBeNull()
    expect(activeChips({ kinds: ['transfer_out'] })).toEqual(['kinds'])
  })
})

describe('calendar period', () => {
  it('reads the whole month and draws whole weeks from Monday', () => {
    expect(periodRange('month', '2026-10-30')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    })

    const grid = monthGrid('2026-10-30')

    expect(grid[0]).toBe('2026-09-28')
    expect(grid.at(-1)).toBe('2026-11-01')
    expect(grid).toHaveLength(35)
  })

  it('reads Monday to Sunday for a week across the DST change', () => {
    expect(periodRange('week', '2026-10-25')).toEqual({
      from: '2026-10-19',
      to: '2026-10-25',
    })
  })

  it('sums the days, plan as in minus out', () => {
    const day = {
      factIncomeMinor: 0,
      factExpenseMinor: 25_000,
      planInMinor: 0,
      planOutMinor: 19_900,
      unknownCount: 1,
      entriesCount: 2,
    }

    expect(
      sumTotals([
        {
          ...day,
          day: '2026-10-30',
        },
        {
          ...day,
          day: '2026-10-31',
          factIncomeMinor: 6_200_000,
        },
      ]),
    ).toEqual({
      incomeMinor: 6_200_000,
      expenseMinor: 50_000,
      resultMinor: 6_150_000,
      planMinor: -39_800,
      unknownCount: 2,
      entriesCount: 4,
    })
  })

  it('opens the source card, the debts list, or «Upcoming» for a plan without one', () => {
    expect(sourceHref('subscription', 's1')).toBe('/payments/subscriptions?sub=s1')
    expect(sourceHref('credit', 'c1')).toBe('/payments/credits/c1')
    expect(sourceHref('manual', null)).toBe('/payments')
    expect(sourceHref(null, null)).toBeNull()
  })
})
