import { describe, expect, it } from 'vitest'
import { type AccountView, nextSortOrder, totalInBase } from './accounts.utils'

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
