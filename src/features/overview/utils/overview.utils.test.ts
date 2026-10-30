import { describe, expect, it } from 'vitest'
import {
  isoToDate,
  monthRange,
  type OverviewAccountRow,
  sumMonth,
  sumOpenDebts,
  toAvailableObligation,
  toOverviewAccount,
  toUpcoming,
  withBalances,
} from './overview.utils'

describe('isoToDate', () => {
  it('keeps the calendar day in UTC', () => {
    expect(isoToDate('2026-11-14').toISOString()).toBe('2026-11-14T12:00:00.000Z')
  })
})

describe('monthRange', () => {
  it('spans the whole month of the date', () => {
    expect(monthRange('2026-02-10')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
    expect(monthRange('2026-10-31')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    })
  })
})

describe('sumMonth', () => {
  it('counts income and expense, takes refunds off the expense, skips transfers, debts and adjustments', () => {
    const totals = sumMonth([
      {
        kind: 'income',
        baseAmountMinor: 100_000,
      },
      {
        kind: 'expense',
        baseAmountMinor: 30_000,
      },
      {
        kind: 'refund',
        baseAmountMinor: 5_000,
      },
      {
        kind: 'transfer_out',
        baseAmountMinor: 90_000,
      },
      {
        kind: 'transfer_in',
        baseAmountMinor: 90_000,
      },
      {
        kind: 'debt_out',
        baseAmountMinor: 7_000,
      },
      {
        kind: 'adjustment',
        baseAmountMinor: 1_000,
      },
    ])

    expect(totals).toEqual({
      incomeMinor: 100_000,
      expenseMinor: 25_000,
      resultMinor: 75_000,
      unknownCount: 0,
    })
  })

  it('an operation without a rate is counted as unknown, not as 0', () => {
    expect(
      sumMonth([
        {
          kind: 'expense',
          baseAmountMinor: null,
        },
      ]).unknownCount,
    ).toBe(1)
  })
})

const accountRow = {
  id: 'a1',
  name: 'Card',
  kind: 'bank',
  currency: 'EUR',
  include_in_available: true,
  opening_balance_minor: 100,
}

describe('withBalances', () => {
  it('takes the balance from account_balances, else the opening balance', () => {
    const rows = withBalances(
      [
        accountRow,
        {
          ...accountRow,
          id: 'a2',
        },
      ],
      [
        {
          account_id: 'a1',
          balance_minor: 900,
        },
      ],
    )

    expect(rows.map((row) => row.balanceMinor)).toEqual([900, 100])
  })
})

describe('toOverviewAccount', () => {
  const row: OverviewAccountRow = {
    ...accountRow,
    balanceMinor: 1000,
  }
  const rates = [
    {
      baseCurrency: 'EUR',
      quoteCurrency: 'UAH',
      rate: '41.5',
      rateOn: '2026-10-01',
      source: 'manual' as const,
    },
  ]

  it('converts to the base currency on the rate of today', () => {
    const rateContext = {
      baseCurrency: 'UAH',
      rates,
      today: '2026-10-30',
    }

    expect(toOverviewAccount(row, rateContext)).toMatchObject({
      balanceMinor: 1000,
      baseMinor: 41_500,
      includeInAvailable: true,
    })
  })

  it('has no base value, not 0, without a rate', () => {
    const rateContext = {
      baseCurrency: 'UAH',
      rates: [],
      today: '2026-10-30',
    }

    expect(toOverviewAccount(row, rateContext).baseMinor).toBeNull()
  })
})

describe('obligation mappers', () => {
  const dueRow = {
    obligation_id: 'o1',
    title: 'Rent',
    source_type: 'manual',
    direction: 'out',
    due_on: '2026-11-01',
    remaining_minor: null,
    currency: 'UAH',
    state: 'plan',
  }

  it('maps a due row for «Available», keeping an unknown amount null', () => {
    expect(toAvailableObligation(dueRow)).toEqual({
      id: 'o1',
      direction: 'out',
      dueOn: '2026-11-01',
      remainingMinor: null,
      currency: 'UAH',
      state: 'plan',
    })
  })

  it('maps an upcoming row with its title', () => {
    expect(toUpcoming(dueRow)).toMatchObject({
      id: 'o1',
      title: 'Rent',
      sourceType: 'manual',
      remainingMinor: null,
    })
  })
})

describe('sumOpenDebts', () => {
  it('sums what is left per direction in the base currency; an overpaid or rateless debt adds nothing', () => {
    const debts = [
      {
        id: 'd1',
        direction: 'owed_to_me',
        principal_minor: 200_000,
        currency: 'UAH',
      },
      {
        id: 'd2',
        direction: 'i_owe',
        principal_minor: 10_000,
        currency: 'EUR',
      },
      {
        id: 'd3',
        direction: 'owed_to_me',
        principal_minor: 50_000,
        currency: 'UAH',
      },
      {
        id: 'd4',
        direction: 'i_owe',
        principal_minor: 10_000,
        currency: 'USD',
      },
    ]
    const repayments = [
      {
        debt_id: 'd1',
        amount_minor: 50_000,
      },
      {
        debt_id: 'd3',
        amount_minor: 60_000,
      },
    ]
    const context = {
      baseCurrency: 'UAH',
      rates: [
        {
          baseCurrency: 'EUR',
          quoteCurrency: 'UAH',
          rate: '41.5',
          rateOn: '2026-10-01',
          source: 'manual' as const,
        },
      ],
      today: '2026-10-30',
    }

    expect(sumOpenDebts(debts, repayments, context)).toEqual({
      owedToMeMinor: 150_000,
      iOweMinor: 415_000,
      unknownCount: 1,
    })
  })
})
