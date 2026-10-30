import { describe, expect, it } from 'vitest'
import { type AccountRow, type AccountView, nextSortOrder, toAccount, totalInBase } from './accounts.utils'

const account = (patch: Partial<AccountView>): AccountView => ({
  id: 'a',
  name: 'Card',
  kind: 'bank',
  currency: 'UAH',
  color: null,
  icon: null,
  openingBalanceMinor: 0,
  openingBalanceOn: '2026-10-01',
  includeInTotal: true,
  includeInAvailable: true,
  sortOrder: 1,
  archivedAt: null,
  version: 1,
  balanceMinor: 0,
  baseMinor: 0,
  rate: null,
  ...patch,
})

describe('totalInBase', () => {
  it('sums the base amounts of active accounts that count in the total', () => {
    const result = totalInBase([
      account({ baseMinor: 4_621_580 }),
      account({ baseMinor: 240_000 }),
      account({
        baseMinor: 99_999,
        includeInTotal: false,
      }),
      account({
        baseMinor: 77_777,
        archivedAt: '2026-10-01T00:00:00Z',
      }),
    ])

    expect(result).toEqual({
      totalMinor: 4_861_580,
      unknownCurrencies: [],
    })
  })

  it('does not turn a missing rate into 0: the currency is reported and the account left out', () => {
    const result = totalInBase([
      account({ baseMinor: 1_000 }),
      account({
        currency: 'EUR',
        balanceMinor: 120_000,
        baseMinor: null,
      }),
    ])

    expect(result).toEqual({
      totalMinor: 1_000,
      unknownCurrencies: ['EUR'],
    })
  })
})

describe('nextSortOrder', () => {
  it('goes after the last account, and starts at 1', () => {
    expect(nextSortOrder([{ sortOrder: 3 }, { sortOrder: 7 }])).toBe(8)
    expect(nextSortOrder([])).toBe(1)
  })
})

const row: AccountRow = {
  id: 'a1',
  name: 'Card',
  kind: 'bank',
  currency: 'EUR',
  color: 'blue',
  icon: 'credit-card',
  opening_balance_minor: 100,
  opening_balance_on: '2026-10-01',
  include_in_total: true,
  include_in_available: false,
  sort_order: 2,
  archived_at: null,
  version: 3,
}

const context = {
  balanceOf: new Map<string, number | null>(),
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

describe('toAccount', () => {
  it('maps columns and converts the balance with the rate of today', () => {
    const result = toAccount(row, {
      ...context,
      balanceOf: new Map([['a1', 1000]]),
    })

    expect(result).toMatchObject({
      id: 'a1',
      openingBalanceMinor: 100,
      includeInAvailable: false,
      balanceMinor: 1000,
      baseMinor: 41_500,
      rate: '41.5',
    })
  })

  it('falls back to the opening balance when account_balances has no row', () => {
    expect(toAccount(row, context).balanceMinor).toBe(100)
  })

  it('keeps the base currency as is, without a rate', () => {
    expect(
      toAccount(
        {
          ...row,
          currency: 'UAH',
        },
        context,
      ),
    ).toMatchObject({
      baseMinor: 100,
      rate: null,
    })
  })

  it('has no base value, not 0, when no rate links the currencies', () => {
    expect(
      toAccount(
        {
          ...row,
          currency: 'USD',
        },
        context,
      ),
    ).toMatchObject({
      baseMinor: null,
      rate: null,
    })
  })
})
