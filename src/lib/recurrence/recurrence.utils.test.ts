import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateOccurrences, type ShortMonthRule, takeOccurrences } from './recurrence.utils'

const monthly = (firstOn: string, shortMonthRule?: ShortMonthRule) => ({
  unit: 'month' as const,
  count: 1,
  firstOn,
  shortMonthRule,
})

describe('generateOccurrences', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each<[ShortMonthRule, string[]]>([
    ['last_day', ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']],
    ['next_month_first', ['2026-01-31', '2026-03-01', '2026-03-31']],
    ['skip', ['2026-01-31', '2026-03-31']],
  ])('moves the 31st of a common-year February by the %s rule', (rule, expected) => {
    expect(
      generateOccurrences({
        ...monthly('2026-01-31', rule),
        from: '2026-01-01',
        until: '2026-04-30',
      }),
    ).toEqual(expected)
  })

  it.each<[ShortMonthRule, string[]]>([
    ['last_day', ['2028-01-31', '2028-02-29', '2028-03-31']],
    ['next_month_first', ['2028-01-31', '2028-03-01', '2028-03-31']],
    ['skip', ['2028-01-31', '2028-03-31']],
  ])('moves the 31st of a leap-year February by the %s rule', (rule, expected) => {
    expect(
      generateOccurrences({
        ...monthly('2028-01-31', rule),
        from: '2028-01-01',
        until: '2028-03-31',
      }),
    ).toEqual(expected)
  })

  it('takes the last day of the month when no rule is given', () => {
    expect(
      generateOccurrences({
        ...monthly('2026-01-30'),
        from: '2026-01-01',
        until: '2026-03-31',
      }),
    ).toEqual(['2026-01-30', '2026-02-28', '2026-03-30'])
  })

  it('keeps the day of the first date after a short month in an every-3-months series', () => {
    const series = {
      unit: 'month' as const,
      count: 3,
      firstOn: '2026-11-30',
    }

    expect(
      generateOccurrences({
        ...series,
        from: '2026-11-01',
        until: '2027-08-31',
      }),
    ).toEqual(['2026-11-30', '2027-02-28', '2027-05-30', '2027-08-30'])
  })

  it.each<[ShortMonthRule, string[]]>([
    ['last_day', ['2028-02-29', '2029-02-28', '2030-02-28', '2031-02-28', '2032-02-29']],
    ['next_month_first', ['2028-02-29', '2029-03-01', '2030-03-01', '2031-03-01', '2032-02-29']],
    ['skip', ['2028-02-29', '2032-02-29']],
  ])('repeats 29 February every year by the %s rule', (rule, expected) => {
    const series = {
      unit: 'year' as const,
      count: 1,
      firstOn: '2028-02-29',
      shortMonthRule: rule,
    }

    expect(
      generateOccurrences({
        ...series,
        from: '2028-01-01',
        until: '2032-12-31',
      }),
    ).toEqual(expected)
  })

  it('steps every N days across both DST changes in Europe/Kyiv without losing a day', () => {
    vi.stubEnv('TZ', 'Europe/Kyiv')
    const weekly = {
      unit: 'day' as const,
      count: 7,
      firstOn: '2026-03-22',
    }
    const daily = {
      unit: 'day' as const,
      count: 1,
      firstOn: '2026-10-24',
    }

    expect(
      generateOccurrences({
        ...weekly,
        from: '2026-03-01',
        until: '2026-04-05',
      }),
    ).toEqual(['2026-03-22', '2026-03-29', '2026-04-05'])
    expect(
      generateOccurrences({
        ...daily,
        from: '2026-10-24',
        until: '2026-10-26',
      }),
    ).toEqual(['2026-10-24', '2026-10-25', '2026-10-26'])
  })

  it('includes `until` and drops dates before `from`', () => {
    const window = {
      ...monthly('2026-01-15'),
      from: '2026-02-15',
      until: '2026-04-15',
    }

    expect(generateOccurrences(window)).toEqual(['2026-02-15', '2026-03-15', '2026-04-15'])
  })

  it('returns nothing when the series starts after the window', () => {
    expect(
      generateOccurrences({
        ...monthly('2027-01-01'),
        from: '2026-01-01',
        until: '2026-12-31',
      }),
    ).toEqual([])
  })

  it('rejects a count that is not a positive integer instead of looping forever', () => {
    const series = {
      unit: 'day' as const,
      count: 0,
      firstOn: '2026-01-01',
    }

    expect(() =>
      generateOccurrences({
        ...series,
        from: '2026-01-01',
        until: '2026-01-31',
      }),
    ).toThrow(RangeError)
  })
})

describe('takeOccurrences', () => {
  it('returns the first N dates of a series', () => {
    expect(takeOccurrences(monthly('2026-12-31'), 3)).toEqual(['2026-12-31', '2027-01-31', '2027-02-28'])
  })

  it('returns nothing for a limit of 0', () => {
    expect(takeOccurrences(monthly('2026-12-31'), 0)).toEqual([])
  })
})
