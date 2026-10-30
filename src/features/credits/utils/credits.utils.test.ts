import { describe, expect, it } from 'vitest'
import type { Credit, CreditInstallment } from '../api/credits.api'
import { creditProgress, creditTotals, payoffOf } from './credits.utils'

const installment = (
  sequenceNo: number,
  dueOn: string,
  state: CreditInstallment['state'],
  paidMinor = 0,
): CreditInstallment => ({
  id: `i${sequenceNo}${state}`,
  sequenceNo,
  dueOn,
  plannedMinor: 270_825,
  paidMinor,
  remainingMinor: Math.max(270_825 - paidMinor, 0),
  state,
})

const credit = (overrides: Partial<Credit> = {}): Credit => ({
  id: 'c1',
  name: 'Ноутбук',
  lender: 'Comfy',
  purchasePriceMinor: 3_249_900,
  totalPayableMinor: 3_249_900,
  currency: 'UAH',
  openedOn: null,
  installmentsCount: 5,
  regularInstallmentMinor: 270_825,
  lastInstallmentMinor: null,
  accountId: null,
  feesNote: null,
  scheduleAccuracy: 'estimated',
  paidBeforeTrackingCount: 2,
  paidBeforeTrackingMinor: 541_650,
  status: 'active',
  version: 1,
  installments: [
    installment(3, '2026-10-05', 'paid', 270_825),
    installment(4, '2026-10-20', 'unconfirmed'),
    installment(5, '2026-11-05', 'plan'),
  ],
  ...overrides,
})

describe('creditProgress', () => {
  it('counts the installments paid before tracking as paid steps, with no rows behind them', () => {
    const progress = creditProgress(credit())

    expect(progress.steps).toEqual(['paid', 'paid', 'paid', 'unconfirmed', 'plan'])
    expect(progress.paidCount).toBe(3)
    expect(progress.paidMinor).toBe(812_475)
    expect(progress.remainingMinor).toBe(541_650)
    expect(progress.next?.sequenceNo).toBe(4)
    expect(progress.endOn).toBe('2026-11-05')
  })

  it('leaves replaced installments out and marks the next open one as current', () => {
    const progress = creditProgress(
      credit({
        paidBeforeTrackingCount: 0,
        installments: [installment(1, '2026-11-05', 'plan'), installment(1, '2026-10-30', 'replaced')],
      }),
    )

    expect(progress.steps).toEqual(['current'])
    expect(progress.openCount).toBe(1)
  })

  it('keeps an unknown amount unknown, never 0', () => {
    const unknown = {
      ...installment(5, '2026-11-05', 'plan'),
      plannedMinor: null,
      remainingMinor: null,
    }

    expect(creditProgress(credit({ installments: [unknown] })).remainingMinor).toBeNull()
    expect(creditProgress(credit({ paidBeforeTrackingMinor: null })).paidMinor).toBeNull()
  })
})

describe('creditTotals', () => {
  it('sums this month and the rest per currency over active credits only', () => {
    const totals = creditTotals(
      [
        credit(),
        credit({
          id: 'c2',
          status: 'closed',
        }),
        credit({
          id: 'c3',
          currency: 'USD',
        }),
      ],
      '2026-10-30',
    )

    expect(totals.activeCount).toBe(2)
    expect(totals.openCount).toBe(4)
    expect(totals.endOn).toBe('2026-11-05')
    expect(totals.byCurrency).toEqual([
      {
        currency: 'UAH',
        monthMinor: 541_650,
        remainingMinor: 541_650,
      },
      {
        currency: 'USD',
        monthMinor: 541_650,
        remainingMinor: 541_650,
      },
    ])
  })
})

describe('payoffOf', () => {
  it('takes the installments with no payment, from the number of the first of them', () => {
    const partial = installment(4, '2026-10-20', 'partial', 100_000)

    expect(payoffOf(credit())).toEqual({
      amountMinor: 541_650,
      count: 2,
      sequenceNo: 4,
    })
    expect(payoffOf(credit({ installments: [partial, installment(5, '2026-11-05', 'plan')] }))).toEqual({
      amountMinor: 270_825,
      count: 1,
      sequenceNo: 5,
    })
  })

  it('offers nothing for a closed credit or a fully paid one', () => {
    expect(payoffOf(credit({ status: 'closed' }))).toBeNull()
    expect(payoffOf(credit({ installments: [installment(3, '2026-10-05', 'paid', 270_825)] }))).toBeNull()
  })
})
