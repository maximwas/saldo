import { describe, expect, it } from 'vitest'
import type { FxRate } from '@/lib/money/fx.utils'
import { currentRates } from './currencies.utils'

const rate = (patch: Partial<FxRate>): FxRate => ({
  baseCurrency: 'EUR',
  quoteCurrency: 'UAH',
  rate: '41.5',
  rateOn: '2026-10-01',
  source: 'manual',
  ...patch,
})

describe('currentRates', () => {
  it('lists the other currencies; a missing rate is null, not 0', () => {
    expect(currentRates([rate({})], 'UAH', '2026-10-30')).toEqual([
      {
        currency: 'USD',
        rate: null,
      },
      {
        currency: 'EUR',
        rate: '41.5',
      },
    ])
  })

  it('does not use a rate from the future', () => {
    expect(
      currentRates([rate({ rateOn: '2026-11-05' })], 'UAH', '2026-10-30').find((row) => row.currency === 'EUR')?.rate,
    ).toBeNull()
  })

  it('rule A: an older manual rate does not beat a newer reference one', () => {
    const rates = [
      rate({
        rate: '40',
        rateOn: '2026-10-01',
      }),
      rate({
        rate: '42',
        rateOn: '2026-10-20',
        source: 'reference',
      }),
    ]

    expect(currentRates(rates, 'UAH', '2026-10-30').find((row) => row.currency === 'EUR')?.rate).toBe('42')
  })
})
