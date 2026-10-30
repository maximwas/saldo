import { describe, expect, it } from 'vitest'
import { type AvailableMoneyInput, computeAvailableMoney } from './available-money.utils'

const base: AvailableMoneyInput = {
  baseCurrency: 'UAH',
  untilOn: '2026-11-05',
  // 23:30 in Kyiv on 30.10 is already 31.10 there: the rate of 31.10 applies
  now: new Date('2026-10-30T22:30:00Z'),
  timeZone: 'Europe/Kyiv',
  accounts: [
    {
      accountId: 'card',
      balanceMinor: 5_000_000,
      currency: 'UAH',
    },
    {
      accountId: 'euro',
      balanceMinor: 10_000,
      currency: 'EUR',
    },
  ],
  obligations: [
    {
      id: 'rent',
      direction: 'out',
      dueOn: '2026-11-01',
      remainingMinor: 1_500_000,
      currency: 'UAH',
      state: 'plan',
    },
    {
      id: 'late',
      direction: 'out',
      dueOn: '2026-10-20',
      remainingMinor: 100_000,
      currency: 'UAH',
      state: 'unconfirmed',
    },
    {
      id: 'later',
      direction: 'out',
      dueOn: '2026-11-20',
      remainingMinor: 900_000,
      currency: 'UAH',
      state: 'plan',
    },
    {
      id: 'paid',
      direction: 'out',
      dueOn: '2026-11-02',
      remainingMinor: 0,
      currency: 'UAH',
      state: 'paid',
    },
  ],
  rates: [
    {
      baseCurrency: 'EUR',
      quoteCurrency: 'UAH',
      rate: '41.5',
      rateOn: '2026-10-31',
      source: 'manual',
    },
  ],
}

describe('computeAvailableMoney', () => {
  it('subtracts unpaid obligations due by the date from included balances', () => {
    // 50 000 UAH + 100 EUR x 41.5 - 15 000 UAH - 1 000 UAH
    expect(computeAvailableMoney(base)).toEqual({
      availableMinor: 3_815_000,
      balancesMinor: 5_415_000,
      obligationsMinor: 1_600_000,
      expectedIncomeMinor: 0,
      obligationIds: ['late', 'rent'],
      unknownAmountIds: [],
      unknownRateCurrencies: [],
    })
  })

  it('does not add expected income, only shows it', () => {
    const result = computeAvailableMoney({
      ...base,
      obligations: [
        ...base.obligations,
        {
          id: 'salary',
          direction: 'in',
          dueOn: '2026-11-03',
          remainingMinor: 9_000_000,
          currency: 'UAH',
          state: 'plan',
        },
      ],
    })

    expect(result.availableMinor).toBe(3_815_000)
    expect(result.expectedIncomeMinor).toBe(9_000_000)
  })

  it('makes the obligations part unknown when an amount is unknown, never 0', () => {
    const result = computeAvailableMoney({
      ...base,
      obligations: [
        ...base.obligations,
        {
          id: 'utilities',
          direction: 'out',
          dueOn: '2026-11-04',
          remainingMinor: null,
          currency: 'UAH',
          state: 'plan',
        },
      ],
    })

    expect(result.unknownAmountIds).toEqual(['utilities'])
    expect(result.obligationsMinor).toBeNull()
    expect(result.availableMinor).toBeNull()
    expect(result.balancesMinor).toBe(5_415_000)
  })

  it('makes the balances part unknown when a rate is unknown', () => {
    const result = computeAvailableMoney({
      ...base,
      rates: [],
    })

    expect(result.unknownRateCurrencies).toEqual(['EUR'])
    expect(result.balancesMinor).toBeNull()
    expect(result.availableMinor).toBeNull()
    expect(result.obligationsMinor).toBe(1_600_000)
  })
})
