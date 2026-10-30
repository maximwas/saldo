import { describe, expect, it } from 'vitest'
import { type CreditSchedule, equalInstallments, existingCreditInstallments } from './installments.utils'

const amounts = (schedule: CreditSchedule) => schedule.installments.map((installment) => installment.amountMinor)
const sum = (schedule: CreditSchedule) => amounts(schedule).reduce((total, amount) => total + amount, 0)
const datesOf = (schedule: CreditSchedule) => schedule.installments.map(({ sequenceNo, dueOn }) => [sequenceNo, dueOn])

describe('equalInstallments', () => {
  it('puts the rounding remainder into the last installment and keeps the sum equal to the total', () => {
    const schedule = equalInstallments({
      totalMinor: 1_000_000,
      count: 7,
      firstOn: '2026-11-15',
    })

    expect(amounts(schedule)).toEqual([142_857, 142_857, 142_857, 142_857, 142_857, 142_857, 142_858])
    expect(sum(schedule)).toBe(1_000_000)
  })

  it('makes every installment equal when the total divides evenly', () => {
    const schedule = equalInstallments({
      totalMinor: 120_000,
      count: 4,
      firstOn: '2026-11-15',
    })

    expect(amounts(schedule)).toEqual([30_000, 30_000, 30_000, 30_000])
  })

  it('numbers installments from 1 and dates them monthly, a missing 31st on the last day of the month', () => {
    const schedule = equalInstallments({
      totalMinor: 30_000,
      count: 3,
      firstOn: '2026-12-31',
    })

    expect(datesOf(schedule)).toEqual([
      [1, '2026-12-31'],
      [2, '2027-01-31'],
      [3, '2027-02-28'],
    ])
  })

  it('marks a generated schedule as estimated', () => {
    expect(
      equalInstallments({
        totalMinor: 10_000,
        count: 2,
        firstOn: '2026-11-01',
      }).accuracy,
    ).toBe('estimated')
  })

  it('gives one installment of the whole total for a count of 1', () => {
    expect(
      amounts(
        equalInstallments({
          totalMinor: 99_999,
          count: 1,
          firstOn: '2026-11-01',
        }),
      ),
    ).toEqual([99_999])
  })
})

describe('existingCreditInstallments', () => {
  const running = {
    nextOn: '2026-11-20',
    installmentMinor: 250_000,
    paidCount: 3,
  }

  it('continues the numbering after the installments paid before tracking', () => {
    const schedule = existingCreditInstallments({
      ...running,
      remainingMinor: 1_000_000,
    })

    expect(datesOf(schedule)).toEqual([
      [4, '2026-11-20'],
      [5, '2026-12-20'],
      [6, '2027-01-20'],
      [7, '2027-02-20'],
    ])
    expect(amounts(schedule)).toEqual([250_000, 250_000, 250_000, 250_000])
  })

  it('ends with a smaller last installment when the balance is not a multiple of the installment', () => {
    const schedule = existingCreditInstallments({
      ...running,
      remainingMinor: 900_000,
    })

    expect(amounts(schedule)).toEqual([250_000, 250_000, 250_000, 150_000])
    expect(sum(schedule)).toBe(900_000)
    expect(schedule.accuracy).toBe('estimated')
  })

  it('leaves one installment when the balance is below the regular one', () => {
    expect(
      amounts(
        existingCreditInstallments({
          ...running,
          remainingMinor: 40_000,
        }),
      ),
    ).toEqual([40_000])
  })

  it('leaves nothing when the balance is 0', () => {
    expect(
      existingCreditInstallments({
        ...running,
        remainingMinor: 0,
      }).installments,
    ).toEqual([])
  })
})
