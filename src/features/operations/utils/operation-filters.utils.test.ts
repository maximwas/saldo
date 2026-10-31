import { describe, expect, it } from 'vitest'
import { hasActiveFilters, periodValue, recentMonths, resolveFilters, textFilter } from './operation-filters.utils'

const URL_DEFAULTS = {
  period: null,
  account: null,
  category: null,
  who: null,
  type: 'all' as const,
  q: null,
}

describe('periodValue', () => {
  it('falls back to the month of today for a missing or broken period', () => {
    expect(periodValue(null, '2026-10-30')).toBe('2026-10')
    expect(periodValue('2026-13', '2026-10-30')).toBe('2026-10')
    expect(periodValue('october', '2026-10-30')).toBe('2026-10')
  })

  it('keeps a valid month and «all»', () => {
    expect(periodValue('2026-02', '2026-10-30')).toBe('2026-02')
    expect(periodValue('all', '2026-10-30')).toBe('all')
  })
})

describe('resolveFilters', () => {
  it('turns the month into its first and last day', () => {
    expect(resolveFilters(URL_DEFAULTS, '2026-10-30')).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-31',
    })
    expect(
      resolveFilters(
        {
          ...URL_DEFAULTS,
          period: '2028-02',
        },
        '2026-10-30',
      ),
    ).toMatchObject({
      from: '2028-02-01',
      to: '2028-02-29',
    })
  })

  it('has no bounds for all time and passes the other filters through', () => {
    expect(
      resolveFilters(
        {
          period: 'all',
          account: 'a1',
          category: 'c1',
          who: 'u1',
          type: 'expense',
          q: ' піца ',
        },
        '2026-10-30',
      ),
    ).toEqual({
      from: null,
      to: null,
      accountId: 'a1',
      categoryId: 'c1',
      createdBy: 'u1',
      type: 'expense',
      text: 'піца',
    })
  })
})

describe('textFilter', () => {
  it('matches the payee or the note, with LIKE wildcards and PostgREST quotes taken literally', () => {
    expect(textFilter('піца')).toBe('counterparty.ilike."%піца%",note.ilike."%піца%"')
    expect(textFilter('50%_off, "a"')).toBe(
      String.raw`counterparty.ilike."%50\\%\\_off, \"a\"%",note.ilike."%50\\%\\_off, \"a\"%"`,
    )
  })
})

describe('recentMonths', () => {
  it('lists months back from the current one across a year edge', () => {
    expect(recentMonths('2026-02-10', 4)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11'])
  })
})

describe('hasActiveFilters', () => {
  it('is false only for the defaults', () => {
    expect(hasActiveFilters(URL_DEFAULTS)).toBe(false)
    expect(
      hasActiveFilters({
        ...URL_DEFAULTS,
        type: 'income',
      }),
    ).toBe(true)
    expect(
      hasActiveFilters({
        ...URL_DEFAULTS,
        period: 'all',
      }),
    ).toBe(true)
  })
})
