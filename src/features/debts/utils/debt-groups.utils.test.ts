import { describe, expect, it } from 'vitest'
import type { DebtRow } from '../api/debts.api'
import { debtState, openCount, owedTotals } from './debt-groups.utils'

const debt = (patch: Partial<DebtRow>): DebtRow => ({
  id: 'id',
  direction: 'owed_to_me',
  person: 'Олег',
  reason: null,
  principalMinor: 100_000,
  currency: 'UAH',
  arisenOn: '2026-10-01',
  accountId: null,
  dueOn: null,
  origin: 'existing_no_movement',
  shareOfOperationId: null,
  status: 'open',
  note: null,
  version: 1,
  repaidMinor: 0,
  remainingMinor: 100_000,
  overpaidMinor: 0,
  lastRepaymentOn: null,
  closedOn: '2026-10-01',
  ...patch,
})

describe('debtState', () => {
  it('shows partial after a repayment and returned at zero', () => {
    expect(debtState(debt({}))).toBe('open')
    expect(
      debtState(
        debt({
          repaidMinor: 40_000,
          remainingMinor: 60_000,
        }),
      ),
    ).toBe('partial')
    expect(
      debtState(
        debt({
          repaidMinor: 100_000,
          remainingMinor: 0,
        }),
      ),
    ).toBe('returned')
  })

  it('lets a set status win over the balance', () => {
    expect(debtState(debt({ status: 'written_off' }))).toBe('written_off')
    expect(
      debtState(
        debt({
          status: 'settled',
          repaidMinor: 100_000,
          remainingMinor: 0,
        }),
      ),
    ).toBe('settled')
  })
})

describe('owedTotals', () => {
  const debts = [
    debt({ remainingMinor: 60_000 }),
    debt({
      remainingMinor: 10_000,
      currency: 'USD',
    }),
    debt({
      status: 'written_off',
      remainingMinor: 99_000,
    }),
    debt({
      remainingMinor: 0,
      repaidMinor: 100_000,
    }),
    debt({
      direction: 'i_owe',
      remainingMinor: 5_000,
    }),
  ]

  it('sums what is still owed per currency, skipping closed and returned debts', () => {
    expect(owedTotals(debts, 'owed_to_me')).toEqual([
      {
        currency: 'UAH',
        minor: 60_000,
      },
      {
        currency: 'USD',
        minor: 10_000,
      },
    ])
    expect(owedTotals(debts, 'i_owe')).toEqual([
      {
        currency: 'UAH',
        minor: 5_000,
      },
    ])
  })

  it('counts open debts of a direction', () => {
    expect(openCount(debts, 'owed_to_me')).toBe(2)
  })
})
