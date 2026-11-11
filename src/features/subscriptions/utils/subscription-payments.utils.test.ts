import { describe, expect, it } from 'vitest'
import { historyPayments, recentPayments } from './subscription-payments.utils'

const payments = [
  {
    dueOn: '2026-09-05',
    state: 'paid' as const,
  },
  {
    dueOn: '2026-10-05',
    state: 'paid' as const,
  },
  {
    dueOn: '2026-10-20',
    state: 'unconfirmed' as const,
  },
  {
    dueOn: '2026-11-05',
    state: 'plan' as const,
  },
  {
    dueOn: '2026-12-05',
    state: 'plan' as const,
  },
  {
    dueOn: '2027-01-05',
    state: 'plan' as const,
  },
]

describe('recentPayments', () => {
  it('shows the next two open payments and the last paid one, newest first', () => {
    expect(recentPayments(payments, '2026-10-30').map((payment) => payment.dueOn)).toEqual([
      '2026-12-05',
      '2026-11-05',
      '2026-10-05',
    ])
  })

  it('shows only what exists', () => {
    expect(recentPayments([], '2026-10-30')).toEqual([])
  })
})

describe('historyPayments', () => {
  it('puts paid and past-due payments in the past, newest first, and the open ones ahead, soonest first', () => {
    const { past, upcoming } = historyPayments(payments, '2026-10-30')

    expect(past.map((payment) => payment.dueOn)).toEqual(['2026-10-20', '2026-10-05', '2026-09-05'])
    expect(upcoming.map((payment) => payment.dueOn)).toEqual(['2026-11-05', '2026-12-05', '2027-01-05'])
  })

  it('counts a payment paid ahead of its date as past', () => {
    const { past, upcoming } = historyPayments(
      [
        {
          dueOn: '2026-11-05',
          state: 'paid' as const,
        },
      ],
      '2026-10-30',
    )

    expect(past).toHaveLength(1)
    expect(upcoming).toHaveLength(0)
  })

  it('does not touch the input', () => {
    historyPayments(payments, '2026-10-30')
    expect(payments[0].dueOn).toBe('2026-09-05')
  })
})
