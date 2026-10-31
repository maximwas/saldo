import { describe, expect, it } from 'vitest'
import { summarizePayments } from './obligation-summary.utils'

const row = (over: Partial<Parameters<typeof summarizePayments>[0][number]>) => ({
  direction: 'out' as const,
  state: 'plan',
  dueOn: '2026-11-05',
  plannedMinor: 100,
  remainingMinor: 100,
  currency: 'UAH',
  ...over,
})

describe('summarizePayments', () => {
  it('sums the base currency, keeps others apart, counts every outgoing payment', () => {
    const summary = summarizePayments(
      [
        row({ remainingMinor: 500 }),
        row({
          currency: 'USD',
          remainingMinor: 299,
          dueOn: '2026-11-22',
        }),
      ],
      'UAH',
    )

    expect(summary.count).toBe(2)
    expect(summary.planned).toEqual({
      base: 500,
      others: [
        {
          currency: 'USD',
          minor: 299,
        },
      ],
    })
    expect(summary.untilOn).toBe('2026-11-22')
  })

  it('takes the remainder of a part-paid one and skips expected income', () => {
    const summary = summarizePayments(
      [
        row({
          remainingMinor: 40,
          plannedMinor: 100,
        }),
        row({ direction: 'in' }),
      ],
      'UAH',
    )

    expect(summary.count).toBe(1)
    expect(summary.planned.base).toBe(40)
  })

  it('counts an unknown amount but never sums it as 0', () => {
    const summary = summarizePayments(
      [
        row({
          plannedMinor: null,
          remainingMinor: null,
          state: 'unconfirmed',
        }),
      ],
      'UAH',
    )

    expect(summary.count).toBe(1)
    expect(summary.planned.base).toBe(0)
    expect(summary.overdue.count).toBe(1)
  })

  it('totals the date-passed ones apart', () => {
    const summary = summarizePayments(
      [
        row({
          state: 'unconfirmed',
          remainingMinor: 64990,
        }),
        row({}),
      ],
      'UAH',
    )

    expect(summary.overdue).toEqual({
      base: 64990,
      others: [],
      count: 1,
    })
    expect(summary.untilOn).toBe('2026-11-05')
  })
})
