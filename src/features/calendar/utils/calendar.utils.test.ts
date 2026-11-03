import { describe, expect, it } from 'vitest'
import {
  cellLines,
  dayTotalLines,
  entryStatus,
  monthGrid,
  paidMarks,
  periodRange,
  sourceHref,
  sumTotals,
} from './calendar.utils'
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

const fact = {
  id: 'f1',
  entry: 'fact' as const,
  day: '2026-11-03',
  state: 'fact',
  obligationId: null as string | null,
  plannedOn: null as string | null,
}

describe('calendar cells and marks', () => {
  it('lists three entries of a cell and folds the rest into one «more N» line', () => {
    expect(cellLines(['a', 'b', 'c'])).toEqual({
      shown: ['a', 'b', 'c'],
      more: 0,
    })
    expect(cellLines(['a', 'b', 'c', 'd', 'e'])).toEqual({
      shown: ['a', 'b', 'c'],
      more: 2,
    })
  })

  it('marks the plan day of a plan paid on another day, by that plan day', () => {
    const early = {
      ...fact,
      id: 'early',
      obligationId: 'o1',
      plannedOn: '2026-11-10',
    }
    const onTime = {
      ...fact,
      id: 'on-time',
      obligationId: 'o2',
      plannedOn: '2026-11-03',
    }
    const marks = paidMarks([
      fact,
      early,
      onTime,
      {
        ...early,
        id: 'plan',
        entry: 'plan' as const,
      },
    ])

    expect([...marks.keys()]).toEqual(['2026-11-10'])
    expect(marks.get('2026-11-10')?.map((entry) => entry.id)).toEqual(['early'])
  })

  it('says whether an entry waits, was paid on its day or on another one, or is a plain operation', () => {
    expect(entryStatus(fact)).toBe('fact')
    expect(
      entryStatus({
        ...fact,
        obligationId: 'o1',
        plannedOn: '2026-11-03',
      }),
    ).toBe('paid')
    expect(
      entryStatus({
        ...fact,
        obligationId: 'o1',
        plannedOn: '2026-11-10',
      }),
    ).toBe('paidElsewhere')
    expect(
      entryStatus({
        ...fact,
        entry: 'plan',
        state: 'plan',
      }),
    ).toBe('planned')
    expect(
      entryStatus({
        ...fact,
        entry: 'plan',
        state: 'partial',
      }),
    ).toBe('partial')
    expect(
      entryStatus({
        ...fact,
        entry: 'plan',
        state: 'unconfirmed',
      }),
    ).toBe('overdue')
  })
})

describe('dayTotalLines', () => {
  it('labels what was spent and what is still planned, and leaves out what is zero', () => {
    expect(
      dayTotalLines({
        day: '2026-11-03',
        factIncomeMinor: 0,
        factExpenseMinor: 305_725,
        planInMinor: 0,
        planOutMinor: 158_325,
        unknownCount: 0,
        entriesCount: 3,
      }),
    ).toEqual([
      {
        key: 'spent',
        minor: -305_725,
        kind: 'fact',
      },
      {
        key: 'planned',
        minor: -158_325,
        kind: 'plan',
      },
    ])
  })

  it('names income as received and expected, never as spent', () => {
    expect(
      dayTotalLines({
        day: '2026-11-14',
        factIncomeMinor: 100_000,
        factExpenseMinor: 0,
        planInMinor: 190_000,
        planOutMinor: 0,
        unknownCount: 0,
        entriesCount: 2,
      }).map((line) => line.key),
    ).toEqual(['received', 'expected'])
    expect(dayTotalLines(undefined)).toEqual([])
  })
})
