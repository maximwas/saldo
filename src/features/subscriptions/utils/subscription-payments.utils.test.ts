import { describe, expect, it } from 'vitest'
import { newestFirst, recentPayments } from './subscription-payments.utils'

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

describe('newestFirst', () => {
  it('sorts by date, newest first, without touching the input', () => {
    expect(newestFirst(payments)[0].dueOn).toBe('2027-01-05')
    expect(payments[0].dueOn).toBe('2026-09-05')
  })
})
