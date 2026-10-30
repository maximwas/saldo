import { describe, expect, it } from 'vitest'
import { localDate } from '@/lib/utils/clock.utils'
import { addDaysIso, bucketOf, groupByBucket } from './obligation-groups.utils'

const due = (dueOn: string) => ({ dueOn })

describe('groupByBucket', () => {
  it('splits by date: past, today, next 7 days, later', () => {
    const groups = groupByBucket(
      ['2026-11-20', '2026-10-29', '2026-10-30', '2026-11-06', '2026-11-07', '2026-10-31'].map(due),
      '2026-10-30',
    )

    expect(groups.overdue.map((row) => row.dueOn)).toEqual(['2026-10-29'])
    expect(groups.today.map((row) => row.dueOn)).toEqual(['2026-10-30'])
    expect(groups.week.map((row) => row.dueOn)).toEqual(['2026-10-31', '2026-11-06'])
    expect(groups.later.map((row) => row.dueOn)).toEqual(['2026-11-07', '2026-11-20'])
  })

  it('uses the ledger time zone for today, not UTC', () => {
    const now = new Date('2026-10-30T22:30:00Z')
    const kyiv = localDate(now, 'Europe/Kyiv')
    const utc = localDate(now, 'UTC')

    expect(kyiv).toBe('2026-10-31')
    expect(groupByBucket([due('2026-10-30')], kyiv).overdue).toHaveLength(1)
    expect(groupByBucket([due('2026-10-30')], utc).today).toHaveLength(1)
  })

  it('adds days across a month and year end', () => {
    expect(addDaysIso('2026-12-30', 3)).toBe('2027-01-02')
  })
})

describe('bucketOf', () => {
  it.each([
    ['2026-10-29', 'overdue'],
    ['2026-10-30', 'today'],
    ['2026-10-31', 'week'],
    ['2026-11-06', 'week'],
    ['2026-11-07', 'later'],
  ])('puts %s into %s', (dueOn, bucket) => {
    expect(bucketOf(dueOn, '2026-10-30', '2026-11-06')).toBe(bucket)
  })
})
