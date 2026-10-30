import { describe, expect, it } from 'vitest'
import { debtBalance, movementOperationKind, ownShareMinor, type ShareDebt } from './debts.utils'

describe('debtBalance', () => {
  it('lowers the balance by partial repayments and ignores the principal movement itself', () => {
    const movements = [
      {
        kind: 'principal' as const,
        amountMinor: 500_000,
      },
      {
        kind: 'repayment' as const,
        amountMinor: 100_000,
      },
      {
        kind: 'repayment' as const,
        amountMinor: 150_000,
      },
    ]

    expect(debtBalance(500_000, movements)).toEqual({
      repaidMinor: 250_000,
      remainingMinor: 250_000,
      overpaidMinor: 0,
    })
  })

  it('keeps the whole principal while nothing is repaid', () => {
    expect(debtBalance(500_000, [])).toEqual({
      repaidMinor: 0,
      remainingMinor: 500_000,
      overpaidMinor: 0,
    })
  })

  it('shows an overpayment apart instead of a negative balance', () => {
    const movements = [
      {
        kind: 'repayment' as const,
        amountMinor: 520_000,
      },
    ]

    expect(debtBalance(500_000, movements)).toEqual({
      repaidMinor: 520_000,
      remainingMinor: 0,
      overpaidMinor: 20_000,
    })
  })
})

describe('movementOperationKind', () => {
  it.each([
    ['owed_to_me', 'principal', 'debt_out'],
    ['owed_to_me', 'repayment', 'debt_in'],
    ['i_owe', 'principal', 'debt_in'],
    ['i_owe', 'repayment', 'debt_out'],
  ] as const)('records %s %s as %s, never income or expense', (direction, kind, expected) => {
    expect(movementOperationKind(direction, kind)).toBe(expected)
  })
})

describe('ownShareMinor', () => {
  const purchase = {
    id: 'purchase-1',
    amountMinor: 90_000,
  }

  it('takes off only the shares others owe for this purchase', () => {
    const debts: ShareDebt[] = [
      {
        direction: 'owed_to_me',
        principalMinor: 30_000,
        shareOfOperationId: 'purchase-1',
      },
      {
        direction: 'owed_to_me',
        principalMinor: 30_000,
        shareOfOperationId: 'purchase-1',
      },
      {
        direction: 'owed_to_me',
        principalMinor: 50_000,
        shareOfOperationId: null,
      },
      {
        direction: 'owed_to_me',
        principalMinor: 10_000,
        shareOfOperationId: 'purchase-2',
      },
      {
        direction: 'i_owe',
        principalMinor: 5_000,
        shareOfOperationId: 'purchase-1',
      },
    ]

    expect(ownShareMinor(purchase, debts)).toBe(30_000)
  })

  it('leaves the whole purchase as own spending when nobody owes a share', () => {
    expect(ownShareMinor(purchase, [])).toBe(90_000)
  })
})
