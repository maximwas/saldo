import { describe, expect, it } from 'vitest'
import type { FxRate } from '@/lib/money/fx.utils'
import { accountBaseMinor, accountRate } from './base-balance.utils'

const rates: FxRate[] = [
  {
    baseCurrency: 'EUR',
    quoteCurrency: 'UAH',
    rate: '41.5',
    rateOn: '2026-10-01',
    source: 'manual',
  },
]

describe('accountRate', () => {
  it('is null for the base currency', () => {
    expect(
      accountRate({
        currency: 'UAH',
        baseCurrency: 'UAH',
        rates,
        date: '2026-10-30',
      }),
    ).toBeNull()
  })

  it('finds the rate of the day', () => {
    expect(
      accountRate({
        currency: 'EUR',
        baseCurrency: 'UAH',
        rates,
        date: '2026-10-30',
      })?.toFixed(),
    ).toBe('41.5')
  })

  it('is null when no rate links the currencies', () => {
    expect(
      accountRate({
        currency: 'USD',
        baseCurrency: 'UAH',
        rates,
        date: '2026-10-30',
      }),
    ).toBeNull()
  })
})

describe('accountBaseMinor', () => {
  it('keeps the balance in the base currency', () => {
    expect(
      accountBaseMinor({
        balanceMinor: 500,
        currency: 'UAH',
        baseCurrency: 'UAH',
        rate: null,
      }),
    ).toBe(500)
  })

  it('converts with the rate', () => {
    const rate = accountRate({
      currency: 'EUR',
      baseCurrency: 'UAH',
      rates,
      date: '2026-10-30',
    })

    expect(
      accountBaseMinor({
        balanceMinor: 1000,
        currency: 'EUR',
        baseCurrency: 'UAH',
        rate,
      }),
    ).toBe(41_500)
  })

  it('is null, not 0, without a rate', () => {
    expect(
      accountBaseMinor({
        balanceMinor: 1000,
        currency: 'USD',
        baseCurrency: 'UAH',
        rate: null,
      }),
    ).toBeNull()
  })
})
