import { describe, expect, it } from 'vitest'
import { rankCandidates } from './operation-candidates.utils'

const operation = (id: string, amountMinor: number, occurredOn: string, currency = 'UAH') => ({
  id,
  amountMinor,
  currency,
  occurredOn,
})

describe('rankCandidates', () => {
  it('puts the same amount first, then the nearest amount, then the day nearest to the plan', () => {
    const operations = [
      operation('cinema', 52_000, '2026-11-12'),
      operation('far', 25_000, '2026-10-01'),
      operation('kyivstar', 25_000, '2026-11-14'),
      operation('close', 26_000, '2026-11-15'),
      operation('dollars', 25_000, '2026-11-15', 'USD'),
    ]

    expect(
      rankCandidates(
        operations,
        {
          amountMinor: 25_000,
          currency: 'UAH',
          dueOn: '2026-11-15',
        },
        4,
      ).map((item) => item.id),
    ).toEqual(['kyivstar', 'far', 'close', 'cinema'])
  })

  it('orders by the day alone when the planned amount is unknown', () => {
    expect(
      rankCandidates(
        [operation('old', 100, '2026-10-01'), operation('near', 999, '2026-11-14')],
        {
          amountMinor: null,
          currency: 'UAH',
          dueOn: '2026-11-15',
        },
        10,
      ).map((item) => item.id),
    ).toEqual(['near', 'old'])
  })
})
